import * as vscode from "vscode";

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
            const position = editor.selection.active;

            vscode.window.showInformationMessage(
                `Line: ${position.line + 1}, Column: ${position.character + 1}`
            );
        }
    );

    context.subscriptions.push(disposable);
}

export function deactivate() { }