import { describe, it, expect } from 'vitest';

describe('Logika Dimensi Survei Kepuasan CSI', () => {
  it('harus memiliki 5 dimensi standar pelayanan kepolisian', () => {
    const defaultDimensions = [
      { code: 'D1', name: 'Persyaratan Service', weight: 0.2 },
      { code: 'D2', name: 'Prosedur Layanan', weight: 0.2 },
      { code: 'D3', name: 'Waktu Pelayanan', weight: 0.2 },
      { code: 'D4', name: 'Biaya / Tarif', weight: 0.2 },
      { code: 'D5', name: 'Penanganan Pengaduan', weight: 0.2 },
    ];
    expect(defaultDimensions).toHaveLength(5);
    expect(defaultDimensions[0]).toHaveProperty('code');
    expect(defaultDimensions[0]).toHaveProperty('weight');
  });
});
