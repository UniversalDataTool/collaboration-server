const { send } = require("micro")

const error = (res, code, message) => {
  console.log(`[${code}] ${message}`)
  send(res, code, message)
}

module.exports = error
