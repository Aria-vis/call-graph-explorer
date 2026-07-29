import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand(
        "callGraphExplorer.open",
        () => {
            vscode.window.showInformationMessage("Call Graph Explorer Activated!");
        }
    );

    context.subscriptions.push(disposable);
}

export function deactivate() {}