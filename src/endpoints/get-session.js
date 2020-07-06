const {send} = require("micro")
const cors = require("micro-cors")()
const error = require("../../utils/error")
const getDB = require('../db')
const db = getDB({databasePath: 'udt.db', verbose: null})

module.exports = cors(async (req, res) => {
    const sessionId = req.params.session_id

    const session = db.prepare(`SELECT  *
                           FROM latest_session_state
                           WHERE short_id = ?
                           LIMIT 1`).get(sessionId);

    if (!session) return error(res, 404, `Session "${sessionId}" Not Found`)

    const samplesQueryResults = db.prepare(`SELECT  *
                           FROM latest_sample_state
                           WHERE session_state_id = ?`).all(session.session_state_id);

    const samples = []
    samplesQueryResults.forEach(sample => {
        const content = JSON.parse(sample.content)
        const annotation = JSON.parse(sample.annotation)
        samples.push(Object.assign({}, content, annotation))
    })
    session.udt_json = JSON.parse(session.udt_json)
    session.patch = JSON.parse(session.patch)
    session.udt_json.samples = samples

    return send(res, 200, session)
})

