#!/usr/bin/env node

import fs from 'fs';
import stringify from "json-stringify-pretty-compact";

// Display help
if(process.argv.length < 3 || process.argv[2] === `help` || process.argv[2] === `--help`) {
    console.log(`Format a file with https://github.com/lydell/json-stringify-pretty-compact

Usage:

json-spc [--indent=<spaces>] [--max-length=<characters>] <file.json> [> newfile.json]


Options:

--indent: Defaults to 2. Works exactly like the third parameter of JSON.stringify.
--max-length: Defaults to 80. Lines will be tried to be kept at maximum this many characters long.
    `);
    process.exit(0);
}

// Parse command line options
const opts = {}
if(process.argv.length > 3) {
    const optMap = {
        "--indent": `indent`,
        "--max-length": `maxLength`,
    }
    try {
        const args = process.argv.slice(2, process.argv.length - 1);
        for(const arg of args) {
            const parts = arg.split(`=`);
            if(parts.length !== 2) {
                throw new Error(`Invalid argument format: ${arg}`);
            }
            const key = parts[0];
            const opt = optMap[key];
            if(opt === undefined) {
                throw new Error(`Unknown argument: ${key}`);
            }
            const val = parseInt(parts[1]);
            opts[opt] = val;
        }
    } catch (e) {
        console.error(`Error parsing arguments!`, e);
        process.exit(3);
    }
}

// Read file
const path = process.argv[process.argv.length - 1];
if(!fs.existsSync(path)) {
    console.error(`File not found: ${path}`);
    process.exit(1);
}

// Read file
const text = fs.readFileSync(path, 'utf-8');
let json;
try {
    json = JSON.parse(text);
} catch (e) {
    console.error(`Error parsing JSON!`, e);
    process.exit(2);
}

// Format
const output = stringify(json, opts);

// Write output
console.log(output);
