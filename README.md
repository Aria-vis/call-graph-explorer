# Call Graph Explorer

Navigate complex C/C++ call stacks, recursive algorithms, and structs directly in a visual webview without losing your context. 

## Features

* **Interactive Call Graph:** Click on any function call to instantly drill down into its execution path.
* **Inline Struct Peeking:** Click on custom structs or classes to open a clean definition view at the bottom of the panel, avoiding disruptive file jumps.
* **Breadcrumb Navigation:** Keep track of deeply nested recursive calls and snap back to the top of your stack with a single click.
* **Context-Aware:** Intelligently filters out local variables so you only see the architectural flow of your code.

## Requirements

This extension requires an active C/C++ Language Server to parse symbols. Ensure you have one of the following installed and running:
* [C/C++ by Microsoft](https://marketplace.visualstudio.com/items?itemName=ms-vscode.cpptools) 
* [clangd](https://marketplace.visualstudio.com/items?itemName=llvm-vs-code-extensions.vscode-clangd)

## Usage

1. Open a C or C++ file.
2. Place your cursor inside a function body (e.g., `main()`).
3. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`).
4. Run **`Open Call Graph Explorer`**.

## Release Notes

### 0.0.1
* Initial release: Core parsing engine, webview UI, and recursive symbol resolution.