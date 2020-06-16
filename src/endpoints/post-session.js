const { send } = require("micro")

module.exports = async (req, res) => {
  send(res, 200, "Hello world from POST /api/session/<session_id>!")
}
