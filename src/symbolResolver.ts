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
  "dynamic_cast", "reinterpret_cast", "const_cast", "std", "cout", "cin", "endl",
  "vector", "string", "map", "set", "unordered_map"
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

async function getDocumentSymbols(uri: vscode.Uri): Promise<vscode.DocumentSymbol[]> {
  const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[] | undefined>(
    "vscode.executeDocumentSymbolProvider",
    uri
  );
  return symbols ?? [];
}

function flattenSymbols(symbols: vscode.DocumentSymbol[]): vscode.DocumentSymbol[] {
  let flat: vscode.DocumentSymbol[] = [];
  for (const sym of symbols) {
    flat.push(sym);
    if (sym.children && sym.children.length > 0) {
      flat = flat.concat(flattenSymbols(sym.children));
    }
  }
  return flat;
}

export async function getEnclosingFunction(
  document: vscode.TextDocument,
  position: vscode.Position
): Promise<{ name: string; range: vscode.Range } | undefined> {
  const symbols = await getDocumentSymbols(document.uri);
  const flat = flattenSymbols(symbols);
  const match = flat.find(
    (sym) =>
      (sym.range.contains(position) || sym.selectionRange.contains(position)) &&
      (sym.kind === vscode.SymbolKind.Function || sym.kind === vscode.SymbolKind.Method)
  );
  
  if (match) {
      // Clean the name for the UI breadcrumb
      const cleanName = match.name.split(/[\(\<]/)[0].trim();
      return { name: cleanName, range: match.range };
  }
  return undefined;
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

  const rawSymbols = await getDocumentSymbols(uri);
  const flatSymbols = flattenSymbols(rawSymbols);
  const fileSymbolMap = new Map<string, vscode.DocumentSymbol>();

  // THE FIX: Clean the symbol names before saving them to the dictionary
  for (const sym of flatSymbols) {
    if ([vscode.SymbolKind.Function, vscode.SymbolKind.Method, vscode.SymbolKind.Struct, vscode.SymbolKind.Class].includes(sym.kind)) {
      // Strips away "(int, int)" or "<Trade>" to just leave the raw identifier
      const cleanName = sym.name.split(/[\(\<]/)[0].trim();
      fileSymbolMap.set(cleanName, sym);
    }
  }

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

  const resolveCandidate = async (
    candidate: typeof candidates[0]
  ): Promise<AnnotatedIdentifier | null> => {
    
    // Prevent self-loop on the function's own declaration line
    if (candidate.name === name && candidate.startInText < text.indexOf("{")) {
      return null;
    }

    // FIRST PASS: Check our cleaned local dictionary
    const localSym = fileSymbolMap.get(candidate.name);
    if (localSym) {
      const isType = localSym.kind === vscode.SymbolKind.Struct || localSym.kind === vscode.SymbolKind.Class;
      return {
        name: candidate.name,
        startInText: candidate.startInText,
        endInText: candidate.endInText,
        classification: isType ? "type" : "call",
        target: {
          uri: uri,
          range: localSym.range, // Safely returns the FULL function/struct block
          name: candidate.name,
          kind: localSym.kind,
        },
      };
    }

    // SECOND PASS: Fallback to Definition Provider for external/standard library calls
    const position = document.positionAt(baseOffset + candidate.startInText);
    const rawDefs = await vscode.commands.executeCommand<
      (vscode.Location | vscode.LocationLink)[] | undefined
    >("vscode.executeDefinitionProvider", uri, position);

    if (rawDefs && rawDefs.length > 0) {
      const def = "targetUri" in rawDefs[0] 
        ? new vscode.Location(rawDefs[0].targetUri, rawDefs[0].targetRange) 
        : rawDefs[0];

      const isInsideSameFunction =
        def.uri.toString() === uri.toString() &&
        def.range.start.line >= range.start.line &&
        def.range.end.line <= range.end.line;

      if (isInsideSameFunction && candidate.name !== name) {
        return null;
      }

      const isType = candidate.name[0] === candidate.name[0].toUpperCase() && candidate.name[0] !== candidate.name[0].toLowerCase();
      
      if (!isType) {
        const textAfterWord = text.slice(candidate.endInText).trimStart();
        if (!textAfterWord.startsWith("(")) {
          return null; // Ignore struct properties like 'price' or 'id'
        }
      }

      return {
        name: candidate.name,
        startInText: candidate.startInText,
        endInText: candidate.endInText,
        classification: isType ? "type" : "call",
        target: {
          uri: def.uri,
          range: def.range,
          name: candidate.name,
          kind: isType ? vscode.SymbolKind.Struct : vscode.SymbolKind.Function,
        },
      };
    }

    return null;
  };

  const CHUNK_SIZE = 5;
  const results = await processInChunks(candidates, CHUNK_SIZE, resolveCandidate);
  const identifiers = results.filter((r): r is AnnotatedIdentifier => r !== null);

  const duration = Date.now() - startTime;
  logger.info(`Frame generation for ${name}() completed in ${duration}ms. Resolved ${identifiers.length} targets.`);

  return { uri, name, range, text, identifiers };
}