"use strict";

Object.defineProperty(exports, "__esModule", { value: true });

const vscode  = require("vscode");
const common  = require("./common");


async function provideDocumentSymbols(doc) {
    const tid = "Symbols_" + doc.uri.fsPath.split("\\").pop();
    console.time(tid);

    const list = common.parseSymbols(doc);
    const incs = await common.parseIncludes(doc, list);

    const result = Object.values(list).reduce((res, v) => {
        if (v.children.length) { if (common.showInRoot.includes(v.name.toLowerCase())) return res.concat(v.children);  else  res.push(v); }
        return res;
    }, []);

    console.timeEnd(tid);
    return result;
}

exports.default = vscode.languages.registerDocumentSymbolProvider({ scheme: "file", language: "pos" }, { provideDocumentSymbols });