import { describe, it, expect } from 'vitest';
import { getPetugasViews, isOfficerDivision, OFFICER_DIVISION_LABELS } from '@/lib/officerDivision';

describe('officerDivision', () => {
  it('returns laporan views including incoming-reports', () => {
    const views = getPetugasViews('laporan');
    expect(views).toContain('dashboard');
    expect(views).toContain('incoming-reports');
    expect(views).not.toContain('letter-service');
  });

  it('returns surat views including letter-service', () => {
    const views = getPetugasViews('surat');
    expect(views).toContain('letter-service');
    expect(views).not.toContain('incoming-reports');
  });

  it('returns pengaduan views including complaints', () => {
    const views = getPetugasViews('pengaduan');
    expect(views).toContain('complaints');
    expect(views).not.toContain('letter-service');
  });

  it('defaults to laporan when division omitted', () => {
    expect(getPetugasViews()).toEqual(getPetugasViews('laporan'));
  });

  it('validates known divisions', () => {
    expect(isOfficerDivision('laporan')).toBe(true);
    expect(isOfficerDivision('surat')).toBe(true);
    expect(isOfficerDivision('pengaduan')).toBe(true);
    expect(isOfficerDivision('xyz')).toBe(false);
  });

  it('has labels for all divisions', () => {
    expect(OFFICER_DIVISION_LABELS.laporan).toContain('Laporan');
    expect(OFFICER_DIVISION_LABELS.surat).toContain('Surat');
    expect(OFFICER_DIVISION_LABELS.pengaduan).toContain('Pengaduan');
  });
});
