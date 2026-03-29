import { statfs } from 'node:fs/promises';
import { env } from '../config/env.js';

export async function getSystemStats() {
  try {
    const stats = await statfs(env.STORAGE_ROOT);
    // bytes
    const totalBytes = stats.blocks * stats.bsize;
    const freeBytes = stats.bfree * stats.bsize;
    const usedBytes = totalBytes - freeBytes;

    return {
      diskSpace: {
        totalMB: Math.round(totalBytes / 1024 / 1024),
        usedMB: Math.round(usedBytes / 1024 / 1024),
        freeMB: Math.round(freeBytes / 1024 / 1024),
        usagePercent: Math.round((usedBytes / totalBytes) * 100)
      }
    };
  } catch (error) {
    console.error('Error fetching system stats:', error);
    return {
      diskSpace: { totalMB: 0, usedMB: 0, freeMB: 0, usagePercent: 0 }
    };
  }
}
