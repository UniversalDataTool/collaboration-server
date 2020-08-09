const { send } = require("micro")
const cors = require("micro-cors")()
const error = require("../../utils/error")
const getSampleObject = require("../../utils/getSampleObject")
const getDB = require("../db")
const db = getDB({ databasePath: "udt.db", verbose: null })

module.exports = cors(async (req, res) => {
  const sessionId = req.params.session_id

  const session = db
    .prepare(
      `SELECT  *
       FROM latest_session_state
       WHERE short_id = ?
       LIMIT 1`
    )
    .get(sessionId)

  if (!session) return error(res, 404, `Session "${sessionId}" Not Found`)

  session.summary_samples = JSON.parse(session.summary_samples)
  session.patch = JSON.parse(session.patch)

  return send(res, 200, session)
})
