"use strict";

const vscode  = require("vscode");
const root    = require("./root");
const common  = require("./common");

const $cache = {}

const $last  = { name: '',  count: 0,  result: null }

setInterval(() => {  $last.count = 0  }, 1000)      /* fixed circular call provideDocumentSymbols from only opened inc files when first open vscode */


async function provideDocumentSymbols(doc, h)
{
    const name = doc.fileName;                      if ($cache[name]) return $cache[name];

    if ($last.name === name)  { $last.count++;      if ($last.count > 20) return $last.result }
    else                      { $last.count = 0;    $last.name = name;    $last.result = null }
    
    const dtm = root.debugTime("sym", doc).begin();

    $cache[name] = common.parseSymbols(doc)
    
    const result = await $cache[name]

    $cache[name] = false

    $last.result = result

    dtm.end();

    return result;
}


exports.default = () => vscode.languages.registerDocumentSymbolProvider({ scheme: "file", language: "pos" }, { provideDocumentSymbols });
