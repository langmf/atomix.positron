"use strict";

const vscode  = require("vscode");
const root    = require("./root");
const common  = require("./common");


async function provideReferences(doc, position, context) {
    const result = [],   editor = vscode.window.activeTextEditor;
    const word = (!editor?.selection.isEmpty ? doc.getText(editor.selection) : common.getWordRange(doc, position)).toLowerCase();
    
    if (!word) return null;

    const main = (root.config.smartParentIncludes ? root.getMain(doc) : 0) || doc.fileName;

    for (const name of common.getDocs(main)) {
        const iDoc = await vscode.workspace.openTextDocument(vscode.Uri.file(name));
        const sz = word.length,  text = iDoc.getText().toLowerCase();        let i = -1;

        while ((i = text.indexOf(word, i + 1)) !== -1) {
            const range = new vscode.Range(iDoc.positionAt(i), iDoc.positionAt(i + sz));
            result.push(new vscode.Location(vscode.Uri.file(name), range));
        }
    }

    return result.length ? result : null;
}


exports.default = () => vscode.languages.registerReferenceProvider({ scheme: "file", language: "pos" }, { provideReferences } );
