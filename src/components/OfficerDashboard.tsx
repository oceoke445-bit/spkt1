import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { getStatusLabel } from '@/lib/data/mockData';
import { getComplaintStatusLabel } from '@/lib/types/spkt';
import { useAuth } from '@/contexts/AuthContext';
import { useReports } from '@/hooks/useReports';
import { useLetters } from '@/hooks/useLetters';
import { useComplaints } from '@/hooks/useComplaints';
import { OFFICER_DIVISION_LABELS } from '@/lib/officerDivision';
import { Inbox, Clock, CheckCircle2, User, ArrowRight, Mail, MessageSquare } from 'lucide-react';

interface OfficerDashboardProps {
  onNavigate?: (view: string) => void;
}

export const OfficerDashboard: React.FC<OfficerDashboardProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const division = user?.officerDivision ?? 'laporan';

  const { reports: allReports, loading: reportsLoading } = useReports({ paginate: false });
  const { letters, loading: lettersLoading } = useLetters(undefined, { paginate: false });
  const { complaints, loading: complaintsLoading } = useComplaints(undefined, { paginate: false });

  const loading =
    division === 'laporan' ? reportsLoading : division === 'surat' ? lettersLoading : complaintsLoading;

  const divisionLabel = OFFICER_DIVISION_LABELS[division];

  if (division === 'surat') {
    const active = letters.filter((l) => l.status !== 'completed' && l.status !== 'rejected');
    const processing = letters.filter((l) => l.status === 'verified' || l.status === 'ready');
    const completed = letters.filter((l) => l.status === 'completed');
    const recent = [...letters].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

    const stats = [
      { title: 'Total Ditugaskan', value: letters.length, icon: <Mail className="w-6 h-6 text-violet-300" />, bgColor: 'bg-violet-500/20' },
      { title: 'Aktif', value: active.length, icon: <User className="w-6 h-6 text-indigo-300" />, bgColor: 'bg-indigo-500/20' },
      { title: 'Diproses', value: processing.length, icon: <Clock className="w-6 h-6 text-sky-300" />, bgColor: 'bg-sky-500/20' },
      { title: 'Selesai', value: completed.length, icon: <CheckCircle2 className="w-6 h-6 text-emerald-300" />, bgColor: 'bg-emerald-500/20' },
    ];

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Dashboard Petugas</h1>
          <p className="text-blue-200 mt-1">{divisionLabel} — ringkasan pengajuan surat yang ditugaskan</p>
        </div>
        {loading && <div className="text-center py-8 text-blue-300">Memuat data...</div>}
        {!loading && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.map((stat) => (
                <Card key={stat.title} className="bg-gradient-to-br from-blue-900/80 to-blue-800/80 border-blue-500/50 backdrop-blur">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-blue-200 mb-1">{stat.title}</p>
                        <p className="text-3xl font-bold text-white">{stat.value}</p>
                      </div>
                      <div className={`${stat.bgColor} p-3 rounded-lg`}>{stat.icon}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card className="bg-gradient-to-br from-blue-900/80 to-blue-800/80 border-blue-500/50 backdrop-blur">
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-white">Surat Terbaru</CardTitle>
                  <CardDescription className="text-blue-200">Pengajuan surat yang ditugaskan kepada Anda</CardDescription>
                </div>
                {onNavigate && (
                  <Button onClick={() => onNavigate('letter-service')} className="bg-gradient-to-r from-blue-500 to-blue-600">
                    Lihat Semua <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {recent.length === 0 ? (
                  <p className="text-center py-8 text-blue-300">Belum ada pengajuan surat ditugaskan</p>
                ) : (
                  <div className="space-y-3">
                    {recent.map((letter) => (
                      <div key={letter.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border border-blue-600/50 rounded-lg p-3 bg-blue-800/40">
                        <div>
                          <p className="font-medium text-white">{letter.requestNumber}</p>
                          <p className="text-sm text-blue-200">{letter.requesterName} · {letter.letterType}</p>
                        </div>
                        <span className="text-sm text-blue-300">{getStatusLabel(letter.status)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    );
  }

  if (division === 'pengaduan') {
    const active = complaints.filter((c) => c.status !== 'resolved' && c.status !== 'closed');
    const processing = complaints.filter((c) => c.status === 'reviewing' || c.status === 'processing');
    const completed = complaints.filter((c) => c.status === 'resolved');
    const recent = [...complaints].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

    const stats = [
      { title: 'Total Ditugaskan', value: complaints.length, icon: <MessageSquare className="w-6 h-6 text-emerald-300" />, bgColor: 'bg-emerald-500/20' },
      { title: 'Aktif', value: active.length, icon: <User className="w-6 h-6 text-indigo-300" />, bgColor: 'bg-indigo-500/20' },
      { title: 'Diproses', value: processing.length, icon: <Clock className="w-6 h-6 text-violet-300" />, bgColor: 'bg-violet-500/20' },
      { title: 'Selesai', value: completed.length, icon: <CheckCircle2 className="w-6 h-6 text-sky-300" />, bgColor: 'bg-sky-500/20' },
    ];

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Dashboard Petugas</h1>
          <p className="text-blue-200 mt-1">{divisionLabel} — ringkasan pengaduan yang ditugaskan</p>
        </div>
        {loading && <div className="text-center py-8 text-blue-300">Memuat data...</div>}
        {!loading && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.map((stat) => (
                <Card key={stat.title} className="bg-gradient-to-br from-blue-900/80 to-blue-800/80 border-blue-500/50 backdrop-blur">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-blue-200 mb-1">{stat.title}</p>
                        <p className="text-3xl font-bold text-white">{stat.value}</p>
                      </div>
                      <div className={`${stat.bgColor} p-3 rounded-lg`}>{stat.icon}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card className="bg-gradient-to-br from-blue-900/80 to-blue-800/80 border-blue-500/50 backdrop-blur">
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-white">Pengaduan Terbaru</CardTitle>
                  <CardDescription className="text-blue-200">Pengaduan yang ditugaskan kepada Anda</CardDescription>
                </div>
                {onNavigate && (
                  <Button onClick={() => onNavigate('complaints')} className="bg-gradient-to-r from-blue-500 to-blue-600">
                    Lihat Semua <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {recent.length === 0 ? (
                  <p className="text-center py-8 text-blue-300">Belum ada pengaduan ditugaskan</p>
                ) : (
                  <div className="space-y-3">
                    {recent.map((complaint) => (
                      <div key={complaint.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border border-blue-600/50 rounded-lg p-3 bg-blue-800/40">
                        <div>
                          <p className="font-medium text-white">{complaint.complaintNumber}</p>
                          <p className="text-sm text-blue-200">{complaint.submitterName} · {complaint.subject}</p>
                        </div>
                        <span className="text-sm text-blue-300">{getComplaintStatusLabel(complaint.status)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    );
  }

  const assignedToMe = allReports.filter((r) => r.status !== 'completed' && r.status !== 'rejected');
  const processingCount = allReports.filter((r) => r.status === 'processing').length;
  const completedCount = allReports.filter((r) => r.status === 'completed').length;
  const recentReports = [...allReports]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const stats = [
    { title: 'Total Tugas Saya', value: allReports.length, icon: <Inbox className="w-6 h-6 text-sky-300" />, bgColor: 'bg-sky-500/20' },
    { title: 'Aktif', value: assignedToMe.length, icon: <User className="w-6 h-6 text-indigo-300" />, bgColor: 'bg-indigo-500/20' },
    { title: 'Sedang Diproses', value: processingCount, icon: <Clock className="w-6 h-6 text-violet-300" />, bgColor: 'bg-violet-500/20' },
    { title: 'Selesai', value: completedCount, icon: <CheckCircle2 className="w-6 h-6 text-emerald-300" />, bgColor: 'bg-emerald-500/20' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Dashboard Petugas</h1>
        <p className="text-blue-200 mt-1">{divisionLabel} — ringkasan laporan yang ditugaskan kepada Anda</p>
      </div>

      {loading && <div className="text-center py-8 text-blue-300">Memuat data...</div>}

      {!loading && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => (
              <Card key={stat.title} className="bg-gradient-to-br from-blue-900/80 to-blue-800/80 border-blue-500/50 backdrop-blur">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-blue-200 mb-1">{stat.title}</p>
                      <p className="text-3xl font-bold text-white">{stat.value}</p>
                    </div>
                    <div className={`${stat.bgColor} p-3 rounded-lg`}>{stat.icon}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="bg-gradient-to-br from-blue-900/80 to-blue-800/80 border-blue-500/50 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle className="text-white">Laporan Terbaru</CardTitle>
                <CardDescription className="text-blue-200">Laporan yang ditugaskan kepada Anda</CardDescription>
              </div>
              {onNavigate && (
                <Button onClick={() => onNavigate('incoming-reports')} className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-md">
                  Lihat Semua
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {recentReports.length === 0 ? (
                <p className="text-center py-8 text-blue-300">Belum ada laporan ditugaskan</p>
              ) : (
                <div className="space-y-3">
                  {recentReports.map((report) => (
                    <div key={report.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border border-blue-600/50 rounded-lg p-3 bg-blue-800/40">
                      <div>
                        <p className="font-medium text-white">{report.reportNumber}</p>
                        <p className="text-sm text-blue-200">{report.reporterName} · {report.caseType}</p>
                      </div>
                      <span className="text-sm text-blue-300">{getStatusLabel(report.status)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
