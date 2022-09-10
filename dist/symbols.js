"use strict";

const vscode  = require("vscode");
const root    = require("./root");
const common  = require("./common");

const $cache = {};


async function provideDocumentSymbols(doc) {
    const name = doc.fileName;                      if ($cache[name]) return $cache[name];

    const dtm = root.debugTime("sym", doc).begin();

    $cache[name] = common.parseSymbols(doc);        const result = await $cache[name];          $cache[name] = false;

    dtm.end();

    return result;
}

exports.default = () => vscode.languages.registerDocumentSymbolProvider({ scheme: "file", language: "pos" }, { provideDocumentSymbols });
