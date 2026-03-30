import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Readable } from 'node:stream';

vi.mock('../src/config/env.js', () => ({
  env: { 
    MAX_FILE_SIZE_MB: 20, 
    APP_BASE_URL: 'http://test',
    STORAGE_ROOT: './test-storage'
  }
}));

// Mock 掉資料庫與頻率限制，防止 Side Effects
vi.mock('../src/db/query.js', () => ({ queryOne: vi.fn(), queryMany: vi.fn(), execute: vi.fn() }));
vi.mock('../src/shared/rate-limit.js', () => ({ isRateLimited: vi.fn(() => ({ allowed: true, remaining: 10, resetAt: Date.now() + 1000 })) }));

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
    req = { 
      url: '', 
      method: '', 
      headers: {}, 
      socket: { remoteAddress: '127.0.0.1' } // 補上 socket 避免報錯
    };
    res = {
      writeHead: vi.fn(),
      end: vi.fn(),
      setHeader: vi.fn()
    };
    vi.clearAllMocks();
  });

  // --- 正向測試 ---
  it('GET /api/stats 應正確回傳系統統計數據', async () => {
    req.url = '/api/stats';
    req.method = 'GET';
    (statsJob.getSystemStats as any).mockResolvedValue({ 
      diskSpace: { freeMB: 1000 },
      cleanup: { lastRunAt: null, removedCount: 0 }
    });

    await routeRequest(req, res);
    expect(res.writeHead).toHaveBeenCalledWith(200, expect.any(Object));
  });

  it('POST /api/sessions 應成功建立 Session', async () => {
    const body = JSON.stringify({ title: 'Test Session' });
    const reqStream = Readable.from([Buffer.from(body)]) as any;
    reqStream.url = '/api/sessions';
    reqStream.method = 'POST';
    reqStream.headers = { 'content-length': String(body.length) };
    reqStream.socket = { remoteAddress: '127.0.0.1' };

    (sessionService.createSession as any).mockResolvedValue({
      id: 1, code: 'NEWCODE12345', title: 'Test Session', status: 'active', expiresAt: '2026-03-31T00:00:00Z'
    });

    await routeRequest(reqStream, res);
    expect(res.writeHead).toHaveBeenCalledWith(201, expect.any(Object));
  });

  it('GET /api/sessions/:code/files 應回傳 Session 與空檔案列表 (初始化流程)', async () => {
    const code = 'NEWCODE12345';
    req.url = `/api/sessions/${code}/files`;
    req.method = 'GET';

    (sessionService.getSessionByCode as any).mockResolvedValue({
      id: 1, code, status: 'active', expiresAt: '2026-03-31T00:00:00Z'
    });
    (fileService.listFilesBySession as any).mockResolvedValue([]);

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

  // --- 反向測試 ---
  it('下載 ZIP 時若 Session 不存在應回 404', async () => {
    req.url = '/api/sessions/NONE/download-all';
    req.method = 'GET';
    (sessionService.getSessionByCode as any).mockResolvedValue(null);

    await routeRequest(req, res);
    expect(res.writeHead).toHaveBeenCalledWith(404, expect.any(Object));
  });

  it('上傳檔案時若磁碟空間不足應回 503', async () => {
    req.url = '/api/sessions/CODE/files';
    req.method = 'POST';
    req.headers['content-type'] = 'multipart/form-data; boundary=xxx';

    (sessionService.getSessionByCode as any).mockResolvedValue({
      id: 1, status: 'active', expiresAt: new Date(Date.now() + 10000).toISOString()
    });
    (statsJob.getSystemStats as any).mockResolvedValue({ diskSpace: { freeMB: 5 } });

    await routeRequest(req, res);
    expect(res.writeHead).toHaveBeenCalledWith(503, expect.any(Object));
  });

  // --- 邊界測試 ---
  it('下載 ZIP 時若 Session 內無檔案應回 404', async () => {
    const code = 'EMPTY1234567';
    req.url = `/api/sessions/${code}/download-all`;
    req.method = 'GET';

    (sessionService.getSessionByCode as any).mockResolvedValue({
      id: 1, code, status: 'active', expiresAt: new Date(Date.now() + 3600000).toISOString()
    });
    (fileService.listFilesBySession as any).mockResolvedValue([]);

    await routeRequest(req, res);
    expect(res.writeHead).toHaveBeenCalledWith(404, expect.any(Object));
  });
});
