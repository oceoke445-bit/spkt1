import { describe, it, expect } from 'vitest';
import { getDimensions } from './csi';

describe('Logika Survei Kepuasan CSI (csi.ts)', () => {
  it('harus mengembalikan 5 dimensi kepuasan masyarakat', () => {
    const dimensions = getDimensions();
    expect(dimensions).toHaveLength(5);
    expect(dimensions[0]).toHaveProperty('code');
    expect(dimensions[0]).toHaveProperty('weight');
  });
});
