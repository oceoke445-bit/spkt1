import { describe, it, expect } from 'vitest';
import { checkRateLimit } from '@/lib/rate-limit';

describe('checkRateLimit', () => {
  it('allows requests within the limit', () => {
    const key = `test-allow-${Date.now()}`;
    expect(checkRateLimit(key, 3, 60_000)).toBe(true);
    expect(checkRateLimit(key, 3, 60_000)).toBe(true);
    expect(checkRateLimit(key, 3, 60_000)).toBe(true);
  });

  it('blocks requests after max is reached', () => {
    const key = `test-block-${Date.now()}`;
    for (let i = 0; i < 10; i += 1) {
      expect(checkRateLimit(key, 10, 60_000)).toBe(true);
    }
    expect(checkRateLimit(key, 10, 60_000)).toBe(false);
  });

  it('uses separate buckets per key', () => {
    const a = `test-a-${Date.now()}`;
    const b = `test-b-${Date.now()}`;
    expect(checkRateLimit(a, 1, 60_000)).toBe(true);
    expect(checkRateLimit(a, 1, 60_000)).toBe(false);
    expect(checkRateLimit(b, 1, 60_000)).toBe(true);
  });
});
