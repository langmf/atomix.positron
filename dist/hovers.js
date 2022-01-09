"use strict";

Object.defineProperty(exports, "__esModule", { value: true });

const vscode   = require("vscode");
const common   = require("./common");


function provideHover(doc, position) {
    if (common.failRange(doc, position)) return null;

    const wordRange = doc.getWordRangeAtPosition(position);
    const word = wordRange ? doc.getText(wordRange).toLowerCase() : "";
    
    const files = common.parseDoc(doc, common.Types.$("main,dev"));

    for (const file of Object.values(files)) {
        for (const type of Object.values(file.types)) {
            if (word in type.$items) {
                const descr = type.$type[0] === '$' ? '' : "\t' [" + (file.isLocal ? "Local" : file.scope) + "]";
                return new vscode.Hover({ language: "pos", value: type.$items[word].text + descr});
            }
        }
    }

    return null;
}


exports.default = () => vscode.languages.registerHoverProvider({ scheme: "file", language: "pos" }, { provideHover });
