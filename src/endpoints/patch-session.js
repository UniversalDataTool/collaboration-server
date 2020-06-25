const {send, json} = require("micro")
const cors = require("micro-cors")()
const fjp = require("fast-json-patch")
const hash = require("../../utils/hash.js")
const error = require("../../utils/error")
const getDB = require('../db')
const db = getDB({databasePath: 'udt.db', verbose: null})

module.exports = cors(async (req, res) => {
    if (req.method === "OPTIONS") return send(res, 200, "ok")
    const body = await json(req)
    const sessionId = req.params.session_id

    if (!body) return error(res, 400, "Need JSON body")
    if (!body.patch) return error(res, 400, `Body should have "patch" key`)

    const stmt = db.prepare('SELECT * FROM latest_session_state WHERE short_id = ? LIMIT 1');
    const result = stmt.get(sessionId);

    if (!result) return error(res, 404, "Session Not Found")

    let newJSON = {...JSON.parse(result.udt_json)}
    fjp.applyPatch(newJSON, body.patch)

    const latestVersion = result.version + 1

    const insertStmt = db.prepare(`
        INSERT INTO session_state
        (previous_session_state_id, short_id, user_name, patch, version, udt_json)
        VALUES (?, ?, ?, ?, ?, ?)`);

    insertStmt.run(
        result.session_state_id,
        sessionId,
        body.userName || null,
        JSON.stringify(body.patch),
        latestVersion,
        JSON.stringify(newJSON)
    );

    return send(res, 200, {latestVersion, hashOfLatestState: hash(newJSON)})
})