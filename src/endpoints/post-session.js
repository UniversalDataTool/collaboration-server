const { send, json } = require("micro")
const cors = require("micro-cors")()
const randomstring = require("randomstring")
const error = require("../utils/error")
const getDB = require("../db")

module.exports = cors(async (req, res) => {
  const db = getDB()
  if (req.method === "OPTIONS") return send(res, 200, "ok")
  const body = await json(req, { limit: "100mb" })
  if (!body) return error(res, 400, "Need JSON body")
  if (!body.udt) return error(res, 400, 'Body should have "udt" key')

  const samples = body.udt.samples
  const udt = body.udt
  const shortId = randomstring.generate({ length: 6, readable: true })

  const samplesSummary = []
  if (Array.isArray(samples)) {
    const samplesQueries = []
    for (const [index, sample] of samples.entries()) {
      const newSampleId = db.randomid()
      samplesQueries.push(
        db
          .prepare(
            "INSERT INTO sample_state (session_short_id, sample_index, content, sample_ref_id) VALUES (?, ?, ?, ?)"
          )
          .run(shortId, index, JSON.stringify(sample), newSampleId)
      )

      samplesSummary.push({
        hasAnnotation: false,
        version: 0,
        _id: newSampleId,
      })
    }

    await Promise.all(samplesQueries)
  }

  const summary_object = {
    ...udt,
    samples: undefined,
    summary: {
      samples: samplesSummary,
    },
  }

  await db
    .prepare(
      "INSERT INTO session_state (short_id, summary_object) VALUES (?, ?)"
    )
    .run(shortId, JSON.stringify(summary_object))

  return send(res, 200, { short_id: shortId, summary_version: 0 })
})
