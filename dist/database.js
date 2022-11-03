"use strict";

const vscode  = require("vscode");
const fs      = require("fs");
const root    = require("./root");


exports.prefix = "pdb_";

exports.Init = () => {
    exports.main  = LoadDB('main.json');
    exports.asm   = LoadDB('asm.json', true);
    exports.files = getPPI() || {};
    //compareMCD();
}


function $(doc) {
    return exports.asm && root.IsAsmLst(doc) ? exports.asm : exports.main;
}
exports.$ = $;


function getPPI() {
    try {
        return fs.readdirSync(root.path.include.main + "PPI").reduce((a,v) => { 
            const m = v.match(/^P?([^.]+)\.ppi$/i);     if (m) a[m[1].toLowerCase()] = v;     return a;
        },{});
    } catch (e) { vscode.window.showErrorMessage(`Scan devices -> ${e}`); }
}


function LoadDB(fName, fExit) {
    const obj = {},  prefix = exports.prefix;

    try {
        let      fn = root.checkFile(root.path.pds + fName);
        if (!fn) fn = root.checkFile(root.extensionPath + '/files/' + fName);
        if (!fn) throw `Can't be opened!`;
        
        const text = fs.readFileSync(fn, 'utf-8').replace(/\/\*[\s\S]*?\*\//g, '');
        obj.db = JSON.parse(text);
    }
    catch (e) { vscode.window.showErrorMessage(`"${fName}" -> ${e}`);    if (fExit) return; }

    obj.db         = Object.assign({ default:{}, types:{} },    obj.db);
    obj.db.default = Object.assign({ device:"18F25K20", titles:{}, themes:{} },     obj.db.default);
    obj.cache      = { comps:{},  words:{} };
    obj.items      = {};

    for (const [type, arr] of Object.entries(obj.db.types)) {
        const token = prefix + type.toLowerCase();
        
        for (const x of arr) {
            const core = x.core,  hint = x.hint,  comp = x.comp,  sign = x.sign;
            
            for (const name of x.name.split(',').map(v => v.trim()).filter(v => v)) {
                const m = name.match(/^(\w+?)(\d*)\.\.\.(\d+)(\w*)$/i);
                
                if (!m) {
                    const word = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    obj.items[name.toLowerCase()] = { name,  word,  token,  core,  hint,  comp,  sign };
                } else {
                    for (let b = parseInt(m[2] || 0), e = parseInt(m[3]); b <= e; b++ ) {
                        const word = m[1] + (m[2] || b ? b : '') + m[4]; 
                        obj.items[word.toLowerCase()] = { name:word,  word,  token,  core,  hint,  comp,  sign };
                    }
                }
            }
        }
    }

    obj.Tokens = Object.keys(obj.db.types).map(v => prefix + v.toLowerCase());          return obj;
}


exports.proto_find = (doc) => {
    const core = root.getCore(doc),  db = $(doc);
    return function (word) {
        if (!word) return;
        const i = db.items[word.toLowerCase()];    if (i && (!core || !i.core || i.core.includes(core))) return i;
    }
}


exports.find = (word, doc) => {
    const core = root.getCore(doc),  db = $(doc);
    if (!word) return;
    const i = db.items[word.toLowerCase()];    if (i && (!core || !i.core || i.core.includes(core))) return i;
}


exports.comps = (doc) => {
    const core = root.getCore(doc),  db = $(doc),  res = [];        if (core in db.cache.comps) return db.cache.comps[core];
    const kind = vscode.CompletionItemKind.Module;
    for (const i of Object.values(db.items)) if (!core || !i.core || i.core.includes(core)) {
        res.push(new vscode.CompletionItem({label: i.name,  description: i.comp}, kind));
    }
    return db.cache.comps[core] = res;
}


exports.words = (doc) => {
    const core = root.getCore(doc),  db = $(doc),  res = [];        if (core in db.cache.words) return db.cache.words[core];
    for (const i of Object.values(db.items)) if (!core || !i.core || i.core.includes(core)) res.push(i.word);
    return db.cache.words[core] = res.join('|');
}



function compareMCD() {
    let text = '',  types = {},  def = {};

    try{  text = fs.readFileSync(root.path.pds + "database.mcd", 'utf-8');  }catch(e){  vscode.window.showErrorMessage(`${e}`);  }
    
    const hdr = text.match(/^DATABASE([\s\S]+?)^KEY/m);
    if (hdr) { for (const m of hdr[1].matchAll(/^([\w]+)[\t ]*=[\t ]*"?(\w+)"?/igm)) def[m[1].toLowerCase()] = m[2]; }

    for (const m of text.matchAll(/^KEY[\t ]*\(([^\)]+)\)([\s\S]+?)^ENDKEY/gm)) {
        let hint, core, tp;
        for (const x of m[2].matchAll(/^[\t ]+([\w]+)[\t ]*=[\t ]*(.+)$/igm)) {
            let v = x[2].trim();
            let n = x[1].toLowerCase();
            if (n === 'hint') { v = v.replace(/^"|"$/g,'');    if (v) hint = v; }
            if (n === 'devicecore') { v = v.replace(/[\[\] dc]/g,'').split(',').map( i => parseInt(i)).toString();   if (v !== '12,14,16,24,33') core = v; }
            if (n === 'highlighter') tp = v;
        }
        const x = types[tp] = types[tp] || [];
        const s = m[1].replace(/["\r\n ]/g,'');
        x.push({ name: s, core, hint });
    }

    const obj = { 
        default: def,
        titles: Object.keys(types).reduce((a,v) => (a[v] = v.replace(/([a-z])([A-Z])/, '$1_$2')) && a, {}), 
        types };

    const res = JSON.stringify(obj, null, '\t').replace(/^([\t ]+"core":[\t ]+)"([^"]+)"/igm,'$1[$2]');
    try{  text = fs.writeFileSync(__dirname + '/database.json', res);  }catch(e){  vscode.window.showErrorMessage(`${e}`);  }

    const items = Object.assign({}, exports.main.items);

    for (const [name, item] of Object.entries(obj.types)) {
        for (const i of item) {
            for (const k of i.name.split(',').map(v => v.trim()).filter(v => v)) {
                const n = k.toLowerCase();
                if ((n in items) || n.startsWith('pin_')) { delete items[n];    continue; }
                console.log("Skip: ", k);
            }
        }
    }

    for (const i of Object.values(items)) console.log("Added: ", i.name);
}
