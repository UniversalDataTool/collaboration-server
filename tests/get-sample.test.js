const test = require("ava");
const getDB = require("../src/db");
const app = require("../app");
const http = require("http");
const micro = require("micro");
const listen = require("test-listen");
const getJSON = require("bent")("json", "GET", 200, 400, 404);

test("Get Sample", async (t) => {
  const db = await getDB({ testDB: true });
  const service = micro(app);
  const url = await listen(service);

  const objectToInsert = {
    "summary_object": {
      "interface": {
        "type": "image_classification",
        "labels": [
          {
            "id": "valid",
            "description": "valid"
          },
          {
            "id": "invalid",
            "description": "invalid"
          }
        ]
      },
      "summary": {
        "samples": [
          {
            "hasAnnotation": false,
            "version": 1
          },
          {
            "hasAnnotation": false,
            "version": 1
          },
          {
            "hasAnnotation": false,
            "version": 1
          }
        ]
      }
    },
    short_id: "testSample",
    samples: [
      {
        imageUrl:
            "https://s3.amazonaws.com/asset.workaround.online/example-jobs/sticky-notes/image1.jpg",
      },
      {
        imageUrl:
            "https://s3.amazonaws.com/asset.workaround.online/example-jobs/sticky-notes/image2.jpg",
      },
    ]
  };

  db.prepare(
      "INSERT INTO session_state (short_id, summary_object) VALUES (?, ?)"
  ).run(objectToInsert.short_id, JSON.stringify(objectToInsert.summary_object));

  const samplesQueries = []
  objectToInsert.samples.forEach((sample, index) => {
    samplesQueries.push(
        db.prepare("INSERT INTO sample_state (session_short_id, session_sample_index, content) VALUES (?, ?, ?)")
            .run(objectToInsert.short_id, index, JSON.stringify(sample))
    )
  })
  await Promise.all(samplesQueries)

  const response = await getJSON(`${url}/api/session/${objectToInsert.short_id}/sample/0`);

  t.deepEqual(response, {
    imageUrl:
        "https://s3.amazonaws.com/asset.workaround.online/example-jobs/sticky-notes/image1.jpg",
    annotation: null
  })

  db.prepare(`DELETE FROM session_state WHERE short_id = ?`).run(
      objectToInsert.short_id
  );
});