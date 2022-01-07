"use strict";

Object.defineProperty(exports, "__esModule", { value: true });

const vscode   = require("vscode");
const common   = require("./common");


function provideDefinition(doc, position) {
    const res = common.getWordInclude(doc, position, true);       if (res) return res;

    const wordRange = doc.getWordRangeAtPosition(position);
    const word = wordRange ? doc.getText(wordRange).toLowerCase() : "";
    
    const T = common.Types,  files = common.parseDoc(doc, [T.procedure, T.variable, T.constant, T.define]);

    for (const [name, file] of Object.entries(files)) {
        for (const item of Object.values(file.items)) {
            if (word in item) return new vscode.Location(vscode.Uri.file(name), item[word].range);
        }
    }

    return null;
}

exports.default = () => vscode.languages.registerDefinitionProvider({ scheme: "file", language: "pos" }, { provideDefinition });
