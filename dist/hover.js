"use strict";

Object.defineProperty(exports, "__esModule", { value: true });

const vscode   = require("vscode");
const Includes = require("./includes");
const PAT      = require("./patterns");

function GetHover(docText, lookup, scope) {
    const results = [];
    let matches = PAT.DEF(docText, lookup);
    if (matches) {
        if (matches[1]) {
            const summary = PAT.COMMENT_SUMMARY.exec(matches[1]);
            if (summary[1])
                results.push(new vscode.Hover({ language: "pos", value: `${matches[2]} ' [${scope}]\n' ${summary[1]}` }));
            else
                results.push(new vscode.Hover({ language: "pos", value: `${matches[2]} ' [${scope}]` }));
        }
        else
            results.push(new vscode.Hover({ language: "pos", value: `${matches[2]} ' [${scope}]` }));
    }
    matches = PAT.DEFVAR(docText, lookup);
    if (matches) {
        if (matches[1]) {
            const summary = PAT.COMMENT_SUMMARY.exec(matches[1]);
            if (summary[1])
                results.push(new vscode.Hover({ language: "pos", value: `${matches[2]} ' [${scope}]\n' ${summary[1]}` }));
            else
                results.push(new vscode.Hover({ language: "pos", value: `${matches[2]} ' [${scope}]` }));
        }
        else
            results.push(new vscode.Hover({ language: "pos", value: `${matches[2]} ' [${scope}]` }));
    }
    return results;
}


function GetParamHover(text, lookup) {
    var _a;
    const hovers = [];
    let matches;
    while (matches = PAT.PROC.exec(text))
        (_a = matches[6]) === null || _a === void 0 ? void 0 : _a.split(",").filter(p => p.trim() === lookup).forEach(() => {
            hovers.push(new vscode.Hover({ language: "pos", value: `${lookup} ' [Parameter]` }));
        });
    if (hovers.length > 0)
        return [hovers[hovers.length - 1]];
    else
        return [];
}


function provideHover(doc, position) {
    const wordRange = doc.getWordRangeAtPosition(position);
    const word = wordRange ? doc.getText(wordRange) : "";
    const line = doc.lineAt(position).text;
    const hoverresults = [];
    if (word.trim() === "")
        return null;
    if (!new RegExp(`^[^']*${word}`).test(line))
        return null;
    let count = 0;
    for (let i = 0; i < position.character; i++)
        if (line[i] === '"')
            count++;
    if (count % 2 === 1)
        return null;
    hoverresults.push(...GetHover(doc.getText(), word, "Local"));
    for (const ExtraDocText of Includes.getImportsWithLocal(doc))
        hoverresults.push(...GetHover(ExtraDocText[1].Content, word, ExtraDocText[0]));
    hoverresults.push(...GetParamHover(doc.getText(new vscode.Range(new vscode.Position(0, 0), new vscode.Position(position.line + 1, 0))), word));
    if (hoverresults.length > 0)
        return hoverresults[0];
    else
        return null;
}

exports.default = vscode.languages.registerHoverProvider({ scheme: "file", language: "pos" }, { provideHover });
