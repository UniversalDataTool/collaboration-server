const test = require("ava");
const getDB = require("../src/db");
const app = require("../app");
const http = require("http");
const micro = require("micro");
const listen = require("test-listen");
const patchJSON = require("bent")("json", "PATCH");
const getJSON = require("bent")("json", "GET", 200, 400, 404);

test("Patch Session", async (t) => {
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
    short_id: "testPatch",
  };

  await db
    .prepare("INSERT INTO session_state (short_id, udt_json) VALUES (?, ?)")
    .run(objectToInsert.short_id, JSON.stringify(objectToInsert.udt_json));

  const firstState = await db
    .prepare(
      `SELECT  *
                           FROM latest_session_state
                           WHERE short_id = ?
                           LIMIT 1`
    )
    .get(objectToInsert.short_id);
  t.assert(firstState);

  const response = await patchJSON(`${url}/api/session/testPatch`, {
    patch: [
      {
        op: "replace",
        path: "/taskOutput/1",
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
  });

  const secondState = await db
    .prepare(
      `SELECT  *
                           FROM latest_session_state
                           WHERE short_id = ?
                           LIMIT 1`
    )
    .get(objectToInsert.short_id);

  t.assert(secondState.session_state_id !== firstState.session_state_id);

  const secondStateUDT = JSON.parse(secondState.udt_json);
  t.deepEqual(secondStateUDT.taskOutput[1], {
    regionType: "bounding-box",
    centerX: 0.43416827231856155,
    centerY: 0.3111753371868978,
    width: 0.09248554913294799,
    height: 0.0789980732177255,
    color: "hsl(297,100%,50%)",
  });

  await db
    .prepare(`DELETE FROM session_state WHERE short_id = ?`)
    .run(objectToInsert.short_id);
});

test("Patch Delete Sample", async (t) => {
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
        {
          imageUrl:
            "https://s3.amazonaws.com/asset.workaround.online/example-jobs/sticky-notes/image3.jpg",
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
    short_id: "testDeletePatch",
  };

  await db
    .prepare("INSERT INTO session_state (short_id, udt_json) VALUES (?, ?)")
    .run(objectToInsert.short_id, JSON.stringify(objectToInsert.udt_json));

  const samplesQueries = [];
  objectToInsert.udt_json.taskData.forEach((sample, index) => {
    samplesQueries.push(
      db
        .prepare(
          "INSERT INTO sample_state (session_short_id, session_sample_id, content) VALUES (?, ?, ?)"
        )
        .run(objectToInsert.short_id, index, JSON.stringify(sample))
    );
  });
  await Promise.all(samplesQueries);

  const firstState = await db
    .prepare(
      `SELECT  *
                           FROM latest_session_state
                           WHERE short_id = ?
                           LIMIT 1`
    )
    .get(objectToInsert.short_id);
  t.assert(firstState);

  const response = await patchJSON(
    `${url}/api/session/${objectToInsert.short_id}`,
    {
      patch: [
        {
          op: "remove",
          path: "/samples/1",
        },
      ],
    }
  );

  const getSessionResponse = await getJSON(
    `${url}/api/session/${objectToInsert.short_id}`
  );
  const secondStateUDT = getSessionResponse.udt_json;
  t.deepEqual(secondStateUDT.samples, [
    {
      imageUrl:
        "https://s3.amazonaws.com/asset.workaround.online/example-jobs/sticky-notes/image1.jpg",
      annotation: null,
    },
    {
      imageUrl:
        "https://s3.amazonaws.com/asset.workaround.online/example-jobs/sticky-notes/image3.jpg",
      annotation: null,
    },
  ]);

  await db
    .prepare(`DELETE FROM session_state WHERE short_id = ?`)
    .run(objectToInsert.short_id);
  await db
    .prepare(`DELETE FROM sample_state WHERE session_short_id = ?`)
    .run(objectToInsert.short_id);
});
