import { db, ensureDbReady } from '@/lib/db';

const REFERENCE_PREFIXES = ['LP', 'ADU', 'SKCK', 'SKH', 'SKR', 'IZIN'] as const;
let countersSynced = false;

function getReferenceTable(prefix: string): { table: string; column: string } | null {
  if (prefix === 'LP') return { table: 'reports', column: 'report_number' };
  if (prefix === 'ADU') return { table: 'complaints', column: 'complaint_number' };
  if (['SKCK', 'SKH', 'SKR', 'IZIN'].includes(prefix)) {
    return { table: 'letter_requests', column: 'request_number' };
  }
  return null;
}

function getMaxExistingSequence(prefix: string, year: number): number {
  const referenceTable = getReferenceTable(prefix);
  if (!referenceTable) return 0;

  const rows = db
    .prepare(
      `SELECT ${referenceTable.column} AS referenceNumber
       FROM ${referenceTable.table}
       WHERE ${referenceTable.column} LIKE ?`,
    )
    .all(`${prefix}/%/V/${year}`) as Array<{ referenceNumber: string }>;

  return rows.reduce((max, row) => {
    const [, sequence] = row.referenceNumber.split('/');
    const value = Number(sequence);
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, 0);
}

function ensureCountersSynced(): void {
  if (countersSynced) return;
  ensureDbReady();
  const year = new Date().getFullYear();

  for (const prefix of REFERENCE_PREFIXES) {
    db.prepare(
      'INSERT OR IGNORE INTO reference_counters (prefix, year, last_value) VALUES (?, ?, 0)',
    ).run(prefix, year);

    const maxExisting = getMaxExistingSequence(prefix, year);
    if (maxExisting > 0) {
      db.prepare(
        `UPDATE reference_counters
         SET last_value = MAX(last_value, ?)
         WHERE prefix = ? AND year = ?`,
      ).run(maxExisting, prefix, year);
    }
  }

  countersSynced = true;
}

export function allocateReferenceNumber(prefix: string, pad = 3): string {
  ensureDbReady();
  ensureCountersSynced();
  const year = new Date().getFullYear();

  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare(
      'INSERT OR IGNORE INTO reference_counters (prefix, year, last_value) VALUES (?, ?, 0)',
    ).run(prefix, year);

    const maxExisting = getMaxExistingSequence(prefix, year);
    db.prepare(
      `UPDATE reference_counters
       SET last_value = MAX(last_value, ?)
       WHERE prefix = ? AND year = ?`,
    ).run(maxExisting, prefix, year);

    db.prepare(
      'UPDATE reference_counters SET last_value = last_value + 1 WHERE prefix = ? AND year = ?',
    ).run(prefix, year);

    const row = db
      .prepare('SELECT last_value as v FROM reference_counters WHERE prefix = ? AND year = ?')
      .get(prefix, year) as { v: number };

    db.exec('COMMIT');

    const seq = String(row.v).padStart(pad, '0');
    return `${prefix}/${seq}/V/${year}`;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export function allocateReportNumber(): string {
  return allocateReferenceNumber('LP');
}

export function allocateLetterNumber(letterTypeId: string): string {
  const prefix =
    letterTypeId === 'skck'
      ? 'SKCK'
      : letterTypeId === 'kehilangan'
        ? 'SKH'
        : letterTypeId === 'kerusakan'
          ? 'SKR'
          : 'IZIN';
  return allocateReferenceNumber(prefix);
}

export function allocateComplaintNumber(): string {
  return allocateReferenceNumber('ADU');
}
