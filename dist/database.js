"use strict";

const vscode  = require("vscode");
const fs      = require("fs");
const root    = require("./root");


let items, cache;

const prefix  = "pdb_";
exports.prefix = prefix;


exports.Init = (fName = 'database.json') => {
    try {
        exports.files = fs.readdirSync(root.path.include.main + "PPI").reduce((a,v) => { 
            const m = v.match(/^P?([^.]+)\.ppi$/i);     if (m) a[m[1].toLowerCase()] = 1;     return a;
        },{});
    }
    catch (e) { vscode.window.showErrorMessage(`Scan devices -> ${e}`); }

    try {
        let      fn = root.checkFile(root.path.pds + fName);
        if (!fn) fn = root.checkFile(root.extensionPath + '\\files\\' + fName);
        if (!fn) throw `Can't be opened!`;
        
        const text = fs.readFileSync(fn, 'utf-8').replace(/\/\*[\s\S]*?\*\//g, '');
        exports.db = JSON.parse(text);

    }
    catch (e) { vscode.window.showErrorMessage(`"${fName}" -> ${e}`); }

    exports.db         = Object.assign({ default:{}, types:{} },    exports.db);
    exports.db.default = Object.assign({ device:"18F25K20", titles:{}, themes:{} },     exports.db.default);
    exports.files      = exports.files || {};

    items = {};     cache = { comps:{},  words:{} };

    for (const [type, arr] of Object.entries(exports.db.types)) {
        const token = prefix + type.toLowerCase();
        
        for (const x of arr) {
            const core = x.core,  hint = x.hint,  comp = x.comp;
            
            for (const name of x.name.split(',').map(v => v.trim())) {
                const m = name.match(/^(\w+?)(\d*)\.\.\.(\d+)(\w*)$/i);
                
                if (!m) {
                    const word = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    items[name.toLowerCase()] = { name,  word,  token,  core,  hint,  comp };
                } else {
                    for (let b = parseInt(m[2] || 0), e = parseInt(m[3]); b <= e; b++ ) {
                        const word = m[1] + (m[2] || b ? b : '') + m[4]; 
                        items[word.toLowerCase()] = { name:word,  word,  token,  core,  hint,  comp };
                    }
                }
            }
        }
    }

    exports.Tokens = Object.keys(exports.db.types).map(v => prefix + v.toLowerCase());
}


exports.find = (word, core) => {
    if (!word) return;
    const i = items[word.toLowerCase()];    if (i && (!core || !i.core || i.core.includes(core))) return i;
}


exports.comps = (core) => {
    if (core in cache.comps) return cache.comps[core];
    const res = [],  kind  = vscode.CompletionItemKind.Module;
    for (const i of Object.values(items)) if (!core || !i.core || i.core.includes(core)) {
        res.push(new vscode.CompletionItem({label: i.name,  description: i.comp}, kind));
    }
    return cache.comps[core] = res;
}


exports.words = (core) => {
    if (core in cache.words) return cache.words[core];
    const res = [];     for (const i of Object.values(items)) if (!core || !i.core || i.core.includes(core)) res.push(i.word);
    return cache.words[core] = res.join('|');
}


/*
function exportMCD(fName) {
    let text = '',  types = {},  def = {};

    try{  text = fs.readFileSync(fName, 'utf-8');  }catch(e){  vscode.window.showErrorMessage(`${e}`);  }
    
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
    try{  text = fs.writeFileSync(__dirname + '\\Database.json', res);  }catch(e){  vscode.window.showErrorMessage(`${e}`);  }
}
exportMCD(path.resolve(vscode.workspace.getConfiguration("pos").main.compiler, "..\\..\\") + "\\database.mcd");
*/