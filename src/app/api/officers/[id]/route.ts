import { updateOfficer, deleteOfficer } from '@/lib/services/users';
import { requireAuth, requireRole } from '@/lib/auth-server';
import { handleApi, jsonOk } from '@/lib/api-response';
import { createAuditLog } from '@/lib/services/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const PATCH = handleApi(async (request, context: { params: Promise<{ id: string }> }) => {
  const sessionUser = await requireAuth(request);
  requireRole(sessionUser, ['admin']);

  const { id } = await context.params;
  const body = await request.json();

  updateOfficer(id, {
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
    action: 'update_officer',
    entityType: 'officer',
    entityId: id,
    details: body.name ?? id,
  });

  return jsonOk({ message: 'Petugas diperbarui' });
});

export const DELETE = handleApi(async (request, context: { params: Promise<{ id: string }> }) => {
  const sessionUser = await requireAuth(request);
  requireRole(sessionUser, ['admin']);

  const { id } = await context.params;
  deleteOfficer(id);

  createAuditLog({
    actorId: sessionUser.id,
    actorName: sessionUser.name,
    action: 'delete_officer',
    entityType: 'officer',
    entityId: id,
    details: 'Petugas dihapus',
  });

  return jsonOk({ message: 'Petugas dihapus' });
});
