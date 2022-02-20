"use strict";

const vscode = require("vscode");
const root   = require("./root");
const DTB    = require("./database");


const newColors = (rep = {})  => { 
    const obj = {

    'Comment_Line':         {  enable:1,    foreground: "#0000A0",      fontStyle: "italic",        scope:"comment_line.pos"     },
    'Comment_Block':        {  enable:1,    foreground: "#0000A0",      fontStyle: "italic",        scope:"comment_block.pos"    },
    'String':               {  enable:1,    foreground: "#009000",      fontStyle: "",              scope:"string_quoted.pos"    },
    
    'Number':               {  enable:1,    foreground: "#DC0000",      fontStyle: "",              scope:"numeric_base.pos"     },
    'Number_Binary':        {  enable:1,    foreground: "#C00000",      fontStyle: "",              scope:"numeric_bin.pos"      },
    'Number_Hex':           {  enable:1,    foreground: "#C00000",      fontStyle: "",              scope:"numeric_hex.pos"      },

    'Operator':             {  enable:1,    foreground: "#000000",      fontStyle: "",              scope:"operator_base.pos"    },
    'Operator_Math':        {  enable:1,    foreground: "#000000",      fontStyle: "",              scope:"operator_math.pos"    },
    'Operator_Logic':       {  enable:1,    foreground: "#000000",      fontStyle: "",              scope:"operator_logic.pos"   },

    'Bracket_Round':        {  enable:1,    foreground: "#000000",      fontStyle: "",              scope:"bracket_round.pos"    },
    'Bracket_Square':       {  enable:1,    foreground: "#000000",      fontStyle: "",              scope:"bracket_square.pos"   },
    'Bracket_Curly':        {  enable:1,    foreground: "#000000",      fontStyle: "",              scope:"bracket_curly.pos"    },

    'Device':               {  enable:1,    foreground: "#0000B0",      fontStyle: "bold",          token:"pos_device"           },
    'Define':               {  enable:1,    foreground: "#000000",      fontStyle: "bold",          token:"pos_define"           },
    'Symbol':               {  enable:1,    foreground: "#000000",      fontStyle: "",              token:"pos_symbol"           },
    'Label':                {  enable:1,    foreground: "#000000",      fontStyle: "",              token:"pos_label"            },
    'Procedure':            {  enable:1,    foreground: "#000000",      fontStyle: "bold",          token:"pos_procedure"        },
    'Variable':             {  enable:1,    foreground: "#000000",      fontStyle: "",              token:"pos_variable"         },
    'SFR':                  {  enable:1,    foreground: "#009000",      fontStyle: "",              token:"pos_devregs"          },
    'SFR_Bitname':          {  enable:1,    foreground: "#009000",      fontStyle: "",              token:"pos_devbits"          },

    };
    return repColors(obj, rep);
}

const def_Record = {
    'light'            :    {  enable:1,    foreground: "#000000",   fontStyle:""  },
    'dark'             :    {  enable:1,    foreground: "#D0D0D0",   fontStyle:""  },
    'highcontrast'     :    {  enable:1,    foreground: "#D0D0D0",   fontStyle:""  }
}

const rep_Dark = {
    'Number':               {  foreground: "#FF69B4"  },
    'Number_.*':            {  foreground: "#DB7093"  },
    'Symbol':               {  foreground: "#00CED1"  },
    'Comment.+':            {  foreground: "#5C6370"  },
    'String|SFR.*':         {  foreground: "#98C379"  },
    'Device':               {  foreground: "#87CEFA"  },
    'Label':                {  foreground: "#61AFEF"  },
    'Procedure':            {  foreground: "#00BFFF",  fontStyle: ""  },
    'Define':               {  foreground: "#DEB887",  fontStyle: ""  },
    '*black':               [  "#000000",  "#D0D0D0"  ]
}

const def_Header =
`
'*******************************************************************
'  Name     :  UNTITLED                                            *
'  Author   :                                                      *
'  Notice   :  Copyright (c) <%year%>                                  *
'  Date     :  <%date%> <%time%>                                 *
'  Version  :  1.0                                                 *
'*******************************************************************
`;

const def_Editor = {
    "fontFamily": {
        name: 'Font Family',        enum: ['Arial', 'Calibri', 'Segoe UI', 'Consolas', 'Lucida Console', 'Courier New', 'monospace']
    },
    "fontSize": {
        name: 'Font Size',          enum: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 22, 24]
    },
    "minimap.enabled": {
        name: 'Mini Map',           enum: [true, false]
    },
    "guides.indentation": {
        name: 'Line Indentation',   enum: [true, false]
    },
    "quickSuggestions": {
        name: 'Quick Suggestions',  enum: [false]
    }
}


exports.cache = {};


function repColors(obj, rep) {
    const keys = Object.keys(obj).join("\n");
    
    for (const [k,s] of Object.entries(rep)) {
        const rxp = new RegExp(k[0] === '*' ? '.+' : `\\b(${k})\\b`, 'ig'),   mts = [...keys.matchAll(rxp)];

        for (const i of mts) {
            const x = obj[i[0]];
            if (Array.isArray(s)) {  if (x.foreground === s[0]) x.foreground = s[1];   }
            else                  {  for (const [n,v] of Object.entries(s)) x[n] = v;  }
        }
    }

    return obj;
}


function parseThemes(themes) {
    const db_themes = DTB.db.default.themes,   db_types = DTB.db.types;
    
    const tmp_Theme = Object.keys(db_types).reduce((a,v) => (a[v] = {}) && a, {});

    for (const [name, theme] of Object.entries(themes)) {
        const db_theme = Object.assign({}, tmp_Theme, db_themes[name] || (name === 'highcontrast' && db_themes['dark']));

        for (const [type, value] of Object.entries(db_theme)) {
            const def_Token = type in db_types ? { token: DTB.prefix + type.toLowerCase() } : null;
            theme[type] = Object.assign({}, def_Record[name], theme[type], value, def_Token);
        }
    }

    return themes;
}


exports.getThemeStyle = (keys) => {
    const styles = exports.cache.themes[vscode.ColorThemeKind[vscode.window.activeColorTheme.kind].toLowerCase()] || {};
    if (keys) Object.entries(styles).map(([k,v]) => keys[v.token] = keys[v.scope] = k);
    return styles;
}


function Settings_Header(value) {
    if (typeof value.header !== 'object') value.header = {};
    if (!value.header.text)   value.header.text = def_Header.replace(/^[\r\n]+/,'');
    if (typeof value.header.enable === 'undefined') value.header.enable = true;
}


function Settings_Editor(value) {
    value.editor = Object.assign({},  def_Editor,  value.editor);
}


function Update_Editor(value) {
    const config = vscode.workspace.getConfiguration(),   cfg_pos = config.get('[pos]');

    const isNumeric = (num) => (typeof(num) === 'number' || typeof(num) === "string" && num.trim() !== '') && !isNaN(num);

    for (const [k,i] of Object.entries(value.editor)) {
        const key = 'editor.' + k;

        if (typeof i !== 'object') { delete value.editor[k];    cfg_pos[key] = undefined;    continue; }

        let v = (i.value || '').replace(/^--.+?--$/, '');
        
        if (isNumeric(v))                   v = Number(v);
        else if (/^true|false$/i.test(v))   v = v.toLowerCase() == 'true';
        else if (/^[\t ]*{/i.test(v))       try { v = JSON.parse(v); }catch{}

        cfg_pos[key] =  (v == null || v === '') ? undefined : v;
    }

    config.update('[pos]', cfg_pos, vscode.ConfigurationTarget.Global);
}


function Settings_Highlight(value) {
    const def_Themes = parseThemes({
        'light'            : newColors(),
        'dark'             : newColors(rep_Dark),
        'highcontrast'     : newColors(rep_Dark)
    });

    if (typeof value.themes !== 'object') value.themes = {};
    if (typeof value.titles !== 'object') value.titles = {};
    
    const keys = Object.keys(def_Themes['light']);
    for (const k of Object.keys(value.titles)) if (!keys.includes(k)) delete value.titles[k];

    for (const [name, list] of Object.entries(def_Themes)) {
        const theme = Object.assign({}, value.themes[name]),   valid = Object.keys(list);

        for (const type of Object.keys(theme)) if (!valid.includes(type)) delete theme[type];

        for (const [type, rec] of Object.entries(list)) {
            theme[type] = (!(type in theme) || !theme[type].change) ? rec : Object.assign({}, theme[type]);
        }

        value.themes[name] = theme;
    }
}


function Update_Highlight(value) {
    const textMateRules = [],  rules = {},  config = vscode.workspace.getConfiguration(); 
    const colors = value.themes[vscode.ColorThemeKind[vscode.window.activeColorTheme.kind].toLowerCase()] || {};

    for (const rec of Object.values(colors)) {
        if (!rec.enable) continue;
        const {token, scope, foreground, fontStyle} = rec;
        if (scope) textMateRules.push({ scope,  settings: { foreground, fontStyle } });
        if (token) rules[token] = { foreground, fontStyle };
    }
    
    const tcc_tm = config.get('editor.tokenColorCustomizations');               tcc_tm['[*]'] = { textMateRules };
    const tcc_tk = config.get('editor.semanticTokenColorCustomizations');       tcc_tk['[*]'] = { rules         };

    config.update('editor.tokenColorCustomizations',         tcc_tm, vscode.ConfigurationTarget.Global);
    config.update('editor.semanticTokenColorCustomizations', tcc_tk, vscode.ConfigurationTarget.Global);
}


exports.Settings = (value) => {
    const isSave = value ? true : false;
    
    value = Object.assign({},   root.context.globalState.get('USER'),   value);
    
    Settings_Header(value);
    Settings_Editor(value);
    Settings_Highlight(value);

    exports.cache = value;

    return isSave ? exports.Update(value) : value;
}


exports.Update = (value) => {
    if (value === null) root.context.globalState.update('USER', undefined);
    
    value = value || exports.Settings();

    Update_Editor(value);
    Update_Highlight(value);

    exports.cache = value;

    root.context.globalState.update('USER', value);          //root.context.globalState.setKeysForSync('HLT');

    return true;
}


exports.Import = async () => {
    const options = {filters: { 'JSON files':['json'], 'All files':['*'] },   defaultUri:vscode.Uri.file("user")};
    
    const file = await vscode.window.showOpenDialog(options);
    
    if (file && file[0]) {
        const res = root.JsonFromFile(file[0].fsPath, (e) => vscode.window.showErrorMessage(`Settings Import -> ${e}`));
        if (res) return exports.Settings(res);
    }
}


exports.Export = async () => {
    const options = {filters: { 'JSON files':['json'], 'All files':['*'] },   defaultUri:vscode.Uri.file("user")};
    
    const file = await vscode.window.showSaveDialog(options);
    
    if (file) {
        root.JsonToFile(exports.Settings(), file.fsPath, (e) => vscode.window.showErrorMessage(`Settings Export -> ${e}`));
    }
}


exports.Init = () => exports.Update();