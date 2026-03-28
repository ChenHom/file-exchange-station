import type { IncomingMessage, ServerResponse } from 'node:http';
import { readRequestBody, sendJson } from './http.js';
import { healthHandler } from './health.js';
import { createSession, getSessionByCode, listActiveSessions, getSessionById } from '../modules/sessions/session-service.js';
import { listFilesBySession, uploadFile, deleteFile, getFileById } from '../modules/files/file-service.js';
import { env } from '../config/env.js';
import { AppError } from '../shared/errors.js';

function methodNotAllowed(res: ServerResponse): void {
  sendJson(res, 405, { error: 'Method Not Allowed' });
}

async function parseJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const body = await readRequestBody(req);
  return JSON.parse(body) as Record<string, unknown>;
}

async function readBinaryBody(req: IncomingMessage): Promise<Buffer> {
  const body = await readRequestBody(req, env.MAX_FILE_SIZE_MB * 1024 * 1024 + 1024);
  return Buffer.from(body, 'utf8');
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
      sendJson(res, 200, {
        name: 'file-exchange-station',
        status: 'ok',
        routes: ['/health', '/api/sessions', '/api/sessions/:code', '/api/sessions/:code/files', '/api/files/:id/download']
      });
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

    if (url.pathname.startsWith('/api/sessions/') && req.method === 'GET') {
      const parts = url.pathname.split('/').filter(Boolean);
      const code = parts[2];
      if (!code) throw new AppError('Missing session code', 400);
      const session = await getSessionByCode(code);
      if (!session) return sendJson(res, 404, { error: 'Session not found' });
      if (parts[3] === 'files') {
        const files = await listFilesBySession(session.id);
        sendJson(res, 200, { session, files });
        return;
      }
      sendJson(res, 200, session);
      return;
    }

    if (url.pathname.startsWith('/api/sessions/') && req.method === 'POST' && url.pathname.endsWith('/files')) {
      const parts = url.pathname.split('/').filter(Boolean);
      const code = parts[2];
      const session = await getSessionByCode(code);
      if (!session) return sendJson(res, 404, { error: 'Session not found' });
      const body = await parseJsonBody(req);
      const originalName = String(body.originalName ?? 'upload.bin');
      const mimeType = String(body.mimeType ?? 'application/octet-stream');
      const content = String(body.content ?? '');
      const uploaded = await uploadFile(session.id, originalName, mimeType, Buffer.from(content, 'utf8'));
      sendJson(res, 201, uploaded);
      return;
    }

    if (url.pathname.startsWith('/api/files/') && req.method === 'DELETE') {
      const id = Number(url.pathname.split('/')[3]);
      const ok = await deleteFile(id);
      sendJson(res, ok ? 200 : 404, { ok });
      return;
    }

    if (url.pathname.startsWith('/api/files/') && req.method === 'GET' && url.pathname.endsWith('/download')) {
      const id = Number(url.pathname.split('/')[3]);
      const file = await getFileById(id);
      if (!file) return sendJson(res, 404, { error: 'File not found' });
      sendJson(res, 200, { download: true, file });
      return;
    }

    if (url.pathname === '/webhooks/line' && req.method === 'POST') {
      sendJson(res, 200, { ok: true, message: 'line webhook stub' });
      return;
    }

    sendJson(res, 404, { error: 'Not Found' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    sendJson(res, statusCode, { error: message });
  }
}
