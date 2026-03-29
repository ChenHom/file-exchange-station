import { describe, it, expect, vi } from 'vitest';

vi.mock('../../config/env.js', () => ({
  env: { STORAGE_ROOT: './test-storage', MAX_FILE_SIZE_MB: 20 }
}));

vi.mock('../../db/query.js', () => ({
  queryOne: vi.fn()
}));

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    statfs: vi.fn()
  };
});

import { getSystemStats } from '../stats.js';
import { statfs } from 'node:fs/promises';
import { queryOne } from '../../db/query.js';

describe('getSystemStats', () => {
  it('應正確回傳磁碟空間與清理資訊', async () => {
    vi.mocked(statfs).mockResolvedValue({ blocks: 100, bsize: 1024, bfree: 50 } as any);
    vi.mocked(queryOne).mockResolvedValue({ config_value: JSON.stringify({ lastRunAt: '2026-03-29T12:00:00Z', removedCount: 5 }) });

    const stats = await getSystemStats();

    expect(stats.diskSpace.usagePercent).toBe(50);
    expect(stats.cleanup.removedCount).toBe(5);
  });

  it('發生錯誤時應回傳預設值', async () => {
    vi.mocked(statfs).mockRejectedValue(new Error('error'));
    const stats = await getSystemStats();
    expect(stats.diskSpace.totalMB).toBe(0);
    expect(stats.cleanup.lastRunAt).toBeNull();
  });
});
