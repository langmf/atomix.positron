"use strict";

Object.defineProperty(exports, "__esModule", { value: true });

const vscode  = require("vscode");
const common  = require("./common");


async function provideDocumentSymbols(doc) {
    const tid = "Symbols_" + doc.uri.fsPath.split("\\").pop();
    console.time(tid);

    const list   = common.parseSymbols(doc);
    const incs   = await common.parseIncludes(doc);
    const result = common.filterSymbols(list);

    console.timeEnd(tid);
    return result;
}

exports.default = () => vscode.languages.registerDocumentSymbolProvider({ scheme: "file", language: "pos" }, { provideDocumentSymbols });

//exports.default = vscode.languages.registerDocumentSymbolProvider({ scheme: "file", language: "pos" }, { provideDocumentSymbols });