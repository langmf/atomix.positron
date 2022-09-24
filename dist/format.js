"use strict";

const vscode  = require("vscode");
const root    = require("./root");
const cache   = require("./cache");
const common  = require("./common");
const PAT     = require("./patterns");
const DTB     = require("./database");


let tmr = {};


function newValues(doc) {
    if (root.IsAsmLst(doc)) return;
    if (root.config.timeout.AutoFormat <= 0) return;
    if (!vscode.window.activeTextEditor || doc.fileName !== vscode.window.activeTextEditor.document.fileName) return;
    return [];
}
exports.newValues = newValues;


function Delay(doc, values) {
    if (!values) return;  else  clearTimeout(tmr[doc.fileName]);
    
    tmr[doc.fileName] = setTimeout(() => {   
            if (common.active) { Delay(doc, values);   return; }
            
            const edits = Complete(values),   fmtEdit = new vscode.WorkspaceEdit();

            if (edits.length) { fmtEdit.set(doc.uri, edits);    vscode.workspace.applyEdit(fmtEdit); }
        },
        root.config.timeout.AutoFormat
    );
}
exports.Delay = Delay;


function Complete(values) {
    const res = [];
    for (const v of values) if (v.word !== v.name) res.push(new vscode.TextEdit(v.range, v.name));
    return res;
}


function Parse(doc, values = [], tokens) {
    const text = doc.getText(),   files = common.parseDoc(doc),   SEM = cache.get(doc).semantic;
    
    let items,  words;

    const addToken = (m, i = null) => {
        if (i === null) i = items[m[1].toLowerCase()];           if (!i) return;
        const range = new vscode.Range(doc.positionAt(m.index), doc.positionAt(m.index + m[0].length));
        if (tokens) tokens.push(range, i.token);
        if (values) values.push({ range,  word: m[1],  name: i.name });
    }
    

    // -------------------------- parse DOC --------------------------
    items = {};

    for (const file of Object.values(files)) {
        for (const type of Object.values(file.types)) Object.assign(items, type.$items)
    }
    
    SEM.items.doc = items;          for (const m of PAT.WORDS(text, Object.keys(items)))  addToken(m);


    // -------------------------- parse DEV --------------------------
    items = {};     words = [];
    
    for (const sfr of common.getSFR(doc).filter(v => v.words)) {
        Object.assign(items, sfr.items);    words.push(sfr.words);
    }

    SEM.items.dev = items;              for (const m of PAT.WORDS(text, words.join('|')))  addToken(m);


    // -------------------------- parse DTB --------------------------
    const f = DTB.proto_find(doc);      for (const m of PAT.WORDS(text, DTB.words(doc)))   addToken(m, f(m[1]));

    // ---------------------------------------------------------------
    return values;
}
exports.Parse = Parse;


async function provideOnTypeFormattingEdits(doc, position, ch, options, token) {
    return Complete(Parse(doc));
}


async function provideDocumentFormattingEdits(doc, options, token) {
    return Complete(Parse(doc));
}


exports.default = () => [
    vscode.languages.registerOnTypeFormattingEditProvider({   scheme: "file", language: "pos" }, { provideOnTypeFormattingEdits }, "\n"),
    vscode.languages.registerDocumentFormattingEditProvider({ scheme: "file", language: "pos" }, { provideDocumentFormattingEdits })
]
