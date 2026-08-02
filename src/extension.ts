import * as vscode from "vscode";
import { CallGraphPanel } from "./callGraphPanel";
import { logger } from "./logger";

export function activate(context: vscode.ExtensionContext) {
  logger.info("Call Graph Explorer activated.");

  const disposable = vscode.commands.registerCommand("callGraphExplorer.open", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      logger.warn("Command triggered without an active C/C++ editor.");
      vscode.window.showInformationMessage("Open a C/C++ file first.");
      return;
    }
    
    logger.info(`Opening Call Graph Explorer for: ${editor.document.uri.fsPath}`);
    const panel = await CallGraphPanel.createOrShow(context.extensionUri);
    await panel.openAtCursor(editor);
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {
  logger.info("Call Graph Explorer deactivated.");
}