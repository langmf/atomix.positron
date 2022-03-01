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
    main  : [ "variable", "procedure", "symbol", "define", "label" ],
    lang  : [ "device", "declare", "include" ],
    sfr   : [ "devregs", "devbits" ]
});

const Enums = {
    [Types.variable]  :  { id: ["dim"],                  title: "Variables",     sym: vscode.SymbolKind.Variable,     com: vscode.CompletionItemKind.Variable   },
    [Types.procedure] :  { id: ["proc","sub"],           title: "Procedures",    sym: vscode.SymbolKind.Function,     com: vscode.CompletionItemKind.Function   },
    [Types.symbol]    :  { id: ["symbol"],               title: "Constants",     sym: vscode.SymbolKind.Constant,     com: vscode.CompletionItemKind.Constant   },
    [Types.declare]   :  { id: ["declare"],              title: "Declares",      sym: vscode.SymbolKind.String,       com: vscode.CompletionItemKind.Text       },
    [Types.device]    :  { id: ["device"],               title: "Devices",       sym: vscode.SymbolKind.EnumMember,   com: vscode.CompletionItemKind.EnumMember },
    [Types.include]   :  { id: ["include"],              title: "Includes",      sym: vscode.SymbolKind.File,         com: vscode.CompletionItemKind.File       },
    [Types.label]     :  { id: ["label"],                title: "Labels",        sym: vscode.SymbolKind.Field,        com: vscode.CompletionItemKind.Field      },
    [Types.define]    :  { id: ["$define","$defeval"],   title: "Defines",       sym: vscode.SymbolKind.Enum,         com: vscode.CompletionItemKind.Enum       },
    [Types.devregs]   :  { id: [],                       title: "",              sym: vscode.SymbolKind.EnumMember,   com: vscode.CompletionItemKind.EnumMember },
    [Types.devbits]   :  { id: [],                       title: "",              sym: vscode.SymbolKind.EnumMember,   com: vscode.CompletionItemKind.EnumMember }
}


exports.Types   = Types;
exports.Tokens  = Tokens;
exports.Enums   = Enums;

exports.legend  = () => new vscode.SemanticTokensLegend([...Object.values(Tokens),  ...DTB.Tokens]);


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
    
    if (sel.kind == vscode.TextEditorSelectionChangeKind.Mouse)
    {
        if (root.config.output.ClickHide) vscode.commands.executeCommand("workbench.action.closePanel");
    }
    else if (sel.kind == vscode.TextEditorSelectionChangeKind.Command)
    {
        const editor = sel.textEditor,  i = getWordInclude(editor.document, sel.selections[0].active);      if (!i) return;
        const file   = findInclude(i.name);

        editor.selections = editor.selections.map(s => new vscode.Selection(s.start.translate(0,1), s.end.translate(0,1)));
        
        try {
            if (file) vscode.workspace.openTextDocument(vscode.Uri.file(file)).then(doc => vscode.window.showTextDocument(doc));
        } catch {}
    }
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


function getCore(doc) {
    return cache.get(doc).symbols.device.$.$info?.core;
}
exports.getCore = getCore;


function getSFR(doc) {
    const res = [],   dev = cache.get(doc).symbols.$.device || {};
    for (const k of Types._.sfr) if (k in dev) res.push(dev[k]);
    return res;
}
exports.getSFR = getSFR;


function getCompletions(doc) {
    const res = [...DTB.comps(getCore(doc))];
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


function findInclude(name, cur = path.dirname(vscode.window.activeTextEditor.document.fileName)) {
    if (path.isAbsolute(name)) return root.checkFile(name);

    let result,  curPath = cur.endsWith("\\") ? cur : cur + "\\";

    for (const x of [curPath, ...Object.values(root.path.include)]) {
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
    const r = /"([^"]*)"|[';](.*)$|\(\*([\s\S]*?)\*\)|((?:^|:)[\t ]*)((\w+):(?=[\s';]|$)|(endproc|endsub)(?=[\s';]|$)|include[\t ]+"([^"]+)"|(proc|sub|static[\t ]+dim|dim|declare|symbol)[\t ]+([\w\u0400-\u04FF]+)[^:]*?(?=$|:)|(\$define|\$defeval)[\t ]+(\w+)([\t ]*$|[\s\S]*?[^'\r\t ][\t ]*$)|(device|\d* *LIST +P)[\t =]+(\w+))/igm;

    const getTypeFromID = Object.entries(Enums).reduce((a,[k,v]) => { for (let t of v.id) a[t] = k;   return a; }, {});
    
    let d,  m,  v = [],  help = null,  text = input + '\r\n';

    while ((m = r.exec(text)) !== null) {
        
        if (m[2]) {  if (m[2].indexOf('----') === 0) help = [];  else if (help) help.push(m[2]);  }
        
        if (m[3] && m[3][0] === '*') help = [m[3]];

        if      (m[4] == null) continue;
        else if (m[6])  d = { name: m[6],   id: "label"   }
        else if (m[7])  d = { name: m[7],   id: "end"     }
        else if (m[8])  d = { name: m[8],   id: "include" }            
        else if (m[9])  d = { name: m[10],  id: m[9].toLowerCase().replace(/static[\t ]+/g,'') }
        else if (m[11]) d = { name: m[12],  id: m[11].toLowerCase()  }
        else if (m[14]) d = { name: m[15],  id: "device"  }
        else continue;

        if (/^\d+$/.test(d.name)) continue;
        
        d.start = m.index + m[4].length;
        d.end   = m.index + m[0].length;
        d.type  = getTypeFromID[d.id];
        d.token = Tokens[d.type];
        d.code  = m[5];
        
        if (help && help.length) d.help = help.join('\n');
        
        v.push(d);          help = null;
    }
    
    return v;
}


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


async function parseSymbols(doc) {
    const Blocks = [],  list = listSymbols(),  SYM = cache.get(doc).symbols,  old = SYM.list;

    const newSymbol = function(item) {
        const obj = list[item.type],  name = item.name.toLowerCase();
        
        if (name in obj.$items) return;  else  obj.$items[name] = item;
        
        const r = item.range = new vscode.Range(doc.positionAt(item.start), doc.positionAt(item.end));
        const sym = new vscode.DocumentSymbol(item.name, "", obj.kind, r, r);
        
        if (Blocks.length === 0)  obj.children.push(sym);  else  Blocks[Blocks.length - 1].children.push(sym);
        if (obj.kind === vscode.SymbolKind.Function) Blocks.push(sym);
    }
    
    for (const x of getSymbols(doc.getText())) if (x.id === "end") Blocks.pop();  else  newSymbol(x);

    for (const [k,v] of Object.entries(list)) if (v.$items && !Object.keys(v.$items).length) delete list[k];

    SYM.list = list;        await parseIncludes(doc, list);         parseDevice(doc, list, old);         SYM.list = list;
    
    return filterSymbols(list);
}
exports.parseSymbols = parseSymbols;


function parseDevice(doc, list, old) {
    const devs = getDevice(doc),   SYM = cache.get(doc).symbols;

    let dev,  name,  local,  r = doc.lineAt(0).range;

    if (devs.length) { dev = devs.pop();    name = dev.value.name;     if (dev.isLocal) { local = dev.value;   r = dev.value.range; } }

    name = "Ρ" + (name || DTB.db.default.device);

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
        const prt = cache.get(doc).$.parent;      if (prt) getDevice(prt, skip, result);
    }

    return result;
}


function openDevice(name) {
    if (name in cache_dev) return cache_dev[name];

    const devFile = (fName, prf) => {
        if (prf && !/\\rf/i.test(fName)) fName = fName.replace('\\', '\\' + prf);
        try {  return fs.readFileSync(root.path.include.main + fName, 'utf-8');  } catch {} 
    }

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

    const obj = { name };

    const ppi  = devFile("PPI\\"  + name + ".ppi", "P");    devSFR(obj, Types.devregs, PAT.EQU, PAT.PPI(ppi, "REG"));
    const defs = devFile("Defs\\" + name + ".def");         devSFR(obj, Types.devbits, PAT.DEF, defs);

    obj.$info = PAT.PPI(ppi, "INFO", {});

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
        const prt = cache.get(doc).$.parent;      if (prt) parseDoc(prt, mask, skip, result);
    }

    return result;
}
exports.parseDoc = parseDoc;


function codeHTML(text, doc, mark) {
    const res = [],   keys = {},   esc = !/\n/.test(text),   styles = STS.getThemeStyle(keys),   items = cache.get(doc).semantic.items.$;

    Object.entries(PAT.RXP.types).map(([k,v]) => keys[v.id] = k);

    const makeStyle = (id, txt) => {
        let out = !(mark && esc) ? txt : txt.replace(/[\\`*_{}[\]()#+\-.!]/g, '\\$&');
        
        const s = styles[keys[id]] || {};       if (!s.enable) return out;
        
        if (  /bold/i.test(s.fontStyle)) out = '<b>' + out + '</b>';
        if (/italic/i.test(s.fontStyle)) out = '<i>' + out + '</i>';
        out = `<span style="color:${s.foreground};">${out}</span>`;
        
        return '\0' + (res.push(out) - 1) + '\0';
    }

    text = text.replace(PAT.ALL(null,'^[SCNB]'), function (m) {
        for (const [k,v] of Object.entries(arguments[arguments.length - 1])) if (v) return makeStyle(k, v);
        return m;
    });

    text = text.replace(PAT.ALL(DTB.words(getCore(doc))),       function (m) {
        const i = DTB.find(m);                          return !i ? m : makeStyle(i.token, m);
    });

    if (items?.dev) {
        text = text.replace(PAT.ALL(Object.keys(items.dev)),    function(m){
            const i = items.dev[m.toLowerCase()];       return !i ? m : makeStyle(i.token, m);
        });
    }

    if (items?.doc) {
        text = text.replace(PAT.ALL(Object.keys(items.doc)),    function(m){
            const i = items.doc[m.toLowerCase()];       return !i ? m : makeStyle(i.token, m);
        });
    }

    text = text.replace(PAT.ALL(null,'^[O]'),                   function(m){
        for (const [k,v] of Object.entries(arguments[arguments.length - 1])) if (v) return makeStyle(k, v);
        return m;
    });

    if (mark) text =  !esc ?  '<pre>' + text + '</pre>'  :  text.replace(/\t/g,    ()  => '&nbsp;'.repeat(6))
                                                                .replace(/ {2,}/g, (m) => '&nbsp;'.repeat(m.length));
    
    return text.replace(/\0(\d+)\0/g, (m,v) => res[v]);
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
    if (change) {
        statusVer.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        setTimeout(() => { statusVer.backgroundColor = undefined; },  600);
    }
    
    statusVer.text = 'Ver ' + getVersion(doc);
    statusVer.tooltip = doc.fileName;
}
exports.updateVersion = updateVersion;
