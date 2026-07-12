import { getComplaintById, updateComplaint, getOfficerByUserId, getOfficerById } from '@/lib/services/spkt';
import { requireAuth, requireRole } from '@/lib/auth-server';
import { handleApi, jsonOk, ApiError } from '@/lib/api-response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = handleApi(async (request, context: { params: Promise<{ id: string }> }) => {
  const sessionUser = await requireAuth(request);
  const { id } = await context.params;
  const complaint = getComplaintById(id);

  if (!complaint) {
    throw new ApiError(404, 'Pengaduan tidak ditemukan');
  }

  if (sessionUser.role === 'user' && complaint.submitterNik !== sessionUser.nik) {
    throw new ApiError(403, 'Anda tidak dapat melihat pengaduan ini');
  }

  if (sessionUser.role === 'petugas') {
    const officer = getOfficerByUserId(sessionUser.id);
    if (!officer || complaint.assignedOfficerId !== officer.id) {
      throw new ApiError(403, 'Anda tidak memiliki akses ke pengaduan ini');
    }
  }

  return jsonOk({ complaint });
});

export const PATCH = handleApi(async (request, context: { params: Promise<{ id: string }> }) => {
  const sessionUser = await requireAuth(request);
  requireRole(sessionUser, ['admin', 'petugas']);

  const { id } = await context.params;
  const body = await request.json();

  const existing = getComplaintById(id);
  if (!existing) {
    throw new ApiError(404, 'Pengaduan tidak ditemukan');
  }

  if (sessionUser.role === 'petugas') {
    const officer = getOfficerByUserId(sessionUser.id);
    if (!officer || officer.division !== 'pengaduan') {
      throw new ApiError(403, 'Hanya petugas divisi pengaduan yang dapat memproses pengaduan');
    }
    if (existing.assignedOfficerId !== officer.id) {
      throw new ApiError(403, 'Pengaduan ini belum ditugaskan kepada Anda');
    }
  }

  let assignedTo = body.assignedTo;
  let status = body.status;
  if (body.assignedOfficerId && sessionUser.role === 'admin') {
    const officer = getOfficerById(body.assignedOfficerId);
    if (!officer) {
      throw new ApiError(400, 'Petugas tidak ditemukan');
    }
    if (officer.division !== 'pengaduan') {
      throw new ApiError(400, 'Petugas harus dari divisi pengaduan');
    }
    assignedTo = officer.name;
    if (!status && existing.status === 'submitted') {
      status = 'reviewing';
    }
  }

  const complaint = updateComplaint(id, {
    status,
    response: body.response,
    assignedOfficerId: body.assignedOfficerId,
    assignedTo,
    assignedBy: body.assignedOfficerId ? sessionUser.name : undefined,
    timelineNote: body.timelineNote,
    timelineOfficer: sessionUser.name,
    auditActorId: sessionUser.id,
    auditActorName: sessionUser.name,
  });

  if (!complaint) {
    throw new ApiError(404, 'Pengaduan tidak ditemukan');
  }

  return jsonOk({ complaint });
});
