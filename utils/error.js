const { send } = require("micro")

const error = (res, code, message) => {
  send(res, code, message)
}

module.exports = error
