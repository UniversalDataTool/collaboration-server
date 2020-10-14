const test = require("ava")
const getDB = require("../src/db")
const app = require("../app")
const micro = require("micro")
const listen = require("test-listen")
const postJSON = require("bent")("json", "POST")

test("Create session", async (t) => {
  const db = await getDB({ testDB: true })
  const service = micro(app)
  const url = await listen(service)

  const udt = {
    interface: {
      type: "image_segmentation",
      availableLabels: ["valid", "invalid"],
      regionTypesAllowed: ["bounding-box", "polygon", "point"],
    },
    samples: [],
  }

  const numSamples = 100000
  for (let i = 0; i < numSamples; i++) {
    udt.samples.push({
      imageUrl:
        "https://s3.amazonaws.com/asset.workaround.online/example-jobs/sticky-notes/image1.jpg",
    })
  }

  const startPostJSONTime = Date.now()
  const response = await postJSON(`${url}/api/session`, {
    udt,
  })
  console.log(
    `Time to create ${numSamples} sample session: ${(
      (Date.now() - startPostJSONTime) /
      1000
    ).toFixed(1)}s`
  )
  t.assert(response.short_id)
  const addedSession = db
    .prepare(
      `SELECT  *
       FROM latest_session_state
       WHERE short_id = ?
       LIMIT 1`
    )
    .get(response.short_id)
  t.assert(addedSession)
  t.deepEqual(JSON.parse(addedSession.summary_object).interface, {
    type: "image_segmentation",
    availableLabels: ["valid", "invalid"],
    regionTypesAllowed: ["bounding-box", "polygon", "point"],
  })
  t.like(JSON.parse(addedSession.summary_object).summary.samples[0], {
    hasAnnotation: false,
    version: 0,
  })
  t.is(
    JSON.parse(addedSession.summary_object).summary.samples.length,
    numSamples
  )

  db.destroy()
})
