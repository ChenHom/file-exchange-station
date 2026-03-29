import type { IncomingMessage, ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { readRequestBody, readRawBody, sendJson, parseMultipart, streamFile } from './http.js';
import { healthHandler } from './health.js';
import { createSession, getSessionByCode, listActiveSessions, getSessionById, type SessionRecord } from '../modules/sessions/session-service.js';
import { listFilesBySession, uploadFile, deleteFile, getFileById, incrementDownloadCount } from '../modules/files/file-service.js';
import { env } from '../config/env.js';
import { AppError } from '../shared/errors.js';
import { verifyToken } from '../modules/tokens/token-service.js';
import { openFileStream } from '../modules/storage/filesystem.js';
import { lineWebhookHandler } from './line-webhook.js';

function methodNotAllowed(res: ServerResponse): void {
  sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Method Not Allowed');
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
  
  // 動態判定過期狀態：若資料庫仍是 active，但目前時間已過，則顯示為 expired
  const now = new Date();
  const expiresAt = new Date(session.expiresAt);
  if (rest.status === 'active' && now > expiresAt) {
    rest.status = 'expired';
  }
  
  return rest;
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

    if (url.pathname === '/health') {
      if (req.method !== 'GET') return methodNotAllowed(res);
      await healthHandler(req, res);
      return;
    }

    if (url.pathname === '/') {
      if (req.method !== 'GET') return methodNotAllowed(res);
      try {
        const content = await readFile(join(process.cwd(), 'public/index.html'));
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        res.end(content);
      } catch {
        sendSuccess(res, 200, {
          name: 'file-exchange-station',
          status: 'ok',
          routes: ['/health', '/api/sessions', '/api/sessions/:code']
        });
      }
      return;
    }

    // POST /api/sessions - 建立 Session
    if (url.pathname === '/api/sessions' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      
      // 驗證 title 型別 (若有提供)
      if (body.title !== undefined && typeof body.title !== 'string') {
        throw new AppError('title must be a string', 400, 'BAD_REQUEST');
      }

      const session = await createSession(body.title as string | undefined);
      sendSuccess(res, 201, { session: sanitizeSession(session) });
      return;
    }

    // GET /api/sessions - 列出活動中 (MVP 僅供內部/管理用)
    if (url.pathname === '/api/sessions' && req.method === 'GET') {
      const sessions = await listActiveSessions();
      sendSuccess(res, 200, { sessions: sessions.map(sanitizeSession) });
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
        sendSuccess(res, 200, { session: sanitizeSession(session), files });
        return;
      }

      if (req.method === 'POST') {
        const contentType = req.headers['content-type'] || '';
        if (!contentType.includes('multipart/form-data')) {
          throw new AppError('Content-Type must be multipart/form-data', 400, 'BAD_REQUEST');
        }
        const body = await readRawBody(req, env.MAX_FILE_SIZE_MB * 1024 * 1024 + 10_000);
        const parts = parseMultipart(body, contentType);
        const filePart = parts.get('file');

        if (!filePart || typeof filePart === 'string') {
          throw new AppError('No file part found', 400, 'BAD_REQUEST');
        }

        const result = await uploadFile(session.id, filePart.filename, filePart.mimeType, filePart.data);
        sendSuccess(res, 201, result);
        return;
      }
      return methodNotAllowed(res);
    }

    // File download: /api/files/:id/download
    const fileDownloadMatch = url.pathname.match(/^\/api\/files\/(\d+)\/download$/);
    if (fileDownloadMatch) {
      if (req.method !== 'GET') return methodNotAllowed(res);
      const fileId = parseInt(fileDownloadMatch[1] ?? '0', 10);
      const token = url.searchParams.get('token') || '';

      const file = await getFileById(fileId);
      if (!file || file.status === 'deleted') throw new AppError('File not found', 404, 'FILE_NOT_FOUND');
      if (!file.tokenHash || !verifyToken(token, file.tokenHash)) {
        throw new AppError('Invalid or missing token', 403, 'FORBIDDEN');
      }

      const session = await getSessionById(file.sessionId);
      if (!session || session.status !== 'active') {
        throw new AppError('Session is no longer active', 403, 'FORBIDDEN');
      }

      await incrementDownloadCount(file.id);
      const stream = openFileStream(file.storedName);
      await streamFile(res, stream, file.originalName, file.mimeType, file.sizeBytes);
      return;
    }

    // File delete: /api/files/:id
    const fileDeleteMatch = url.pathname.match(/^\/api\/files\/(\d+)$/);
    if (fileDeleteMatch) {
      if (req.method !== 'DELETE') return methodNotAllowed(res);
      const fileId = parseInt(fileDeleteMatch[1] ?? '0', 10);
      const token = url.searchParams.get('token') || '';

      const file = await getFileById(fileId);
      if (!file || file.status === 'deleted') throw new AppError('File not found', 404, 'FILE_NOT_FOUND');
      if (!file.tokenHash || !verifyToken(token, file.tokenHash)) {
        throw new AppError('Invalid or missing token', 403, 'FORBIDDEN');
      }

      await deleteFile(fileId);
      sendSuccess(res, 200, { success: true });
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
