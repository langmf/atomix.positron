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


function parseSemantic(doc, tokens, data) {
    const text = doc.getText();
    
    for (const value of data) {
        const words = value.words || [];

        if (value.mask) {
            const files = common.parseDoc(doc, value.mask);
            for (const file of Object.values(files)) {
                for (const type of Object.values(file.types)) words.push(...Object.keys(type.$items));
            } 
        }

        for (const m of PAT.WORDS(text, words, value.prefix || "")) {
            tokens.push(new vscode.Range(doc.positionAt(m.index), doc.positionAt(m.index + m[0].length)), value.token);
        }
    }
}


async function provideDocumentSemanticTokens(doc) {
    await vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider', doc.uri);
    
    if (common.config("smartParentIncludes")) {
        const prt = cache.get(doc).$.parent;
        if (prt) await vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider', vscode.Uri.file(prt));
    }

    const tid = "Semantic_" + doc.uri.fsPath.split("\\").pop();
    console.time(tid);
    
    const tokens = new vscode.SemanticTokensBuilder(legend);

    const T = common.Types,  SYM = cache.get(doc).symbols,  dev = SYM.$.device;

    parseSemantic(doc, tokens, [
        { token: 'function',  mask:  [T.procedure, T.label]              },
        { token: 'enum',      mask:  [T.define],     prefix: PAT.PRF_DEF },
        { token: 'string',    mask:  [T.$regs, T.$bits]                  }
    ]);

    if (dev.ok) {
        const m = dev.match,  ofs = m.index + m[0].length - m[2].length;
        tokens.push(new vscode.Range(doc.positionAt(ofs), doc.positionAt(ofs + m[2].length)), 'function');
    }

    const result = tokens.build();
    console.timeEnd(tid);
    return result;
}

exports.default = () => vscode.languages.registerDocumentSemanticTokensProvider({ scheme: "file", language: "pos" }, { provideDocumentSemanticTokens }, legend);