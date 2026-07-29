import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
    vscode.window.showInformationMessage("Call Graph Explorer Activated!");
}

export function deactivate() {}