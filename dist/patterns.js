"use strict";

Object.defineProperty(exports, "__esModule", { value: true });


exports.DEVICE   = newRXP(/(?<!'\s*)(?:^|:)[\t ]*(Device|\d* *LIST +P)(?: +=)?[\t ]+([\w\u0400-\u04FF]+)/im);

exports.REG      = newRXP(/^\[REGSTART\]([\s\S]+)^\[REGEND\]/im);
exports.EQU      = newRXP(/^([\w\u0400-\u04FF]+)[\t ]+EQU[\t ]+(.*)$/im);
exports.DEFS     = newRXP(/^\$Define[\t ]+([a-z][\w]+)[\t ]+(.*)$/im);

exports.ARRBRAC  = newRXP(/\(\s*\d*\s*\)/);

exports.COLOR    = newRXP(/\b(Black|Blue|Cyan|Green|Magenta|Red|White|Yellow)\b|\b(RGB[\t ]*\([\t ]*((\$|0x)[0-9a-f]+|\d+)[\t ]*,[\t ]*((\$|0x)[0-9a-f]+|\d+)[\t ]*,[\t ]*((\$|0x)[0-9a-f]+|\d+)[\t ]*\))|((\$|0x)[0-9a-f]{6}\b)/im);

exports.WORDS    = getWords;
exports.SYMBOLS  = getSymbols;


function newRXP(rxp) {
    rxp.matchAll = s => (s || "").matchAll(RegExp(rxp.source, 'igm'));
    return rxp;
}

function getWords(input, words) {
    if (typeof words === 'object') words = Object.keys(words).join("|");
    let m,  v = [],  r = RegExp(`(?:"[^"]*")|[';].*$|\\(\\*[^\\*]*\\*\\)|\\b(${words})\\b`, 'igm');
    if (words) { while ((m = r.exec(input)) !== null) if (m[1]) v.push(m); }
    return v;
}

function getSymbols(input) {
    let d, m, v = [];
    
    const r = /(?:"[^"]*")|[';].*$|\(\*[^\*]*\*\)|((?:^|:)[\t ]*)((\w+):(?:[\s;']|$)|(endproc|endsub)(?=[\s;']|$)|include[\t ]+"([^"]+)"|(proc|sub|static[\t ]+dim|dim|declare|symbol|\$define|\$defeval)[\t ]+([\w\u0400-\u04FF]+)([^:]*?)(?=$|:))/igm;
    
    while ((m = r.exec(input)) !== null) {
        if (m[1] == null) continue;
        d = {
            start: m.index + m[1].length,
            end:   m.index + m[0].length,
            is()   { return Array.from(arguments).indexOf(this.id) >= 0; }
        };
        if      (m[3]) { d.name = m[3];   d.id = "label";   }
        else if (m[4]) { d.name = m[4];   d.id = "endproc"; }
        else if (m[5]) { d.name = m[5];   d.id = "include"; }            
        else if (m[6]) { d.name = m[7];   d.id = m[6].toLowerCase().replace(/static[\t ]+/g,'');   d.value = m[8]; }
        else continue;
        v.push(d);
    }
    return v;
}

function DEF(input, word) {
    return new RegExp(`((?:^[\\t ]*'.*$(?:\\r\\n|\\n))*)^[^'\\n\\r]*^[\\t ]*((?:(?:(?:(?:Private[\\t ]+|Public[\\t ]+)?(?:Class|Function|Sub|Property[\\t ][GLS]et)))[\\t ]+)(\\b${word}\\b).*)$`, "im").exec(input);
}
exports.DEF = DEF;

function DEFVAR(input, word) {
    return new RegExp(`((?:^[\\t ]*'.*$(?:\\r\\n|\\n))*)^[^'\\n\\r]*^[\\t ]*((?:(?:Const|Dim|(?:Private|Private)(?![\\t ]+(?:Sub|Function)))[\\t ]+)[\\w\\t ,]*(\\b${word}\\b).*)$`, "im").exec(input);
}
exports.DEFVAR = DEFVAR;

function PARAM_SUMMARY(input, word) {
    return new RegExp(`'''\\s*<param name=["']${word}["']>(.*)<\\/param>`, "i").exec(input);
}
exports.PARAM_SUMMARY = PARAM_SUMMARY;

exports.COMMENT_SUMMARY = /(?:'''\s*<summary>|'\s*)([^<\n\r]*)(?:<\/summary>)?/i;
