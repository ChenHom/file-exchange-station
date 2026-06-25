import { getDb } from './client.js';
import { migrations, schemaVersion } from './schema.js';

export async function runMigrations(): Promise<void> {
  const db = getDb();

  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER NOT NULL PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now'))
  )`);

  const appliedRows = db.prepare('SELECT version FROM schema_migrations ORDER BY version ASC').all() as { version: number }[];
  const applied = new Set(appliedRows.map((row) => Number(row.version)));

  const insertVersion = db.prepare('INSERT INTO schema_migrations (version) VALUES (?)');

  for (let i = 0; i < migrations.length; i += 1) {
    const version = i + 1;
    if (applied.has(version)) continue;
    const migration = migrations[i];
    if (!migration) {
      throw new Error(`Missing migration at index ${i}`);
    }

    const tx = db.transaction(() => {
      db.exec(migration);
      insertVersion.run(version);
    });
    tx();
  }

  if (Number(schemaVersion) !== migrations.length) {
    console.warn(`schemaVersion (${schemaVersion}) does not match migration count (${migrations.length})`);
  }
}
