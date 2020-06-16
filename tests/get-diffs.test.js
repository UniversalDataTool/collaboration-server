const test = require("ava")
const getDB = require("../db")
const app = require("../src/endpoints/get-diffs.js")
const http = require("http")
const micro = require("micro")
const listen = require("test-listen")
const getJSON = require("bent")("json", "GET")
const patchJSON = require("bent")("json", "PATCH")
const moment = require("moment")

test("get session", async (t) => {
  const db = await getDB({ testDB: true })
  const service = micro(app)
  const url = await listen(service)
  const startTime = moment()
  await db("session_state").insert({
    udt_json: {
      interface: {
        type: "image_segmentation",
        availableLabels: ["valid", "invalid"],
        regionTypesAllowed: ["bounding-box", "polygon", "point"],
      },
      taskData: [
        {
          imageUrl:
            "https://s3.amazonaws.com/asset.workaround.online/example-jobs/sticky-notes/image1.jpg",
        },
        {
          imageUrl:
            "https://s3.amazonaws.com/asset.workaround.online/example-jobs/sticky-notes/image2.jpg",
        },
      ],
      taskOutput: [null, null],
    },
    short_id: "test",
  })
  let firstState = await db("latest_session_state").first()
  t.assert(firstState)
  // TODO a bit more
  let res1 = await getJSON(
    `${url}?session_id=test&since=${startTime.toISOString()}`
  )
  t.assert(res1.patch.length === 0)

  const secondTime = moment()

  await db("session_state").insert({
    udt_json: {
      interface: {
        type: "image_segmentation",
        availableLabels: ["valid", "invalid"],
        regionTypesAllowed: ["bounding-box", "polygon", "point"],
      },
      taskData: [
        {
          imageUrl:
            "https://s3.amazonaws.com/asset.workaround.online/example-jobs/sticky-notes/image1.jpg",
        },
        {
          imageUrl:
            "https://s3.amazonaws.com/asset.workaround.online/example-jobs/sticky-notes/image2.jpg",
        },
      ],
      taskOutput: [
        [
          {
            regionType: "bounding-box",
            centerX: 0.43416827231856137,
            centerY: 0.3111753371868978,
            width: 0.09248554913294799,
            height: 0.0789980732177264,
            color: "hsl(297,100%,50%)",
          },
        ],
        null,
      ],
    },
    patch: JSON.stringify([
      {
        op: "replace",
        path: "/taskOutput/0",
        value: {
          regionType: "bounding-box",
          centerX: 0.43416827231856137,
          centerY: 0.3111753371868978,
          width: 0.09248554913294799,
          height: 0.0789980732177264,
          color: "hsl(297,100%,50%)",
        },
      },
    ]),
    short_id: "test",
  })

  // TODO a bit more
  let res2 = await getJSON(
    `${url}?session_id=test&since=${secondTime.toISOString()}`
  )
  t.assert(res2.patch.length === 1)

  db.destroy()
})
