const { send, json } = require("micro")
const cors = require("micro-cors")()
const randomstring = require("randomstring")
const error = require("../../utils/error")
const getDB = require('../db')
const db = getDB({databasePath: 'udt.db', verbose: null})

module.exports = cors(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 200, "ok")
  const body = await json(req)
  if (!body) return error(res, 400, "Need JSON body")
  if (!body.udt) return error(res, 400, 'Body should have "udt" key')

  const samples = body.udt.samples
  delete body.udt.samples
  const udt = JSON.stringify(body.udt)
  const shortId = randomstring.generate({ length: 6, readable: true })

  const sessionState = await db.prepare('INSERT INTO session_state (short_id, udt_json) VALUES (?, ?)').run(shortId, udt);
  const sessionStateId = sessionState.lastInsertRowid

  const samplesQueries = []
  samples.forEach((sample, index) => {
    samplesQueries.push(db.prepare('INSERT INTO sample_state (session_state_id, session_sample_id, content) VALUES (?, ?, ?)').run(sessionStateId, index, JSON.stringify(sample)));
  })

  await Promise.all(samplesQueries)

  return send(res, 200, { short_id: shortId, version: 0 })
})