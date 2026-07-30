import * as vscode from "vscode";

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