"use strict";

Object.defineProperty(exports, "__esModule", { value: true });


exports.DEVICE   = newRXP(/(?<!'\s*)(?:^|:)[\t ]*(Device|\d* *LIST +P)(?: +=)?[\t ]+([\w\u0400-\u04FF]+)/im);

exports.REG      = newRXP(/^\[REGSTART\]([\s\S]+)^\[REGEND\]/im);
exports.EQU      = newRXP(/^([\w\u0400-\u04FF]+)[\t ]+EQU[\t ]+(.*)$/im);
exports.DEFS     = newRXP(/^\$Define[\t ]+([a-z][\w]+)[\t ]+(.*)$/im);

exports.ARRBRAC  = newRXP(/\(\s*\d*\s*\)/);

exports.COLOR    = newRXP(/\b(Black|Blue|Cyan|Green|Magenta|Red|White|Yellow)\b|\b(RGB[\t ]*\([\t ]*((\$|0x)[0-9a-f]+|\d+)[\t ]*,[\t ]*((\$|0x)[0-9a-f]+|\d+)[\t ]*,[\t ]*((\$|0x)[0-9a-f]+|\d+)[\t ]*\))|((\$|0x)[0-9a-f]{6}\b)/im);

exports.WORDS    = getWords;

exports.PRF_DEF  = "(?<!\\$define[\\t ]+|\\$defeval[\\t ]+)";


function newRXP(rxp) {
    rxp.matchAll = s => (s || "").matchAll(RegExp(rxp.source, 'igm'));
    return rxp;
}

function getWords(input, words, prefix = "") {
    if (Array.isArray(words)) words = words.join("|");
    else if (typeof words === 'object') words = Object.keys(words).join("|");
    if (!words) return [];
    let m,  v = [],  r = RegExp(`(?:"[^"]*")|[';].*$|\\(\\*[^\\*]*\\*\\)|${prefix}\\b(${words})\\b`, 'igm');
    while ((m = r.exec(input)) !== null) if (m[1]) v.push(m);
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
