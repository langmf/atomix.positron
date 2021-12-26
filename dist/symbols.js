"use strict";

Object.defineProperty(exports, "__esModule", { value: true });

const vscode = require("vscode");
const fs     = require("fs");
const path   = require("path");
const cache  = require("./cache");
const PAT    = require("./patterns");


function provideDocumentSymbols(doc) {
    console.time("provider_Symbols");
    
    const Blocks = [],  cfg = vscode.workspace.getConfiguration("pos"),  SYM = cache.get(doc).symbols;
    let line, match;

    const newSymbol = function(name, obj, r = line?.range || 0) {
        if (typeof r === 'number') r = doc.lineAt(doc.positionAt(r)).range;
        if (typeof obj !== 'object') return new vscode.DocumentSymbol(name, "", obj, r, r);
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
        const name = "Ρ" + match[2],  kind = vscode.SymbolKind.EnumMember;
        
        if (SYM.list.DEVICE.$.name === name) {
            list.DEVICE = SYM.list.DEVICE.$;        SYM.device.match = match;
        } else {
            list.DEVICE = newSymbol(name,  kind);

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
    
    for (match of PAT.LABEL.matchAll(doc.getText())) newSymbol(match[1], list.LBLS, match.index);
       
    for (let lineNum = 0; lineNum < doc.lineCount; lineNum++) {
        line = doc.lineAt(lineNum);
        
        if (line.isEmptyOrWhitespace || line.text.charAt(line.firstNonWhitespaceCharacterIndex) === "'") continue;
        
        const LineTextNoComment = (/^([^';\n\r]*).*$/m).exec(line.text);
        
        for (const txt of LineTextNoComment[1].split(":")) {
            if ((match = PAT.PROC.exec(txt))    !== null) newSymbol(match[4], list.PROC);
            if ((match = PAT.VAR.exec(txt))     !== null) newSymbol(match[2], list.VARS);
            if ((match = PAT.SYMBOL.exec(txt))  !== null) newSymbol(match[2], list.CONS);
            if ((match = PAT.DECLARE.exec(txt)) !== null) newSymbol(match[2], list.DECL);
            if ((match = PAT.INCLUDE.exec(txt)) !== null) newSymbol(match[2], list.INCL);
            if ((match = PAT.DEFINE.exec(txt))  !== null) newSymbol(match[2], list.DEFS);
            if ((match = PAT.ENDPROC.exec(txt)) !== null) Blocks.pop();
        }
    }
    
    //for (let i=0;i<30;i++) list.LBLS.children.push(new vscode.DocumentSymbol("a_"+i, "", i, doc.lineAt(0).range, doc.lineAt(0).range));
    
    SYM.list = list;
    
    const result = Object.values(list).filter(value => value.children.length);

    console.timeEnd("provider_Symbols");
    
    return result;
}

exports.default = vscode.languages.registerDocumentSymbolProvider({ scheme: "file", language: "pos" }, { provideDocumentSymbols });