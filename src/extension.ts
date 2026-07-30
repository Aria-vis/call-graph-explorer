import * as vscode from "vscode";
import {
    getDocumentSymbols,
    getCurrentSymbol
} from "./symbolResolver";

export function activate(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand(
        "callGraphExplorer.open",
        async () => {
            const editor = vscode.window.activeTextEditor;

            if (!editor) {
                vscode.window.showErrorMessage("No active editor found.");
                return;
            }

            const document = editor.document;

            const symbols = await getDocumentSymbols(document);

            const current = getCurrentSymbol(
                symbols,
                editor.selection.active
            );

            if (!current) {
                vscode.window.showInformationMessage("No symbol found.");
                return;
            }

            vscode.window.showInformationMessage(
                `Current Symbol: ${current.name}`
            );
        }
    );

    context.subscriptions.push(disposable);
}

export function deactivate() {}