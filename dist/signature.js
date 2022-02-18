"use strict";

const vscode = require("vscode");
const cache   = require("./cache");
const common  = require("./common");
const DTB    = require("./database");


function getCode(code) {
    return code.replace(/\w+\([^()]*\)/g,       "")
                    .replace(/"[^"]*"/g,        "")
                    .replace(/"[^"]*(?=$)/g,    "")
                    .replace(/\([^()]*\)/g,     "")
                    .replace(/\({2,}/g,         "(");
}

function getName(code) {
    const prt = code.split("("),   index = prt.length === 1 ? 0 : prt.length - 2,   mts = prt[index].match(/(?:.*)\b(\w+)/);
    return mts ? mts[1].toLowerCase() : null;
}

function getCount(code) {
    const prt = code.lastIndexOf("("),   cnt = code.slice(prt).match(/(?!\B["'][^"']*),(?![^"']*['"]\B)/g);
    return cnt === null ? 0 : cnt.length;
}

function getInfo(doc, pos) {
    const code = doc.lineAt(pos).text.substring(0, pos.character),   clean = getCode(code);
    const name = getName(clean),   count = getCount(clean);
    //console.log('info', code, "\n", clean, "\n", name, "\n", count)
    return name ? { name,  count } : null;
}


function parseItem(x) {
    let text = '',  help = {},  i = x.sign || x;

    try {  if (i.help) help = typeof i.help === 'object' ? i.help : JSON.parse('{' + i.help + '}');  }catch{}

    text = !x.sign ? (help.code || i.code) : `cmd ${x.name}(${i.code || ''})`;

    const m = text.match(/(?:proc|sub|cmd|\$define|\$defeval)[\t ]+(([\w\u0400-\u04FF]+)[\t ]*(?:\((.*?)\))?(?:[\t ]*,[\t ]*([\w\d\.]+))?)/i);

    if (!m || m[3] == null) return null;

    const si = new vscode.SignatureInformation(m[1], help.info);

    m[3].split(",").forEach((p,n) => {
        const pi = new vscode.ParameterInformation(p.trim() || n);
        if (help.args) pi.documentation = help.args[n];
        si.parameters.push(pi);
    });

    return si;
}


function provideSignatureHelp(doc, position, token, context) {
    if (common.failRange(doc, position)) return null;
    
    const caller = getInfo(doc, position);          if (!caller) return null;
    
    const result = new vscode.SignatureHelp();
    
    result.activeSignature = context.activeSignatureHelp ? context.activeSignatureHelp.activeSignature : 0;
    result.activeParameter = caller.count;
    
    const SEM = cache.get(doc).semantic,   items = SEM.items.$.doc,   T = common.Types;

    const v = items[caller.name];
    if (v && (v.type === T.procedure || v.type === T.define)) {
        const si = parseItem(v);
        if (si && si.parameters.length > caller.count) result.signatures.push(si);
    }

    const d = DTB.find(caller.name);
    if (d && d.sign) {
        const si = parseItem(d);
        if (si && si.parameters.length > caller.count) result.signatures.push(si);
    }

    return result;
}


exports.default = () => vscode.languages.registerSignatureHelpProvider({ language: "pos" }, { provideSignatureHelp }, { triggerCharacters: "(",  retriggerCharacters: [",", " "] });
