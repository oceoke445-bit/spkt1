export type ReportStatus =
  | 'draft'
  | 'submitted'
  | 'verified'
  | 'assigned'
  | 'processing'
  | 'completed'
  | 'rejected';

export type LetterStatus =
  | 'draft'
  | 'submitted'
  | 'verified'
  | 'ready'
  | 'completed'
  | 'rejected';

export type ComplaintStatus =
  | 'submitted'
  | 'reviewing'
  | 'processing'
  | 'resolved'
  | 'closed';

export type ComplaintCategory =
  | 'pelayanan'
  | 'petugas'
  | 'fasilitas'
  | 'sistem'
  | 'lainnya';

export interface TimelineEvent {
  status: string;
  timestamp: string;
  note?: string;
  officer?: string;
}

export interface Report {
  id: string;
  reportNumber: string;
  reporterName: string;
  reporterNIK: string;
  reporterPhone: string;
  caseType: string;
  incidentDate: string;
  location: string;
  description: string;
  status: ReportStatus;
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
  assignedOfficerId?: string;
  assignedBy?: string;
  assignedAt?: string;
  notes?: string;
  evidenceFiles?: string[];
  timeline: TimelineEvent[];
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export type OfficerDivision = 'laporan' | 'surat' | 'pengaduan';

export interface LetterRequest {
  id: string;
  requestNumber: string;
  requesterName: string;
  requesterNIK: string;
  requesterPhone?: string;
  letterType: string;
  purpose: string;
  status: LetterStatus;
  createdAt: string;
  updatedAt?: string;
  pickupDate?: string;
  attachmentFiles?: string[];
  rejectionReason?: string;
  assignedTo?: string;
  assignedOfficerId?: string;
  assignedBy?: string;
  assignedAt?: string;
  timeline: TimelineEvent[];
}

export interface Complaint {
  id: string;
  complaintNumber: string;
  submitterName: string;
  submitterNik?: string;
  category: ComplaintCategory;
  subject: string;
  description: string;
  status: ComplaintStatus;
  createdAt: string;
  updatedAt: string;
  response?: string;
  responseDate?: string;
  files?: string[];
  assignedTo?: string;
  assignedOfficerId?: string;
  assignedBy?: string;
  assignedAt?: string;
  timeline: TimelineEvent[];
}

export interface Officer {
  id: string;
  userId?: string;
  name: string;
  rank: string;
  email: string;
  phone: string;
  status: 'available' | 'busy' | 'offline';
  division: OfficerDivision;
  assignedCases: number;
  completedCases: number;
}

export interface DbUser {
  id: string;
  email: string;
  name: string;
  nik?: string;
  phone?: string;
  role: 'user' | 'petugas' | 'admin';
  avatarUrl?: string;
}

export const getStatusBadgeColor = (status: ReportStatus | LetterStatus): string => {
  switch (status) {
    case 'draft':
      return 'bg-gray-500/30 text-gray-200 border-gray-400/50';
    case 'submitted':
      return 'bg-yellow-500/30 text-yellow-200 border-yellow-400/50';
    case 'verified':
      return 'bg-blue-500/30 text-blue-200 border-blue-400/50';
    case 'assigned':
      return 'bg-indigo-500/30 text-indigo-200 border-indigo-400/50';
    case 'processing':
      return 'bg-purple-500/30 text-purple-200 border-purple-400/50';
    case 'ready':
      return 'bg-green-500/30 text-green-200 border-green-400/50';
    case 'completed':
      return 'bg-green-500/30 text-green-200 border-green-400/50';
    case 'rejected':
      return 'bg-red-500/30 text-red-200 border-red-400/50';
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
};

export const getStatusLabel = (status: ReportStatus | LetterStatus): string => {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'submitted':
      return 'Dikirim';
    case 'verified':
      return 'Diverifikasi';
    case 'assigned':
      return 'Ditugaskan';
    case 'processing':
      return 'Diproses';
    case 'ready':
      return 'Siap Diambil';
    case 'completed':
      return 'Selesai';
    case 'rejected':
      return 'Ditolak';
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
};

export const getComplaintStatusColor = (status: ComplaintStatus): string => {
  switch (status) {
    case 'submitted':
      return 'bg-yellow-500/30 text-yellow-200 border-yellow-400/50';
    case 'reviewing':
      return 'bg-blue-500/30 text-blue-200 border-blue-400/50';
    case 'processing':
      return 'bg-purple-500/30 text-purple-200 border-purple-400/50';
    case 'resolved':
      return 'bg-emerald-500/30 text-emerald-200 border-emerald-400/50';
    case 'closed':
      return 'bg-gray-500/30 text-gray-200 border-gray-400/50';
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
};

export const getComplaintStatusLabel = (status: ComplaintStatus): string => {
  switch (status) {
    case 'submitted':
      return 'Terkirim';
    case 'reviewing':
      return 'Ditinjau';
    case 'processing':
      return 'Diproses';
    case 'resolved':
      return 'Selesai';
    case 'closed':
      return 'Ditutup';
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
};
