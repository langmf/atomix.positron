"use strict";

Object.defineProperty(exports, "__esModule", { value: true });

const vscode  = require("vscode");
const common  = require("./common");
const cache   = require("./cache");
const PAT     = require("./patterns");


const tokenT  = [ 'namespace', 'class', 'enum', 'interface', 'struct', 'typeParameter', 'type', 'parameter', 'variable',
                  'property', 'enumMember', 'decorator', 'event', 'function', 'method', 'macro', 'label', 'comment',
                  'string', 'keyword', 'number', 'regexp', 'operator' ];
const tokenM  = [ 'declaration', 'definition', 'readonly', 'static', 'deprecated', 'abstract', 'async', 'modification', 
                  'documentation', 'defaultLibrary' ];
const legend  = new vscode.SemanticTokensLegend(tokenT, tokenM);


let testColor_once = 0;
function testColor() {
    if (!testColor_once) {
        vscode.window.activeTextEditor.edit(edit => {
            for (let t=0; t < tokenT.length; t++) {
                for (let m=0; m < tokenM.length; m++) edit.insert(new vscode.Position(0, 0), tokenT[t] + " - " + tokenM[m] + "\r\n");
            }
        });
        testColor_once = 1;
    }
    let l=0;
    for (let t=0; t < tokenT.length; t++) {
        for (let m=0; m < tokenM.length; m++) {
            tokens.push(doc.lineAt(l).range, tokenT[t], [tokenM[m]]);       l++;
        }
    }
}


function provideDocumentSemanticTokens(doc) {
    return vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider', doc.uri).then(symbols => {
        const tid = "Semantic_" + doc.uri.fsPath.split("\\").pop();
        console.time(tid);
        
        const T = common.Types,  SYM = cache.get(doc).symbols,  dev = SYM.$.device;
        
        const tokens = new vscode.SemanticTokensBuilder(legend);

        const newToken = function(m, name, modif){ tokens.push(new vscode.Range(doc.positionAt(m.index), doc.positionAt(m.index + m[0].length)), name, modif); }

        for (const match of common.parseSemantic(doc, [T.procedure, T.label]))      newToken(match, 'function');

        for (const match of common.parseSemantic(doc, [T.define], PAT.PRF_DEF))     newToken(match, 'enum');

        if (dev.sems)   for (const match of PAT.WORDS(doc.getText(), dev.sems))     newToken(match, 'string');

        if (dev.ok) {
            const m = dev.match,  ofs = m.index + m[0].length - m[2].length;
            tokens.push(new vscode.Range(doc.positionAt(ofs), doc.positionAt(ofs + m[2].length)), 'function');
        }
      
        //testColor();
    
        const result = tokens.build();
        console.timeEnd(tid);
        return result;
    });
}

exports.default = vscode.languages.registerDocumentSemanticTokensProvider({ scheme: "file", language: "pos" }, { provideDocumentSemanticTokens }, legend);