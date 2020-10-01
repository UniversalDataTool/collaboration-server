const getDB = require("../db")

module.exports = (sessionId, id) => {
  const db = getDB()

  let sampleIndex, sampleId

  if (!isNaN(parseInt(id))) {
    sampleIndex = parseInt(id)

    // TODO use the version of the summary matching the version of the patch to
    // get align sample index (make sure it matches what the submitter had)

    sampleId = db
      .prepare(
        "SELECT sample_ref_id FROM sample_state WHERE session_short_id=? AND sample_index=? LIMIT 1"
      )
      .get(sessionId, sampleIndex).sample_ref_id
  } else {
    sampleId = id

    // TODO use the version of the summary matching the version of the patch to
    // get align sample index (make sure it matches what the submitter had)

    sampleIndex = db
      .prepare(
        "SELECT sample_index FROM sample_state WHERE session_short_id=? AND sample_ref_id=? LIMIT 1"
      )
      .get(sessionId, sampleId).sample_index
  }

  return { sampleIndex, sampleId }
}
