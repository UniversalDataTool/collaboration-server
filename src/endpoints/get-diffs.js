const { send } = require("micro")

module.exports = async (req, res) => {
  send(res, 200, "Hello world from /api/session/<session_id>/diffs!")
}
