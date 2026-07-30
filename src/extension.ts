import * as vscode from "vscode";
import { getDocumentSymbols } from "./symbolResolver";

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

            vscode.window.showInformationMessage(
                `Found ${symbols.length} top-level symbols.`
            );
        }
    );

    context.subscriptions.push(disposable);
}

export function deactivate() { }