import { listOfficers } from '@/lib/services/spkt';
import { createOfficer } from '@/lib/services/users';
import { requireAuth, requireRole } from '@/lib/auth-server';
import { handleApi, jsonOk } from '@/lib/api-response';
import { createAuditLog } from '@/lib/services/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = handleApi(async (request) => {
  const sessionUser = await requireAuth(request);
  requireRole(sessionUser, ['petugas', 'admin']);
  const officers = listOfficers();
  return jsonOk({ officers });
});

export const POST = handleApi(async (request) => {
  const sessionUser = await requireAuth(request);
  requireRole(sessionUser, ['admin']);

  const body = await request.json();
  createOfficer({
    name: body.name,
    rank: body.rank,
    email: body.email,
    phone: body.phone,
    status: body.status,
    division: body.division,
    userId: body.userId,
  });

  createAuditLog({
    actorId: sessionUser.id,
    actorName: sessionUser.name,
    action: 'create_officer',
    entityType: 'officer',
    entityId: body.email,
    details: body.name,
  });

  return jsonOk({ message: 'Petugas ditambahkan' }, 201);
});
