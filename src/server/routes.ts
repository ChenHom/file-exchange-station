import type { IncomingMessage, ServerResponse } from 'node:http';
import { healthHandler } from './health.js';
import { sendJson } from './http.js';

function methodNotAllowed(res: ServerResponse): void {
  sendJson(res, 405, { error: 'Method Not Allowed' });
}

export async function routeRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://localhost');

  if (url.pathname === '/health') {
    if (req.method !== 'GET') {
      methodNotAllowed(res);
      return;
    }

    await healthHandler(req, res);
    return;
  }

  if (url.pathname === '/') {
    sendJson(res, 200, {
      name: 'file-exchange-station',
      status: 'booting',
      routes: ['/health']
    });
    return;
  }

  sendJson(res, 404, { error: 'Not Found' });
}
