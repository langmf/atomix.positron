"use strict";

Object.defineProperty(exports, "__esModule", { value: true });

const vscode = require("vscode");
const fs     = require("fs");
const os     = require("os");
const path   = require("path");
const cache  = require("./cache");
const PAT    = require("./patterns");


exports.onSelect = function(sel) {
    const cfg = vscode.workspace.getConfiguration("pos"),  doc = sel.textEditor.document,  rxp = /include +"([^"]+)"/i;
    const range = doc.getWordRangeAtPosition(sel.selections[0].active, rxp);
    if (range) { const word  = doc.getText(range),  match = rxp.exec(word);    openInclude(match[1]); }
}

function openInclude(name) {
    const check = function(nFile) { try { fs.accessSync(nFile, fs.constants.F_OK);   return nFile; }catch(e){} };
    const cfg = vscode.workspace.getConfiguration("pos"),  doc = vscode.window.activeTextEditor.document;
    
    const paths = {
        cur:  path.dirname(doc.fileName),
        inc:  path.dirname(cfg.get("main.compiler")) + "\\Includes",
        pds:  os.homedir() + "\\PDS\\Includes",
        user: cfg.get("main.includeDirs")
    }
    
    let f;
    for (const x of Object.values(paths)) {
        if (Array.isArray(x)) {
            for (const v of x) if (f = check(v + "\\" + name)) break;
        } else {
            if (f = check(x + "\\" + name)) break;
        }
    }
    
    if (f) vscode.workspace.openTextDocument(vscode.Uri.file(f)).then(doc => vscode.window.showTextDocument(doc));
}


function provideDocumentSymbols(doc) {
    console.time("provider_Symbols");
    
    let match;
    
    const Blocks = [],  cfg = vscode.workspace.getConfiguration("pos"),  SYM = cache.get(doc).symbols;

    const newSymbol = function(name, obj, r) {
        if (typeof name === 'object') { r = new vscode.Range(doc.positionAt(name.start), doc.positionAt(name.end));   name = name.name; }
        if (typeof obj !== 'object') { r = r || doc.lineAt(0).range;   return new vscode.DocumentSymbol(name, "", obj, r, r); }
        if (!obj._items) obj._items = {};
        if (name in obj._items) return; else obj._items[name] = true;
        const sym = new vscode.DocumentSymbol(name, "", obj.kind, r, r);
        if (Blocks.length === 0)  obj.children.push(sym);  else  Blocks[Blocks.length - 1].children.push(sym);
        if (obj.kind === vscode.SymbolKind.Function) Blocks.push(sym);
        return sym;
    }
    
    const devFile = function(name, rxp) {
        try {
            const txt = fs.readFileSync(path.dirname(cfg.get("main.compiler")) + "\\Includes\\" + name, 'utf-8');
            return rxp ? rxp.exec(txt)[1] : txt;
        } catch {}
    }
    
    const list = {
        VARS : newSymbol("Variables",  vscode.SymbolKind.Variable),
        PROC : newSymbol("Procedures", vscode.SymbolKind.Function),
        CONS : newSymbol("Constants",  vscode.SymbolKind.Constant),
        DECL : newSymbol("Declares",   vscode.SymbolKind.String),
        INCL : newSymbol("Includes",   vscode.SymbolKind.File),
        DEFS : newSymbol("Defines",    vscode.SymbolKind.Enum),
        LBLS : newSymbol("Labels",     vscode.SymbolKind.Field),
    };
    
    if ((match = PAT.DEVICE.exec(doc.getText())) !== null) {
        const name = "Ρ" + match[2],  kind = vscode.SymbolKind.EnumMember,  rd = doc.lineAt(doc.positionAt(match.index)).range;
        
        if (SYM.list.DEVICE.$.name === name) {
            list.DEVICE = SYM.list.DEVICE.$;        list.DEVICE.range = list.DEVICE.selectionRange = rd;        SYM.device.match = match;
        } else {
            list.DEVICE = newSymbol(name,  kind, rd);

            let txt,  r = doc.lineAt(0).range,  dev = { ok: true, match };
            
            txt = devFile("PPI\\P" + name.substring(1) + ".ppi", PAT.REG);          if (txt) dev.regs = {}; else dev.ok = false;
            
            for (match of PAT.EQU.matchAll(txt)) {
                list.DEVICE.children.push(new vscode.DocumentSymbol(match[1] + " ", " " + match[2], kind, r, r));
                dev.regs[match[1]] = match[2];
            }
            if (!cfg.get("outline.showRegisters")) list.DEVICE.children = [];

            txt = devFile("Defs\\" + name.substring(1) + ".def");                   if (txt) dev.defs = {}; else dev.ok = false;
            for (match of PAT.DEFS.matchAll(txt)) dev.defs[match[1]] = match[2];
            
            SYM.device = dev;
        }
    } else {
        SYM.device = {};
    }
    
    for (const x of PAT.SYMBOLS(doc.getText())) {
        if      (x.is('proc','sub'))            newSymbol(x, list.PROC);
        else if (x.is('label'))                 newSymbol(x, list.LBLS);
        else if (x.is('dim'))                   newSymbol(x, list.VARS);
        else if (x.is('symbol'))                newSymbol(x, list.CONS);
        else if (x.is('declare'))               newSymbol(x, list.DECL);
        else if (x.is('include'))               newSymbol(x, list.INCL);
        else if (x.is('$define', '$defeval'))   newSymbol(x, list.DEFS);
        else if (x.is('endproc'))               Blocks.pop();
    }
    
    //for (let i=0;i<30;i++) list.LBLS.children.push(new vscode.DocumentSymbol("a_"+i, "", i, doc.lineAt(0).range, doc.lineAt(0).range));
    
    SYM.list = list;
    
    const root = cfg.get("outline.showInRoot").split(",").map(v => v.trim().toLowerCase());
    const result = Object.values(list).reduce((res, v) => {
        if (v.children.length) { if (root.includes(v.name.toLowerCase())) return res.concat(v.children);  else  res.push(v); }
        return res;
    }, []);

    console.timeEnd("provider_Symbols");
    
    return result;
}

exports.default = vscode.languages.registerDocumentSymbolProvider({ scheme: "file", language: "pos" }, { provideDocumentSymbols });