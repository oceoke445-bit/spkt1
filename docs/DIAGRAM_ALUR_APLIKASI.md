# Diagram & Alur Aplikasi SPKT Digital

Dokumen ini menjelaskan **seluruh alur** aplikasi SPKT Digital: siapa mengakses apa, bagaimana data mengalir dari UI → API → database, dan status tiap layanan.

---

## 1. Ringkasan Sistem

SPKT Digital adalah sistem pelayanan kepolisian online berbasis **Next.js 15** + **SQLite** (`data/spkt.db`).

| Komponen | Lokasi |
|----------|--------|
| Frontend (React) | `src/components/`, `src/app/page.tsx` |
| API REST | `src/app/api/**` |
| Business logic | `src/lib/services/` |
| Database & migrasi | `src/lib/db.ts` |
| File upload | `data/uploads/` |

Tiga layanan utama:

1. **Laporan** — masyarakat melaporkan kejadian (LP/xxx)
2. **Surat** — pengajuan SKCK, kehilangan, dokumen rusak, izin keramaian (SKCK/SKH/SKR/IZIN)
3. **Pengaduan** — keluhan terhadap pelayanan SPKT (ADU/xxx)

---

## 2. Arsitektur Layer

```mermaid
flowchart TB
    subgraph Client["Browser (Client)"]
        UI[React Components]
        AuthCtx[AuthContext + Session Cookie]
    end

    subgraph Server["Next.js Server"]
        API[API Routes /api/*]
        SVC[Services: spkt, users, audit, notifications]
        DB[(SQLite spkt.db)]
        UPLOAD[Folder uploads/]
    end

    UI -->|fetch spktApi| API
    AuthCtx -->|cookie spkt_session| API
    API --> SVC
    SVC --> DB
    API --> UPLOAD
```

---

## 3. Aktor & Peran

```mermaid
flowchart LR
    subgraph Masyarakat["Role: user"]
        U1[Buat Laporan]
        U2[Layanan Surat]
        U3[Pengaduan]
        U4[Informasi]
    end

    subgraph Admin["Role: admin"]
        A1[Semua Laporan + Assign]
        A2[Kelola Surat & Pengaduan + Assign]
        A3[User & Petugas]
        A4[Statistik / CSI / Audit Log]
    end

    subgraph Petugas["Role: petugas (3 divisi)"]
        P1[Divisi Laporan]
        P2[Divisi Surat]
        P3[Divisi Pengaduan]
    end

    Masyarakat -->|submit| DB[(Database)]
    Admin -->|assign & kelola| DB
    Petugas -->|proses tugas assigned| DB
```

### Akun demo

| Role | Email | Password |
|------|-------|----------|
| Masyarakat | `user@spkt.id` | `spkt123` |
| Petugas Laporan | `petugas@spkt.id` | `spkt123` |
| Petugas Surat | `petugas-surat@spkt.id` | `spkt123` |
| Petugas Pengaduan | `petugas-pengaduan@spkt.id` | `spkt123` |
| Admin | `admin@spkt.id` | `spkt123` |

---

## 4. Alur Autentikasi

```mermaid
sequenceDiagram
    participant U as User
    participant LP as LoginPage
    participant API as /api/auth/*
    participant DB as SQLite

    U->>LP: Email + password
    LP->>API: POST /api/auth/login
    API->>DB: Verifikasi user
    alt 2FA aktif
        API-->>LP: requires2fa + tempToken
        U->>API: POST /api/auth/verify-2fa
    end
    API->>DB: Buat session
    API-->>LP: Set cookie spkt_session
    LP->>API: GET /api/auth/session
    API-->>LP: user + officerDivision (jika petugas)
    LP->>U: Dashboard sesuai role
```

| Endpoint | Fungsi |
|----------|--------|
| `POST /api/auth/register` | Daftar masyarakat (NIK wajib) |
| `POST /api/auth/login` | Login |
| `POST /api/auth/logout` | Logout |
| `GET /api/auth/session` | Cek sesi aktif |
| `POST /api/auth/forgot-password` | Reset password (demo) |

**Catatan:** Petugas punya field `officerDivision` di sesi (`laporan` | `surat` | `pengaduan`) yang menentukan menu sidebar.

---

## 5. Navigasi & Menu per Role

Routing memakai query `/?view=<nama-view>` (lihat `DashboardApp.tsx`).

### Masyarakat (`user`)

| Menu | View | Fungsi |
|------|------|--------|
| Dashboard | `dashboard` | Ringkasan aktivitas |
| Buat Laporan | `create-report` | Form laporan baru / draft |
| Laporan Saya | `my-reports` | Daftar & hapus laporan sendiri |
| Layanan Surat | `letter-service` | Ajukan surat |
| Pengaduan | `complaints` | Buat & lihat pengaduan |
| Informasi | `information` | Artikel panduan |
| Pengaturan | `settings` | Profil & keamanan |

### Admin (`admin`)

| Menu | View | Fungsi |
|------|------|--------|
| Dashboard | `dashboard` | Statistik ringkas |
| Semua Laporan | `all-reports` | Assign, override, detail |
| Layanan Surat | `letter-service` | Assign & kelola semua surat |
| Pengaduan | `complaints` | Assign & kelola semua pengaduan |
| User Management | `user-management` | CRUD user |
| Kelola Petugas | `officer-management` | CRUD petugas + divisi |
| Audit Log | `audit-log` | Riwayat aksi admin |
| Statistik | `statistics` | Grafik layanan |
| Kepuasan (CSI) | `csi-dashboard` | Survey kepuasan |
| Informasi | `information` | Baca artikel |
| Kelola Artikel | `article-management` | CRUD artikel |
| Pengaturan | `settings` | Profil admin |

### Petugas (`petugas`) — per divisi

| Divisi | Menu | View |
|--------|------|------|
| **Laporan** | Dashboard, Laporan Masuk, Pengaturan | `dashboard`, `incoming-reports`, `settings` |
| **Surat** | Dashboard, Layanan Surat, Pengaturan | `dashboard`, `letter-service`, `settings` |
| **Pengaduan** | Dashboard, Pengaduan, Pengaturan | `dashboard`, `complaints`, `settings` |

```mermaid
flowchart TD
    Login[Login sebagai petugas] --> Div{officerDivision?}
    Div -->|laporan| M1[Dashboard + Laporan Masuk]
    Div -->|surat| M2[Dashboard + Layanan Surat]
    Div -->|pengaduan| M3[Dashboard + Pengaduan]
```

---

## 6. Alur Laporan (Reports)

### 6.1 Diagram alur bisnis

```mermaid
flowchart TD
    Start([Masyarakat login]) --> Create[Buat Laporan / Simpan Draft]
    Create --> Draft{Kirim?}
    Draft -->|Tidak| DraftSave[Status: draft]
    Draft -->|Ya| Submitted[Status: submitted]

    Submitted --> AdminAssign[Admin: Assign Petugas<br/>divisi laporan]
    AdminAssign --> Assigned[Status: assigned]

    Assigned --> OfficerStart[Petugas: Mulai Proses]
    OfficerStart --> Processing[Status: processing]

    Processing --> Done[Status: completed]
    Submitted --> Rejected[Status: rejected]
    Assigned --> Rejected
    Processing --> Rejected

    AdminAssign -.->|Override admin| Override[Ubah status paksa]
```

### 6.2 Transisi status laporan

```
draft → submitted
submitted → verified | assigned | rejected
verified → assigned | rejected
assigned → processing | rejected
processing → completed | rejected
```

### 6.3 Nomor referensi

Format: `LP/001/V/2026` (prefix LP, counter per tahun)

### 6.4 API

| Method | Endpoint | Siapa |
|--------|----------|-------|
| GET | `/api/reports` | User (NIK sendiri), Petugas (assigned), Admin (semua) |
| POST | `/api/reports` | User (buat laporan) |
| GET/PATCH/DELETE | `/api/reports/[id]` | User (milik sendiri), Petugas (assigned), Admin |

### 6.5 Aturan penting

- **Admin** yang assign petugas (petugas **tidak** berebut antrian).
- Petugas assign hanya dari divisi **laporan**.
- Petugas hanya bisa update laporan yang **sudah ditugaskan** ke dirinya.
- User bisa hapus laporan status `draft` atau `submitted`.

---

## 7. Alur Layanan Surat (Letters)

### 7.1 Jenis surat

| ID | Jenis | Prefix nomor |
|----|-------|--------------|
| `skck` | SKCK | SKCK |
| `kehilangan` | Surat Keterangan Kehilangan | SKH |
| `kerusakan` | Surat Keterangan Dokumen Rusak | SKR |
| `keramaian` | Izin Keramaian | IZIN |

### 7.2 Diagram alur

```mermaid
flowchart TD
    User([Masyarakat]) --> Choose[Pilih jenis surat]
    Choose --> Form[Isi form + upload dokumen]
    Form --> Submit[Status: submitted]

    Submit --> AdminAssign[Admin: Assign petugas divisi surat]
    AdminAssign --> Officer[Petugas surat: Proses]

    Officer --> Verified[verified]
    Verified --> Ready[ready + tanggal ambil]
    Ready --> Completed[completed]
    Submit --> Reject[rejected]
    Verified --> Reject
```

### 7.3 Transisi status surat

```
draft → submitted
submitted → verified | rejected
verified → ready | rejected
ready → completed
```

### 7.4 API

| Method | Endpoint | Siapa |
|--------|----------|-------|
| GET | `/api/letters` | User (NIK), Petugas (assigned), Admin (semua) |
| POST | `/api/letters` | User |
| PATCH | `/api/letters/[id]` | User (draft), Petugas (assigned), Admin (assign) |
| GET | `/api/letters/[id]/pdf` | Unduh PDF surat |

---

## 8. Alur Pengaduan (Complaints)

### 8.1 Kategori

`pelayanan` · `petugas` · `fasilitas` · `sistem` · `lainnya`

### 8.2 Diagram alur

```mermaid
flowchart TD
    User([Masyarakat]) --> Create[Buat pengaduan + lampiran]
    Create --> Submitted[Status: submitted]

    Submitted --> AdminAssign[Admin: Assign petugas divisi pengaduan]
    AdminAssign --> Reviewing[reviewing]

    Reviewing --> Processing[processing]
    Processing --> Resolved[resolved + tanggapan]
    Resolved --> Closed[closed]

    Submitted --> Closed
    Reviewing --> Closed
    Processing --> Closed
```

### 8.3 Transisi status pengaduan

```
submitted → reviewing | closed
reviewing → processing | closed
processing → resolved | closed
resolved → closed
```

### 8.4 API

| Method | Endpoint | Siapa |
|--------|----------|-------|
| GET | `/api/complaints` | User (NIK), Petugas (assigned), Admin (semua) |
| POST | `/api/complaints` | User |
| PATCH | `/api/complaints/[id]` | Petugas (assigned), Admin (assign + tanggapan) |

---

## 9. Alur Admin (Assign & Kelola)

```mermaid
flowchart LR
    subgraph Laporan
        AL1[Lihat Semua Laporan] --> AL2[Detail]
        AL2 --> AL3[Assign / Reassign petugas laporan]
        AL2 --> AL4[Override status]
    end

    subgraph Surat
        AS1[Antrian Surat] --> AS2[Detail]
        AS2 --> AS3[Assign petugas surat]
        AS2 --> AS4[Proses status]
    end

    subgraph Pengaduan
        AP1[Semua Pengaduan] --> AP2[Detail]
        AP2 --> AP3[Assign petugas pengaduan]
        AP2 --> AP4[Tanggapan & status]
    end

    subgraph Manajemen
        M1[Kelola User]
        M2[Kelola Petugas + divisi]
        M3[Audit Log]
        M4[Statistik & CSI]
    end
```

Setiap aksi admin penting (assign, override, hapus user, dll.) dicatat di **Audit Log** (`/api/audit-logs`).

---

## 10. Alur Petugas per Divisi

```mermaid
flowchart TD
    subgraph DivisiLaporan["Divisi Laporan"]
        DL1[Login petugas@spkt.id] --> DL2[Laporan Masuk]
        DL2 --> DL3{Assigned ke saya?}
        DL3 -->|Ya| DL4[Mulai Proses → Selesai]
        DL3 -->|Tidak| DL5[Tidak tampil di daftar]
    end

    subgraph DivisiSurat["Divisi Surat"]
        DS1[Login petugas-surat@] --> DS2[Surat ditugaskan]
        DS2 --> DS3[Verifikasi → Siap diambil → Selesai]
    end

    subgraph DivisiPengaduan["Divisi Pengaduan"]
        DP1[Login petugas-pengaduan@] --> DP2[Pengaduan ditugaskan]
        DP2 --> DP3[Tinjau → Proses → Selesai + tanggapan]
    end
```

**Prinsip:** Petugas hanya melihat dan memproses tugas yang **sudah di-assign admin** ke akun mereka.

---

## 11. Diagram Database (ER Ringkas)

```mermaid
erDiagram
    users ||--o{ reports : "buat"
    users ||--o{ letter_requests : "ajukan"
    users ||--o{ complaints : "ajukan"
    users ||--o{ notifications : "terima"
    users ||--o| officers : "tautan petugas"

    officers ||--o{ reports : "assigned_officer_id"
    officers ||--o{ letter_requests : "assigned_officer_id"
    officers ||--o{ complaints : "assigned_officer_id"

    reports ||--|{ report_timeline : "punya"
    reports ||--|{ report_evidence : "punya"
    letter_requests ||--|{ letter_timeline : "punya"
    letter_requests ||--|{ letter_attachments : "punya"
    complaints ||--|{ complaint_timeline : "punya"
    complaints ||--|{ complaint_files : "punya"

    users {
        text id PK
        text email
        text role
        text nik
    }

    officers {
        text id PK
        text user_id FK
        text division
        text status
    }

    reports {
        text id PK
        text report_number UK
        text status
        text assigned_officer_id FK
    }

    letter_requests {
        text id PK
        text request_number UK
        text status
        text assigned_officer_id FK
    }

    complaints {
        text id PK
        text complaint_number UK
        text status
        text assigned_officer_id FK
    }
```

### Migrasi database (`ALTER TABLE`)

Saat ada fitur baru, `migrateSchema()` di `src/lib/db.ts` menambah kolom tanpa menghapus data lama — misalnya kolom `division` di `officers` dan kolom assign di `letter_requests` / `complaints`.

---

## 12. Peta API Lengkap

| Grup | Endpoint |
|------|----------|
| **Auth** | `/api/auth/login`, `logout`, `register`, `session`, `verify-2fa`, `forgot-password` |
| **Laporan** | `/api/reports`, `/api/reports/[id]` |
| **Surat** | `/api/letters`, `/api/letters/[id]`, `/api/letters/[id]/pdf` |
| **Pengaduan** | `/api/complaints`, `/api/complaints/[id]` |
| **Petugas** | `/api/officers`, `/api/officers/[id]` |
| **User** | `/api/users`, `/api/users/[id]`, `/api/users/me`, `me/password`, `me/preferences`, `me/export`, `me/totp` |
| **Notifikasi** | `/api/notifications`, `/api/notifications/[id]` |
| **Upload** | `/api/upload`, `/api/files/[name]` |
| **Info** | `/api/info/articles`, `/api/info/articles/[id]` |
| **Survey CSI** | `/api/survey/submit`, `check`, `csi/summary`, `dimensions`, `recent` |
| **Admin** | `/api/stats/admin`, `/api/audit-logs` |
| **Health** | `/api/health` |

---

## 13. Alur Notifikasi & CSI

```mermaid
flowchart LR
    Event[Status berubah / surat siap] --> Notify[createNotification]
    Notify --> Bell[NotificationBell di header]
    Bell --> User[Buka layanan terkait]

    Complete[Layanan selesai] --> CSI{Cek eligibility}
    CSI --> Survey[Form survey kepuasan 1-4]
    Survey --> AdminCSI[Admin: dashboard CSI]
```

---

## 14. Alur File Upload

```mermaid
sequenceDiagram
    participant C as Client
    participant U as /api/upload
    participant F as data/uploads/

    C->>U: POST multipart files
    U->>F: Simpan dengan nama unik
    U-->>C: storedName
    C->>C: Kirim storedName ke API laporan/surat/pengaduan
    Note over C,F: Akses file via GET /api/files/[name]
```

---

## 15. Ringkasan Alur End-to-End

```mermaid
flowchart TB
    subgraph Masuk
        A1[Register / Login]
    end

    subgraph Masyarakat
        B1[Laporan]
        B2[Surat]
        B3[Pengaduan]
    end

    subgraph Admin
        C1[Assign ke petugas sesuai divisi]
        C2[Kelola user & petugas]
        C3[Monitor statistik & audit]
    end

    subgraph Petugas
        D1[Proses tugas assigned]
        D2[Update status]
    end

    subgraph Selesai
        E1[Notifikasi ke masyarakat]
        E2[Survey CSI opsional]
    end

    A1 --> B1 & B2 & B3
    B1 & B2 & B3 --> C1
    C1 --> D1
    D1 --> D2
    D2 --> E1
    E1 --> E2
    C2 & C3 -.-> C1
```

---

## 16. File Kode Penting

| Topik | File |
|-------|------|
| Routing & view per role | `src/components/DashboardApp.tsx` |
| Sidebar & menu | `src/components/Sidebar.tsx` |
| Divisi petugas | `src/lib/officerDivision.ts` |
| Status transitions | `src/lib/status-transitions.ts` |
| Business logic | `src/lib/services/spkt.ts` |
| Schema DB + seed | `src/lib/db.ts` |
| Nomor referensi | `src/lib/reference.ts` |
| Client API | `src/lib/spktApi.ts` |
| Auth session | `src/lib/auth-server.ts`, `src/contexts/AuthContext.tsx` |

---

*Terakhir diperbarui sesuai implementasi SPKT Digital — divisi petugas 3 bagian, assign oleh admin, audit log terpisah.*
