import { createServer } from 'node:http';
import { env } from './config/env.js';
import { routeRequest } from './server/routes.js';

const server = createServer((req, res) => {
  void routeRequest(req, res);
});

server.listen(env.PORT, () => {
  console.log(`file-exchange-station listening on http://127.0.0.1:${env.PORT}`);
  console.log(`base url: ${env.APP_BASE_URL}`);
});
