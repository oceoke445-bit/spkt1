import type { OfficerDivision } from '@/lib/types/spkt';

export const OFFICER_DIVISION_LABELS: Record<OfficerDivision, string> = {
  laporan: 'Divisi Laporan',
  surat: 'Divisi Surat',
  pengaduan: 'Divisi Pengaduan',
};

export const PETUGAS_VIEWS_BY_DIVISION: Record<OfficerDivision, string[]> = {
  laporan: ['dashboard', 'incoming-reports', 'settings'],
  surat: ['dashboard', 'letter-service', 'settings'],
  pengaduan: ['dashboard', 'complaints', 'settings'],
};

export function getPetugasViews(division: OfficerDivision = 'laporan'): string[] {
  return PETUGAS_VIEWS_BY_DIVISION[division];
}

export function isOfficerDivision(value: string): value is OfficerDivision {
  return value === 'laporan' || value === 'surat' || value === 'pengaduan';
}
