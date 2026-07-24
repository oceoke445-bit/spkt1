import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, isPasswordHashed } from '@/lib/password';

describe('password hashing', () => {
  it('hashes password with scrypt prefix', () => {
    const hashed = hashPassword('spkt123');
    expect(isPasswordHashed(hashed)).toBe(true);
    expect(hashed.startsWith('scrypt:')).toBe(true);
  });

  it('verifies correct password', () => {
    const hashed = hashPassword('spkt123');
    expect(verifyPassword('spkt123', hashed)).toBe(true);
  });

  it('rejects wrong password', () => {
    const hashed = hashPassword('spkt123');
    expect(verifyPassword('salah', hashed)).toBe(false);
  });

  it('supports legacy plain-text stored password', () => {
    expect(verifyPassword('spkt123', 'spkt123')).toBe(true);
    expect(verifyPassword('salah', 'spkt123')).toBe(false);
  });
});
