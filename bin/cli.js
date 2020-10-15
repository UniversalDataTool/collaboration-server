#!/usr/bin/env node

const run = require("../index")
// eslint-disable-next-line
const { argv } = require("yargs/yargs")(process.argv)
console.log({ argv })
run(argv)
