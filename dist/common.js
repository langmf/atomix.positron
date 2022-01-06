"use strict";

Object.defineProperty(exports, "__esModule", { value: true });

const vscode = require("vscode");
const fs     = require("fs");
const os     = require("os");
const path   = require("path");
const cache  = require("./cache");
const PAT    = require("./patterns");


let cfg, pos;

const Types = ["variable", "procedure", "constant", "declare", "include", "label", "define", "end"].reduce((a,v)=>(a[v]=v)&&a,{});

const Enums = {
    [Types.variable]  :  { id: ["dim"],                  title: "Variables",     kind: vscode.SymbolKind.Variable  },
    [Types.procedure] :  { id: ["proc","sub"],           title: "Procedures",    kind: vscode.SymbolKind.Function  },
    [Types.constant]  :  { id: ["symbol"],               title: "Constants",     kind: vscode.SymbolKind.Constant  },
    [Types.declare]   :  { id: ["declare"],              title: "Declares",      kind: vscode.SymbolKind.String    },
    [Types.include]   :  { id: ["include"],              title: "Includes",      kind: vscode.SymbolKind.File      },
    [Types.label]     :  { id: ["label"],                title: "Labels",        kind: vscode.SymbolKind.Field     },
    [Types.define]    :  { id: ["$define","$defeval"],   title: "Defines",       kind: vscode.SymbolKind.Enum      },
    [Types.end]       :  { id: ["endproc","endsub"]      }
}

const TypeID = Object.entries(Enums).reduce((a,[k,v]) => { for (let t of v.id) a[t] = k;   return a; }, {});


exports.Types  = Types;

exports.config = (v) => cfg.get(v);

exports.activate = function() {
    onDidChangeConfiguration();
    vscode.workspace.onDidChangeConfiguration(onDidChangeConfiguration);    
    vscode.window.onDidChangeTextEditorSelection(onDidChangeTextEditorSelection);
}


function onDidChangeConfiguration() {
    cfg = vscode.workspace.getConfiguration("pos");
    
    const loader = path.dirname(cfg.get("main.compiler")) + "\\";
    
    exports.pos = pos = {
        path: {
            loader,
            include: {
                main:   loader + "Includes\\",
                src:    loader + "Includes\\Sources\\",
                user:   os.homedir() + "\\PDS\\Includes\\",
                dirs:   cfg.get("main.includeDirs").map(v => v.endsWith("\\") ? v : v + "\\")
            }
        }  
    }
}


function onDidChangeTextEditorSelection(sel) {
    if (sel.textEditor.document.languageId !== "pos") return;
    
    if (sel.kind == vscode.TextEditorSelectionChangeKind.Mouse)
    {
        if (cfg.get("output.ClickHide")) vscode.commands.executeCommand("workbench.action.closePanel");
    }
    else if (sel.kind == vscode.TextEditorSelectionChangeKind.Command)
    {
        const editor = sel.textEditor,  doc = editor.document,  rxp = /include +"([^"]+)"/i;
        const range  = doc.getWordRangeAtPosition(sel.selections[0].active, rxp);        if (!range) return;
        const word   = doc.getText(range),  name = rxp.exec(word)[1],  file  = findInclude(name);
        editor.selections = editor.selections.map( s => new vscode.Selection(s.start.translate(0,1), s.end.translate(0,1)));
        if (file) vscode.workspace.openTextDocument(vscode.Uri.file(file)).then(doc => vscode.window.showTextDocument(doc));
    }
}


function checkFile(file) {
    if (fs.existsSync(file) && fs.statSync(file).isFile()) return file; 
}


function findInclude(name, cur) {
    let result;
    
    cur = cur || path.dirname(vscode.window.activeTextEditor.document.fileName);        cur = cur.endsWith("\\") ? cur : cur + "\\";
    
    for (const x of [cur, ...Object.values(pos.path.include)]) {
        if (Array.isArray(x)) { for (const v of x) if (result = checkFile(v + name)) return result; }
        else                  {                    if (result = checkFile(x + name)) return result; }
    }
}


function listSymbols() {
    const result = {},  r = new vscode.Range(0,0,0,0);
    for (const [k,v] of Object.entries(Enums)) {
        if (v.title) { const s = new vscode.DocumentSymbol(v.title, "", v.kind, r, r);     s._items = {};     s._type = k;     result[k] = s; }
    }
    return result;
}


function filterSymbols(list) {
    const showInRoot = cfg.get("outline.showInRoot").split(",").map(v => v.trim().toLowerCase());
    return Object.values(list).reduce((res, v) => {
        if (v.children.length) {
            if (showInRoot.includes(v.name.toLowerCase())) return res.concat(v.children);  else  res.push(v);
        }
        return res;
    }, []);
}
exports.filterSymbols = filterSymbols;


function getSymbols(input) {
    const r = /(?:"[^"]*")|[';].*$|\(\*[^\*]*\*\)|((?:^|:)[\t ]*)((\w+):(?:[\s;']|$)|(endproc|endsub)(?=[\s;']|$)|include[\t ]+"([^"]+)"|(proc|sub|static[\t ]+dim|dim|declare|symbol)[\t ]+([\w\u0400-\u04FF]+)[^:]*?(?=$|:)|(\$define|\$defeval)[\t ]+(\w+).*?('[\t ]*$[\s\S]*?(?:\r\n\r\n|\n\n|\r\r)|(?=$)))/igm;
    
    let d, m, v = [];
    
    while ((m = r.exec(input)) !== null) {
        if (m[1] == null) continue;
        
        if      (m[3]) d = { name: m[3],   id: "label"   }
        else if (m[4]) d = { name: m[4],   id: "endproc" }
        else if (m[5]) d = { name: m[5],   id: "include" }            
        else if (m[6]) d = { name: m[7],   id: m[6].toLowerCase().replace(/static[\t ]+/g,'') }
        else if (m[8]) d = { name: m[9],   id: m[8].toLowerCase() }
        else continue;
        
        d.start = m.index + m[1].length;
        d.end   = m.index + m[0].length;
        d.type  = TypeID[d.id];
        d.text  = m[2];
        
        v.push(d);
    }
    
    return v;
}


function parseDoc(docPath, mask = [], skip = {}, result = {}) {
    let file;
    
    if (typeof docPath === 'object') { docPath = docPath.uri.fsPath;   file = "Local"; } else { file = path.basename(docPath); }
    if (skip[docPath]) return;  else  skip[docPath] = true;

    const INC = cache.get(docPath).includes,  SYM = cache.get(docPath).symbols;

    const obj = result[file] = {},  list = SYM.list.$;

    for (const item of Object.values(list).filter(v => mask.includes(v._type))) obj[item._type] = item._items;

    for (const item of Object.values(INC.$)) if (item?.docPath) parseDoc(item.docPath, mask, skip, result);

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
        
        await new Promise(resolve => {
            const tmo = setTimeout(() => {
                vscode.window.showWarningMessage(`May be circular includes in "${iDoc.uri.fsPath}"`);
                resolve();
            }, timeout);
            iSym.then(() => { clearTimeout(tmo);    i.docPath = iDoc.uri.fsPath;    resolve(); });
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
        if (name in obj._items) return;  else  obj._items[name] = item;
        const r = new vscode.Range(doc.positionAt(item.start), doc.positionAt(item.end));
        const sym = new vscode.DocumentSymbol(item.name, "", obj.kind, r, r);
        if (Blocks.length === 0)  obj.children.push(sym);  else  Blocks[Blocks.length - 1].children.push(sym);
        if (obj.kind === vscode.SymbolKind.Function) Blocks.push(sym);
    }
    
    for (const x of getSymbols(doc.getText())) if (x.type === Types.end) Blocks.pop();  else  newSymbol(x);
    
    if ((match = PAT.DEVICE.exec(doc.getText())) !== null) {
        const name = "Ρ" + match[2],  kind = vscode.SymbolKind.EnumMember,  rd = doc.lineAt(doc.positionAt(match.index)).range;
        
        if (SYM.list.DEVICE.$.name === name) {
            list.DEVICE = SYM.list.DEVICE.$;      list.DEVICE.range = list.DEVICE.selectionRange = rd;        SYM.device.match = match;
        } else {
            list.DEVICE = new vscode.DocumentSymbol(name, "", kind, rd, rd);

            const devFile = (name) => { try { return fs.readFileSync(pos.path.include.main + name, 'utf-8'); }catch{} };

            const r = doc.lineAt(0).range,  dev = {ok:true, regs:{}, defs:{}, match},  showReg = cfg.get("outline.showRegisters");
            
            const PPI = PAT.REG.exec(devFile("PPI\\P" + name.substring(1) + ".ppi"))[1];        if (!PPI) dev.ok = false;
            
            for (match of PAT.EQU.matchAll(PPI)) {
                if (showReg) list.DEVICE.children.push(new vscode.DocumentSymbol(match[1] + " ", " " + match[2], kind, r, r));
                dev.regs[match[1]] = match[2];
            }

            const DEF = devFile("Defs\\" + name.substring(1) + ".def");                         if (!DEF) dev.ok = false;
            for (match of PAT.DEFS.matchAll(DEF)) dev.defs[match[1]] = match[2];
            
            dev.sems = [...Object.keys(dev.regs), ...Object.keys(dev.defs)].join("|");

            SYM.device = dev;
        }
    } else {
        SYM.device = {};
    }
    
    SYM.list = list;
    
    return list;
}
exports.parseSymbols = parseSymbols;
