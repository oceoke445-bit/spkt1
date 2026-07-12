import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { hashPassword, isPasswordHashed } from '@/lib/password';

const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const dbPath = process.env.DATABASE_PATH || path.join(dataDir, 'spkt.db');

/** Skip SQLite during `next build` — parallel workers would lock the same file */
function isDatabaseDisabled(): boolean {
  return process.env.NEXT_PHASE === 'phase-production-build';
}

let dbInstance: DatabaseSync | null = null;

function getConnection(): DatabaseSync {
  if (isDatabaseDisabled()) {
    throw new Error('Database is not available during Next.js build');
  }

  if (!dbInstance) {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    dbInstance = new DatabaseSync(dbPath);
    dbInstance.exec('PRAGMA journal_mode = WAL');
    dbInstance.exec('PRAGMA busy_timeout = 5000');
  }

  return dbInstance;
}

function createBuildStub(prop: string | symbol): unknown {
  if (prop === 'prepare') {
    return () => ({
      run: () => ({ lastInsertRowid: 0, changes: 0 }),
      get: () => undefined,
      all: () => [],
    });
  }
  if (prop === 'exec') {
    return () => undefined;
  }
  return undefined;
}

const db = new Proxy({} as DatabaseSync, {
  get(_target, prop) {
    if (isDatabaseDisabled()) {
      return createBuildStub(prop);
    }
    const instance = getConnection();
    const value = instance[prop as keyof DatabaseSync];
    if (typeof value === 'function') {
      return (value as (...args: unknown[]) => unknown).bind(instance);
    }
    return value;
  },
});

const DIMENSIONS = [
  { code: 'ease', name: 'Kemudahan Prosedur', weight: 1 },
  { code: 'speed', name: 'Kecepatan Pelayanan', weight: 1 },
  { code: 'officer', name: 'Keramahan Petugas', weight: 1 },
  { code: 'clarity', name: 'Kejelasan Informasi', weight: 1 },
  { code: 'quality', name: 'Kualitas Hasil Layanan', weight: 1 },
];

export const MAX_SCORE = 4;

let initialized = false;

function initDatabase() {
  const conn = getConnection();
  conn.exec(`
    CREATE TABLE IF NOT EXISTS survey_dimensions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      weight REAL NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS satisfaction_surveys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      user_name TEXT NOT NULL,
      user_email TEXT,
      service_type TEXT NOT NULL,
      service_label TEXT,
      reference_id TEXT,
      comment TEXT,
      csi_score REAL NOT NULL,
      submitted_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS survey_responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      survey_id INTEGER NOT NULL,
      dimension_id INTEGER NOT NULL,
      score INTEGER NOT NULL CHECK(score >= 1 AND score <= 4),
      FOREIGN KEY (survey_id) REFERENCES satisfaction_surveys(id) ON DELETE CASCADE,
      FOREIGN KEY (dimension_id) REFERENCES survey_dimensions(id),
      UNIQUE(survey_id, dimension_id)
    );

    CREATE INDEX IF NOT EXISTS idx_surveys_service ON satisfaction_surveys(service_type);
    CREATE INDEX IF NOT EXISTS idx_surveys_submitted ON satisfaction_surveys(submitted_at);
  `);

  const insertDimension = db.prepare(
    'INSERT OR IGNORE INTO survey_dimensions (code, name, weight) VALUES (@code, @name, @weight)',
  );

  for (const dimension of DIMENSIONS) {
    insertDimension.run(dimension);
  }

  initAppTables();
  seedAppData();
}

function initAppTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      nik TEXT,
      phone TEXT,
      role TEXT NOT NULL CHECK(role IN ('user', 'petugas', 'admin'))
    );

    CREATE TABLE IF NOT EXISTS officers (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      name TEXT NOT NULL,
      rank TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'available',
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      report_number TEXT NOT NULL UNIQUE,
      reporter_user_id TEXT,
      reporter_name TEXT NOT NULL,
      reporter_nik TEXT NOT NULL,
      reporter_phone TEXT NOT NULL,
      case_type TEXT NOT NULL,
      incident_date TEXT NOT NULL,
      location TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'submitted',
      priority TEXT DEFAULT 'medium',
      assigned_to TEXT,
      assigned_by TEXT,
      assigned_at TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (reporter_user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS report_timeline (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id TEXT NOT NULL,
      status TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      note TEXT,
      officer TEXT,
      FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS report_evidence (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS letter_requests (
      id TEXT PRIMARY KEY,
      request_number TEXT NOT NULL UNIQUE,
      requester_user_id TEXT,
      requester_name TEXT NOT NULL,
      requester_nik TEXT NOT NULL,
      letter_type TEXT NOT NULL,
      purpose TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'submitted',
      pickup_date TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (requester_user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS complaints (
      id TEXT PRIMARY KEY,
      complaint_number TEXT NOT NULL UNIQUE,
      submitter_user_id TEXT,
      submitter_name TEXT NOT NULL,
      submitter_nik TEXT,
      category TEXT NOT NULL,
      subject TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'submitted',
      response TEXT,
      response_date TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (submitter_user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_reports_nik ON reports(reporter_nik);
    CREATE INDEX IF NOT EXISTS idx_reports_assigned ON reports(assigned_to);
    CREATE INDEX IF NOT EXISTS idx_letters_nik ON letter_requests(requester_nik);
    CREATE INDEX IF NOT EXISTS idx_complaints_nik ON complaints(submitter_nik);

    CREATE TABLE IF NOT EXISTS letter_attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      letter_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      FOREIGN KEY (letter_id) REFERENCES letter_requests(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS complaint_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      complaint_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

    CREATE TABLE IF NOT EXISTS reference_counters (
      prefix TEXT NOT NULL,
      year INTEGER NOT NULL,
      last_value INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (prefix, year)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      link TEXT,
      read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
  `);

  migrateSchema();
}

function columnExists(table: string, column: string): boolean {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return cols.some((c) => c.name === column);
}

function migrateSchema() {
  if (!columnExists('users', 'active')) {
    db.exec('ALTER TABLE users ADD COLUMN active INTEGER NOT NULL DEFAULT 1');
  }
  if (!columnExists('users', 'address')) {
    db.exec('ALTER TABLE users ADD COLUMN address TEXT');
  }
  if (!columnExists('users', 'avatar_url')) {
    db.exec('ALTER TABLE users ADD COLUMN avatar_url TEXT');
  }
  if (!columnExists('letter_requests', 'rejection_reason')) {
    db.exec('ALTER TABLE letter_requests ADD COLUMN rejection_reason TEXT');
  }
  if (!columnExists('users', 'preferences_json')) {
    db.exec("ALTER TABLE users ADD COLUMN preferences_json TEXT NOT NULL DEFAULT '{}'");
  }
  if (!columnExists('users', 'totp_secret')) {
    db.exec('ALTER TABLE users ADD COLUMN totp_secret TEXT');
  }
  if (!columnExists('users', 'totp_enabled')) {
    db.exec('ALTER TABLE users ADD COLUMN totp_enabled INTEGER NOT NULL DEFAULT 0');
  }
  if (!columnExists('reports', 'assigned_officer_id')) {
    db.exec('ALTER TABLE reports ADD COLUMN assigned_officer_id TEXT');
  }
  if (!columnExists('letter_requests', 'updated_at')) {
    db.exec('ALTER TABLE letter_requests ADD COLUMN updated_at TEXT');
    db.prepare('UPDATE letter_requests SET updated_at = created_at WHERE updated_at IS NULL').run();
  }
  if (!columnExists('letter_requests', 'requester_phone')) {
    db.exec('ALTER TABLE letter_requests ADD COLUMN requester_phone TEXT');
  }
  if (!columnExists('officers', 'division')) {
    db.exec("ALTER TABLE officers ADD COLUMN division TEXT NOT NULL DEFAULT 'laporan'");
  }
  if (!columnExists('letter_requests', 'assigned_officer_id')) {
    db.exec('ALTER TABLE letter_requests ADD COLUMN assigned_officer_id TEXT');
  }
  if (!columnExists('letter_requests', 'assigned_to')) {
    db.exec('ALTER TABLE letter_requests ADD COLUMN assigned_to TEXT');
  }
  if (!columnExists('letter_requests', 'assigned_by')) {
    db.exec('ALTER TABLE letter_requests ADD COLUMN assigned_by TEXT');
  }
  if (!columnExists('letter_requests', 'assigned_at')) {
    db.exec('ALTER TABLE letter_requests ADD COLUMN assigned_at TEXT');
  }
  if (!columnExists('complaints', 'assigned_officer_id')) {
    db.exec('ALTER TABLE complaints ADD COLUMN assigned_officer_id TEXT');
  }
  if (!columnExists('complaints', 'assigned_to')) {
    db.exec('ALTER TABLE complaints ADD COLUMN assigned_to TEXT');
  }
  if (!columnExists('complaints', 'assigned_by')) {
    db.exec('ALTER TABLE complaints ADD COLUMN assigned_by TEXT');
  }
  if (!columnExists('complaints', 'assigned_at')) {
    db.exec('ALTER TABLE complaints ADD COLUMN assigned_at TEXT');
  }

  backfillOfficerDivisions();

  db.exec(`
    CREATE TABLE IF NOT EXISTS letter_timeline (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      letter_id TEXT NOT NULL,
      status TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      note TEXT,
      officer TEXT,
      FOREIGN KEY (letter_id) REFERENCES letter_requests(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      actor_id TEXT NOT NULL,
      actor_name TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      details TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

    CREATE TABLE IF NOT EXISTS pending_2fa (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS info_articles (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      content TEXT NOT NULL,
      published_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS complaint_timeline (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      complaint_id TEXT NOT NULL,
      status TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      note TEXT,
      officer TEXT,
      FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_user_activities_user ON user_activities(user_id, created_at);
  `);

  seedInfoArticles();
  syncInfoArticles();
  migratePlainPasswords();
  linkOfficersToUsers();
  ensureDemoPetugasAccounts();
  backfillLetterTimelines();
  backfillComplaintTimelines();
}

function backfillOfficerDivisions() {
  const update = db.prepare('UPDATE officers SET division = ? WHERE id = ?');
  update.run('laporan', 'OFF001');
  update.run('surat', 'OFF002');
  update.run('pengaduan', 'OFF003');
  db.prepare("UPDATE officers SET division = 'laporan' WHERE division IS NULL OR division = ''").run();
}

function ensureDemoPetugasAccounts() {
  const demoPassword = hashPassword('spkt123');

  const insertUser = db.prepare(
    `INSERT OR IGNORE INTO users (id, email, password, name, nik, phone, role)
     VALUES (@id, @email, @password, @name, NULL, @phone, 'petugas')`,
  );

  const upsertOfficer = db.prepare(
    `INSERT INTO officers (id, user_id, name, rank, email, phone, status, division)
     VALUES (@id, @userId, @name, @rank, @email, @phone, @status, @division)
     ON CONFLICT(id) DO UPDATE SET
       user_id = excluded.user_id,
       name = excluded.name,
       rank = excluded.rank,
       email = excluded.email,
       phone = excluded.phone,
       division = excluded.division`,
  );

  const demoAccounts = [
    {
      userId: 'U002',
      email: 'petugas@spkt.id',
      name: 'Ipda. Ahmad Wijaya',
      phone: '081234567890',
      officerId: 'OFF001',
      rank: 'Inspektur Polisi Dua',
      status: 'busy',
      division: 'laporan',
    },
    {
      userId: 'U004',
      email: 'petugas-surat@spkt.id',
      name: 'Bripka. Andi Pratama',
      phone: '081234567891',
      officerId: 'OFF002',
      rank: 'Brigadir Polisi Kepala',
      status: 'available',
      division: 'surat',
    },
    {
      userId: 'U005',
      email: 'petugas-pengaduan@spkt.id',
      name: 'Aipda. Rini Kusuma',
      phone: '081234567892',
      officerId: 'OFF003',
      rank: 'Ajun Inspektur Polisi Dua',
      status: 'available',
      division: 'pengaduan',
    },
  ] as const;

  for (const account of demoAccounts) {
    insertUser.run({
      id: account.userId,
      email: account.email,
      password: demoPassword,
      name: account.name,
      phone: account.phone,
    });

    upsertOfficer.run({
      id: account.officerId,
      userId: account.userId,
      name: account.name,
      rank: account.rank,
      email: account.email,
      phone: account.phone,
      status: account.status,
      division: account.division,
    });
  }
}

function inferOfficerDivision(email: string): 'laporan' | 'surat' | 'pengaduan' {
  if (email.includes('surat')) return 'surat';
  if (email.includes('pengaduan')) return 'pengaduan';
  return 'laporan';
}

function backfillComplaintTimelines() {
  const complaints = db
    .prepare('SELECT id, status, created_at FROM complaints')
    .all() as Array<{ id: string; status: string; created_at: string }>;

  const countStmt = db.prepare('SELECT COUNT(*) as c FROM complaint_timeline WHERE complaint_id = ?');
  const insertStmt = db.prepare(
    'INSERT INTO complaint_timeline (complaint_id, status, timestamp) VALUES (?, ?, ?)',
  );

  for (const complaint of complaints) {
    const count = (countStmt.get(complaint.id) as { c: number }).c;
    if (count === 0) {
      insertStmt.run(complaint.id, 'Pengaduan dibuat', complaint.created_at);
    }
  }
}

function backfillLetterTimelines() {
  const letters = db
    .prepare('SELECT id, status, created_at FROM letter_requests')
    .all() as Array<{ id: string; status: string; created_at: string }>;

  const countStmt = db.prepare('SELECT COUNT(*) as c FROM letter_timeline WHERE letter_id = ?');
  const insertStmt = db.prepare(
    'INSERT INTO letter_timeline (letter_id, status, timestamp) VALUES (?, ?, ?)',
  );

  for (const letter of letters) {
    const count = (countStmt.get(letter.id) as { c: number }).c;
    if (count === 0) {
      insertStmt.run(letter.id, 'Pengajuan dibuat', letter.created_at);
    }
  }
}

function linkOfficersToUsers() {
  const petugasUsers = db
    .prepare("SELECT id, email, name FROM users WHERE role = 'petugas'")
    .all() as Array<{ id: string; email: string; name: string }>;

  for (const user of petugasUsers) {
    const officer = db
      .prepare('SELECT id FROM officers WHERE email = ? OR user_id = ?')
      .get(user.email, user.id) as { id: string } | undefined;
    if (officer) {
      db.prepare('UPDATE officers SET user_id = ?, name = ? WHERE id = ?').run(user.id, user.name, officer.id);
    } else {
      const division = inferOfficerDivision(user.email);
      db.prepare(
        `INSERT INTO officers (id, user_id, name, rank, email, phone, status, division)
         VALUES (@id, @userId, @name, 'Brigadir', @email, '', 'available', @division)`,
      ).run({
        id: `OFF${user.id}`,
        userId: user.id,
        name: user.name,
        email: user.email,
        division,
      });
    }
  }
}

const INFO_ARTICLE_SEED = [
  {
    id: '1',
    title: 'Cara Membuat Laporan Polisi Online',
    category: 'Panduan',
    description: 'Panduan lengkap membuat laporan polisi melalui sistem SPKT Digital',
    content: `SPKT Digital kini memungkinkan masyarakat melaporkan tindak pidana tanpa harus datang ke kantor polisi terlebih dahulu. Layanan ini dirancang untuk mempercepat proses penerimaan laporan dan memberikan nomor referensi resmi yang dapat dilacak secara online.

Langkah pertama, pastikan Anda sudah login ke akun SPKT Digital. Jika belum memiliki akun, daftar terlebih dahulu dengan melengkapi NIK dan data diri yang valid.

Selanjutnya, buka menu Buat Laporan. Isi data pelapor (nama, NIK, nomor telepon), pilih jenis kasus, tanggal kejadian, lokasi, serta uraian kejadian secara detail dan jujur. Anda dapat melampirkan foto atau dokumen pendukung sebagai bukti.

Setelah menekan Kirim Laporan, sistem akan menerbitkan nomor laporan resmi. Simpan nomor tersebut dan pantau perkembangannya melalui menu Laporan Saya. Petugas SPKT akan memverifikasi laporan Anda dan memberi notifikasi setiap kali status berubah.

Apabila formulir belum selesai, gunakan fitur Simpan Draft agar dapat melanjutkan pengisian di lain waktu.`,
    publishedAt: '2026-05-15',
  },
  {
    id: '2',
    title: 'Persyaratan Pembuatan SKCK',
    category: 'Layanan',
    description: 'Dokumen dan persyaratan yang diperlukan untuk mengajukan SKCK',
    content: `Surat Keterangan Catatan Kepolisian (SKCK) diperlukan untuk berbagai keperluan administrasi, mulai dari melamar pekerjaan hingga pengurusan dokumen resmi.

Persyaratan yang harus disiapkan:
• Fotokopi KTP yang masih berlaku
• Pas foto terbaru berwarna ukuran 3x4 (2 lembar)
• Surat pengantar dari instansi/pemohon (jika diperlukan)
• Mengisi formulir permohonan secara lengkap

Pengajuan dilakukan melalui menu Layanan Surat → pilih SKCK. Unggah seluruh dokumen persyaratan, isi tujuan permohonan, dan tentukan tanggal rencana pengambilan jika tersedia.

Proses verifikasi memakan waktu 3–7 hari kerja setelah dokumen dinyatakan lengkap. Anda akan menerima notifikasi ketika SKCK siap diambil di kantor polisi setempat dengan membawa identitas asli.`,
    publishedAt: '2026-05-10',
  },
  {
    id: '3',
    title: 'Tips Keamanan Berkendara',
    category: 'Edukasi',
    description: 'Tips dan trik berkendara aman di jalan raya',
    content: `Keselamatan berkendara menjadi tanggung jawab setiap pengguna jalan. Polri mengimbau masyarakat untuk selalu menerapkan prinsip defensive driving demi mengurangi risiko kecelakaan lalu lintas.

Sebelum berangkat, periksa kondisi kendaraan: rem, lampu, tekanan ban, dan kelengkapan SIM/STNK. Pastikan pengemudi dalam kondisi fit — hindari berkendara saat mengantuk atau setelah mengonsumsi alkohol.

Selama di jalan, patuhi rambu lalu lintas dan batas kecepatan. Gunakan helm standar SNI untuk pengendara motor dan sabuk pengaman untuk penumpang mobil. Hindari menggunakan ponsel saat mengemudi.

Jika terjadi kecelakaan atau pelanggaran, segera amankan lokasi kejadian dan laporkan melalui SPKT Digital atau hubungi hotline 110 apabila ada korban yang memerlukan pertolongan darurat.`,
    publishedAt: '2026-05-08',
  },
  {
    id: '4',
    title: 'Waspadai Modus Penipuan Online',
    category: 'Peringatan',
    description: 'Kenali dan hindari berbagai modus penipuan online terbaru',
    content: `Polri mencatat peningkatan laporan penipuan online dalam beberapa bulan terakhir. Modus yang paling sering dilaporkan meliputi penipuan jual-beli barang fiktif, investasi bodong, dan pencurian identitas melalui tautan phishing.

Ciri-ciri penipuan yang perlu diwaspadai:
• Penjual menawarkan harga jauh di bawah pasaran dan meminta transfer di muka
• Tawaran investasi dengan imbal hasil tidak masuk akal dalam waktu singkat
• Pesan berisi tautan login bank/pajak yang meminta OTP atau password
• Akun media sosial palsu mengaku petugas kepolisian

Jangan pernah mentransfer uang ke rekening tidak dikenal sebelum barang/jasa terbukti nyata. Verifikasi identitas lawan transaksi dan laporkan dugaan penipuan segera melalui menu Buat Laporan atau Pengaduan di SPKT Digital agar dapat ditindaklanjuti petugas.`,
    publishedAt: '2026-05-05',
  },
  {
    id: '5',
    title: 'Prosedur Kehilangan KTP dan SIM',
    category: 'Panduan',
    description: 'Langkah-langkah yang harus dilakukan saat kehilangan dokumen penting',
    content: `Kehilangan KTP atau SIM harus segera ditangani agar dokumen tersebut tidak disalahgunakan pihak tidak bertanggung jawab.

Langkah yang disarankan:
1. Buat laporan kehilangan resmi melalui SPKT Digital (menu Buat Laporan, jenis kehilangan dokumen) atau datang langsung ke SPKT terdekat.
2. Simpan nomor laporan kehilangan sebagai syarat penggantian dokumen.
3. Ajukan surat keterangan kehilangan melalui menu Layanan Surat jika diperlukan instansi terkait.
4. Proses penggantian KTP di Dukcapil dan SIM di Satpas Polri dengan membawa laporan kehilangan dan identitas pendukung lain.

Waktu pengurusan penggantian dokumen bervariasi tergantung antrian di instansi masing-masing. Segera laporkan kehilangan maksimal 1x24 jam setelah mengetahui dokumen hilang.`,
    publishedAt: '2026-05-01',
  },
] as const;

function seedInfoArticles() {
  const count = (db.prepare('SELECT COUNT(*) as c FROM info_articles').get() as { c: number }).c;
  if (count > 0) return;

  const insert = db.prepare(
    `INSERT INTO info_articles (id, title, category, description, content, published_at)
     VALUES (@id, @title, @category, @description, @content, @publishedAt)`,
  );

  for (const article of INFO_ARTICLE_SEED) {
    insert.run(article);
  }
}

function syncInfoArticles() {
  const upsert = db.prepare(
    `INSERT INTO info_articles (id, title, category, description, content, published_at)
     VALUES (@id, @title, @category, @description, @content, @publishedAt)
     ON CONFLICT(id) DO UPDATE SET
       title = excluded.title,
       category = excluded.category,
       description = excluded.description,
       content = excluded.content,
       published_at = excluded.published_at`,
  );

  for (const article of INFO_ARTICLE_SEED) {
    upsert.run(article);
  }
}

function migratePlainPasswords() {
  const rows = db.prepare('SELECT id, password FROM users').all() as Array<{ id: string; password: string }>;
  const update = db.prepare('UPDATE users SET password = ? WHERE id = ?');
  for (const row of rows) {
    if (!isPasswordHashed(row.password)) {
      update.run(hashPassword(row.password), row.id);
    }
  }
}

function seedAppData() {
  const userCount = (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c;
  if (userCount > 0) return;

  const insertUser = db.prepare(
    'INSERT INTO users (id, email, password, name, nik, phone, role) VALUES (@id, @email, @password, @name, @nik, @phone, @role)',
  );

  const demoPassword = hashPassword('spkt123');

  insertUser.run({
    id: 'U001',
    email: 'user@spkt.id',
    password: demoPassword,
    name: 'Budi Santoso',
    nik: '3201012345678901',
    phone: '081234567890',
    role: 'user',
  });
  insertUser.run({
    id: 'U002',
    email: 'petugas@spkt.id',
    password: demoPassword,
    name: 'Ipda. Ahmad Wijaya',
    nik: null,
    phone: '081234567890',
    role: 'petugas',
  });
  insertUser.run({
    id: 'U003',
    email: 'admin@spkt.id',
    password: demoPassword,
    name: 'Kompol. Sarah Putri',
    nik: null,
    phone: null,
    role: 'admin',
  });
  insertUser.run({
    id: 'U004',
    email: 'petugas-surat@spkt.id',
    password: demoPassword,
    name: 'Bripka. Andi Pratama',
    nik: null,
    phone: '081234567891',
    role: 'petugas',
  });
  insertUser.run({
    id: 'U005',
    email: 'petugas-pengaduan@spkt.id',
    password: demoPassword,
    name: 'Aipda. Rini Kusuma',
    nik: null,
    phone: '081234567892',
    role: 'petugas',
  });

  const insertOfficer = db.prepare(
    'INSERT INTO officers (id, user_id, name, rank, email, phone, status, division) VALUES (@id, @userId, @name, @rank, @email, @phone, @status, @division)',
  );

  insertOfficer.run({
    id: 'OFF001',
    userId: 'U002',
    name: 'Ipda. Ahmad Wijaya',
    rank: 'Inspektur Polisi Dua',
    email: 'petugas@spkt.id',
    phone: '081234567890',
    status: 'busy',
    division: 'laporan',
  });
  insertOfficer.run({
    id: 'OFF002',
    userId: 'U004',
    name: 'Bripka. Andi Pratama',
    rank: 'Brigadir Polisi Kepala',
    email: 'petugas-surat@spkt.id',
    phone: '081234567891',
    status: 'available',
    division: 'surat',
  });
  insertOfficer.run({
    id: 'OFF003',
    userId: 'U005',
    name: 'Aipda. Rini Kusuma',
    rank: 'Ajun Inspektur Polisi Dua',
    email: 'petugas-pengaduan@spkt.id',
    phone: '081234567892',
    status: 'available',
    division: 'pengaduan',
  });
  insertOfficer.run({
    id: 'OFF004',
    userId: null,
    name: 'Briptu. Dedi Saputra',
    rank: 'Brigadir Polisi Satu',
    email: 'dedi.saputra@spkt.id',
    phone: '081234567893',
    status: 'offline',
    division: 'laporan',
  });

  const insertReport = db.prepare(
    `INSERT INTO reports (
      id, report_number, reporter_user_id, reporter_name, reporter_nik, reporter_phone,
      case_type, incident_date, location, description, status, priority,
      assigned_to, assigned_by, assigned_at, notes, created_at, updated_at
    ) VALUES (
      @id, @reportNumber, @reporterUserId, @reporterName, @reporterNIK, @reporterPhone,
      @caseType, @incidentDate, @location, @description, @status, @priority,
      @assignedTo, @assignedBy, @assignedAt, @notes, @createdAt, @updatedAt
    )`,
  );

  const insertTimeline = db.prepare(
    'INSERT INTO report_timeline (report_id, status, timestamp, note, officer) VALUES (?, ?, ?, ?, ?)',
  );
  const insertEvidence = db.prepare('INSERT INTO report_evidence (report_id, filename) VALUES (?, ?)');

  const seedReports = [
    {
      id: 'R001',
      reportNumber: 'LP/001/V/2026',
      reporterUserId: 'U001',
      reporterName: 'Budi Santoso',
      reporterNIK: '3201012345678901',
      reporterPhone: '081234567890',
      caseType: 'Kehilangan',
      incidentDate: '2026-05-18',
      location: 'Jl. Sudirman No. 123, Jakarta Pusat',
      description: 'Kehilangan dompet berisi KTP, SIM, dan uang tunai Rp 500.000',
      status: 'processing',
      priority: 'medium',
      assignedTo: 'Ipda. Ahmad Wijaya',
      assignedBy: 'Admin System',
      assignedAt: '2026-05-18T15:30:00',
      notes: null,
      createdAt: '2026-05-18T10:30:00',
      updatedAt: '2026-05-19T14:20:00',
      timeline: [
        { status: 'Laporan dikirim', timestamp: '2026-05-18T10:30:00', note: null, officer: null },
        { status: 'Diverifikasi', timestamp: '2026-05-18T15:00:00', note: null, officer: 'Kompol. Sarah Putri' },
        { status: 'Ditugaskan', timestamp: '2026-05-18T15:30:00', note: 'Assigned to officer', officer: 'Ipda. Ahmad Wijaya' },
        { status: 'Diproses', timestamp: '2026-05-19T09:00:00', note: 'Tim sedang menindaklanjuti laporan', officer: 'Ipda. Ahmad Wijaya' },
      ],
      evidence: ['foto_tkp.jpg', 'kronologi.pdf'],
    },
    {
      id: 'R002',
      reportNumber: 'LP/002/V/2026',
      reporterUserId: null,
      reporterName: 'Siti Rahayu',
      reporterNIK: '3201012345678902',
      reporterPhone: '081234567891',
      caseType: 'Pencurian',
      incidentDate: '2026-05-17',
      location: 'Jl. Thamrin No. 45, Jakarta Pusat',
      description: 'Pencurian sepeda motor Honda Beat warna merah, Nopol B 1234 XYZ',
      status: 'assigned',
      priority: 'high',
      assignedTo: 'Bripka. Andi Pratama',
      assignedBy: 'Kompol. Sarah Putri',
      assignedAt: '2026-05-18T11:00:00',
      notes: null,
      createdAt: '2026-05-17T16:00:00',
      updatedAt: '2026-05-18T11:00:00',
      timeline: [
        { status: 'Laporan dikirim', timestamp: '2026-05-17T16:00:00', note: null, officer: null },
        { status: 'Diverifikasi', timestamp: '2026-05-18T10:00:00', note: null, officer: 'Kompol. Sarah Putri' },
        { status: 'Ditugaskan', timestamp: '2026-05-18T11:00:00', note: 'High priority case', officer: 'Bripka. Andi Pratama' },
      ],
      evidence: [],
    },
    {
      id: 'R003',
      reportNumber: 'LP/003/V/2026',
      reporterUserId: null,
      reporterName: 'Ahmad Hidayat',
      reporterNIK: '3201012345678903',
      reporterPhone: '081234567892',
      caseType: 'Kecelakaan Lalu Lintas',
      incidentDate: '2026-05-20',
      location: 'Perempatan Semanggi, Jakarta Selatan',
      description: 'Kecelakaan tunggal, mobil menabrak pembatas jalan',
      status: 'completed',
      priority: 'urgent',
      assignedTo: 'Bripka. Andi Pratama',
      assignedBy: 'Admin System',
      assignedAt: '2026-05-20T08:30:00',
      notes: 'Kasus telah diselesaikan, laporan telah dibuat',
      createdAt: '2026-05-20T08:00:00',
      updatedAt: '2026-05-20T12:00:00',
      timeline: [
        { status: 'Laporan dikirim', timestamp: '2026-05-20T08:00:00', note: null, officer: null },
        { status: 'Diverifikasi', timestamp: '2026-05-20T08:20:00', note: null, officer: 'Kompol. Sarah Putri' },
        { status: 'Ditugaskan', timestamp: '2026-05-20T08:30:00', note: 'Urgent case - accident', officer: 'Bripka. Andi Pratama' },
        { status: 'Diproses', timestamp: '2026-05-20T09:00:00', note: null, officer: 'Bripka. Andi Pratama' },
        { status: 'Selesai', timestamp: '2026-05-20T12:00:00', note: 'Laporan kecelakaan telah dibuat dan diserahkan', officer: 'Bripka. Andi Pratama' },
      ],
      evidence: [],
    },
    {
      id: 'R004',
      reportNumber: 'LP/004/V/2026',
      reporterUserId: 'U001',
      reporterName: 'Dewi Lestari',
      reporterNIK: '3201012345678904',
      reporterPhone: '081234567893',
      caseType: 'Penipuan',
      incidentDate: '2026-05-19',
      location: 'Online - Platform E-Commerce',
      description: 'Penipuan jual beli online, sudah transfer tapi barang tidak dikirim',
      status: 'submitted',
      priority: 'medium',
      assignedTo: null,
      assignedBy: null,
      assignedAt: null,
      notes: null,
      createdAt: '2026-05-20T14:00:00',
      updatedAt: '2026-05-20T14:00:00',
      timeline: [{ status: 'Laporan dikirim', timestamp: '2026-05-20T14:00:00', note: null, officer: null }],
      evidence: ['bukti_transfer.jpg', 'chat_penjual.pdf'],
    },
  ];

  for (const r of seedReports) {
    const { timeline, evidence, ...reportRow } = r;
    insertReport.run(reportRow);
    for (const t of timeline) {
      insertTimeline.run(r.id, t.status, t.timestamp, t.note, t.officer);
    }
    for (const f of evidence) {
      insertEvidence.run(r.id, f);
    }
  }

  db.prepare(
    `INSERT INTO letter_requests (id, request_number, requester_user_id, requester_name, requester_nik, letter_type, purpose, status, pickup_date, created_at)
     VALUES (@id, @requestNumber, @requesterUserId, @requesterName, @requesterNIK, @letterType, @purpose, @status, @pickupDate, @createdAt)`,
  ).run({
    id: 'L001',
    requestNumber: 'SKCK/001/V/2026',
    requesterUserId: 'U001',
    requesterName: 'Budi Santoso',
    requesterNIK: '3201012345678901',
    letterType: 'SKCK',
    purpose: 'Melamar pekerjaan',
    status: 'ready',
    pickupDate: '2026-05-22T00:00:00',
    createdAt: '2026-05-15T10:00:00',
  });
  db.prepare(
    `INSERT INTO letter_requests (id, request_number, requester_user_id, requester_name, requester_nik, letter_type, purpose, status, pickup_date, created_at)
     VALUES (@id, @requestNumber, @requesterUserId, @requesterName, @requesterNIK, @letterType, @purpose, @status, @pickupDate, @createdAt)`,
  ).run({
    id: 'L002',
    requestNumber: 'SKH/002/V/2026',
    requesterUserId: 'U001',
    requesterName: 'Budi Santoso',
    requesterNIK: '3201012345678901',
    letterType: 'Surat Keterangan Kehilangan',
    purpose: 'Penggantian SIM',
    status: 'verified',
    pickupDate: null,
    createdAt: '2026-05-18T14:00:00',
  });

  db.prepare(
    `INSERT INTO complaints (id, complaint_number, submitter_user_id, submitter_name, submitter_nik, category, subject, description, status, response, response_date, created_at, updated_at)
     VALUES (@id, @complaintNumber, @submitterUserId, @submitterName, @submitterNik, @category, @subject, @description, @status, @response, @responseDate, @createdAt, @updatedAt)`,
  ).run({
    id: 'C001',
    complaintNumber: 'ADU/001/V/2026',
    submitterUserId: 'U001',
    submitterName: 'Budi Santoso',
    submitterNik: '3201012345678901',
    category: 'pelayanan',
    subject: 'Proses laporan terlalu lama',
    description: 'Sudah 2 minggu laporan saya belum diproses',
    status: 'resolved',
    response: 'Terima kasih atas masukannya. Laporan Anda telah kami proses dan selesai.',
    responseDate: '2026-05-18T14:30:00',
    createdAt: '2026-05-10T10:00:00',
    updatedAt: '2026-05-18T14:30:00',
  });
  db.prepare(
    `INSERT INTO complaints (id, complaint_number, submitter_user_id, submitter_name, submitter_nik, category, subject, description, status, response, response_date, created_at, updated_at)
     VALUES (@id, @complaintNumber, @submitterUserId, @submitterName, @submitterNik, @category, @subject, @description, @status, @response, @responseDate, @createdAt, @updatedAt)`,
  ).run({
    id: 'C002',
    complaintNumber: 'ADU/002/V/2026',
    submitterUserId: 'U001',
    submitterName: 'Budi Santoso',
    submitterNik: '3201012345678901',
    category: 'sistem',
    subject: 'Error saat upload dokumen',
    description: 'Sistem error ketika saya mencoba upload file PDF',
    status: 'processing',
    response: 'Sedang dalam penanganan tim teknis kami.',
    responseDate: null,
    createdAt: '2026-05-15T09:00:00',
    updatedAt: '2026-05-16T11:00:00',
  });
}

export function ensureDbReady() {
  if (isDatabaseDisabled()) {
    return;
  }
  if (!initialized) {
    initDatabase();
    initialized = true;
  }
}

export { db, isDatabaseDisabled };
