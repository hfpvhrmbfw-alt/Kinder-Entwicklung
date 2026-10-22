/**
 * JSON-Backup: Export und Import aller Nutzerdaten.
 * Das Format ist gleichzeitig die Brücke zur späteren iOS-App.
 */
import { isValidDate } from './dates';
import {
  BACKUP_FORMAT,
  BACKUP_SCHEMA_VERSION,
  DEFAULT_SETTINGS,
  type Backup,
} from './models/user';

export type BackupData = Omit<Backup, 'format' | 'schemaVersion' | 'exportedAt' | 'appVersion'>;

export function createBackup(data: BackupData, appVersion: string, now: Date = new Date()): Backup {
  return {
    format: BACKUP_FORMAT,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    appVersion,
    ...data,
  };
}

export class BackupError extends Error {
  constructor(public readonly code: 'notJson' | 'wrongFormat' | 'tooNew' | 'invalid', detail?: string) {
    super(detail ? `${code}: ${detail}` : code);
  }
}

/**
 * Migrationen: Index = Ausgangsversion. Jede Funktion hebt das Backup um eine
 * Version an. Neue Felder immer mit Standardwerten ergänzen.
 */
const MIGRATIONS: Record<number, (b: Record<string, unknown>) => Record<string, unknown>> = {
  // 1: (b) => ({ ...b, schemaVersion: 2, neuesFeld: [] }),
};

function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/** Liest und prüft eine Backup-Datei. Wirft BackupError mit sprechendem Code. */
export function parseBackup(text: string): Backup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new BackupError('notJson');
  }
  if (!raw || typeof raw !== 'object' || (raw as Record<string, unknown>).format !== BACKUP_FORMAT) {
    throw new BackupError('wrongFormat');
  }
  let b = raw as Record<string, unknown>;
  let version = Number(b.schemaVersion);
  if (!Number.isInteger(version) || version < 1) throw new BackupError('invalid', 'schemaVersion');
  if (version > BACKUP_SCHEMA_VERSION) throw new BackupError('tooNew');
  while (version < BACKUP_SCHEMA_VERSION) {
    const migrate = MIGRATIONS[version];
    if (!migrate) throw new BackupError('invalid', `keine Migration ab Version ${version}`);
    b = migrate(b);
    version++;
  }

  for (const key of ['children', 'milestoneRecords', 'activityLogs', 'favorites', 'customActivities', 'planEntries', 'photos']) {
    if (b[key] === undefined) b[key] = [];
    if (!isArray(b[key])) throw new BackupError('invalid', key);
  }
  b.settings = { ...DEFAULT_SETTINGS, ...((b.settings as object) ?? {}) };
  // Seit 0.14.0; ältere Sicherungen haben die Felder nicht (kein neues schemaVersion nötig,
  // damit ältere App-Versionen neue Sicherungen weiter einspielen können).
  if (b.checkupRecords === undefined) b.checkupRecords = [];
  if (!isArray(b.checkupRecords)) throw new BackupError('invalid', 'checkupRecords');
  if (b.doctorQuestions === undefined) b.doctorQuestions = {};
  const questions = b.doctorQuestions;
  if (!questions || typeof questions !== 'object' || isArray(questions) || Object.values(questions).some((v) => typeof v !== 'string')) {
    throw new BackupError('invalid', 'doctorQuestions');
  }

  const backup = b as unknown as Backup;
  for (const c of backup.children) {
    if (typeof c.id !== 'string' || typeof c.name !== 'string' || !isValidDate(c.birthDate)) {
      throw new BackupError('invalid', 'children');
    }
    if (c.dueDate !== undefined && !isValidDate(c.dueDate)) throw new BackupError('invalid', 'children.dueDate');
  }
  const childIds = new Set(backup.children.map((c) => c.id));
  for (const r of backup.milestoneRecords) {
    if (!childIds.has(r.childId) || !isValidDate(r.achievedOn) || (r.dateUnknown !== undefined && typeof r.dateUnknown !== 'boolean')) {
      throw new BackupError('invalid', 'milestoneRecords');
    }
  }
  for (const l of backup.activityLogs) {
    if (!isValidDate(l.date) || !isArray(l.childIds)) throw new BackupError('invalid', 'activityLogs');
  }
  for (const r of backup.checkupRecords) {
    if (typeof r.id !== 'string' || typeof r.checkupId !== 'string' || !childIds.has(r.childId) || (r.doneOn !== undefined && !isValidDate(r.doneOn))) {
      throw new BackupError('invalid', 'checkupRecords');
    }
  }
  return backup;
}
