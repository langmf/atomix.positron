"use strict";

const cache = {};
exports.$ = cache;


function get(name) {
    if (typeof name === 'object') name = name.uri.fsPath;
    const obj = (!(name in cache)) ? cache[name] = {} : cache[name];
    return proxy(obj);
}
exports.get = get;


const proxy = (input) => {
    const handler = {
        get: (obj, prop) => {
            if (prop === '$') return obj;
            obj[prop] = obj[prop] || {};
            return proxy(obj[prop]);
        }
    };
    return new Proxy(input, handler);
};
