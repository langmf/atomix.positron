'use strict';

const vscode = require("vscode");
const web    = require("./webpanel");

const Enums = [ "Settings", "Plugins", "Programs", "About" ];

const Items  = Enums.reduce((a,v) => (a[v] = new web.WebPage(v)) && a, {});


exports.register = () => {
    for (const panel of Object.values(Items)) {
        vscode.commands.registerCommand(panel.cmd, panel.create);
        vscode.window.registerWebviewPanelSerializer(panel.type, panel);
    }
}