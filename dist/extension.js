"use strict";

Object.defineProperty(exports, "__esModule", { value: true });

const vscode   = require("vscode");
const common   = require("./common");
const symbols  = require("./symbols");
const semantic = require("./semantic");
const hovers   = require("./hovers");
const defins   = require("./definition");
const cmds     = require("./commands");


function activate(ctx) {
    common.activate();

    cmds.register();
    
    ctx.subscriptions.push(
        symbols.default(),
        semantic.default(),
        hovers.default(),
        defins.default()
    );
}


function deactivate() { }
exports.activate = activate;
exports.deactivate = deactivate;