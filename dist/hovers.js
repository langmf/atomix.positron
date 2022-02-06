"use strict";

const vscode  = require("vscode");
const cache   = require("./cache");
const common  = require("./common");
const DTB     = require("./database");


function provideHover(doc, position) {
    if (common.failRange(doc, position)) return null;

    const word = common.getWordRange(doc, position),   files = common.parseDoc(doc);

    for (const file of Object.values(files)) {
        for (const type of Object.values(file.types)) {
            if (word in type.$items) {
                const scope = "\t' [" + (file.isLocal ? "Local" : file.scope) + "]";
                return new vscode.Hover({ language: "pos", value: type.$items[word].text + scope});
            }
        }
    }

    const dev = cache.get(doc).symbols.$.device;
    
    for (const items of common.Types._.dev.map(v => dev[v].items)) {
        if (word in items) 
        return new vscode.Hover(items[word].value);
    }

    const word2 = common.getWordRange(doc, position, /[-+*$#\w\d_]+/i),   i = DTB.find(word2, common.getCore(doc))
    
    if (i && i.hint) {
        const mark = new vscode.MarkdownString(i.hint.replace(/^"|"$/g,''));
        mark.supportHtml = true;
        mark.isTrusted   = true;
        return new vscode.Hover(mark);
    }

    return null;
}


exports.default = () => vscode.languages.registerHoverProvider({ scheme: "file", language: "pos" }, { provideHover });
