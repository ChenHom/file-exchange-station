import mysql from 'mysql2/promise';
import { env } from '../config/env.js';

export async function testDbConnection(): Promise<{ ok: boolean; error?: string }> {
  let connection: mysql.Connection | undefined;

  try {
    connection = await mysql.createConnection({
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME
    });

    await connection.execute('SELECT 1');
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown database error'
    };
  } finally {
    await connection?.end();
  }
}
