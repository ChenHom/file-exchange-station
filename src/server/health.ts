import type { IncomingMessage, ServerResponse } from 'node:http';
import { testDbConnection } from '../db/client.js';

export async function healthHandler(_req: IncomingMessage, res: ServerResponse): Promise<void> {
  const db = await testDbConnection();

  res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
  res.end(
    JSON.stringify({
      ok: true,
      database: db.ok ? 'up' : 'down',
      timestamp: new Date().toISOString()
    })
  );
}
