"use strict";

Object.defineProperty(exports, "__esModule", { value: true });

const vscode = require("vscode");
const fs     = require("fs");
const os     = require("os");
const path   = require("path");
const cache  = require("./cache");
const PAT    = require("./patterns");


let cfg, pos;


const Types = newTypes({
    main  : [ "variable", "procedure", "constant", "define", "label" ],
    lang  : [ "declare", "include" ],
    dev   : [ "$regs", "$bits" ]
});

const Enums = {
    [Types.variable]  :  { id: ["dim"],                  title: "Variables",     sym: vscode.SymbolKind.Variable,     com: vscode.CompletionItemKind.Variable   },
    [Types.procedure] :  { id: ["proc","sub"],           title: "Procedures",    sym: vscode.SymbolKind.Function,     com: vscode.CompletionItemKind.Function   },
    [Types.constant]  :  { id: ["symbol"],               title: "Constants",     sym: vscode.SymbolKind.Constant,     com: vscode.CompletionItemKind.Constant   },
    [Types.declare]   :  { id: ["declare"],              title: "Declares",      sym: vscode.SymbolKind.String,       com: vscode.CompletionItemKind.Text       },
    [Types.include]   :  { id: ["include"],              title: "Includes",      sym: vscode.SymbolKind.File,         com: vscode.CompletionItemKind.File       },
    [Types.label]     :  { id: ["label"],                title: "Labels",        sym: vscode.SymbolKind.Field,        com: vscode.CompletionItemKind.Field      },
    [Types.define]    :  { id: ["$define","$defeval"],   title: "Defines",       sym: vscode.SymbolKind.Enum,         com: vscode.CompletionItemKind.Enum       },
    [Types.$regs]     :  { id: [],                       title: "Registers",     sym: vscode.SymbolKind.EnumMember,   com: vscode.CompletionItemKind.EnumMember },
    [Types.$bits]     :  { id: [],                       title: "Bits",          sym: vscode.SymbolKind.EnumMember,   com: vscode.CompletionItemKind.EnumMember }
}


exports.Types  = Types;
exports.Enums  = Enums;

exports.config = (v) => cfg.get(v);

exports.activate = () => {
    onDidChangeConfiguration();
    vscode.workspace.onDidChangeConfiguration(onDidChangeConfiguration);    
    vscode.window.onDidChangeTextEditorSelection(onDidChangeTextEditorSelection);
}


function onDidChangeConfiguration() {
    cfg = vscode.workspace.getConfiguration("pos");
    
    const loader = path.dirname(cfg.main.compiler) + "\\";
    
    exports.pos = pos = {
        path: {
            loader,
            include: {
                main:   loader + "Includes\\",
                src:    loader + "Includes\\Sources\\",
                user:   os.homedir() + "\\PDS\\Includes\\",
                dirs:   cfg.main.includeDirs.map(v => v.endsWith("\\") ? v : v + "\\")
            }
        }  
    }
}


function onDidChangeTextEditorSelection(sel) {
    if (sel.textEditor.document.languageId !== "pos") return;
    
    if (sel.kind == vscode.TextEditorSelectionChangeKind.Mouse)
    {
        if (cfg.output.ClickHide) vscode.commands.executeCommand("workbench.action.closePanel");
    }
    else if (sel.kind == vscode.TextEditorSelectionChangeKind.Command)
    {
        const editor = sel.textEditor,  i = getWordInclude(editor.document, sel.selections[0].active);      if (!i) return;
        const file   = findInclude(i.name);
        editor.selections = editor.selections.map(s => new vscode.Selection(s.start.translate(0,1), s.end.translate(0,1)));
        try { if (file) vscode.workspace.openTextDocument(vscode.Uri.file(file)).then(doc => vscode.window.showTextDocument(doc)); }catch(e){}
    }
}


function getWordInclude(doc, position, retLoc = false) {
        const rxp = /include +"([^"]+)"/i,  range  = doc.getWordRangeAtPosition(position, rxp);             if (!range) return;
        
        const name = rxp.exec(doc.getText(range))[1],  INC = cache.get(doc).includes,  i = { name,  file: INC.$[name]?.fsPath };
        
        return !retLoc ? i : i.file ? new vscode.Location(vscode.Uri.file(i.file), new vscode.Position(0,0)) : null;
}
exports.getWordInclude = getWordInclude;


function failRange(doc, position) {
    const line = doc.lineAt(position),  txt = line.text.substring(0, position.character);
    let char = line.text.charAt(line.firstNonWhitespaceCharacterIndex);
    if (char === "'" || char === ";") return true;
    let q = 0;          for (const char of txt) if (char === '"') q++;         return (q % 2 === 1);
}
exports.failRange = failRange;


function newTypes(value) {
    const res = {
        _ : value,
        $(v) { return (v || "").split(",").reduce((a,i) => { const x = this._[i.trim()]; (x && a.push(...x));   return a; }, []) }
    }
    Object.values(res._).map(v=>v.map(i=>res[i]=i));
    return Object.freeze(res);
}


function checkFile(file) {
    if (fs.existsSync(file) && fs.statSync(file).isFile()) return file; 
}


function findInclude(name, cur = path.dirname(vscode.window.activeTextEditor.document.fileName)) {
    if (path.isAbsolute(name)) return checkFile(name);

    let result,  curPath = cur.endsWith("\\") ? cur : cur + "\\";

    for (const x of [curPath, ...Object.values(pos.path.include)]) {
        if (Array.isArray(x)) { for (const v of x) if (result = checkFile(v + name)) return result; }
        else                  {                    if (result = checkFile(x + name)) return result; }
    }
}


function listSymbols() {
    const result = {},  r = new vscode.Range(0,0,0,0);
    
    for (const [k,v] of Object.entries(Enums)) {
        if (!v.title) continue; 
        const s = new vscode.DocumentSymbol(v.title, "", v.sym, r, r);     s.$items = {};     s.$type = k;     result[k] = s;
    }

    return result;
}


function filterSymbols(list) {
    const showInRoot = cfg.outline.showInRoot.split(",").map(v => v.trim().toLowerCase());
    
    return Object.values(list).reduce((res, v) => {
        if (v.children.length) {
            if (showInRoot.includes(v.name.toLowerCase())) return res.concat(v.children);  else  res.push(v);
        }
        return res;
    }, []);
}
exports.filterSymbols = filterSymbols;


function getSymbols(input) {
    const r = /(?:"[^"]*")|[';].*$|\(\*[^\*]*\*\)|((?:^|:)[\t ]*)((\w+):(?=[\s;']|$)|(endproc|endsub)(?=[\s;']|$)|include[\t ]+"([^"]+)"|(proc|sub|static[\t ]+dim|dim|declare|symbol)[\t ]+([\w\u0400-\u04FF]+)[^:]*?(?=$|:)|(\$define|\$defeval)[\t ]+(\w+).*?('[\t ]*$[\s\S]*?(?:\r\n\r\n|\n\n|\r\r)|(?=$)))/igm;

    const getTypeFromID = Object.entries(Enums).reduce((a,[k,v]) => { for (let t of v.id) a[t] = k;   return a; }, {});
    
    let d, m, v = [];

    while ((m = r.exec(input)) !== null) {
        if (m[1] == null) continue;
        
        if      (m[3]) d = { name: m[3],   id: "label"   }
        else if (m[4]) d = { name: m[4],   id: "end"     }
        else if (m[5]) d = { name: m[5],   id: "include" }            
        else if (m[6]) d = { name: m[7],   id: m[6].toLowerCase().replace(/static[\t ]+/g,'') }
        else if (m[8]) d = { name: m[9],   id: m[8].toLowerCase() }
        else continue;
        
        d.start = m.index + m[1].length;
        d.end   = m.index + m[0].length;
        d.type  = getTypeFromID[d.id];
        d.text  = m[2];
        
        v.push(d);
    }
    
    return v;
}


function parseDoc(doc, mask = Types._.main, skip = {$:{}}, result = {}) {
    let isLocal = false;
    
    if (typeof doc === 'object') { doc = doc.uri.fsPath;   isLocal = true; }
    if (skip[doc]) return;  else  skip[doc] = true;

    const INC = cache.get(doc).includes,  SYM = cache.get(doc).symbols,  list = SYM.list.$;

    const obj = result[doc] = { isLocal, scope: path.basename(doc), types:{} };

    for (const item of Object.values(list).filter(v => (mask.includes(v.$type)))) {
        if (Types._.dev.includes(item.$type)) { if (item.$type in skip.$) continue;  else  skip.$[item.$type] = true; }
        obj.types[item.$type] = item;
    }

    for (const item of Object.values(INC.$)) if (item?.fsPath) parseDoc(item.fsPath, mask, skip, result);

    if (isLocal && cfg.smartParentIncludes) {
        const prt = cache.get(doc).$.parent;      if (prt) parseDoc(prt, mask, skip, result);
    }

    return result;
}
exports.parseDoc = parseDoc;


async function parseIncludes(doc, timeout = 5000) {
    const INC = cache.get(doc).includes,  SYM = cache.get(doc).symbols,  arr = SYM.list.$[Types.include]?.children || [];

    for (const v of Object.values(INC.$)) v.del = true;

    for (const v of arr) {
        const i = INC[v.name].$;          i.del = false;                if (i.open) continue;  else  i.open = true;

        const f = findInclude(v.name, path.dirname(doc.fileName));      if (!f) continue;
        
        const iDoc = await vscode.workspace.openTextDocument(vscode.Uri.file(f));
        const iSym = vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider', iDoc.uri);
        
        if (cfg.smartParentIncludes) cache.get(iDoc).parent = doc.uri.fsPath;

        await new Promise(resolve => {
            const tmo = setTimeout(() => {
                vscode.window.showWarningMessage(`May be circular includes in "${iDoc.uri.fsPath}"`);
                resolve();
            }, timeout);
            iSym.then(() => { clearTimeout(tmo);     i.fsPath = iDoc.uri.fsPath;     resolve(); });
        });
    }

    for (const [k,v] of Object.entries(INC.$)) if (v.del) delete INC[k];

    return INC.$;
}
exports.parseIncludes = parseIncludes;


function parseSymbols(doc) {
    const Blocks = [],  list = listSymbols(),  SYM = cache.get(doc).symbols;          let match;  

    const newSymbol = function(item) {
        const obj = list[item.type],  name = item.name.toLowerCase();
        
        if (name in obj.$items) return;  else  obj.$items[name] = item;
        
        const r = item.range = new vscode.Range(doc.positionAt(item.start), doc.positionAt(item.end));
        const sym = new vscode.DocumentSymbol(item.name, "", obj.kind, r, r);
        
        if (Blocks.length === 0)  obj.children.push(sym);  else  Blocks[Blocks.length - 1].children.push(sym);
        if (obj.kind === vscode.SymbolKind.Function) Blocks.push(sym);
    }
    
    for (const x of getSymbols(doc.getText())) if (x.id === "end") Blocks.pop();  else  newSymbol(x);
    
    parseDevice(doc, list, SYM);
    
    for (const [k,v] of Object.entries(list)) if (v.$items && !Object.keys(v.$items).length) delete list[k];

    SYM.list = list;
    
    return list;
}
exports.parseSymbols = parseSymbols;


function parseDevice(doc, list, SYM) {
    let match;  

    if ((match = PAT.DEVICE.exec(doc.getText())) === null) { SYM.device = {};   return; }

    const name = "Ρ" + match[2],  kind = vscode.SymbolKind.EnumMember,  rd = doc.lineAt(doc.positionAt(match.index)).range;
    
    if (SYM.list.DEVICE.$.name === name) {
        list.DEVICE       = SYM.list.DEVICE.$;
        list[Types.$regs] = SYM.list[Types.$regs].$;
        list[Types.$bits] = SYM.list[Types.$bits].$;
        list.DEVICE.range = list.DEVICE.selectionRange = rd;
        SYM.device.match  = match;
    } else {
        list.DEVICE = new vscode.DocumentSymbol(name,   "", kind, rd, rd);
        
        const devFile = (name, rxp) => {
            try   { const txt = fs.readFileSync(pos.path.include.main + name, 'utf-8');   return rxp ? rxp.exec(txt)[1] : txt; }
            catch {}
        };

        let txt;    const r = doc.lineAt(0).range,  dev = {ok:true, match},  showReg = cfg.outline.showRegisters;

        if (txt = devFile("PPI\\P" + name.substring(1) + ".ppi", PAT.REG)) {
            const obj = list[Types.$regs];
            for (const m of PAT.EQU.matchAll(txt)) {
                if (showReg) list.DEVICE.children.push(new vscode.DocumentSymbol(m[1] + " ", " " + m[2], kind, r, r));
                obj.$items[m[1].toLowerCase()] = { name: m[1],  text: m[2] };        
            }
        } else { dev.ok = false; } 

        if (txt = devFile("Defs\\" + name.substring(1) + ".def")) {
            const obj = list[Types.$bits];
            for (const m of PAT.DEFS.matchAll(txt)) {
                obj.$items[m[1].toLowerCase()] = { name: m[1],  text: m[2] };    
            }
        } else { dev.ok = false; } 
        
        SYM.device = dev;
    }
}
