"use strict";

const vscode  = require("vscode");
const common  = require("./common");
const DTB     = require("./database");


function getMarkdown(text, cb) {
    const mark = new vscode.MarkdownString();       mark.supportHtml = true;        mark.isTrusted   = true;
    if (cb) mark.appendCodeblock('');
    mark.appendMarkdown(text);
    return mark;
}


function provideHover(doc, position) {
    if (common.failRange(doc, position)) return null;

    const word = common.getWordRange(doc, position),   files = common.parseDoc(doc);

    for (const [name, file] of Object.entries(files)) {
        for (const type of Object.values(file.types)) {
            if (!(word in type.$items)) continue;
            
            let text = type.$items[word].code,   scope = "\t '&nbsp;[&nbsp;" + (file.isLocal ? "Local" : file.scope) + "&nbsp;]";

            text += (/\n/.test(text) ? '\n\n' : '') + scope;

            return new vscode.Hover(getMarkdown(common.codeHTML(text, name, true), true));
        }
    }


    for (const items of common.getSFR(doc).map(v => v.items)) {
        if (word in items) return new vscode.Hover(items[word].value);
    }


    const word2 = common.getWordRange(doc, position, /[-+*$#\w\d_]+/i),   i = DTB.find(word2, common.getCore(doc))
    
    if (i && i.hint) return new vscode.Hover(getMarkdown(i.hint));


    return null;
}


exports.default = () => vscode.languages.registerHoverProvider({ scheme: "file", language: "pos" }, { provideHover });
