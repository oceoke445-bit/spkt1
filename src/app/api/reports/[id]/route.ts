import {
  getReportById,
  updateReport,
  updateUserReport,
  deleteUserReport,
  getOfficerById,
  getOfficerByUserId,
} from '@/lib/services/spkt';
import { requireAuth, requireRole } from '@/lib/auth-server';
import { handleApi, jsonOk, ApiError } from '@/lib/api-response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = handleApi(async (request, context: { params: Promise<{ id: string }> }) => {
  const sessionUser = await requireAuth(request);
  const { id } = await context.params;
  const report = getReportById(id);

  if (!report) {
    throw new ApiError(404, 'Laporan tidak ditemukan');
  }

  if (sessionUser.role === 'user' && report.reporterNIK !== sessionUser.nik) {
    throw new ApiError(403, 'Anda tidak dapat melihat laporan ini');
  }

  return jsonOk({ report });
});

export const PATCH = handleApi(async (request, context: { params: Promise<{ id: string }> }) => {
  const sessionUser = await requireAuth(request);
  const { id } = await context.params;
  const body = await request.json();

  if (sessionUser.role === 'user') {
    if (!sessionUser.nik) {
      throw new ApiError(400, 'NIK user tidak tersedia');
    }
    const report = updateUserReport(id, sessionUser.nik, {
      caseType: body.caseType,
      incidentDate: body.incidentDate,
      location: body.location,
      description: body.description,
      reporterPhone: body.reporterPhone,
      evidenceFiles: body.evidenceFiles,
      submit: body.submit,
    });
    return jsonOk({ report });
  }

  requireRole(sessionUser, ['petugas', 'admin']);

  if (sessionUser.role === 'petugas') {
    const existing = getReportById(id);
    if (!existing) {
      throw new ApiError(404, 'Laporan tidak ditemukan');
    }

    const officer = getOfficerByUserId(sessionUser.id);
    const officerName = officer?.name ?? sessionUser.name;
    if (!officer || officer.division !== 'laporan') {
      throw new ApiError(403, 'Hanya petugas divisi laporan yang dapat memproses laporan');
    }
    const isAssignedToOfficer =
      (officer?.id && existing.assignedOfficerId === officer.id) ||
      (!existing.assignedOfficerId && existing.assignedTo === officerName);

    if (!isAssignedToOfficer) {
      throw new ApiError(403, 'Laporan ini belum ditugaskan kepada Anda');
    }

    const report = updateReport(id, {
      status: body.status,
      notes: body.notes,
      timelineNote: body.timelineNote,
      timelineOfficer: sessionUser.name,
    });
    return jsonOk({ report });
  }

  let assignedTo = body.assignedTo;
  if (body.assignedOfficerId) {
    const officer = getOfficerById(body.assignedOfficerId);
    if (!officer) {
      throw new ApiError(400, 'Petugas tidak ditemukan');
    }
    if (officer.division !== 'laporan') {
      throw new ApiError(400, 'Petugas harus dari divisi laporan');
    }
    assignedTo = officer.name;
  }

  const report = updateReport(id, {
    ...body,
    assignedTo,
    assignedOfficerId: body.assignedOfficerId,
    adminOverride: sessionUser.role === 'admin' && body.adminOverride,
    timelineOfficer: body.timelineOfficer ?? sessionUser.name,
    assignedBy: body.assignedBy ?? sessionUser.name,
    auditActorId: sessionUser.role === 'admin' ? sessionUser.id : undefined,
    auditActorName: sessionUser.role === 'admin' ? sessionUser.name : undefined,
  });

  return jsonOk({ report });
});

export const DELETE = handleApi(async (request, context: { params: Promise<{ id: string }> }) => {
  const sessionUser = await requireAuth(request);
  const { id } = await context.params;

  if (sessionUser.role !== 'user') {
    throw new ApiError(403, 'Hanya pengguna dapat menghapus laporan sendiri');
  }
  if (!sessionUser.nik) {
    throw new ApiError(400, 'NIK user tidak tersedia');
  }

  deleteUserReport(id, sessionUser.nik);
  return jsonOk({ message: 'Laporan berhasil dihapus' });
});
