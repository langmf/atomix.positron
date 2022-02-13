'use strict';

const vscode    = require("vscode");
const path      = require("path");
const root      = require("./root");


const items = exports.items = {};


exports.require = (value) => require(__dirname + '\\' + value);

exports.file    = (value) => path.dirname(value) + '\\positron.js';


exports.load = (file) => {
    if (!root.checkFile(file) || (file in items)) return;

    try {
        const code = items[file] = require(file);
        return !code.activate ? true : code.activate({ root,  require: exports.require });
    }
    catch (e) { vscode.window.showErrorMessage(`PLUG_Load => "${file}" -> ${e}`); }
}


exports.unload = async (file) => {
    if (file) { delete items[file];    return; }

    try { 
        Object.values(items).map(async v => (v.deactivate && await v.deactivate()));
    }
    catch (e) { vscode.window.showErrorMessage(`PLUG_Unload -> ${e}`); }
}


exports.command = async (data, state) => {
    const file = exports.file(data.file);           if (!(file in items)) return;

    try {
        const code = items[file];
        return !code.command ? false : await code.command(data, state);
    }
    catch (e) { vscode.window.showErrorMessage(`PLUG_Command => "${file}" -> ${e}`); }
}