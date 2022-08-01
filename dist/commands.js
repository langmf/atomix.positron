"use strict";

const vscode  = require("vscode");
const child   = require("child_process");
const path    = require("path");
const fs      = require("fs");
const root    = require("./root");
const common  = require("./common");
const plugins = require("./plugins");

const output  = vscode.window.createOutputChannel("Positron", "pos-output");

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


function HELP(prm) {
    if      (typeof prm === 'string') prm = [root.path.ext + "files\\help\\" + prm];
    else if (typeof prm === 'object') prm = fs.readdirSync(root.path.docs).filter(v => v.match(prm)).map( v=> root.path.docs + v);
    if (prm && prm.length) return child.exec(`start "" "${prm[0]}"`);
}


function parseBrace(v) {
    let c = 0,  q = 0,  code,  text = v;        if (!v || v[0] !== '(') return { code, text };
    for (let i = 0; i < v.length; i++) {
        q = v[i] === '"' ? !q : q;              if (q) continue;
        if (v[i] === '(') c++; else if (v[i] === ')') { c--; if (c <= 0) { code = v.slice(1, i);   text = v.slice(i+1);   break; } }
    }
    return { code, text };
}


function parseOutput(data) {
    let res = data.toString();
    try {
        let p = parseInt(child.execSync('reg query HKEY_LOCAL_MACHINE\\SYSTEM\\CurrentControlSet\\Control\\Nls\\CodePage /v ACP').toString().match(/(\d+)[\r\n]*$/));
        const x = { 65001:'utf-8', 51949:'euc-kr', 54936:'gb18030', 51932:'euc-jp', 21866:'koi8-u', 20866:'koi8-r', 950:'big5', 866:'ibm866' };
        if      (p in x) p = x[p];
        else if (p >= 1250  && p <= 1258)  p = 'windows-'  + p;
        else if (p >= 28592 && p <= 28606) p = 'iso-8859-' + (p - 28590);
        res = (new TextDecoder(p)).decode(data).toString();
    } catch(e) { console.error(e) }
    return res.replace(/([\t ]+line[\t ]+\[(\d+)\][\t ]+in[\t ]+)file[\t ]+\[([^\]]+)\]/ig, function(v,p,e,f){ 
        return p + ' [file:///' + f.replace(/ /g, '%20') + '#' + e + ']'; 
    });
}


function runInit(clearOut = true) {
    if (!vscode.window.activeTextEditor) return;
    if (clearOut) output.clear();
    common.OutputHide();
    output.show(true);
    return true;
}


async function saveFiles(doc) {
    if (root.config.saveAllFilesBeforeRun && !(await vscode.workspace.saveAll())) { vscode.window.showErrorMessage("All files can't be saved");     return false; }
    if (root.config.saveFileBeforeRun     && !(await doc.save()))                 { vscode.window.showErrorMessage("File can't be saved");          return false; }
    return true;
}


async function run(exe, arg = "", workDir, time, fmt) {
    if (_isRunning) { vscode.window.showInformationMessage("Program is already running!");     return; }
    
    try   {   fs.accessSync(exe, fs.constants.X_OK);   } catch {   vscode.window.showErrorMessage(`Can't be executed - ${exe}`);    return; }
    
    _isRunning = true;
    
    if (_statbar) _statbar.dispose();
    _statbar = vscode.window.setStatusBarMessage(`Running ${path.basename(exe)} ... `);

    const cmd = `"${exe}" ${arg}`,   startTime = new Date();        let buf = Buffer.alloc(0);

    output.appendLine("[Running]  " + cmd);
    
    exports.process = _process = child.spawn(cmd, [], {cwd: workDir, shell: true});

    _process.stdout.on("data", data => {  if (fmt) buf = Buffer.concat([buf, data]);  else  output.append(data.toString());  });
    _process.stderr.on("data", data => {  if (fmt) buf = Buffer.concat([buf, data]);  else  output.append(data.toString());  });

    _process.on("exit", code => {
        const endTime = new Date(),  elapsedTime = (endTime.getTime() - startTime.getTime()) / 1000;
        if (fmt) output.append(parseOutput(buf));
        output.appendLine("[Done] exited with code=" + code + " in " + elapsedTime + " seconds");
        _statbar.dispose();
        _isRunning = false;
    });
    
    return new Promise( (resolve) => {
        const tmr = (time || 0) <= 0 ? 0 : setTimeout(() => resolve(_process.exitCode), time);
        _process.on('close', () => { clearTimeout(tmr);     resolve(_process.exitCode); });
    });
}


async function runCompile(nFile) {
    const one = (nFile == null);        if (!runInit(one)) return;
    
    const exe = root.config.main.compiler,   doc = vscode.window.activeTextEditor.document;
    
    try {  (root.config.smartPreprocessorJS && await PreprocessorJS());  }catch(e){  vscode.window.showErrorMessage(`Preprocessor JS => ${e}`);  }

    if (!(await saveFiles(doc))) return;
    
    const file = nFile || doc.fileName,  dir = path.dirname(file);
    
    const data = { action: 'compile',  one,  file,  dir,  exe,  arg: `"${file}"` };
    
    let res = await plugins.command(data, false) || await run(data.exe,  data.arg,  data.dir,  data.time,  true);

    res     = await plugins.command(data, true)  || res;

    if (/^ +Program +Compiled +OK\./im.test(root.readFile(file, '', '.pbe'))) common.setVersion(doc);

    if (root.config.smartPreprocessorJS) saveFiles(doc);

    return res;
}


async function runProgram(nFile) {
    const one = (nFile == null);        if (!runInit(one)) return;
    
    const exe = root.config.main.programmer,   doc = vscode.window.activeTextEditor.document;
    const fn   = getFName(nFile || doc.fileName);
    
    if (!checkFileOut(fn + ".pbe") || !checkFileOut(fn + ".hex")) return;
    
    const txt  = fs.readFileSync(fn + ".pbe"),   dev = (/^\d{2}\w+/i.exec(txt))?.[0],   hex = fn + ".hex";
    
    const arg  = root.config.main.programmerArgs
                    .replace(/\$hex-filename\$/ig,      hex)
                    .replace(/\$target-device\$/ig,     dev)
                    .replace(/\$exe-path\$/ig,          path.dirname(exe));
    
    const file = nFile || doc.fileName,  dir = path.dirname(file),  cmd = cmdFile(file);
    
    const data = { action: 'program',  one,  file,  dir,  exe,  arg,  dev,  hex };

    let res = await plugins.command(data, false) || (!cmd ? await run(data.exe,      data.arg,  data.dir,  data.time) :
                                                            await run(cmd,  `${dev} "${hex}"`,  data.dir,  data.time) );

    return    await plugins.command(data, true)  || res;
}


async function runCombine() {
    const nFile = vscode.window.activeTextEditor.document.fileName;
    output.clear();
    await runCompile(nFile);
    output.appendLine("");
    await runProgram(nFile);
}


function stopCompile() {
    _process === null || _process === void 0 ? void 0 : _process.kill();
    _statbar === null || _statbar === void 0 ? void 0 : _statbar.dispose();
    _isRunning = false;
}


async function runWait(fnc) {
    await fnc();        common.OutputHide(2);
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


async function PreprocessorJS() {
    const main = vscode.window.activeTextEditor.document;           let doc;

    //------------------------- Helpers --------------------------
    const ver = common.getVersion(main, false),  Major = ver.Major,  Minor = ver.Minor,  Release = ver.Release,  Build = ver.Build;

    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    
    const random = (value = 255, ofs = 0) => Math.floor(Math.random()*(value || 255)) + ofs;

    const chunk = (value, prm = 0) => {
        if (typeof prm === 'number') prm = [prm];           if (typeof value !== 'string') value = value.join(', ');
        let sz = prm[0] ?? 10,   jn = prm[1] || "_\r\n\t",   sb = prm[2] || '',   se = prm[3] || '';
        if (sz < 0) {  sz *= -1;   sb ||= " { _\r\n\t";   se ||= " _\r\n}";  } else if (sz === 0) return value;
        return sb + value.split(new RegExp(`((?:(?:\\w+|"[^"]*"), ){${sz}})`, 'g')).filter(e => e).join(jn) + se;
    }

    const repeat = (cnt, value, prm = 0) => {
        let a = [],  v = value,  x = { length: Math.abs(cnt) };
        if      (       v ==  null      ) a = [...Array(x.length).keys()];
        else if (typeof v === 'number'  ) a = Array(x.length).fill(v);
        else if (typeof v === 'string'  ) a = Array(x.length).fill('"' + v + '"');
        else if (typeof v === 'function') a = Array.from(x, v);
        else if (   Array.isArray(v)    ) a = Array.from(x, v.length > 1 ? (l,i) => i*v[1]+v[0] : (l,i) => random(v[0]));
        return chunk((cnt < 0 ? a.reverse() : a), prm);
    }

    const file = (fName, prm = 0) => {
        if (typeof prm === 'number') prm = [prm];
        let r = '',   s = Array.isArray(prm),   f = fName.replace(/"/g, ''),   d = path.dirname(doc.fileName) + '\\';
        f = f.indexOf(':') === 1 ? f : d + f;       r = fs.readFileSync(f, !s ? prm : null);
        return (typeof r === 'string' || !s) ? r : chunk(r, prm);
    }

    const pick = async (items, opt, def) => {
        items = items.map(v => typeof v === 'number' ? ''+v : Array.isArray(v) ? { label: v[0], description: v[1], detail: v[2], value: v[3] } : v ?? { kind: -1 });
        if ((typeof opt === 'string' && (opt = [opt])) || Array.isArray(opt)) opt = { title: opt[0], placeHolder: opt[1] };
        const result = await vscode.window.showQuickPick(items || [], opt || { title: 'Select'}) || def;
        return typeof result === 'object' ? result.value ?? result.label : result;
    }

    const input = async (value, def) => {
        const v = value,  opt = Array.isArray(v) ? { value: v[0], placeHolder: v[1], title: v[2], password: v[3] } : typeof v === 'object' ? v : { value: v.toString() };
        return await vscode.window.showInputBox(opt) || def;
    }

    //------------------------------------------------------------
    const runPJS = async (v) => {
        const arrEdit = [],  fmtEdit = new vscode.WorkspaceEdit(),  items = parsePJS(doc = v);
        for (let item of items) {
            if (!('name' in item)) { eval.apply(null, [item.text]);   continue; }
            let result = eval(item.text);
            if (typeof result === 'function') result = await result();
            if (result != null) arrEdit.push(new vscode.TextEdit(item.range, item.add + result));
        }
        if (arrEdit.length) { fmtEdit.set(doc.uri, arrEdit);   vscode.workspace.applyEdit(fmtEdit); }
    }

    //------------------------------------------------------------
    for (const fName of common.getDocs(main)) {
        const iDoc = await vscode.workspace.openTextDocument(vscode.Uri.file(fName));       if (iDoc) await runPJS(iDoc);
    }
}


function parsePJS(doc) {
    const rxp = /"([^"]*)"|\(\*\u00A7{1,2}([\s\S]*?)\*\)|[';](\u00A7{1,2})([=~\w]*)(.*)$/igm;
    const items = [],  text = doc.getText() + '\r\n';            let mts, old, enable = false;

    const findPos = (v,p) => {
        const mt = (new RegExp('(' + v + ')(?<E>.*?)[\t ]*$', 'i')).exec(doc.lineAt(p.line).text.substring(0, p.character)); 
        if (!mt) return [p.character, p.character];         let i = mt.index;
        if ('R' in mt.groups) return [i += mt.groups.B?.length || 0, i + mt.groups.R.length];
        return [i += mt[1].length, i + mt.groups.E.length];
    }

    while ((mts = rxp.exec(text)) !== null) {
        if      (mts[2] != null) { if (enable) items.push({ text: mts[2] }); }
        else if (mts[3] != null)
        {
            switch (mts[4]) {
                case 'exit'     :   return items;
                case 'enable'   :   enable = true;      continue;
                case 'disable'  :   enable = false;     continue;
                default         :   if (!enable)        continue;
            }

            let pos = doc.positionAt(mts.index),   char = [0, pos.character],   item = Object.assign({name:mts[4], add:''}, parseBrace(mts[5]));

            if (item.code != null) char = eval(item.code);

            if      (item.name === 'region' ) { pos = doc.lineAt(pos.line + 1).range.end;      old = item; }
            else if (item.name === 'end'    ) { old.range = new vscode.Range(old.range.start, doc.lineAt(pos.line - 1).range.end);   continue; }
            else if (item.name === '='      ) { item.add  = ' ';   char = '='; }
            else if (item.name === '~'      ) { item.text = 'async () => ' + item.text; }
            else if (item.name === '=~'     ) { item.text = 'async () => ' + item.text;   item.add = ' ';   char = '='; }

            if      (typeof char === 'undefined') item.range = doc.lineAt(pos.line).range;
            else if (typeof char === 'number'   ) if (char >= 0) char = [char, 0];  else  item.range = doc.lineAt(pos.line - char).range;
            else if (typeof char === 'string'   ) char = findPos(char, pos);

            if (!item.range) {
                if (char[1] <= 0) char[1] = pos.character + char[1];
                item.range = new vscode.Range(pos.line, char[0], pos.line, char[1] <= 0 ? 0 : char[1]);
            }

            items.push(item);
        }
    }
    
    return items;
}


exports.register = () => {
    vscode.commands.registerCommand("pos.save",         () => {    vscode.window.activeTextEditor.document.save();  });
    vscode.commands.registerCommand("pos.save_all",     () => {    vscode.workspace.saveAll();                      });
    vscode.commands.registerCommand("pos.runCompile",   () => {    runWait(runCompile);             });
    vscode.commands.registerCommand("pos.runProgram",   () => {    runWait(runProgram);             });
    vscode.commands.registerCommand("pos.runCombine",   () => {    runWait(runCombine);             });
    vscode.commands.registerCommand("pos.stopCompile",  () => {    stopCompile();                   });
    vscode.commands.registerCommand("pos.viewAsm",      () => {    viewFile(".asm");                });
    vscode.commands.registerCommand("pos.viewLst",      () => {    viewFile(".lst");                });
    vscode.commands.registerCommand("pos.helpPJS",      () => {    HELP("PreprocessorJS.pdf");      });
    vscode.commands.registerCommand("pos.helpPos8",     () => {    HELP(/^.*positron8.*\.pdf$/i);   });
    vscode.commands.registerCommand("pos.helpPos16",    () => {    HELP(/^.*positron16.*\.pdf$/i);  });
};


exports.runCompile  = runCompile;
exports.runProgram  = runProgram;
exports.runCombine  = runCombine;
exports.stopCompile = stopCompile;
exports.viewFile    = viewFile;

exports.run         = run;
exports.output      = output;