const sqlite = require("better-sqlite3")
const loadSchema = require("./schema.js")
const loadSeed = require("./seed.js")
const tmp = require("tmp")
const rimraf = require("rimraf")

let db

module.exports = (options = {}) => {
  if (db) return db

  let tmpObj
  if (options.testDB) {
    tmpObj = tmp.dirSync()
    options.databasePath = tmpObj.name + "/collaboration-server-testmode.db"
  }

  db = sqlite(options.databasePath || "udt-collaboration-server.db", {
    verbose: options.verbose !== undefined ? console.log : null,
  })

  db.function("randomid", () => {
    return "s_" + Math.random().toString(36).slice(-8)
  })

  loadSchema(db)

  if (options.seed) {
    loadSeed(db)
  }

  db.destroy = () => {
    db.close()
    if (tmpObj) {
      rimraf.sync(tmpObj.name)
    }
  }

  return db
}
