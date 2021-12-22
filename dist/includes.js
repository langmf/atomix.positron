"use strict";

Object.defineProperty(exports, "__esModule", { value: true });

const vscode = require("vscode");
const pathns = require("path");
const fs     = require("fs");
const PAT    = require("./patterns");

exports.Includes = new Map();

class IncludeFile {
    constructor(path) {
        let path2 = path;
        this.Content = "";
        
        if (!pathns.isAbsolute(path2)) path2 = pathns.join(vscode.workspace.workspaceFolders[0].uri.fsPath, path2);
        
        this.Uri = vscode.Uri.file(path2);
        
        if (fs.existsSync(path2) && fs.statSync(path2).isFile()) this.Content = fs.readFileSync(path2).toString();
    }
}


function reloadImportDocuments() {
    exports.includeDirs = vscode.workspace.getConfiguration("pos").get("includeDirs");
    
    const files = vscode.workspace.getConfiguration("pos").get("includeFiles");
    
    for (const key of exports.Includes.keys()) { 
        if (key.startsWith("Include")) exports.Includes.delete(key);
    }
    
    files === null || files === void 0 ? void 0 : files.forEach((file) => {
        exports.Includes.set(`Include ${pathns.basename(file)}`, new IncludeFile(file));
    });
}


function getImportsWithLocal(doc) {
    let match,  f;
    
    const complete = Array(),  result = [...exports.Includes],  rxp = new RegExp(PAT.INCLUDE.source, "ig");
    
    while ((match = rxp.exec(doc.getText())) !== null) {
        if (complete.indexOf(match[2].toLowerCase()) === -1) {
            for (const incDir of exports.includeDirs) {
                let d = incDir;
                if      (d === ".")  d = pathns.dirname(doc.uri.fsPath);
                else if (d === "..") d = pathns.dirname(pathns.dirname(doc.uri.fsPath));
                else if (d === "${workspaceFolder}") if (vscode.workspace.workspaceFolders) d = vscode.workspace.workspaceFolders[0].uri.fsPath;
                
                const path = pathns.resolve(d, match[2]);
                
                if (fs.existsSync(path) && ((f = fs.statSync(path)) === null || f === void 0 ? void 0 : f.isFile()))
                    result.push([ `Include Statement ${match[2]}`, new IncludeFile(path) ]);
            }
            
            complete.push(match[2].toLowerCase());
        }
    }
    return result;
}


exports.IncludeFile = IncludeFile;
exports.reloadImportDocuments = reloadImportDocuments;
exports.getImportsWithLocal = getImportsWithLocal;
