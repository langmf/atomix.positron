"use strict";

const vscode   = require("vscode");
const common   = require("./common");


function provideDefinition(doc, position) {
    const res   = common.getWordInclude(doc, position, true);       if (res) return res;

    const word  = common.getWordRange(doc, position),   proc = common.getProc(doc, position);

    if (proc && (word in proc.members)) return new vscode.Location(doc.uri, proc.members[word].range);

    for (const [name, file] of Object.entries(common.parseDoc(doc))) {
        for (const type of Object.values(file.types)) {
            if (word in type.$items) return new vscode.Location(vscode.Uri.file(name), type.$items[word].range);
        }
    }

    return null;
}

exports.default = () => vscode.languages.registerDefinitionProvider({ scheme: "file", language: "pos" }, { provideDefinition });
