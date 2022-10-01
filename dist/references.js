"use strict";

const vscode  = require("vscode");
const root    = require("./root");
const common  = require("./common");


async function provideReferences(doc, position, context) {
    const result = [],   editor = vscode.window.activeTextEditor,   isWhole = editor?.selection.isEmpty;
    const word = (!isWhole ? doc.getText(editor.selection) : common.getWordRange(doc, position)).toLowerCase();
    
    if (!word) return null;

    const main = (root.config.smartParentIncludes ? root.getMain(doc) : 0) || doc.fileName;

    for (const name of common.getDocs(main)) {
        const uri = vscode.Uri.file(name),   iDoc = await vscode.workspace.openTextDocument(uri);
        
        if (isWhole) {
            const text = iDoc.getText(),  sz = word.length,  rxp = new RegExp('\\b' + word + '\\b', 'ig');        let m;
            
            while ((m = rxp.exec(text)) !== null)
            {
                result.push(new vscode.Location(uri, new vscode.Range(iDoc.positionAt(m.index), iDoc.positionAt(m.index + sz))));
            }
        } else {
            const text = iDoc.getText().toLowerCase(),  sz = word.length;        let i = -1;

            while ((i = text.indexOf(word, i + 1)) !== -1)
            {
                result.push(new vscode.Location(uri, new vscode.Range(iDoc.positionAt(i), iDoc.positionAt(i + sz))));
            }
        }
    }

    return result.length ? result : null;
}


exports.default = () => vscode.languages.registerReferenceProvider({ scheme: "file", language: "pos" }, { provideReferences } );
