import * as vscode from "vscode";
import { CallGraphPanel } from "./callGraphPanel";

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand("callGraphExplorer.open", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showInformationMessage("Open a C/C++ file first.");
      return;
    }
    const panel = await CallGraphPanel.createOrShow(context.extensionUri);
    await panel.openAtCursor(editor);
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {
}