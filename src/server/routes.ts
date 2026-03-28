import type { IncomingMessage, ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { readRequestBody, readRawBody, sendJson, parseMultipart, streamFile } from './http.js';
import { healthHandler } from './health.js';
import { createSession, getSessionByCode, listActiveSessions, getSessionById } from '../modules/sessions/session-service.js';
import { listFilesBySession, uploadFile, deleteFile, getFileById, incrementDownloadCount } from '../modules/files/file-service.js';
import { env } from '../config/env.js';
import { AppError } from '../shared/errors.js';
import { verifyToken } from '../modules/tokens/token-service.js';
import { openFileStream } from '../modules/storage/filesystem.js';
import { lineWebhookHandler } from './line-webhook.js';

function methodNotAllowed(res: ServerResponse): void {
  sendJson(res, 405, { error: 'Method Not Allowed' });
}

async function parseJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const body = await readRequestBody(req);
  return JSON.parse(body) as Record<string, unknown>;
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
        sendJson(res, 200, {
          name: 'file-exchange-station',
          status: 'ok',
          routes: ['/health', '/api/sessions', '/api/sessions/:code', '/api/sessions/:code/files', '/api/files/:id/download']
        });
      }
      return;
    }

    if (url.pathname === '/api/sessions' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const title = String(body.title ?? '');
      const session = await createSession(title, env.DEFAULT_TTL_MINUTES);
      sendJson(res, 201, session);
      return;
    }

    if (url.pathname === '/api/sessions' && req.method === 'GET') {
      const sessions = await listActiveSessions();
      sendJson(res, 200, { sessions });
      return;
    }

    // Sessions by code: /api/sessions/:code
    const sessionMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)$/);
    if (sessionMatch) {
      const code = sessionMatch[1];
      if (!code) throw new AppError('Invalid session code', 400);
      const session = await getSessionByCode(code);
      if (!session) throw new AppError('Session not found', 404);

      if (req.method === 'GET') {
        sendJson(res, 200, session);
        return;
      }
      return methodNotAllowed(res);
    }

    // Session files: /api/sessions/:code/files
    const sessionFilesMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/files$/);
    if (sessionFilesMatch) {
      const code = sessionFilesMatch[1];
      if (!code) throw new AppError('Invalid session code', 400);
      const session = await getSessionByCode(code);
      if (!session) throw new AppError('Session not found', 404);

      if (req.method === 'GET') {
        const files = await listFilesBySession(session.id);
        sendJson(res, 200, { session, files });
        return;
      }

      if (req.method === 'POST') {
        const contentType = req.headers['content-type'] || '';
        if (!contentType.includes('multipart/form-data')) {
          throw new AppError('Content-Type must be multipart/form-data', 400);
        }
        const body = await readRawBody(req, env.MAX_FILE_SIZE_MB * 1024 * 1024 + 10_000);
        const parts = parseMultipart(body, contentType);
        const filePart = parts.get('file');

        if (!filePart || typeof filePart === 'string') {
          throw new AppError('No file part found', 400);
        }

        const result = await uploadFile(session.id, filePart.filename, filePart.mimeType, filePart.data);
        sendJson(res, 201, result);
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
      if (!file || file.status === 'deleted') throw new AppError('File not found', 404);
      if (!file.tokenHash || !verifyToken(token, file.tokenHash)) {
        throw new AppError('Invalid or missing token', 403);
      }

      const session = await getSessionById(file.sessionId);
      if (!session || session.status !== 'active') {
        throw new AppError('Session is no longer active', 403);
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
      if (!file || file.status === 'deleted') throw new AppError('File not found', 404);
      if (!file.tokenHash || !verifyToken(token, file.tokenHash)) {
        throw new AppError('Invalid or missing token', 403);
      }

      await deleteFile(fileId);
      sendJson(res, 200, { success: true });
      return;
    }

    // LINE Webhook: /webhooks/line
    if (url.pathname === '/webhooks/line' && req.method === 'POST') {
      await lineWebhookHandler(req, res);
      return;
    }

    throw new AppError('Not Found', 404);
  } catch (error) {
    console.error('[Route Error]', error);
    if (error instanceof AppError) {
      sendJson(res, error.statusCode, { error: error.message });
    } else {
      console.error(error);
      sendJson(res, 500, { error: 'Internal Server Error' });
    }
  }
}
