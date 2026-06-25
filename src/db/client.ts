import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { env } from '../config/env.js';

let db: Database.Database | undefined;

export function getDb(): Database.Database {
  if (db) return db;

  const dbPath = resolve(env.SQLITE_PATH);
  mkdirSync(dirname(dbPath), { recursive: true });

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = undefined;
  }
}

export function testDbConnection(): { ok: boolean; error?: string } {
  try {
    const conn = getDb();
    conn.prepare('SELECT 1').get();
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown database error'
    };
  }
}
