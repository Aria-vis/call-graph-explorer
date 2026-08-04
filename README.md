# 🧭 Call Graph Explorer

A specialized VS Code extension built to visualize deep recursive calls and execution flow in C++. 

Standard IDE call hierarchies often break when parsing single-file algorithmic templates. Call Graph Explorer is engineered to survive the chaotic, macro-heavy environments of competitive programming, filtering out the noise of standard libraries and focusing entirely on your custom logic.

![Demo](link-to-a-gif-or-screenshot-here.gif) 

## ✨ Key Features
* **Surgical Focus:** Automatically ignores standard C++ boilerplate (I/O streams, standard template library methods) to map only the custom algorithmic flow.
* **Macro Resilience Engine:** Implements a custom heuristic fallback that correctly identifies function boundaries even when the C++ Language Server (IntelliSense/clangd) fails due to complex multi-line `#define` macros.
* **Breadcrumb Navigation:** Drill down into deep recursive trees and snap back to the surface instantly using a visual stack trace.
* **Type Peeking:** Instantly peek into custom `struct` or `class` definitions in a floating panel without losing your place in the function stack.

## 🚀 How to Install 
You can install and test this extension in less than 30 seconds:

1. Download the latest `call-graph-explorer-0.0.1.vsix` file from the [Releases page](https://github.com/Aria-vis/call-graph-explorer/releases).
2. Open VS Code and navigate to the **Extensions** panel (`Ctrl+Shift+X`).
3. Click the **`...`** (Views and More Actions) menu at the top right of the panel.
4. Select **Install from VSIX...** and choose the downloaded file.

## 💻 Usage Instructions
1. Open any C++ file in your workspace (ensure a C/C++ language extension is active).
2. Place your cursor anywhere inside a function body (e.g., inside `main()`).
3. Press `Ctrl + Shift + P` to open the Command Palette.
4. Type **`Open Call Graph Explorer`** and hit Enter.
5. Click on highlighted function calls to navigate the execution tree!