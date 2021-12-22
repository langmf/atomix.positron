"use strict";

Object.defineProperty(exports, "__esModule", { value: true });

const vscode = require("vscode");
const fs     = require("fs");
const path   = require("path");

const cache  = require("./cache");
const PAT    = require("./patterns");


function provideDocumentSymbols(doc) {
    const Blocks = [],  cfg = vscode.workspace.getConfiguration("pos");
    let line, match;

    console.time("provideDocumentSymbols");
    
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
        const name = "Ρ" + match[2],  x = cache.get(doc.uri.fsPath).symbols,  kind = vscode.SymbolKind.EnumMember;
        
        if (x.list.DEVICE.$.name === name) {
            list.DEVICE = x.list.DEVICE.$;
        } else {
            list.DEVICE = newSymbol(name,  kind);

            try {
                const fn = path.dirname(cfg.get("main.compiler")) + "\\Includes\\PPI\\P" + name.substring(1) + ".ppi";
                const txt = fs.readFileSync(fn, 'utf-8'),  str = PAT.REG.exec(txt)[1],  r = doc.lineAt(0).range;
                
                if (cfg.get("outline.showRegisters")) {
                    for (match of PAT.EQU.matchAll(str)) {
                        list.DEVICE.children.push(new vscode.DocumentSymbol(match[1] + " ", " " + match[2], kind, r, r));
                    }
                    
                }
            }catch{}
        }
        
        x.list = list;
    }
    
    for (match of PAT.LABEL.matchAll(doc.getText())) newSymbol(match[1], list.LBLS, match.index);
       
    for (let lineNum = 0; lineNum < doc.lineCount; lineNum++) {
        line = doc.lineAt(lineNum);
        
        if (line.isEmptyOrWhitespace || line.text.charAt(line.firstNonWhitespaceCharacterIndex) === "'") continue;
        
        const LineTextNoComment = (/^([^';\n\r]*).*$/m).exec(line.text);
        
        for (const lineText of LineTextNoComment[1].split(":")) {
            if ((match = PAT.PROC.exec(lineText))    !== null) newSymbol(match[4], list.PROC);
            if ((match = PAT.VAR.exec(lineText))     !== null) newSymbol(match[2], list.VARS);
            if ((match = PAT.SYMBOL.exec(lineText))  !== null) newSymbol(match[2], list.CONS);
            if ((match = PAT.DECLARE.exec(lineText)) !== null) newSymbol(match[2], list.DECL);
            if ((match = PAT.INCLUDE.exec(lineText)) !== null) newSymbol(match[2], list.INCL);
            if ((match = PAT.DEFINE.exec(lineText))  !== null) newSymbol(match[2], list.DEFS);
            if ((match = PAT.ENDPROC.exec(lineText)) !== null) Blocks.pop();
        }
    }
    
    //for (let i=0;i<30;i++) list.LBLS.children.push(new vscode.DocumentSymbol("a_"+i, "", i, doc.lineAt(0).range, doc.lineAt(0).range));
    
    console.timeEnd("provideDocumentSymbols");
    
    return Object.values(list).filter(value => value.children.length);
}

exports.default = vscode.languages.registerDocumentSymbolProvider({ scheme: "file", language: "pos" }, { provideDocumentSymbols });