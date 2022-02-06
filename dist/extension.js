"use strict";

const vscode     = require("vscode");
const root       = require("./root");
const common     = require("./common");
const symbols    = require("./symbols");
const semantic   = require("./semantic");
const hovers     = require("./hovers");
const definition = require("./definition");
const completion = require("./completion");
const commands   = require("./commands");
const webview    = require("./webview");


function activate(context)
{
    root.activate(context);
    common.activate();
    commands.register();
    webview.register();
    
    context.subscriptions.push(
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
