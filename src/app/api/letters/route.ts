import { listLetters, createLetter } from '@/lib/services/spkt';
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
    const { items, total } = listLetters({ nik: sessionUser.nik }, { page, limit });
    return jsonOk({
      letters: items,
      pagination: buildPaginatedResult(items, total, page, limit),
    });
  }

  if (sessionUser.role === 'petugas') {
    const officer = getOfficerByUserId(sessionUser.id);
    if (!officer) {
      return jsonOk({
        letters: [],
        pagination: buildPaginatedResult([], 0, page, limit),
      });
    }
    const { items, total } = listLetters({ officerInbox: { officerId: officer.id } }, { page, limit });
    return jsonOk({
      letters: items,
      pagination: buildPaginatedResult(items, total, page, limit),
    });
  }

  const nik = searchParams.get('nik') ?? undefined;
  const { items, total } = listLetters({ nik }, { page, limit });
  return jsonOk({
    letters: items,
    pagination: buildPaginatedResult(items, total, page, limit),
  });
});

export const POST = handleApi(async (request) => {
  const sessionUser = await requireAuth(request);
  const body = await request.json();

  const letter = createLetter({
    ...body,
    requesterUserId: sessionUser.id,
    requesterName: body.requesterName ?? sessionUser.name,
    requesterNIK: body.requesterNIK ?? sessionUser.nik,
    requesterPhone: body.requesterPhone ?? sessionUser.phone,
  });

  return jsonOk({ letter }, 201);
});
