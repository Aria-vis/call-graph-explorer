const { defineConfig } = require('@vscode/test-cli');

module.exports = defineConfig({ 
    files: 'out/test/**/*.test.js',
    workspaceFolder: './sample',
    mocha: {
        timeout: 60000 // Give Mocha 60 seconds to allow for extension downloads & indexing
    },
    launchArgs: [
        '--install-extension', 'llvm-vs-code-extensions.vscode-clangd'
    ]
});