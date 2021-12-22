"use strict";

Object.defineProperty(exports, "__esModule", { value: true });


function newRXP(rxp) {
    rxp.matchAll = s => s.matchAll(RegExp(rxp.source, 'igm'));
    return rxp;
}

exports.PROC     = newRXP(/((?:^[\t ]*'+.*$(?:\r\n|\n))*)^[\t ]*((Proc|Sub)[\t ]+([\w\u0400-\u04FF]+)[\t ]*(?:\((.*)\))?)/im);
exports.VAR      = newRXP(/(?<!'\s*)(?:^|:)[\t ]*(Static[\t ]+Dim|Dim)[\t ]+([\w\u0400-\u04FF]+)[\t ]*.*(?:$|:)/im);
exports.DECLARE  = newRXP(/(?<!'\s*)(?:^|:)[\t ]*(Declare)[\t ]+([\w\u0400-\u04FF]+)/im);
exports.SYMBOL   = newRXP(/(?<!'\s*)(?:^|:)[\t ]*(Symbol)[\t ]+([\w\u0400-\u04FF]+)/im);
exports.DEVICE   = newRXP(/(?<!'\s*)(?:^|:)[\t ]*(Device)[\t ]+([\w\u0400-\u04FF]+)/im);
exports.DEFINE   = newRXP(/(?<!'\s*)(?:^|:)[\t ]*\$(Define|Defeval)[\t ]+([\w\u0400-\u04FF]+)/im);
exports.INCLUDE  = newRXP(/(?<!'\s*)(?:^|:)[\t ]*(Include)[\t ]+"([^\"]+)"/im);
exports.LABEL    = newRXP(/(?<!'\s*)(?:^|:)[\t ]*([\w\u0400-\u04FF]+):(?=[\s;']|$)/im);

exports.REG      = newRXP(/^\[REGSTART\]([\s\S]+)^\[REGEND\]/im);
exports.EQU      = newRXP(/^([\w\u0400-\u04FF]+)[\t ]+EQU[\t ]+(.*)$/im);

exports.ENDPROC  = newRXP(/(?:^|:)[\t ]*(EndSub|EndProc)/im);
exports.ARRBRAC  = newRXP(/\(\s*\d*\s*\)/);

exports.COLOR    = newRXP(/\b(Black|Blue|Cyan|Green|Magenta|Red|White|Yellow)\b|\b(RGB[\t ]*\([\t ]*((\$|0x)[0-9a-f]+|\d+)[\t ]*,[\t ]*((\$|0x)[0-9a-f]+|\d+)[\t ]*,[\t ]*((\$|0x)[0-9a-f]+|\d+)[\t ]*\))|((\$|0x)[0-9a-f]{6}\b)/im);


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
