const test = require("ava")
const getDB = require("../src/db")
const app = require("../app")
const micro = require("micro")
const listen = require("test-listen")
const getJSON = require("bent")("json", "GET", 200, 400, 404)

test("Get Session", async (t) => {
  const db = await getDB({ testDB: true })
  const service = micro(app)
  const url = await listen(service)

  const objectToInsert = {
    summary_object: {
      interface: {
        type: "image_classification",
        labels: [
          {
            id: "valid",
            description: "valid",
          },
          {
            id: "invalid",
            description: "invalid",
          },
        ],
      },
      summary: {
        samples: [
          {
            hasAnnotation: false,
            version: 1,
          },
          {
            hasAnnotation: false,
            version: 1,
          },
          {
            hasAnnotation: false,
            version: 1,
          },
        ],
      },
    },
    short_id: "test",
  }

  db.prepare(
    "INSERT INTO session_state (short_id, summary_object) VALUES (?, ?)"
  ).run(objectToInsert.short_id, JSON.stringify(objectToInsert.summary_object))

  const sessionAdded = db
    .prepare(
      `SELECT *
       FROM latest_session_state
       WHERE short_id = ?
       LIMIT 1`
    )
    .get(objectToInsert.short_id)
  t.assert(sessionAdded)

  const response = await getJSON(`${url}/api/session/test`)
  t.assert(response)

  db.prepare(`DELETE FROM session_state WHERE short_id = ?`).run(
    objectToInsert.short_id
  )
})
