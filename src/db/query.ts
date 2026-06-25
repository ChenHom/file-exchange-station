import { getDb } from './client.js';

export type ExecuteResult = {
  insertId: number;
  affectedRows: number;
};

export async function execute(sql: string, params: readonly unknown[] = []): Promise<ExecuteResult> {
  const stmt = getDb().prepare(sql);
  const result = stmt.run(...(params as unknown[]));
  return {
    insertId: Number(result.lastInsertRowid),
    affectedRows: result.changes
  };
}

export async function queryOne<T>(sql: string, params: readonly unknown[] = []): Promise<T | null> {
  const stmt = getDb().prepare(sql);
  const row = stmt.get(...(params as unknown[]));
  return (row as T | undefined) ?? null;
}

export async function queryMany<T>(sql: string, params: readonly unknown[] = []): Promise<T[]> {
  const stmt = getDb().prepare(sql);
  return stmt.all(...(params as unknown[])) as T[];
}
