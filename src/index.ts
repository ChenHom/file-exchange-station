import { createServer } from 'node:http';
import { env } from './config/env.js';
import { healthHandler } from './server/health.js';

const server = createServer((req, res) => {
  if (req.url === '/health') {
    healthHandler(req, res);
    return;
  }

  res.writeHead(404, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

server.listen(env.PORT, () => {
  console.log(`file-exchange-station listening on http://127.0.0.1:${env.PORT}`);
});
