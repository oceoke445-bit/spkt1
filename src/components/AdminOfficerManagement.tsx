'use client';

import React, { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { spktApi } from '@/lib/spktApi';
import { spktDialogClass } from '@/lib/spktDialog';
import { toast } from 'sonner';
import { Plus, Trash2, Pencil } from 'lucide-react';
import type { Officer } from '@/lib/types/spkt';
import { OFFICER_DIVISION_LABELS } from '@/lib/officerDivision';

type PetugasUser = { id: string; name: string; email: string };

const emptyForm = {
  name: '',
  rank: '',
  email: '',
  phone: '',
  status: 'available',
  division: 'laporan',
  userId: '',
};

export const AdminOfficerManagement: React.FC = () => {
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [petugasUsers, setPetugasUsers] = useState<PetugasUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingOfficer, setEditingOfficer] = useState<Officer | null>(null);
  const [officerToDelete, setOfficerToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const refresh = () => {
    setLoading(true);
    Promise.all([spktApi.getOfficers(), spktApi.getUsers(1, 100)])
      .then(([{ officers: data }, { users }]) => {
        setOfficers(data);
        setPetugasUsers(
          users
            .filter((u) => u.role === 'petugas' || u.role === 'admin')
            .map((u) => ({ id: u.id, name: u.name, email: u.email })),
        );
      })
      .catch(() => {
        setOfficers([]);
        setPetugasUsers([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
  }, []);

  const openCreate = () => {
    setEditingOfficer(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (officer: Officer) => {
    setEditingOfficer(officer);
    setForm({
      name: officer.name,
      rank: officer.rank,
      email: officer.email,
      phone: officer.phone,
      status: officer.status,
      division: officer.division,
      userId: officer.userId ?? '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: form.name,
      rank: form.rank,
      email: form.email,
      phone: form.phone,
      status: form.status,
      division: form.division,
      userId: form.userId || undefined,
    };

    try {
      if (editingOfficer) {
        await spktApi.updateOfficer(editingOfficer.id, {
          ...payload,
          userId: form.userId || null,
        });
        toast.success('Petugas diperbarui');
      } else {
        await spktApi.createOfficer(payload);
        toast.success('Petugas ditambahkan');
      }
      setShowForm(false);
      setForm(emptyForm);
      setEditingOfficer(null);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan petugas');
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await spktApi.updateOfficer(id, { status });
      toast.success('Status petugas diperbarui');
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal memperbarui petugas');
    }
  };

  const handleDelete = async () => {
    if (!officerToDelete) return;

    setDeleting(true);
    try {
      await spktApi.deleteOfficer(officerToDelete.id);
      toast.success('Petugas dihapus', {
        description: `${officerToDelete.name} telah dihapus dari daftar`,
      });
      setOfficerToDelete(null);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menghapus petugas');
    } finally {
      setDeleting(false);
    }
  };

  const linkedUserLabel = (userId?: string) => {
    if (!userId) return '—';
    const user = petugasUsers.find((u) => u.id === userId);
    return user ? `${user.name} (${user.email})` : userId;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Kelola Petugas</h1>
          <p className="text-blue-200 mt-1">Daftar petugas SPKT, ketersediaan, dan tautan akun login</p>
        </div>
        <Button onClick={openCreate} className="bg-gradient-to-r from-blue-500 to-blue-600">
          <Plus className="w-4 h-4 mr-2" />
          Tambah Petugas
        </Button>
      </div>

      {loading && <div className="text-center py-8 text-blue-300">Memuat petugas...</div>}

      {!loading && (
        <div className="bg-gradient-to-br from-blue-900/80 to-blue-800/80 border border-blue-500/50 rounded-lg overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-blue-950/50 border-b border-blue-500/30">
              <tr>
                <th className="px-6 py-3 text-left text-xs text-blue-200 uppercase">Nama</th>
                <th className="px-6 py-3 text-left text-xs text-blue-200 uppercase">Pangkat</th>
                <th className="px-6 py-3 text-left text-xs text-blue-200 uppercase">Akun Login</th>
                <th className="px-6 py-3 text-left text-xs text-blue-200 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs text-blue-200 uppercase">Divisi</th>
                <th className="px-6 py-3 text-left text-xs text-blue-200 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs text-blue-200 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-500/20">
              {officers.map((o) => (
                <tr key={o.id} className="hover:bg-blue-800/50">
                  <td className="px-6 py-4 text-white font-medium">{o.name}</td>
                  <td className="px-6 py-4 text-blue-200">{o.rank}</td>
                  <td className="px-6 py-4 text-blue-200 text-sm">{linkedUserLabel(o.userId)}</td>
                  <td className="px-6 py-4 text-blue-200">{o.email}</td>
                  <td className="px-6 py-4 text-blue-200">{OFFICER_DIVISION_LABELS[o.division]}</td>
                  <td className="px-6 py-4">
                    <Select value={o.status} onValueChange={(v) => updateStatus(o.id, v)}>
                      <SelectTrigger className="w-36 bg-blue-900/50 border-blue-500/50 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Tersedia</SelectItem>
                        <SelectItem value="busy">Sibuk</SelectItem>
                        <SelectItem value="offline">Offline</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-blue-500/50 text-blue-200 hover:bg-blue-800/60"
                        onClick={() => openEdit(o)}
                      >
                        <Pencil className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white border-0 shadow-md"
                        onClick={() => setOfficerToDelete({ id: o.id, name: o.name })}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Hapus
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className={spktDialogClass('lg')}>
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingOfficer ? 'Edit Petugas' : 'Tambah Petugas Baru'}
            </DialogTitle>
            <DialogDescription className="text-blue-200">
              Hubungkan petugas ke akun login agar penugasan laporan berfungsi dengan benar.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-blue-200">Nama</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="bg-blue-900/50 border-blue-500/50 text-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-blue-200">Pangkat</Label>
              <Input value={form.rank} onChange={(e) => setForm({ ...form, rank: e.target.value })} required className="bg-blue-900/50 border-blue-500/50 text-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-blue-200">Email Petugas</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="bg-blue-900/50 border-blue-500/50 text-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-blue-200">Telepon</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required className="bg-blue-900/50 border-blue-500/50 text-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-blue-200">Divisi</Label>
              <Select value={form.division} onValueChange={(v) => setForm({ ...form, division: v })}>
                <SelectTrigger className="bg-blue-900/50 border-blue-500/50 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="laporan">Divisi Laporan</SelectItem>
                  <SelectItem value="surat">Divisi Surat</SelectItem>
                  <SelectItem value="pengaduan">Divisi Pengaduan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-blue-200">Tautkan ke Akun Login</Label>
              <Select value={form.userId || 'none'} onValueChange={(v) => setForm({ ...form, userId: v === 'none' ? '' : v })}>
                <SelectTrigger className="bg-blue-900/50 border-blue-500/50 text-white">
                  <SelectValue placeholder="Pilih akun petugas..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tidak ditautkan</SelectItem>
                  {petugasUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} — {u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full bg-gradient-to-r from-blue-500 to-blue-600">
              {editingOfficer ? 'Simpan Perubahan' : 'Simpan'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!officerToDelete} onOpenChange={(open) => !open && setOfficerToDelete(null)}>
        <DialogContent className={spktDialogClass('md')}>
          <DialogHeader>
            <DialogTitle className="text-white">Hapus Petugas</DialogTitle>
            <DialogDescription className="text-blue-200">
              Yakin ingin menghapus <span className="font-medium text-white">{officerToDelete?.name}</span> dari
              daftar petugas? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className="border-blue-500/50 text-blue-200 hover:bg-blue-800/60"
              onClick={() => setOfficerToDelete(null)}
              disabled={deleting}
            >
              Batal
            </Button>
            <Button
              type="button"
              disabled={deleting}
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white border-0"
              onClick={handleDelete}
            >
              {deleting ? 'Menghapus...' : 'Hapus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
