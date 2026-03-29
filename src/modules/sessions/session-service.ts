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

/**
 * 建立新 Session
 * 規則：
 * - title 自動 trim，預設為空字串
 * - title 長度上限 255，超過則報錯
 * - 過期時間固定為 24 小時 (1440 分鐘)
 */
export async function createSession(title?: string): Promise<SessionRecord> {
  const code = generateCode(12);
  const trimmedTitle = (title ?? '').trim();

  if (trimmedTitle.length > 255) {
    throw new Error('TITLE_TOO_LONG'); // 拋出特定錯誤由 route 層轉換
  }

  const expiresAt = addMinutes(new Date(), 1440).toISOString().slice(0, 19).replace('T', ' ');
  
  const result = await execute(
    'INSERT INTO exchange_sessions (code, title, expires_at) VALUES (?, ?, ?)',
    [code, trimmedTitle, expiresAt]
  );
  
  const session = await getSessionById(Number(result.insertId));
  if (!session) throw new Error('Failed to retrieve session after creation');
  return session;
}

/**
 * 依 Code 查詢 Session
 * 規則：
 * - status 為 'deleted' 視為不存在 (回傳 null)
 * - 若已過期，回傳 Record 並由 caller 決定行為 (規格說 expired 可查)
 */
export async function getSessionByCode(code: string): Promise<SessionRecord | null> {
  const session = await queryOne<SessionRecord>(
    'SELECT id, code, title, status, expires_at AS expiresAt, created_at AS createdAt, updated_at AS updatedAt FROM exchange_sessions WHERE code = ? LIMIT 1',
    [code]
  );

  if (!session || session.status === 'deleted') {
    return null;
  }

  return session;
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
