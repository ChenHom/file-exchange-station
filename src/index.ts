import { createServer } from 'node:http';
import { env } from './config/env.js';
import { runMigrations } from './db/migrate.js';
import { routeRequest } from './server/routes.js';
import { cleanupExpired } from './jobs/cleanup.js';
import { getNgrokUrlFromLocal, updateSystemConfig } from './modules/config/system-config.js';

async function main(): Promise<void> {
  await runMigrations();

  // Trigger cleanup every 15 minutes
  setInterval(() => {
    cleanupExpired().catch(console.error);
  }, 15 * 60 * 1000);

  // Check ngrok URL every 5 minutes
  setInterval(async () => {
    const url = await getNgrokUrlFromLocal();
    if (url) {
      try {
        await updateSystemConfig('ngrok_url', url);
        console.log(`Updated ngrok url in DB: ${url}`);
      } catch (err) {
        console.error('Failed to update ngrok url in DB', err);
      }
    }
  }, 5 * 60 * 1000);

  // Run once on startup
  void cleanupExpired().catch(console.error);
  void getNgrokUrlFromLocal().then(async (url) => {
    if (url) await updateSystemConfig('ngrok_url', url);
  }).catch(() => {});

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
