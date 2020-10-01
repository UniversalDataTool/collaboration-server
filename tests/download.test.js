const test = require("ava")
const getDB = require("../src/db")
const app = require("../app")
const micro = require("micro")
const listen = require("test-listen")
const getJSON = require("bent")("json", "GET", 200, 400, 404)

test("Download dataset", async (t) => {
  const db = await getDB({ testDB: true })
  const service = micro(app)
  const url = await listen(service)

  // Create dataset with one sample
  db.prepare(
    "INSERT INTO session_state (short_id, summary_object) VALUES (?, ?)"
  ).run(
    "testDownload",
    JSON.stringify({
      interface: { type: "image_classification" },
      summary: {
        samples: [
          {
            _id: "testsample",
            hasAnnotation: false,
            version: 0,
          },
        ],
      },
    })
  )

  db.prepare(
    "INSERT INTO sample_state (session_short_id, sample_index, content) VALUES (?, ?, ?)"
  ).run(
    "testDownload",
    0,
    JSON.stringify({
      imageUrl: "https://example.com/image.png",
    })
  )

  // Download dataset
  const udt = await getJSON(`${url}/api/session/testDownload/download`)

  t.truthy(udt.interface)
  t.truthy(udt.samples)
  t.truthy(udt.samples[0])
  t.is(udt.samples[0].imageUrl, "https://example.com/image.png")
})
