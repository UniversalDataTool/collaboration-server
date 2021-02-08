module.exports = async ({ db, patch, sessionId, workingSummaryObject }) => {
  const numSamples = workingSummaryObject.summary.samples.length
  db.prepare(
    "INSERT INTO sample_state (sample_index, sample_ref_id, session_short_id, content) VALUES (?, ?, ?, ?)"
  ).run(numSamples, patch.value._id, sessionId, JSON.stringify(patch.value))

  const sample = db
    .prepare(
      "SELECT * FROM sample_state WHERE session_short_id = ? AND sample_index= ?"
    )
    .get(sessionId, numSamples)

  workingSummaryObject.summary.samples[numSamples] = {
    _id: sample.sample_ref_id,
    hasAnnotation: Boolean(JSON.parse(sample.content).annotation),
    version: sample.sample_version,
  }
}
