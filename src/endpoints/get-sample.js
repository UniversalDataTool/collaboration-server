const { send } = require("micro")
const cors = require("micro-cors")()
const error = require("../utils/error")
const getDB = require("../db")
const getSampleIndexAndId = require("../utils/get-sample-index-and-id")

module.exports = cors(async (req, res) => {
  const db = getDB()
  const sessionId = req.params.session_id

  const { sampleId } = getSampleIndexAndId(sessionId, req.params.sample_index)

  const sample = db
    .prepare(
      `SELECT  *
       FROM sample_state
       WHERE session_short_id = ? AND sample_ref_id = ?`
    )
    .get(sessionId, sampleId)

  if (!sample)
    return error(
      res,
      404,
      `Sample "${sampleId}", Session "${sessionId}" Not Found`
    )

  return send(res, 200, {
    _id: sample.sample_ref_id,
    ...JSON.parse(sample.content),
  })
})
