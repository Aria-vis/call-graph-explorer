import * as vscode from "vscode";
import * as path from "path";
import { buildFunctionFrame, FunctionFrame, getEnclosingFunction } from "./symbolResolver";

interface PinnedType {
  name: string;
  text: string;
  uri: vscode.Uri;
  range: vscode.Range;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function nonce(): string {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) text += possible.charAt(Math.floor(Math.random() * possible.length));
  return text;
}

function renderAnnotatedSource(frame: FunctionFrame): string {
  const ids = [...frame.identifiers].sort((a, b) => a.startInText - b.startInText);
  let html = "";
  let cursor = 0;
  for (const id of ids) {
    html += escapeHtml(frame.text.slice(cursor, id.startInText));
    const raw = frame.text.slice(id.startInText, id.endInText);
    const cls = id.classification === "call" ? "call" : "type";
    html +=
      `<span class="${cls}" ` +
      `data-uri="${escapeHtml(id.target.uri.toString())}" ` +
      `data-sline="${id.target.range.start.line}" data-schar="${id.target.range.start.character}" ` +
      `data-eline="${id.target.range.end.line}" data-echar="${id.target.range.end.character}" ` +
      `data-name="${escapeHtml(id.target.name)}">${escapeHtml(raw)}</span>`;
    cursor = id.endInText;
  }
  html += escapeHtml(frame.text.slice(cursor));
  return html;
}

export class CallGraphPanel {
  public static current: CallGraphPanel | undefined;

  private readonly panel: vscode.WebviewPanel;
  private readonly extensionUri: vscode.Uri;
  private stack: FunctionFrame[] = [];
  private pinnedType: PinnedType | undefined;
  private disposables: vscode.Disposable[] = [];

  public static async createOrShow(extensionUri: vscode.Uri) {
    const column = vscode.ViewColumn.Beside;
    if (CallGraphPanel.current) {
      CallGraphPanel.current.panel.reveal(column);
      return CallGraphPanel.current;
    }
    const panel = vscode.window.createWebviewPanel(
      "callGraphExplorer",
      "Call Graph Explorer",
      column,
      { enableScripts: true, retainContextWhenHidden: true, localResourceRoots: [vscode.Uri.joinPath(extensionUri, "media")] }
    );
    CallGraphPanel.current = new CallGraphPanel(panel, extensionUri);
    return CallGraphPanel.current;
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this.panel = panel;
    this.extensionUri = extensionUri;

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    this.panel.webview.onDidReceiveMessage(
      (message) => this.handleMessage(message),
      null,
      this.disposables
    );
  }

  public async openAtCursor(editor: vscode.TextEditor) {
    const enclosing = await getEnclosingFunction(editor.document, editor.selection.active);
    if (!enclosing) {
      vscode.window.showInformationMessage(
        "Call Graph Explorer: put the cursor inside a function/method body first."
      );
      return;
    }
    await this.pushFrame(editor.document.uri, enclosing.name, enclosing.range);
  }

  private async pushFrame(uri: vscode.Uri, name: string, range: vscode.Range) {
    this.setLoading(`Resolving ${name}()...`);
    const frame = await buildFunctionFrame(uri, name, range);

    console.log(`RESOLVED IN ${name}:`, frame.identifiers.map(id => id.name));

    if (frame.identifiers.length === 0) {
      vscode.window.showWarningMessage(
        `No calls or types resolved in ${name}(). If this is unexpected, ensure your C/C++ Language Server (e.g., clangd) is installed and has finished indexing.`
      );
    }

    this.stack.push(frame);
    this.pinnedType = undefined;
    this.render();
  }

  private async handleMessage(message: any) {
    switch (message.type) {
      case "navigate": {
        const uri = vscode.Uri.parse(message.uri);
        const range = new vscode.Range(
          new vscode.Position(message.sline, message.schar),
          new vscode.Position(message.eline, message.echar)
        );
        await this.pushFrame(uri, message.name, range);
        break;
      }
      case "peekType": {
        const uri = vscode.Uri.parse(message.uri);
        const range = new vscode.Range(
          new vscode.Position(message.sline, message.schar),
          new vscode.Position(message.eline, message.echar)
        );
        this.setLoading(`Loading ${message.name}...`);
        const document = await vscode.workspace.openTextDocument(uri);
        this.pinnedType = { name: message.name, text: document.getText(range), uri, range };
        this.render();
        break;
      }
      case "closeType":
        this.pinnedType = undefined;
        this.render();
        break;
      case "goBack": {
        const index: number = message.index;
        this.stack = this.stack.slice(0, index + 1);
        this.pinnedType = undefined;
        this.render();
        break;
      }
      case "openInEditor": {
        const uri = vscode.Uri.parse(message.uri);
        const position = new vscode.Position(message.sline, message.schar);
        const doc = await vscode.workspace.openTextDocument(uri);
        const targetEditor = await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
        targetEditor.selection = new vscode.Selection(position, position);
        targetEditor.revealRange(new vscode.Range(position, position));
        break;
      }
    }
  }

  private setLoading(text: string) {
    this.panel.webview.html = this.wrapHtml(`<div class="loading">${escapeHtml(text)}</div>`);
  }

  private render() {
    if (this.stack.length === 0) {
      this.panel.webview.html = this.wrapHtml(`<div class="loading">No function loaded yet.</div>`);
      return;
    }

    const breadcrumb = this.stack
      .map((f, i) => {
        const isLast = i === this.stack.length - 1;
        const label = `${f.name}()`;
        return isLast
          ? `<span class="crumb current">${escapeHtml(label)}</span>`
          : `<span class="crumb" data-index="${i}">${escapeHtml(label)}</span>`;
      })
      .join(`<span class="crumb-sep">›</span>`);

    const current = this.stack[this.stack.length - 1];
    const fileLabel = path.basename(current.uri.fsPath);
    const code = renderAnnotatedSource(current);

    const pinned = this.pinnedType
      ? `<div class="pinned-header">
           <span>${escapeHtml(this.pinnedType.name)}</span>
           <button id="closeType">✕</button>
         </div>
         <pre class="pinned-code">${escapeHtml(this.pinnedType.text)}</pre>`
      : `<div class="pinned-empty">Click a struct / class / enum name to peek its definition here.</div>`;

    const body = `
      <div class="breadcrumb">${breadcrumb}</div>
      <div class="file-label">${escapeHtml(fileLabel)}</div>
      <pre class="code"><code>${code}</code></pre>
      <div class="pinned-panel">${pinned}</div>
    `;
    this.panel.webview.html = this.wrapHtml(body);
  }

  private wrapHtml(body: string): string {
    const styleUri = this.panel.webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, "media", "style.css")
    );
    const scriptUri = this.panel.webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, "media", "main.js")
    );
    const csp = nonce();
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; style-src ${this.panel.webview.cspSource}; script-src 'nonce-${csp}';" />
  <link href="${styleUri}" rel="stylesheet" />
</head>
<body>
  ${body}
  <script nonce="${csp}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  public dispose() {
    CallGraphPanel.current = undefined;
    this.panel.dispose();
    while (this.disposables.length) {
      const d = this.disposables.pop();
      if (d) d.dispose();
    }
  }
}