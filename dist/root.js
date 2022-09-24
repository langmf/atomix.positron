'use strict';

const vscode = require('vscode');
const child  = require("child_process");
const fs     = require("fs");
const os     = require("os");
const path   = require('path');
const cache  = require("./cache");


exports.activate = (context) => {
    exports.context = context;
    exports.extensionPath = context.extensionPath;
    vscode.workspace.onDidChangeConfiguration(onDidChangeConfiguration);
    onDidChangeConfiguration();
}


function onDidChangeConfiguration() {
    const cfg    = vscode.workspace.getConfiguration("pos");
    const loader = path.dirname(cfg.main.compiler) + "\\";
    const pds    = path.resolve(cfg.main.compiler, "..\\..") + "\\";
    const ext    = exports.extensionPath + "\\";
    const user   = os.homedir() + "\\PDS\\";
    
    exports.config = cfg;       exports.debug = cfg.x.DEBUG;

    exports.path = {
        ext,
        pds,
        user,
        loader,
        include: {
            loader,
            user:   user + "Includes\\",
            main:   loader + "Includes\\",
            src:    loader + "Includes\\Sources\\"
        },
        web:    ext + "web\\",
        docs:   pds + "PDS\\Docs\\"
    }
}


exports.debugTime = (name, doc) => {
    return !exports.debug ? { begin(){return this;}, end(){}, start(){}, stop(){} } : {
        N:       name + (doc ? '  ' + doc.fileName.split("\\").pop() : ''),
        begin()  { console.time(this.N);     return this;   },
        end()    { console.timeEnd(this.N);                 },
        start()  { this.t0 = performance.now();             },
        stop(v)  { let t1  = performance.now();   console.log(this.N, v, (t1 - this.t0).toFixed(3) + "ms");  }
    }
}


exports.getMain = (doc) => {
    let prt;    if (typeof doc === 'object') doc = doc.fileName;
    if (!exports.config.smartParentIncludes || path.extname(doc).toLowerCase() === '.bas') return doc;
    while (prt = (cache.get(doc).$.parent)) doc = prt;
    return doc;
}


exports.getParent = (doc, main) => {
    let prt;    if (typeof doc === 'object') doc = doc.fileName;
    while (prt = (cache.get(doc).$.parent)) main = doc = prt;
    return main;
}

   
exports.getCore = (doc, isAll = false) => {
    if (doc) { const dev = cache.get(doc).symbols.device.$;     return isAll ? dev : dev.$info?.core; }
}


exports.IsAsmLst = (fName) => {
    if (typeof fName === 'object') fName = fName.fileName;      return ['.asm', '.lst'].includes(path.extname(fName || '').toLowerCase());
}


function readFile(fName, def = '', ext) {
    fName = typeof fName === 'object' ? fName.uri.fsPath : fName;               if (ext) fName = extFile(fName, ext);
    try   {  return fs.readFileSync(fName, 'utf-8');  }
    catch {  return def; }
}
exports.readFile = readFile;


function writeFile(fName, txt = '', ext) {
    fName = typeof fName === 'object' ? fName.uri.fsPath : fName;               if (ext) fName = extFile(fName, ext);
    try   {  fs.writeFileSync(fName, txt, 'utf-8');     return true;  }
    catch {  return false; }
}
exports.writeFile = writeFile;


function checkFile(fName) {
    if (fs.existsSync(fName) && fs.statSync(fName).isFile()) return fName; 
}
exports.checkFile = checkFile;


function extFile(fName, ext = '') {
    const name = path.dirname(fName) + '\\' + path.parse(fName).name;           if (!Array.isArray(ext)) return name + ext;
    for (let v of ext) if (v = checkFile(name + v)) return v;
}
exports.extFile = extFile;


function JsonFromFile(fName, fnErr) {
    try       { const v = fs.readFileSync(fName, 'utf-8').replace(/\/\*[\s\S]*?\*\//g, '');      return JSON.parse(v); }
    catch (e) { if (fnErr) fnErr(e); }
}
exports.JsonFromFile = JsonFromFile;


function JsonToFile(value, fName, fnErr) {
    try       { const v = JSON.stringify(value, null, '\t');      fs.writeFileSync(fName, v, 'utf-8');      return true; }
    catch (e) { if (fnErr) fnErr(e); }
}
exports.JsonToFile = JsonToFile;


function regex(value, flags = 'igm', sym = '|') {
    const A = (v) => v.reduce((a,i) => a + (typeof i === 'string' ? L(i) : (Array.isArray(i) ? '(' + A(i) + ')' : (a && sym) + i.source)), '');
    const L = (v) => v.replace(/^[\t ]*\/\/.*$/gm, '').replace(/^[\t ]*(.*?)[\t ]*$/gm, '$1').replace(/[\r\n]/g, '');
    const P = value?.raw ? L(value.raw.join('')) : Array.isArray(value) ? A(value) : L(value);
    return flags == null ? P : new RegExp(P, flags);
}
exports.regex = regex;


function limitText(txt, count = 130) {
	return txt.slice(0, count) + (txt.length > count ? " ... SIZE = " + txt.length : "");
}
exports.limitText = limitText;


function openURL(url) {
    return child.exec(`start "" "${url}"`);
}
exports.openURL = openURL;


function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}
exports.sleep = sleep;


function generateUUID() {
    let d = new Date().getTime(),   d2 = (performance && performance.now && performance.now() * 1000) || 0;
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        var r = Math.random() * 16;
        if (d > 0) { r = (d + r)%16 | 0;   d = Math.floor(d/16); } else { r = (d2 + r)%16 | 0;   d2 = Math.floor(d2/16); }
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16).toUpperCase();
    });
}
exports.generateUUID = generateUUID;


function objectPath(obj, path, def) {
	path = typeof path !== 'string' ? path : path.split(/\.|\[([^\]]+)\]/g).reduce((a,k) => (k && a.push(k), a), []);
    for (const i of path) if (i in obj) obj = obj[i];  else  return def;
    return obj;
}
exports.objectPath = objectPath;


function exeInfo(fName) {
    if (Array.isArray(fName)) return fName.map(v => exeInfo(v));
    const winver = require('win-version-info'),   res = { name: fName, icon: extFile(fName, ['.svg', '.ico', '.webp', '.png', '.jpg', '.gif']) };
    try {  res.stat = fs.statSync(fName);    res.date = new Date(res.stat.mtime).toLocaleString();    res.info = winver(fName);  }catch{};
    return res;
}
exports.exeInfo = exeInfo;


function exeList(dirPath, mask = '', deep = 1, result = []) {
    const rxp = /\*exe\*[\t ]*=[\t ]*([^\*]+)/im;
  
	for (const file of searchFiles(dirPath, mask, deep)) {
        const exe = exeInfo(file);
        if (!exe.info) {
            try {
                const mts = rxp.exec(fs.readFileSync(file, path.extname(file).toLowerCase() === '.lnk' ? 'utf-16le' : 'utf-8')); 
                if (mts) {  exe.info = JSON.parse(mts[1]);   if (exe.info.icon) exe.icon = path.resolve(path.dirname(file), exe.info.icon);  }
            } catch(e) {  console.error("exeList => ", e);  }
        }
        exe.info = Object.assign({ FileDescription: path.basename(file), FileVersion:'', CompanyName:'' }, exe.info);
        result.push(exe);
	}
  
	return result;
}
exports.exeList = exeList;


function searchFiles(dirPath, mask = '', deep = 0, result = []) {
    const rxp = new RegExp(mask, 'i'),   dir = dirPath.replace(/\\$/,'');           if (deep !== true && deep >= 0) deep--;

	for (const file of fs.readdirSync(dir)) {
		const value = dir + "\\" + file;

		if (fs.statSync(value).isDirectory()) {
            if (deep >= 0) searchFiles(value, mask, deep, result);
        } else {
            if (rxp.test(value)) result.push(value);
        }
	}
  
	return result;
}
exports.searchFiles = searchFiles;


function searchDirs(dirPath, mask = '', deep = true) {
    if (!Array.isArray(mask)) mask = [mask, ''];

    const rxpFile = new RegExp(mask[0], 'i'),   rxpDir = new RegExp(mask[1], 'i'),   dir = dirPath.replace(/\\$/,''),   files = [],   dirs = [];
    
    if (deep !== true && deep >= 0) deep--;

	for (const file of fs.readdirSync(dir)) {
		const value = dir + "\\" + file;

		if (fs.statSync(value).isDirectory()) {
            if (deep >= 0 && rxpDir.test(file)) dirs.push({ [value]: searchDirs(value, mask, deep) });
        } else {
            if (rxpFile.test(file)) files.push(value);
        }
	}
  
	return [...dirs, ...files];
}
exports.searchDirs = searchDirs;


function PS(_opts) {
    const opt = Object.assign({cwd: exports.path.ext, time: 10000}, _opts);

    this.run = (value, time = opt.time) => {
        const cmd = 'powershell.exe -NoProfile -Command ' + value,   proc = child.spawn(cmd, [], {cwd: opt.cwd, shell: true});
        if (opt.debug) {
            console.log('PS:', opt, cmd);
            proc.stdout.on("data", (v) => console.log(v.toString()) );
            proc.stderr.on("data", (v) => console.log(v.toString()) );
        }
        return new Promise( (resolve) => {
            const tmr = (time || 0) <= 0 ? 0 : setTimeout(() => resolve(proc.exitCode), time);
            proc.on('close', () => { clearTimeout(tmr);         resolve(proc.exitCode); });
        });
    }
   
    this.play  = (value)        => this.run(`"&{$P=New-Object System.Media.SoundPlayer; $P.SoundLocation='${value}'; $P.playsync()}"`);
    this.speak = (value)        => this.run(`"&{$V=New-Object -ComObject Sapi.spvoice; $V.volume=100; $V.rate=0; $V.speak('${value}')}"`);
    this.beep  = (freq, time)   => this.run(`[console]::beep(${freq || 1000},${time || 300})`);
    this.media = (value)        => this.run(`[System.Media.SystemSounds]::${value || 'Beep'}.Play()`);

    return this;
}
exports.PS = PS;
