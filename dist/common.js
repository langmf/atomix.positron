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

exports.Types = Types;

exports.loadConfig = function() {
    cfg = vscode.workspace.getConfiguration("pos");
    
    const loader = path.dirname(cfg.get("main.compiler")) + "\\";
    
    exports.showInRoot = cfg.get("outline.showInRoot").split(",").map(v => v.trim().toLowerCase());
    
    exports.pos = pos = {
        path: {
            loader,
            include: {
                main:   loader + "Includes\\",
                user:   os.homedir() + "\\PDS\\Includes\\",
                dirs:   cfg.get("main.includeDirs").map(v => v.endsWith("\\") ? v : v + "\\")
            }
        }  
    }
}

exports.config = (v) => cfg.get(v);

exports.onSelect = function(sel) {
    const doc   = sel.textEditor.document,  rxp = /include +"([^"]+)"/i;
    const range = doc.getWordRangeAtPosition(sel.selections[0].active, rxp);        if (!range) return;
    const word  = doc.getText(range),  name = rxp.exec(word)[1],  file  = findInclude(name);
    if (file) vscode.workspace.openTextDocument(vscode.Uri.file(file)).then(doc => vscode.window.showTextDocument(doc));
}

function checkFile(nFile) {
    if (fs.existsSync(nFile) && fs.statSync(nFile).isFile()) return nFile; 
}

function findInclude(name, curPath) {
    let res;
    curPath = curPath || path.dirname(vscode.window.activeTextEditor.document.fileName);
    curPath = curPath.endsWith("\\") ? curPath : curPath + "\\";
    for (const x of [curPath, ...Object.values(pos.path.include)]) {
        if (Array.isArray(x)) {
            for (const v of x) if (res = checkFile(v + name)) return res;
        } else {
            if (res = checkFile(x + name)) return res;
        }
    }
}

function newListSymbol() {
    const result = {},  r = new vscode.Range(0,0,0,0);
    for (const [k,v] of Object.entries(Enums)) {
        if (v.title) { 
            const s = new vscode.DocumentSymbol(v.title, "", v.kind, r, r);    s._items = {};    s._type = k;
            result[k] = s;
        }
    }
    return result;
}

function getSymbols(input) {
    let d, m, v = [];       const r = /(?:"[^"]*")|[';].*$|\(\*[^\*]*\*\)|((?:^|:)[\t ]*)((\w+):(?:[\s;']|$)|(endproc|endsub)(?=[\s;']|$)|include[\t ]+"([^"]+)"|(proc|sub|static[\t ]+dim|dim|declare|symbol|\$define|\$defeval)[\t ]+([\w\u0400-\u04FF]+)([^:]*?)(?=$|:))/igm;
    
    while ((m = r.exec(input)) !== null) {
        if (m[1] == null) continue;
        if      (m[3]) d = { name: m[3],   id: "label"   }
        else if (m[4]) d = { name: m[4],   id: "endproc" }
        else if (m[5]) d = { name: m[5],   id: "include" }            
        else if (m[6]) d = { name: m[7],   id: m[6].toLowerCase().replace(/static[\t ]+/g,''),   value: m[8] }
        else continue;
        d.start = m.index + m[1].length;
        d.end   = m.index + m[0].length;
        d.type  = TypeID[d.id];
        v.push(d);
    }
    return v;
}

function parseSemantic(docPath, mask = [], skip = {}, result = []) {
    if (typeof docPath === 'object') docPath = docPath.uri.fsPath;
    if (skip[docPath]) return;  else  skip[docPath] = true;

    const SYM = cache.get(docPath).symbols,  INC = cache.get(docPath).includes,  list = SYM.list.$;

    for (const item of Object.values(list).filter(v => mask.includes(v._type))) {
        result.push(...Object.keys(item._items));
    }

    for (const item of Object.values(INC.$)) {
        if (item?.docPath) parseSemantic(item.docPath, mask, skip, result);
    }

    return result;
}
exports.parseSemantic = parseSemantic;

async function parseIncludes(doc, list) {
    const cur = path.dirname(doc.fileName),  INC = cache.get(doc).includes;
    const ins = list[Types.include]?.children || [];

    for (const v of Object.values(INC.$)) v.obs = true;

    for (const v of ins) {
        const i = INC[v.name].$;                    i.obs = false;     if (i.fin) continue;
        const file = findInclude(v.name, cur);      i.fin = true;
        if (file) {
            const iDoc = await vscode.workspace.openTextDocument(vscode.Uri.file(file));
            const iSym = await vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider', iDoc.uri);
            i.docPath = iDoc.uri.fsPath;
        }
    }

    for (const [k,v] of Object.entries(INC.$)) if (v.obs) delete INC[k];

    return INC.$;
}
exports.parseIncludes = parseIncludes;


function parseSymbols(doc, lev = 0) {
    let match;      const Blocks = [],  list = newListSymbol(),  SYM = cache.get(doc).symbols;

    const newSymbol = function(item) {
        const obj = list[item.type];
        if (item.name in obj._items) return;  else  obj._items[item.name] = true;
        const r = new vscode.Range(doc.positionAt(item.start), doc.positionAt(item.end));
        const sym = new vscode.DocumentSymbol(item.name, "", obj.kind, r, r);
        if (Blocks.length === 0)  obj.children.push(sym);  else  Blocks[Blocks.length - 1].children.push(sym);
        if (obj.kind === vscode.SymbolKind.Function) Blocks.push(sym);
    }
    
    for (const x of getSymbols(doc.getText())) {
        if (x.type === Types.end) Blocks.pop();  else  newSymbol(x);
    }
    
    if (lev === 0) {
        if ((match = PAT.DEVICE.exec(doc.getText())) !== null) {
            const name = "Ρ" + match[2],  kind = vscode.SymbolKind.EnumMember,  rd = doc.lineAt(doc.positionAt(match.index)).range;
            
            if (SYM.list.DEVICE.$.name === name) {
                list.DEVICE = SYM.list.DEVICE.$;      list.DEVICE.range = list.DEVICE.selectionRange = rd;        SYM.device.match = match;
            } else {
                list.DEVICE = new vscode.DocumentSymbol(name, "", kind, rd, rd);

                const devFile = (name) => { try { return fs.readFileSync(pos.path.include.main + name, 'utf-8'); }catch{} };

                let txt,  r = doc.lineAt(0).range,  dev = {ok:true, regs:{}, defs:{}, match};
                
                txt = PAT.REG.exec(devFile("PPI\\P" + name.substring(1) + ".ppi"))[1];      if (!txt) dev.ok = false;
                
                for (match of PAT.EQU.matchAll(txt)) {
                    list.DEVICE.children.push(new vscode.DocumentSymbol(match[1] + " ", " " + match[2], kind, r, r));
                    dev.regs[match[1]] = match[2];
                }
                if (!cfg.get("outline.showRegisters")) list.DEVICE.children = [];

                txt = devFile("Defs\\" + name.substring(1) + ".def");                       if (!txt) dev.ok = false;
                for (match of PAT.DEFS.matchAll(txt)) dev.defs[match[1]] = match[2];
                
                dev.sems = [...Object.keys(dev.regs), ...Object.keys(dev.defs)].join("|");

                SYM.device = dev;
            }
        } else {
            SYM.device = {};
        } 
    }
    
    SYM.list = list;
    
    return list;
}
exports.parseSymbols = parseSymbols;
