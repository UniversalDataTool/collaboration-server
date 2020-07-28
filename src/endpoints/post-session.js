const { send, json } = require("micro")
const cors = require("micro-cors")()
const randomstring = require("randomstring")
const error = require("../../utils/error")
const getDB = require("../db")
const db = getDB({ databasePath: "udt.db", verbose: null })

module.exports = cors(async (req, res) => {
  if (req.method === "OPTIONS") return send(res, 200, "ok")
  const body = await json(req)
  if (!body) return error(res, 400, "Need JSON body")
  if (!body.udt) return error(res, 400, 'Body should have "udt" key')

  const samples = body.udt.samples
  const udt = body.udt
  const shortId = randomstring.generate({ length: 6, readable: true })

  const samplesSummary = []
  if (Array.isArray(samples)) {
    const samplesQueries = []
    samples.forEach((sample, index) => {
      samplesQueries.push(
        db.prepare("INSERT INTO sample_state (session_short_id, session_sample_index, content) VALUES (?, ?, ?)")
          .run(shortId, index, JSON.stringify(sample))
      )

      samplesSummary.push({ hasAnnotation: false, version: 1 })
    })

    await Promise.all(samplesQueries)
  }

  const summary_samples = {
    interface: udt.interface,
    summary: {
      samples: samplesSummary
    }
  }

  await db
      .prepare("INSERT INTO session_state (short_id, summary_samples) VALUES (?, ?)")
      .run(shortId, JSON.stringify(summary_samples))

  return send(res, 200, { short_id: shortId, summary_version: 0 })
})
