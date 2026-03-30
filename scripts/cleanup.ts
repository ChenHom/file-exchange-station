import { cleanupExpired } from '../src/jobs/cleanup.js';

async function run(): Promise<void> {
  console.log('[Manual Cleanup] Starting cleanup job...');
  try {
    const removedCount = await cleanupExpired();
    console.log(`[Manual Cleanup] Success. Removed ${removedCount} items.`);
    process.exit(0);
  } catch (err) {
    console.error('[Manual Cleanup] Failed:', err);
    process.exit(1);
  }
}

void run();
