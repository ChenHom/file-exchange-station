import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

export type RouteHandler = (req: IncomingMessage, res: ServerResponse) => void | Promise<void>;

export function sendJson(res: ServerResponse, statusCode: number, payload: unknown): void {
  res.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

export async function readRawBody(req: IncomingMessage, limitBytes = 100_000_000): Promise<Buffer> {
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

  return Buffer.concat(chunks);
}

export async function readRequestBody(req: IncomingMessage, limitBytes = 1_000_000): Promise<string> {
  const body = await readRawBody(req, limitBytes);
  return body.toString('utf8');
}

export async function streamFile(res: ServerResponse, stream: Readable, fileName: string, mimeType: string, size: number): Promise<void> {
  res.writeHead(200, {
    'content-type': mimeType,
    'content-length': size,
    'content-disposition': `attachment; filename="${encodeURIComponent(fileName)}"`
  });
  await pipeline(stream, res);
}

export type MultipartFile = {
  filename: string;
  mimeType: string;
  data: Buffer;
};

export function parseMultipart(body: Buffer, contentType: string): Map<string, string | MultipartFile> {
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!boundaryMatch) throw new Error('No boundary found in Content-Type');
  const boundary = boundaryMatch[1] || boundaryMatch[2];
  if (!boundary) throw new Error('No boundary found in Content-Type');

  const result = new Map<string, string | MultipartFile>();
  const separator = Buffer.from(`--${boundary}`);
  const endSeparator = Buffer.from(`--${boundary}--`);

  let start = body.indexOf(separator) + separator.length;
  while (start < body.indexOf(endSeparator)) {
    const nextSeparator = body.indexOf(separator, start);
    const part = body.subarray(start + 2, nextSeparator - 2); // +2/-2 to skip \r\n
    start = nextSeparator + separator.length;

    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd === -1) continue;

    const headers = part.subarray(0, headerEnd).toString('utf8');
    const content = part.subarray(headerEnd + 4);

    const nameMatch = headers.match(/name="([^"]+)"/i);
    if (!nameMatch) continue;
    const name = nameMatch[1];
    if (!name) continue;

    const filenameMatch = headers.match(/filename="([^"]+)"/i);
    if (filenameMatch) {
      const mimeTypeMatch = headers.match(/Content-Type:\s*([^\r\n]+)/i);
      const filename = filenameMatch[1];
      if (!filename) continue;
      result.set(name, {
        filename,
        mimeType: mimeTypeMatch ? mimeTypeMatch[1] ?? 'application/octet-stream' : 'application/octet-stream',
        data: content
      });
    } else {
      result.set(name, content.toString('utf8'));
    }
  }

  return result;
}
