"use strict";

Object.defineProperty(exports, "__esModule", { value: true });

const vscode = require("vscode");
const fs     = require('fs');
const path   = require("path");
const PAT    = require("./patterns");


function provideDocumentSymbols(doc) {
    const Blocks = [],  text = doc.getText();
    let line, matches;

    const newSymbol = function(name, obj, r = line?.range || doc.lineAt(0).range) {
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
    
    
    if ((matches = PAT.DEVICE.exec(doc.getText())) !== null) {
        const cfg = vscode.workspace.getConfiguration("pos");
        const fn = path.dirname(cfg.get("main.compiler")) + "\\Includes\\PPI\\P" + matches[2] + ".ppi";
        
        try {
            const txt = fs.readFileSync(fn, 'utf-8'),  str = PAT.REG.exec(txt),  r = doc.lineAt(0).range;
            
            list.DEVICE = newSymbol("Ρ" + matches[2],  vscode.SymbolKind.EnumMember);
                
            if (cfg.get("outline.showRegisters")) {
                while ((matches = PAT.EQU.exec(str[1])) !== null) { 
                    const sym = new vscode.DocumentSymbol(matches[1] + " ", " " + matches[2], vscode.SymbolKind.EnumMember, r, r);
                    list.DEVICE.children.push(sym);
                }
            }
        }catch{}
    }
    
    while ((matches = PAT.LABEL.exec(text)) !== null) newSymbol(matches[1], list.LBLS, matches.index);
            
    for (let lineNum = 0; lineNum < doc.lineCount; lineNum++) {
        line = doc.lineAt(lineNum);
        
        if (line.isEmptyOrWhitespace || line.text.charAt(line.firstNonWhitespaceCharacterIndex) === "'") continue;
        
        const LineTextwithoutComment = (/^([^';\n\r]*).*$/m).exec(line.text);
        
        for (const lineText of LineTextwithoutComment[1].split(":")) {
            if ((matches = PAT.PROC.exec(lineText))    !== null) {   newSymbol(matches[4], list.PROC);   }
            if ((matches = PAT.VAR.exec(lineText))     !== null) {   newSymbol(matches[2], list.VARS);   }
            if ((matches = PAT.SYMBOL.exec(lineText))  !== null) {   newSymbol(matches[2], list.CONS);   }
            if ((matches = PAT.DECLARE.exec(lineText)) !== null) {   newSymbol(matches[2], list.DECL);   }
            if ((matches = PAT.INCLUDE.exec(lineText)) !== null) {   newSymbol(matches[2], list.INCL);   }
            if ((matches = PAT.DEFINE.exec(lineText))  !== null) {   newSymbol(matches[2], list.DEFS);   }
            
            if ((matches = PAT.ENDPROC.exec(lineText)) !== null) Blocks.pop();
        }
    }
    
    //for (let i=0;i<30;i++) list.LBLS.children.push(new vscode.DocumentSymbol("a_"+i, "", i, doc.lineAt(0).range, doc.lineAt(0).range));
    
    return Object.values(list).filter(value => value.children.length);
}

exports.default = vscode.languages.registerDocumentSymbolProvider({ scheme: "file", language: "pos" }, { provideDocumentSymbols });