#!/usr/bin/env node

const micro = require("micro")
const app = require("../app")
const service = micro(app)
service.listen(3000)
