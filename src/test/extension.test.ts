import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Call Graph Explorer Test Suite', () => {
    vscode.window.showInformationMessage('Starting lifecycle tests.');

    test('Extension should be present and active', async () => {
        const extension = vscode.extensions.getExtension('aria-vis.call-graph-explorer');
        assert.ok(extension, 'Extension should be found in the host environment.');
        
        if (!extension.isActive) {
            await extension.activate();
        }
        assert.strictEqual(extension.isActive, true, 'Extension should activate successfully without throwing errors.');
    });

    test('Core command should be registered securely', async () => {
        const commands = await vscode.commands.getCommands(true);
        
        assert.ok(
            commands.includes('callGraphExplorer.open'), 
            'Command callGraphExplorer.open should be registered and available to the user.'
        );
    });
});