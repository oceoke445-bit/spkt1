import { db, ensureDbReady } from '@/lib/db';
import {
  allocateReportNumber,
  allocateLetterNumber,
  allocateComplaintNumber,
} from '@/lib/reference';
import { canTransitionReport, canTransitionLetter, canTransitionComplaint } from '@/lib/status-transitions';
import { createNotification, notifyUserByNik } from '@/lib/services/notifications';
import { createAuditLog } from '@/lib/services/audit';
import { logUserActivity } from '@/lib/services/activity';
import type {
  Report,
  ReportStatus,
  TimelineEvent,
  LetterRequest,
  LetterStatus,
  Complaint,
  ComplaintCategory,
  ComplaintStatus,
  Officer,
} from '@/lib/types/spkt';

function nowIso(): string {
  return new Date().toISOString();
}

function rowToReport(
  row: Record<string, unknown>,
  timeline: TimelineEvent[],
  evidenceFiles: string[],
): Report {
  return {
    id: row.id as string,
    reportNumber: row.report_number as string,
    reporterName: row.reporter_name as string,
    reporterNIK: row.reporter_nik as string,
    reporterPhone: row.reporter_phone as string,
    caseType: row.case_type as string,
    incidentDate: row.incident_date as string,
    location: row.location as string,
    description: row.description as string,
    status: row.status as ReportStatus,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    assignedTo: row.assigned_to as string | undefined,
    assignedOfficerId: row.assigned_officer_id as string | undefined,
    assignedBy: row.assigned_by as string | undefined,
    assignedAt: row.assigned_at as string | undefined,
    notes: row.notes as string | undefined,
    priority: row.priority as Report['priority'],
    evidenceFiles,
    timeline,
  };
}

function loadReportExtras(reportId: string): { timeline: TimelineEvent[]; evidenceFiles: string[] } {
  const timelineRows = db
    .prepare(
      'SELECT status, timestamp, note, officer FROM report_timeline WHERE report_id = ? ORDER BY timestamp ASC',
    )
    .all(reportId) as Array<{ status: string; timestamp: string; note: string | null; officer: string | null }>;

  const evidenceRows = db
    .prepare('SELECT filename FROM report_evidence WHERE report_id = ?')
    .all(reportId) as Array<{ filename: string }>;

  return {
    timeline: timelineRows.map((t) => ({
      status: t.status,
      timestamp: t.timestamp,
      note: t.note ?? undefined,
      officer: t.officer ?? undefined,
    })),
    evidenceFiles: evidenceRows.map((e) => e.filename),
  };
}

function hydrateReport(row: Record<string, unknown>): Report {
  const extras = loadReportExtras(row.id as string);
  return rowToReport(row, extras.timeline, extras.evidenceFiles);
}

export interface ListReportsFilter {
  nik?: string;
  assignedTo?: string;
  assignedOfficerId?: string;
  /** Semua laporan non-draft (untuk halaman Laporan Masuk petugas) */
  excludeDraft?: boolean;
  /** Petugas: hanya laporan yang sudah ditugaskan ke petugas ini */
  officerInbox?: {
    officerId?: string;
    officerName: string;
  };
}

export interface ListPagination {
  page: number;
  limit: number;
}

export function listReports(
  filter: ListReportsFilter = {},
  pagination?: ListPagination,
): { items: Report[]; total: number } {
  ensureDbReady();
  let sql = 'SELECT * FROM reports WHERE 1=1';
  let countSql = 'SELECT COUNT(*) as c FROM reports WHERE 1=1';
  const params: Record<string, string> = {};

  if (filter.nik) {
    sql += ' AND reporter_nik = @nik';
    countSql += ' AND reporter_nik = @nik';
    params.nik = filter.nik;
  }
  if (filter.assignedTo) {
    sql += ' AND assigned_to = @assignedTo';
    countSql += ' AND assigned_to = @assignedTo';
    params.assignedTo = filter.assignedTo;
  }
  if (filter.assignedOfficerId) {
    sql += ' AND assigned_officer_id = @assignedOfficerId';
    countSql += ' AND assigned_officer_id = @assignedOfficerId';
    params.assignedOfficerId = filter.assignedOfficerId;
  }
  if (filter.excludeDraft) {
    sql += " AND status != 'draft'";
    countSql += " AND status != 'draft'";
  }
  if (filter.officerInbox) {
    const inboxClause = ` AND status != 'draft' AND (
      assigned_to = @officerInboxName
      ${filter.officerInbox.officerId ? "OR assigned_officer_id = @officerInboxId" : ''}
    )`;
    sql += inboxClause;
    countSql += inboxClause;
    params.officerInboxName = filter.officerInbox.officerName;
    if (filter.officerInbox.officerId) {
      params.officerInboxId = filter.officerInbox.officerId;
    }
  }

  sql += ' ORDER BY created_at DESC';

  const total = (db.prepare(countSql).get(params) as { c: number }).c;

  if (pagination) {
    sql += ' LIMIT @limit OFFSET @offset';
    params.limit = String(pagination.limit);
    params.offset = String((pagination.page - 1) * pagination.limit);
  }

  const rows = db.prepare(sql).all(params) as Record<string, unknown>[];
  return { items: rows.map(hydrateReport), total };
}

export function getReportById(id: string): Report | null {
  ensureDbReady();
  const row = db.prepare('SELECT * FROM reports WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  return hydrateReport(row);
}

function generateReportNumber(): string {
  return allocateReportNumber();
}

export interface CreateReportInput {
  reporterUserId?: string;
  reporterName: string;
  reporterNIK: string;
  reporterPhone: string;
  caseType: string;
  incidentDate: string;
  location: string;
  description: string;
  status?: ReportStatus;
  priority?: Report['priority'];
  evidenceFiles?: string[];
}

function isDuplicateReportNumberError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('UNIQUE constraint failed: reports.report_number');
}

export function createReport(input: CreateReportInput): Report {
  ensureDbReady();
  const id = `R${Date.now()}`;
  const status = input.status ?? 'submitted';
  const ts = nowIso();

  const insertReport = db.prepare(
    `INSERT INTO reports (
      id, report_number, reporter_user_id, reporter_name, reporter_nik, reporter_phone,
      case_type, incident_date, location, description, status, priority, created_at, updated_at
    ) VALUES (
      @id, @reportNumber, @reporterUserId, @reporterName, @reporterNIK, @reporterPhone,
      @caseType, @incidentDate, @location, @description, @status, @priority, @createdAt, @updatedAt
    )`,
  );

  let reportNumber = '';
  for (let attempt = 0; attempt < 5; attempt++) {
    reportNumber = generateReportNumber();
    try {
      insertReport.run({
        id,
        reportNumber,
        reporterUserId: input.reporterUserId ?? null,
        reporterName: input.reporterName,
        reporterNIK: input.reporterNIK,
        reporterPhone: input.reporterPhone,
        caseType: input.caseType,
        incidentDate: input.incidentDate,
        location: input.location,
        description: input.description,
        status,
        priority: input.priority ?? 'medium',
        createdAt: ts,
        updatedAt: ts,
      });
      break;
    } catch (error) {
      if (!isDuplicateReportNumberError(error) || attempt === 4) {
        throw error;
      }
    }
  }

  const timelineStatus = status === 'draft' ? 'Draft disimpan' : 'Laporan dikirim';
  addTimelineEvent(id, timelineStatus, ts);

  if (input.evidenceFiles) {
    const insertEvidence = db.prepare('INSERT INTO report_evidence (report_id, filename) VALUES (?, ?)');
    for (const filename of input.evidenceFiles) {
      insertEvidence.run(id, filename);
    }
  }

  if (input.reporterUserId) {
    logUserActivity(input.reporterUserId, 'create_report', reportNumber);
  }

  return getReportById(id)!;
}

export function addTimelineEvent(
  reportId: string,
  status: string,
  timestamp?: string,
  note?: string,
  officer?: string,
): void {
  db.prepare(
    'INSERT INTO report_timeline (report_id, status, timestamp, note, officer) VALUES (?, ?, ?, ?, ?)',
  ).run(reportId, status, timestamp ?? nowIso(), note ?? null, officer ?? null);
}

export interface UpdateReportInput {
  status?: ReportStatus;
  assignedTo?: string;
  assignedOfficerId?: string;
  assignedBy?: string;
  notes?: string;
  timelineNote?: string;
  timelineOfficer?: string;
  adminOverride?: boolean;
  auditActorId?: string;
  auditActorName?: string;
}

export interface UpdateUserReportInput {
  caseType?: string;
  incidentDate?: string;
  location?: string;
  description?: string;
  reporterPhone?: string;
  evidenceFiles?: string[];
  submit?: boolean;
}

const STATUS_TIMELINE_LABEL: Partial<Record<ReportStatus, string>> = {
  verified: 'Diverifikasi',
  assigned: 'Ditugaskan',
  processing: 'Diproses',
  completed: 'Selesai',
  rejected: 'Ditolak',
};

export function updateReport(id: string, input: UpdateReportInput): Report {
  ensureDbReady();
  const existing = getReportById(id);
  if (!existing) {
    throw new Error('Laporan tidak ditemukan');
  }

  if (
    input.status &&
    input.status !== existing.status &&
    !canTransitionReport(existing.status, input.status, { adminOverride: input.adminOverride })
  ) {
    throw new Error(`Perubahan status dari "${existing.status}" ke "${input.status}" tidak diizinkan`);
  }

  const ts = nowIso();
  const updates: string[] = ['updated_at = @updatedAt'];
  const params: Record<string, string | null> = { id, updatedAt: ts };

  if (input.status) {
    updates.push('status = @status');
    params.status = input.status;
  }
  if (input.assignedTo !== undefined) {
    updates.push('assigned_to = @assignedTo');
    params.assignedTo = input.assignedTo;
    updates.push('assigned_at = @assignedAt');
    params.assignedAt = ts;
  }
  if (input.assignedOfficerId !== undefined) {
    updates.push('assigned_officer_id = @assignedOfficerId');
    params.assignedOfficerId = input.assignedOfficerId;
    if (input.assignedOfficerId) {
      updates.push('assigned_at = @assignedAt');
      params.assignedAt = ts;
    }
  }
  if (input.assignedBy !== undefined) {
    updates.push('assigned_by = @assignedBy');
    params.assignedBy = input.assignedBy;
  }
  if (input.notes !== undefined) {
    updates.push('notes = @notes');
    params.notes = input.notes;
  }

  db.prepare(`UPDATE reports SET ${updates.join(', ')} WHERE id = @id`).run(params);

  if (input.status && STATUS_TIMELINE_LABEL[input.status]) {
    addTimelineEvent(
      id,
      STATUS_TIMELINE_LABEL[input.status]!,
      ts,
      input.timelineNote,
      input.timelineOfficer,
    );
  } else if (input.assignedTo && input.status === undefined) {
    addTimelineEvent(id, 'Ditugaskan', ts, input.timelineNote, input.timelineOfficer ?? input.assignedTo);
  }

  if (input.status && input.status !== existing.status && existing.reporterNIK) {
    notifyUserByNik(existing.reporterNIK, {
      type: 'report_status',
      title: 'Status Laporan Diperbarui',
      message: `Laporan ${existing.reportNumber} sekarang: ${STATUS_TIMELINE_LABEL[input.status] ?? input.status}`,
      link: 'my-reports',
    });
  }

  if (input.adminOverride && input.auditActorId && input.auditActorName) {
    createAuditLog({
      actorId: input.auditActorId,
      actorName: input.auditActorName,
      action: 'override_status',
      entityType: 'report',
      entityId: id,
      details: `Status ${existing.status} → ${input.status ?? existing.status}. ${input.timelineNote ?? ''}`,
    });
  }

  if (input.assignedOfficerId && input.auditActorId && input.auditActorName) {
    createAuditLog({
      actorId: input.auditActorId,
      actorName: input.auditActorName,
      action: 'reassign_officer',
      entityType: 'report',
      entityId: id,
      details: `Ditugaskan ke officer ${input.assignedOfficerId}`,
    });
  }

  return getReportById(id)!;
}

export function updateUserReport(id: string, reporterNik: string, input: UpdateUserReportInput): Report {
  ensureDbReady();
  const existing = getReportById(id);
  if (!existing) {
    throw new Error('Laporan tidak ditemukan');
  }
  if (existing.reporterNIK !== reporterNik) {
    throw new Error('Anda tidak dapat mengedit laporan ini');
  }
  if (existing.status !== 'draft') {
    throw new Error('Hanya laporan draft yang dapat diedit');
  }

  const ts = nowIso();
  const updates: string[] = ['updated_at = @updatedAt'];
  const params: Record<string, string> = { id, updatedAt: ts };

  if (input.caseType !== undefined) {
    updates.push('case_type = @caseType');
    params.caseType = input.caseType;
  }
  if (input.incidentDate !== undefined) {
    updates.push('incident_date = @incidentDate');
    params.incidentDate = input.incidentDate;
  }
  if (input.location !== undefined) {
    updates.push('location = @location');
    params.location = input.location;
  }
  if (input.description !== undefined) {
    updates.push('description = @description');
    params.description = input.description;
  }
  if (input.reporterPhone !== undefined) {
    updates.push('reporter_phone = @reporterPhone');
    params.reporterPhone = input.reporterPhone;
  }
  if (input.submit) {
    updates.push('status = @status');
    params.status = 'submitted';
  }

  db.prepare(`UPDATE reports SET ${updates.join(', ')} WHERE id = @id`).run(params);

  if (input.evidenceFiles?.length) {
    const insertEvidence = db.prepare('INSERT INTO report_evidence (report_id, filename) VALUES (?, ?)');
    for (const filename of input.evidenceFiles) {
      insertEvidence.run(id, filename);
    }
  }

  if (input.submit) {
    addTimelineEvent(id, 'Laporan dikirim', ts);
  } else {
    addTimelineEvent(id, 'Draft diperbarui', ts);
  }

  return getReportById(id)!;
}

export function deleteUserReport(id: string, reporterNik: string): void {
  ensureDbReady();
  const existing = getReportById(id);
  if (!existing) {
    throw new Error('Laporan tidak ditemukan');
  }
  if (existing.reporterNIK !== reporterNik) {
    throw new Error('Anda tidak dapat menghapus laporan ini');
  }
  if (existing.status !== 'draft' && existing.status !== 'submitted') {
    throw new Error('Laporan yang sudah diproses tidak dapat dihapus');
  }

  db.prepare('DELETE FROM report_timeline WHERE report_id = ?').run(id);
  db.prepare('DELETE FROM report_evidence WHERE report_id = ?').run(id);
  db.prepare('DELETE FROM reports WHERE id = ?').run(id);
}

export function deleteAllReports(): number {
  ensureDbReady();
  db.exec('BEGIN');
  try {
    db.prepare('DELETE FROM report_timeline').run();
    db.prepare('DELETE FROM report_evidence').run();
    const result = db.prepare('DELETE FROM reports').run() as { changes: number };
    const year = new Date().getFullYear();
    db.prepare("UPDATE reference_counters SET last_value = 0 WHERE prefix = 'LP' AND year = ?").run(year);
    db.exec('COMMIT');
    return result.changes;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export function listLetters(
  filter?: { nik?: string; officerInbox?: { officerId: string } },
  pagination?: ListPagination,
): { items: LetterRequest[]; total: number } {
  ensureDbReady();
  let sql = 'SELECT * FROM letter_requests';
  let countSql = 'SELECT COUNT(*) as c FROM letter_requests';
  const params: Record<string, string> = {};
  const where: string[] = [];

  if (filter?.nik) {
    where.push('requester_nik = @nik');
    params.nik = filter.nik;
  }
  if (filter?.officerInbox?.officerId) {
    where.push('assigned_officer_id = @officerInboxId');
    params.officerInboxId = filter.officerInbox.officerId;
  }
  if (where.length) {
    const clause = ` WHERE ${where.join(' AND ')}`;
    sql += clause;
    countSql += clause;
  }
  sql += ' ORDER BY created_at DESC';

  const total = (db.prepare(countSql).get(params) as { c: number }).c;

  if (pagination) {
    sql += ' LIMIT @limit OFFSET @offset';
    params.limit = String(pagination.limit);
    params.offset = String((pagination.page - 1) * pagination.limit);
  }

  const rows = db.prepare(sql).all(params) as Array<Record<string, unknown>>;
  return { items: rows.map(hydrateLetter), total };
}

function loadLetterTimeline(letterId: string): TimelineEvent[] {
  const rows = db
    .prepare(
      'SELECT status, timestamp, note, officer FROM letter_timeline WHERE letter_id = ? ORDER BY timestamp ASC',
    )
    .all(letterId) as Array<{ status: string; timestamp: string; note: string | null; officer: string | null }>;
  return rows.map((t) => ({
    status: t.status,
    timestamp: t.timestamp,
    note: t.note ?? undefined,
    officer: t.officer ?? undefined,
  }));
}

function addLetterTimelineEvent(
  letterId: string,
  status: string,
  timestamp?: string,
  note?: string,
  officer?: string,
): void {
  db.prepare(
    'INSERT INTO letter_timeline (letter_id, status, timestamp, note, officer) VALUES (?, ?, ?, ?, ?)',
  ).run(letterId, status, timestamp ?? nowIso(), note ?? null, officer ?? null);
}

const LETTER_STATUS_TIMELINE_LABEL: Partial<Record<LetterStatus, string>> = {
  submitted: 'Pengajuan dikirim',
  verified: 'Diverifikasi',
  ready: 'Siap diambil',
  completed: 'Selesai',
  rejected: 'Ditolak',
};

function loadLetterAttachments(letterId: string): string[] {
  const rows = db
    .prepare('SELECT filename FROM letter_attachments WHERE letter_id = ?')
    .all(letterId) as Array<{ filename: string }>;
  return rows.map((r) => r.filename);
}

function hydrateLetter(row: Record<string, unknown>): LetterRequest {
  const id = row.id as string;
  return {
    id,
    requestNumber: row.request_number as string,
    requesterName: row.requester_name as string,
    requesterNIK: row.requester_nik as string,
    requesterPhone: row.requester_phone as string | undefined,
    letterType: row.letter_type as string,
    purpose: row.purpose as string,
    status: row.status as LetterStatus,
    createdAt: row.created_at as string,
    updatedAt: (row.updated_at as string | undefined) ?? (row.created_at as string),
    pickupDate: row.pickup_date as string | undefined,
    rejectionReason: row.rejection_reason as string | undefined,
    assignedTo: row.assigned_to as string | undefined,
    assignedOfficerId: row.assigned_officer_id as string | undefined,
    assignedBy: row.assigned_by as string | undefined,
    assignedAt: row.assigned_at as string | undefined,
    attachmentFiles: loadLetterAttachments(id),
    timeline: loadLetterTimeline(id),
  };
}

export function getLetterById(id: string): LetterRequest | null {
  ensureDbReady();
  const row = db.prepare('SELECT * FROM letter_requests WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined;
  return row ? hydrateLetter(row) : null;
}

export interface UpdateLetterInput {
  status?: LetterStatus;
  pickupDate?: string | null;
  rejectionReason?: string | null;
  assignedTo?: string;
  assignedOfficerId?: string | null;
  assignedBy?: string;
  timelineNote?: string;
  timelineOfficer?: string;
  auditActorId?: string;
  auditActorName?: string;
}

export function updateLetter(id: string, input: UpdateLetterInput): LetterRequest | null {
  ensureDbReady();
  const existing = getLetterById(id);
  if (!existing) {
    return null;
  }

  if (
    input.status &&
    input.status !== existing.status &&
    !canTransitionLetter(existing.status, input.status)
  ) {
    throw new Error(`Perubahan status surat dari "${existing.status}" ke "${input.status}" tidak diizinkan`);
  }

  if (input.status === 'rejected' && !input.rejectionReason?.trim()) {
    throw new Error('Alasan penolakan wajib diisi');
  }

  const ts = nowIso();
  const updates: string[] = ['updated_at = @updatedAt'];
  const params: Record<string, string | null> = { id, updatedAt: ts };

  if (input.status !== undefined) {
    updates.push('status = @status');
    params.status = input.status;
  }
  if (input.pickupDate !== undefined) {
    updates.push('pickup_date = @pickupDate');
    params.pickupDate = input.pickupDate ?? null;
  }
  if (input.rejectionReason !== undefined) {
    updates.push('rejection_reason = @rejectionReason');
    params.rejectionReason = input.rejectionReason ?? null;
  }
  if (input.assignedTo !== undefined) {
    updates.push('assigned_to = @assignedTo');
    params.assignedTo = input.assignedTo;
    updates.push('assigned_at = @assignedAt');
    params.assignedAt = ts;
  }
  if (input.assignedOfficerId !== undefined) {
    updates.push('assigned_officer_id = @assignedOfficerId');
    params.assignedOfficerId = input.assignedOfficerId;
    if (input.assignedOfficerId) {
      updates.push('assigned_at = @assignedAt');
      params.assignedAt = ts;
    }
  }
  if (input.assignedBy !== undefined) {
    updates.push('assigned_by = @assignedBy');
    params.assignedBy = input.assignedBy;
  }

  if (updates.length === 1) {
    return getLetterById(id);
  }

  db.prepare(`UPDATE letter_requests SET ${updates.join(', ')} WHERE id = @id`).run(params);

  if (input.status && input.status !== existing.status) {
    addLetterTimelineEvent(
      id,
      LETTER_STATUS_TIMELINE_LABEL[input.status] ?? input.status,
      ts,
      input.timelineNote,
      input.timelineOfficer,
    );
  } else if (input.assignedOfficerId && input.status === undefined) {
    addLetterTimelineEvent(
      id,
      'Ditugaskan',
      ts,
      input.timelineNote,
      input.timelineOfficer ?? input.assignedTo ?? undefined,
    );
  }

  const updated = getLetterById(id)!;
  if (input.status && input.status !== existing.status) {
    notifyUserByNik(updated.requesterNIK, {
      type: 'letter_status',
      title: 'Status Surat Diperbarui',
      message: `Pengajuan ${updated.requestNumber}: ${LETTER_STATUS_TIMELINE_LABEL[input.status] ?? input.status}`,
      link: 'letter-service',
    });
  }

  if (input.assignedOfficerId && input.auditActorId && input.auditActorName) {
    createAuditLog({
      actorId: input.auditActorId,
      actorName: input.auditActorName,
      action: 'assign_letter',
      entityType: 'letter',
      entityId: id,
      details: `Ditugaskan ke officer ${input.assignedOfficerId}`,
    });
  }

  return updated;
}

function generateLetterNumber(letterTypeId: string): string {
  return allocateLetterNumber(letterTypeId);
}

export interface CreateLetterInput {
  requesterUserId?: string;
  requesterName: string;
  requesterNIK: string;
  requesterPhone?: string;
  letterTypeId: string;
  letterTypeName: string;
  purpose: string;
  pickupDate?: string;
  attachmentFiles?: string[];
  status?: LetterStatus;
}

export function createLetter(input: CreateLetterInput): LetterRequest {
  ensureDbReady();
  const id = `L${Date.now()}`;
  const status = input.status ?? 'submitted';
  const requestNumber = status === 'draft' ? `DRAFT-${id}` : generateLetterNumber(input.letterTypeId);
  const ts = nowIso();

  db.prepare(
    `INSERT INTO letter_requests (
      id, request_number, requester_user_id, requester_name, requester_nik, requester_phone,
      letter_type, purpose, status, pickup_date, created_at, updated_at
    ) VALUES (
      @id, @requestNumber, @requesterUserId, @requesterName, @requesterNIK, @requesterPhone,
      @letterType, @purpose, @status, @pickupDate, @createdAt, @updatedAt
    )`,
  ).run({
    id,
    requestNumber,
    requesterUserId: input.requesterUserId ?? null,
    requesterName: input.requesterName,
    requesterNIK: input.requesterNIK,
    requesterPhone: input.requesterPhone ?? null,
    letterType: input.letterTypeName,
    purpose: input.purpose,
    status,
    pickupDate: input.pickupDate ?? null,
    createdAt: ts,
    updatedAt: ts,
  });

  const timelineLabel = status === 'draft' ? 'Draft disimpan' : 'Pengajuan dikirim';
  addLetterTimelineEvent(id, timelineLabel, ts);

  if (input.attachmentFiles?.length) {
    const insertAttachment = db.prepare(
      'INSERT INTO letter_attachments (letter_id, filename) VALUES (@letterId, @filename)',
    );
    for (const filename of input.attachmentFiles) {
      insertAttachment.run({ letterId: id, filename });
    }
  }

  if (input.requesterUserId) {
    logUserActivity(input.requesterUserId, 'create_letter', requestNumber);
  }

  return getLetterById(id)!;
}

export interface UpdateUserLetterInput {
  purpose?: string;
  pickupDate?: string;
  requesterPhone?: string;
  attachmentFiles?: string[];
  submit?: boolean;
  letterTypeId?: string;
  letterTypeName?: string;
}

export function updateUserLetter(id: string, requesterNik: string, input: UpdateUserLetterInput): LetterRequest {
  ensureDbReady();
  const existing = getLetterById(id);
  if (!existing) {
    throw new Error('Pengajuan surat tidak ditemukan');
  }
  if (existing.requesterNIK !== requesterNik) {
    throw new Error('Anda tidak dapat mengedit pengajuan ini');
  }
  if (existing.status !== 'draft') {
    throw new Error('Hanya draft yang dapat diedit');
  }

  const ts = nowIso();
  const updates: string[] = ['updated_at = @updatedAt'];
  const params: Record<string, string> = { id, updatedAt: ts };

  if (input.purpose !== undefined) {
    updates.push('purpose = @purpose');
    params.purpose = input.purpose;
  }
  if (input.pickupDate !== undefined) {
    updates.push('pickup_date = @pickupDate');
    params.pickupDate = input.pickupDate;
  }
  if (input.requesterPhone !== undefined) {
    updates.push('requester_phone = @requesterPhone');
    params.requesterPhone = input.requesterPhone;
  }
  if (input.submit) {
    updates.push('status = @status');
    params.status = 'submitted';
    if (existing.requestNumber.startsWith('DRAFT-') && input.letterTypeId) {
      const newNumber = generateLetterNumber(input.letterTypeId);
      updates.push('request_number = @requestNumber');
      params.requestNumber = newNumber;
    }
  }

  db.prepare(`UPDATE letter_requests SET ${updates.join(', ')} WHERE id = @id`).run(params);

  if (input.attachmentFiles?.length) {
    const insertAttachment = db.prepare(
      'INSERT INTO letter_attachments (letter_id, filename) VALUES (@letterId, @filename)',
    );
    for (const filename of input.attachmentFiles) {
      insertAttachment.run({ letterId: id, filename });
    }
  }

  if (input.submit) {
    addLetterTimelineEvent(id, 'Pengajuan dikirim', ts);
  } else {
    addLetterTimelineEvent(id, 'Draft diperbarui', ts);
  }

  return getLetterById(id)!;
}

export function listComplaints(
  filter?: { nik?: string; officerInbox?: { officerId: string } },
  pagination?: ListPagination,
): { items: Complaint[]; total: number } {
  ensureDbReady();
  let sql = 'SELECT * FROM complaints';
  let countSql = 'SELECT COUNT(*) as c FROM complaints';
  const params: Record<string, string> = {};
  const where: string[] = [];

  if (filter?.nik) {
    where.push('submitter_nik = @nik');
    params.nik = filter.nik;
  }
  if (filter?.officerInbox?.officerId) {
    where.push('assigned_officer_id = @officerInboxId');
    params.officerInboxId = filter.officerInbox.officerId;
  }
  if (where.length) {
    const clause = ` WHERE ${where.join(' AND ')}`;
    sql += clause;
    countSql += clause;
  }
  sql += ' ORDER BY created_at DESC';

  const total = (db.prepare(countSql).get(params) as { c: number }).c;

  if (pagination) {
    sql += ' LIMIT @limit OFFSET @offset';
    params.limit = String(pagination.limit);
    params.offset = String((pagination.page - 1) * pagination.limit);
  }

  const rows = db.prepare(sql).all(params) as Array<Record<string, unknown>>;
  return { items: rows.map(hydrateComplaint), total };
}

function loadComplaintFiles(complaintId: string): string[] {
  const rows = db
    .prepare('SELECT filename FROM complaint_files WHERE complaint_id = ?')
    .all(complaintId) as Array<{ filename: string }>;
  return rows.map((r) => r.filename);
}

function loadComplaintTimeline(complaintId: string): TimelineEvent[] {
  const rows = db
    .prepare(
      'SELECT status, timestamp, note, officer FROM complaint_timeline WHERE complaint_id = ? ORDER BY timestamp ASC',
    )
    .all(complaintId) as Array<{ status: string; timestamp: string; note: string | null; officer: string | null }>;

  return rows.map((t) => ({
    status: t.status,
    timestamp: t.timestamp,
    note: t.note ?? undefined,
    officer: t.officer ?? undefined,
  }));
}

function addComplaintTimelineEvent(
  complaintId: string,
  status: string,
  timestamp?: string,
  note?: string,
  officer?: string,
): void {
  db.prepare(
    'INSERT INTO complaint_timeline (complaint_id, status, timestamp, note, officer) VALUES (?, ?, ?, ?, ?)',
  ).run(complaintId, status, timestamp ?? nowIso(), note ?? null, officer ?? null);
}

const COMPLAINT_STATUS_TIMELINE_LABEL: Partial<Record<ComplaintStatus, string>> = {
  submitted: 'Pengaduan diterima',
  reviewing: 'Sedang ditinjau',
  processing: 'Sedang diproses',
  resolved: 'Pengaduan diselesaikan',
  closed: 'Pengaduan ditutup',
};

function hydrateComplaint(row: Record<string, unknown>): Complaint {
  const id = row.id as string;
  return {
    id,
    complaintNumber: row.complaint_number as string,
    submitterName: row.submitter_name as string,
    submitterNik: row.submitter_nik as string | undefined,
    category: row.category as ComplaintCategory,
    subject: row.subject as string,
    description: row.description as string,
    status: row.status as ComplaintStatus,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    response: row.response as string | undefined,
    responseDate: row.response_date as string | undefined,
    assignedTo: row.assigned_to as string | undefined,
    assignedOfficerId: row.assigned_officer_id as string | undefined,
    assignedBy: row.assigned_by as string | undefined,
    assignedAt: row.assigned_at as string | undefined,
    files: loadComplaintFiles(id),
    timeline: loadComplaintTimeline(id),
  };
}

export function getComplaintById(id: string): Complaint | null {
  ensureDbReady();
  const row = db.prepare('SELECT * FROM complaints WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined;
  return row ? hydrateComplaint(row) : null;
}

export interface UpdateComplaintInput {
  status?: ComplaintStatus;
  response?: string;
  assignedTo?: string;
  assignedOfficerId?: string | null;
  assignedBy?: string;
  timelineNote?: string;
  timelineOfficer?: string;
  auditActorId?: string;
  auditActorName?: string;
}

export function updateComplaint(id: string, input: UpdateComplaintInput): Complaint | null {
  ensureDbReady();
  const existing = getComplaintById(id);
  if (!existing) {
    return null;
  }

  if (
    input.status &&
    input.status !== existing.status &&
    !canTransitionComplaint(existing.status, input.status)
  ) {
    throw new Error(`Perubahan status pengaduan dari "${existing.status}" ke "${input.status}" tidak diizinkan`);
  }

  if (input.status === 'resolved' && !input.response?.trim() && !existing.response) {
    throw new Error('Tanggapan wajib diisi saat menyelesaikan pengaduan');
  }

  const ts = nowIso();
  const updates: string[] = ['updated_at = @updatedAt'];
  const params: Record<string, string | null> = { id, updatedAt: ts };

  if (input.status !== undefined) {
    updates.push('status = @status');
    params.status = input.status;
  }
  if (input.response !== undefined) {
    updates.push('response = @response');
    params.response = input.response;
    updates.push('response_date = @responseDate');
    params.responseDate = input.response ? ts : null;
  }
  if (input.assignedTo !== undefined) {
    updates.push('assigned_to = @assignedTo');
    params.assignedTo = input.assignedTo;
    updates.push('assigned_at = @assignedAt');
    params.assignedAt = ts;
  }
  if (input.assignedOfficerId !== undefined) {
    updates.push('assigned_officer_id = @assignedOfficerId');
    params.assignedOfficerId = input.assignedOfficerId;
    if (input.assignedOfficerId) {
      updates.push('assigned_at = @assignedAt');
      params.assignedAt = ts;
    }
  }
  if (input.assignedBy !== undefined) {
    updates.push('assigned_by = @assignedBy');
    params.assignedBy = input.assignedBy;
  }

  db.prepare(`UPDATE complaints SET ${updates.join(', ')} WHERE id = @id`).run(params);

  if (input.status && input.status !== existing.status) {
    addComplaintTimelineEvent(
      id,
      COMPLAINT_STATUS_TIMELINE_LABEL[input.status] ?? input.status,
      ts,
      input.timelineNote,
      input.timelineOfficer,
    );
  } else if (input.assignedOfficerId && input.status === undefined) {
    addComplaintTimelineEvent(
      id,
      'Ditugaskan',
      ts,
      input.timelineNote,
      input.timelineOfficer ?? input.assignedTo ?? undefined,
    );
  } else if (input.response && input.response !== existing.response) {
    addComplaintTimelineEvent(id, 'Tanggapan diberikan', ts, input.timelineNote, input.timelineOfficer);
  }

  const updated = getComplaintById(id)!;
  if (
    (input.status && input.status !== existing.status) ||
    (input.response && input.response !== existing.response)
  ) {
    if (updated.submitterNik) {
      notifyUserByNik(updated.submitterNik, {
        type: 'complaint_update',
        title: 'Pengaduan Ditanggapi',
        message: `Pengaduan ${updated.complaintNumber} telah diperbarui`,
        link: 'complaints',
      });
    }
  }

  if (input.auditActorId && input.auditActorName && input.status && input.status !== existing.status) {
    createAuditLog({
      actorId: input.auditActorId,
      actorName: input.auditActorName,
      action: 'update_complaint_status',
      entityType: 'complaint',
      entityId: id,
      details: `Status ${existing.status} → ${input.status}`,
    });
  }

  if (input.assignedOfficerId && input.auditActorId && input.auditActorName) {
    createAuditLog({
      actorId: input.auditActorId,
      actorName: input.auditActorName,
      action: 'assign_complaint',
      entityType: 'complaint',
      entityId: id,
      details: `Ditugaskan ke officer ${input.assignedOfficerId}`,
    });
  }

  return updated;
}

function generateComplaintNumber(): string {
  return allocateComplaintNumber();
}

export interface CreateComplaintInput {
  submitterUserId?: string;
  submitterName: string;
  submitterNik?: string;
  category: ComplaintCategory;
  subject: string;
  description: string;
  files?: string[];
}

export function createComplaint(input: CreateComplaintInput): Complaint {
  ensureDbReady();
  const id = `C${Date.now()}`;
  const complaintNumber = generateComplaintNumber();
  const ts = nowIso();

  db.prepare(
    `INSERT INTO complaints (
      id, complaint_number, submitter_user_id, submitter_name, submitter_nik,
      category, subject, description, status, created_at, updated_at
    ) VALUES (
      @id, @complaintNumber, @submitterUserId, @submitterName, @submitterNik,
      @category, @subject, @description, 'submitted', @createdAt, @updatedAt
    )`,
  ).run({
    id,
    complaintNumber,
    submitterUserId: input.submitterUserId ?? null,
    submitterName: input.submitterName,
    submitterNik: input.submitterNik ?? null,
    category: input.category,
    subject: input.subject,
    description: input.description,
    createdAt: ts,
    updatedAt: ts,
  });

  if (input.files?.length) {
    const insertFile = db.prepare(
      'INSERT INTO complaint_files (complaint_id, filename) VALUES (@complaintId, @filename)',
    );
    for (const filename of input.files) {
      insertFile.run({ complaintId: id, filename });
    }
  }

  addComplaintTimelineEvent(id, 'Pengaduan dibuat', ts);

  if (input.submitterUserId) {
    logUserActivity(input.submitterUserId, 'create_complaint', complaintNumber);
  }

  return getComplaintById(id)!;
}

export function listOfficers(): Officer[] {
  ensureDbReady();
  const rows = db.prepare('SELECT * FROM officers ORDER BY name').all() as Array<Record<string, unknown>>;

  return rows.map((row) => {
    const id = row.id as string;
    const division = (row.division as Officer['division']) ?? 'laporan';

    let assignedCases = 0;
    let completedCases = 0;

    if (division === 'laporan') {
      assignedCases = (
        db
          .prepare(
            `SELECT COUNT(*) as c FROM reports
             WHERE assigned_officer_id = ? AND status NOT IN ('completed', 'rejected')`,
          )
          .get(id) as { c: number }
      ).c;
      completedCases = (
        db
          .prepare(`SELECT COUNT(*) as c FROM reports WHERE assigned_officer_id = ? AND status = 'completed'`)
          .get(id) as { c: number }
      ).c;
    } else if (division === 'surat') {
      assignedCases = (
        db
          .prepare(
            `SELECT COUNT(*) as c FROM letter_requests
             WHERE assigned_officer_id = ? AND status NOT IN ('completed', 'rejected')`,
          )
          .get(id) as { c: number }
      ).c;
      completedCases = (
        db
          .prepare(`SELECT COUNT(*) as c FROM letter_requests WHERE assigned_officer_id = ? AND status = 'completed'`)
          .get(id) as { c: number }
      ).c;
    } else {
      assignedCases = (
        db
          .prepare(
            `SELECT COUNT(*) as c FROM complaints
             WHERE assigned_officer_id = ? AND status NOT IN ('resolved', 'closed')`,
          )
          .get(id) as { c: number }
      ).c;
      completedCases = (
        db
          .prepare(`SELECT COUNT(*) as c FROM complaints WHERE assigned_officer_id = ? AND status = 'resolved'`)
          .get(id) as { c: number }
      ).c;
    }

    return {
      id,
      userId: row.user_id as string | undefined,
      name: row.name as string,
      rank: row.rank as string,
      email: row.email as string,
      phone: row.phone as string,
      status: row.status as Officer['status'],
      division,
      assignedCases,
      completedCases,
    };
  });
}

export function getOfficerByUserId(userId: string): Officer | null {
  ensureDbReady();
  const row = db.prepare('SELECT id FROM officers WHERE user_id = ?').get(userId) as { id: string } | undefined;
  if (!row) return null;
  return getOfficerById(row.id);
}

export function getOfficerById(id: string): Officer | null {
  return listOfficers().find((o) => o.id === id) ?? null;
}
