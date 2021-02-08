const micro = require("micro")
const { router, get, post, patch, options } = require("microrouter")

const getDiffsEndpoint = require("./endpoints/get-diffs.js")
const postSessionEndpoint = require("./endpoints/post-session.js")
const patchSessionEndpoint = require("./endpoints/patch-session.js")
const getSessionEndpoint = require("./endpoints/get-session.js")
const getSampleEndpoint = require("./endpoints/get-sample.js")
const patchSampleEndpoint = require("./endpoints/patch-sample.js")
const downloadEndpoint = require("./endpoints/download-session.js")

const welcome = (req, res) =>
  micro.send(
    res,
    200,
    "This is a UDT Collaboration Server, learn more at https://github.com/UniversalDataTool/collaboration-server"
  )
const notfound = (req, res) => micro.send(res, 404)

module.exports = router(
  get("/api/session/:session_id/download", downloadEndpoint),
  get("/api/session/:session_id/diffs", getDiffsEndpoint),
  options("/api/session/:session_id/diffs", getDiffsEndpoint),
  get("/api/session/:session_id/sample/:sample_index", getSampleEndpoint),
  patch("/api/session/:session_id/sample/:sample_index", patchSampleEndpoint),
  get("/api/session/:session_id", getSessionEndpoint),
  patch("/api/session/:session_id", patchSessionEndpoint),
  options("/api/session/:session_id", patchSessionEndpoint),
  post("/api/session", postSessionEndpoint),
  options("/api/session", postSessionEndpoint),
  get("/", welcome),
  get("/*", notfound)
)
