import mysql from 'mysql2/promise';
import { env } from '../config/env.js';

async function withConnection<T>(fn: (connection: mysql.Connection) => Promise<T>): Promise<T> {
  const connection = await mysql.createConnection({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME
  });

  try {
    return await fn(connection);
  } finally {
    await connection.end();
  }
}

export async function execute(sql: string, params: readonly unknown[] = []) {
  return withConnection(async (connection) => {
    const [result] = await connection.execute(sql, params as any[]);
    return result as mysql.ResultSetHeader;
  });
}

export async function queryOne<T>(sql: string, params: readonly unknown[] = []): Promise<T | null> {
  return withConnection(async (connection) => {
    const [rows] = await connection.execute<mysql.RowDataPacket[]>(sql, params as any[]);
    const row = rows[0];
    return (row ? (row as T) : null);
  });
}

export async function queryMany<T>(sql: string, params: readonly unknown[] = []): Promise<T[]> {
  return withConnection(async (connection) => {
    const [rows] = await connection.execute<mysql.RowDataPacket[]>(sql, params as any[]);
    return rows as T[];
  });
}
