"use strict";

const vscode  = require("vscode");
const root    = require("./root");
const common  = require("./common");


async function provideDocumentSymbols(doc) {
    const tid = "sym_" + doc.uri.fsPath.split("\\").pop();
    if (root.debug) console.time(tid);

    const result = await common.parseSymbols(doc);

    if (root.debug) console.timeEnd(tid);

    return result;
}

exports.default = () => vscode.languages.registerDocumentSymbolProvider({ scheme: "file", language: "pos" }, { provideDocumentSymbols });
