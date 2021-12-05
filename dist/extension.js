"use strict";

Object.defineProperty(exports, "__esModule", { value: true });

const vscode_1 = require("vscode");
const cmds_1 = require("./commands");

function activate() {
    vscode_1.commands.registerCommand("pos.runCompile",  () => {    cmds_1.runCompile();       });
    vscode_1.commands.registerCommand("pos.runProgram",  () => {    cmds_1.runProgram();       });
    vscode_1.commands.registerCommand("pos.runCombine",  () => {    cmds_1.runCombine();       });
    vscode_1.commands.registerCommand("pos.stopCompile", () => {    cmds_1.stopCompile();      });
    vscode_1.commands.registerCommand("pos.viewAsm",     () => {    cmds_1.viewFile(".asm");   });
    vscode_1.commands.registerCommand("pos.viewLst",     () => {    cmds_1.viewFile(".lst");   });
}
exports.activate = activate;
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map