const sqlite = require("better-sqlite3")
const loadSchema = require("./schema.js")
const loadSeed = require("./seed.js")

module.exports = (options) => {
  // Create database in memory instead of file, verbose logs all queries
  const db = sqlite(options.databasePath || ":mem:", {
    verbose: options.verbose !== undefined ? options.verbose : true,
  })

  loadSchema(db)

  if (options.seed) {
    seed(db)
  }

  return db
}
