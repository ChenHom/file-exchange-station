import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/config/env.js', () => ({
  env: { 
    MAX_FILE_SIZE_MB: 20, 
    APP_BASE_URL: 'http://test',
    STORAGE_ROOT: './test-storage'
  }
}));

import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { routeRequest } from '../src/server/routes.js';
import * as statsJob from '../src/jobs/stats.js';
import * as sessionService from '../src/modules/sessions/session-service.js';
import * as fileService from '../src/modules/files/file-service.js';

vi.mock('../src/jobs/stats.js');
vi.mock('../src/modules/sessions/session-service.js');
vi.mock('../src/modules/files/file-service.js');

describe('API P3 Integration (Mocked)', () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    req = { url: '', method: '', headers: {} };
    res = {
      writeHead: vi.fn(),
      end: vi.fn(),
      setHeader: vi.fn()
    };
  });

  it('GET /api/stats 應回傳系統狀態', async () => {
    req.url = '/api/stats';
    req.method = 'GET';
    const mockStats = { diskSpace: { totalMB: 100, usedMB: 10, freeMB: 90, usagePercent: 10 } };
    (statsJob.getSystemStats as any).mockResolvedValue(mockStats);

    await routeRequest(req, res);

    expect(res.writeHead).toHaveBeenCalledWith(200, expect.any(Object));
    const output = JSON.parse(vi.mocked(res.end).mock.calls[0][0]);
    expect(output.success).toBe(true);
    expect(output.data.diskSpace.totalMB).toBe(100);
  });

  it('GET /api/sessions/:code/download-all 應處理 ZIP 下載', async () => {
    const code = 'ABCDEFGH2345';
    req.url = `/api/sessions/${code}/download-all`;
    req.method = 'GET';

    (sessionService.getSessionByCode as any).mockResolvedValue({
      id: 1,
      code,
      status: 'active',
      expiresAt: new Date(Date.now() + 10000).toISOString()
    });
    (fileService.listFilesBySession as any).mockResolvedValue([
      { id: 101, code: 'F1', originalName: 't1.txt', storedName: 's1' }
    ]);

    await routeRequest(req, res);

    // 驗證是否設定了正確的 Content-Type
    expect(res.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({
      'Content-Type': 'application/zip'
    }));
  });

  it('磁碟空間不足時 POST /api/sessions/:code/files 應回傳 503', async () => {
    const code = 'ABCDEFGH2345';
    req.url = `/api/sessions/${code}/files`;
    req.method = 'POST';
    req.headers['content-type'] = 'multipart/form-data; boundary=xxx';

    (sessionService.getSessionByCode as any).mockResolvedValue({
      id: 1,
      code,
      status: 'active',
      expiresAt: new Date(Date.now() + 10000).toISOString()
    });
    // 模擬磁碟空間不足 (freeMB < env.MAX_FILE_SIZE_MB)
    (statsJob.getSystemStats as any).mockResolvedValue({ diskSpace: { freeMB: 5 } });

    await routeRequest(req, res);

    expect(res.writeHead).toHaveBeenCalledWith(503, expect.any(Object));
    const output = JSON.parse(vi.mocked(res.end).mock.calls[0][0]);
    expect(output.error.code).toBe('STORAGE_FULL');
  });
});
