import { NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/services/users';
import {
  createSession,
  getSessionCookieName,
  getSessionMaxAgeSec,
  toPublicUser,
} from '@/lib/auth-server';
import { jsonError, jsonOk } from '@/lib/api-response';
import { isTotpEnabledForUser, createPending2fa } from '@/lib/services/totp';
import { checkRateLimit } from '@/lib/rate-limit';
import { logUserActivity } from '@/lib/services/activity';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
    if (!checkRateLimit(`login:${ip}`, 10, 60_000)) {
      return jsonError(new Error('Terlalu banyak percobaan login. Coba lagi dalam 1 menit.'));
    }

    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!email || !password) {
      return NextResponse.json({ error: 'Email dan password wajib diisi' }, { status: 400 });
    }

    const user = authenticateUser(email, password);

    if (!user) {
      return NextResponse.json({ error: 'Email atau password tidak valid' }, { status: 401 });
    }

    if (user.role === 'admin' && process.env.REQUIRE_ADMIN_2FA === 'true' && !isTotpEnabledForUser(user.id)) {
      return NextResponse.json(
        { error: 'Admin wajib mengaktifkan 2FA sebelum login. Hubungi administrator sistem.' },
        { status: 403 },
      );
    }

    if (isTotpEnabledForUser(user.id)) {
      const tempToken = createPending2fa(user.id);
      return jsonOk({ requires2fa: true, tempToken });
    }

    const token = createSession(user.id);
    logUserActivity(user.id, 'login');
    const response = jsonOk({ user: toPublicUser(user) });
    response.cookies.set(getSessionCookieName(), token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: getSessionMaxAgeSec(),
    });
    return response;
  } catch (error) {
    return jsonError(error);
  }
}
