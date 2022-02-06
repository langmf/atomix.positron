'use strict';

const path   = require("path");
const root   = require("./root");

const Items = {};
exports.Items = Items;


exports.load = () => {
    for (const file of root.searchFiles(root.path.pds + "Plugin", '\\package\.json$', 1)) {
        const pkg = root.JsonFromFile(file);
        Items[file] = require(path.dirname(file) + "\\" + pkg.main);
    }
}