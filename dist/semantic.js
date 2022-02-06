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


function parse_DOC(doc, tokens, formats) {
    const items = {},  text = doc.getText(),  files = common.parseDoc(doc);
    
    for (const file of Object.values(files)) {
        for (const type of Object.values(file.types)) Object.assign(items, type.$items)
    } 

    for (const m of PAT.WORDS(text, Object.keys(items))) {
        const n = m[1].toLowerCase(),  token = items[n].token;
        
        const range = new vscode.Range(doc.positionAt(m.index), doc.positionAt(m.index + m[0].length));
        
        tokens.push(range, token);          if (formats) formats.push({ range,  word: m[1],  name: items[n].name });
    }
}


function parse_DEV(doc, tokens, formats) {
    const text = doc.getText(),  dev = cache.get(doc).symbols.$.device;

    for (const sfr of common.Types._.dev) {
        const token = dev[sfr].token,  items = dev[sfr].items;

        for (const m of PAT.WORDS(text, dev[sfr].words)) {
            const range = new vscode.Range(doc.positionAt(m.index), doc.positionAt(m.index + m[0].length));
            
            tokens.push(range, token);      if (formats) formats.push({ range,  word: m[1],  name: items[m[1].toLowerCase()].name });
        }
    }
}


function parse_DTB(doc, tokens, formats) {
    const text = doc.getText(),  core = common.getCore(doc);

    for (const m of PAT.WORDS(text, DTB.words(core))) {
        const i = DTB.find(m[1]);        if (!i) continue;

        const range = new vscode.Range(doc.positionAt(m.index), doc.positionAt(m.index + m[0].length));
        
        tokens.push(range, i.token);        if (formats) formats.push({ range,  word: m[1],  name: i.name });
    }
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

    parse_DOC(doc, tokens, formats);
    parse_DEV(doc, tokens, formats);
    parse_DTB(doc, tokens, formats);

    autoFormat(doc, formats);

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