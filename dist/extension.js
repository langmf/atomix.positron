"use strict";

Object.defineProperty(exports, "__esModule", { value: true });

const vscode     = require("vscode");
const common     = require("./common");
const symbols    = require("./symbols");
const semantic   = require("./semantic");
const hovers     = require("./hovers");
const definition = require("./definition");
const completion = require("./completion");
const commands   = require("./commands");


function activate(ctx) {
    common.activate();

    commands.register();
    
    ctx.subscriptions.push(
        symbols.default(),
        semantic.default(),
        hovers.default(),
        definition.default(),
        completion.default()
    );
}


function deactivate() { }
exports.activate = activate;
exports.deactivate = deactivate;