module.exports = (db) => {
  // Seed database
  db.prepare(
    "INSERT INTO session_state (short_id, summary_object) VALUES (?, ?)"
  ).run(
    "seed_test1",
    JSON.stringify({
      interface: {},
      summary: {
        samples: [],
      },
    })
  )
}
