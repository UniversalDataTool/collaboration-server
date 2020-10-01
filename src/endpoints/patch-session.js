const { send, json } = require("micro")
const cors = require("micro-cors")()
const hash = require("../utils/hash.js")
const error = require("../utils/error")
const getDB = require("../db")
const applyPatch = require("../utils/apply-patch.js")

module.exports = cors(async (req, res) => {
  const db = getDB()
  if (req.method === "OPTIONS") return send(res, 200, "ok")
  const body = await json(req)
  const sessionId = req.params.session_id

  if (!body) return error(res, 400, "Need JSON body")
  if (!body.patch) return error(res, 400, `Body should have "patch" key`)

  await applyPatch({ patch: body.patch, db, sessionId })

  const { summary_version, summary_object } = db
    .prepare("SELECT * FROM latest_session_state WHERE short_id = ? LIMIT 1")
    .get(sessionId)

  return send(res, 200, {
    latestSummaryVersion: summary_version,
    hashOfLatestSummary: hash(summary_object),
  })
})
