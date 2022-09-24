"use strict";

const vscode  = require("vscode");
const root    = require("./root");
const cache   = require("./cache");
const common  = require("./common");
const format  = require("./format");


let legend;


async function provideDocumentSemanticTokens(doc) {
    await vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider', doc.uri);
    
    if (root.config.smartParentIncludes) {
        const prt = root.getParent(doc);      if (prt) await vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider', vscode.Uri.file(prt));
    }

    const dtm = root.debugTime("sem", doc).begin();

    const values = format.newValues(doc),   tokens = new vscode.SemanticTokensBuilder(legend),   SYM = cache.get(doc).symbols;

    format.Parse(doc, values, tokens);
    format.Delay(doc, values);

    if (SYM.$.local) {
        const dev = SYM.$.local,  e = dev.range.end;
        tokens.push(new vscode.Range(e.translate(0,-dev.name.length), e), dev.token);
    }

    const result = tokens.build();
    
    dtm.end();

    return result;
}


exports.default = () => {
    legend = common.legend();
    return vscode.languages.registerDocumentSemanticTokensProvider({ scheme: "file", language: "pos" }, { provideDocumentSemanticTokens }, legend);
}
