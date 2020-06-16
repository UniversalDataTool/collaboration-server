const { router, get, post, patch } = require("microrouter")

const getDiffsEndpoint = require("./endpoints/get-diffs.js")
const postSessionEndpoint = require("./endpoints/post-session.js")
const patchSessionEndpoint = require("./endpoints/patch-session.js")
const getSessionEndpoint = require("./endpoints/get-session.js")

module.exports = router(
  post("/api/session", postSessionEndpoint),
  get("/api/session/:session_id", getSessionEndpoint),
  patch("/api/session/:session_id", patchSessionEndpoint),
  get("/api/session/:session_id/diffs", getDiffsEndpoint)
)
