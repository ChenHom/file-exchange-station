import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isRateLimited } from '../rate-limit.js';

describe('Rate Limiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('應允許在限制內的請求', () => {
    const key = 'test-1';
    const result1 = isRateLimited(key, 2, 1000);
    expect(result1.allowed).toBe(true);
    expect(result1.remaining).toBe(1);

    const result2 = isRateLimited(key, 2, 1000);
    expect(result2.allowed).toBe(true);
    expect(result2.remaining).toBe(0);
  });

  it('應阻擋超過限制的請求', () => {
    const key = 'test-2';
    isRateLimited(key, 1, 1000);
    const result = isRateLimited(key, 1, 1000);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('過期後應重設限制', () => {
    const key = 'test-3';
    isRateLimited(key, 1, 1000);
    
    // 前進 1.1 秒
    vi.advanceTimersByTime(1100);
    
    const result = isRateLimited(key, 1, 1000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
  });
});
