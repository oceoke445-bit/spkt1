import { db, ensureDbReady } from '@/lib/db';
import type { DbUser } from '@/lib/types/spkt';
import type { OfficerDivision } from '@/lib/types/spkt';
import { ApiError } from '@/lib/api-response';

const SESSION_COOKIE = 'spkt_session';
const SESSION_MAX_AGE_SEC = 7 * 24 * 60 * 60;

function nowIso(): string {
  return new Date().toISOString();
}

function sessionExpiresAt(): string {
  return new Date(Date.now() + SESSION_MAX_AGE_SEC * 1000).toISOString();
}

export function getSessionCookieName(): string {
  return SESSION_COOKIE;
}

export function getSessionMaxAgeSec(): number {
  return SESSION_MAX_AGE_SEC;
}

export function createSession(userId: string): string {
  ensureDbReady();
  const token = crypto.randomUUID();
  const createdAt = nowIso();
  const expiresAt = sessionExpiresAt();

  db.prepare(
    'INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)',
  ).run(token, userId, expiresAt, createdAt);

  return token;
}

export function deleteSession(token: string): void {
  ensureDbReady();
  db.prepare('DELETE FROM sessions WHERE id = ?').run(token);
}

export function getUserBySessionToken(token: string): DbUser | null {
  ensureDbReady();
  const row = db
    .prepare(
      `SELECT u.id, u.email, u.name, u.nik, u.phone, u.role, s.expires_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.id = ?`,
    )
    .get(token) as
    | {
        id: string;
        email: string;
        name: string;
        nik: string | null;
        phone: string | null;
        role: DbUser['role'];
        expires_at: string;
      }
    | undefined;

  if (!row) return null;

  if (new Date(row.expires_at) < new Date()) {
    deleteSession(token);
    return null;
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

export async function getSessionUserFromRequest(request: Request): Promise<DbUser | null> {
  const cookieHeader = request.headers.get('cookie') ?? '';
  const match = cookieHeader.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  if (!match?.[1]) {
    return null;
  }

  return getUserBySessionToken(decodeURIComponent(match[1]));
}

export async function requireAuth(request: Request): Promise<DbUser> {
  const user = await getSessionUserFromRequest(request);
  if (!user) {
    throw new ApiError(401, 'Perlu login untuk mengakses resource ini');
  }
  return user;
}

export function requireRole(user: DbUser, roles: DbUser['role'][]): void {
  if (!roles.includes(user.role)) {
    throw new ApiError(403, 'Anda tidak memiliki akses untuk aksi ini');
  }
}

export function getOfficerMetaForUser(userId: string): { officerId: string; division: OfficerDivision } | null {
  ensureDbReady();
  const row = db
    .prepare('SELECT id, division FROM officers WHERE user_id = ?')
    .get(userId) as { id: string; division: OfficerDivision } | undefined;
  if (!row) return null;
  return { officerId: row.id, division: row.division ?? 'laporan' };
}

export function toPublicUser(user: DbUser) {
  const base = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    nik: user.nik,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
  };

  if (user.role !== 'petugas') {
    return base;
  }

  const officerMeta = getOfficerMetaForUser(user.id);
  return {
    ...base,
    officerId: officerMeta?.officerId,
    officerDivision: officerMeta?.division ?? 'laporan',
  };
}
