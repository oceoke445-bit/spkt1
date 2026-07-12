import { useCallback, useEffect, useState } from 'react';
import { spktApi } from '@/lib/spktApi';
import type { Report } from '@/lib/types/spkt';
import { DEFAULT_LIMIT } from '@/lib/pagination';

export function useReports(params?: {
  nik?: string;
  assignedTo?: string;
  assignedOfficerId?: string;
  limit?: number;
  paginate?: boolean;
}) {
  const limit = params?.limit ?? (params?.paginate === false ? 100 : DEFAULT_LIMIT);
  const [page, setPage] = useState(1);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { reports: data, pagination } = await spktApi.getReports({
        nik: params?.nik,
        assignedTo: params?.assignedTo,
        assignedOfficerId: params?.assignedOfficerId,
        page,
        limit,
      });
      setReports(data);
      setTotal(pagination?.total ?? data.length);
      setTotalPages(pagination?.totalPages ?? 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat laporan');
    } finally {
      setLoading(false);
    }
  }, [params?.nik, params?.assignedTo, params?.assignedOfficerId, page, limit]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { reports, loading, error, refresh, page, setPage, total, totalPages };
}

