"use strict";

Object.defineProperty(exports, "__esModule", { value: true });

const vscode = require("vscode");
const cache  = require("./cache");
const PAT    = require("./patterns");

const tokenT = [ 'comment', 'string', 'keyword', 'number', 'regexp', 'operator', 'namespace', 'type', 'struct', 'class', 'interface',
                 'enum', 'typeParameter', 'function', 'method', 'decorator', 'macro', 'variable', 'parameter', 'property', 'label' ];
const tokenM = [ 'declaration', 'documentation', 'readonly', 'static', 'abstract', 'deprecated', 'modification', 'async' ];
const legend = new vscode.SemanticTokensLegend(tokenT, tokenM);

    
function provideDocumentSemanticTokens(doc) {
    return vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider', doc.uri).then(symbols => {
        console.time("provider_SemanticTokens");
        
        const cfg = vscode.workspace.getConfiguration("pos"),  SYM = cache.get(doc).symbols,  dev = SYM.$.device;

        const text = doc.getText(),  tokens = new vscode.SemanticTokensBuilder(legend);

        const newToken = function(name, match) {
            tokens.push(new vscode.Range(doc.positionAt(match.index), doc.positionAt(match.index + match[0].length)), name);
        }
        
        for (const item of Object.values(SYM.list.$).filter(value => value._items)) {
            if (item.kind === vscode.SymbolKind.Function) {
                for (const match of PAT.WORDS(text, item._items)) newToken('function', match);
            }
        }
        
        if (dev.regs) for (const match of PAT.WORDS(text, dev.regs)) newToken('string', match);

        if (dev.defs) for (const match of PAT.WORDS(text, dev.defs)) newToken('string', match);
        
        if (dev.ok) {
            const m = dev.match,  ofs = m.index + m[0].length - m[2].length;
            tokens.push(new vscode.Range(doc.positionAt(ofs), doc.positionAt(ofs + m[2].length)), 'function');
        }
        
        //for (let i=0;i<21;i++) tokens.push(doc.lineAt(i).range, tokenT[i]);
    
        const result = tokens.build();
        
        console.timeEnd("provider_SemanticTokens");
        
        return result;
    });
}

exports.default = vscode.languages.registerDocumentSemanticTokensProvider({ scheme: "file", language: "pos" }, { provideDocumentSemanticTokens }, legend);