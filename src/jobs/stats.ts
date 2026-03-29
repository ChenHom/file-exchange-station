import { statfs } from 'node:fs/promises';
import { env } from '../config/env.js';
import { queryOne } from '../db/query.js';

export async function getSystemStats() {
  try {
    const stats = await statfs(env.STORAGE_ROOT);
    const totalBytes = stats.blocks * stats.bsize;
    const freeBytes = stats.bfree * stats.bsize;
    const usedBytes = totalBytes - freeBytes;

    const cleanupRecord = await queryOne<{ config_value: string }>(
      'SELECT config_value FROM system_config WHERE config_key = ?',
      ['last_cleanup_stats']
    );

    return {
      diskSpace: {
        totalMB: Math.round(totalBytes / 1024 / 1024),
        usedMB: Math.round(usedBytes / 1024 / 1024),
        freeMB: Math.round(freeBytes / 1024 / 1024),
        usagePercent: Math.round((usedBytes / totalBytes) * 100)
      },
      cleanup: cleanupRecord ? JSON.parse(cleanupRecord.config_value) : { lastRunAt: null, removedCount: 0 }
    };
  } catch (error) {
    console.error('Error fetching system stats:', error);
    return {
      diskSpace: { totalMB: 0, usedMB: 0, freeMB: 0, usagePercent: 0 },
      cleanup: { lastRunAt: null, removedCount: 0 }
    };
  }
}
