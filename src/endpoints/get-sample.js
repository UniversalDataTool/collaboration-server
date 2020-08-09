const { send } = require("micro")
const cors = require("micro-cors")()
const error = require("../../utils/error")
const getSampleObject = require("../../utils/getSampleObject")
const getDB = require("../db")
const db = getDB({ databasePath: "udt.db", verbose: null })

module.exports = cors(async (req, res) => {
  const sessionId = req.params.session_id
  const sampleIndex = req.params.sample_index

  const sample = db
    .prepare(
      `SELECT  *
       FROM sample_state
       WHERE session_short_id = ? AND session_sample_index = ?`
    )
    .get(sessionId, sampleIndex)

  if (!sample)
    return error(
      res,
      404,
      `Sample "${sampleIndex}", Session "${sessionId}" Not Found`
    )

  return send(res, 200, getSampleObject(sample))
})
