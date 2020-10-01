const test = require("ava")
const getDB = require("../src/db")
const app = require("../app")
const http = require("http")
const micro = require("micro")
const listen = require("test-listen")
const getJSON = require("bent")("json", "GET")
const patchJSON = require("bent")("json", "PATCH")

test("Get Session Diff", async (t) => {
  const db = await getDB({ testDB: true })
  const service = micro(app)
  const url = await listen(service)

  const objectToInsert = {
    summary_object: JSON.stringify({
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
    }),
    short_id: "testDiff",
  }

  await db
    .prepare(
      "INSERT INTO session_state (short_id, summary_object) VALUES (?, ?)"
    )
    .run(objectToInsert.short_id, objectToInsert.summary_object)

  const firstState = await db
    .prepare(
      `SELECT  *
               FROM latest_session_state
               WHERE short_id = ?
               LIMIT 1`
    )
    .get(objectToInsert.short_id)
  t.assert(firstState)

  let res1 = await getJSON(
    `${url}/api/session/${objectToInsert.short_id}/diffs?since=0`
  )
  t.assert(res1.patch.length === 0)

  const secondObjectToInsert = {
    summary_object: JSON.stringify({
      interface: {
        type: "image_classification",
        labels: [
          {
            id: "valid",
            description: "valid option",
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
    }),
    patch: JSON.stringify([
      {
        op: "replace",
        path: "/interface/labels/0/description",
        value: "valid option",
      },
    ]),
    short_id: "testDiff",
    summary_version: 1,
  }

  await db
    .prepare(
      "INSERT INTO session_state (short_id, summary_object, patch, summary_version) VALUES (?, ?, ?, ?)"
    )
    .run(
      secondObjectToInsert.short_id,
      secondObjectToInsert.summary_object,
      secondObjectToInsert.patch,
      secondObjectToInsert.summary_version
    )

  let res2 = await getJSON(
    `${url}/api/session/${objectToInsert.short_id}/diffs?since=0`
  )
  t.assert(res2.patch.length === 1)

  db.prepare(`DELETE FROM session_state WHERE short_id = ?`).run(
    objectToInsert.short_id
  )
})
