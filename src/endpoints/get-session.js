const { send } = require("micro");
const cors = require("micro-cors")();
const error = require("../../utils/error");
const getSessionUDT = require("../../utils/getSessionUDT");
const getDB = require("../db");
const db = getDB({ databasePath: "udt.db", verbose: null });

module.exports = cors(async (req, res) => {
  const sessionId = req.params.session_id;

  const session = db
    .prepare(
      `SELECT  *
                           FROM latest_session_state
                           WHERE short_id = ?
                           LIMIT 1`
    )
    .get(sessionId);

  if (!session) return error(res, 404, `Session "${sessionId}" Not Found`);

  const samplesQueryResults = db
    .prepare(
      `SELECT  *
                           FROM sample_state
                           WHERE session_short_id = ?`
    )
    .all(session.short_id);

  const samples = [];
  samplesQueryResults.forEach((sample) => {
    const sessionUDT = getSessionUDT(sample);
    samples.push(sessionUDT);
  });
  session.udt_json = JSON.parse(session.udt_json);
  session.patch = JSON.parse(session.patch);
  session.udt_json.samples = samples;

  return send(res, 200, session);
});
