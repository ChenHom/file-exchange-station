import { execute } from '../../db/query.js';

export async function recordEvent(sessionId: number | null, fileId: number | null, type: string, payload: unknown): Promise<void> {
  await execute('INSERT INTO events (session_id, file_id, type, payload) VALUES (?, ?, ?, ?)', [
    sessionId,
    fileId,
    type,
    JSON.stringify(payload)
  ]);
}
