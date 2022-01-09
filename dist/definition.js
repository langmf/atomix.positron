"use strict";

Object.defineProperty(exports, "__esModule", { value: true });

const vscode   = require("vscode");
const common   = require("./common");


function provideDefinition(doc, position) {
    const res = common.getWordInclude(doc, position, true);       if (res) return res;

    const wordRange = doc.getWordRangeAtPosition(position);
    const word = wordRange ? doc.getText(wordRange).toLowerCase() : "";
    
    const files = common.parseDoc(doc);

    for (const [name, file] of Object.entries(files)) {
        for (const type of Object.values(file.types)) {
            if (word in type.$items) return new vscode.Location(vscode.Uri.file(name), type.$items[word].range);
        }
    }

    return null;
}

exports.default = () => vscode.languages.registerDefinitionProvider({ scheme: "file", language: "pos" }, { provideDefinition });
