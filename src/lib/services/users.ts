import { db, ensureDbReady } from '@/lib/db';
import { ApiError } from '@/lib/api-response';
import { hashPassword, verifyPassword, isPasswordHashed } from '@/lib/password';
import type { DbUser } from '@/lib/types/spkt';

function rowToDbUser(row: {
  id: string;
  email: string;
  name: string;
  nik: string | null;
  phone: string | null;
  role: DbUser['role'];
  address?: string | null;
  avatar_url?: string | null;
}): DbUser & { address?: string } {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    nik: row.nik ?? undefined,
    phone: row.phone ?? undefined,
    role: row.role,
    address: row.address ?? undefined,
    avatarUrl: row.avatar_url ?? undefined,
  };
}

export function getUserById(id: string): (DbUser & { address?: string; active?: boolean }) | null {
  ensureDbReady();
  const row = db
    .prepare('SELECT id, email, name, nik, phone, role, address, active, avatar_url FROM users WHERE id = ?')
    .get(id) as
    | {
        id: string;
        email: string;
        name: string;
        nik: string | null;
        phone: string | null;
        role: DbUser['role'];
        address: string | null;
        active: number;
        avatar_url: string | null;
      }
    | undefined;
  if (!row) return null;
  return { ...rowToDbUser(row), active: row.active === 1 };
}

export function authenticateUser(email: string, password: string): DbUser | null {
  ensureDbReady();
  const row = db
    .prepare('SELECT id, email, password, name, nik, phone, role, active FROM users WHERE email = ?')
    .get(email) as
    | {
        id: string;
        email: string;
        password: string;
        name: string;
        nik: string | null;
        phone: string | null;
        role: DbUser['role'];
        active: number;
      }
    | undefined;

  if (!row || row.active !== 1 || !verifyPassword(password, row.password)) {
    return null;
  }

  if (!isPasswordHashed(row.password)) {
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashPassword(password), row.id);
  }

  return {
    id: row.id,
    email: row.email,
    name: row.name,
    nik: row.nik ?? undefined,
    phone: row.phone ?? undefined,
    role: row.role,
  };
}

export interface RegisterUserInput {
  email: string;
  password: string;
  name: string;
  nik: string;
  phone: string;
}

export function registerUser(input: RegisterUserInput): DbUser {
  ensureDbReady();

  const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(input.email);
  if (existingEmail) {
    throw new Error('Email sudah terdaftar');
  }

  const existingNik = db.prepare('SELECT id FROM users WHERE nik = ?').get(input.nik);
  if (existingNik) {
    throw new Error('NIK sudah terdaftar');
  }

  const id = `U${Date.now()}`;
  db.prepare(
    `INSERT INTO users (id, email, password, name, nik, phone, role, active)
     VALUES (@id, @email, @password, @name, @nik, @phone, 'user', 1)`,
  ).run({
    id,
    email: input.email,
    password: hashPassword(input.password),
    name: input.name,
    nik: input.nik,
    phone: input.phone,
  });

  return getUserById(id)!;
}

export interface UpdateProfileInput {
  name?: string;
  phone?: string;
  address?: string;
  avatarUrl?: string | null;
}

export function updateUserProfile(userId: string, input: UpdateProfileInput): DbUser & { address?: string } {
  ensureDbReady();
  const updates: string[] = [];
  const params: Record<string, string> = { id: userId };

  if (input.name !== undefined) {
    updates.push('name = @name');
    params.name = input.name;
  }
  if (input.phone !== undefined) {
    updates.push('phone = @phone');
    params.phone = input.phone;
  }
  if (input.address !== undefined) {
    updates.push('address = @address');
    params.address = input.address;
  }
  if (input.avatarUrl !== undefined) {
    updates.push('avatar_url = @avatarUrl');
    params.avatarUrl = input.avatarUrl ?? '';
  }

  if (updates.length === 0) {
    return getUserById(userId)!;
  }

  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = @id`).run(params);
  return getUserById(userId)!;
}

export function changeUserPassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): void {
  ensureDbReady();
  const row = db.prepare('SELECT password FROM users WHERE id = ?').get(userId) as
    | { password: string }
    | undefined;

  if (!row || !verifyPassword(currentPassword, row.password)) {
    throw new Error('Password saat ini tidak valid');
  }

  if (newPassword.length < 6) {
    throw new Error('Password baru minimal 6 karakter');
  }

  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashPassword(newPassword), userId);
}

export function listUsersDetailed(): Array<{
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  nik?: string;
  phone?: string;
}> {
  ensureDbReady();
  const rows = db
    .prepare('SELECT id, name, email, role, active, nik, phone FROM users ORDER BY name')
    .all() as Array<{
      id: string;
      name: string;
      email: string;
      role: string;
      active: number;
      nik: string | null;
      phone: string | null;
    }>;

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    active: row.active === 1,
    nik: row.nik ?? undefined,
    phone: row.phone ?? undefined,
  }));
}

export interface UserPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  reportUpdate: boolean;
  letterReady: boolean;
  systemNews: boolean;
  publicProfile: boolean;
  activityHistory: boolean;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  email: true,
  push: true,
  sms: false,
  reportUpdate: true,
  letterReady: true,
  systemNews: false,
  publicProfile: false,
  activityHistory: true,
};

export function getUserPreferences(userId: string): UserPreferences {
  ensureDbReady();
  const row = db.prepare('SELECT preferences_json FROM users WHERE id = ?').get(userId) as
    | { preferences_json: string }
    | undefined;
  if (!row) return { ...DEFAULT_PREFERENCES };
  try {
    const parsed = JSON.parse(row.preferences_json) as Partial<UserPreferences> & { darkMode?: boolean };
    const { darkMode: _removed, ...rest } = parsed;
    return { ...DEFAULT_PREFERENCES, ...rest };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function updateUserPreferences(userId: string, input: Partial<UserPreferences>): UserPreferences {
  ensureDbReady();
  const current = getUserPreferences(userId);
  const merged = { ...current, ...input };
  db.prepare('UPDATE users SET preferences_json = ? WHERE id = ?').run(JSON.stringify(merged), userId);

  if (input.activityHistory === false) {
    db.prepare('DELETE FROM user_activities WHERE user_id = ?').run(userId);
  }

  return merged;
}

export function getUserIdByNik(nik: string): string | null {
  ensureDbReady();
  const row = db.prepare('SELECT id FROM users WHERE nik = ?').get(nik) as { id: string } | undefined;
  return row?.id ?? null;
}

export function updateUserByAdmin(
  id: string,
  input: { name?: string; email?: string; role?: DbUser['role']; active?: boolean },
): void {
  ensureDbReady();
  const updates: string[] = [];
  const params: Record<string, string | number> = { id };

  if (input.name !== undefined) {
    updates.push('name = @name');
    params.name = input.name;
  }
  if (input.email !== undefined) {
    updates.push('email = @email');
    params.email = input.email;
  }
  if (input.role !== undefined) {
    updates.push('role = @role');
    params.role = input.role;
    if (input.role === 'petugas') {
      const existingOfficer = db
        .prepare('SELECT id FROM officers WHERE user_id = ?')
        .get(id) as { id: string } | undefined;
      if (!existingOfficer) {
        const user = getUserById(id);
        if (user) {
          createOfficer({
            name: user.name,
            rank: 'Brigadir',
            email: user.email,
            phone: user.phone ?? '',
            userId: id,
          });
        }
      }
    }
  }
  if (input.active !== undefined) {
    updates.push('active = @active');
    params.active = input.active ? 1 : 0;
  }

  if (updates.length === 0) return;
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = @id`).run(params);
}

export interface CreateOfficerInput {
  name: string;
  rank: string;
  email: string;
  phone: string;
  status?: 'available' | 'busy' | 'offline';
  division?: 'laporan' | 'surat' | 'pengaduan';
  userId?: string;
}

export function createOfficer(input: CreateOfficerInput): void {
  ensureDbReady();
  const id = `OFF${Date.now()}`;
  db.prepare(
    `INSERT INTO officers (id, user_id, name, rank, email, phone, status, division)
     VALUES (@id, @userId, @name, @rank, @email, @phone, @status, @division)`,
  ).run({
    id,
    userId: input.userId ?? null,
    name: input.name,
    rank: input.rank,
    email: input.email,
    phone: input.phone,
    status: input.status ?? 'available',
    division: input.division ?? 'laporan',
  });

  if (input.userId) {
    db.prepare("UPDATE users SET role = 'petugas' WHERE id = ?").run(input.userId);
  }
}

export function updateOfficer(
  id: string,
  input: Partial<CreateOfficerInput>,
): void {
  ensureDbReady();
  const updates: string[] = [];
  const params: Record<string, string | null> = { id };

  if (input.name !== undefined) {
    updates.push('name = @name');
    params.name = input.name;
  }
  if (input.rank !== undefined) {
    updates.push('rank = @rank');
    params.rank = input.rank;
  }
  if (input.email !== undefined) {
    updates.push('email = @email');
    params.email = input.email;
  }
  if (input.phone !== undefined) {
    updates.push('phone = @phone');
    params.phone = input.phone;
  }
  if (input.status !== undefined) {
    updates.push('status = @status');
    params.status = input.status;
  }
  if (input.userId !== undefined) {
    updates.push('user_id = @userId');
    params.userId = input.userId ?? null;
  }
  if (input.division !== undefined) {
    updates.push('division = @division');
    params.division = input.division;
  }

  if (updates.length === 0) return;
  db.prepare(`UPDATE officers SET ${updates.join(', ')} WHERE id = @id`).run(params);

  if (input.userId) {
    db.prepare("UPDATE users SET role = 'petugas' WHERE id = ?").run(input.userId);
  }
}

export function deleteOfficer(id: string): void {
  ensureDbReady();
  const row = db.prepare('SELECT id, name FROM officers WHERE id = ?').get(id) as
    | { id: string; name: string }
    | undefined;

  if (!row) {
    throw new ApiError(404, 'Petugas tidak ditemukan');
  }

  const activeReports = (
    db
      .prepare(
        `SELECT COUNT(*) as c FROM reports
         WHERE assigned_officer_id = ? AND status NOT IN ('completed', 'rejected')`,
      )
      .get(id) as { c: number }
  ).c;

  if (activeReports > 0) {
    throw new ApiError(409, 'Petugas masih memiliki laporan aktif');
  }

  db.prepare('DELETE FROM officers WHERE id = ?').run(id);
}
