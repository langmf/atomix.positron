"use strict";

Object.defineProperty(exports, "__esModule", { value: true });

exports.PROC     = /((?:^[\t ]*'+.*$(?:\r\n|\n))*)^[\t ]*((Proc|Sub)[\t ]+([\w\u0400-\u04FF]+)[\t ]*(?:\((.*)\))?)/im;
exports.VAR      = /(?<!'\s*)(?:^|:)[\t ]*(Static[\t ]+Dim|Dim)[\t ]+([\w\u0400-\u04FF]+)[\t ]*.*(?:$|:)/im;
exports.DECLARE  = /(?<!'\s*)(?:^|:)[\t ]*(Declare)[\t ]+([\w\u0400-\u04FF]+)/i;
exports.SYMBOL   = /(?<!'\s*)(?:^|:)[\t ]*(Symbol)[\t ]+([\w\u0400-\u04FF]+)/i;
exports.DEVICE   = /(?<!'\s*)(?:^|:)[\t ]*(Device)[\t ]+([\w\u0400-\u04FF]+)/i;
exports.DEFINE   = /(?<!'\s*)(?:^|:)[\t ]*\$(Define|Defeval)[\t ]+([\w\u0400-\u04FF]+)/i;
exports.INCLUDE  = /(?<!'\s*)(?:^|:)[\t ]*(Include)[\t ]+"([^\"]+)"/i;
exports.LABEL    = /(?<!'\s*)(?:^|:)[\t ]*([\w\u0400-\u04FF]+):(?=[\s;']|$)/igm;

exports.REG      = /^\[REGSTART\]([\s\S]+)^\[REGEND\]/im;
exports.EQU      = /^([\w\u0400-\u04FF]+)[\t ]+EQU[\t ]+(.*)$/igm;

exports.ENDPROC = (/(?:^|:)[\t ]*(EndSub|EndProc)/im);
exports.ARRAYBRACKETS = /\(\s*\d*\s*\)/;

exports.COLOR = /\b(Black|Blue|Cyan|Green|Magenta|Red|White|Yellow)\b|\b(RGB[\t ]*\([\t ]*((\$|0x)[0-9a-f]+|\d+)[\t ]*,[\t ]*((\$|0x)[0-9a-f]+|\d+)[\t ]*,[\t ]*((\$|0x)[0-9a-f]+|\d+)[\t ]*\))|((\$|0x)[0-9a-f]{6}\b)/ig;
