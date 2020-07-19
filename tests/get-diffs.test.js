const test = require("ava");
const getDB = require("../src/db");
const app = require("../app");
const http = require("http");
const micro = require("micro");
const listen = require("test-listen");
const getJSON = require("bent")("json", "GET");
const patchJSON = require("bent")("json", "PATCH");

test("Get Session Diff", async (t) => {
  const db = await getDB({ testDB: true });
  const service = micro(app);
  const url = await listen(service);

  const objectToInsert = {
    udt_json: JSON.stringify({
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
    }),
    short_id: "testDiff",
  };

  await db
    .prepare("INSERT INTO session_state (short_id, udt_json) VALUES (?, ?)")
    .run(objectToInsert.short_id, objectToInsert.udt_json);

  const firstState = await db
    .prepare(
      `SELECT  *
                           FROM latest_session_state
                           WHERE short_id = ?
                           LIMIT 1`
    )
    .get(objectToInsert.short_id);
  t.assert(firstState);

  let res1 = await getJSON(
    `${url}/api/session/${objectToInsert.short_id}/diffs?since=0`
  );
  t.assert(res1.patch.length === 0);

  const secondObjectToInsert = {
    udt_json: JSON.stringify({
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
    }),
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
    short_id: "testDiff",
    version: 1,
  };

  await db
    .prepare(
      "INSERT INTO session_state (short_id, udt_json, patch, version) VALUES (?, ?, ?, ?)"
    )
    .run(
      secondObjectToInsert.short_id,
      secondObjectToInsert.udt_json,
      secondObjectToInsert.patch,
      secondObjectToInsert.version
    );

  let res2 = await getJSON(
    `${url}/api/session/${objectToInsert.short_id}/diffs?since=0`
  );
  t.assert(res2.patch.length === 1);

  db.prepare(`DELETE FROM session_state WHERE short_id = ?`).run(
    objectToInsert.short_id
  );
});
