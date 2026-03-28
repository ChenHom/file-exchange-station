import { queryMany, execute } from '../db/query.js';
import { deleteStoredFile } from '../modules/storage/filesystem.js';

export async function cleanupExpired(): Promise<number> {
  const sessions = await queryMany<{ id: number }>(
    'SELECT id FROM exchange_sessions WHERE expires_at < NOW() AND status = ?',
    ['active']
  );

  let removed = 0;
  for (const session of sessions) {
    const files = await queryMany<{ id: number; storedName: string }>(
      'SELECT id, stored_name AS storedName FROM files WHERE session_id = ? AND status <> ?',
      [session.id, 'deleted']
    );
    for (const file of files) {
      await deleteStoredFile(file.storedName);
      await execute('UPDATE files SET status = ? WHERE id = ?', ['deleted', file.id]);
      removed += 1;
    }
    await execute('UPDATE exchange_sessions SET status = ? WHERE id = ?', ['expired', session.id]);
  }
  return removed;
}
