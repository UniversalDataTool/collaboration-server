const { router, get, post, patch, options } = require("microrouter")

const getDiffsEndpoint = require("./endpoints/get-diffs.js")
const postSessionEndpoint = require("./endpoints/post-session.js")
const patchSessionEndpoint = require("./endpoints/patch-session.js")
const getSessionEndpoint = require("./endpoints/get-session.js")
const getSampleEndpoint = require("./endpoints/get-sample.js")
const patchSampleEndpoint = require("./endpoints/patch-sample.js")
const downloadEndpoint = require("./endpoints/download-session.js")

module.exports = router(
  post("/api/session", postSessionEndpoint),
  options("/api/session", postSessionEndpoint),
  get("/api/session/:session_id/download", downloadEndpoint),
  get("/api/session/:session_id/diffs", getDiffsEndpoint),
  options("/api/session/:session_id/diffs", getDiffsEndpoint),
  get("/api/session/:session_id/sample/:sample_index", getSampleEndpoint),
  patch("/api/session/:session_id/sample/:sample_index", patchSampleEndpoint),
  get("/api/session/:session_id", getSessionEndpoint),
  patch("/api/session/:session_id", patchSessionEndpoint),
  options("/api/session/:session_id", patchSessionEndpoint)
)
