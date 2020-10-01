#!/usr/bin/env node

const micro = require("micro")
const app = require("../app")
const service = micro(app)
console.log("Running UDT collaboration server on port 3000")
service.listen(3000)
