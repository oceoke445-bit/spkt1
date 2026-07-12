import { listComplaints, createComplaint } from '@/lib/services/spkt';
import { getOfficerByUserId } from '@/lib/services/spkt';
import { requireAuth } from '@/lib/auth-server';
import { handleApi, jsonOk } from '@/lib/api-response';
import { parsePagination, buildPaginatedResult } from '@/lib/pagination';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = handleApi(async (request) => {
  const sessionUser = await requireAuth(request);
  const { searchParams } = new URL(request.url);
  const { page, limit } = parsePagination(searchParams);

  if (sessionUser.role === 'user') {
    const { items, total } = listComplaints({ nik: sessionUser.nik }, { page, limit });
    return jsonOk({
      complaints: items,
      pagination: buildPaginatedResult(items, total, page, limit),
    });
  }

  if (sessionUser.role === 'petugas') {
    const officer = getOfficerByUserId(sessionUser.id);
    if (!officer) {
      return jsonOk({
        complaints: [],
        pagination: buildPaginatedResult([], 0, page, limit),
      });
    }
    const { items, total } = listComplaints({ officerInbox: { officerId: officer.id } }, { page, limit });
    return jsonOk({
      complaints: items,
      pagination: buildPaginatedResult(items, total, page, limit),
    });
  }

  const nik = searchParams.get('nik') ?? undefined;
  const { items, total } = listComplaints({ nik }, { page, limit });
  return jsonOk({
    complaints: items,
    pagination: buildPaginatedResult(items, total, page, limit),
  });
});

export const POST = handleApi(async (request) => {
  const sessionUser = await requireAuth(request);
  const body = await request.json();

  const complaint = createComplaint({
    ...body,
    submitterUserId: sessionUser.id,
    submitterName: body.submitterName ?? sessionUser.name,
    submitterNik: body.submitterNik ?? sessionUser.nik,
  });

  return jsonOk({ complaint }, 201);
});
