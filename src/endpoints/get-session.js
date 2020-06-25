const { send } = require("micro")
const cors = require("micro-cors")()
const error = require("../../utils/error")
const getDB = require('../db')
const db = getDB({databasePath: 'udt.db', verbose: null})

module.exports = cors(async (req, res) => {
  const sessionId = req.params.session_id

  const stmt = db.prepare(`SELECT  *
                           FROM latest_session_state
                           WHERE short_id = ?
                           LIMIT 1`);
  const result = stmt.get(sessionId);

  if (!result) return error(res, 404, `Session "${sessionId}" Not Found`)

  result.udt_json = JSON.parse(result.udt_json)
  result.patch = JSON.parse(result.patch)
  return send(res, 200, result)
})
