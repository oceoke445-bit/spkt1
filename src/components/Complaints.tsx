import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Alert, AlertDescription } from './ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import {
  MessageSquare,
  Send,
  Search,
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  User,
  Calendar,
  Save,
  ExternalLink,
  UserPlus,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { CsiPromptButton } from './CsiPromptButton';
import { useCsiEligibility } from '@/hooks/useCsiEligibility';
import { FileUploadZone } from './FileUploadZone';
import {
  Complaint,
  ComplaintCategory,
  ComplaintStatus,
  getComplaintStatusColor,
  getComplaintStatusLabel,
} from '@/lib/types/spkt';
import { complaintCategories } from '@/lib/constants';
import { spktApi } from '@/lib/spktApi';
import { useComplaints } from '@/hooks/useComplaints';
import { useOfficers } from '@/hooks/useOfficers';
import { spktDialogClass } from '@/lib/spktDialog';
import { SpktPagination } from './SpktPagination';

export const Complaints: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isPetugasPengaduan = user?.role === 'petugas' && user.officerDivision === 'pengaduan';
  const isStaff = isAdmin || isPetugasPengaduan;
  const nikFilter = user?.role === 'user' ? user?.nik : undefined;

  const { complaints: userComplaints, loading, refresh, page, setPage, total, totalPages } = useComplaints(nikFilter);
  const { officers } = useOfficers();
  const pengaduanOfficers = officers.filter((o) => o.division === 'pengaduan');
  const [showForm, setShowForm] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [submitting, setSubmitting] = useState(false);
  const [adminStatus, setAdminStatus] = useState<ComplaintStatus>('submitted');
  const [adminResponse, setAdminResponse] = useState('');
  const [adminSaving, setAdminSaving] = useState(false);
  const [assignOfficerId, setAssignOfficerId] = useState('');
  const [assigningComplaint, setAssigningComplaint] = useState<Complaint | null>(null);
  const [quickAssignOfficerId, setQuickAssignOfficerId] = useState('');
  const [quickAssignSaving, setQuickAssignSaving] = useState(false);
  const [formData, setFormData] = useState({
    category: '' as ComplaintCategory | '',
    subject: '',
    description: '',
    files: [] as File[]
  });

  useEffect(() => {
    if (selectedComplaint) {
      setAdminStatus(selectedComplaint.status);
      setAdminResponse(selectedComplaint.response ?? '');
      setAssignOfficerId(selectedComplaint.assignedOfficerId ?? '');
    }
  }, [selectedComplaint]);

  useEffect(() => {
    if (assigningComplaint) {
      setQuickAssignOfficerId(assigningComplaint.assignedOfficerId ?? '');
    }
  }, [assigningComplaint]);

  const handleQuickAssign = async () => {
    if (!assigningComplaint || !quickAssignOfficerId) {
      toast.error('Pilih petugas terlebih dahulu');
      return;
    }

    setQuickAssignSaving(true);
    try {
      await spktApi.updateComplaint(assigningComplaint.id, {
        assignedOfficerId: quickAssignOfficerId,
        timelineNote: assigningComplaint.assignedOfficerId
          ? 'Ditugaskan ulang ke petugas'
          : 'Ditugaskan ke petugas',
      });
      await refresh();
      toast.success('Pengaduan ditugaskan ke petugas');
      setAssigningComplaint(null);
    } catch (err) {
      toast.error('Gagal menugaskan', {
        description: err instanceof Error ? err.message : 'Terjadi kesalahan',
      });
    } finally {
      setQuickAssignSaving(false);
    }
  };

  const complaintCsiDone =
    !isStaff &&
    selectedComplaint != null &&
    (selectedComplaint.status === 'resolved' || selectedComplaint.status === 'closed');

  const { eligible: complaintCsiEligible, checking: complaintCsiChecking, refresh: refreshComplaintCsi } =
    useCsiEligibility('complaint', selectedComplaint?.complaintNumber, complaintCsiDone);

  const filteredComplaints = userComplaints.filter((complaint) => {
    const matchesSearch =
      complaint.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      complaint.complaintNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (complaint.submitterName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesFilter = !isStaff || filterStatus === 'all' || complaint.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const staffStatusFilters = [
    { key: 'all', label: 'Semua' },
    { key: 'submitted', label: 'Baru' },
    { key: 'reviewing', label: 'Ditinjau' },
    { key: 'processing', label: 'Diproses' },
    { key: 'resolved', label: 'Selesai' },
    { key: 'closed', label: 'Ditutup' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category) return;

    setSubmitting(true);
    try {
      let uploadedFiles: string[] = [];
      if (formData.files.length > 0) {
        const { files } = await spktApi.uploadFiles(formData.files);
        uploadedFiles = files.map((f) => f.storedName);
      }

      const { complaint } = await spktApi.createComplaint({
        submitterUserId: user?.id,
        submitterName: user?.name || 'Pengguna',
        submitterNik: user?.nik,
        category: formData.category,
        subject: formData.subject,
        description: formData.description,
        files: uploadedFiles,
      });

      await refresh();
      toast.success('Pengaduan berhasil dikirim!', {
        description: 'Tim kami akan segera menindaklanjuti pengaduan Anda',
      });
      setShowForm(false);
      setFormData({ category: '', subject: '', description: '', files: [] });
    } catch (err) {
      toast.error('Gagal mengirim pengaduan', {
        description: err instanceof Error ? err.message : 'Terjadi kesalahan',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminSave = async () => {
    if (!selectedComplaint) return;

    setAdminSaving(true);
    try {
      const payload: Parameters<typeof spktApi.updateComplaint>[1] = {
        status: adminStatus,
        response: adminResponse.trim() || undefined,
      };

      if (isAdmin && assignOfficerId && assignOfficerId !== selectedComplaint.assignedOfficerId) {
        payload.assignedOfficerId = assignOfficerId;
        payload.timelineNote = selectedComplaint.assignedOfficerId
          ? 'Ditugaskan ulang ke petugas'
          : 'Ditugaskan ke petugas';
      }

      const { complaint } = await spktApi.updateComplaint(selectedComplaint.id, payload);
      await refresh();
      setSelectedComplaint(complaint);
      toast.success('Pengaduan diperbarui');
    } catch (err) {
      toast.error('Gagal memperbarui pengaduan', {
        description: err instanceof Error ? err.message : 'Terjadi kesalahan',
      });
    } finally {
      setAdminSaving(false);
    }
  };

  const stats = isStaff
    ? [
        {
          label: 'Total Pengaduan',
          value: userComplaints.length,
          icon: <MessageSquare className="w-5 h-5 text-sky-300" />,
          color: 'bg-sky-500/20',
        },
        {
          label: 'Baru',
          value: userComplaints.filter((c) => c.status === 'submitted').length,
          icon: <AlertCircle className="w-5 h-5 text-yellow-300" />,
          color: 'bg-yellow-500/20',
        },
        {
          label: 'Ditinjau / Diproses',
          value: userComplaints.filter((c) => c.status === 'reviewing' || c.status === 'processing').length,
          icon: <Clock className="w-5 h-5 text-amber-300" />,
          color: 'bg-amber-500/20',
        },
        {
          label: 'Selesai',
          value: userComplaints.filter((c) => c.status === 'resolved' || c.status === 'closed').length,
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-300" />,
          color: 'bg-emerald-500/20',
        },
      ]
    : [
        {
          label: 'Total Pengaduan',
          value: userComplaints.length,
          icon: <MessageSquare className="w-5 h-5 text-sky-300" />,
          color: 'bg-sky-500/20',
        },
        {
          label: 'Sedang Diproses',
          value: userComplaints.filter((c) => c.status === 'processing' || c.status === 'reviewing').length,
          icon: <Clock className="w-5 h-5 text-amber-300" />,
          color: 'bg-amber-500/20',
        },
        {
          label: 'Selesai',
          value: userComplaints.filter((c) => c.status === 'resolved').length,
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-300" />,
          color: 'bg-emerald-500/20',
        },
      ];

  return (
    <>
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Pengaduan</h1>
          <p className="text-blue-200 mt-1">
            {isStaff
              ? isAdmin
                ? 'Kelola dan assign pengaduan masyarakat'
                : 'Proses pengaduan yang ditugaskan kepada Anda'
              : 'Sampaikan keluhan dan saran Anda'}
          </p>
        </div>
        {!isStaff && (
        <Button
          onClick={() => setShowForm(true)}
          className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-md [&_svg]:text-sky-200"
        >
          <Send className="w-4 h-4 mr-2" />
          Buat Pengaduan
        </Button>
        )}
      </div>

      {/* Stats */}
      <div className={`grid grid-cols-1 gap-4 ${isStaff ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3'}`}>
        {stats.map((stat, index) => (
          <Card key={index} className="bg-gradient-to-br from-blue-900/80 to-blue-800/80 border-blue-500/50 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-200 mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold text-white">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  {stat.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <Card className="bg-gradient-to-br from-blue-900/80 to-blue-800/80 border-blue-500/50 backdrop-blur">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-blue-400" />
              <Input
                placeholder={isStaff ? 'Cari nomor, subjek, atau nama pengadu...' : 'Cari pengaduan...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-blue-900/50 border-blue-500/50 text-white placeholder:text-blue-400 focus:border-blue-400"
              />
            </div>
            {isStaff && (
              <div className="flex flex-wrap gap-2">
                {staffStatusFilters.map((item) => (
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
            )}
          </div>
        </CardContent>
      </Card>

      {/* Complaint List */}
      <Card className="bg-gradient-to-br from-blue-900/80 to-blue-800/80 border-blue-500/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-white">{isStaff ? (isAdmin ? 'Semua Pengaduan' : 'Pengaduan Ditugaskan') : 'Daftar Pengaduan'}</CardTitle>
          <CardDescription className="text-blue-200">
            {isStaff
              ? `Menampilkan ${filteredComplaints.length} dari ${total} pengaduan`
              : 'Riwayat pengaduan yang telah diajukan'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredComplaints.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-16 h-16 text-blue-200 mx-auto mb-4" />
              <p className="text-blue-400 mb-4">
                {isStaff ? 'Tidak ada pengaduan pada filter ini' : 'Belum ada pengaduan'}
              </p>
              {!isStaff && (
              <Button
                onClick={() => setShowForm(true)}
                variant="outline"
                className="border-blue-500/50 text-blue-300 hover:bg-blue-800/50 hover:text-blue-100"
              >
                Buat Pengaduan Pertama
              </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredComplaints.map((complaint) => (
                <div
                  key={complaint.id}
                  className={`border border-blue-600/50 rounded-xl p-4 hover:shadow-md hover:border-blue-500/50 transition-all bg-gradient-to-r from-blue-800/60 to-blue-700/60 backdrop-blur ${!isAdmin ? 'cursor-pointer' : ''}`}
                  onClick={!isAdmin ? () => setSelectedComplaint(complaint) : undefined}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-white">{complaint.complaintNumber}</h3>
                      <p className="text-sm text-blue-200 mt-1">{complaint.subject}</p>
                    </div>
                    <span className={`px-3 py-1 text-xs rounded-full border ${getComplaintStatusColor(complaint.status)}`}>
                      {getComplaintStatusLabel(complaint.status)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-blue-300">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-cyan-300" />
                      {new Date(complaint.createdAt).toLocaleDateString('id-ID')}
                    </span>
                    {isStaff && complaint.submitterName && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-cyan-300" />
                        {complaint.submitterName}
                      </span>
                    )}
                    <Badge className="bg-blue-500/30 text-blue-200 border-blue-400/50">
                      {complaintCategories.find(c => c.value === complaint.category)?.label}
                    </Badge>
                    {isStaff && complaint.assignedTo && (
                      <span className="flex items-center gap-1 text-cyan-300">
                        <UserPlus className="w-3 h-3" />
                        {complaint.assignedTo}
                      </span>
                    )}
                  </div>
                  {complaint.status === 'resolved' && (
                    <div className="mt-3 pt-3 border-t border-blue-600/50">
                      <p className="text-xs text-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        Pengaduan telah ditanggapi
                      </p>
                    </div>
                  )}
                  {isAdmin && (
                    <div className="mt-3 pt-3 border-t border-blue-600/50 flex flex-wrap justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-blue-400/60 text-blue-100 bg-blue-800/40 hover:bg-blue-700/60"
                        onClick={() => setSelectedComplaint(complaint)}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Detail
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-blue-400/60 text-blue-100 bg-blue-800/40 hover:bg-blue-700/60"
                        onClick={() => setAssigningComplaint(complaint)}
                      >
                        <UserPlus className="w-3 h-3 mr-1" />
                        {complaint.assignedTo ? 'Reassign' : 'Assign Petugas'}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <SpktPagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
        </CardContent>
      </Card>

      {/* Create Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className={spktDialogClass('2xl')}>
          <DialogHeader>
            <DialogTitle>Buat Pengaduan Baru</DialogTitle>
            <DialogDescription>
              Sampaikan keluhan atau saran Anda terkait layanan SPKT
            </DialogDescription>
          </DialogHeader>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Pengaduan akan ditanggapi dalam waktu maksimal 3x24 jam pada hari kerja.
            </AlertDescription>
          </Alert>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-blue-200" htmlFor="category">Kategori Pengaduan *</Label>
              <Select
                value={formData.category}
                onValueChange={(value: ComplaintCategory) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {complaintCategories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-blue-200" htmlFor="subject">Subjek Pengaduan *</Label>
              <Input className="bg-blue-900/50 border-blue-500/50 text-white placeholder:text-blue-400"
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Ringkasan singkat pengaduan Anda"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-blue-200" htmlFor="description">Detail Pengaduan *</Label>
              <Textarea className="bg-blue-900/50 border-blue-500/50 text-white placeholder:text-blue-400 min-h-[100px] sm:min-h-[150px]"
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Jelaskan secara detail pengaduan Anda..."
                rows={4}
                required
              />
              <p className="text-xs text-blue-300">
                Berikan informasi selengkap mungkin agar kami dapat menangani dengan baik
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-blue-200">Lampiran (Opsional)</Label>
              <FileUploadZone
                files={formData.files}
                onFilesChange={(files) => setFormData((prev) => ({ ...prev, files }))}
                hint="Upload bukti pendukung"
                subHint="PNG, JPG, PDF maksimal 5MB"
                maxSizeMb={5}
              />
            </div>

            <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row">
              <Button
                type="submit"
                className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-md"
              >
                <Send className="w-4 h-4 mr-2" />
                Kirim Pengaduan
              </Button>
              <Button
                type="button"
                onClick={() => setShowForm(false)}
                className="sm:flex-none bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-md"
              >
                Batal
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!selectedComplaint} onOpenChange={() => setSelectedComplaint(null)}>
        <DialogContent className={spktDialogClass('3xl')}>
          {selectedComplaint && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <DialogTitle className="text-2xl text-white">{selectedComplaint.complaintNumber}</DialogTitle>
                    <DialogDescription className="mt-2 text-blue-200">
                      Dibuat pada {new Date(selectedComplaint.createdAt).toLocaleDateString('id-ID', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </DialogDescription>
                  </div>
                  <span className={`px-3 py-1 text-sm rounded-full border ${getComplaintStatusColor(selectedComplaint.status)}`}>
                    {getComplaintStatusLabel(selectedComplaint.status)}
                  </span>
                </div>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Detail */}
                <div>
                  <h3 className="font-semibold text-white mb-3">Detail Pengaduan</h3>
                  <div className="bg-blue-800/50 border border-blue-600/50 rounded-lg p-4 space-y-3">
                    <div>
                      <span className="text-sm text-blue-200">Kategori</span>
                      <p className="font-medium text-white">
                        {complaintCategories.find(c => c.value === selectedComplaint.category)?.label}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-blue-200">Subjek</span>
                      <p className="font-medium text-white">{selectedComplaint.subject}</p>
                    </div>
                    <div>
                      <span className="text-sm text-blue-200">Deskripsi</span>
                      <p className="text-white mt-1 leading-relaxed">{selectedComplaint.description}</p>
                    </div>
                  </div>
                </div>

                {selectedComplaint.files && selectedComplaint.files.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-white mb-3">Lampiran</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedComplaint.files.map((file) => (
                        <a
                          key={file}
                          href={spktApi.getFileUrl(file)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="border border-blue-500/40 rounded-lg p-3 flex items-center gap-2 bg-blue-900/40 text-blue-100 hover:text-cyan-200"
                        >
                          <FileText className="w-4 h-4 text-blue-200 shrink-0" />
                          <span className="text-sm truncate">{file}</span>
                          <ExternalLink className="w-3 h-3 ml-auto shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {selectedComplaint.timeline && selectedComplaint.timeline.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-white mb-3">Riwayat Status</h3>
                    <div className="space-y-3">
                      {selectedComplaint.timeline.map((event, index) => (
                        <div key={`${event.timestamp}-${index}`} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className="w-3 h-3 rounded-full bg-sky-400 mt-1" />
                            {index < selectedComplaint.timeline.length - 1 && (
                              <div className="w-0.5 flex-1 bg-blue-600/50" />
                            )}
                          </div>
                          <div className="pb-3">
                            <p className="font-medium text-white">{event.status}</p>
                            <p className="text-xs text-blue-300">
                              {new Date(event.timestamp).toLocaleString('id-ID')}
                              {event.officer ? ` · ${event.officer}` : ''}
                            </p>
                            {event.note && <p className="text-sm text-blue-200 mt-1">{event.note}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Admin response panel */}
                {isStaff && (
                  <div className="border border-amber-500/40 rounded-lg p-4 bg-amber-900/20 space-y-4">
                    <h3 className="font-semibold text-amber-200">
                      {isAdmin ? 'Assign & Tanggapan' : 'Tanggapan Petugas'}
                    </h3>
                    {isAdmin && (
                      <div className="space-y-2">
                        <Label className="text-blue-200">Assign Petugas (Divisi Pengaduan)</Label>
                        <Select value={assignOfficerId || 'none'} onValueChange={(v) => setAssignOfficerId(v === 'none' ? '' : v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih petugas..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Belum ditugaskan</SelectItem>
                            {pengaduanOfficers.map((officer) => (
                              <SelectItem key={officer.id} value={officer.id}>
                                {officer.name} ({officer.assignedCases} tugas aktif)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedComplaint.assignedTo && (
                          <p className="text-xs text-blue-300">Petugas saat ini: {selectedComplaint.assignedTo}</p>
                        )}
                      </div>
                    )}
                    {(isPetugasPengaduan || (isAdmin && selectedComplaint.assignedOfficerId)) && (
                    <>
                    <div className="space-y-2">
                      <Label className="text-blue-200">Status</Label>
                      <Select value={adminStatus} onValueChange={(v: ComplaintStatus) => setAdminStatus(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="submitted">Diajukan</SelectItem>
                          <SelectItem value="reviewing">Ditinjau</SelectItem>
                          <SelectItem value="processing">Diproses</SelectItem>
                          <SelectItem value="resolved">Selesai</SelectItem>
                          <SelectItem value="closed">Ditutup</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-blue-200">Tanggapan</Label>
                      <Textarea
                        value={adminResponse}
                        onChange={(e) => setAdminResponse(e.target.value)}
                        placeholder="Tulis tanggapan untuk pengadu..."
                        rows={4}
                        className="bg-blue-900/50 border-blue-500/50 text-white placeholder:text-blue-400"
                      />
                    </div>
                    <Button
                      onClick={handleAdminSave}
                      disabled={adminSaving}
                      className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Simpan
                    </Button>
                    </>
                    )}
                    {isAdmin && !selectedComplaint.assignedOfficerId && assignOfficerId && (
                      <Button
                        onClick={handleAdminSave}
                        disabled={adminSaving}
                        className="w-full bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Assign Petugas
                      </Button>
                    )}
                  </div>
                )}

                {/* Response (user view) */}
                {selectedComplaint.response && (
                  <div className="bg-emerald-900/40 border border-emerald-500/40 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-6 h-6 text-emerald-400 mt-1 shrink-0" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-emerald-200 mb-1">Tanggapan</h4>
                        <p className="text-sm text-emerald-100 mb-2">{selectedComplaint.response}</p>
                        {selectedComplaint.responseDate && (
                          <p className="text-xs text-emerald-300/80">
                            Ditanggapi pada {new Date(selectedComplaint.responseDate).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {!selectedComplaint.response && selectedComplaint.status !== 'closed' && (
                  <Alert>
                    <Clock className="h-4 w-4" />
                    <AlertDescription>
                      Pengaduan Anda sedang ditinjau oleh tim kami. Anda akan menerima notifikasi
                      saat ada update.
                    </AlertDescription>
                  </Alert>
                )}

                {!isStaff && complaintCsiDone && (
                  <CsiPromptButton
                    serviceType="complaint"
                    serviceLabel="Pengaduan"
                    referenceId={selectedComplaint.complaintNumber}
                    eligible={complaintCsiEligible}
                    checking={complaintCsiChecking}
                    onSubmitted={refreshComplaintCsi}
                  />
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Quick assign dialog (admin) */}
      <Dialog open={!!assigningComplaint} onOpenChange={() => setAssigningComplaint(null)}>
        <DialogContent className={spktDialogClass('md')}>
          {assigningComplaint && (
            <>
              <DialogHeader>
                <DialogTitle className="text-white">
                  {assigningComplaint.assignedTo ? 'Tugaskan Ulang Petugas' : 'Assign Petugas'}
                </DialogTitle>
                <DialogDescription className="text-blue-200">
                  {assigningComplaint.complaintNumber} · {assigningComplaint.subject}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {assigningComplaint.assignedTo && (
                  <div className="bg-blue-800/50 border border-blue-600/50 p-3 rounded-lg">
                    <p className="text-sm text-blue-200">Petugas saat ini:</p>
                    <p className="font-medium text-white">{assigningComplaint.assignedTo}</p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="text-blue-200">Pilih Petugas (Divisi Pengaduan)</Label>
                  <Select value={quickAssignOfficerId} onValueChange={setQuickAssignOfficerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih petugas..." />
                    </SelectTrigger>
                    <SelectContent>
                      {pengaduanOfficers.map((officer) => (
                        <SelectItem key={officer.id} value={officer.id}>
                          {officer.name} ({officer.assignedCases} tugas aktif)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {pengaduanOfficers.length === 0 && (
                    <p className="text-xs text-amber-300">Belum ada petugas divisi pengaduan. Tambahkan di Kelola Petugas.</p>
                  )}
                </div>
                <Button
                  onClick={handleQuickAssign}
                  disabled={quickAssignSaving || !quickAssignOfficerId}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  {assigningComplaint.assignedTo ? 'Tugaskan Ulang' : 'Assign Petugas'}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
};
