"use strict";

Object.defineProperty(exports, "__esModule", { value: true });

const vscode   = require("vscode");
const common   = require("./common");


function provideHover(doc, position) {
    const wordRange = doc.getWordRangeAtPosition(position);
    const word = wordRange ? doc.getText(wordRange).toLowerCase() : "";
    
    const T = common.Types,  files = common.parseDoc(doc, [T.procedure, T.variable, T.constant, T.define]);

    for (const [name, file] of Object.entries(files)) {
        for (const item of Object.values(file)) {
            if (word in item) return new vscode.Hover({ language: "pos", value: item[word].text + `\t' [${name}]`});
        }
    }

    return null;
}


exports.default = vscode.languages.registerHoverProvider({ scheme: "file", language: "pos" }, { provideHover });
