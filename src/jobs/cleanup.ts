import { queryMany, execute } from '../db/query.js';
import { deleteStoredFile, existsStoredFile } from '../modules/storage/filesystem.js';

export async function cleanupExpired(): Promise<number> {
  let removed = 0;

  // 1. 處理 Session 過期：將 status 設為 expired 並標記檔案為 deleted
  const expiredSessions = await queryMany<{ id: number }>(
    'SELECT id FROM exchange_sessions WHERE expires_at < NOW() AND status = ?',
    ['active']
  );

  for (const session of expiredSessions) {
    // 獲取該 session 下所有未刪除的檔案
    const files = await queryMany<{ id: number; stored_name: string }>(
      'SELECT id, stored_name FROM files WHERE session_id = ? AND status <> ?',
      [session.id, 'deleted']
    );

    for (const file of files) {
      await deleteStoredFile(file.stored_name);
      await execute('UPDATE files SET status = ? WHERE id = ?', ['deleted', file.id]);
      removed += 1;
    }

    await execute('UPDATE exchange_sessions SET status = ? WHERE id = ?', ['expired', session.id]);
  }

  // 2. 處理 Soft Deleted 檔案：清理實體檔案 (API 刪除後留下的)
  // 這裡只針對 status='deleted' 且實體存在的檔案進行清理
  const deletedFiles = await queryMany<{ id: number; stored_name: string }>(
    'SELECT id, stored_name FROM files WHERE status = ?',
    ['deleted']
  );

  for (const file of deletedFiles) {
    if (await existsStoredFile(file.stored_name)) {
      await deleteStoredFile(file.stored_name);
      removed += 1;
    }
  }

  return removed;
}
