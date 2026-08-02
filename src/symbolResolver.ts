import * as vscode from "vscode";
import { logger } from "./logger";
export interface ResolvedTarget {
  uri: vscode.Uri;
  range: vscode.Range;
  name: string;
  kind: vscode.SymbolKind;
}

export interface AnnotatedIdentifier {
  name: string;
  startInText: number;
  endInText: number;
  classification: "call" | "type";
  target: ResolvedTarget;
}

export interface FunctionFrame {
  uri: vscode.Uri;
  name: string;
  range: vscode.Range;
  text: string;
  identifiers: AnnotatedIdentifier[];
}

const CPP_KEYWORDS = new Set([
  "if", "else", "for", "while", "do", "switch", "case", "default", "break",
  "continue", "return", "goto", "sizeof", "typedef", "struct", "class",
  "union", "enum", "namespace", "using", "public", "private", "protected",
  "virtual", "override", "final", "static", "const", "constexpr", "volatile",
  "mutable", "inline", "friend", "template", "typename", "auto", "void",
  "int", "long", "short", "char", "bool", "float", "double", "unsigned",
  "signed", "true", "false", "nullptr", "NULL", "new", "delete", "this",
  "throw", "try", "catch", "operator", "explicit", "extern", "register",
  "asm", "and", "or", "not", "noexcept", "decltype", "static_cast",
  "dynamic_cast", "reinterpret_cast", "const_cast",
]);

async function processInChunks<T, R>(
  items: T[],
  chunkSize: number,
  processor: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const chunkResults = await Promise.all(chunk.map(processor));
    results.push(...chunkResults);
  }
  return results;
}

function normalizeToLocations(
  result: (vscode.Location | vscode.LocationLink)[] | undefined
): vscode.Location[] {
  if (!result) return [];
  return result.map((r) =>
    "targetUri" in r
      ? new vscode.Location(r.targetUri, r.targetSelectionRange ?? r.targetRange)
      : r
  );
}

function findInnermostSymbol(
  symbols: vscode.DocumentSymbol[],
  position: vscode.Position
): vscode.DocumentSymbol | undefined {
  for (const sym of symbols) {
    if (sym.range.contains(position)) {
      const deeper = findInnermostSymbol(sym.children, position);
      return deeper ?? sym;
    }
  }
  return undefined;
}

async function getDocumentSymbols(uri: vscode.Uri): Promise<vscode.DocumentSymbol[]> {
  const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[] | undefined>(
    "vscode.executeDocumentSymbolProvider",
    uri
  );
  return symbols ?? [];
}

export async function getEnclosingFunction(
  document: vscode.TextDocument,
  position: vscode.Position
): Promise<{ name: string; range: vscode.Range } | undefined> {
  const symbols = await getDocumentSymbols(document.uri);
  const sym = findInnermostSymbol(symbols, position);
  if (!sym) return undefined;
  if (sym.kind !== vscode.SymbolKind.Function && sym.kind !== vscode.SymbolKind.Method) {
    return undefined;
  }
  return { name: sym.name, range: sym.range };
}

async function findSymbolAt(
  uri: vscode.Uri,
  position: vscode.Position
): Promise<vscode.DocumentSymbol | undefined> {
  const symbols = await getDocumentSymbols(uri);
  return findInnermostSymbol(symbols, position);
}

const CALL_OR_TYPE_KIND = new Set<vscode.SymbolKind>([
  vscode.SymbolKind.Function,
  vscode.SymbolKind.Method,
  vscode.SymbolKind.Constructor,
  vscode.SymbolKind.Struct,
  vscode.SymbolKind.Class,
  vscode.SymbolKind.Interface,
  vscode.SymbolKind.Enum,
]);

function classify(kind: vscode.SymbolKind): "call" | "type" | undefined {
  switch (kind) {
    case vscode.SymbolKind.Function:
    case vscode.SymbolKind.Method:
    case vscode.SymbolKind.Constructor:
      return "call";
    case vscode.SymbolKind.Struct:
    case vscode.SymbolKind.Class:
    case vscode.SymbolKind.Interface:
    case vscode.SymbolKind.Enum:
      return "type";
    default:
      return undefined;
  }
}

export async function buildFunctionFrame(
  uri: vscode.Uri,
  name: string,
  range: vscode.Range
): Promise<FunctionFrame> {
  logger.info(`Building function frame for: ${name}()`);
  const startTime = Date.now(); 

  const document = await vscode.workspace.openTextDocument(uri);
  const text = document.getText(range);
  const baseOffset = document.offsetAt(range.start);

  const identifierRegex = /\b[A-Za-z_]\w*\b/g;
  const candidates: { name: string; startInText: number; endInText: number }[] = [];
  let match: RegExpExecArray | null;
  while ((match = identifierRegex.exec(text)) !== null) {
    const word = match[0];
    if (CPP_KEYWORDS.has(word)) continue;
    candidates.push({
      name: word,
      startInText: match.index,
      endInText: match.index + word.length,
    });
  }

  logger.info(`Found ${candidates.length} potential identifier candidates in ${name}().`);

  const resolveCandidate = async (candidate: typeof candidates[0]): Promise<AnnotatedIdentifier | null> => {
    const position = document.positionAt(baseOffset + candidate.startInText);

    const rawDefs = await vscode.commands.executeCommand<
      (vscode.Location | vscode.LocationLink)[] | undefined
    >("vscode.executeDefinitionProvider", uri, position);
    
    const defs = normalizeToLocations(rawDefs);
    if (defs.length === 0) return null;

    const def = defs[0];

    if (def.uri.toString() === uri.toString() && def.range.intersection(range)) {
      const isInsideSameFunctionAsDeclSite =
        def.range.start.line >= range.start.line && def.range.end.line <= range.end.line;
      if (isInsideSameFunctionAsDeclSite && candidate.name.length < 3) return null;
    }

    const targetSymbol = await findSymbolAt(def.uri, def.range.start);
    if (!targetSymbol || !CALL_OR_TYPE_KIND.has(targetSymbol.kind)) return null;

    const kind = classify(targetSymbol.kind);
    if (!kind) return null;

    return {
      name: candidate.name,
      startInText: candidate.startInText,
      endInText: candidate.endInText,
      classification: kind,
      target: {
        uri: def.uri,
        range: targetSymbol.range,
        name: targetSymbol.name,
        kind: targetSymbol.kind,
      },
    };
  };

  const CHUNK_SIZE = 5;
  const results = await processInChunks(candidates, CHUNK_SIZE, resolveCandidate);
  
  const identifiers = results.filter((r): r is AnnotatedIdentifier => r !== null);

  const duration = Date.now() - startTime;
  logger.info(`Frame generation for ${name}() completed in ${duration}ms. Resolved ${identifiers.length} viable targets.`);

  return { uri, name, range, text, identifiers };
}