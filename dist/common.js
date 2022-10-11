"use strict";

const vscode = require("vscode");
const fs     = require("fs");
const path   = require("path");
const root   = require("./root");
const cache  = require("./cache");
const PAT    = require("./patterns");
const DTB    = require("./database");
const STS    = require("./settings");
const PLG    = require("./plugins");


const cache_dev = {},   statusVer = createVersion();


const [Types, Tokens] = newTypes({
    main  : [ "variable", "procedure", "subroutine", "symbol", "define", "label", "macro" ],
    other : [ "declare"             ],
    lang  : [ "device",  "include"  ],
    sfr   : [ "devregs", "devbits"  ],
    prm   : [ "parameter"           ]
});

const Enums = {
    [Types.variable]    :  { id: ["dim"],                  title: "Variables",     sym: vscode.SymbolKind.Variable,         com: vscode.CompletionItemKind.Variable      },
    [Types.parameter]   :  { id: ["prm"],                  title: "Parameters",    sym: vscode.SymbolKind.TypeParameter,    com: vscode.CompletionItemKind.TypeParameter },
    [Types.procedure]   :  { id: ["proc"],                 title: "Procedures",    sym: vscode.SymbolKind.Function,         com: vscode.CompletionItemKind.Function      },
    [Types.subroutine]  :  { id: ["sub"],                  title: "Subroutines",   sym: vscode.SymbolKind.Method,           com: vscode.CompletionItemKind.Method        },
    [Types.symbol]      :  { id: ["symbol"],               title: "Constants",     sym: vscode.SymbolKind.Constant,         com: vscode.CompletionItemKind.Constant      },
    [Types.declare]     :  { id: ["declare"],              title: "Declares",      sym: vscode.SymbolKind.String,           com: vscode.CompletionItemKind.Text          },
    [Types.device]      :  { id: ["device"],               title: "Devices",       sym: vscode.SymbolKind.EnumMember,       com: vscode.CompletionItemKind.EnumMember    },
    [Types.include]     :  { id: ["include"],              title: "Includes",      sym: vscode.SymbolKind.File,             com: vscode.CompletionItemKind.File          },
    [Types.label]       :  { id: ["label"],                title: "Labels",        sym: vscode.SymbolKind.Field,            com: vscode.CompletionItemKind.Field         },
    [Types.macro]       :  { id: ["macro"],                title: "Macro",         sym: vscode.SymbolKind.Event,            com: vscode.CompletionItemKind.Event         },
    [Types.define]      :  { id: ["$define","$defeval"],   title: "Defines",       sym: vscode.SymbolKind.Enum,             com: vscode.CompletionItemKind.Enum          },
    [Types.devregs]     :  { id: [],                       title: "",              sym: vscode.SymbolKind.EnumMember,       com: vscode.CompletionItemKind.EnumMember    },
    [Types.devbits]     :  { id: [],                       title: "",              sym: vscode.SymbolKind.EnumMember,       com: vscode.CompletionItemKind.EnumMember    }
}


exports.Types   = Types;
exports.Tokens  = Tokens;
exports.Enums   = Enums;

exports.legend  = () => new vscode.SemanticTokensLegend([...Object.values(Tokens),  ...DTB.main.Tokens]);


exports.activate = () => {
    if (root.debug) console.time("DTB");
    DTB.Init();
    if (root.debug) console.timeEnd("DTB");

    if (root.debug) console.time("STS");
    STS.Init();
    if (root.debug) console.timeEnd("STS");

    vscode.workspace.onDidOpenTextDocument(onDidOpenTextDocument);
    vscode.window.onDidChangeActiveTextEditor(onDidChangeActiveTextEditor);
    vscode.window.onDidChangeTextEditorSelection(onDidChangeTextEditorSelection);
    vscode.window.onDidChangeActiveColorTheme(() => STS.Update());

    onDidChangeActiveTextEditor(vscode.window.activeTextEditor);
    onDidOpenTextDocument(vscode.window.activeTextEditor?.document);

    setTimeout(PLG.activate, 200);
}


function onDidChangeActiveTextEditor(editor) {
    const doc = editor?.document;
    if (!doc || doc.languageId !== 'pos') {  statusVer.hide();    return;  } else {  updateVersion(doc);    statusVer.show();  }
}


function onDidOpenTextDocument(doc) {
    if (!doc || doc.languageId !== 'pos') return;
    if (doc.fileName.startsWith('Untitled-'))  untitledHeader(doc);  else  PLG.load(PLG.file(doc.fileName));
}


function onDidChangeTextEditorSelection(sel) {
    if (sel.textEditor.document.languageId !== "pos") return;
    const kind = vscode.TextEditorSelectionChangeKind;          setActive();
    if (sel.kind == kind.Keyboard) return;
    if (sel.kind == kind.Mouse && root.config.output.ClickHide) OutputHide(1);
    if (sel.kind == null) openInclude(sel);
}

function setActive() {
    const tmo = Math.min(800, root.config.timeout.AutoFormat) * 0.9;        if (tmo <= 0) return;
    clearTimeout(setActive.tmr);            exports.active = true;          setActive.tmr = setTimeout(() => exports.active = false,  tmo);
}


function openInclude(sel) {
    //console.log("main", sel.kind, sel)
    const editor = sel.textEditor,  i = getWordInclude(editor.document, sel.selections[0].active);      if (!i) return;
    const file   = findInclude(i.name);
    const r = new vscode.Range(sel.selections[0].active, sel.selections[0].active.translate(0,1));
    const w = editor.document.getText(r).toLowerCase();         if (w !== 'n') return;

    editor.selections = editor.selections.map(s => new vscode.Selection(s.start.translate(0,-1), s.end.translate(0,-1)));
    
    try { if (file) vscode.workspace.openTextDocument(vscode.Uri.file(file)).then(doc => vscode.window.showTextDocument(doc)); } catch {}
}


function untitledHeader(doc) {
    if (doc.getText().length || !STS.cache.header.enable) return;

    const hdr =  STS.cache.header.text.replace(/<%[\t ]*(.+?)[\t ]*%>/ig, (a,v) => {
        switch (v = v.trim()) {
            case 'date':    return (new Date()).toLocaleDateString();
            case 'time':    return (new Date()).toLocaleTimeString();
            case 'year':    return (new Date()).getFullYear();
            default:        return process.env[v] || '';
        }
    });

    const edit = new vscode.WorkspaceEdit();        edit.replace(doc.uri, new vscode.Range(0,0,0,0), hdr);
    vscode.workspace.applyEdit(edit);
}


function OutputHide(act) {
    const tmo = root.config.output.DelayHide;       clearTimeout(OutputHide._tmr);      OutputHide._tmr = null;
    if (act === 1) vscode.commands.executeCommand("workbench.action.closePanel");
    if (act === 2) if (tmo) OutputHide._tmr = setTimeout(OutputHide, tmo, 1);
}
exports.OutputHide = OutputHide;


function getWordInclude(doc, position, retLoc = false) {
    const rxp = /include +"([^"]+)"/i,  range  = doc.getWordRangeAtPosition(position, rxp);             if (!range) return;
    
    const name = rxp.exec(doc.getText(range))[1],  INC = cache.get(doc).includes,  i = { name,  file: INC.$[name]?.fsPath };
    
    return !retLoc ? i : i.file ? new vscode.Location(vscode.Uri.file(i.file), new vscode.Position(0,0)) : null;
}
exports.getWordInclude = getWordInclude;


function getWordRange(doc, position, rxp) {
    const wordRange = doc.getWordRangeAtPosition(position, rxp);
    return wordRange ? doc.getText(wordRange).toLowerCase() : "";
}
exports.getWordRange = getWordRange;


function failRange(doc, position) {
    const line = doc.lineAt(position),  txt = line.text.substring(0, position.character);
    let char = line.text.charAt(line.firstNonWhitespaceCharacterIndex);
    if (char === "'" || char === ";") return true;
    let q = 0;          for (const char of txt) if (char === '"') q++;         return (q % 2 === 1);
}
exports.failRange = failRange;


function getProc(doc, position) {
    const list = cache.get(doc).symbols.list.$,  items = list[Types.procedure]?.$items;
    if (!items || !position) return items;
    for (const item of Object.values(items)) {
        if (item.range.contains(position)) return item;
    }
}
exports.getProc = getProc;


function getSFR(doc) {
    const res = [],   dev = cache.get(doc).symbols.$.device || {};
    for (const k of Types._.sfr) if (k in dev) res.push(dev[k]);
    return res;
}
exports.getSFR = getSFR;


function getWords(doc, mask = Types.$('main, other')) {
    const items = {},   files = parseDoc(doc, mask);
    for (const file of Object.values(files)) { for (const type of Object.values(file.types)) Object.assign(items, type.$items); }
    return items;
}
exports.getWords = getWords;


function getCompletions(doc) {
    const res = [...DTB.comps(doc)];
    for (const v of getSFR(doc)) res.push(...v.comps);
    return res;
}
exports.getCompletions = getCompletions;


function newTypes(value) {
    const tok = {};
    const res = {
        _ : value,
        $(v) { return (v || "").split(",").reduce((a,i) => { const x = this._[i.trim()]; (x && a.push(...x));   return a; }, []) }
    }
    Object.values(res._).map(v => v.map(i => { res[i] = i;   tok[i] = 'pos_' + i; }));
    return [ Object.freeze(res),  Object.freeze(tok) ];
}


function findInclude(name, value) {
    name = root.autoPath(name);             if (path.isAbsolute(name)) return root.checkFile(name);

    let result,  edt = vscode.window.activeTextEditor,  arr = [edt ? path.dirname(edt.document.fileName) + path.sep : ''];

    if (value) { value = value.endsWith(path.sep) ? value : value + path.sep;    if (value !== arr[0]) arr.unshift(value); }

    for (const x of [...arr,  ...Object.values(root.path.include)]) {
        if (Array.isArray(x)) { for (const v of x) if (result = root.checkFile(v + name)) return result; }
        else                  {                    if (result = root.checkFile(x + name)) return result; }
    }
}


function listSymbols() {
    const result = {},  r = new vscode.Range(0,0,0,0);
    
    for (const [k,v] of Object.entries(Enums)) {
        if (!v.id.length) continue; 
        const s = new vscode.DocumentSymbol(v.title, "", v.sym, r, r);     s.$items = {};     s.$type = k;     result[k] = s;
    }

    return result;
}


function filterSymbols(list) {
    const showInRoot = root.config.outline.showInRoot.split(",").map(v => v.trim().toLowerCase());
    
    return Object.entries(list).reduce((r, [k,v]) => {
        if (k === 'DEVICE' || (v.children.length && v.$type !== Types.device)) {
            if (showInRoot.includes(v.name.toLowerCase())) return r.concat(v.children);  else  r.push(v);
        }
        return r;
    }, []);
}
exports.filterSymbols = filterSymbols;


function getSymbols(input) {
    const getTypeFromID = Object.entries(Enums).reduce((a,[k,v]) => { for (let t of v.id) a[t] = k;   return a; }, {});
    
    const parseLast = (v) => {
        for (let q = 0, i = 0;  i < v.length;  i++) {
            if (v[i] === '"') q = !q;           if (q) continue;            if (v[i] === '\'' || v[i] === ';') return;
            if (v[i] === ':') { i = v.length - i;    rxp.lastIndex -= i;    m[5] = m[5].slice(0,-i);    return i; }
        }
    }

    const rxp = root.regex([
        /"([^"]*)"/,                                                                        // string   (for escape => /"([^"\\]*(?:\\.)?)*"/)
        /[';](.*)$/,                                                                        // comment line
        /\(\*([\s\S]*?)\*\)/,                                                               // comment block
        /((?:^|:)[\t ]*)/,                                                                  // begin only newline or symbol :
        [
            /(\w+)(?::|[\t ]+edata\b.*)(?=[\s';]|$)/,                                       // label
            /(endproc|endsub)(?=[\s';]|$)/,                                                 // use only in parseSymbols
            /include[\t ]+"([^"]+)"/,                                                       // include
            /proc[\t ]+(\w+)[\t ]*\((.*?)\).*?(?=$)/,                                       // proc
            /((?:static[\t ]+)?dim|symbol)[\t ]+(\w+)(.*?)(?=$)/,                           // local
            /(sub|declare|(?:global[\t ]+)(?:dim|symbol))[\t ]+(\w+)(.*?)(?=$)/,            // keywords
            /(\$define|\$defeval)[\t ]+(\w+)(?:[\t ]*$|[\s\S]*?[^'\r\t ][\t ]*$)/,          // define
            /(\w+)[\t ]+macro\b.*?(?=$)/,                                                   // macro
            /(?:device|\d* *LIST +P)[\t =]+(\w+)/                                           // device
        ]
    ]);
    
    let d,  m,  v,  res = [],  help = null,  text = input + '\r\n';

    while ((m = rxp.exec(text)) !== null) {
        
        if (m[2]) {  if (m[2].indexOf('----') === 0) help = [];  else if (help) help.push(m[2]);  }
        
        if (m[3] && m[3][0] === '*') help = [m[3]];

        if      (m[4] == null) continue;
        else if (m[6])  d = { name: m[6],   id: "label",    local: 1    }
        else if (m[7])  d = { name: m[7],   id: "end"                   }
        else if (m[8])  d = { name: m[8],   id: "include",  ofs: 1      }            
        else if (m[9])  d = { name: m[9],   id: "proc",     members: {} }
        else if (m[11]) d = { name: m[12],  id: m[11].toLowerCase().replace(/^\w+[\t ]+/ig,''),   last: parseLast(m[13]),   local: 1  }
        else if (m[14]) d = { name: m[15],  id: m[14].toLowerCase().replace(/^\w+[\t ]+/ig,''),   last: parseLast(m[16])  }
        else if (m[17]) d = { name: m[18],  id: m[17].toLowerCase()  }
        else if (m[19]) d = { name: m[19],  id: "macro"   }
        else if (m[20]) d = { name: m[20],  id: "device"  }
        else continue;

        if (/^\d+$/.test(d.name)) continue;
        
        d.start = m.index + m[4].length;
        d.end   = m.index + m[0].length;
        d.type  = getTypeFromID[d.id];
        d.token = Tokens[d.type];
        d.code  = m[5];
        
        if (help && help.length) d.help = help.join('\n');
        
        res.push(d);          help = null;

        if (d.members) {
            const id = 'prm',  type = getTypeFromID[id],  token = Tokens[type],  ofs = d.start + m[5].indexOf('(') + 1;
            const r = /(?<=^|,)([\t ]*)(?:\b(byval|byc?ref)\b)?[\t ]*(\w*)[^,]*(?=$|,)/ig;

            while ((v = r.exec(m[10])) !== null) {
                if (!v[3]) { if (v.index === r.lastIndex) r.lastIndex++;      continue; }
                const p = v[1].length,   start = ofs + v.index + p,   end = start + v[0].length - p;
                res.push({ name:v[3],  id,  local:1,  start,  end,  type,  token,  code:v[0].substring(p) });
            }
        }
    }
    
    return res;
}


async function parseSymbols(doc) {
    const Blocks = [],  list = listSymbols(),  SYM = cache.get(doc).symbols,  old = SYM.list;

    const newSymbol = (item) => {
        const obj = list[item.type],  name = item.name.toLowerCase(),  prc = item.local && Blocks.length && Blocks.proc;

        if (prc) {
            if (name in prc.members) return;  else  prc.members[name] = item;
        } else {
            if (name in obj.$items)  return;  else  obj.$items[name]  = item;
        }
        
        const r = item.range = new vscode.Range(doc.positionAt(item.start + (item.ofs || 0)), doc.positionAt(item.end));
        const sym = new vscode.DocumentSymbol(item.name, "", obj.kind, r, r);
        
        if (prc)  Blocks[Blocks.length - 1].children.push(sym);  else  obj.children.push(sym);

        if (obj.kind === vscode.SymbolKind.Function || obj.kind === vscode.SymbolKind.Method) {
            Blocks.push(sym);    Blocks.proc = item.members && item;
        }
    }

    for (const x of getSymbols(doc.getText())) {
        if (x.id === "end") {
            const b = Blocks.pop();         if (b) (Blocks.proc || {}).range = b.range = new vscode.Range(b.range.start, doc.positionAt(x.end));
            Blocks.proc = 0;
        } else {
            newSymbol(x);
        }
    }

    for (const [k,v] of Object.entries(list))  if (v.$items && !Object.keys(v.$items).length) delete list[k];

    SYM.list = list;        await parseIncludes(doc, list);         parseDevice(doc, list, old);         SYM.list = list;

    return filterSymbols(list);
}
exports.parseSymbols = parseSymbols;


async function parseIncludes(doc, list, timeout = 5000) {
    const INC = cache.get(doc).includes,  arr = list[Types.include]?.children || [];

    for (const v of Object.values(INC.$)) v.del = true;

    for (const v of arr) {
        const i = INC[v.name].$;          i.del = false;                if (i.open) continue;  else  i.open = true;

        const f = findInclude(v.name, path.dirname(doc.fileName));      if (!f) continue;
        
        const iDoc = await vscode.workspace.openTextDocument(vscode.Uri.file(f));
        const iSym = vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider', iDoc.uri);
        
        if (root.config.smartParentIncludes) cache.get(iDoc).parent = doc.uri.fsPath;

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


function parseDevice(doc, list, old) {
    const devs = getDevice(doc),   SYM = cache.get(doc).symbols;

    let dev,  name,  local,  r = doc.lineAt(0).range;

    if (devs.length) { dev = devs.pop();    name = dev.value.name;     if (dev.isLocal) { local = dev.value;   r = dev.value.range; } }

    name = "\u03A1" + (name || DTB.$(doc).db.default.device);

    SYM.local  = local;
    
    if (old.DEVICE.$.name === name) {
        list.DEVICE = old.DEVICE.$;         list.DEVICE.range = list.DEVICE.selectionRange = r;         return;
    } else {
        dev = openDevice(name.substring(1));
    }

    SYM.device = dev;

    if (!root.IsAsmLst(doc)) {
        const showRegs = root.config.outline.showRegisters;

        list.DEVICE = new vscode.DocumentSymbol((showRegs ? name : name.substring(1)), "", vscode.SymbolKind.EnumMember, r, r);
        
        if (showRegs) {
            const x = list.DEVICE.children,  kind = list.DEVICE.kind;
            for (const v of Object.values(dev[Types.devregs].items)) {
                x.push(new vscode.DocumentSymbol(v.name + " ", " " + v.value, kind, r, r));
            }
        }
    }
}


function getDevice(doc, skip = {}, result = []) {
    let isLocal = false;
    
    if (typeof doc === 'object') { doc = doc.uri.fsPath;   isLocal = true; }
    if (skip[doc]) return;  else  skip[doc] = true;

    const INC = cache.get(doc).includes,  SYM = cache.get(doc).symbols,  items = SYM.list.$[Types.device]?.$items || {};

    for (const [k,v] of Object.entries(items)) if (k in DTB.files) result.push({ isLocal,  value:v });

    for (const item of Object.values(INC.$)) if (item?.fsPath) getDevice(item.fsPath, skip, result);

    if (!result.length && isLocal && root.config.smartParentIncludes) {
        const prt = root.getParent(doc);      if (prt && !skip[prt]) getDevice(prt, skip, result);
    }

    return result;
}


function openDevice(name) {
    if (name in cache_dev) return cache_dev[name];

    const devFile = (fName) => { try{  return fs.readFileSync(root.path.include.main + fName, 'utf-8');  }catch{} }

    const devSFR = (obj, type, rxp, txt) => {
        const items = {},  comps = [],  words = [],  token = Tokens[type],  kind  = Enums[type].com || 0;
        for (const m of rxp.matchAll(txt)) {
            const name = m[1];
            items[m[1].toLowerCase()] = { name,  token,  value: m[2] };
            comps.push(new vscode.CompletionItem({ label: name,  description: m[2] }, kind));
            words.push(name);
        }
        obj[type] = { items,  comps,  token,  words: words.join('|') };
    }

    const obj = { name },  filename = DTB.files[name.toLowerCase()];

    const ppi  = devFile("PPI" + path.sep + filename);              devSFR(obj, Types.devregs, PAT.EQU, PAT.PPI(ppi, "REG"));
    const defs = devFile("Defs" + path.sep + name + ".def");        devSFR(obj, Types.devbits, PAT.DEF, defs);

    obj.$info = PAT.PPI(ppi, "INFO", {});
    obj.core  = obj.$info?.core;

    return cache_dev[name] = obj;
}


function parseDoc(doc, mask = Types._.main, skip = {}, result = {}) {
    let isLocal = false;
    
    if (typeof doc === 'object') { doc = doc.uri.fsPath;   isLocal = true; }
    if (skip[doc]) return;  else  skip[doc] = true;

    const INC = cache.get(doc).includes,  SYM = cache.get(doc).symbols,  list = SYM.list.$;

    const obj = result[doc] = { isLocal, scope: path.basename(doc), types:{} };

    for (const item of Object.values(list).filter(v => (mask.includes(v.$type)))) obj.types[item.$type] = item;

    for (const item of Object.values(INC.$)) if (item?.fsPath) parseDoc(item.fsPath, mask, skip, result);

    if (isLocal && root.config.smartParentIncludes) {
        const prt = root.getParent(doc);      if (prt && !skip[prt]) parseDoc(prt, mask, skip, result);
    }

    return result;
}
exports.parseDoc = parseDoc;


function getDocs(doc, skip = {}, result = []) {
    if (typeof doc === 'object') doc = doc.uri.fsPath;      if (skip[doc]) return;      skip[doc] = true;       result.push(doc);

    for (const item of Object.values(cache.get(doc).includes.$)) if (item?.fsPath) getDocs(item.fsPath, skip, result);

    return result;
}
exports.getDocs = getDocs;


function codeHTML(text, doc, mark, rep) {
    const res = [],   keys = {},   esc = !/\n/.test(text),   styles = STS.getThemeStyle(keys),   items = cache.get(doc).semantic.items.$;
    const dev = items?.dev,   wrd = !rep ? items?.doc : Object.assign({}, items?.doc, rep);

    Object.entries(PAT.RXP.types).map(([k,v]) => keys[v.id] = k);

    const makeStyle = (id, txt) => {
        let out = !(mark && esc) ? txt : txt.replace(/[\\`*_{}[\]()#+\-.!]/g, '\\$&');
        
        const s = styles[keys[id]] || {};       if (!s.enable) return out;
        
        if (  /bold/i.test(s.fontStyle)) out = '<b>' + out + '</b>';
        if (/italic/i.test(s.fontStyle)) out = '<i>' + out + '</i>';
        out = `<span style="color:${s.foreground};">${out}</span>`;
        
        return '\0' + (res.push(out) - 1) + '\0';
    }

    text = text.replace(PAT.ALL(null,'^[SCNB]'),            function (m) {
        for (const [k,v] of Object.entries(arguments[arguments.length - 1])) if (v) return makeStyle(k, v);
        return m;
    });

    text = text.replace(PAT.ALL(DTB.words(doc)),            function (m) {
        const i = DTB.find(m);                              return !i ? m : makeStyle(i.token, m);
    });

    if (dev) {
        text = text.replace(PAT.ALL(Object.keys(dev)),      function(m){
            const i = dev[m.toLowerCase()];                 return !i ? m : makeStyle(i.token, m);
        });
    }

    if (wrd) {
        text = text.replace(PAT.ALL(Object.keys(wrd)),      function(m){
            const i = wrd[m.toLowerCase()];                 return !i ? m : makeStyle(i.token, m);
        });
    }

    text = text.replace(PAT.ALL(null,'^[O]'),               function(m){
        for (const [k,v] of Object.entries(arguments[arguments.length - 1])) if (v) return makeStyle(k, v);
        return m;
    });

    if (mark) text =  !esc ?  '<pre>' + text + '</pre>'  :  text.replace(/\t/g,    ()  => '&nbsp;'.repeat(6))
                                                                .replace(/ {2,}/g, (m) => '&nbsp;'.repeat(m.length));
    
    return text.replace(/[\\]/g, '\\$&').replace(/\0(\d+)\0/g, (m,v) => res[v]);
}
exports.codeHTML = codeHTML;


function createVersion() {
    const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, -1);
    item.command = 'pos.editversion';
    vscode.commands.registerCommand(item.command, async () => {
        const doc = vscode.window.activeTextEditor?.document;
        const res = await vscode.window.showInputBox({ value: getVersion(doc) });
        if (res) setVersion(doc, res);
    });
    return item;
}


function getVersion(doc, str = true) {
    const def = {  Enable: 1,  Rollover: 255,  Major: 0,  Minor: 0,  Release: 0,  Build:0  };
    const ver = PAT.INI(root.readFile(doc, '',  '.mci'), 'Version', def);
    return !str ? ver : `${ver.Major}.${ver.Minor}.${ver.Release}.${ver.Build}`;
}
exports.getVersion = getVersion;


function setVersion(doc, prm) {
    let v = getVersion(doc, false);
    
    if (prm) {
        const m = /^[\t ]*(enable[\t ]*=[\t ]*(\d))|(rollover[\t ]*=[\t ]*(\d))|((\d+)\.(\d+)\.(\d+)\.(\d+))[\t ]*$/i.exec(prm);
        if (!m) return;
        if (m[1]) v.Enable   = parseInt(m[2]);
        if (m[3]) v.Rollover = parseInt(m[4]);
        if (m[5]) {  v.Major = parseInt(m[6]);   v.Minor = parseInt(m[7]);   v.Release = parseInt(m[8]);   v.Build = parseInt(m[9]);  }
    }
    else {
        if (v.Enable) {
            v.Build++;

            if (v.Build > v.Rollover) {
                v.Build = 0;
                v.Release++;

                if (v.Release > v.Rollover) {
                    v.Release = 0;
                    v.Minor++;

                    if (v.Minor > v.Rollover) {
                        v.Minor = 0;
                        v.Major++;

                        if (v.Major > v.Rollover) v.Major = 0;
                    }
                }
            }
        }
    }

    let txt = Object.entries(v).reduce((a,[k,v]) => a += k + '=' + v + '\r\n', '[Version]\r\n');

    txt = PAT.INI(root.readFile(doc, '',  '.mci'), 'Version', txt);
    root.writeFile(doc, txt, ".mci");

    updateVersion(doc, true);
}
exports.setVersion = setVersion;


function updateVersion(doc, change) {
    const fName = typeof doc === 'object' ? doc.fileName : doc,   fAct = vscode.window.activeTextEditor?.document?.fileName;

    if (fName !== fAct) return;
    
    if (change) {
        statusVer.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        setTimeout(() => { statusVer.backgroundColor = undefined; },  600);
    }
    
    statusVer.text = 'Ver ' + getVersion(fName);
    statusVer.tooltip = fName;
}
exports.updateVersion = updateVersion;
