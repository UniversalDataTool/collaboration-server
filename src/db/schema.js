module.exports = (db) => {
  // Create schema in database

  const sqlInit = `
        CREATE TABLE IF NOT EXISTS session_state (
            session_state_id INTEGER PRIMARY KEY AUTOINCREMENT,
            short_id TEXT NOT NULL,
            summary_object TEXT NOT NULL,
            summary_version INTEGER NOT NULL DEFAULT 0,
            patch TEXT,
            user_name TEXT,
            previous_session_state_id INTEGER UNIQUE,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE VIEW IF NOT EXISTS latest_session_state AS
            SELECT
                *
            FROM
                (
                  select *
                        from session_state
                        order by short_id, session_state_id DESC
                  ) as session_state
            GROUP BY
                short_id;

        CREATE TABLE IF NOT EXISTS sample_state (
            sample_state_id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_short_id TEXT NOT NULL,
            sample_index INTEGER NOT NULL,
            sample_version INTEGER NOT NULL DEFAULT 0,
            sample_ref_id TEXT,
            content TEXT NOT NULL,
            summary TEXT,
            annotation TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(session_short_id, sample_ref_id),
            UNIQUE(session_short_id, sample_index)
        );

        CREATE TRIGGER set_default_sample_ref_id
        AFTER INSERT ON sample_state
        FOR EACH ROW
        WHEN NEW.sample_ref_id IS NULL
        BEGIN
            UPDATE sample_state SET sample_ref_id = randomid();
        END;


        CREATE INDEX IF NOT EXISTS short_id_idx ON session_state(short_id);
        CREATE INDEX IF NOT EXISTS previous_session_state_id_idx ON session_state(previous_session_state_id);
        CREATE INDEX IF NOT EXISTS sample_short_id_idx ON sample_state(session_short_id);`
  try {
    db.exec(sqlInit)
  } catch (e) {
    throw new Error(`Database failed to initialize: ${e.toString()}`)
  }
}
