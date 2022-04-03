"use strict";

const vscode  = require("vscode");
const child   = require("child_process");
const path    = require("path");
const fs      = require("fs");
const root    = require("./root");
const common  = require("./common");
const plugins = require("./plugins");

const output  = vscode.window.createOutputChannel("Positron");

let _process, _statbar, _isRunning = false;


function checkFileOut(nFile) {
    try{  fs.accessSync(nFile, fs.constants.F_OK);   return true;  }catch(e){  output.appendLine(e.toString());  }
}


function checkFileMsg(nFile) {
    try{  fs.accessSync(nFile, fs.constants.F_OK);   return true;  }catch(e){ vscode.window.showErrorMessage(e.toString()); }
}


function getFName(fn = "") {
    return path.dirname(fn) + "\\" + path.parse(fn).name;
}


function cmdFile(fn = "") {
    const cmd = path.dirname(fn) + '\\programmer.cmd';         if (root.checkFile(cmd)) return cmd;
}


function runInit(clearOut = true) {
    if (!vscode.window.activeTextEditor) return;
    if (clearOut) output.clear();
    output.show(true);
    return true;
}


async function run(exe, arg = "", workDir, time) {
    if (_isRunning) { vscode.window.showInformationMessage("Program is already running!");     return; }
    
    try   {   fs.accessSync(exe, fs.constants.X_OK);   } catch {   vscode.window.showErrorMessage(`Can't be executed - ${exe}`);    return; }
    
    _isRunning = true;
    
    if (_statbar) _statbar.dispose();
    _statbar = vscode.window.setStatusBarMessage(`Running ${path.basename(exe)} ... `);
    
    const cmd = `"${exe}" ${arg}`,   startTime = new Date();

    output.appendLine("[Running]  " + cmd);
    
    exports.process = _process = child.spawn(cmd, [], {cwd: workDir, shell: true});
    
    _process.stdout.on("data", data => {  output.append(data.toString());  });
    _process.stderr.on("data", data => {  output.append(data.toString());  });

    _process.on("exit", code => {
        const endTime = new Date(),  elapsedTime = (endTime.getTime() - startTime.getTime()) / 1000;
        output.appendLine("[Done] exited with code=" + code + " in " + elapsedTime + " seconds");
        _statbar.dispose();
        _isRunning = false;
    });
    
    return new Promise( (resolve) => {
        const tmr = (time || 0) <= 0 ? 0 : setTimeout(() => resolve(_process.exitCode), time);
        _process.on('close', () => { clearTimeout(tmr);     resolve(_process.exitCode); });
    });
}


async function runCompile(one = true) {
    if (!runInit(one)) return;
    
    const cfg  = vscode.workspace.getConfiguration("pos"),   exe = cfg.get("main.compiler"),   doc = vscode.window.activeTextEditor.document;

    if (cfg.get("saveAllFilesBeforeRun") && !(await vscode.workspace.saveAll())) { vscode.window.showErrorMessage("All files can't be saved");     return; }
    if (cfg.get("saveFileBeforeRun")     && !(await doc.save()))                 { vscode.window.showErrorMessage("File can't be saved");          return; }
    
    const file = doc.fileName,  dir = path.dirname(file);
    
    const data = { action: 'compile',  one,  file,  dir,  exe,  arg: `"${file}"` };
    
    let res = await plugins.command(data, false) || await run(data.exe,  data.arg,  data.dir,  data.time);

    res     = await plugins.command(data, true)  || res;

    if (/^ +Program +Compiled +OK\./im.test(root.readFile(file, '', '.pbe'))) common.setVersion(doc);

    return res;
}


async function runProgram(one = true) {
    if (!runInit(one)) return;
    
    const cfg  = vscode.workspace.getConfiguration("pos"),   exe = cfg.get("main.programmer"),   doc = vscode.window.activeTextEditor.document;
    const fn   = getFName(doc.fileName);
    
    if (!checkFileOut(fn + ".pbe") || !checkFileOut(fn + ".hex")) return;
    
    const txt  = fs.readFileSync(fn + ".pbe"),   dev = (/^\d{2}\w+/i.exec(txt))?.[0],   hex = fn + ".hex";
    
    const arg  = cfg.get("main.programmerArgs")
                    .replace(/\$hex-filename\$/ig,      hex)
                    .replace(/\$target-device\$/ig,     dev)
                    .replace(/\$exe-path\$/ig,          path.dirname(exe));
    
    const file = doc.fileName,  dir = path.dirname(file),  cmd = cmdFile(file);
    
    const data = { action: 'program',  one,  file,  dir,  exe,  arg,  dev,  hex };

    let res = await plugins.command(data, false) || (!cmd ? await run(data.exe,      data.arg,  data.dir,  data.time) :
                                                            await run(cmd,  `${dev} "${hex}"`,  data.dir,  data.time) );

    return    await plugins.command(data, true)  || res;
}


async function runCombine() {
    output.clear();
    await runCompile(false);
    output.appendLine("");
    await runProgram(false);
}


function stopCompile() {
    _process === null || _process === void 0 ? void 0 : _process.kill();
    _statbar === null || _statbar === void 0 ? void 0 : _statbar.dispose();
    _isRunning = false;
}


async function runWait(fnc) {
    await fnc();         const cfg = vscode.workspace.getConfiguration("pos").output;
    setTimeout(function(){ if (cfg.DelayHide) vscode.commands.executeCommand("workbench.action.closePanel"); }, cfg.DelayHide);
}


async function viewFile(ext = "") {
    if (!vscode.window.activeTextEditor) return;
    
    let editor = vscode.window.activeTextEditor;
    let doc    = editor.document;
    let text   = (editor.selection && !editor.selection.isEmpty) ? doc.getText(editor.selection) : doc.lineAt(editor.selection.active.line).text.trim();

    const file = getFName(doc.fileName) + ext;        if (!checkFileMsg(file)) return;

    doc    = await vscode.workspace.openTextDocument(vscode.Uri.file(file));
    editor = await vscode.window.showTextDocument(doc, {viewColumn: vscode.ViewColumn[root.config.viewColumnASM] });

    const idx  = doc.getText().toLowerCase().indexOf(text.toLowerCase());           if (idx == -1) return;
    const pos1 = doc.positionAt(idx),   pos2 = doc.positionAt(idx + text.length),   range = new vscode.Range(pos1, pos2);
    
    editor.selections = [new vscode.Selection(pos1,pos2)];
    editor.revealRange(range);    
}


exports.register = () => {
    vscode.commands.registerCommand("pos.runCompile",   () => {    runWait(runCompile); });
    vscode.commands.registerCommand("pos.runProgram",   () => {    runWait(runProgram); });
    vscode.commands.registerCommand("pos.runCombine",   () => {    runWait(runCombine); });
    vscode.commands.registerCommand("pos.stopCompile",  () => {    stopCompile();       });
    vscode.commands.registerCommand("pos.viewAsm",      () => {    viewFile(".asm");    });
    vscode.commands.registerCommand("pos.viewLst",      () => {    viewFile(".lst");    });
};


exports.runCompile  = runCompile;
exports.runProgram  = runProgram;
exports.runCombine  = runCombine;
exports.stopCompile = stopCompile;
exports.viewFile    = viewFile;

exports.run         = run;
exports.output      = output;