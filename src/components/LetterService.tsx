import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { letterTypes, getStatusBadgeColor, getStatusLabel } from '@/lib/data/mockData';
import { spktApi } from '@/lib/spktApi';
import { spktDialogClass } from '@/lib/spktDialog';
import { useLetters } from '@/hooks/useLetters';
import { SpktPagination } from './SpktPagination';
import { CsiPromptButton } from './CsiPromptButton';
import { useCsiEligibility } from '@/hooks/useCsiEligibility';
import { FileUploadZone } from './FileUploadZone';
import { DatePickerField } from '@/components/DatePickerField';
import { Mail, FileText, CheckCircle2, ArrowLeft, User, Save, Eye, Clock, Download, UserPlus } from 'lucide-react';
import { IconBadge, letterTypeIcons } from './iconStyles';
import { toast } from 'sonner';
import { useOfficers } from '@/hooks/useOfficers';
import type { LetterRequest, LetterStatus } from '@/lib/types/spkt';

type LetterType = typeof letterTypes[number];

const LETTER_STATUS_OPTIONS: LetterStatus[] = [
  'submitted',
  'verified',
  'ready',
  'completed',
  'rejected',
];

export const LetterService: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isPetugasSurat = user?.role === 'petugas' && user.officerDivision === 'surat';
  const isStaffQueue = isAdmin || isPetugasSurat;
  const nikFilter = user?.role === 'user' ? user?.nik : undefined;

  const [selectedLetter, setSelectedLetter] = useState<LetterType | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [viewingLetter, setViewingLetter] = useState<LetterRequest | null>(null);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    nik: user?.nik || '',
    phone: user?.phone || '',
    purpose: '',
    pickupDate: '',
    documents: [] as File[]
  });

  const { letters: userLetters, refresh: refreshLetters, page, setPage, total, totalPages } = useLetters(nikFilter);
  const [submitting, setSubmitting] = useState(false);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [existingAttachments, setExistingAttachments] = useState<string[]>([]);
  const [managingLetter, setManagingLetter] = useState<LetterRequest | null>(null);
  const [staffStatus, setStaffStatus] = useState<LetterStatus>('submitted');
  const [staffPickupDate, setStaffPickupDate] = useState('');
  const [staffRejectionReason, setStaffRejectionReason] = useState('');
  const [staffSaving, setStaffSaving] = useState(false);
  const [assignOfficerId, setAssignOfficerId] = useState('');
  const [assigningLetter, setAssigningLetter] = useState<LetterRequest | null>(null);
  const [quickAssignOfficerId, setQuickAssignOfficerId] = useState('');
  const [quickAssignSaving, setQuickAssignSaving] = useState(false);
  const { officers } = useOfficers();
  const suratOfficers = officers.filter((o) => o.division === 'surat');

  const { eligible: letterCsiEligible, checking: letterCsiChecking, refresh: refreshLetterCsi } =
    useCsiEligibility(
      'letter',
      viewingLetter?.requestNumber,
      !isStaffQueue && (viewingLetter?.status === 'ready' || viewingLetter?.status === 'completed'),
    );

  useEffect(() => {
    if (managingLetter) {
      setStaffStatus(managingLetter.status);
      setStaffPickupDate(managingLetter.pickupDate ?? '');
      setStaffRejectionReason(managingLetter.rejectionReason ?? '');
      setAssignOfficerId(managingLetter.assignedOfficerId ?? '');
    }
  }, [managingLetter]);

  useEffect(() => {
    if (assigningLetter) {
      setQuickAssignOfficerId(assigningLetter.assignedOfficerId ?? '');
    }
  }, [assigningLetter]);

  const handleQuickAssign = async () => {
    if (!assigningLetter || !quickAssignOfficerId) {
      toast.error('Pilih petugas terlebih dahulu');
      return;
    }

    setQuickAssignSaving(true);
    try {
      await spktApi.updateLetter(assigningLetter.id, {
        assignedOfficerId: quickAssignOfficerId,
        timelineNote: assigningLetter.assignedOfficerId
          ? 'Ditugaskan ulang ke petugas'
          : 'Ditugaskan ke petugas',
      });
      await refreshLetters();
      toast.success('Pengajuan ditugaskan ke petugas');
      setAssigningLetter(null);
    } catch (err) {
      toast.error('Gagal menugaskan', {
        description: err instanceof Error ? err.message : 'Terjadi kesalahan',
      });
    } finally {
      setQuickAssignSaving(false);
    }
  };

  const handleSelectLetter = (letter: LetterType) => {
    setSelectedLetter(letter);
    setEditingDraftId(null);
    setExistingAttachments([]);
    setShowForm(true);
  };

  const continueDraft = (letter: LetterRequest) => {
    const type = letterTypes.find((t) => letter.letterType.includes(t.name) || t.name === letter.letterType);
    if (type) setSelectedLetter(type);
    setEditingDraftId(letter.id);
    setExistingAttachments(letter.attachmentFiles ?? []);
    setFormData({
      name: letter.requesterName,
      nik: letter.requesterNIK,
      phone: letter.requesterPhone ?? user?.phone ?? '',
      purpose: letter.purpose,
      pickupDate: letter.pickupDate ?? '',
      documents: [],
    });
    setShowForm(true);
  };

  const handleSaveDraft = async () => {
    if (!selectedLetter) return;
    try {
      let attachmentFiles: string[] = [...existingAttachments];
      if (formData.documents.length > 0) {
        const { files } = await spktApi.uploadFiles(formData.documents);
        attachmentFiles = [...attachmentFiles, ...files.map((f) => f.storedName)];
      }

      if (editingDraftId) {
        await spktApi.updateLetter(editingDraftId, {
          purpose: formData.purpose || 'Draft surat',
          pickupDate: formData.pickupDate,
          requesterPhone: formData.phone,
          attachmentFiles,
        });
      } else {
        const { letter } = await spktApi.createLetter({
          requesterUserId: user?.id,
          requesterName: formData.name,
          requesterNIK: formData.nik,
          requesterPhone: formData.phone,
          letterTypeId: selectedLetter.id,
          letterTypeName: selectedLetter.name,
          purpose: formData.purpose || 'Draft surat',
          pickupDate: formData.pickupDate || undefined,
          attachmentFiles,
          status: 'draft',
        });
        setEditingDraftId(letter.id);
      }
      await refreshLetters();
      toast.success('Draft tersimpan');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan draft');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLetter) return;

    setSubmitting(true);
    try {
      let attachmentFiles: string[] = [...existingAttachments];
      if (formData.documents.length > 0) {
        const { files } = await spktApi.uploadFiles(formData.documents);
        attachmentFiles = [...attachmentFiles, ...files.map((f) => f.storedName)];
      }

      if (editingDraftId) {
        await spktApi.updateLetter(editingDraftId, {
          purpose: formData.purpose,
          pickupDate: formData.pickupDate,
          requesterPhone: formData.phone,
          attachmentFiles,
          submit: true,
          letterTypeId: selectedLetter.id,
          letterTypeName: selectedLetter.name,
        });
      } else {
        await spktApi.createLetter({
          requesterUserId: user?.id,
          requesterName: formData.name,
          requesterNIK: formData.nik,
          requesterPhone: formData.phone,
          letterTypeId: selectedLetter.id,
          letterTypeName: selectedLetter.name,
          purpose: formData.purpose,
          pickupDate: formData.pickupDate || undefined,
          attachmentFiles,
        });
      }

      await refreshLetters();
      toast.success('Pengajuan berhasil!', {
        description: 'Pengajuan surat Anda sedang diproses',
      });
      setShowForm(false);
      setSelectedLetter(null);
      setEditingDraftId(null);
      setExistingAttachments([]);
      setFormData((prev) => ({ ...prev, purpose: '', pickupDate: '', documents: [] }));
    } catch (err) {
      toast.error('Gagal mengajukan surat', {
        description: err instanceof Error ? err.message : 'Terjadi kesalahan',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStaffSave = async () => {
    if (!managingLetter) return;

    setStaffSaving(true);
    try {
      const payload: Parameters<typeof spktApi.updateLetter>[1] = {
        status: staffStatus,
        pickupDate: staffStatus === 'ready' ? staffPickupDate || null : managingLetter.pickupDate ?? null,
        rejectionReason: staffStatus === 'rejected' ? staffRejectionReason : null,
      };

      if (isAdmin && assignOfficerId && assignOfficerId !== managingLetter.assignedOfficerId) {
        payload.assignedOfficerId = assignOfficerId;
        payload.timelineNote = managingLetter.assignedOfficerId
          ? 'Ditugaskan ulang ke petugas'
          : 'Ditugaskan ke petugas';
      }

      const { letter } = await spktApi.updateLetter(managingLetter.id, payload);
      await refreshLetters();
      setManagingLetter(letter);
      toast.success(isAdmin && assignOfficerId !== managingLetter.assignedOfficerId ? 'Penugasan disimpan' : 'Status pengajuan diperbarui');
    } catch (err) {
      toast.error('Gagal memperbarui status', {
        description: err instanceof Error ? err.message : 'Terjadi kesalahan',
      });
    } finally {
      setStaffSaving(false);
    }
  };

  return (
    <>
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Layanan Surat</h1>
        <p className="text-blue-200 mt-1">
          {isStaffQueue
            ? isAdmin
              ? 'Kelola dan assign pengajuan surat masyarakat'
              : 'Proses pengajuan surat yang ditugaskan kepada Anda'
            : 'Ajukan berbagai surat keterangan'}
        </p>
      </div>

      {/* Staff queue */}
      {isStaffQueue && !showForm && (
        <Card className="bg-gradient-to-br from-blue-900/80 to-blue-800/80 border-blue-500/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">
              {isAdmin ? 'Antrian Pengajuan Surat' : 'Pengajuan Ditugaskan'}
            </CardTitle>
            <CardDescription className="text-blue-200">
              {isAdmin
                ? 'Assign petugas divisi surat lalu verifikasi pengajuan'
                : 'Verifikasi dokumen, tandai siap diambil, dan selesaikan pengajuan'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {userLetters.length === 0 ? (
              <div className="text-center py-8">
                <Mail className="w-12 h-12 mx-auto mb-3 text-blue-500/30" />
                <p className="text-blue-300">Belum ada pengajuan surat</p>
              </div>
            ) : (
              <div className="space-y-3">
                {userLetters.map((letter) => (
                  <div
                    key={letter.id}
                    className="border border-blue-600/50 rounded-xl p-4 hover:bg-blue-700/30 hover:border-blue-400 transition-all bg-gradient-to-r from-blue-800/60 to-blue-700/60 backdrop-blur"
                  >
                    <div className="flex items-start justify-between mb-2 gap-3">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-white">{letter.requestNumber}</h4>
                        <p className="text-sm text-blue-200">{letter.letterType}</p>
                        <p className="text-xs text-blue-300 mt-1 flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {letter.requesterName} · NIK {letter.requesterNIK}
                        </p>
                      </div>
                      <span className={`px-3 py-1 text-xs rounded-full border shrink-0 ${getStatusBadgeColor(letter.status)}`}>
                        {getStatusLabel(letter.status)}
                      </span>
                    </div>
                    <p className="text-sm text-blue-200 truncate mb-3">Keperluan: {letter.purpose}</p>
                    <div className="pt-3 border-t border-blue-600/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <p className="text-xs text-blue-300">
                        {letter.assignedTo
                          ? `Petugas: ${letter.assignedTo}`
                          : letter.attachmentFiles?.length
                            ? `${letter.attachmentFiles.length} dokumen dilampirkan`
                            : 'Belum ditugaskan'}
                      </p>
                      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full sm:w-auto border-blue-400/60 text-blue-100 bg-blue-800/40 hover:bg-blue-700/60"
                          onClick={() => setViewingLetter(letter)}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Detail
                        </Button>
                        {isAdmin && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full sm:w-auto border-blue-400/60 text-blue-100 bg-blue-800/40 hover:bg-blue-700/60"
                            onClick={() => setAssigningLetter(letter)}
                          >
                            <UserPlus className="w-3 h-3 mr-1" />
                            {letter.assignedTo ? 'Reassign' : 'Assign Petugas'}
                          </Button>
                        )}
                        {(isPetugasSurat || isAdmin) && (
                        <Button
                          size="sm"
                          className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-md"
                          onClick={() => setManagingLetter(letter)}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          {isAdmin ? 'Proses' : 'Review'}
                        </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <SpktPagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
          </CardContent>
        </Card>
      )}

      {/* Letter Cards — user only */}
      {user?.role === 'user' && !showForm && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {letterTypes.map((letter) => {
              const iconConfig = letterTypeIcons[letter.id];
              const LetterIcon = iconConfig?.icon;
              return (
              <Card
                key={letter.id}
                className="cursor-pointer hover:shadow-lg transition-all border-2 border-blue-600/50 hover:border-blue-400 bg-gradient-to-b from-blue-900/80 to-blue-800/80 backdrop-blur"
                onClick={() => handleSelectLetter(letter)}
              >
                <CardContent className="p-6 text-center">
                  {LetterIcon && (
                    <div className="mb-4 flex justify-center">
                      <IconBadge icon={LetterIcon} wrap={iconConfig.wrap} color={iconConfig.color} size="lg" />
                    </div>
                  )}
                  <h3 className="font-semibold text-white mb-2">{letter.name}</h3>
                  <p className="text-sm text-blue-200 mb-4">{letter.description}</p>
                  <Button className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-md [&_svg]:text-sky-200">
                    <Mail className="w-4 h-4 mr-2" />
                    Ajukan Sekarang
                  </Button>
                </CardContent>
              </Card>
              );
            })}
          </div>

          {/* My Letter Requests */}
          <Card className="bg-gradient-to-br from-blue-900/80 to-blue-800/80 border-blue-500/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-white">Pengajuan Saya</CardTitle>
              <CardDescription className="text-blue-200">Riwayat pengajuan surat</CardDescription>
            </CardHeader>
            <CardContent>
              {userLetters.length === 0 ? (
                <div className="text-center py-8">
                  <Mail className="w-12 h-12 mx-auto mb-3 text-blue-500/30" />
                  <p className="text-blue-300">Belum ada pengajuan surat</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {userLetters.map((letter) => (
                    <div
                      key={letter.id}
                      className="border border-blue-600/50 rounded-xl p-4 hover:bg-blue-700/30 hover:border-blue-400 transition-all bg-gradient-to-r from-blue-800/60 to-blue-700/60 backdrop-blur cursor-pointer"
                      onClick={() => setViewingLetter(letter)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-medium text-white">{letter.requestNumber}</h4>
                          <p className="text-sm text-blue-200">{letter.letterType}</p>
                        </div>
                        <span className={`px-3 py-1 text-xs rounded-full border ${getStatusBadgeColor(letter.status)}`}>
                          {getStatusLabel(letter.status)}
                        </span>
                      </div>
                      <p className="text-sm text-blue-200">Keperluan: {letter.purpose}</p>
                      <p className="text-xs text-blue-300 mt-1">
                        {letter.status === 'draft' ? 'Draft' : 'Diajukan'}: {new Date(letter.createdAt).toLocaleDateString('id-ID')}
                      </p>
                      <div className="pt-3 border-t border-blue-600/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-2">
                        {letter.status === 'draft' ? (
                          <Button size="sm" onClick={(e) => { e.stopPropagation(); continueDraft(letter); }} className="bg-amber-500 hover:bg-amber-600">
                            Lanjutkan Draft
                          </Button>
                        ) : (
                          <p className="text-xs text-blue-300">Klik untuk detail & timeline</p>
                        )}
                        {letter.pickupDate && letter.status === 'ready' && (
                          <div className="mt-3 p-3 bg-green-900/50 border border-green-500/50 rounded-lg backdrop-blur">
                            <p className="text-green-100 font-medium text-sm flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-green-400" />
                              Siap diambil pada: {new Date(letter.pickupDate).toLocaleDateString('id-ID', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                              })}
                            </p>
                            <p className="text-xs text-green-200 mt-1">
                              Bawa KTP asli dan fotokopi saat pengambilan
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <SpktPagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
            </CardContent>
          </Card>
        </>
      )}

      {/* Letter Form */}
      {showForm && selectedLetter && (
        <Card className="bg-gradient-to-br from-blue-900/80 to-blue-800/80 border-blue-500/50 backdrop-blur">
          <CardHeader>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowForm(false);
                setSelectedLetter(null);
              }}
              className="mb-2 -ml-2 text-blue-300 hover:bg-blue-700/50 hover:text-blue-100"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali
            </Button>
            <CardTitle className="text-white">Pengajuan {selectedLetter.name}</CardTitle>
            <CardDescription className="text-blue-200">{selectedLetter.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Data */}
              <div className="space-y-4">
                <h3 className="font-semibold text-white">Data Diri</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-blue-200">Nama Lengkap *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="bg-blue-900/50 border-blue-500/50 text-white placeholder:text-blue-400"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nik" className="text-blue-200">NIK *</Label>
                    <Input
                      id="nik"
                      value={formData.nik}
                      onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
                      className="bg-blue-900/50 border-blue-500/50 text-white placeholder:text-blue-400"
                      maxLength={16}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-blue-200">Nomor Telepon *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="bg-blue-900/50 border-blue-500/50 text-white placeholder:text-blue-400"
                    required
                  />
                </div>
              </div>

              {/* Letter Details */}
              <div className="space-y-4">
                <h3 className="font-semibold text-white">Detail Pengajuan</h3>
                <div className="space-y-2">
                  <Label htmlFor="purpose" className="text-blue-200">Keperluan *</Label>
                  <Textarea
                    id="purpose"
                    value={formData.purpose}
                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                    className="bg-blue-900/50 border-blue-500/50 text-white placeholder:text-blue-400"
                    placeholder="Jelaskan keperluan pengajuan surat..."
                    rows={4}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pickupDate" className="text-blue-200">Tanggal Pengambilan (Estimasi)</Label>
                  <DatePickerField
                    id="pickupDate"
                    value={formData.pickupDate}
                    onChange={(v) => setFormData({ ...formData, pickupDate: v })}
                    placeholder="Pilih tanggal estimasi"
                    min={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                  />
                  <p className="text-xs text-blue-300">
                    Proses pengajuan memerlukan minimal 7 hari kerja
                  </p>
                </div>
              </div>

              {/* Document Upload */}
              <div className="space-y-4">
                <h3 className="font-semibold text-white">Dokumen Pendukung</h3>
                <FileUploadZone
                  files={formData.documents}
                  onFilesChange={(documents) => setFormData((prev) => ({ ...prev, documents }))}
                  existingStoredFiles={existingAttachments}
                  onExistingFilesChange={setExistingAttachments}
                  hint="Upload KTP, KK, atau dokumen lainnya"
                  subHint="PDF atau gambar, maksimal 5MB"
                  maxSizeMb={5}
                />
              </div>

              {/* Requirements Info */}
              <div className="bg-blue-900/50 border border-blue-500/50 rounded-lg p-4 backdrop-blur">
                <h4 className="font-medium text-white mb-2">Persyaratan:</h4>
                <ul className="text-sm text-blue-100 space-y-1 list-disc list-inside">
                  <li>Fotokopi KTP yang masih berlaku</li>
                  <li>Fotokopi Kartu Keluarga</li>
                  {selectedLetter.id === 'skck' && <li>Pas foto 4x6 (2 lembar)</li>}
                  {selectedLetter.id === 'kehilangan' && <li>Surat keterangan RT/RW</li>}
                  {selectedLetter.id === 'keramaian' && <li>Proposal kegiatan</li>}
                </ul>
              </div>

              {/* Submit */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  type="submit"
                  disabled={submitting}
                  size="lg"
                  className="w-full sm:flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-md [&_svg]:text-sky-200"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Ajukan Permohonan
                </Button>
                {user?.role === 'user' && (
                  <Button type="button" size="lg" variant="outline" onClick={handleSaveDraft} className="border-blue-400/50 text-blue-100">
                    <Save className="w-4 h-4 mr-2" /> Simpan Draft
                  </Button>
                )}
                <Button
                  type="button"
                  size="lg"
                  onClick={() => {
                    setShowForm(false);
                    setSelectedLetter(null);
                  }}
                  className="w-full sm:w-auto bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-md"
                >
                  Batal
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>

    {/* User letter detail */}
    <Dialog open={!!viewingLetter} onOpenChange={() => setViewingLetter(null)}>
      <DialogContent className={spktDialogClass('lg')}>
        {viewingLetter && (
          <>
            <DialogHeader>
              <DialogTitle className="text-white">{viewingLetter.requestNumber}</DialogTitle>
              <DialogDescription className="text-blue-200">{viewingLetter.letterType}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm text-blue-100">
              <div className="bg-blue-800/50 border border-blue-600/50 rounded-lg p-4 space-y-2">
                <p><span className="text-blue-300">Pemohon:</span> <span className="text-white">{viewingLetter.requesterName}</span></p>
                <p><span className="text-blue-300">NIK:</span> <span className="text-white">{viewingLetter.requesterNIK}</span></p>
                {viewingLetter.requesterPhone && (
                  <p><span className="text-blue-300">Telepon:</span> <span className="text-white">{viewingLetter.requesterPhone}</span></p>
                )}
                {viewingLetter.assignedTo && (
                  <p><span className="text-blue-300">Petugas:</span> <span className="text-white">{viewingLetter.assignedTo}</span></p>
                )}
              </div>
              <p>Keperluan: {viewingLetter.purpose}</p>
              <p>Status: {getStatusLabel(viewingLetter.status)}</p>
              {viewingLetter.attachmentFiles && viewingLetter.attachmentFiles.length > 0 && (
                <div>
                  <h4 className="font-medium text-white mb-2">Dokumen Pendukung</h4>
                  <div className="space-y-2">
                    {viewingLetter.attachmentFiles.map((file) => (
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
              {viewingLetter.timeline?.length > 0 && (
                <div>
                  <h4 className="font-medium text-white flex items-center gap-2 mb-2"><Clock className="w-4 h-4" /> Timeline</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {viewingLetter.timeline.map((event, i) => (
                      <div key={i} className="text-xs bg-blue-900/40 p-2 rounded border border-blue-500/30">
                        <p className="text-white">{event.status}</p>
                        <p className="text-blue-400">{new Date(event.timestamp).toLocaleString('id-ID')}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {viewingLetter.pickupDate && viewingLetter.status === 'ready' && (
                <p className="text-green-200">
                  Siap diambil: {new Date(viewingLetter.pickupDate).toLocaleDateString('id-ID')}
                </p>
              )}
              {['ready', 'completed', 'verified'].includes(viewingLetter.status) && (
                <Button asChild className="bg-sky-500 hover:bg-sky-600">
                  <a href={spktApi.getLetterPdfUrl(viewingLetter.id)} target="_blank" rel="noopener noreferrer">
                    <Download className="w-4 h-4 mr-2" /> Unduh PDF
                  </a>
                </Button>
              )}
              {(viewingLetter.status === 'ready' || viewingLetter.status === 'completed') && (
                <CsiPromptButton
                  serviceType="letter"
                  serviceLabel="Layanan Surat"
                  referenceId={viewingLetter.requestNumber}
                  eligible={letterCsiEligible}
                  checking={letterCsiChecking}
                  onSubmitted={refreshLetterCsi}
                />
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>

    {/* Staff management dialog */}
    <Dialog open={!!managingLetter} onOpenChange={() => setManagingLetter(null)}>
      <DialogContent className={spktDialogClass('2xl')}>
        {managingLetter && (
          <>
            <DialogHeader>
              <DialogTitle className="text-white">{managingLetter.requestNumber}</DialogTitle>
              <DialogDescription className="text-blue-200">
                {managingLetter.letterType} · {managingLetter.requesterName}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="bg-blue-800/50 border border-blue-600/50 rounded-lg p-4 space-y-2 text-sm">
                <p><span className="text-blue-300">NIK:</span> <span className="text-white">{managingLetter.requesterNIK}</span></p>
                <p><span className="text-blue-300">Keperluan:</span> <span className="text-white">{managingLetter.purpose}</span></p>
                <p><span className="text-blue-300">Diajukan:</span>{' '}
                  <span className="text-white">
                    {new Date(managingLetter.createdAt).toLocaleDateString('id-ID', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  </span>
                </p>
              </div>

              {managingLetter.attachmentFiles && managingLetter.attachmentFiles.length > 0 && (
                <div>
                  <Label className="text-blue-200">Dokumen Pendukung</Label>
                  <div className="mt-2 space-y-2">
                    {managingLetter.attachmentFiles.map((file) => (
                      <div
                        key={file}
                        className="flex items-center gap-2 text-sm border border-blue-500/40 rounded-lg p-2 bg-blue-900/40"
                      >
                        <FileText className="w-4 h-4 text-blue-200 shrink-0" />
                        <span className="text-blue-100 truncate flex-1">{file}</span>
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

              {isAdmin && (
                <div className="space-y-2">
                  <Label className="text-blue-200">Assign Petugas (Divisi Surat)</Label>
                  <Select value={assignOfficerId || 'none'} onValueChange={(v) => setAssignOfficerId(v === 'none' ? '' : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih petugas..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Belum ditugaskan</SelectItem>
                      {suratOfficers.map((officer) => (
                        <SelectItem key={officer.id} value={officer.id}>
                          {officer.name} ({officer.assignedCases} tugas aktif)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {managingLetter.assignedTo && (
                    <p className="text-xs text-blue-300">Petugas saat ini: {managingLetter.assignedTo}</p>
                  )}
                </div>
              )}

              {(isPetugasSurat || (isAdmin && managingLetter.assignedOfficerId)) && (
                <>
              <div className="space-y-2">
                <Label className="text-blue-200">Status</Label>
                <Select value={staffStatus} onValueChange={(v: LetterStatus) => setStaffStatus(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LETTER_STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status} value={status}>
                        {getStatusLabel(status)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {staffStatus === 'rejected' && (
                <div className="space-y-2">
                  <Label className="text-blue-200">Alasan Penolakan *</Label>
                  <Textarea
                    value={staffRejectionReason}
                    onChange={(e) => setStaffRejectionReason(e.target.value)}
                    className="bg-blue-900/50 border-blue-500/50 text-white"
                    rows={3}
                    required
                  />
                </div>
              )}

              {staffStatus === 'ready' && (
                <div className="space-y-2">
                  <Label className="text-blue-200">Tanggal Pengambilan</Label>
                  <DatePickerField
                    value={staffPickupDate}
                    onChange={setStaffPickupDate}
                    placeholder="Pilih tanggal pengambilan"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              )}
                </>
              )}

              <Button
                onClick={handleStaffSave}
                disabled={staffSaving}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
              >
                <Save className="w-4 h-4 mr-2" />
                {isAdmin && !managingLetter.assignedOfficerId && assignOfficerId ? 'Assign Petugas' : 'Simpan Perubahan'}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>

    {/* Quick assign dialog (admin) */}
    <Dialog open={!!assigningLetter} onOpenChange={() => setAssigningLetter(null)}>
      <DialogContent className={spktDialogClass('md')}>
        {assigningLetter && (
          <>
            <DialogHeader>
              <DialogTitle className="text-white">
                {assigningLetter.assignedTo ? 'Tugaskan Ulang Petugas' : 'Assign Petugas'}
              </DialogTitle>
              <DialogDescription className="text-blue-200">
                {assigningLetter.requestNumber} · {assigningLetter.letterType}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {assigningLetter.assignedTo && (
                <div className="bg-blue-800/50 border border-blue-600/50 p-3 rounded-lg">
                  <p className="text-sm text-blue-200">Petugas saat ini:</p>
                  <p className="font-medium text-white">{assigningLetter.assignedTo}</p>
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-blue-200">Pilih Petugas (Divisi Surat)</Label>
                <Select value={quickAssignOfficerId} onValueChange={setQuickAssignOfficerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih petugas..." />
                  </SelectTrigger>
                  <SelectContent>
                    {suratOfficers.map((officer) => (
                      <SelectItem key={officer.id} value={officer.id}>
                        {officer.name} ({officer.assignedCases} tugas aktif)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {suratOfficers.length === 0 && (
                  <p className="text-xs text-amber-300">Belum ada petugas divisi surat. Tambahkan di Kelola Petugas.</p>
                )}
              </div>
              <Button
                onClick={handleQuickAssign}
                disabled={quickAssignSaving || !quickAssignOfficerId}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                {assigningLetter.assignedTo ? 'Tugaskan Ulang' : 'Assign Petugas'}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
};
