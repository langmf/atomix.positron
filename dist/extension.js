"use strict";

Object.defineProperty(exports, "__esModule", { value: true });

const vscode   = require("vscode");
const common   = require("./common");
const symbols  = require("./symbols");
const semantic = require("./semantic");
const cmds     = require("./commands");


function activate(ctx) {
    vscode.workspace.onDidChangeConfiguration(common.loadConfig);           common.loadConfig();
    
    ctx.subscriptions.push(symbols, semantic);
    
    cmds.register();
        
    vscode.window.onDidChangeTextEditorSelection(sel => {
        if (sel.textEditor.document.languageId !== "pos") return;
        if (sel.kind == vscode.TextEditorSelectionChangeKind.Mouse) {
            if (vscode.workspace.getConfiguration("pos").output.ClickHide) vscode.commands.executeCommand("workbench.action.closePanel");
        }
        else if (sel.kind == vscode.TextEditorSelectionChangeKind.Command) common.onSelect(sel);
    });
}


function deactivate() { }

exports.activate = activate;
exports.deactivate = deactivate;