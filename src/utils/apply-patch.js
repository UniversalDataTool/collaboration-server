const applySamplePatch = require("./apply-sample-patch")
const applyAddSamplePatch = require("./apply-add-sample-patch")
const applySummaryPatch = require("./apply-summary-patch")

module.exports = async ({ db, patch: patches, sessionId, userName = null }) => {
  const session = db
    .prepare("SELECT * FROM latest_session_state WHERE short_id = ? LIMIT 1")
    .get(sessionId)

  if (!session) throw new Error("Session Not Found")

  const workingSummaryObject = JSON.parse(session.summary_object)

  for (const patch of patches) {
    if (patch.path === "/samples/-" && patch.op === "add") {
      await applyAddSamplePatch({ db, patch, sessionId, workingSummaryObject })
    } else if (patch.path.startsWith("/samples/")) {
      await applySamplePatch({ db, patch, sessionId, workingSummaryObject })
    } else {
      await applySummaryPatch({ db, patch, sessionId, workingSummaryObject })
    }
  }

  // Commit new summary / session_state
  db.prepare(
    `
    INSERT INTO session_state (short_id, summary_version, summary_object, patch, user_name)
      VALUES (?, ?, ?, ?, ?)
  `.trim()
  ).run(
    session.short_id,
    session.summary_version + 1,
    JSON.stringify(workingSummaryObject),
    JSON.stringify(patches),
    userName
  )
}
