import mysql from 'mysql2/promise';
import { env } from '../config/env.js';
import { migrations, schemaVersion } from './schema.js';

export async function runMigrations(): Promise<void> {
  const connection = await mysql.createConnection({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    multipleStatements: true
  });

  try {
    await connection.execute(`CREATE TABLE IF NOT EXISTS schema_migrations (
      version INT NOT NULL PRIMARY KEY,
      applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    const [rows] = await connection.query<mysql.RowDataPacket[]>('SELECT version FROM schema_migrations ORDER BY version ASC');
    const applied = new Set(rows.map((row) => Number(row.version)));

    for (let i = 0; i < migrations.length; i += 1) {
      const version = i + 1;
      if (applied.has(version)) continue;
      await connection.beginTransaction();
      try {
        const migration = migrations[i];
        if (!migration) {
          throw new Error(`Missing migration at index ${i}`);
        }
        await connection.execute(migration);
        await connection.execute('INSERT INTO schema_migrations (version) VALUES (?)', [version]);
        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      }
    }

    if (Number(schemaVersion) !== migrations.length) {
      console.warn(`schemaVersion (${schemaVersion}) does not match migration count (${migrations.length})`);
    }
  } finally {
    await connection.end();
  }
}
