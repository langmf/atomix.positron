"use strict";

Object.defineProperty(exports, "__esModule", { value: true });

const vscode  = require("vscode");
const child   = require("child_process");
const path    = require("path");
const fs      = require("fs");
const output  = vscode.window.createOutputChannel("Positron");

let _process, _statbar, _isRunning = false;


async function run(exe, arg = "", workDir) {
    if (_isRunning) { vscode.window.showInformationMessage("Positron is already running!");     return; }
    
    try   {   fs.accessSync(exe, fs.constants.X_OK);   } catch {   vscode.window.showErrorMessage(`Can't be executed - ${exe}`);    return; }
    
    _isRunning = true;
    
    if (_statbar) _statbar.dispose();
    _statbar = vscode.window.setStatusBarMessage("Running Positron ...");
    
    const cmd = `"${exe}" ${arg}`;
    output.appendLine("[Running]  " + cmd);
    
    const startTime = new Date();
    _process = child.spawn(cmd, [], {cwd: workDir, shell: true});
    
    _process.stdout.on("data", data => {
        output.append(data.toString());
    });
    _process.stderr.on("data", data => {
        output.append(data.toString());
    });
    _process.on("exit", code => {
        const endTime = new Date(),  elapsedTime = (endTime.getTime() - startTime.getTime()) / 1000;
        output.appendLine("[Done] exited with code=" + code + " in " + elapsedTime + " seconds");
        _statbar.dispose();
        _isRunning = false;
    });
    
    return new Promise( (resolve) => { _process.on('close', resolve) });
}

function checkFile(nFile, flags) {
    try {
        fs.accessSync(nFile, flags || (fs.constants.R_OK | fs.constants.W_OK));
        return true;
    } catch(e) { output.appendLine(e.toString()); }
}

function getFName(fn = "") {
    return path.dirname(fn) + "\\" + path.parse(fn).name;
}

function runInit(clearOut = true) {
    if (!vscode.window.activeTextEditor) return;
    if (clearOut) output.clear();
    output.show(true);
    return true;
}


async function runCompile(clearOut = true) {
    if (!runInit(clearOut)) return;
    
    const cfg = vscode.workspace.getConfiguration("pos");
    const exe = cfg.get("compiler");
    const doc = vscode.window.activeTextEditor.document;

    if (cfg.get("saveAllFilesBeforeRun") && !(await vscode.workspace.saveAll())) { vscode.window.showErrorMessage("All files can' be saved");     return; }
    if (cfg.get("saveFileBeforeRun")     && !(await doc.save()))                 { vscode.window.showErrorMessage("File can' be saved");          return; }
            
    return run(exe, `"${doc.fileName}"`, path.dirname(doc.fileName));
}


async function runProgram(clearOut = true) {
    if (!runInit(clearOut)) return;
    
    const cfg = vscode.workspace.getConfiguration("pos");
    const exe = cfg.get("programmer");
    const doc = vscode.window.activeTextEditor.document;
    const fn  = getFName(doc.fileName);
    
    if (!checkFile(fn + ".pbe") || !checkFile(fn + ".hex")) return;
    
    const txt = fs.readFileSync(fn + ".pbe");
    const dev = /^\d{2}\w+/i.exec(txt);
    
    let params = cfg.get("programmerArgs");
    params = params.replace(/\$hex-filename\$/ig, fn + ".hex");
    params = params.replace(/\$target-device\$/ig, dev ? dev[0] : "notfound");
    params = params.replace(/\$exe-path\$/ig, path.dirname(exe));
    
    return run(exe, params, path.dirname(doc.fileName));
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


function viewFile(ext = "") {
    if (!vscode.window.activeTextEditor) return;
    const doc = vscode.window.activeTextEditor.document;
    const fn  = vscode.Uri.file(getFName(doc.fileName) + ext);
    vscode.commands.executeCommand('vscode.open', fn);
}


exports.runCompile  = runCompile;
exports.runProgram  = runProgram;
exports.runCombine  = runCombine;
exports.stopCompile = stopCompile;
exports.viewFile    = viewFile;