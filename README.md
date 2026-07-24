# SPKT Digital

Sistem Pelayanan Kepolisian Terpadu — Next.js 15 + SQLite.

## Persyaratan

- Node.js **>= 22.5.0** (untuk `node:sqlite`)
- npm

## Setup Lokal

```bash
npm install
npm run dev
```

Buka http://localhost:3000

Database dan seed data dibuat otomatis di `data/spkt.db` saat pertama kali API dipanggil.

### Akun Demo

| Role | Email | Password |
|------|-------|----------|
| Masyarakat | `user@spkt.id` | `spkt123` |
| Petugas Laporan | `petugas@spkt.id` | `spkt123` |
| Petugas Surat | `petugas-surat@spkt.id` | `spkt123` |
| Petugas Pengaduan | `petugas-pengaduan@spkt.id` | `spkt123` |
| Admin | `admin@spkt.id` | `spkt123` |

### Environment (opsional)

| Variable | Default | Keterangan |
|----------|---------|------------|
| `DATA_DIR` | `./data` | Folder data & SQLite |
| `DATABASE_PATH` | `DATA_DIR/spkt.db` | Path database |
| `UPLOAD_DIR` | `DATA_DIR/uploads` | File upload fisik |

## Scripts

| Command | Fungsi |
|---------|--------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Jalankan production |
| `npm run test` | Unit tests (Vitest) |
| `npm run backup:db` | Backup SQLite & uploads ke `data/backups/` |

### Environment (opsional)

Salin `.env.example` ke `.env.local` jika perlu override.

## Dokumentasi

- **[Diagram & alur aplikasi lengkap](docs/DIAGRAM_ALUR_APLIKASI.md)** — role, menu, laporan, surat, pengaduan, assign, API, database
- **[Pengujian White / Black / Grey Box](docs/PENGUJIAN.md)** — kasus uji + cara menjalankan `npm run test`

## Struktur Penting

```
src/app/api/     REST API
src/components/  UI React
src/lib/db.ts    Schema SQLite + seed
data/spkt.db     Database (auto-created)
data/uploads/    File upload fisik
```

## Deploy

Railway — healthcheck `/api/health`. Pastikan `DATA_DIR` persisten (volume) agar database dan upload tidak hilang saat redeploy.
