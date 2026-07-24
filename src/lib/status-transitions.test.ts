import { describe, it, expect } from 'vitest';
import {
  canTransitionReport,
  canTransitionLetter,
  canTransitionComplaint,
} from '@/lib/status-transitions';
import { validateNik } from '@/lib/services/account';

describe('status transitions — report', () => {
  it('allows draft to submitted', () => {
    expect(canTransitionReport('draft', 'submitted')).toBe(true);
  });

  it('blocks invalid report transition', () => {
    expect(canTransitionReport('submitted', 'completed')).toBe(false);
  });

  it('allows admin override any status', () => {
    expect(canTransitionReport('submitted', 'completed', { adminOverride: true })).toBe(true);
  });

  it('allows same status (no-op)', () => {
    expect(canTransitionReport('processing', 'processing')).toBe(true);
  });

  it('allows assigned to processing', () => {
    expect(canTransitionReport('assigned', 'processing')).toBe(true);
  });

  it('allows processing to completed', () => {
    expect(canTransitionReport('processing', 'completed')).toBe(true);
  });

  it('blocks transition from completed', () => {
    expect(canTransitionReport('completed', 'processing')).toBe(false);
  });
});

describe('status transitions — letter', () => {
  it('allows draft to submitted', () => {
    expect(canTransitionLetter('draft', 'submitted')).toBe(true);
  });

  it('blocks submitted to completed', () => {
    expect(canTransitionLetter('submitted', 'completed')).toBe(false);
  });

  it('allows verified to ready', () => {
    expect(canTransitionLetter('verified', 'ready')).toBe(true);
  });

  it('allows ready to completed', () => {
    expect(canTransitionLetter('ready', 'completed')).toBe(true);
  });

  it('blocks transition from rejected', () => {
    expect(canTransitionLetter('rejected', 'verified')).toBe(false);
  });
});

describe('status transitions — complaint', () => {
  it('allows submitted to reviewing', () => {
    expect(canTransitionComplaint('submitted', 'reviewing')).toBe(true);
  });

  it('allows reviewing to processing', () => {
    expect(canTransitionComplaint('reviewing', 'processing')).toBe(true);
  });

  it('allows processing to resolved', () => {
    expect(canTransitionComplaint('processing', 'resolved')).toBe(true);
  });

  it('blocks closed to processing', () => {
    expect(canTransitionComplaint('closed', 'processing')).toBe(false);
  });

  it('allows resolved to closed', () => {
    expect(canTransitionComplaint('resolved', 'closed')).toBe(true);
  });
});

describe('NIK validation', () => {
  it('accepts 16 digit NIK', () => {
    expect(validateNik('3201012345678901')).toBe(true);
  });

  it('rejects short NIK', () => {
    expect(validateNik('123')).toBe(false);
  });

  it('rejects non-numeric NIK', () => {
    expect(validateNik('320101234567890X')).toBe(false);
  });

  it('rejects empty NIK', () => {
    expect(validateNik('')).toBe(false);
  });

  it('rejects 17 digit NIK', () => {
    expect(validateNik('32010123456789012')).toBe(false);
  });
});
