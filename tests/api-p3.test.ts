import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/config/env.js', () => ({
  env: { 
    MAX_FILE_SIZE_MB: 20, 
    APP_BASE_URL: 'http://test',
    STORAGE_ROOT: './test-storage'
  }
}));

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
    vi.clearAllMocks();
  });

  // --- 正向測試 (Positive) ---
  it('GET /api/stats 應正確回傳系統統計數據', async () => {
    req.url = '/api/stats';
    req.method = 'GET';
    (statsJob.getSystemStats as any).mockResolvedValue({ diskSpace: { freeMB: 1000 } });

    await routeRequest(req, res);
    expect(res.writeHead).toHaveBeenCalledWith(200, expect.any(Object));
  });

  it('GET /api/sessions/:code/download-all 應回傳 ZIP 串流', async () => {
    const code = 'ABCDEFGH2345';
    req.url = `/api/sessions/${code}/download-all`;
    req.method = 'GET';

    (sessionService.getSessionByCode as any).mockResolvedValue({
      id: 1, code, status: 'active', expiresAt: new Date(Date.now() + 3600000).toISOString()
    });
    (fileService.listFilesBySession as any).mockResolvedValue([{ id: 1, originalName: 'a.txt', storedName: 's1' }]);

    await routeRequest(req, res);
    expect(res.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({ 'Content-Type': 'application/zip' }));
  });

  // --- 反向測試 (Negative) ---
  it('下載 ZIP 時若 Session 不存在應回 404', async () => {
    req.url = '/api/sessions/NONE/download-all';
    req.method = 'GET';
    (sessionService.getSessionByCode as any).mockResolvedValue(null);

    await routeRequest(req, res);
    expect(res.writeHead).toHaveBeenCalledWith(404, expect.any(Object));
    const body = JSON.parse(vi.mocked(res.end).mock.calls[0][0]);
    expect(body.error.code).toBe('SESSION_NOT_FOUND');
  });

  it('下載 ZIP 時若 Session 已過期應回 403', async () => {
    const code = 'EXPIRED12345';
    req.url = `/api/sessions/${code}/download-all`;
    req.method = 'GET';

    (sessionService.getSessionByCode as any).mockResolvedValue({
      id: 1, code, status: 'expired', expiresAt: new Date(Date.now() - 1000).toISOString()
    });

    await routeRequest(req, res);
    expect(res.writeHead).toHaveBeenCalledWith(403, expect.any(Object));
  });

  it('上傳檔案時若磁碟空間不足應回 503', async () => {
    req.url = '/api/sessions/CODE/files';
    req.method = 'POST';
    req.headers['content-type'] = 'multipart/form-data; boundary=xxx';

    (sessionService.getSessionByCode as any).mockResolvedValue({
      id: 1, status: 'active', expiresAt: new Date(Date.now() + 10000).toISOString()
    });
    (statsJob.getSystemStats as any).mockResolvedValue({ diskSpace: { freeMB: 5 } }); // 5MB < 20MB (limit)

    await routeRequest(req, res);
    expect(res.writeHead).toHaveBeenCalledWith(503, expect.any(Object));
  });

  // --- 邊界測試 (Edge) ---
  it('下載 ZIP 時若 Session 內無檔案應回 404', async () => {
    const code = 'EMPTY1234567';
    req.url = `/api/sessions/${code}/download-all`;
    req.method = 'GET';

    (sessionService.getSessionByCode as any).mockResolvedValue({
      id: 1, code, status: 'active', expiresAt: new Date(Date.now() + 3600000).toISOString()
    });
    (fileService.listFilesBySession as any).mockResolvedValue([]); // 空檔案列表

    await routeRequest(req, res);
    expect(res.writeHead).toHaveBeenCalledWith(404, expect.any(Object));
    const body = JSON.parse(vi.mocked(res.end).mock.calls[0][0]);
    expect(body.error.code).toBe('FILE_NOT_FOUND');
  });

  it('上傳檔案時磁碟空間正好等於限制值時應允許 (或邊界判定)', async () => {
    req.url = '/api/sessions/CODE/files';
    req.method = 'POST';
    req.headers['content-type'] = 'multipart/form-data; boundary=xxx';

    (sessionService.getSessionByCode as any).mockResolvedValue({
      id: 1, status: 'active', expiresAt: new Date(Date.now() + 10000).toISOString()
    });
    (statsJob.getSystemStats as any).mockResolvedValue({ diskSpace: { freeMB: 20 } }); // 正好等於上限 20MB

    // 注意：routeRequest 內會繼續往下跑讀取 Body，這裡會因為 mock body 為空而報錯，但我們只需驗證它沒拋出 503
    try { await routeRequest(req, res); } catch (e) {}
    
    // 驗證沒呼叫 503 (表示通過了空間檢查)
    const calls = vi.mocked(res.writeHead).mock.calls;
    const has503 = calls.some(c => c[0] === 503);
    expect(has503).toBe(false);
  });
});
