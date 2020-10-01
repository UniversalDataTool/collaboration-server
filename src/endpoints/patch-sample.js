const patchSession = require("./patch-session")

module.exports = (req, res) => {
  // TODO set sample path prefix
  return patchSession(req, res)
}
