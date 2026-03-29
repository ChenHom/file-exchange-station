type RateLimitRecord = {
  count: number;
  resetAt: number;
};

const storage = new Map<string, RateLimitRecord>();

/**
 * 簡易記憶體式 Rate Limiter
 * @param key 識別標記 (如 IP)
 * @param limit 允許次數
 * @param windowMs 時間視窗 (毫秒)
 * @returns 是否允許
 */
export function isRateLimited(key: string, limit: number, windowMs: number): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const record = storage.get(key);

  if (!record || now > record.resetAt) {
    const newRecord = { count: 1, resetAt: now + windowMs };
    storage.set(key, newRecord);
    return { allowed: true, remaining: limit - 1, resetAt: newRecord.resetAt };
  }

  if (record.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: record.resetAt };
  }

  record.count += 1;
  return { allowed: true, remaining: limit - record.count, resetAt: record.resetAt };
}

// 清理過期記錄 (防止內存洩漏)
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of storage.entries()) {
    if (now > record.resetAt) storage.delete(key);
  }
}, 60000);
