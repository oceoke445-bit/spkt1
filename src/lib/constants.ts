export const caseTypes = [
  'Kehilangan',
  'Pencurian',
  'Penipuan',
  'Kecelakaan Lalu Lintas',
  'Kekerasan',
  'Narkoba',
  'Penganiayaan',
  'Lainnya',
];

export const letterTypes = [
  {
    id: 'skck',
    name: 'SKCK (Surat Keterangan Catatan Kepolisian)',
    description: 'Surat keterangan untuk keperluan administratif',
  },
  {
    id: 'kehilangan',
    name: 'Surat Keterangan Kehilangan',
    description: 'Surat keterangan dokumen/barang hilang (KTP, SIM, KK, STNK, dll.)',
  },
  {
    id: 'kerusakan',
    name: 'Surat Keterangan Dokumen Rusak',
    description: 'Surat keterangan/pengantar penggantian dokumen rusak (KTP, SIM, KK, dll.)',
  },
  {
    id: 'keramaian',
    name: 'Izin Keramaian',
    description: 'Izin untuk mengadakan acara atau keramaian',
  },
];

export const complaintCategories = [
  { value: 'pelayanan', label: 'Pelayanan' },
  { value: 'petugas', label: 'Petugas' },
  { value: 'fasilitas', label: 'Fasilitas' },
  { value: 'sistem', label: 'Sistem/Aplikasi' },
  { value: 'lainnya', label: 'Lainnya' },
];
