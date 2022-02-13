"use strict";

const RXP     = {
    cache:      {},
    prefix:     '(?<![#$\\w])',
    postfix:    '(?![#$\\w])',
    types:
    {
        'String':               {   id: 'S',      pat: "\"[^\"]*\""                                                     },
        'Comment_Line':         {   id: 'CL',     pat: "[';].*$"                                                        },
        'Comment_Block':        {   id: 'CB',     pat: "\\(\\*[\\s\\S]*?\\*\\)"                                         },

        'Number':               {   id: 'N',      pat: "(?<![#\\w\\d\0])-?(\\d+\\.?\\d*|\\.\\d+)(e(-|\\+)?\\d+)?\\b"    },
        'Number_Binary':        {   id: 'NB',     pat: "(?<![#\\w\\d])%\\d+\\b"                                         },
        'Number_Hex':           {   id: 'NH',     pat: "(?<![#\\w\\d])(0|0x|\\$)[0-9a-f]+\\b"                           },

        'Operator':             {   id: 'O',      pat: "[=<>?]"                                                         },
        'Operator_Math':        {   id: 'OM',     pat: "[-+*/]"                                                         },
        'Operator_Logic':       {   id: 'OL',     pat: "[&^|~@]|<<|>>"                                                  },

        'Bracket_Round':        {   id: 'BR',     pat: "[()]"                                                           },
        'Bracket_Square':       {   id: 'BS',     pat: "[\\[\\]]"                                                       },
        'Bracket_Curly':        {   id: 'BC',     pat: "[{}]"                                                           }
    },

    patterns(mask, grp)
    {
        grp = !!grp;
        const x = (mask || '') + '\0' + grp;        if (x in this.cache) return this.cache[x];
        const out = [],  rxp = new RegExp(mask || '');
        for (const [k,v] of Object.entries(this.types)) if (rxp.test(k)) out.push(!grp ? v.pat : `(?<${v.id}>${v.pat})`);
        return this.cache[x] = out.length ? out.join('|') : '';
    }
}


function newRXP(rxp) {
    return (rxp.matchAll = s => (s || "").matchAll(RegExp(rxp.source, 'igm')),   rxp);
}


function parseWords(words) {
    return (Array.isArray(words) ? words.join("|") : typeof words === 'object' ? Object.keys(words).join("|") : words) || '';
}


exports.RXP     = RXP;
exports.EQU     = newRXP(/^(\w+)[\t ]+EQU[\t ]+(.*)$/im);
exports.DEF     = newRXP(/^\$define[\t ]+([a-z][\w]*)[\t ]+(.*)$/im);


exports.ALL     = (words, pat = null) =>
{
    words = parseWords(words || '');         if (words) words = `${RXP.prefix}(?<words>${words})${RXP.postfix}`;
    pat = pat === null ? words : RXP.patterns(pat || '', true) + (words ? '|': '') + words;
    return new RegExp(pat, 'igm');
}


exports.WORDS   = (input, words, pre = RXP.prefix, post = RXP.postfix) =>
{
    words = parseWords(words);         if (!words) return [];
    let m,  v = [],  rxp = new RegExp(RXP.patterns('^[SC]') + `|${pre}(${words})${post}`, 'igm');
    while ((m = rxp.exec(input)) !== null) if (m[1]) v.push(m);
    return v;
}


exports.PPI = (input, name, res = '') =>
{
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


exports.INI = (input, name, res) =>
{
    let rep,  rxp = new RegExp(`(?<=^|[\\r\\n])\\[${name}\\][\r\n]+([\\s\\S]+?[\\r\\n]*)(?=\\[|$)`, 'i');
    
    if (typeof res === 'object')
    {
        const match = rxp.exec(input);
        if (match) {
            let m,  txt = match[1],  rxp = new RegExp('^(.+?)[\\t ]*=[\\t ]*(\\w+)', 'igm');
            while ((m = rxp.exec(txt)) !== null) res[m[1]] = parseInt(m[2]);
        }
        return res;
    }
    else if (typeof res === 'string')
    {
        input = input.replace(rxp, function(){ rep = true;   return res; });
        if (!rep) input += res;
        return input;
    }
    return rxp;
}
