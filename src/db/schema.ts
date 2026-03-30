export const schemaVersion = 9;

export const migrations = [
  `CREATE TABLE IF NOT EXISTS exchange_sessions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    code VARCHAR(32) NOT NULL,
    title VARCHAR(255) NOT NULL DEFAULT '',
    status ENUM('active', 'expired', 'deleted') NOT NULL DEFAULT 'active',
    expires_at DATETIME(3) NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uniq_exchange_sessions_code (code),
    KEY idx_exchange_sessions_expires_at (expires_at),
    KEY idx_exchange_sessions_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS files (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    session_id BIGINT UNSIGNED NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    stored_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(255) NOT NULL DEFAULT 'application/octet-stream',
    size_bytes BIGINT UNSIGNED NOT NULL,
    status ENUM('pending', 'ready', 'deleted') NOT NULL DEFAULT 'pending',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    KEY idx_files_session_id (session_id),
    KEY idx_files_status (status),
    CONSTRAINT fk_files_session_id FOREIGN KEY (session_id) REFERENCES exchange_sessions(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS events (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    session_id BIGINT UNSIGNED NULL,
    file_id BIGINT UNSIGNED NULL,
    type VARCHAR(64) NOT NULL,
    payload JSON NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    KEY idx_events_session_id (session_id),
    KEY idx_events_created_at (created_at),
    CONSTRAINT fk_events_session_id FOREIGN KEY (session_id) REFERENCES exchange_sessions(id) ON DELETE SET NULL,
    CONSTRAINT fk_events_file_id FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `ALTER TABLE files ADD COLUMN token_hash VARCHAR(255) NULL AFTER status`,
  `ALTER TABLE files ADD COLUMN download_count INT UNSIGNED NOT NULL DEFAULT 0 AFTER token_hash`,
  `CREATE TABLE IF NOT EXISTS system_config (
    config_key VARCHAR(64) NOT NULL,
    config_value TEXT NULL,
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (config_key)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `ALTER TABLE files ADD COLUMN code VARCHAR(32) NULL AFTER session_id, ADD UNIQUE KEY uniq_files_code (code)`,
  `UPDATE files SET code = CONCAT('f', id) WHERE code IS NULL`,
  `ALTER TABLE files MODIFY COLUMN code VARCHAR(32) NOT NULL`
] as const;
