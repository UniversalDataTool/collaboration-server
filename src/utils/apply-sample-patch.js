const fjp = require("fast-json-patch")
const samplePathRe = /\/samples\/([^/]+)(.*)/
const applyRemoveSample = require("./apply-remove-sample")
const getSampleIndexAndId = require("./get-sample-index-and-id")

module.exports = async ({ db, patch, sessionId, workingSummaryObject }) => {
  // Get relevant sample existing data
  const m = patch.path.match(samplePathRe)
  if (!m[1]) throw new Error(`Invalid sample patch to path "${patch.path}"`)

  let { sampleIndex, sampleId } = getSampleIndexAndId(sessionId, m[1])
  let sampleChangePath = m[2]

  if (patch.op === "replace" && !sampleChangePath) {
    sampleChangePath = ""
  }

  if (!sampleChangePath && patch.op === "remove") {
    applyRemoveSample({ sessionId, db, sampleId, workingSummaryObject })
    return
  }

  if (!sampleChangePath && typeof sampleChangePath !== "string") {
    throw new Error(`Unusual PATCH: ${JSON.stringify(patch)}`)
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
