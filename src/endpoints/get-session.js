const { send } = require("micro")
const cors = require("micro-cors")()
const error = require("../utils/error")
const getDB = require("../db")

module.exports = cors(async (req, res) => {
  const db = getDB()
  const sessionId = req.params.session_id

  const session = db
    .prepare(
      `SELECT short_id, summary_object, summary_version
       FROM latest_session_state
       WHERE short_id = ?
       LIMIT 1`
    )
    .get(sessionId)

  if (!session) return error(res, 404, `Session "${sessionId}" Not Found`)

  return send(res, 200, {
    shortId: session.short_id,
    summaryVersion: session.summary_version,
    ...JSON.parse(session.summary_object),
  })
})
