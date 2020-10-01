const test = require("ava")
const getDB = require("../src/db")
const app = require("../app")
const http = require("http")
const micro = require("micro")
const listen = require("test-listen")
const patchJSON = require("bent")("json", "PATCH")
const getJSON = require("bent")("json", "GET", 200, 400, 404)

test("Patch Sample via PATCH /api/session", async (t) => {
  const db = getDB({ testDB: true })
  const service = micro(app)
  const url = await listen(service)

  // -----------------------
  // Setup Session
  // -----------------------

  const objectToInsert = {
    summary_object: {
      interface: {
        type: "image_segmentation",
        availableLabels: ["valid", "invalid"],
        regionTypesAllowed: ["bounding-box", "polygon", "point"],
      },
      summary: {
        samples: [
          {
            hasAnnotation: true,
            version: 0,
            _id: "sample0",
          },
          {
            hasAnnotation: false,
            version: 0,
            _id: "sample1",
          },
        ],
      },
    },
    short_id: "testPatch",
  }

  db.prepare(
    "INSERT INTO session_state (short_id, summary_object) VALUES (?, ?)"
  ).run(objectToInsert.short_id, JSON.stringify(objectToInsert.summary_object))

  db.prepare(
    "INSERT INTO sample_state (session_short_id, sample_index, content, sample_ref_id) VALUES (?, ?, ?, ?)"
  ).run(
    objectToInsert.short_id,
    0,
    JSON.stringify({
      imageUrl: "https://example.com/exampleimage.png",
      annotation: {
        regionType: "bounding-box",
        centerX: 0.43416827231856137,
        centerY: 0.3111753371868978,
        width: 0.09248554913294799,
        height: 0.0789980732177264,
        color: "hsl(297,100%,50%)",
      },
    }),
    "sample0"
  )

  db.prepare(
    "INSERT INTO sample_state (session_short_id, sample_index, content, sample_ref_id) VALUES (?, ?, ?, ?)"
  ).run(
    objectToInsert.short_id,
    1,
    JSON.stringify({
      imageUrl: "https://example.com/exampleimage2.png",
    }),
    "sample1"
  )

  // -----------------------
  // Test that we can see the created session
  // -----------------------

  const firstState = db
    .prepare(
      `SELECT  *
         FROM latest_session_state
         WHERE short_id = ?
         LIMIT 1`
    )
    .get(objectToInsert.short_id)
  t.assert(firstState)

  // -----------------------
  // Test that we can modify a sample
  // -----------------------

  const response = await patchJSON(`${url}/api/session/testPatch`, {
    patch: [
      {
        op: "replace",
        path: "/samples/1/annotation",
        value: {
          regionType: "bounding-box",
          centerX: 0.43416827231856155,
          centerY: 0.3111753371868978,
          width: 0.09248554913294799,
          height: 0.0789980732177255,
          color: "hsl(297,100%,50%)",
        },
      },
    ],
  })

  t.is(response.latestSummaryVersion, 1)

  // -----------------------
  // Test that we can modify a sample
  // -----------------------

  let { summary, summaryVersion } = await getJSON(
    `${url}/api/session/testPatch`
  )

  t.is(summaryVersion, 1)
  t.like(summary.samples[0], { version: 0, hasAnnotation: true })
  t.like(summary.samples[1], { version: 1, hasAnnotation: true })

  let sample = await getJSON(`${url}/api/session/testPatch/sample/1`)
  t.assert(sample.annotation)

  // -----------------------
  // Test that we can add a sample
  // -----------------------

  await patchJSON(`${url}/api/session/testPatch`, {
    patch: [
      {
        op: "add",
        path: "/samples/-",
        value: {
          imageUrl: "https://example.com/exampleimage3.png",
        },
      },
    ],
  })
  sample = await getJSON(`${url}/api/session/testPatch/sample/2`)
  t.is(sample.imageUrl, "https://example.com/exampleimage3.png")
  ;({ summary, summaryVersion } = await getJSON(`${url}/api/session/testPatch`))
  t.is(summary.samples.length, 3)

  // -----------------------
  // Test that we can delete a sample
  // -----------------------

  await patchJSON(`${url}/api/session/testPatch`, {
    patch: [
      {
        op: "remove",
        path: "/samples/0",
      },
    ],
  })

  sample = await getJSON(`${url}/api/session/testPatch/sample/0`)
  t.is(sample.imageUrl, "https://example.com/exampleimage2.png")
  sample = await getJSON(`${url}/api/session/testPatch/sample/1`)
  t.is(sample.imageUrl, "https://example.com/exampleimage3.png")
  ;({ summary, summaryVersion } = await getJSON(`${url}/api/session/testPatch`))
  t.is(summary.samples.length, 2)

  db.destroy()
})
