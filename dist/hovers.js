"use strict";

const vscode  = require("vscode");
const common  = require("./common");
const DTB     = require("./database");


function cleanMark(v) {
    return v.replace(/[\\`*_{}[\]()#+\-.!]/g, '\\$&');
}


function getMarkdown(text, cb) {
    const mark = new vscode.MarkdownString();       mark.supportHtml = true;        mark.isTrusted   = true;
    if (cb) mark.appendCodeblock('');
    mark.appendMarkdown(text);
    return mark;
}


function provideHover(doc, position) {
    if (common.failRange(doc, position)) return null;

    const word = common.getWordRange(doc, position),   proc = common.getProc(doc, position);


    if (proc && (word in proc.members)) {
        let text = proc.members[word].code,   scope = "\t '&nbsp;[&nbsp;" + proc.name + "&nbsp;]";

        if (/\n/.test(text)) text = text.replace(/[\r\n]+$/, '') + '\n\n';

        return new vscode.Hover(getMarkdown(common.codeHTML(text + scope, doc, true, proc.members), true));
    }


    for (const [name, file] of Object.entries(common.parseDoc(doc))) {
        for (const type of Object.values(file.types)) {
            if (!(word in type.$items)) continue;               const members = type.$items[word].members;
            
            let text = type.$items[word].code,   scope = "\t '&nbsp;[&nbsp;" + (file.isLocal ? "Local" : file.scope) + "&nbsp;]";

            if (/\n/.test(text)) text = text.replace(/[\r\n]+$/, '') + '\n\n';

            return new vscode.Hover(getMarkdown(common.codeHTML(text + scope, name, true, members), true));
        }
    }


    for (const items of common.getSFR(doc).map(v => v.items)) {
        if (word in items) return new vscode.Hover(items[word].value);
    }


    const word2 = common.getWordRange(doc, position, /[-+*$#\w\d_]+/i),   i = DTB.find(word2, doc)
    
    if (i && i.hint) return new vscode.Hover(getMarkdown(cleanMark(i.hint)));


    return null;
}


exports.default = () => vscode.languages.registerHoverProvider({ scheme: "file", language: "pos" }, { provideHover });
