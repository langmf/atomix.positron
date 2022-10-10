'use strict';

const vscode = acquireVsCodeApi(),   vscode_REQ = {};


const URI = {
	file(v)             {  return this.encode(v, 'file:///');  },
	parse(v)            {  return this.base + this.encode(v);  },
	encode(v,s)         {  return (s || '') + encodeURI((v || '').replace(/\\/g,'/'));    },
	ready:              vscode_Eval().this.web_CFG().then(v => { Object.assign(URI, v) })
}

const STATE = {
	get(v = null)       {  const s = vscode.getState() || {};	return v === null ? s : s[v] || (s[v] = {});  },
	set(v = null)       {  vscode.setState(v === null ? {} : Object.assign(this.get(), v));  }
}


window.addEventListener('message', event => {
	if (vscode_CBK(event.data)) return;
});


function vscode_CBK(data) {
	if (!data.request) return;		const cfg = vscode_REQ[data.request];		clearTimeout(cfg.tmr);
	cfg.resolve(data.res);			delete vscode_REQ[data.request];			return;
}


async function vscode_Request(req = {}) {
	const code = req.code.replace(/^\./, ''),   request = generateUUID(),   cfg = vscode_REQ[request] = {};
	
	vscode.postMessage({ request, code });
	
	return new Promise(resolve => {
		cfg.resolve = resolve;		const time = req.time || 5000;		if (time >= 0) cfg.tmr = setTimeout(() => resolve(), time);
	});
}


function vscode_Eval(req = {}) {
	if      (typeof req === 'string')  req = { code:req };
	else if (typeof req === 'number')  req = { time:req };
	else if (typeof req === 'boolean') req = { call:req };
	
	req = Object.assign({ code:'', call:true }, req);

	const ret = (v) => (v = vscode_Request.bind(null, req), req.call ? v() : v);		if (req.code) return ret();

	const handler = (prop, value = '', isProxy = true) => {
		if      (prop === '.$') isProxy = false;
		else if (prop === '.*') isProxy = !req.call;
		else  					req.code += prop;
		req.code += value;		return isProxy ? proxy : ret();
	}

	const proxy = new Proxy(()=>{}, {
		get:	(o, prop)			=> handler('.' + prop),
		set:	(o, prop, value)	=> handler('.$', `.${prop}=${JSON.stringify(value)}` ),
		apply:	(o, targ, args)		=> handler('.*', `(${JSON.stringify(args).replace(/^\[|\]$/g,'')})`),
	});

	return proxy;
}


function generateUUID() {
    let d = new Date().getTime(),  d2 = (performance && performance.now && performance.now() * 1000) || 0;
    
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        var r = Math.random() * 16;
        if (d > 0) { r = (d + r)%16 | 0;   d = Math.floor(d/16); } else { r = (d2 + r)%16 | 0;   d2 = Math.floor(d2/16); }
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16).toUpperCase();
    });
}


function objectPath(obj, value, def) {
	value = typeof value !== 'string' ? value : value.split(/\.|\[([^\]]+)\]/g).reduce((a,k) => (k && a.push(k), a), []);
	for (const i of value) if (i in obj) obj = obj[i];  else  return def;
	return obj;
}


function limitText(txt, count = 140) {
	return txt.slice(0, count) + (txt.length > count ? " ... SIZE = " + txt.length : "");
}


function openURL(value) {
	return vscode_Eval().root.openURL(value);
}


function parse_OpenURL(nameClass = '.openurl') {
	document.querySelectorAll(nameClass).forEach(el => { if (!el.onclick) el.onclick = (e) => { vscode_Eval().root.openURL(e.target.pathname || e.target.href); } });
}


function parse_Tooltip(value = '[data-bs-toggle="tooltip"]') {
	[].slice.call(document.querySelectorAll(value)).map(el => new bootstrap.Tooltip(el));
}


function parse_SVG() {
	$('div[svg]').each(function(){
		const n = $(DATA_IMAGES[this.getAttribute("svg")])[0];
		this.removeAttribute("svg");
		for (let i = 0; i < this.attributes.length; i++) { const a = this.attributes[i];	n.setAttribute(a.nodeName, a.nodeValue); }
		$(this).replaceWith(n);
	});
}


async function parse_FileURL() {
	await URI.ready;
	const f = 'file:*';
	$(`*[href^="${f}"], *[src^="${f}"]`).each(async function() {
		const v = $(this).attr("href") ? 'href' : 'src',   i = $(this).attr(v).slice(f.length);
		const url = i.replace(/!([^!]+)!/g, (m,t) => objectPath(URI.path, t));
		$(this).attr(v, URI.parse(url));
	});
}


function parse_TAB() {
	for (const [k,v] of Object.entries(STATE.get('tabs'))) {
		if (k.startsWith('nav-tab')) bootstrap.Tab.getOrCreateInstance(document.querySelector(`#${k}>#${v}`)).show();
	}

	$('.nav-tabs button').on('click', function() {
		const tabs = STATE.get('tabs');		tabs[this.parentElement.id] = this.id;		STATE.set({tabs});
	});
}


async function parse_ALL() {
	//parse_SVG();
	parse_Tooltip();
	parse_OpenURL();
	parse_FileURL();
}


document.addEventListener('DOMContentLoaded', () => { vscode.postMessage({type: 'webview_Loaded'}); }, false);
