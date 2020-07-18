module.exports = (db) => {
  // Create schema in database

  const sqlInit = `
        CREATE TABLE IF NOT EXISTS session_state (
            session_state_id INTEGER PRIMARY KEY AUTOINCREMENT,
            short_id TEXT NOT NULL,
            udt_json TEXT NOT NULL,
            version INTEGER NOT NULL DEFAULT 0,
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
            session_sample_index INTEGER NOT NULL,     
            summary_version INTEGER NOT NULL DEFAULT 0,
            content TEXT NOT NULL,
            summary TEXT,
            annotation TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
                
        CREATE INDEX IF NOT EXISTS short_id_idx ON session_state(short_id);
        CREATE INDEX IF NOT EXISTS previous_session_state_id_idx ON session_state(previous_session_state_id);`;
  db.exec(sqlInit);
};
