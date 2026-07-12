import { listReports, createReport, deleteAllReports } from '@/lib/services/spkt';
import { requireAuth, requireRole } from '@/lib/auth-server';
import { handleApi, jsonOk, ApiError } from '@/lib/api-response';
import { parsePagination, buildPaginatedResult } from '@/lib/pagination';
import { getOfficerByUserId } from '@/lib/services/spkt';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = handleApi(async (request) => {
  const sessionUser = await requireAuth(request);
  const { searchParams } = new URL(request.url);
  const { page, limit } = parsePagination(searchParams);

  if (sessionUser.role === 'user') {
    if (!sessionUser.nik) {
      throw new ApiError(400, 'NIK user tidak tersedia');
    }
    const { items, total } = listReports({ nik: sessionUser.nik }, { page, limit: limit });
    return jsonOk({
      reports: items,
      pagination: buildPaginatedResult(items, total, page, limit),
    });
  }

  if (sessionUser.role === 'petugas') {
    const officer = getOfficerByUserId(sessionUser.id);
    const { items, total } = listReports(
      {
        officerInbox: {
          officerId: officer?.id,
          officerName: officer?.name ?? sessionUser.name,
        },
      },
      { page, limit },
    );
    return jsonOk({
      reports: items,
      pagination: buildPaginatedResult(items, total, page, limit),
    });
  }

  const nik = searchParams.get('nik') ?? undefined;
  const assignedTo = searchParams.get('assignedTo') ?? undefined;
  const assignedOfficerId = searchParams.get('assignedOfficerId') ?? undefined;

  const { items, total } = listReports({ nik, assignedTo, assignedOfficerId }, { page, limit });
  return jsonOk({
    reports: items,
    pagination: buildPaginatedResult(items, total, page, limit),
  });
});

export const POST = handleApi(async (request) => {
  const sessionUser = await requireAuth(request);
  const body = await request.json();

  const report = createReport({
    ...body,
    reporterUserId: sessionUser.id,
    reporterName: body.reporterName ?? sessionUser.name,
    reporterNIK: body.reporterNIK ?? sessionUser.nik ?? body.reporterNIK,
    reporterPhone: body.reporterPhone ?? sessionUser.phone ?? body.reporterPhone,
  });

  return jsonOk({ report }, 201);
});

export const DELETE = handleApi(async (request) => {
  const sessionUser = await requireAuth(request);
  requireRole(sessionUser, ['admin']);

  const deleted = deleteAllReports();
  return jsonOk({ message: 'Semua laporan berhasil dihapus', deleted });
});


