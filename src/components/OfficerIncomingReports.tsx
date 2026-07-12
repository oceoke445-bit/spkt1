import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { getStatusBadgeColor, getStatusLabel, Report, ReportStatus } from '@/lib/data/mockData';
import { spktApi } from '@/lib/spktApi';
import { spktDialogClass } from '@/lib/spktDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useReports } from '@/hooks/useReports';
import { useOfficers } from '@/hooks/useOfficers';
import { Clock, CheckCircle2, FileText, MapPin, Calendar, Eye, Search } from 'lucide-react';
import { toast } from 'sonner';
import { SpktPagination } from './SpktPagination';

export const OfficerIncomingReports: React.FC = () => {
  const { user } = useAuth();
  const { reports: incomingReports, loading, refresh, page, setPage, total, totalPages } = useReports();
  const { officers } = useOfficers();
  const myOfficer = officers.find((o) => o.userId === user?.id);
  const officerId = myOfficer?.id;
  const officerName = myOfficer?.name ?? user?.name ?? '';

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [actionNote, setActionNote] = useState('');
  const [newStatus, setNewStatus] = useState<ReportStatus>('completed');

  const filteredReports = incomingReports.filter((report) => {
    const matchesSearch =
      report.reportNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.reporterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.caseType.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || report.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const handleUpdateStatus = async () => {
    if (!selectedReport) return;
    try {
      await spktApi.updateReport(selectedReport.id, {
        status: newStatus,
        timelineNote: actionNote || undefined,
        timelineOfficer: user?.name,
      });
      await refresh();
      toast.success('Status laporan diperbarui', {
        description: `Status diubah menjadi ${getStatusLabel(newStatus)}`,
      });
      setSelectedReport(null);
      setActionNote('');
    } catch (err) {
      toast.error('Gagal memperbarui status', {
        description: err instanceof Error ? err.message : 'Terjadi kesalahan',
      });
    }
  };

  const handleStartProcessing = async () => {
    if (!selectedReport) return;
    try {
      await spktApi.updateReport(selectedReport.id, {
        status: 'processing',
        timelineNote: actionNote || undefined,
        timelineOfficer: user?.name,
      });
      await refresh();
      toast.success('Mulai memproses', {
        description: 'Status diubah menjadi "Diproses"',
      });
      setSelectedReport(null);
      setActionNote('');
    } catch (err) {
      toast.error('Gagal memproses laporan', {
        description: err instanceof Error ? err.message : 'Terjadi kesalahan',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Laporan Masuk</h1>
        <p className="text-blue-200 mt-1">Laporan yang sudah ditugaskan admin kepada Anda</p>
      </div>

      {loading && (
        <div className="text-center py-8 text-blue-300">Memuat laporan...</div>
      )}

      {!loading && (
        <>
          <Card className="bg-gradient-to-br from-blue-900/80 to-blue-800/80 border-blue-500/50 backdrop-blur">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-blue-400" />
                  <Input
                    placeholder="Cari nomor laporan, pelapor, atau jenis kasus..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-blue-900/50 border-blue-500/50 text-white placeholder:text-blue-400 focus:border-blue-400"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'all', label: 'Semua' },
                    { key: 'assigned', label: 'Ditugaskan' },
                    { key: 'processing', label: 'Proses' },
                    { key: 'completed', label: 'Selesai' },
                  ].map((item) => (
                    <Button
                      key={item.key}
                      variant={filterStatus === item.key ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilterStatus(item.key)}
                      className={
                        filterStatus === item.key
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 shadow-md'
                          : 'border-blue-500/50 text-blue-300 hover:bg-blue-800/50 hover:text-blue-100'
                      }
                    >
                      {item.label}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-900/80 to-blue-800/80 border-blue-500/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-white">Daftar Laporan</CardTitle>
              <CardDescription className="text-blue-200">
                Menampilkan {filteredReports.length} dari {total} laporan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredReports.length === 0 ? (
                  <p className="text-center py-8 text-blue-300">Tidak ada laporan ditemukan</p>
                ) : (
                  filteredReports.map((report) => (
                    <div
                      key={report.id}
                      className="border border-blue-600/50 rounded-xl p-4 hover:shadow-lg hover:border-blue-400 transition-all bg-gradient-to-r from-blue-800/60 to-blue-700/60 backdrop-blur"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                        <div>
                          <h3 className="font-semibold text-white">{report.reportNumber}</h3>
                          <p className="text-sm text-blue-200 mt-1">{report.reporterName}</p>
                        </div>
                        <span className={`px-3 py-1 text-xs rounded-full border ${getStatusBadgeColor(report.status)}`}>
                          {getStatusLabel(report.status)}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-blue-200">
                          <FileText className="w-4 h-4 text-blue-500" />
                          {report.caseType}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-blue-200">
                          <MapPin className="w-4 h-4 text-blue-500" />
                          {report.location}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-blue-200">
                          <Calendar className="w-4 h-4 text-blue-500" />
                          {new Date(report.incidentDate).toLocaleDateString('id-ID')}
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-blue-600/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        {report.assignedTo ? (
                          <p className="text-xs text-blue-300">
                            Ditugaskan ke: <span className="font-medium">{report.assignedTo}</span>
                          </p>
                        ) : (
                          <p className="text-xs text-blue-300">Belum ditugaskan</p>
                        )}
                        <Button
                          size="sm"
                          className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-md"
                          onClick={() => setSelectedReport(report)}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Lihat Detail
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <SpktPagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
            </CardContent>
          </Card>

          <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
            <DialogContent className={spktDialogClass('4xl')}>
              {selectedReport && (
                <>
                  <DialogHeader>
                    <div className="pr-8">
                      <DialogTitle className="text-2xl text-white">{selectedReport.reportNumber}</DialogTitle>
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <p className="text-sm text-blue-200">
                          Dibuat:{' '}
                          {new Date(selectedReport.createdAt).toLocaleDateString('id-ID', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                        <span
                          className={`px-3 py-1 text-sm rounded-full border ${getStatusBadgeColor(selectedReport.status)}`}
                        >
                          {getStatusLabel(selectedReport.status)}
                        </span>
                      </div>
                    </div>
                  </DialogHeader>

                  <div className="space-y-6 mt-4">
                    <div className="bg-blue-800/50 border border-blue-600/50 rounded-lg p-4">
                      <h3 className="font-semibold text-white mb-3">Data Pelapor</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-blue-200">Nama:</span>
                          <p className="font-medium">{selectedReport.reporterName}</p>
                        </div>
                        <div>
                          <span className="text-blue-200">NIK:</span>
                          <p className="font-medium">{selectedReport.reporterNIK}</p>
                        </div>
                        <div>
                          <span className="text-blue-200">Telepon:</span>
                          <p className="font-medium">{selectedReport.reporterPhone}</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold text-white mb-3">Detail Kejadian</h3>
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <span className="text-sm text-blue-200">Jenis Kasus</span>
                            <p className="font-medium">{selectedReport.caseType}</p>
                          </div>
                          <div>
                            <span className="text-sm text-blue-200">Tanggal Kejadian</span>
                            <p className="font-medium">
                              {new Date(selectedReport.incidentDate).toLocaleDateString('id-ID')}
                            </p>
                          </div>
                        </div>
                        <div>
                          <span className="text-sm text-blue-200">Lokasi</span>
                          <p className="font-medium">{selectedReport.location}</p>
                        </div>
                        <div>
                          <span className="text-sm text-blue-200">Kronologi</span>
                          <p className="mt-1 text-white leading-relaxed">{selectedReport.description}</p>
                        </div>
                      </div>
                    </div>

                    {selectedReport.evidenceFiles && selectedReport.evidenceFiles.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-white mb-3">Bukti Pendukung</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {selectedReport.evidenceFiles.map((file) => (
                            <div
                              key={file}
                              className="border border-blue-500/40 rounded-lg p-3 flex items-center gap-2 bg-blue-900/40"
                            >
                              <FileText className="w-4 h-4 text-blue-200 shrink-0" />
                              <span className="text-sm truncate text-blue-100 flex-1">{file}</span>
                              <Button
                                size="sm"
                                className="shrink-0 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white border-0 shadow-md"
                                asChild
                              >
                                <a href={spktApi.getFileUrl(file)} target="_blank" rel="noopener noreferrer">
                                  <Eye className="w-3 h-3 mr-1 text-sky-100" />
                                  Review
                                </a>
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedReport.assignedTo && (
                      <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-4">
                        <h3 className="font-semibold text-white mb-2">Info Penugasan</h3>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-indigo-300">Ditugaskan ke:</span>
                            <p className="font-medium text-white">{selectedReport.assignedTo}</p>
                          </div>
                          {selectedReport.assignedBy && (
                            <div>
                              <span className="text-indigo-300">Oleh:</span>
                              <p className="font-medium text-white">{selectedReport.assignedBy}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="border-t border-blue-600/50 pt-6">
                      <h3 className="font-semibold text-white mb-4">Tindakan</h3>

                      {selectedReport.assignedTo === officerName &&
                        selectedReport.status === 'assigned' && (
                          <div className="space-y-4">
                            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                              <p className="text-sm text-amber-100 mb-3">
                                <strong className="text-amber-200">Langkah 1:</strong> Mulai memproses laporan ini.
                              </p>
                              <div className="space-y-2 mb-3">
                                <Label htmlFor="note" className="text-blue-200">
                                  Catatan Awal
                                </Label>
                                <Textarea
                                  id="note"
                                  value={actionNote}
                                  onChange={(e) => setActionNote(e.target.value)}
                                  placeholder="Tambahkan catatan tindak lanjut..."
                                  rows={3}
                                  className="bg-blue-900/50 border-blue-500/50 text-white placeholder:text-blue-400"
                                />
                              </div>
                              <Button
                                onClick={handleStartProcessing}
                                className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 shadow-md"
                              >
                                <Clock className="w-4 h-4 mr-2" />
                                Mulai Proses
                              </Button>
                            </div>
                          </div>
                        )}

                      {selectedReport.assignedTo === officerName && selectedReport.status === 'processing' && (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="status" className="text-blue-200">
                              Status Baru
                            </Label>
                            <Select value={newStatus} onValueChange={(value) => setNewStatus(value as ReportStatus)}>
                              <SelectTrigger className="bg-blue-900/50 border-blue-500/50 text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="processing">Masih Diproses</SelectItem>
                                <SelectItem value="completed">Selesai</SelectItem>
                                <SelectItem value="rejected">Tolak</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="note-update" className="text-blue-200">
                              Catatan
                            </Label>
                            <Textarea
                              id="note-update"
                              value={actionNote}
                              onChange={(e) => setActionNote(e.target.value)}
                              placeholder="Tambahkan catatan tindak lanjut..."
                              rows={3}
                              className="bg-blue-900/50 border-blue-500/50 text-white placeholder:text-blue-400"
                            />
                          </div>
                          <Button
                            onClick={handleUpdateStatus}
                            className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 shadow-md"
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Update Status
                          </Button>
                        </div>
                      )}

                      {selectedReport.status === 'completed' && (
                        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                          <div className="flex items-center gap-2 text-emerald-200">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            <p className="text-sm font-medium">Laporan ini sudah selesai diproses</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
};

