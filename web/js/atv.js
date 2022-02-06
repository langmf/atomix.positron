
const ATV_TPL = (str, data) => {
    const obj = new ATV(null, false);       return (typeof str === 'undefined') ? obj : obj.template(str, data);
}


class ATV {
    #cache = {};


    constructor(cfg, listen = true){
        this.$cfg    = cfg || {};
        this.$el     = this.$cfg.el;
        this.$routes = this.$cfg.routes || {};

        if (listen) {
            window.addEventListener('click', this.router.bind(this));
            window.addEventListener('load',  this.router.bind(this, '/'));
        }
    }


    parseUrl(v) {
        var t = (v || "").replace(/\/+$/, "").replace(/^\/+/, "").split("#"),    h = t.length > 1 ? t.pop() : "";
        var a = t.join("").split(/\?(.*)?$/),    q = a.slice(1).join(""),    s = q.split("&"),    p = {};
        
        for (let i = 0; i < s.length; i++) {
            let x = s[i].split("=");        if (x[0] === "") continue;          let k = decodeURIComponent(x[0]),    v = x[1] || "";
            if (!p[k]) { p[k] = decodeURIComponent(v); } else { if (!Array.isArray(p[k])) p[k] = [p[k]];    p[k].push(decodeURIComponent(v)); }
        }
        
        return { url: a[0], query: q, hash: h, param: p };
    }
    
    
    parseData(v, ext) {
        if (Array.isArray(v)) { let r = {};     for (var i = 0; i < v.length; ++i) r['$' + i] = v[i];     return Object.assign(r, ext); }
        else if (typeof v === 'function')       return v.call(v = ext) || v;
        else if (typeof v === 'object')         return Object.assign(v, ext);
        return Object.assign({data: v}, ext);
    }
    
    
	template(str, data) {
        var str  = (Array.isArray(str) ? document.getElementById(str[0]).innerHTML : (typeof str === 'function' ? str.call(this) : str));
		
        var code = str.replace(/[\r\t\n]/g, " ")
					  .split("<%").join("\t")
					  .replace(/((^|%>)[^\t]*)'/g, "$1\r")
					  .replace(/\t#(.*?)%>/g, "")
					  .replace(/\t=(.*?)%>/g, "',$1,'")
					  .split("\t").join("');")
					  .split("%>").join("p.push('")
					  .split("\r").join("\\'");
        
        var fn = this.#cache[str] = this.#cache[str] || new Function("obj", `var p = [], print = function(){p.push.apply(p,arguments);}; with(obj){p.push('${code}');}return p.join('');`); 
        
        return data ? fn(data) : fn;
	}


    render(v, req) {
        var tpl = Array.isArray(v) ? v[0] : v.tpl,  data = Array.isArray(v) ? v[1] : v.data,  el = Array.isArray(v) ? v[2] : v.el;
        
        var obj = (typeof el === 'string' ? document.querySelector(el) : el) || (typeof this.$el === 'string' ? document.querySelector(this.$el) : this.$el);
        
        tpl = tpl || '';        data = this.parseData(data, {$req: req});        if (obj) obj.innerHTML = this.template(tpl, data);
        
        return [tpl, data];
    }
    
    
    router(v) {
        if (typeof v !== 'string') {
            v = event.target;
            while (v && !(v instanceof HTMLAnchorElement) && !v.getAttribute?.('path')) v = v.parentNode;
            if (!v || typeof (v = v.getAttribute('path')) !== 'string') return;
        }

        for (var i = 10; --i && typeof v === 'string';) var req = this.parseUrl(v),  v = this.$routes[req.url] || this.$routes['*'];
        
        if (typeof v === 'function') v = v.call(this);
        
        if (v) { event.preventDefault();    event.stopImmediatePropagation();    return this.render(v, req); }
    }
    
    
    route(path, tpl, data) {
        return this.$routes[path] = { tpl, data };
    }

}