import { describe, it, expect } from 'vitest';

function formatReferenceNumber(prefix: string, sequence: number, year: number): string {
  const padded = String(sequence).padStart(3, '0');
  return `${prefix}/${padded}/V/${year}`;
}

describe('Nomor Referensi Auto-Generator (reference.ts)', () => {
  it('harus membuat format nomor laporan LP yang valid', () => {
    const ref = formatReferenceNumber('LP', 1, 2026);
    expect(ref).toMatch(/^LP\/\d{3}\/V\/\d{4}$/);
  });

  it('harus membuat format nomor pengaduan ADU yang valid', () => {
    const ref = formatReferenceNumber('ADU', 1, 2026);
    expect(ref).toMatch(/^ADU\/\d{3}\/V\/\d{4}$/);
  });

  it('harus membuat format nomor surat SKCK yang valid', () => {
    const ref = formatReferenceNumber('SKCK', 1, 2026);
    expect(ref).toMatch(/^SKCK\/\d{3}\/V\/\d{4}$/);
  });
});
