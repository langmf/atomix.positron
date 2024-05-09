'use strict';

const vscode = require("vscode");
const path   = require("path");
const P      = path.dirname(module.parent.filename);

const root   = require(`${P}\\root`);

let context;


exports.activate    = (ctx)  => { context = ctx }
exports.deactivate = async() => {}


exports.command = async (data, state) =>
{
    if (data.action === 'compile' && state)
    {
        root.PS().beep(1000, 300);
        await root.sleep(500);
        await root.PS({ cwd: __dirname}).play('compile.wav');
        
        if (data.res.ok)  await root.PS().speak('Compilation completed successfully');
        else              await root.PS().speak('Errors occurred during compilation');
    }
}