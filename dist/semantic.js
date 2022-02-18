"use strict";

const vscode  = require("vscode");
const root    = require("./root");
const cache   = require("./cache");
const common  = require("./common");
const PAT     = require("./patterns");
const DTB     = require("./database");


let legend, tmr = {};


function initFormat(doc) {
    if (root.IsAsmLst(doc)) return;
    if (root.config.timeout.AutoFormat <= 0) return;
    if (!vscode.window.activeTextEditor || doc.fileName !== vscode.window.activeTextEditor.document.fileName) return;
    return [];
}


function autoFormat(doc, formats) {
    if (!formats) return;  else  clearTimeout(tmr[doc.fileName]);
    
    tmr[doc.fileName] = setTimeout(() => {
            const edits = [],   fmtEdit = new vscode.WorkspaceEdit();
            
            for (const v of formats) if (v.word !== v.name) edits.push(new vscode.TextEdit(v.range, v.name));
            
            fmtEdit.set(doc.uri, edits);        vscode.workspace.applyEdit(fmtEdit);
        },
        root.config.timeout.AutoFormat
    );
}


function parseALL(doc, tokens, formats) {
    const text = doc.getText(),   files = common.parseDoc(doc),   SEM = cache.get(doc).semantic;
    
    let items,  words;

    const addToken = (m, i = null) => {
        if(i === null) i = items[m[1].toLowerCase()];           if (!i) return;
        const range = new vscode.Range(doc.positionAt(m.index), doc.positionAt(m.index + m[0].length));
        tokens.push(range, i.token);        if (formats) formats.push({ range,  word: m[1],  name: i.name });
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

    SEM.items.dev = items;          for (const m of PAT.WORDS(text, words.join('|')))  addToken(m);


    // -------------------------- parse DTB --------------------------
    for (const m of PAT.WORDS(text, DTB.words(common.getCore(doc))))  addToken(m, DTB.find(m[1]));
}


async function provideDocumentSemanticTokens(doc) {
    await vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider', doc.uri);
    
    if (root.config.smartParentIncludes) {
        const prt = cache.get(doc).$.parent;
        if (prt) await vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider', vscode.Uri.file(prt));
    }

    const tid = "sem_" + doc.uri.fsPath.split("\\").pop();
    if (root.debug) console.time(tid);

    const formats = initFormat(doc),   tokens = new vscode.SemanticTokensBuilder(legend),   SYM = cache.get(doc).symbols;

    parseALL(doc, tokens, formats);         autoFormat(doc, formats);

    if (SYM.$.local) {
        const dev = SYM.$.local,  e = dev.range.end;     tokens.push(new vscode.Range(e.translate(0,-dev.name.length), e), dev.token);
    }

    const result = tokens.build();
    
    if (root.debug) console.timeEnd(tid);

    return result;
}


exports.default = () => {
    legend = common.legend();
    return vscode.languages.registerDocumentSemanticTokensProvider({ scheme: "file", language: "pos" }, { provideDocumentSemanticTokens }, legend);
}