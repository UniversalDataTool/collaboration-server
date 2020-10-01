module.exports = async ({ db, sampleId, sessionId, workingSummaryObject }) => {
  db.prepare(
    "DELETE FROM sample_state WHERE sample_ref_id=? AND session_short_id=?"
  ).run(sampleId, sessionId)
  workingSummaryObject.summary.samples = workingSummaryObject.summary.samples.filter(
    (s) => s._id !== sampleId
  )
  for (const [i, sample] of workingSummaryObject.summary.samples.entries()) {
    db.prepare(
      "UPDATE sample_state SET sample_index = ? WHERE sample_ref_id = ? AND session_short_id = ?"
    ).run(i, sample._id, sessionId)
  }
}
