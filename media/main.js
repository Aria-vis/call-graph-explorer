(function () {
  const vscode = acquireVsCodeApi();

  document.addEventListener("click", (event) => {
    const el = event.target;
    if (!(el instanceof HTMLElement)) return;

    if (el.classList.contains("call")) {
      vscode.postMessage({
        type: "navigate",
        uri: el.dataset.uri,
        sline: Number(el.dataset.sline),
        schar: Number(el.dataset.schar),
        eline: Number(el.dataset.eline),
        echar: Number(el.dataset.echar),
        name: el.dataset.name,
      });
      return;
    }

    if (el.classList.contains("type")) {
      vscode.postMessage({
        type: "peekType",
        uri: el.dataset.uri,
        sline: Number(el.dataset.sline),
        schar: Number(el.dataset.schar),
        eline: Number(el.dataset.eline),
        echar: Number(el.dataset.echar),
        name: el.dataset.name,
      });
      return;
    }

    if (el.classList.contains("crumb") && el.dataset.index !== undefined) {
      vscode.postMessage({ type: "goBack", index: Number(el.dataset.index) });
      return;
    }

    if (el.id === "closeType") {
      vscode.postMessage({ type: "closeType" });
      return;
    }
  });

  document.addEventListener("click", (event) => {
    const el = event.target;
    if (!(el instanceof HTMLElement)) return;
    if ((el.classList.contains("call") || el.classList.contains("type")) && (event.altKey || event.metaKey)) {
      vscode.postMessage({
        type: "openInEditor",
        uri: el.dataset.uri,
        sline: Number(el.dataset.sline),
        schar: Number(el.dataset.schar),
      });
    }
  });
})();
