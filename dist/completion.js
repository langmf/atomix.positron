"use strict";

const vscode  = require("vscode");
const root    = require("./root");
const common  = require("./common");


function provideCompletionItems(doc, position) {
    if (common.failRange(doc, position)) return [];

    const tid = "com_" + doc.uri.fsPath.split("\\").pop();
    if (root.debug) console.time(tid);

    const result = common.getCompletions(doc);
    const files  = common.parseDoc(doc);
    
    for (const file of Object.values(files)) {
        for (const type of Object.values(file.types)) {
            const kind  = common.Enums[type.$type].com || 0,    description = `[ ${file.scope} ]`;
            
            for (const v of Object.values(type.$items)) {
                result.push(new vscode.CompletionItem({ label: v.name,  description }, kind));
            }
        }
    }

    if (root.debug) console.timeEnd(tid);
    
    return result;
}

exports.default = () => vscode.languages.registerCompletionItemProvider({ scheme: "file", language: "pos" }, { provideCompletionItems });
