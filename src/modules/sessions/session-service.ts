import { addMinutes } from '../../shared/time.js';
import { generateCode } from '../../shared/crypto.js';
import { queryMany, queryOne, execute } from '../../db/query.js';

export type SessionStatus = 'active' | 'expired' | 'deleted';

export type SessionRecord = {
  id: number;
  code: string;
  title: string;
  status: SessionStatus;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
};

export async function createSession(title: string, ttlMinutes: number): Promise<SessionRecord> {
  const code = generateCode();
  const expiresAt = addMinutes(new Date(), ttlMinutes).toISOString();
  const result = await execute(
    'INSERT INTO exchange_sessions (code, title, expires_at) VALUES (?, ?, ?)',
    [code, title, expiresAt]
  );
  return {
    id: Number(result.insertId),
    code,
    title,
    status: 'active',
    expiresAt,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export async function getSessionByCode(code: string): Promise<SessionRecord | null> {
  return queryOne<SessionRecord>('SELECT * FROM exchange_sessions WHERE code = ? LIMIT 1', [code]);
}

export async function getSessionById(id: number): Promise<SessionRecord | null> {
  return queryOne<SessionRecord>('SELECT * FROM exchange_sessions WHERE id = ? LIMIT 1', [id]);
}

export async function listActiveSessions(): Promise<SessionRecord[]> {
  return queryMany<SessionRecord>('SELECT * FROM exchange_sessions WHERE status = ? ORDER BY created_at DESC', ['active']);
}
