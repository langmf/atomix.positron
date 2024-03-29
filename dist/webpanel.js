'use strict';

const vscode = require("vscode");
const fs     = require("fs");
const path   = require("path");
const root   = require("./root");

// can be used in external script files
const child  = require('child_process');
const DTB    = require("./database");
const STS    = require("./settings");


class WebPanel {
    constructor(title, data, viewType = 'simpleHTML', viewColumn, onVisibleCallback)
    {
        this.onVisibleCallback = onVisibleCallback;

        this.panel = Array.isArray(viewType) ? viewType[0] : vscode.window.createWebviewPanel(viewType, title, viewColumn);

        const webview = this.panel.webview,   file = webview.options.localResourceRoots?.[3]?.fsPath;
        
        if (data === null) {
            data = [file];
            webview.options.enableScripts = true;
        } else {
            webview.options = {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.file(root.path.pds),
                    vscode.Uri.file(root.extensionPath),
                    (Array.isArray(data) && vscode.Uri.file(path.dirname(data[0]))),
                    (Array.isArray(data) && vscode.Uri.file(data[0]))
                ]
            }
        }

        webview.onDidReceiveMessage(e => e.request ? this.vscode_Eval(e) : this[e.type](...(e.args || [])));
        
        webview.html = Array.isArray(data) ? this.web_FILE(data[0]) : data;
    }

    async vscode_Eval(e) {
        if (root.debug) console.log(e.request + '\t' + root.limitText(e.code));

        const code = e.code.startsWith('await.') ? `(async () => await ${e.code.slice(6)})()` : e.code;
        
        try       {  const res = eval(code);    e.res = res instanceof Promise ? await res : res;  }
        catch (e) {  console.error("vscode_Eval => ", e);  }
        
        this.panel.webview.postMessage(e);
    }

    web_FILE(value) {
        let text = '',   fn  = path.isAbsolute(value) ? value : path.join(root.extensionPath, 'web', path.extname(value) ? value : value + '.htm');
        
        const uri = (v) => this.panel.webview.asWebviewUri(vscode.Uri.file(v || '')).toString();

        try   {   text = fs.readFileSync(fn, 'utf-8');   }
        catch {   text = messageHTML();  }
    
        text = text.replace(/([\t ]+(?:href|src)[\t ]*=[\t ]*["'])file:\*!([^!]+)!/ig, (m,v,p) => {  return v + uri(root.objectPath(root.path, p));  });
    
        return text.replace(/^([\t ]*<head>)/im, '$1\n<base href="' + uri(path.dirname(fn)) + '/">');
    }

    web_URI(value) {
        return this.panel.webview.asWebviewUri(vscode.Uri.file((value || '').replace(/\\/g,'/'))).toString();
    }

    web_CFG() {
        return { base: this.web_URI(),  path: root.path };
    }

    sendMessage(msg, ...args) {
		this.panel.webview.postMessage({ type: msg,  args });
    }

    webview_Loaded() {
        if (this.onVisibleCallback) this.onVisibleCallback();
    }
}
exports.WebPanel = WebPanel;



class WebPage {
    constructor(name)
    {
        const i = typeof name === 'object' ? Object.assign({ type: 'posweb_Custom',  title: path.parse(name.file).name }, name) : null;

        this.name   = i ? i.name  : name;
        this.file   = i ? i.file  : "panel_"    + name + ".htm";
        this.title  = i ? i.title : "Positron " + name;
        this.type   = i ? i.type  : "posweb_"   + name;
        this.cmd    = i ? i.cmd   : "pos.web"   + name;

        this.create = (panel) => {
            if (panel) {
                this.web = new WebPanel(this.title, this.type === 'posweb_Custom' ? null : [this.file], [panel]);
            } else {
                if (this.web) this.web.panel.reveal();  else  this.web = new WebPanel(this.title, [this.file], this.type);
            }
            this.web.panel.onDidDispose(() => this.web = null);
        }
    }

    async deserializeWebviewPanel(panel, state) { this.create(panel); }
}
exports.WebPage = WebPage;



function messageHTML(text) {
    if (!text) text = `<p style="color: darksalmon; font-size: 230%;">The requested document was not found!</p><p style="color: lightslategray; font-size: 150%;">This is not yet implemented and maybe will be done in the future!</p>`;
    
    return `<!DOCTYPE html><html style="height:100%"><head><style>
    .content { text-align: center; position: absolute; top: 50%; left: 50%; margin-right: -50%; transform: translate(-50%, -50%) }
    </style></head><body style="overflow: hidden; height: 100%;"><div class="content">${text}</div></body><html>`;
}
exports.messageHTML = messageHTML;
