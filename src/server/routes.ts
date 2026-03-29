import type { IncomingMessage, ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import archiver from 'archiver';
import { readRequestBody, readRawBody, sendJson, parseMultipart, streamFile } from './http.js';
import { healthHandler } from './health.js';
import { createSession, getSessionByCode, listActiveSessions, getSessionById, type SessionRecord } from '../modules/sessions/session-service.js';
import { listFilesBySession, uploadFile, deleteFile, getFileById, getFileByCode, incrementDownloadCount } from '../modules/files/file-service.js';
import { env } from '../config/env.js';
import { AppError } from '../shared/errors.js';
import { verifyToken } from '../modules/tokens/token-service.js';
import { openFileStream } from '../modules/storage/filesystem.js';
import { lineWebhookHandler } from './line-webhook.js';
import { getSystemStats } from '../jobs/stats.js';
import { isRateLimited } from '../shared/rate-limit.js';

function methodNotAllowed(res: ServerResponse): void {
  sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Method Not Allowed');
}

/**
 * 通用 Rate Limit 檢查
 */
function checkRateLimit(res: ServerResponse, key: string, limit: number, windowMs: number): boolean {
  const result = isRateLimited(key, limit, windowMs);
  if (!result.allowed) {
    res.setHeader('Retry-After', Math.ceil((result.resetAt - Date.now()) / 1000));
    sendError(res, 429, 'TOO_MANY_REQUESTS', 'Rate limit exceeded');
    return false;
  }
  return true;
}

function sendSuccess(res: ServerResponse, statusCode: number, data: unknown): void {
  sendJson(res, statusCode, { success: true, data });
}

function sendError(res: ServerResponse, statusCode: number, code: string, message: string): void {
  sendJson(res, statusCode, { success: false, error: { code, message } });
}

/**
 * 移除 Session 中的敏感/內部欄位 (如 id)
 * 並動態修正 status 狀態 (若已過期則顯示 expired)
 */
function sanitizeSession(session: SessionRecord) {
  const { id, ...rest } = session;
  
  const now = new Date();
  const expiresAt = new Date(session.expiresAt);
  if (rest.status === 'active' && now > expiresAt) {
    rest.status = 'expired';
  }
  
  return rest;
}

/**
 * 移除 File 中的敏感/內部欄位
 */
function sanitizeFile(file: any) {
  const { id, sessionId, tokenHash, storedName, ...rest } = file;
  return rest;
}

/**
 * 檢查 Session 是否為 Active
 */
function isSessionActive(session: SessionRecord): boolean {
  if (session.status !== 'active') return false;
  const now = new Date();
  const expiresAt = new Date(session.expiresAt);
  return now <= expiresAt;
}

async function parseJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  try {
    const body = await readRequestBody(req);
    if (!body) return {};
    return JSON.parse(body) as Record<string, unknown>;
  } catch (e) {
    throw new AppError('Invalid JSON body', 400, 'BAD_REQUEST');
  }
}

export async function routeRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const clientIp = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown';

    // 全域 Rate Limit (每分鐘 60 次)
    if (!checkRateLimit(res, `global:${clientIp}`, 60, 60000)) return;

    if (url.pathname === '/health') {
      if (req.method !== 'GET') return methodNotAllowed(res);
      await healthHandler(req, res);
      return;
    }

    if (url.pathname === '/api/stats') {
      if (req.method !== 'GET') return methodNotAllowed(res);
      const stats = await getSystemStats();
      sendSuccess(res, 200, stats);
      return;
    }

    if (url.pathname === '/') {
      if (req.method !== 'GET') return methodNotAllowed(res);
      try {
        const content = await readFile(join(process.cwd(), 'public/index.html'));
        res.writeHead(200, { 
          'content-type': 'text/html; charset=utf-8',
          'cache-control': 'no-cache'
        });
        res.end(content);
      } catch (err) {
        console.error('[Static Error]', err);
        sendError(res, 500, 'INTERNAL_ERROR', 'Failed to load frontend');
      }
      return;
    }

    // POST /api/sessions - 建立 Session
    if (url.pathname === '/api/sessions' && req.method === 'POST') {
      // 建立 Session 限制 (每分鐘 5 次)
      if (!checkRateLimit(res, `create-session:${clientIp}`, 5, 60000)) return;

      const body = await parseJsonBody(req);
      
      if (body.title !== undefined && typeof body.title !== 'string') {
        throw new AppError('title must be a string', 400, 'BAD_REQUEST');
      }

      try {
        const session = await createSession(body.title as string | undefined);
        sendSuccess(res, 201, { session: sanitizeSession(session) });
      } catch (e: any) {
        if (e.message === 'TITLE_TOO_LONG') {
          throw new AppError('title exceeds maximum length', 400, 'BAD_REQUEST');
        }
        throw e;
      }
      return;
    }

    // GET /api/sessions - 列出活動中
    if (url.pathname === '/api/sessions' && req.method === 'GET') {
      const sessions = await listActiveSessions();
      sendSuccess(res, 200, { sessions: sessions.map(sanitizeSession) });
      return;
    }

    // Session zip download: /api/sessions/:code/download-all
    const sessionZipMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/download-all$/);
    if (sessionZipMatch) {
      if (req.method !== 'GET') return methodNotAllowed(res);
      const code = sessionZipMatch[1];
      if (!code) throw new AppError('Invalid session code', 400, 'BAD_REQUEST');
      
      const session = await getSessionByCode(code);
      if (!session) throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');
      
      if (!isSessionActive(session)) {
        throw new AppError('Session is no longer active', 403, 'FORBIDDEN');
      }

      const files = await listFilesBySession(session.id);
      if (files.length === 0) {
        throw new AppError('No files to download', 404, 'FILE_NOT_FOUND');
      }

      res.writeHead(200, {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="session-${code}.zip"`
      });

      const archive = archiver('zip', { zlib: { level: 5 } });
      archive.on('error', (err) => { throw err; });
      archive.pipe(res);

      for (const file of files) {
        archive.append(openFileStream(file.storedName), { name: file.originalName });
        await incrementDownloadCount(file.id);
      }

      await archive.finalize();
      return;
    }

    // Sessions by code: /api/sessions/:code
    const sessionMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)$/);
    if (sessionMatch) {
      const code = sessionMatch[1];
      if (!code) throw new AppError('Invalid session code', 400, 'BAD_REQUEST');
      
      const session = await getSessionByCode(code);
      if (!session) throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');

      if (req.method === 'GET') {
        sendSuccess(res, 200, { session: sanitizeSession(session) });
        return;
      }
      return methodNotAllowed(res);
    }

    // Session files: /api/sessions/:code/files
    const sessionFilesMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/files$/);
    if (sessionFilesMatch) {
      const code = sessionFilesMatch[1];
      if (!code) throw new AppError('Invalid session code', 400, 'BAD_REQUEST');
      const session = await getSessionByCode(code);
      if (!session) throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');

      if (req.method === 'GET') {
        const files = await listFilesBySession(session.id);
        sendSuccess(res, 200, { session: sanitizeSession(session), files: files.map(sanitizeFile) });
        return;
      }

      if (req.method === 'POST') {
        if (!isSessionActive(session)) {
          throw new AppError('Session is no longer active', 403, 'FORBIDDEN');
        }

        const contentType = req.headers['content-type'] || '';
        if (!contentType.includes('multipart/form-data')) {
          throw new AppError('Content-Type must be multipart/form-data', 400, 'BAD_REQUEST');
        }
        
        // 檢查檔案總大小 (避免硬碟爆滿)
        const stats = await getSystemStats();
        if (stats.diskSpace.freeMB < env.MAX_FILE_SIZE_MB) {
          throw new AppError('Insufficient server storage', 503, 'STORAGE_FULL');
        }

        const body = await readRawBody(req, env.MAX_FILE_SIZE_MB * 1024 * 1024 + 10_000);
        const parts = parseMultipart(body, contentType);
        const filePart = parts.get('file');

        if (!filePart || typeof filePart === 'string') {
          throw new AppError('No file part found', 400, 'BAD_REQUEST');
        }

        const result = await uploadFile(session.id, filePart.filename, filePart.mimeType, filePart.data);
        const file = await getFileById(result.id);
        if (!file) throw new Error('Upload failed');

        sendSuccess(res, 201, { 
          file: sanitizeFile(file),
          downloadToken: result.token
        });
        return;
      }
      return methodNotAllowed(res);
    }

    // File download: /api/files/:code/download
    const fileDownloadMatch = url.pathname.match(/^\/api\/files\/([^/]+)\/download$/);
    if (fileDownloadMatch) {
      if (req.method !== 'GET') return methodNotAllowed(res);
      const fileCode = fileDownloadMatch[1];
      const token = url.searchParams.get('token') || '';

      if (!fileCode) throw new AppError('Invalid file code', 400, 'BAD_REQUEST');
      const file = await getFileByCode(fileCode);
      if (!file || file.status === 'deleted') throw new AppError('File not found', 404, 'FILE_NOT_FOUND');
      
      if (!file.tokenHash || !verifyToken(token, file.tokenHash)) {
        throw new AppError('Invalid or missing token', 403, 'FORBIDDEN');
      }

      const session = await getSessionById(file.sessionId);
      if (!session || !isSessionActive(session)) {
        throw new AppError('Session is no longer active', 403, 'FORBIDDEN');
      }

      await incrementDownloadCount(file.id);
      const stream = openFileStream(file.storedName);
      await streamFile(res, stream, file.originalName, file.mimeType, file.sizeBytes);
      return;
    }

    // File delete: /api/files/:code
    const fileDeleteMatch = url.pathname.match(/^\/api\/files\/([^/]+)$/);
    if (fileDeleteMatch) {
      if (req.method !== 'DELETE') return methodNotAllowed(res);
      const fileCode = fileDeleteMatch[1];
      const token = url.searchParams.get('token') || '';

      if (!fileCode) throw new AppError('Invalid file code', 400, 'BAD_REQUEST');
      const file = await getFileByCode(fileCode);
      if (!file || file.status === 'deleted') throw new AppError('File not found', 404, 'FILE_NOT_FOUND');
      
      if (!file.tokenHash || !verifyToken(token, file.tokenHash)) {
        throw new AppError('Invalid or missing token', 403, 'FORBIDDEN');
      }

      const session = await getSessionById(file.sessionId);
      if (!session || !isSessionActive(session)) {
        throw new AppError('Session is no longer active', 403, 'FORBIDDEN');
      }

      await deleteFile(file.id);
      sendSuccess(res, 200, { deleted: true });
      return;
    }

    // LINE Webhook: /webhooks/line
    if (url.pathname === '/webhooks/line' && req.method === 'POST') {
      await lineWebhookHandler(req, res);
      return;
    }

    throw new AppError('Not Found', 404, 'NOT_FOUND');
  } catch (error) {
    if (error instanceof AppError) {
      sendError(res, error.statusCode, error.errorCode || 'ERROR', error.message);
    } else {
      console.error('[Unhandled Error]', error);
      sendError(res, 500, 'INTERNAL_ERROR', 'Internal server error');
    }
  }
}
