import * as vscode from "vscode";
import {
    getDocumentSymbols,
    getCurrentSymbol,
    printSymbolTree
} from "./symbolResolver";
import { logger } from "./logger";

export function activate(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand(
        "callGraphExplorer.open",
        async () => {
            const editor = vscode.window.activeTextEditor;

            if (!editor) {
                vscode.window.showErrorMessage("No active editor found.");
                return;
            }

            logger.clear();
            logger.show();
            logger.info("Call Graph Explorer command executed.");

            const document = editor.document;

            logger.info(`Opened file: ${document.fileName}`);

            const symbols = await getDocumentSymbols(document);
            printSymbolTree(symbols);

            logger.info(`Found ${symbols.length} top-level symbol(s).`);

            const current = getCurrentSymbol(
                symbols,
                editor.selection.active
            );

            if (current) {
                logger.info(`Current symbol: ${current.name}`);
            } else {
                logger.warn("Cursor is not inside any symbol.");
            }

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

export function deactivate() { }