"use strict";

exports.EQU      = newRXP(/^(\w+)[\t ]+EQU[\t ]+(.*)$/im);
exports.DEF      = newRXP(/^\$define[\t ]+([a-z][\w]*)[\t ]+(.*)$/im);
exports.WORDS    = getWords;
exports.PPI      = getPPI;


function newRXP(rxp) {
    rxp.matchAll = s => (s || "").matchAll(RegExp(rxp.source, 'igm'));
    return rxp;
}

function getWords(input, words, pre =  '(?<![#$\\w])', post = '(?![#$\\w])') {
    if (Array.isArray(words)) words = words.join("|"); else if (typeof words === 'object') words = Object.keys(words).join("|");
    if (!words) return [];
    let m,  v = [], rxp = new RegExp(`(?:"[^"]*")|[';].*$|\\(\\*[^\\*]*\\*\\)|${pre}(${words})${post}`, 'igm');
    while ((m = rxp.exec(input)) !== null) if (m[1]) v.push(m);
    return v;
}

function getPPI(input, name, res = '') {
    if (input) {
        const match = RegExp(`^\\[${name}START\\]([\\s\\S]+)^\\[${name}END\\]`, 'im').exec(input);
        if (match) {
            if (typeof res !== 'object') return match[1];
            let m,  txt = match[1],  rxp = new RegExp('^(.+?)[\\t ]*=[\\t ]*(\\w+)', 'igm');
            while ((m = rxp.exec(txt)) !== null) res[m[1].toLowerCase()] = parseInt(m[2]);
        }
    }
    return res;
}