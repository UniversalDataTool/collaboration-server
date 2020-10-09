const test = require("ava")
const getDB = require("../src/db")
const applySchema = require("../src/db/schema.js")

test("multiple schema initializations", async (t) => {
  const db = await getDB({ testDB: true })
  applySchema(db)
  applySchema(db)
  t.pass("didn't error reapplying schema")
})
