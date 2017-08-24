#!/usr/bin/env node

const stringify = require('.')
const minimist = require('minimist')

var argv = require('minimist')(process.argv.slice(2));

if (argv.help) {
  console.log('Usage: jspc [--indent=chars_to_indent] [--maxLength=max_line_length]');
  process.exit();
}

const indent = Number(argv.indent || 2)
const maxLength = Number(argv.maxLength || 80)

// Read from stdin
const chunks = []
process.stdin.on('data', data => chunks.push(data.toString('utf8')))
process.stdin.on('end', () => {
  const data = chunks.join('')
  // Write to stdout
  const obj = JSON.parse(data)
  process.stdout.write(stringify(obj, {indent, maxLength}))
})

process.stdin.resume()
