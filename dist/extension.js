"use strict";

const root       = require("./root");
const common     = require("./common");
const symbols    = require("./symbols");
const semantic   = require("./semantic");
const hovers     = require("./hovers");
const definition = require("./definition");
const completion = require("./completion");
const signature  = require("./signature");
const references = require("./references");
const commands   = require("./commands");
const webview    = require("./webview");
const plugins    = require("./plugins");


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
        completion.default(),
        signature.default(),
        references.default()
    );
}
exports.activate = activate;


async function deactivate() {
    await plugins.unload();
}
exports.deactivate = deactivate;
