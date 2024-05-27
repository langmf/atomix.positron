"use strict";

const vscode  = require("vscode")
const child   = require("child_process")
const path    = require("path")
const fs      = require("fs")
const root    = require("./root")
const common  = require("./common")
const plugins = require("./plugins")

const output  = vscode.window.createOutputChannel("Positron", "pos-output")


let _process,  _statbar,  _isRunning = false


function checkFileOut(nFile)
{
    try{  fs.accessSync(nFile, fs.constants.F_OK);   return true  }catch(e){  output.appendLine(e.toString())  }
}


function checkFileMsg(nFile)
{
    try{  fs.accessSync(nFile, fs.constants.F_OK);   return true  }catch(e){ vscode.window.showErrorMessage(e.toString()) }
}


function getFName(fn = "")
{
    return path.dirname(fn) + path.sep + path.parse(fn).name
}


function cmdFile(fn = "", nm)
{
    const cmd = path.dirname(fn) + path.sep + nm + '.cmd';         if (root.checkFile(cmd))  return cmd
}


function HELP(prm)
{
    if      (typeof prm === 'string') prm = [root.path.ext + 'files/help/' + prm]
    else if (typeof prm === 'object') prm = fs.readdirSync(root.path.docs).filter(v => v.match(prm)).map( v=> root.path.docs + v)
    
    if (prm && prm.length)  return root.openURL(prm[0])
}


function parseBrace(v)
{
    let c = 0,  q = 0,  code,  text = v;        if (!v || v[0] !== '(')  return { code, text }

    for (let i = 0;  i < v.length;  i++)
    {
        q = v[i] === '"' ? !q : q;              if (q) continue

        if      (v[i] === '(')   c++
        else if (v[i] === ')')
        {
            c--
            if (c <= 0)
            { 
                code = v.slice(1, i)
                text = v.slice(i+1)
                break
            }
        }
    }
    return { code, text }
}


function parseArg(arg, exe, file, def)
{  
    const to  = { 'dir': 'path' }
    const add = (x, p) => Object.entries(path.parse(x)).reduce((a,v) => (a[p + '-' + (to[v[0]] || v[0])] = v[1], a),   { [p]: x })

    const obj = { ...add(file, 'file'),   ...add(exe, 'exe'),   ...def }

    return arg.replace(/\$([\w\d\-_]+)\$/ig,  (m, k) => obj[k.toLowerCase()] || '')
}


function parseACP(data)
{
    let res = data.toString()

    try {
        const cmd = (root.win ? '' : 'wine ') + 'reg query "HKEY_LOCAL_MACHINE\\SYSTEM\\CurrentControlSet\\Control\\Nls\\CodePage" /v ACP'
        
        let p = parseInt(child.execSync(cmd).toString().match(/(\d+)[\r\n]*$/))
        
        const x = { 65001:'utf-8', 51949:'euc-kr', 54936:'gb18030', 51932:'euc-jp', 21866:'koi8-u', 20866:'koi8-r', 950:'big5', 866:'ibm866' }
        
        if      (p in x)                    p = x[p]
        else if (p >= 1250  && p <= 1258)   p = 'windows-'  + p
        else if (p >= 28592 && p <= 28606)  p = 'iso-8859-' + (p - 28590)

        res = (new TextDecoder(p)).decode(data).toString()
    }
    catch(e) {  console.error(e)  }

    return res
}


function outputCompiler(data, arg)
{
    let res = parseACP(data),   m = arg.match(/^\s*"([^"]+)"/),   a = getFName((m && m[1]) || '') + '.asm'

    try {
        if (root.checkFile(a))
        res = res.replace(/^(error\[\d+\][\t ]+).+?\\a\.s[\t ]+(\d+)[\t ]+:/igm,                  function(v,p,e)  {  return p + ' [file:///' + a.replace(/ /g, '%20') + '#' + e + '] :';    })
        
        res = res.replace(/([\t ]+line[\t ]+\[(\d+)\][\t ]+in[\t ]+)file[\t ]+\[([^\]]+)\]/ig,    function(v,p,e,f){  return p + ' [file:///' + f.replace(/ /g, '%20') + '#' + e + ']';      })
        res = res.replace(/(\d+)[\t ]+[a-z]+[\t ]+used[\t ]+.+?[\t ]+possible[\t ]+(\d+)/ig,      function(v,c,t)  {  return v + " (" + ((Number(c) / Number(t)) * 100).toFixed(2) + " %)";  })
        res = res.replace(/(?<=file:\/{3})\/+/ig, '')
    }
    catch(e) {  console.error(e)  }

    return res
}


function runInit(clearOut = true)
{
    if (!vscode.window.activeTextEditor) return

    if (clearOut) output.clear()

    common.OutputHide()
    output.show(true)

    return true
}


async function saveFiles(doc)
{
    if (root.config.saveAllFilesBeforeRun && !(await vscode.workspace.saveAll())) { vscode.window.showErrorMessage("All files can't be saved");     return false }
    if (root.config.saveFileBeforeRun     && !(await doc.save()))                 { vscode.window.showErrorMessage("File can't be saved");          return false }
    
    return true
}



async function run(exe, arg = "", workDir, time, fmt)
{
    if (_isRunning)
    { 
        vscode.window.showInformationMessage("Program is already running!", 'Terminate').then(s => (s === 'Terminate' && stopCompile()))

        return
    }
    
    if (!root.checkFile(exe))  { vscode.window.showErrorMessage(`Can't be executed - ${exe}`);    return }
    
    _isRunning = true
    
    if (_statbar)  _statbar.dispose()
    
    _statbar = vscode.window.setStatusBarMessage(`Running ${path.basename(exe)} ... `)

    const startTime = new Date()
    
    let buf = Buffer.alloc(0),   cmd = `"${exe}" ${arg}`

    if (!root.win && ['.cmd', '.exe'].includes(path.extname(exe || '').toLowerCase()))  cmd = 'wine ' + cmd

    output.appendLine("[Running]  " + cmd)
    
    exports.process = _process = child.spawn(cmd, [], {cwd: workDir, shell: true})

    const ondata = (data) => {  if (fmt) buf = Buffer.concat([buf, data]);  else  output.append(data.toString())  }
    
    _process.stdout.on("data", ondata);		if (root.win) _process.stderr.on("data", ondata)

    _process.on("exit", code =>
    {
        const endTime = new Date(),  elapsedTime = (endTime.getTime() - startTime.getTime()) / 1000

        if (fmt) output.append(outputCompiler(buf, arg))

        output.appendLine("[Done] exited with code=" + code + " in " + elapsedTime.toFixed(1) + " seconds")

        _statbar.dispose()

        _isRunning = false
    })
    
    return new Promise( (resolve) =>
    {
        const tmr = (time || 0) <= 0 ? 0 : setTimeout(() => resolve(_process.exitCode), time)
        _process.on('close', () => { clearTimeout(tmr);     resolve(_process.exitCode) })
    })
}



async function runCompile(nFile)
{
    const one = (nFile == null);        if (!runInit(one)) return
    
    const exe = root.autoPath(root.config.main.compiler),   doc = vscode.window.activeTextEditor.document
    
    try {
        (root.config.smartPreprocessorJS && await PreprocessorJS())
    }
    catch (e) {    vscode.window.showErrorMessage(`Preprocessor JS => ${e}`)    }

    if (!(await saveFiles(doc)))  return
    
    const file = root.getMain(nFile || doc.fileName),   dir = path.dirname(file),   cmd = cmdFile(file, 'compiler')

    const arg  = parseArg(root.config.main.compilerArgs,  exe,  file)

    const res  =
    {
        get pbe()   { return root.readFile(file, '', '.pbe')                },
        get ok()    { return /^ +Program +Compiled +OK\./im.test(this.pbe)  },
        output
    }
    
    const data = { action: 'compile',  res,  one,  file,  dir,  exe,  arg: `"${file}" ` + arg }
    
    res.code = await plugins.command(data, false) || (!cmd ? await run(data.exe,  data.arg,  data.dir,  data.time,  true) :
                                                             await run(cmd,       data.arg,  data.dir,  data.time)        )

    res.code = await plugins.command(data, true)  || res.code

    if (res.ok) common.setVersion(file)

    if (root.config.smartPreprocessorJS) saveFiles(doc)

    return res.code
}



async function runProgram(nFile)
{
    const one  = (nFile == null);        if (!runInit(one)) return
    
    const exe  = root.autoPath(root.config.main.programmer),   doc = vscode.window.activeTextEditor.document
    const file = root.getMain(nFile || doc.fileName),   fn = getFName(file)
    
    if (!checkFileOut(fn + ".pbe") || !checkFileOut(fn + ".hex"))  return
    
    const txt  = fs.readFileSync(fn + ".pbe"),   dev = (/^\d{2}\w+/i.exec(txt))?.[0],   hex = fn + ".hex"
    
    const dir  = path.dirname(file),   cmd = cmdFile(file, 'programmer')

    const arg  = parseArg(root.config.main.programmerArgs,  exe,  file,  { 'target-device': dev,  'hex-filename' : hex })

    const res  =
    {
        get pbe()   { return root.readFile(file, '', '.pbe')                },
        get ok()    { return /^ +Program +Compiled +OK\./im.test(this.pbe)  },
        output
    }

    const data = { action: 'program',  res,  one,  file,  dir,  exe,  arg,  dev,  hex }

    res.code = await plugins.command(data, false) || (!cmd ? await run(data.exe,      data.arg,  data.dir,  data.time) :
                                                             await run(cmd,  `${dev} "${hex}"`,  data.dir,  data.time) )

    res.code = await plugins.command(data, true)  || res.code

    return res.code
}



async function runCombine()
{
    const nFile = vscode.window.activeTextEditor.document.fileName

                                    output.clear()
    await runCompile(nFile);        output.appendLine("")
    await runProgram(nFile)
}


function stopCompile()
{
    (_process === null || _process === void 0) ? void 0 : require('tree-kill')(_process.pid)
    (_statbar === null || _statbar === void 0) ? void 0 : _statbar.dispose()
    _isRunning = false
}


async function runWait(fnc)
{
    await fnc();        common.OutputHide(2)
}


async function showSettings()
{
    vscode.commands.executeCommand('workbench.action.openSettings', '@ext:atomix.positron')
}



async function viewFile(ext = "")
{
    if (!vscode.window.activeTextEditor)  return
    
    let editor = vscode.window.activeTextEditor
    let doc    = editor.document
    let text   = (editor.selection && !editor.selection.isEmpty) ? doc.getText(editor.selection) : doc.lineAt(editor.selection.active.line).text.trim()

    const file = getFName(root.getMain(doc)) + ext
    
    if (!checkFileMsg(file)) return

    doc    = await vscode.workspace.openTextDocument(vscode.Uri.file(file))
    editor = await vscode.window.showTextDocument(doc, {viewColumn: vscode.ViewColumn[root.config.viewColumnASM] })

    const idx  = doc.getText().toLowerCase().indexOf(text.toLowerCase());           if (idx == -1) return

    const pos1 = doc.positionAt(idx),   pos2 = doc.positionAt(idx + text.length),   range = new vscode.Range(pos1, pos2)
    
    editor.selections = [new vscode.Selection(pos1,pos2)]
    editor.revealRange(range)
}



async function PreprocessorJS(doc)
{
    const main = vscode.window.activeTextEditor.document,   dev  = root.getCore(main, true),   words = common.getWords(main);          
    const ver  = common.getVersion(main, false),  Major = ver.Major,  Minor = ver.Minor,  Release = ver.Release,  Build = ver.Build


    //------------------------- Helpers --------------------------
    const sleep = (ms) => new Promise(r => setTimeout(r, ms))
    
    const random = (value = 255, ofs = 0) => Math.floor(Math.random()*(value || 255)) + ofs

    const define = (value) =>
    {
        value = (value || '').toLowerCase();            if (!(value in words)) return
        const m = words[value].code.match(/^\$?\w+[\t ]+\w+(\([^\)]*\)|\[[^\]]*\])?([\t ]+as\b)?([\t =]+("[^"]*"|\w+))/i)
        return (m && m[4]) || true
    }

    const chunk = (value, prm = 0) =>
    {
        if (typeof prm   === 'number') prm = [prm]
        if (typeof value !== 'string') value = value.join(', ')
        let sz = prm[0] ?? 10,   jn = prm[1] || "_\r\n\t",   sb = prm[2] || '',   se = prm[3] || ''
        if (sz < 0) {  sz *= -1;   sb ||= " { _\r\n\t";   se ||= " _\r\n}";  } else if (sz === 0) return value
        return sb + value.split(new RegExp(`((?:(?:\\w+|"[^"]*"), ){${sz}})`, 'g')).filter(e => e).join(jn) + se
    }

    const repeat = (cnt, value, prm = 0) =>
    {
        let a = [],  v = value,  x = { length: Math.abs(cnt) }
        if      (       v ==  null      ) a = [...Array(x.length).keys()]
        else if (typeof v === 'number'  ) a = Array(x.length).fill(v)
        else if (typeof v === 'string'  ) a = Array(x.length).fill('"' + v + '"')
        else if (typeof v === 'function') a = Array.from(x, v)
        else if (   Array.isArray(v)    ) a = Array.from(x, v.length > 1 ? (l,i) => i*v[1]+v[0] : (l,i) => random(v[0]))
        return chunk((cnt < 0 ? a.reverse() : a), prm)
    }

    const file = (fName, prm = 0) =>
    {
        if (typeof prm === 'number') prm = [prm]
        let r = '',   s = Array.isArray(prm),   f = fName.replace(/"/g, ''),   d = path.dirname(doc.fileName) + path.sep
        f = f.indexOf(':') === 1 ? f : d + f;       r = fs.readFileSync(f, !s ? prm : null)
        return (typeof r === 'string' || !s) ? r : chunk(r, prm)
    }

    const popup = (value) =>
    {
        const enm = {info: 'showInformationMessage', warn: 'showWarningMessage', err: 'showErrorMessage' }
        const obj = Object.assign({msg:'', type:'info'}, typeof value === 'object' ? value : {msg: value})
        vscode.window[enm[obj.type.toLowerCase()] || obj.type](obj.msg);        return ''
    }

    const pick = async (items, opt, def) =>
    {
        items = items.map(v => typeof v === 'number' ? ''+v : Array.isArray(v) ? { label: v[0], description: v[1], detail: v[2], value: v[3] } : v ?? { kind: -1 })
        if ((typeof opt === 'string' && (opt = [opt])) || Array.isArray(opt)) opt = { title: opt[0], placeHolder: opt[1] }
        const result = await vscode.window.showQuickPick(items || [], opt || { title: 'Select'}) || def
        return typeof result === 'object' ? result.value ?? result.label : result
    }

    const input = async (value, def) =>
    {
        const v = value,  opt = Array.isArray(v) ? { value: v[0], placeHolder: v[1], title: v[2], password: v[3] } : typeof v === 'object' ? v : { value: v.toString() }
        return await vscode.window.showInputBox(opt) || def
    }


    //------------------------------------------------------------
    const evalPJS = async (v) =>
    {
        let evalRet = await eval(v)
        return typeof evalRet === 'function' ? await evalRet() : evalRet
    }


    const parsePJS = async () =>
    {
        const items = [],  text = doc.getText() + '\r\n';       if (!/[';]\u00A7{1,2}preprocessorjs\b/i.test(text)) return items
        
        const rxp = /"([^"]*)"|\(\*\u00A7{1,2}([\s\S]*?)\*\)|[';](\u00A7{1,2})([=~\w]*)(.*)$/igm
        
        let mts, old, name, enable = true, rif, sif = [], IF = {}
    
        const findPos = (v,p) =>
        {
            const mt = (new RegExp('(' + v + ')(?<E>.*?)[\t ]*$', 'i')).exec(doc.lineAt(p.line).text.substring(0, p.character))
            if (!mt) return [p.character, p.character];         let i = mt.index
            if ('R' in mt.groups) return [i += mt.groups.B?.length || 0, i + mt.groups.R.length]
            return [i += mt[1].length, i + mt.groups.E.length]
        }
    
        while ((mts = rxp.exec(text)) !== null)
        {
            if      (mts[2] != null) {  if (enable && !IF.skip) items.push({ text: mts[2] })  }
            else if (mts[3] != null)
            {
                switch (name = mts[4])
                {
                    case 'if'       :   rif = !IF.skip && await evalPJS(mts[5]);     sif.push(IF = { skip: !rif,  act: !IF.skip && !rif });     continue
                    case 'elseif'   :   rif = (IF.act  && await evalPJS(mts[5]));    IF.skip = !rif;    IF.act &&= !rif;                        continue
                    case 'else'     :   IF.skip = !IF.act;    IF.act = 0;            continue
                    case 'endif'    :   sif.pop();    IF = sif.at(-1) || {};         continue
                    default         :   if (IF.skip)                                 continue
                }

                switch (name)
                {
                    case 'exit'     :   return items
                    case 'enable'   :   enable = true;              continue
                    case 'disable'  :   enable = false;             continue
                    default         :   if (!enable)                continue
                }

                switch (name)
                {
                    case 'eval'     :   await evalPJS(mts[5]);      continue
                }

                let pos = doc.positionAt(mts.index),   char = [0, pos.character],   item = Object.assign({name, add:''}, parseBrace(mts[5]))
    
                if (item.code != null)  char = eval(item.code)
    
                if      (item.name === 'region' ) { pos = doc.lineAt(pos.line + 1).range.end;      old = item }
                else if (item.name === 'end'    ) { old.range = new vscode.Range(old.range.start, doc.lineAt(pos.line - 1).range.end);   continue }
                else if (item.name === '='      ) { item.add  = ' ';   char = '=' }
                else if (item.name              ) { continue }

                if      (typeof char === 'undefined') item.range = doc.lineAt(pos.line).range
                else if (typeof char === 'number'   ) if (char >= 0) char = [char, 0];  else  item.range = doc.lineAt(pos.line - char).range
                else if (typeof char === 'string'   ) char = findPos(char, pos)
    
                if (!item.range)
                {
                    if (char[1] <= 0) char[1] = pos.character + char[1]
                    item.range = new vscode.Range(pos.line, char[0], pos.line, char[1] <= 0 ? 0 : char[1])
                }
    
                items.push(item)
            }
        }
        
        return items
    }


    //------------------------------------------------------------
    for (const fName of common.getDocs(main))
    {
        doc = await vscode.workspace.openTextDocument(vscode.Uri.file(fName));                  if (!doc) continue
        
        const arrEdit = [],  fmtEdit = new vscode.WorkspaceEdit(),  items = await parsePJS()
        
        for (const item of items)
        {
            if (!('name' in item)) { eval.call(null, item.text);   continue }
            
            const result = await evalPJS(item.text)
            
            if (result != null) arrEdit.push(new vscode.TextEdit(item.range, item.add + result))
        }

        if (arrEdit.length)
        {
            fmtEdit.set(doc.uri, arrEdit)
            await vscode.workspace.applyEdit(fmtEdit)
        }
    }
}


exports.register = () =>
{
    vscode.commands.registerCommand("pos.save",         () => {    vscode.window.activeTextEditor.document.save();  })
    vscode.commands.registerCommand("pos.save_all",     () => {    vscode.workspace.saveAll();                      })
    vscode.commands.registerCommand("pos.runCompile",   () => {    runWait(runCompile);                             })
    vscode.commands.registerCommand("pos.runProgram",   () => {    runWait(runProgram);                             })
    vscode.commands.registerCommand("pos.runCombine",   () => {    runWait(runCombine);                             })
    vscode.commands.registerCommand("pos.stopCompile",  () => {    stopCompile();                                   })
    vscode.commands.registerCommand("pos.showSettings", () => {    showSettings();                                  })
    vscode.commands.registerCommand("pos.viewAsm",      () => {    viewFile(".asm");                                })
    vscode.commands.registerCommand("pos.viewLst",      () => {    viewFile(".lst");                                })
    vscode.commands.registerCommand("pos.helpPJS",      () => {    HELP("PreprocessorJS.pdf");                      })
    vscode.commands.registerCommand("pos.helpPos8",     () => {    HELP(/^.*positron8.*\.pdf$/i);                   })
    vscode.commands.registerCommand("pos.helpPos16",    () => {    HELP(/^.*positron16.*\.pdf$/i);                  })
}


exports.runCompile  = runCompile
exports.runProgram  = runProgram
exports.runCombine  = runCombine
exports.stopCompile = stopCompile
exports.viewFile    = viewFile

exports.output      = output
exports.run         = run
