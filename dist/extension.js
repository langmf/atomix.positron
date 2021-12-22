"use strict";

Object.defineProperty(exports, "__esModule", { value: true });

const vscode  = require("vscode");
const symbols = require("./symbols");

const { registerCmds } = require('./registerCmds');

function activate(ctx) {
    ctx.subscriptions.push(symbols);
    
    registerCmds();
  
    if (vscode.workspace.getConfiguration("pos").output.ClickHide) {
        vscode.window.onDidChangeTextEditorSelection(sel => {
            if (sel.textEditor.document.languageId !== "pos" || sel.kind != vscode.TextEditorSelectionChangeKind.Mouse) return;
            vscode.commands.executeCommand("workbench.action.closePanel");
        });
    }
}


function deactivate() { }

exports.activate = activate;
exports.deactivate = deactivate;