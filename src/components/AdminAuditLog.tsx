'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { spktApi, type AuditLogItem } from '@/lib/spktApi';
import { SpktPagination } from './SpktPagination';
import { Search, ScrollText, User, Clock } from 'lucide-react';

const cardClass = 'bg-gradient-to-br from-blue-900/80 to-blue-800/80 border-blue-500/50 backdrop-blur';

const ACTION_LABELS: Record<string, string> = {
  create_officer: 'Tambah Petugas',
  update_officer: 'Ubah Petugas',
  delete_officer: 'Hapus Petugas',
  admin_override: 'Override Status',
  assign_report: 'Assign Laporan',
  assign_letter: 'Assign Surat',
  assign_complaint: 'Assign Pengaduan',
  update_complaint_status: 'Ubah Status Pengaduan',
  create_article: 'Tambah Artikel',
  update_article: 'Ubah Artikel',
  delete_article: 'Hapus Artikel',
  delete_user: 'Hapus User',
};

const ENTITY_LABELS: Record<string, string> = {
  report: 'Laporan',
  letter: 'Surat',
  complaint: 'Pengaduan',
  officer: 'Petugas',
  user: 'User',
  article: 'Artikel',
};

function formatAction(action: string): string {
  return ACTION_LABELS[action] ?? action.replace(/_/g, ' ');
}

function formatEntityType(type: string): string {
  return ENTITY_LABELS[type] ?? type;
}

export const AdminAuditLog: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { logs: data, pagination } = await spktApi.getAuditLogs(page, limit);
      setLogs(data);
      setTotal(pagination?.total ?? data.length);
      setTotalPages(pagination?.totalPages ?? 1);
    } catch {
      setLogs([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filteredLogs = logs.filter((log) => {
    const q = searchQuery.toLowerCase();
    return (
      log.action.toLowerCase().includes(q) ||
      log.actorName.toLowerCase().includes(q) ||
      log.entityType.toLowerCase().includes(q) ||
      log.entityId.toLowerCase().includes(q) ||
      (log.details?.toLowerCase().includes(q) ?? false)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Audit Log</h1>
        <p className="text-blue-200 mt-1">Riwayat aksi admin dan perubahan sistem</p>
      </div>

      <Card className={cardClass}>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-blue-400" />
            <Input
              placeholder="Cari aksi, petugas, entitas, atau detail..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-blue-900/50 border-blue-500/50 text-white placeholder:text-blue-400"
            />
          </div>
        </CardContent>
      </Card>

      <Card className={cardClass}>
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-sky-300" />
            Log Aktivitas
          </CardTitle>
          <CardDescription className="text-blue-200">
            Menampilkan {filteredLogs.length} dari {total} entri
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && <p className="text-center py-8 text-blue-300">Memuat audit log...</p>}

          {!loading && filteredLogs.length === 0 && (
            <div className="text-center py-12">
              <ScrollText className="w-12 h-12 mx-auto mb-3 text-blue-500/30" />
              <p className="text-blue-300">Belum ada log aktivitas</p>
            </div>
          )}

          {!loading && filteredLogs.length > 0 && (
            <div className="space-y-3">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="border border-blue-600/50 rounded-xl p-4 bg-gradient-to-r from-blue-800/60 to-blue-700/60 backdrop-blur"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="bg-indigo-500/30 text-indigo-200 border-indigo-400/50">
                        {formatAction(log.action)}
                      </Badge>
                      <Badge className="bg-blue-500/30 text-blue-200 border-blue-400/50">
                        {formatEntityType(log.entityType)}
                      </Badge>
                      <span className="text-xs text-blue-400 font-mono">{log.entityId}</span>
                    </div>
                    <span className="text-xs text-blue-400 flex items-center gap-1 shrink-0">
                      <Clock className="w-3 h-3" />
                      {new Date(log.createdAt).toLocaleString('id-ID')}
                    </span>
                  </div>
                  <p className="text-sm text-blue-100 flex items-center gap-1 mb-1">
                    <User className="w-3 h-3 text-cyan-300" />
                    {log.actorName}
                  </p>
                  {log.details && (
                    <p className="text-sm text-blue-300">{log.details}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          <SpktPagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
        </CardContent>
      </Card>
    </div>
  );
};
