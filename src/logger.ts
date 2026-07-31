import * as vscode from "vscode";

class Logger {
    private readonly outputChannel: vscode.OutputChannel;

    constructor() {
        this.outputChannel = vscode.window.createOutputChannel(
            "Call Graph Explorer"
        );
    }

    info(message: string): void {
        this.outputChannel.appendLine(`[INFO] ${message}`);
    }

    warn(message: string): void {
        this.outputChannel.appendLine(`[WARN] ${message}`);
    }

    error(message: string): void {
        this.outputChannel.appendLine(`[ERROR] ${message}`);
    }

    show(): void {
        this.outputChannel.show();
    }

    clear(): void {
        this.outputChannel.clear();
    }
}

export const logger = new Logger();