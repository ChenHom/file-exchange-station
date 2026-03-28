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
  const expiresAt = addMinutes(new Date(), ttlMinutes).toISOString().slice(0, 19).replace('T', ' ');
  const result = await execute(
    'INSERT INTO exchange_sessions (code, title, expires_at) VALUES (?, ?, ?)',
    [code, title, expiresAt]
  );
  
  const session = await getSessionById(Number(result.insertId));
  if (!session) throw new Error('Failed to retrieve session after creation');
  return session;
}

export async function getSessionByCode(code: string): Promise<SessionRecord | null> {
  return queryOne<SessionRecord>(
    'SELECT id, code, title, status, expires_at AS expiresAt, created_at AS createdAt, updated_at AS updatedAt FROM exchange_sessions WHERE code = ? LIMIT 1',
    [code]
  );
}

export async function getSessionById(id: number): Promise<SessionRecord | null> {
  return queryOne<SessionRecord>(
    'SELECT id, code, title, status, expires_at AS expiresAt, created_at AS createdAt, updated_at AS updatedAt FROM exchange_sessions WHERE id = ? LIMIT 1',
    [id]
  );
}

export async function listActiveSessions(): Promise<SessionRecord[]> {
  return queryMany<SessionRecord>(
    'SELECT id, code, title, status, expires_at AS expiresAt, created_at AS createdAt, updated_at AS updatedAt FROM exchange_sessions WHERE status = ? ORDER BY created_at DESC',
    ['active']
  );
}
