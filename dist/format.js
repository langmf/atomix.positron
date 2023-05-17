"use strict";

const vscode  = require("vscode");
const root    = require("./root");
const common  = require("./common");
const PAT     = require("./patterns");
const DTB     = require("./database");


let tmr = {};


function newValues(doc)
{
    if (root.IsAsmLst(doc)) return;
    if (root.config.timeout.AutoFormat <= 0) return;
    if (!vscode.window.activeTextEditor || doc.fileName !== vscode.window.activeTextEditor.document.fileName) return;
    return [];
}
exports.newValues = newValues;


function Delay(doc, values)
{
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


function Complete(values)
{
    const res = [];
    for (const v of values) if (v.word !== v.name) res.push(new vscode.TextEdit(v.range, v.name));
    return res;
}


function Parse(doc, values = [], tokens)
{
    const newToken = (v, ofs, items, i) =>
    {
        if (items) i = items[v.toLowerCase()];           if (!i) return;
        const range = new vscode.Range(doc.positionAt(ofs), doc.positionAt(ofs + v.length));
        if (tokens) tokens.push(range, i.token);
        if (values) values.push({ range,  word: v,  name: i.name });
    }
    

    // ------------------- remove string and comment -----------------
    let tmp = doc.getText().replace(PAT.ALL(null,'^[SC]'), function(m){ return ' '.repeat(m.length); });

        
    // -------------------------- parse PROC -------------------------
    for (const p of Object.values(common.getProc(doc) || {}))
    {
        const k = Object.keys(p.members);           if (!k.length) continue;
        const b = doc.offsetAt(p.range.start);
        const e = doc.offsetAt(p.range.end);
        
        let txt = tmp.substring(b, e),  i = p.members;

        txt = txt.replace(PAT.ALL(k), function(m,v,o){  newToken(m, b + o, i);     return ' '.repeat(m.length);  });

        tmp = tmp.substring(0, b) + txt + tmp.substring(e);
    }
    
    const text = tmp;


    // --------------------- parse DOC, DEV, DTB ---------------------
    const x = common.parseSEM(doc, true),   f = DTB.proto_find(doc)

    for (const m of PAT.FORMAT(text, Object.keys(x.idoc)))      newToken(m[1],  m.index,  x.idoc);
    for (const m of PAT.FORMAT(text, x.words.join('|')))        newToken(m[1],  m.index,  x.idev);
    for (const m of PAT.FORMAT(text, DTB.words(doc)))           newToken(m[1],  m.index,  null,  f(m[1]));


    // ---------------------------------------------------------------
    return values;
}
exports.Parse = Parse;


async function provideOnTypeFormattingEdits(doc, pos, ch, opt, token) {   return Complete(Parse(doc));   }
async function provideDocumentFormattingEdits(doc, opt, token)        {   return Complete(Parse(doc));   }


exports.default = () => [
    vscode.languages.registerOnTypeFormattingEditProvider({   scheme: "file", language: "pos" }, { provideOnTypeFormattingEdits }, "\n"),
    vscode.languages.registerDocumentFormattingEditProvider({ scheme: "file", language: "pos" }, { provideDocumentFormattingEdits })
]
