'use strict';

const vscode    = require("vscode");
const webpanel  = require("./webpanel");


const Enums = [ "Editor", "Tools", "Samples", "About", "Custom" ];

const Items  = Enums.reduce((a,v) => (a[v] = new webpanel.WebPage(v)) && a, {});


exports.register = (v) => {
    for (const panel of Object.values(v || Items)) {
        if (panel.cmd) vscode.commands.registerCommand(panel.cmd, () => panel.create());
        vscode.window.registerWebviewPanelSerializer(panel.type, panel);
    }
}