const { send, json } = require("micro");
const cors = require("micro-cors")();
const fjp = require("fast-json-patch");
const hash = require("../../utils/hash.js");
const error = require("../../utils/error");
const getSessionUDT = require("../../utils/getSessionUDT");
const getDB = require("../db");
const db = getDB({ databasePath: "udt.db", verbose: null });

module.exports = cors(async (req, res) => {
  if (req.method === "OPTIONS") return send(res, 200, "ok");
  const body = await json(req);
  const sessionId = req.params.session_id;

  if (!body) return error(res, 400, "Need JSON body");
  if (!body.patch) return error(res, 400, `Body should have "patch" key`);

  const session = db
    .prepare("SELECT * FROM latest_session_state WHERE short_id = ? LIMIT 1")
    .get(sessionId);

  if (!session) return error(res, 404, "Session Not Found");

  const samplePatches = body.patch.filter((patch) =>
    patch.path.includes("/samples")
  );
  const udtPatches = body.patch.filter(
    (patch) => !patch.path.includes("/samples")
  );

  let newJSON = { ...JSON.parse(session.udt_json) };
  fjp.applyPatch(newJSON, udtPatches);

  await patchSamples(session.short_id, samplePatches);
  const latestVersion = session.version + 1;

  const insertStmt = db.prepare(`
        INSERT INTO session_state
        (previous_session_state_id, short_id, user_name, patch, version, udt_json)
        VALUES (?, ?, ?, ?, ?, ?)`);

  insertStmt.run(
    session.session_state_id,
    sessionId,
    body.userName || null,
    JSON.stringify(body.patch),
    latestVersion,
    JSON.stringify(newJSON)
  );

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

  newJSON.samples = samples;

  return send(res, 200, { latestVersion, hashOfLatestState: hash(newJSON) });
});

const patchCreateSamples = async (sessionId, samplesToAdd) => {
  const samplesQueries = [];
  if (samplesToAdd.length) {
    let sessionSampleIndex = -1;
    const latestSample = db
      .prepare(
        "SELECT * FROM sample_state WHERE session_short_id = ? ORDER BY session_sample_index DESC LIMIT 1"
      )
      .get(sessionId);
    if (latestSample) {
      sessionSampleIndex = parseInt(latestSample.session_sample_index);
    }

    samplesToAdd.forEach((sample) => {
      sessionSampleIndex += 1;
      samplesQueries.push(
        db
          .prepare(
            "INSERT INTO sample_state (session_short_id, session_sample_index, content) VALUES (?, ?, ?)"
          )
          .run(sessionId, sessionSampleIndex, JSON.stringify(sample))
      );
    });
  }
  return samplesQueries;
};

const patchRemoveSamples = async (sessionId, patches) => {
  if (patches.length)
    for (const index in patches) {
      const patch = patches[index];
      const pathArray = patch.path.split("/");
      const indexToRemove = pathArray[2];

      await db
        .prepare(
          "DELETE FROM sample_state WHERE session_short_id = ? AND session_sample_index = ? "
        )
        .run(sessionId, indexToRemove);
      await db
        .prepare(
          `UPDATE sample_state
                        SET summary_version = summary_version + 1, session_sample_index = session_sample_index - 1
                        WHERE session_short_id = ? AND session_sample_index > ?;`
        )
        .run(sessionId, indexToRemove);
    }
};

const patchSamplesAnnotation = async (sessionId, samplePatches) => {
  const sampleIndexes = {};
  samplePatches.forEach((patch) => {
    const pathArray = patch.path.split("/");
    const sessionSampleIndex = pathArray[2];
    sampleIndexes[sessionSampleIndex] = { sessionSampleIndex };
  });

  const samplesArray = [];
  const samples = db
    .prepare(
      "SELECT * FROM sample_state WHERE session_short_id = ? ORDER BY session_sample_index ASC"
    )
    .all(sessionId);
  samples.forEach((sample) => {
    const sessionUDT = getSessionUDT(sample);
    samplesArray.push({
      ...sessionUDT,
      summary_version: parseInt(sample.summary_version),
      session_sample_index: sample.session_sample_index,
    });
  });
  let newJSON = { samples: samplesArray };
  fjp.applyPatch(newJSON, samplePatches);

  const queries = [];
  Object.keys(sampleIndexes).forEach((sampleIndex) => {
    const sample = samplesArray[sampleIndex];
    const session_sample_index = sample.session_sample_index;
    const summary_version = sample.summary_version + 1;
    const annotation = sample.annotation;

    delete sample.session_sample_index;
    delete sample.summary_version;
    delete sample.annotation;

    queries.push(
      db
        .prepare(
          `UPDATE sample_state
          SET summary_version = ?, annotation = ?, content = ?
          WHERE session_short_id = ? AND session_sample_index = ?;`
        )
        .run(
          summary_version,
          JSON.stringify(annotation),
          JSON.stringify(sample),
          sessionId,
          session_sample_index
        )
    );
  });

  return queries;
};

const patchSamples = async (sessionId, samplePatches) => {
  const samplesToAdd = [];
  const samplesToRemove = [];
  const samplesAnnotationPatches = [];
  samplePatches.forEach((patch) => {
    if (patch.op === "add" && /\/samples\//.test(patch.path)) {
      samplesToAdd.push(patch.value);
    } else if (/samples\/[0-9]\/\w/.test(patch.path)) {
      samplesAnnotationPatches.push(patch);
    } else if (patch.op === "remove" && /samples\/[0-9]$/.test(patch.path)) {
      samplesToRemove.push(patch);
    }
  });

  const patchCreateSamplesQuery = await patchCreateSamples(
    sessionId,
    samplesToAdd
  );
  const patchSamplesAnnotationQueries = await patchSamplesAnnotation(
    sessionId,
    samplesAnnotationPatches
  );
  await Promise.all([
    ...patchCreateSamplesQuery,
    ...patchSamplesAnnotationQueries,
  ]);
  await patchRemoveSamples(sessionId, samplesToRemove);
};
