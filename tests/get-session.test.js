const test = require("ava");
const getDB = require("../src/db");
const app = require("../app");
const http = require("http");
const micro = require("micro");
const listen = require("test-listen");
const getJSON = require("bent")("json", "GET", 200, 400, 404);

test("Get Session", async (t) => {
  const db = await getDB({ testDB: true });
  const service = micro(app);
  const url = await listen(service);

  const objectToInsert = {
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
    short_id: "test",
  };

  db.prepare(
    "INSERT INTO session_state (short_id, udt_json) VALUES (?, ?)"
  ).run(objectToInsert.short_id, JSON.stringify(objectToInsert.udt_json));

  const sessionAdded = db
    .prepare(
      `SELECT  *
                           FROM latest_session_state
                           WHERE short_id = ?
                           LIMIT 1`
    )
    .get(objectToInsert.short_id);
  t.assert(sessionAdded);

  const response = await getJSON(`${url}/api/session/test`);
  t.assert(response);

  db.prepare(`DELETE FROM session_state WHERE short_id = ?`).run(
    objectToInsert.short_id
  );
});
