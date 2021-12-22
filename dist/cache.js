"use strict";

Object.defineProperty(exports, "__esModule", { value: true });

const cache = {};


function get(name) {
    const obj = (!(name in cache)) ? cache[name] = {} : cache[name];
    return proxy(obj);
}

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


exports.get = get;