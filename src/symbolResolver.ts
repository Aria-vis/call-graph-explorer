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

export async function getDocumentSymbols(
    document: vscode.TextDocument
): Promise<vscode.DocumentSymbol[]> {

    const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
        "vscode.executeDocumentSymbolProvider",
        document.uri
    );

    return symbols ?? [];
}

export async function findSymbolAt(
    uri: vscode.Uri,
    position: vscode.Position
): Promise<vscode.DocumentSymbol | undefined> {

    const document = await vscode.workspace.openTextDocument(uri);

    const symbols = await getDocumentSymbols(document);

    return getCurrentSymbol(symbols, position);
}

export function isCallableKind(kind: vscode.SymbolKind): boolean {
    return (
        kind === vscode.SymbolKind.Function ||
        kind === vscode.SymbolKind.Method ||
        kind === vscode.SymbolKind.Constructor
    );
}

export function isTypeKind(kind: vscode.SymbolKind): boolean {
    return (
        kind === vscode.SymbolKind.Class ||
        kind === vscode.SymbolKind.Struct ||
        kind === vscode.SymbolKind.Interface ||
        kind === vscode.SymbolKind.Enum
    );
}

export function getCurrentSymbol(
    symbols: vscode.DocumentSymbol[],
    position: vscode.Position
): vscode.DocumentSymbol | undefined {

    for (const symbol of symbols) {
        if (symbol.range.contains(position)) {
            return symbol;
        }
    }

    return undefined;
}

export function printSymbolTree(
    symbols: vscode.DocumentSymbol[],
    depth: number = 0
) {
    for (const symbol of symbols) {

        logger.info(
            `${"  ".repeat(depth)}${symbol.name} (${vscode.SymbolKind[symbol.kind]})`
        );

        printSymbolTree(
            symbol.children,
            depth + 1
        );
    }
}

export async function resolveDefinition(
    uri: vscode.Uri,
    position: vscode.Position
): Promise<vscode.Location[]> {

    const locations =
        await vscode.commands.executeCommand<vscode.Location[]>(
            "vscode.executeDefinitionProvider",
            uri,
            position
        );

    return locations ?? [];
}

export async function buildFunctionFrame(
    uri: vscode.Uri,
    name: string,
    range: vscode.Range
): Promise<FunctionFrame> {

    const document =
        await vscode.workspace.openTextDocument(uri);

    const text = document.getText(range);

    const identifierRegex = /\b[A-Za-z_][A-Za-z0-9_]*\b/g;

    const identifiers = text.match(identifierRegex) ?? [];

    return {
        uri,
        name,
        range,
        text,
        identifiers: identifiers.map(identifier => ({
            name: identifier,
            startInText: text.indexOf(identifier),
            endInText: text.indexOf(identifier) + identifier.length,
            classification: "call",
            target: {
                uri,
                range,
                name: identifier,
                kind: vscode.SymbolKind.Function
            }
        }))
    };
}