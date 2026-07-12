import { db, ensureDbReady } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/password';
import { listReports } from '@/lib/services/spkt';
import { listLetters } from '@/lib/services/spkt';
import { listComplaints } from '@/lib/services/spkt';
import { getUserPreferences } from '@/lib/services/users';
import { createAuditLog } from '@/lib/services/audit';
import { clearUserActivities } from '@/lib/services/activity';

export function exportUserData(userId: string, nik?: string): Record<string, unknown> {
  ensureDbReady();
  const user = db
    .prepare('SELECT id, email, name, nik, phone, role, address, avatar_url FROM users WHERE id = ?')
    .get(userId) as Record<string, unknown> | undefined;

  if (!user) {
    throw new Error('User tidak ditemukan');
  }

  const userNik = (user.nik as string | null) ?? nik;

  return {
    exportedAt: new Date().toISOString(),
    profile: {
      id: user.id,
      email: user.email,
      name: user.name,
      nik: user.nik,
      phone: user.phone,
      role: user.role,
      address: user.address,
    },
    preferences: getUserPreferences(userId),
    reports: userNik ? listReports({ nik: userNik }).items : [],
    letters: userNik ? listLetters({ nik: userNik }).items : [],
    complaints: userNik ? listComplaints({ nik: userNik }).items : [],
    notifications: db
      .prepare('SELECT type, title, message, read, created_at FROM notifications WHERE user_id = ?')
      .all(userId),
    surveys: db
      .prepare(
        'SELECT service_type, reference_id, csi_score, comment, submitted_at FROM satisfaction_surveys WHERE user_id = ?',
      )
      .all(userId),
  };
}

function anonymizeUserData(nik: string | null | undefined): void {
  if (!nik) return;

  db.prepare(
    `UPDATE reports SET reporter_name = 'Pengguna Dihapus', reporter_nik = NULL, reporter_phone = NULL
     WHERE reporter_nik = ?`,
  ).run(nik);

  db.prepare(
    `UPDATE letter_requests SET requester_name = 'Pengguna Dihapus', requester_nik = NULL, requester_phone = NULL
     WHERE requester_nik = ?`,
  ).run(nik);

  db.prepare(
    `UPDATE complaints SET submitter_name = 'Pengguna Dihapus', submitter_nik = NULL
     WHERE submitter_nik = ?`,
  ).run(nik);
}

export function deleteUserAccount(userId: string, password: string): void {
  ensureDbReady();
  const row = db
    .prepare('SELECT password, role, email, name, nik FROM users WHERE id = ?')
    .get(userId) as { password: string; role: string; email: string; name: string; nik: string | null } | undefined;

  if (!row) {
    throw new Error('User tidak ditemukan');
  }
  if (row.role === 'admin') {
    const adminCount = (db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'admin' AND active = 1").get() as { c: number }).c;
    if (adminCount <= 1) {
      throw new Error('Tidak dapat menghapus admin terakhir');
    }
  }
  if (!verifyPassword(password, row.password)) {
    throw new Error('Password tidak valid');
  }

  createAuditLog({
    actorId: userId,
    actorName: row.name,
    action: 'delete_account',
    entityType: 'user',
    entityId: userId,
    details: `Akun ${row.email} dihapus oleh pengguna`,
  });

  anonymizeUserData(row.nik);
  clearUserActivities(userId);
  db.prepare('DELETE FROM satisfaction_surveys WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM pending_2fa WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM notifications WHERE user_id = ?').run(userId);
  db.prepare('UPDATE officers SET user_id = NULL WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM users WHERE id = ?').run(userId);
}

export function resetPasswordByNik(email: string, nik: string, newPassword: string): void {
  ensureDbReady();
  const row = db
    .prepare('SELECT id, nik, active FROM users WHERE email = ?')
    .get(email) as { id: string; nik: string | null; active: number } | undefined;

  if (!row || row.active !== 1) {
    throw new Error('Email tidak ditemukan atau akun nonaktif');
  }
  if (!row.nik || row.nik !== nik) {
    throw new Error('NIK tidak cocok dengan email');
  }
  if (newPassword.length < 6) {
    throw new Error('Password baru minimal 6 karakter');
  }

  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashPassword(newPassword), row.id);
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(row.id);
}

export function validateNik(nik: string): boolean {
  return /^\d{16}$/.test(nik);
}
