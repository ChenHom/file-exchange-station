import { basename } from 'node:path';
import { createToken, hashToken } from '../tokens/token-service.js';
import { existsStoredFile, writeBufferToStorage, deleteStoredFile } from '../storage/filesystem.js';
import { execute, queryMany, queryOne } from '../../db/query.js';

export type FileRecord = {
  id: number;
  sessionId: number;
  originalName: string;
  storedName: string;
  mimeType: string;
  sizeBytes: number;
  status: 'pending' | 'ready' | 'deleted';
  tokenHash: string | null;
  downloadCount: number;
  createdAt: string;
  updatedAt: string;
};

export async function uploadFile(sessionId: number, originalName: string, mimeType: string, data: Buffer) {
  const { token, hash } = createToken();
  const safeOriginalName = basename(originalName).replace(/[^\w.\-()\s]/g, '_');
  const storedName = `${sessionId}-${Date.now()}-${token.slice(0, 12)}`;
  await writeBufferToStorage(storedName, data);

  const result = await execute(
    'INSERT INTO files (session_id, original_name, stored_name, mime_type, size_bytes, status, token_hash) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [sessionId, safeOriginalName, storedName, mimeType || 'application/octet-stream', data.length, 'ready', hash]
  );

  return { id: Number(result.insertId), token, storedName };
}

export async function listFilesBySession(sessionId: number): Promise<FileRecord[]> {
  return queryMany<FileRecord>(
    'SELECT id, session_id AS sessionId, original_name AS originalName, stored_name AS storedName, mime_type AS mimeType, size_bytes AS sizeBytes, status, token_hash AS tokenHash, download_count AS downloadCount, created_at AS createdAt, updated_at AS updatedAt FROM files WHERE session_id = ? AND status <> ? ORDER BY created_at DESC',
    [sessionId, 'deleted']
  );
}

export async function getFileById(id: number): Promise<FileRecord | null> {
  return queryOne<FileRecord>(
    'SELECT id, session_id AS sessionId, original_name AS originalName, stored_name AS storedName, mime_type AS mimeType, size_bytes AS sizeBytes, status, token_hash AS tokenHash, download_count AS downloadCount, created_at AS createdAt, updated_at AS updatedAt FROM files WHERE id = ? LIMIT 1',
    [id]
  );
}

export async function incrementDownloadCount(id: number): Promise<void> {
  await execute('UPDATE files SET download_count = download_count + 1 WHERE id = ?', [id]);
}

export async function deleteFile(id: number): Promise<boolean> {
  const file = await getFileById(id);
  if (!file) return false;
  await deleteStoredFile(file.storedName);
  await execute('UPDATE files SET status = ? WHERE id = ?', ['deleted', id]);
  return true;
}

export async function fileExistsOnDisk(storedName: string): Promise<boolean> {
  return existsStoredFile(storedName);
}
