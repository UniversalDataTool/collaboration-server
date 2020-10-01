const { send } = require("micro")
const cors = require("micro-cors")()
// const query = require("micro-query")
const getDB = require("../db")

module.exports = cors(async (req, res) => {
  const db = getDB()
  const sessionId = req.params.session_id
  // const { file_type: fileType = "json" } = query(req)

  // Get base interface, training etc.
  const { summary_object } = db
    .prepare("SELECT * FROM latest_session_state WHERE short_id = ? LIMIT 1")
    .get(sessionId)
  const udt = { ...JSON.parse(summary_object), summary: undefined }

  // Get sample content
  const samplesRaw = db
    .prepare("SELECT * FROM sample_state WHERE session_short_id = ?")
    .all(sessionId)
  const samples = samplesRaw.map((s) => JSON.parse(s.content))
  udt.samples = samples

  // TODO convert udt to CSV or DB format based on fileType

  return send(res, 200, JSON.stringify(udt))
})
