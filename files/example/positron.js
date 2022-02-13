'use strict';

const vscode = require("vscode");
const path   = require("path");
const prt    = path.dirname(module.parent.filename);
const web    = require(`${prt}\\webpanel`);


let context, my1, my2;


function newPage() {
    const web2 = context.require('./webpanel')
    my1 = new web2.WebPage({ file: __dirname + '\\demo1.htm' });
    my2 = new web2.WebPage({ file: __dirname + '\\demo2.htm' });
    my1.create();
    my2.create();
    //const timeout = setTimeout(() => exports.deactivate(), 3000);
}


exports.activate = (ctx) => {
    context = ctx;
}


exports.deactivate = async() => {
    await my1.web.panel.dispose();
    await my2.web.panel.dispose();
}


exports.command = async (data, state) => {
    //if (data.action === 'program' && state) newPage();
}