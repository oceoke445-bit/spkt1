import { getLetterById, updateLetter, updateUserLetter, getOfficerByUserId, getOfficerById } from '@/lib/services/spkt';
import { requireAuth, requireRole } from '@/lib/auth-server';
import { handleApi, jsonOk, ApiError } from '@/lib/api-response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = handleApi(async (request, context: { params: Promise<{ id: string }> }) => {
  const sessionUser = await requireAuth(request);
  const { id } = await context.params;
  const letter = getLetterById(id);

  if (!letter) {
    throw new ApiError(404, 'Pengajuan surat tidak ditemukan');
  }

  if (sessionUser.role === 'user' && letter.requesterNIK !== sessionUser.nik) {
    throw new ApiError(403, 'Anda tidak dapat melihat pengajuan ini');
  }

  if (sessionUser.role === 'petugas') {
    const officer = getOfficerByUserId(sessionUser.id);
    if (!officer || letter.assignedOfficerId !== officer.id) {
      throw new ApiError(403, 'Anda tidak memiliki akses ke pengajuan ini');
    }
  }

  return jsonOk({ letter });
});

export const PATCH = handleApi(async (request, context: { params: Promise<{ id: string }> }) => {
  const sessionUser = await requireAuth(request);
  const { id } = await context.params;
  const body = await request.json();

  if (sessionUser.role === 'user') {
    if (!sessionUser.nik) {
      throw new ApiError(400, 'NIK tidak tersedia');
    }
    const letter = updateUserLetter(id, sessionUser.nik, {
      purpose: body.purpose,
      pickupDate: body.pickupDate,
      requesterPhone: body.requesterPhone,
      attachmentFiles: body.attachmentFiles,
      submit: body.submit,
      letterTypeId: body.letterTypeId,
      letterTypeName: body.letterTypeName,
    });
    return jsonOk({ letter });
  }

  requireRole(sessionUser, ['petugas', 'admin']);

  const existing = getLetterById(id);
  if (!existing) {
    throw new ApiError(404, 'Pengajuan surat tidak ditemukan');
  }

  if (sessionUser.role === 'petugas') {
    const officer = getOfficerByUserId(sessionUser.id);
    if (!officer || officer.division !== 'surat') {
      throw new ApiError(403, 'Hanya petugas divisi surat yang dapat memproses pengajuan');
    }
    if (existing.assignedOfficerId !== officer.id) {
      throw new ApiError(403, 'Pengajuan ini belum ditugaskan kepada Anda');
    }
  }

  let assignedTo = body.assignedTo;
  if (body.assignedOfficerId && sessionUser.role === 'admin') {
    const officer = getOfficerById(body.assignedOfficerId);
    if (!officer) {
      throw new ApiError(400, 'Petugas tidak ditemukan');
    }
    if (officer.division !== 'surat') {
      throw new ApiError(400, 'Petugas harus dari divisi surat');
    }
    assignedTo = officer.name;
  }

  const letter = updateLetter(id, {
    status: body.status,
    pickupDate: body.pickupDate,
    rejectionReason: body.rejectionReason,
    assignedOfficerId: body.assignedOfficerId,
    assignedTo,
    assignedBy: body.assignedOfficerId ? sessionUser.name : undefined,
    timelineNote: body.timelineNote,
    timelineOfficer: sessionUser.name,
    auditActorId: sessionUser.role === 'admin' ? sessionUser.id : undefined,
    auditActorName: sessionUser.role === 'admin' ? sessionUser.name : undefined,
  });

  if (!letter) {
    throw new ApiError(404, 'Pengajuan surat tidak ditemukan');
  }

  return jsonOk({ letter });
});
