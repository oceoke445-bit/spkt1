import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { getStatusBadgeColor, getStatusLabel, Report, ReportStatus } from '@/lib/data/mockData';
import { spktApi } from '@/lib/spktApi';
import { spktDialogClass } from '@/lib/spktDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useReports } from '@/hooks/useReports';
import { useOfficers } from '@/hooks/useOfficers';
import type { Officer } from '@/lib/types/spkt';
import { Shield, UserX, RefreshCw, AlertTriangle, Search, Users, FileText, Ban, Trash2, Eye, Clock, User, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { SpktPagination } from './SpktPagination';

const cardClass = 'bg-gradient-to-br from-blue-900/80 to-blue-800/80 border-blue-500/50 backdrop-blur';
const reportItemClass =
  'border border-blue-600/50 rounded-xl p-4 hover:shadow-lg hover:border-blue-400 transition-all bg-gradient-to-r from-blue-800/60 to-blue-700/60 backdrop-blur';

export const AdminControl: React.FC = () => {
  const { user } = useAuth();
  const { reports: allReports, loading, refresh, page, setPage, total, totalPages } = useReports();
  const { officers: mockOfficers } = useOfficers();
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [viewingReport, setViewingReport] = useState<Report | null>(null);
  const [overrideStatus, setOverrideStatus] = useState<ReportStatus>('verified');
  const [reassignOfficer, setReassignOfficer] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showOverrideDialog, setShowOverrideDialog] = useState(false);
  const [showReassignDialog, setShowReassignDialog] = useState(false);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  const filteredReports = allReports.filter(report =>
    report.reportNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    report.reporterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    report.caseType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const laporanOfficers = mockOfficers.filter((o) => o.division === 'laporan');

  const handleOverrideStatus = async () => {
    if (!selectedReport || !overrideReason) {
      toast.error('Lengkapi form', {
        description: 'Alasan override wajib diisi',
      });
      return;
    }

    try {
      await spktApi.updateReport(selectedReport.id, {
        status: overrideStatus,
        notes: overrideReason,
        timelineNote: overrideReason,
        timelineOfficer: user?.name,
        adminOverride: true,
      });
      await refresh();
      toast.success('Status berhasil di-override', {
        description: `Laporan ${selectedReport.reportNumber} diubah menjadi ${getStatusLabel(overrideStatus)}`,
      });
      setShowOverrideDialog(false);
      setSelectedReport(null);
      setOverrideReason('');
    } catch (err) {
      toast.error('Gagal mengubah status', {
        description: err instanceof Error ? err.message : 'Terjadi kesalahan',
      });
    }
  };

  const handleReassignOfficer = async () => {
    if (!selectedReport || !reassignOfficer) {
      toast.error('Pilih petugas', {
        description: 'Pilih petugas yang akan ditugaskan',
      });
      return;
    }

    try {
      const officer = mockOfficers.find((o) => o.id === reassignOfficer);
      await spktApi.updateReport(selectedReport.id, {
        status: 'assigned',
        assignedOfficerId: reassignOfficer,
        timelineNote: selectedReport.assignedOfficerId ? 'Ditugaskan ulang ke petugas' : 'Ditugaskan ke petugas',
        timelineOfficer: user?.name,
      });
      await refresh();
      toast.success('Berhasil ditugaskan', {
        description: `Laporan ditugaskan ke ${officer?.name ?? 'petugas'}`,
      });
      setShowReassignDialog(false);
      setSelectedReport(null);
      setReassignOfficer('');
    } catch (err) {
      toast.error('Gagal reassign', {
        description: err instanceof Error ? err.message : 'Terjadi kesalahan',
      });
    }
  };

  const handleSuspendUser = async (report: Report) => {
    try {
      await spktApi.suspendUserByNik(report.reporterNIK);
      toast.warning('User dinonaktifkan', {
        description: `Akun pelapor ${report.reporterName} telah ditangguhkan`,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menonaktifkan user');
    }
  };

  const handleDeleteAllReports = async () => {
    setDeletingAll(true);
    try {
      const { deleted } = await spktApi.deleteAllReports();
      await refresh();
      setShowDeleteAllDialog(false);
      toast.success('Semua laporan dihapus', {
        description: `${deleted} laporan dihapus dari database`,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menghapus laporan');
    } finally {
      setDeletingAll(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Admin Control Center</h1>
        <p className="text-blue-200 mt-1">Kontrol penuh sistem & override capabilities</p>
      </div>

      {loading && (
        <div className="text-center py-8 text-blue-300">Memuat data...</div>
      )}

      {!loading && (
      <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-red-900/50 to-blue-900/80 border-red-500/40 backdrop-blur">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/20">
                <Shield className="w-8 h-8 text-red-300" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Override Status</h3>
                <p className="text-sm text-blue-200">Ubah status laporan</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-900/50 to-blue-900/80 border-amber-500/40 backdrop-blur">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <RefreshCw className="w-8 h-8 text-amber-300" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Reassign Officer</h3>
                <p className="text-sm text-blue-200">Assign laporan ke petugas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-900/50 to-blue-900/80 border-purple-500/40 backdrop-blur">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <UserX className="w-8 h-8 text-purple-300" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Suspend User</h3>
                <p className="text-sm text-blue-200">Tangguhkan akun</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className={cardClass}>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-blue-400" />
            <Input
              placeholder="Cari laporan (nomor, nama, jenis kasus)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-blue-900/50 border-blue-500/50 text-white placeholder:text-blue-400 focus:border-blue-400"
            />
          </div>
        </CardContent>
      </Card>

      {/* All Reports with Admin Actions */}
      <Card className={cardClass}>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-white">Semua Laporan</CardTitle>
            <CardDescription className="text-blue-200">
              Kontrol penuh terhadap semua laporan ({total} total)
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowDeleteAllDialog(true)}
            disabled={total === 0}
            className="border-red-400/50 text-red-200 hover:bg-red-900/40 shrink-0"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Hapus Semua
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredReports.map((report) => (
              <div key={report.id} className={reportItemClass}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-white">{report.reportNumber}</h3>
                      <span className={`px-3 py-1 text-xs rounded-full border ${getStatusBadgeColor(report.status)}`}>
                        {getStatusLabel(report.status)}
                      </span>
                      {report.priority && (
                        <Badge
                          className={
                            report.priority === 'urgent'
                              ? 'bg-red-500/30 text-red-200 border border-red-400/50'
                              : report.priority === 'high'
                                ? 'bg-amber-500/30 text-amber-200 border border-amber-400/50'
                                : 'bg-blue-500/30 text-blue-200 border border-blue-400/50'
                          }
                        >
                          {report.priority.toUpperCase()}
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm text-blue-200">
                      <div>
                        <FileText className="w-3 h-3 inline mr-1 text-sky-300" />
                        {report.caseType}
                      </div>
                      <div>
                        <Users className="w-3 h-3 inline mr-1 text-cyan-300" />
                        {report.reporterName}
                      </div>
                      {report.assignedTo && (
                        <div>
                          Petugas: <span className="font-medium">{report.assignedTo}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Admin Actions */}
                <div className="flex flex-wrap gap-2 pt-3 border-t border-blue-600/50">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setViewingReport(report)}
                    className="border-blue-400/60 text-blue-100 bg-blue-800/40 hover:bg-blue-700/60"
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    Detail
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      setSelectedReport(report);
                      setOverrideStatus(report.status);
                      setShowOverrideDialog(true);
                    }}
                    className="shadow-sm"
                  >
                    <Shield className="w-3 h-3 mr-1 text-rose-300" />
                    Override
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedReport(report);
                      setReassignOfficer(report.assignedOfficerId || '');
                      setShowReassignDialog(true);
                    }}
                    className="bg-sky-500 hover:bg-sky-600 text-white border border-sky-400/50 shadow-sm [&_svg]:text-sky-100"
                  >
                    <RefreshCw className="w-3 h-3 mr-1 text-amber-300" />
                    {report.assignedTo ? 'Reassign' : 'Assign Petugas'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSuspendUser(report)}
                    className="border border-rose-500/50 bg-rose-900/30 text-rose-300 hover:bg-rose-900/50 hover:text-rose-100 hover:border-rose-400/60 shadow-sm"
                  >
                    <Ban className="w-3 h-3 mr-1 text-rose-300" />
                    Suspend User
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <SpktPagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
        </CardContent>
      </Card>

      {/* Override Status Dialog */}
      <Dialog open={showOverrideDialog} onOpenChange={setShowOverrideDialog}>
        <DialogContent className={spktDialogClass('lg')}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-300">
              <AlertTriangle className="w-5 h-5 text-amber-300" />
              Override Status Laporan
            </DialogTitle>
            <DialogDescription className="text-blue-200">
              Anda akan mengubah status laporan {selectedReport?.reportNumber}
            </DialogDescription>
          </DialogHeader>

          <Alert variant="destructive" className="bg-red-900/40 border-red-500/50 text-red-200">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>PERHATIAN:</strong> Override akan tercatat dalam audit log sistem.
              Pastikan Anda memiliki alasan yang valid.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-blue-200">Status Saat Ini</Label>
              <div className={`px-3 py-2 rounded-lg border ${getStatusBadgeColor(selectedReport?.status || 'submitted')}`}>
                {getStatusLabel(selectedReport?.status || 'submitted')}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-blue-200" htmlFor="newStatus">Status Baru *</Label>
              <Select value={overrideStatus} onValueChange={(value) => setOverrideStatus(value as ReportStatus)}>
                <SelectTrigger className="bg-blue-900/50 border-blue-500/50 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-blue-900 border-blue-500/50">
                  <SelectItem className="text-white hover:bg-blue-800" value="submitted">Dikirim</SelectItem>
                  <SelectItem className="text-white hover:bg-blue-800" value="verified">Diverifikasi</SelectItem>
                  <SelectItem className="text-white hover:bg-blue-800" value="assigned">Ditugaskan</SelectItem>
                  <SelectItem className="text-white hover:bg-blue-800" value="processing">Diproses</SelectItem>
                  <SelectItem className="text-white hover:bg-blue-800" value="completed">Selesai</SelectItem>
                  <SelectItem className="text-white hover:bg-blue-800" value="rejected">Ditolak</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-blue-200" htmlFor="reason">Alasan Override *</Label>
              <Textarea
                id="reason"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Jelaskan alasan override status..."
                rows={4}
                required
                className="bg-blue-900/50 border-blue-500/50 text-white placeholder:text-blue-400"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button onClick={handleOverrideStatus} variant="destructive" className="flex-1">
                <Shield className="w-4 h-4 mr-2 text-rose-200" />
                Konfirmasi Override
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowOverrideDialog(false)}
                className="border-blue-500/50 text-blue-200 hover:bg-blue-800/50 hover:text-white"
              >
                Batal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reassign Officer Dialog */}
      <Dialog open={showReassignDialog} onOpenChange={setShowReassignDialog}>
        <DialogContent className={spktDialogClass('lg')}>
          <DialogHeader>
            <DialogTitle className="text-white">
              {selectedReport?.assignedTo ? 'Tugaskan Ulang Petugas' : 'Assign Petugas'}
            </DialogTitle>
            <DialogDescription className="text-blue-200">
              Laporan {selectedReport?.reportNumber}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedReport?.assignedTo && (
              <div className="bg-blue-800/50 border border-blue-600/50 p-3 rounded-lg">
                <p className="text-sm text-blue-200">Petugas Saat Ini:</p>
                <p className="font-medium text-white">{selectedReport.assignedTo}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-blue-200" htmlFor="officer">Pilih Petugas Baru *</Label>
              <Select value={reassignOfficer} onValueChange={setReassignOfficer}>
                <SelectTrigger className="bg-blue-900/50 border-blue-500/50 text-white">
                  <SelectValue placeholder="Pilih petugas..." />
                </SelectTrigger>
                <SelectContent className="bg-blue-900 border-blue-500/50">
                  {laporanOfficers.map((officer) => (
                    <SelectItem className="text-white hover:bg-blue-800" key={officer.id} value={officer.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{officer.name}</span>
                        <div className="flex items-center gap-2 ml-4">
                          <Badge
                            className={
                              officer.status === 'available'
                                ? 'bg-green-500/30 text-green-200 border border-green-400/50 text-xs'
                                : officer.status === 'busy'
                                  ? 'bg-amber-500/30 text-amber-200 border border-amber-400/50 text-xs'
                                  : 'bg-gray-500/30 text-gray-200 border border-gray-400/50 text-xs'
                            }
                          >
                            {officer.status}
                          </Badge>
                          <span className="text-xs text-blue-300">
                            {officer.assignedCases} cases
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleReassignOfficer}
                className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
              >
                <RefreshCw className="w-4 h-4 mr-2 text-sky-200" />
                {selectedReport?.assignedTo ? 'Tugaskan Ulang' : 'Assign Petugas'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowReassignDialog(false)}
                className="border-blue-500/50 text-blue-200 hover:bg-blue-800/50 hover:text-white"
              >
                Batal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Report detail dialog */}
      <Dialog open={!!viewingReport} onOpenChange={() => setViewingReport(null)}>
        <DialogContent className={spktDialogClass('3xl')}>
          {viewingReport && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <DialogTitle className="text-2xl text-white">{viewingReport.reportNumber}</DialogTitle>
                    <DialogDescription className="mt-2 text-blue-200">
                      Dibuat pada {new Date(viewingReport.createdAt).toLocaleString('id-ID')}
                    </DialogDescription>
                  </div>
                  <span className={`px-3 py-1 text-sm rounded-full border shrink-0 ${getStatusBadgeColor(viewingReport.status)}`}>
                    {getStatusLabel(viewingReport.status)}
                  </span>
                </div>
              </DialogHeader>

              <div className="space-y-6 mt-4 max-h-[70vh] overflow-y-auto pr-1">
                <div>
                  <h3 className="font-semibold text-white mb-3">Data Pelapor</h3>
                  <div className="bg-blue-800/50 rounded-lg p-4 space-y-2 border border-blue-600/50 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-400" />
                      <span className="text-blue-200">Nama:</span>
                      <span className="font-medium text-white">{viewingReport.reporterName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-400" />
                      <span className="text-blue-200">NIK:</span>
                      <span className="font-medium text-white">{viewingReport.reporterNIK}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-blue-400" />
                      <span className="text-blue-200">Telepon:</span>
                      <span className="font-medium text-white">{viewingReport.reporterPhone}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-white mb-3">Detail Kejadian</h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-blue-200">Jenis Kasus</p>
                      <p className="font-medium text-white">{viewingReport.caseType}</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <p className="text-blue-200">Tanggal Kejadian</p>
                        <p className="font-medium text-white">
                          {new Date(viewingReport.incidentDate).toLocaleDateString('id-ID')}
                        </p>
                      </div>
                      <div>
                        <p className="text-blue-200">Prioritas</p>
                        <p className="font-medium text-white capitalize">{viewingReport.priority ?? '—'}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-blue-200">Lokasi</p>
                      <p className="font-medium text-white">{viewingReport.location}</p>
                    </div>
                    <div>
                      <p className="text-blue-200">Kronologi</p>
                      <p className="mt-1 text-white leading-relaxed">{viewingReport.description}</p>
                    </div>
                  </div>
                </div>

                {viewingReport.assignedTo && (
                  <div>
                    <h3 className="font-semibold text-white mb-3">Penugasan</h3>
                    <div className="bg-blue-800/50 rounded-lg p-4 border border-blue-600/50 text-sm space-y-1">
                      <p className="text-white">Petugas: <span className="font-medium">{viewingReport.assignedTo}</span></p>
                      {viewingReport.assignedBy && (
                        <p className="text-blue-200">Ditugaskan oleh: {viewingReport.assignedBy}</p>
                      )}
                      {viewingReport.assignedAt && (
                        <p className="text-blue-300 text-xs">
                          {new Date(viewingReport.assignedAt).toLocaleString('id-ID')}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {viewingReport.evidenceFiles && viewingReport.evidenceFiles.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-white mb-3">Bukti Pendukung</h3>
                    <div className="space-y-2">
                      {viewingReport.evidenceFiles.map((file) => (
                        <a
                          key={file}
                          href={spktApi.getFileUrl(file)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm border border-blue-500/40 rounded-lg p-2 bg-blue-900/40 text-blue-100 hover:text-cyan-200"
                        >
                          <FileText className="w-4 h-4 shrink-0" />
                          {file}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {viewingReport.notes && (
                  <div>
                    <h3 className="font-semibold text-white mb-2">Catatan</h3>
                    <p className="text-sm text-blue-100 bg-blue-800/50 p-3 rounded-lg border border-blue-600/50">
                      {viewingReport.notes}
                    </p>
                  </div>
                )}

                {viewingReport.timeline?.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-blue-400" />
                      Riwayat Status
                    </h3>
                    <div className="space-y-2">
                      {viewingReport.timeline.map((event, index) => (
                        <div key={`${event.timestamp}-${index}`} className="bg-blue-800/50 rounded-lg p-3 border border-blue-600/50 text-sm">
                          <div className="flex justify-between gap-2">
                            <p className="font-medium text-white">{event.status}</p>
                            <span className="text-xs text-blue-300 shrink-0">
                              {new Date(event.timestamp).toLocaleString('id-ID')}
                            </span>
                          </div>
                          {event.officer && <p className="text-blue-200 mt-1">Oleh: {event.officer}</p>}
                          {event.note && <p className="text-blue-300 mt-1">{event.note}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
        <DialogContent className={spktDialogClass('md')}>
          <DialogHeader>
            <DialogTitle className="text-white">Hapus Semua Laporan</DialogTitle>
            <DialogDescription className="text-blue-200">
              Yakin ingin menghapus <span className="font-medium text-white">{total}</span> laporan dari
              database? Timeline dan bukti pendukung ikut terhapus. Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className="border-blue-500/50 text-blue-200 hover:bg-blue-800/60"
              onClick={() => setShowDeleteAllDialog(false)}
              disabled={deletingAll}
            >
              Batal
            </Button>
            <Button
              type="button"
              disabled={deletingAll}
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white border-0"
              onClick={handleDeleteAllReports}
            >
              {deletingAll ? 'Menghapus...' : 'Hapus Semua'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </>
      )}
    </div>
  );
};
