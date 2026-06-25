export const schemaVersion = 10;

// SQLite schema. 舊 MySQL ALTER 鏈合併為單張完整表。
// 注意：
//   - 用 INTEGER PRIMARY KEY AUTOINCREMENT 取代 BIGINT UNSIGNED AUTO_INCREMENT
//   - ENUM(...) → TEXT CHECK(... IN (...))
//   - DATETIME(3) ON UPDATE CURRENT_TIMESTAMP → 由 application layer 帶 timestamp（或預設 CURRENT_TIMESTAMP）
//   - JSON → TEXT（事件 payload 仍以 JSON.stringify 寫入）
//   - 外鍵需 PRAGMA foreign_keys = ON（已在 client.ts 設定）
export const migrations = [
  `CREATE TABLE IF NOT EXISTS exchange_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'deleted')),
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_exchange_sessions_expires_at ON exchange_sessions(expires_at)`,
  `CREATE INDEX IF NOT EXISTS idx_exchange_sessions_status ON exchange_sessions(status)`,

  `CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    code TEXT NOT NULL UNIQUE,
    original_name TEXT NOT NULL,
    stored_name TEXT NOT NULL,
    mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
    size_bytes INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'deleted')),
    token_hash TEXT NULL,
    download_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
    FOREIGN KEY (session_id) REFERENCES exchange_sessions(id) ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS idx_files_session_id ON files(session_id)`,
  `CREATE INDEX IF NOT EXISTS idx_files_status ON files(status)`,

  `CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NULL,
    file_id INTEGER NULL,
    type TEXT NOT NULL,
    payload TEXT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
    FOREIGN KEY (session_id) REFERENCES exchange_sessions(id) ON DELETE SET NULL,
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE SET NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_events_session_id ON events(session_id)`,
  `CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at)`,

  `CREATE TABLE IF NOT EXISTS system_config (
    config_key TEXT PRIMARY KEY,
    config_value TEXT NULL,
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now'))
  )`
] as const;
