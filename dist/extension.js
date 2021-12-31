"use strict";

Object.defineProperty(exports, "__esModule", { value: true });

const vscode   = require("vscode");
const symbols  = require("./symbols");
const semantic = require("./semantic");

const { registerCmds } = require('./registerCmds');

    
function activate(ctx) {
    ctx.subscriptions.push(symbols, semantic);
    
    registerCmds();
        
    vscode.window.onDidChangeTextEditorSelection(sel => {
        if (sel.textEditor.document.languageId !== "pos") return;
        if (sel.kind == vscode.TextEditorSelectionChangeKind.Command) symbols.onSelect(sel);
        if (sel.kind == vscode.TextEditorSelectionChangeKind.Mouse) {
            if (vscode.workspace.getConfiguration("pos").output.ClickHide) vscode.commands.executeCommand("workbench.action.closePanel");
        }
    });
}


function deactivate() { }

exports.activate = activate;
exports.deactivate = deactivate;