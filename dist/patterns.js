"use strict";

Object.defineProperty(exports, "__esModule", { value: true });


exports.DEVICE   = newRXP(/(?<!'\s*)(?:^|:)[\t ]*(Device|\d* *LIST +P)(?: +=)?[\t ]+([\w\u0400-\u04FF]+)/im);

exports.REG      = newRXP(/^\[REGSTART\]([\s\S]+)^\[REGEND\]/im);
exports.EQU      = newRXP(/^([\w\u0400-\u04FF]+)[\t ]+EQU[\t ]+(.*)$/im);
exports.DEFS     = newRXP(/^\$Define[\t ]+([a-z][\w]+)[\t ]+(.*)$/im);

exports.WORDS    = getWords;

exports.PRF_DEF  = "(?<!\\$define[\\t ]+|\\$defeval[\\t ]+)";


function newRXP(rxp) {
    rxp.matchAll = s => (s || "").matchAll(RegExp(rxp.source, 'igm'));
    return rxp;
}

function getWords(input, words, prefix = "") {
    if (Array.isArray(words)) words = words.join("|"); else if (typeof words === 'object') words = Object.keys(words).join("|");
    
    if (!words) return [];
    
    let m,  v = [],  r = RegExp(`(?:"[^"]*")|[';].*$|\\(\\*[^\\*]*\\*\\)|${prefix}\\b(${words})\\b`, 'igm');
    while ((m = r.exec(input)) !== null) if (m[1]) v.push(m);
    
    return v;
}
