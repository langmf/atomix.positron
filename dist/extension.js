"use strict";

Object.defineProperty(exports, "__esModule", { value: true });

const vscode = require("vscode");
const cmds = require("./commands");


function activate() {
    vscode.commands.registerCommand("pos.runCompile",  () => {    runWait(cmds.runCompile); });
    vscode.commands.registerCommand("pos.runProgram",  () => {    runWait(cmds.runProgram); });
    vscode.commands.registerCommand("pos.runCombine",  () => {    runWait(cmds.runCombine); });
    vscode.commands.registerCommand("pos.stopCompile", () => {    cmds.stopCompile();       });
    vscode.commands.registerCommand("pos.viewAsm",     () => {    cmds.viewFile(".asm");    });
    vscode.commands.registerCommand("pos.viewLst",     () => {    cmds.viewFile(".lst");    });
    
    if (vscode.workspace.getConfiguration("pos").output.ClickHide) {
        vscode.window.onDidChangeTextEditorSelection(sel => {
            if (sel.textEditor.document.languageId !== "pos" || sel.kind != vscode.TextEditorSelectionChangeKind.Mouse) return;
            vscode.commands.executeCommand("workbench.action.closePanel");
        });
    }
}


async function runWait(f) {
    await f();
    const cfg = vscode.workspace.getConfiguration("pos").output;
    setTimeout(function(){ if (cfg.DelayHide) vscode.commands.executeCommand("workbench.action.closePanel"); }, cfg.DelayHide);
}


function deactivate() { }

exports.activate = activate;
exports.deactivate = deactivate;