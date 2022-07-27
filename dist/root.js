'use strict';

const vscode = require('vscode');
const fs     = require("fs");
const os     = require("os");
const path   = require('path');


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
    
    exports.config = cfg;       exports.debug = cfg.x.DEBUG;

    exports.path = {
        ext,
        pds,
        loader,
        include: {
            main:   loader + "Includes\\",
            src:    loader + "Includes\\Sources\\",
            user:   os.homedir() + "\\PDS\\Includes\\"
        },
        web:    ext + "web\\",
        docs:   pds + "PDS\\Docs\\"
    }
}


exports.IsAsmLst = (fName) => {
    if (typeof fName === 'object') fName = fName.fileName;          return ['.asm', '.lst'].includes(path.extname(fName).toLowerCase());
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


function limitText(txt, count = 140) {
	return txt.slice(0, count) + (txt.length > count ? " ... SIZE = " + txt.length : "");
}
exports.limitText = limitText;


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
    const winver = require('win-version-info'),   res = { name: fName, icon: extFile(fName, ['.png', '.gif', '.webp', '.svg']) };
    try {  res.stat = fs.statSync(fName);    res.date = new Date(res.stat.mtime).toLocaleString();    res.info = winver(fName);  }catch{};
    return res;
}
exports.exeInfo = exeInfo;


function exeList(dirPath, mask = '', deep = 1, result = []) {
    const rxp = /^[\t ]*[';:\/]*[\t ]*exe_info[\t ]*=[\t ]*(.+)$/im;
  
	for (const file of searchFiles(dirPath, mask, deep)) {
        const exe = exeInfo(file);
        if (!exe.info) {
            try      {  const txt = fs.readFileSync(file, 'utf-8'),   m = rxp.exec(txt);    if (m) exe.info = JSON.parse(m[1]);  }
            catch(e) {  console.error("exeList => ", e);  }
        }
        exe.info = Object.assign({ FileDescription: path.basename(file), FileVersion:'', CompanyName:'' }, exe.info);
        result.push(exe);
	}
  
	return result;
}
exports.exeList = exeList;


function searchFiles(dirPath, mask = '', deep = 0, result = []) {
    const rxp = new RegExp(mask, 'i'),   dir = dirPath.replace(/\\$/,'');           if (deep >= 0) deep--;

	for (const file of fs.readdirSync(dir)) {
		const value = dir + "\\" + file;
		if (fs.statSync(value).isDirectory()) { if (deep >= 0) searchFiles(value, mask, deep, result); }
        else { if (rxp.test(value)) result.push(value); }
	}
  
	return result;
}
exports.searchFiles = searchFiles;
