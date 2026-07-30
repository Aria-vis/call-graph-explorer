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