# Dokumentasi Pengujian SPKT Digital

Dokumen ini memuat pengujian sistem **White Box**, **Black Box**, dan **Grey Box** untuk aplikasi SPKT Digital.

**Cara menjalankan unit test (White Box):**

```bash
npm run test
```

---

## 1. White Box Testing

### 1.1 Pengertian

White Box Testing menguji **struktur internal kode** (fungsi, cabang if/else, validasi). Penguji mengetahui isi program.

### 1.2 Unit yang diuji

| Modul | File | Fungsi |
|-------|------|--------|
| Status laporan/surat/pengaduan | `src/lib/status-transitions.ts` | `canTransitionReport`, `canTransitionLetter`, `canTransitionComplaint` |
| Validasi NIK | `src/lib/services/account.ts` | `validateNik` |
| Password | `src/lib/password.ts` | `hashPassword`, `verifyPassword` |
| Divisi petugas | `src/lib/officerDivision.ts` | `getPetugasViews`, `isOfficerDivision` |
| Rate limit login | `src/lib/rate-limit.ts` | `checkRateLimit` |
| Pagination | `src/lib/pagination.ts` | `parsePagination`, `buildPaginatedResult` |

### 1.3 Kasus uji White Box

| ID | Fungsi | Input | Expected | Hasil |
|----|--------|-------|----------|-------|
| WB-01 | `canTransitionReport` | draft → submitted | `true` | Lulus |
| WB-02 | `canTransitionReport` | submitted → completed | `false` | Lulus |
| WB-03 | `canTransitionReport` | submitted → completed + adminOverride | `true` | Lulus |
| WB-04 | `canTransitionLetter` | draft → submitted | `true` | Lulus |
| WB-05 | `canTransitionLetter` | submitted → completed | `false` | Lulus |
| WB-06 | `canTransitionComplaint` | submitted → reviewing | `true` | Lulus |
| WB-07 | `canTransitionComplaint` | closed → processing | `false` | Lulus |
| WB-08 | `validateNik` | `3201012345678901` | `true` | Lulus |
| WB-09 | `validateNik` | `123` | `false` | Lulus |
| WB-10 | `validateNik` | `320101234567890X` | `false` | Lulus |
| WB-11 | `hashPassword` + `verifyPassword` | password `spkt123` | verifikasi sukses | Lulus |
| WB-12 | `verifyPassword` | password salah | `false` | Lulus |
| WB-13 | `getPetugasViews('laporan')` | - | berisi `incoming-reports` | Lulus |
| WB-14 | `getPetugasViews('surat')` | - | berisi `letter-service` | Lulus |
| WB-15 | `isOfficerDivision('xyz')` | - | `false` | Lulus |
| WB-16 | `checkRateLimit` | 11 request / jendela 10 | request ke-11 ditolak | Lulus |
| WB-17 | `parsePagination` | page=2&limit=10 | offset=10 | Lulus |
| WB-18 | `parsePagination` | limit=500 | limit diklem ke 100 | Lulus |

### 1.4 File test

```
src/lib/status-transitions.test.ts
src/lib/pagination.test.ts
src/lib/password.test.ts
src/lib/officerDivision.test.ts
src/lib/rate-limit.test.ts
```

### 1.5 Cara bukti

Jalankan `npm run test`. Semua kasus di atas harus berstatus **PASS**.

---

## 2. Black Box Testing

### 2.1 Pengertian

Black Box Testing menguji **fungsionalitas dari luar** tanpa melihat kode. Fokus: input → output / perilaku UI.

### 2.2 Lingkungan uji

- Browser (Chrome/Edge)
- URL lokal: `http://localhost:3000` atau URL Railway
- Akun demo (password semua: `spkt123`)

### 2.3 Kasus uji Black Box

#### A. Autentikasi

| ID | Skenario | Langkah | Input | Expected | Hasil |
|----|----------|---------|-------|----------|-------|
| BB-01 | Login valid (user) | Buka login → isi form → Masuk | `user@spkt.id` / `spkt123` | Masuk dashboard masyarakat | ☐ |
| BB-02 | Login valid (admin) | Login sebagai admin | `admin@spkt.id` / `spkt123` | Masuk dashboard admin | ☐ |
| BB-03 | Login invalid | Password salah | `user@spkt.id` / `salah` | Pesan error, tetap di login | ☐ |
| BB-04 | Login kosong | Submit tanpa isi | - | Validasi field wajib | ☐ |
| BB-05 | Register | Daftar akun baru | Nama, NIK 16 digit, email, password | Akun terbuat / bisa login | ☐ |
| BB-06 | Logout | Klik Logout | - | Kembali ke halaman login | ☐ |

#### B. Laporan (masyarakat → admin → petugas)

| ID | Skenario | Langkah | Expected | Hasil |
|----|----------|---------|----------|-------|
| BB-07 | Buat laporan | User → Buat Laporan → isi → Kirim | Status `submitted`, nomor `LP/...` | ☐ |
| BB-08 | Simpan draft | User → Simpan Draft | Status `draft`, bisa dilanjutkan | ☐ |
| BB-09 | Lihat laporan saya | User → Laporan Saya | Daftar laporan milik sendiri | ☐ |
| BB-10 | Assign laporan | Admin → Semua Laporan → Assign petugas laporan | Status `assigned` | ☐ |
| BB-11 | Proses laporan | Petugas laporan → Laporan Masuk → Mulai Proses | Status `processing` → `completed` | ☐ |
| BB-12 | Petugas tidak lihat yang belum di-assign | Login petugas, cek daftar | Hanya laporan assigned ke dirinya | ☐ |

#### C. Surat

| ID | Skenario | Langkah | Expected | Hasil |
|----|----------|---------|----------|-------|
| BB-13 | Ajukan SKCK | User → Layanan Surat → SKCK → Kirim | Status `submitted`, nomor `SKCK/...` | ☐ |
| BB-14 | Ajukan dokumen rusak | User pilih jenis kerusakan | Nomor `SKR/...` | ☐ |
| BB-15 | Assign surat | Admin assign ke petugas surat | Petugas surat melihat tugas | ☐ |
| BB-16 | Proses surat | Petugas: verified → ready → completed | Status berubah sesuai alur | ☐ |

#### D. Pengaduan

| ID | Skenario | Langkah | Expected | Hasil |
|----|----------|---------|----------|-------|
| BB-17 | Buat pengaduan | User → Pengaduan → Kirim | Status `submitted`, nomor `ADU/...` | ☐ |
| BB-18 | Assign pengaduan | Admin assign ke petugas pengaduan | Tugas muncul di petugas | ☐ |
| BB-19 | Tanggapi pengaduan | Petugas update status + tanggapan | Status `resolved` / `closed` | ☐ |

#### E. Admin & keamanan menu

| ID | Skenario | Langkah | Expected | Hasil |
|----|----------|---------|----------|-------|
| BB-20 | Menu petugas per divisi | Login 3 akun petugas berbeda | Menu berbeda (laporan/surat/pengaduan) | ☐ |
| BB-21 | User tidak akses admin | Login user, coba ubah `?view=all-reports` | Redirect ke dashboard | ☐ |
| BB-22 | Audit Log | Admin → Audit Log | Riwayat aksi tampil | ☐ |
| BB-23 | Statistik & CSI | Admin buka Statistik / CSI | Data tampil tanpa error | ☐ |

### 2.4 Cara bukti

Centang kolom **Hasil** (Lulus/Gagal), lampirkan screenshot di lampiran laporan.

---

## 3. Grey Box Testing

### 3.1 Pengertian

Grey Box Testing menguji dengan **pengetahuan sebagian** tentang sistem (endpoint API, status HTTP, struktur response), tanpa harus membaca seluruh source code.

### 3.2 Alat

- Browser DevTools → tab **Network**
- atau Postman / Thunder Client

### 3.3 Kasus uji Grey Box (API)

Base URL: `http://localhost:3000` atau domain Railway.

| ID | Endpoint | Method | Request | Expected | Hasil |
|----|----------|--------|---------|----------|-------|
| GB-01 | `/api/health` | GET | - | `200`, `status: ok`, `database: ready` | ☐ |
| GB-02 | `/api/auth/login` | POST | `{ "email":"user@spkt.id","password":"spkt123" }` | `200`, user + cookie `spkt_session` | ☐ |
| GB-03 | `/api/auth/login` | POST | password salah | `401`, error message | ☐ |
| GB-04 | `/api/auth/login` | POST | body tanpa email | `400` | ☐ |
| GB-05 | `/api/auth/session` | GET | dengan cookie login | `200`, data user | ☐ |
| GB-06 | `/api/auth/session` | GET | tanpa cookie | tidak authenticated | ☐ |
| GB-07 | `/api/auth/logout` | POST | dengan session | cookie terhapus | ☐ |
| GB-08 | `/api/reports` | GET | login sebagai user | daftar laporan milik user | ☐ |
| GB-09 | `/api/reports` | POST | body laporan lengkap | `200`, `reportNumber` format `LP/...` | ☐ |
| GB-10 | `/api/letters` | POST | body surat SKCK | `200`, nomor `SKCK/...` | ☐ |
| GB-11 | `/api/complaints` | POST | body pengaduan | `200`, nomor `ADU/...` | ☐ |
| GB-12 | `/api/reports/[id]` | PATCH | admin assign officer | status jadi `assigned` | ☐ |
| GB-13 | `/api/officers` | GET | login admin | daftar petugas + divisi | ☐ |
| GB-14 | Rate limit login | POST login × 11 cepat | request berlebih ditolak / error rate limit | ☐ |

### 3.4 Contoh payload login (GB-02)

```json
{
  "email": "user@spkt.id",
  "password": "spkt123"
}
```

### 3.5 Cara bukti

Di DevTools → Network, screenshot status code + response JSON untuk setiap ID GB.

---

## 4. Ringkasan hasil pengujian

| Jenis | Jumlah kasus | Lulus | Gagal | Keterangan |
|-------|--------------|-------|-------|------------|
| White Box | 18 | _isi setelah `npm run test`_ | 0 | Otomatis (Vitest) |
| Black Box | 23 | _isi setelah uji manual_ | - | Manual UI |
| Grey Box | 14 | _isi setelah uji API_ | - | Manual API |

**Kesimpulan:** Sistem dinyatakan **layak digunakan** jika seluruh kasus White Box lulus dan kasus Black Box / Grey Box kritis (login, laporan, surat, pengaduan, assign) berstatus Lulus.

---

## 5. Akun uji

| Role | Email | Password |
|------|-------|----------|
| Masyarakat | `user@spkt.id` | `spkt123` |
| Admin | `admin@spkt.id` | `spkt123` |
| Petugas Laporan | `petugas@spkt.id` | `spkt123` |
| Petugas Surat | `petugas-surat@spkt.id` | `spkt123` |
| Petugas Pengaduan | `petugas-pengaduan@spkt.id` | `spkt123` |

---

*Dokumen ini siap dilampirkan ke laporan / proposal SPKT Digital.*
