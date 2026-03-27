import type { IncomingMessage, ServerResponse } from 'node:http';

export type RouteHandler = (req: IncomingMessage, res: ServerResponse) => void | Promise<void>;

export function sendJson(res: ServerResponse, statusCode: number, payload: unknown): void {
  res.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

export async function readRequestBody(req: IncomingMessage, limitBytes = 1_000_000): Promise<string> {
  const chunks: Buffer[] = [];
  let total = 0;

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.length;
    if (total > limitBytes) {
      throw new Error('Request body too large');
    }
    chunks.push(buffer);
  }

  return Buffer.concat(chunks).toString('utf8');
}
