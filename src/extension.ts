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
            const sourceCode = document.getText();

            vscode.window.showInformationMessage(
                `File has ${sourceCode.length} characters.`
            );
        }
    );

    context.subscriptions.push(disposable);
}

export function deactivate() { }