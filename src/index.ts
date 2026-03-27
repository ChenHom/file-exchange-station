import { createServer } from 'node:http';
import { env } from './config/env.js';
import { runMigrations } from './db/migrate.js';
import { routeRequest } from './server/routes.js';

async function main(): Promise<void> {
  await runMigrations();

  const server = createServer((req, res) => {
    void routeRequest(req, res);
  });

  server.listen(env.PORT, () => {
    console.log(`file-exchange-station listening on http://127.0.0.1:${env.PORT}`);
    console.log(`base url: ${env.APP_BASE_URL}`);
  });
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
