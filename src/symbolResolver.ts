import * as vscode from "vscode";
import { logger } from "./logger";

export async function getDocumentSymbols(
    document: vscode.TextDocument
): Promise<vscode.DocumentSymbol[]> {

    const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
        "vscode.executeDocumentSymbolProvider",
        document.uri
    );

    return symbols ?? [];
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