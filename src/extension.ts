import * as vscode from "vscode";
import {
    getDocumentSymbols,
    getCurrentSymbol,
    printSymbolTree,
    resolveDefinition,
    findSymbolAt,
    isCallableKind,
    isTypeKind,
    buildFunctionFrame
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

            if (!current) {
                logger.warn("Cursor is not inside any symbol.");
                return;
            }

            const frame = await buildFunctionFrame(
                document.uri,
                current.name,
                current.range
            );

            logger.info("Function body:");
            logger.info(frame.text);

            const identifierRegex = /\b[A-Za-z_][A-Za-z0-9_]*\b/g;
            const identifiers = frame.text.match(identifierRegex) ?? [];

            logger.info("Identifiers found:");

            for (const id of identifiers) {

                logger.info(id);

                const index = frame.text.indexOf(id);

                const position = document.positionAt(
                    document.offsetAt(current.range.start) + index
                );

                const definitions = await resolveDefinition(
                    document.uri,
                    position
                );

                if (definitions.length === 0) {
                    continue;
                }

                const definition = definitions[0];

                const symbol = await findSymbolAt(
                    definition.uri,
                    definition.range.start
                );

                if (!symbol) {
                    continue;
                }

                if (isCallableKind(symbol.kind)) {
                    logger.info(`   -> CALL (${symbol.name})`);
                }
                else if (isTypeKind(symbol.kind)) {
                    logger.info(`   -> TYPE (${symbol.name})`);
                }
            }

            logger.info(`Current symbol: ${current.name}`);

            vscode.window.showInformationMessage(
                `Current Symbol: ${current.name}`
            );
        }
    );

    context.subscriptions.push(disposable);
}

export function deactivate() { }