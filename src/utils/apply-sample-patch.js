const fjp = require("fast-json-patch")
const samplePathRe = /\/samples\/([^/]+)(.*)/
const applyRemoveSample = require("./apply-remove-sample")

module.exports = async ({ db, patch, sessionId, workingSummaryObject }) => {
  const prevSession = db
    .prepare("SELECT * FROM latest_session_state WHERE short_id=? LIMIT 1")
    .get(sessionId)

  // Get relevant sample existing data
  const m = patch.path.match(samplePathRe)
  if (!m[1]) throw new Error(`Invalid sample patch to path "${patch.path}"`)

  let sampleIndex,
    sampleId,
    sampleChangePath = m[2]

  if (!isNaN(parseInt(m[1]))) {
    sampleIndex = parseInt(m[1])

    // TODO use the version of the summary matching the version of the patch to
    // get align sample index (make sure it matches what the submitter had)

    sampleId = db
      .prepare(
        "SELECT sample_ref_id FROM sample_state WHERE session_short_id=? AND sample_index=? LIMIT 1"
      )
      .get(sessionId, sampleIndex).sample_ref_id
  } else {
    sampleId = m[1]

    // TODO use the version of the summary matching the version of the patch to
    // get align sample index (make sure it matches what the submitter had)

    sampleIndex = db
      .prepare(
        "SELECT sample_index FROM sample_state WHERE session_short_id=? AND sample_ref_id=? LIMIT 1"
      )
      .get(sessionId, sampleId).sample_index
  }

  if (!sampleChangePath && patch.op === "remove") {
    applyRemoveSample({ sessionId, db, sampleId, workingSummaryObject })
    return
  }
  if (!sampleChangePath) {
    throw new Error(`Ununusual PATCH: ${JSON.stringify(patch)}`)
  }

  const sample = db
    .prepare(
      "SELECT * FROM sample_state WHERE session_short_id=? AND sample_ref_id=? LIMIT 1"
    )
    .get(sessionId, sampleId)

  const oldSampleContent = JSON.parse(sample.content)

  const newSampleContent = fjp.applyPatch(oldSampleContent, [
    {
      ...patch,
      path: sampleChangePath,
    },
  ]).newDocument

  // Update sample in database with new content and new version

  db.prepare(
    "UPDATE sample_state SET sample_version=?, content=? WHERE session_short_id=? AND sample_ref_id=?"
  ).run(
    sample.sample_version + 1,
    JSON.stringify(newSampleContent),
    sessionId,
    sampleId
  )

  workingSummaryObject.summary.samples[sampleIndex] = {
    hasAnnotation: Boolean(newSampleContent.annotation),
    version: sample.sample_version + 1,
    _id: sampleId,
  }
}
