import { describe, it, expect, vi } from 'vitest';

vi.mock('../../config/env.js', () => ({
  env: { STORAGE_ROOT: './test-storage', MAX_FILE_SIZE_MB: 20 }
}));

// 先 mock fs/promises
vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    statfs: vi.fn()
  };
});

import { getSystemStats } from '../stats.js';
import { statfs } from 'node:fs/promises';

describe('getSystemStats', () => {
  it('應正確回傳磁碟空間資訊', async () => {
    const mockStats = {
      blocks: 1000000,
      bsize: 4096,
      bfree: 500000
    };
    
    vi.mocked(statfs).mockResolvedValue(mockStats as any);

    const stats = await getSystemStats();

    expect(stats.diskSpace.usagePercent).toBe(50);
  });

  it('應處理邊界案例：磁碟空間幾乎為 0', async () => {
    const mockStats = {
      blocks: 1000,
      bsize: 4096,
      bfree: 0
    };
    vi.mocked(statfs).mockResolvedValue(mockStats as any);
    const stats = await getSystemStats();
    expect(stats.diskSpace.freeMB).toBe(0);
    expect(stats.diskSpace.usagePercent).toBe(100);
  });

  it('發生錯誤時應回傳預設值', async () => {
    vi.mocked(statfs).mockRejectedValue(new Error('error'));
    const stats = await getSystemStats();
    expect(stats.diskSpace.totalMB).toBe(0);
  });
});
