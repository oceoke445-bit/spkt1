import { describe, it, expect } from 'vitest';
import { allocateReferenceNumber } from './reference';

describe('Nomor Referensi Auto-Generator (reference.ts)', () => {
  it('harus membuat format nomor laporan LP yang valid', () => {
    const ref = allocateReferenceNumber('LP');
    expect(ref).toMatch(/^LP\/\d{3}\/V\/\d{4}$/);
  });

  it('harus membuat format nomor pengaduan ADU yang valid', () => {
    const ref = allocateReferenceNumber('ADU');
    expect(ref).toMatch(/^ADU\/\d{3}\/V\/\d{4}$/);
  });

  it('harus membuat format nomor surat SKCK yang valid', () => {
    const ref = allocateReferenceNumber('SKCK');
    expect(ref).toMatch(/^SKCK\/\d{3}\/V\/\d{4}$/);
  });
});
