const sqlite = require("better-sqlite3")
const loadSchema = require("./schema.js")
const loadSeed = require("./seed.js")

let db

module.exports = (options) => {
  if (db) return db

  db = sqlite(options.databasePath || "collaboration-server.db", {
    verbose: options.verbose !== undefined ? options.verbose : null,
  })

  loadSchema(db)

  if (options.seed) {
    seed(db)
  }

  return db
}
