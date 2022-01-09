"use strict";

Object.defineProperty(exports, "__esModule", { value: true });

const vscode   = require("vscode");
const common   = require("./common");


function provideCompletionItems(doc, position) {
    if (common.failRange(doc, position)) return [];

    const tid = "Completion_" + doc.uri.fsPath.split("\\").pop();
    console.time(tid);
    
    const result = [];

    const files = common.parseDoc(doc, common.Types.$("main,dev"));
    
    for (const file of Object.values(files)) {

        for (const type of Object.values(file.types)) {
            const kind  = common.Enums[type.$type]?.com || 0;
            const descr = type.$type[0] === '$' ? null : `[${file.scope}]`;
            
            for (const v of Object.values(type.$items)) {
                result.push(new vscode.CompletionItem({label: v.name,  description: descr || v.text}, kind));
            }
        }
    }

    console.timeEnd(tid);
    return result;
}

exports.default = () => vscode.languages.registerCompletionItemProvider({ scheme: "file", language: "pos" }, { provideCompletionItems }, ".");
