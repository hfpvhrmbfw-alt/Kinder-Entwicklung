/**
 * Nutzerdaten (lokal in IndexedDB, im Backup als JSON).
 * Gleiche Swift-Konventionen wie in content.ts.
 */
import type { Activity, ActivityOrigin } from './content';

/** "YYYY-MM-DD" ohne Uhrzeit. */
export type DateString = string;
/** ISO-8601-Zeitpunkt, z. B. "2026-10-08T10:30:00.000Z". */
export type Timestamp = string;

export interface Child {
  id: string;
  name: string;
  birthDate: DateString;
  /** Errechneter Geburtstermin; nur bei Frühgeburt relevant. */
  dueDate?: DateString;
  /** Korrigiertes Alter verwenden (wirkt nur bis 24 Monate). */
  useCorrectedAge: boolean;
  photoId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface MilestoneRecord {
  id: string;
  childId: string;
  milestoneId: string;
  /**
   * Seit wann das Kind es kann. Bei `dateUnknown` ist es nur der Tag des Abhakens
   * (bleibt gesetzt, damit ältere App-Versionen mit denselben Daten weiter funktionieren).
   */
  achievedOn: DateString;
  /** Abgehakt ohne bekanntes Datum; das Datum kann später nachgetragen werden. */
  dateUnknown?: boolean;
  note?: string;
}

export interface ActivityRef {
  source: ActivityOrigin;
  id: string;
}

export type Enjoyment = 'low' | 'medium' | 'high';

/** Eintrag im Verlauf / Tagebuch. */
export interface ActivityLog {
  id: string;
  childIds: string[];
  activityRef: ActivityRef;
  date: DateString;
  durationMinutes?: number;
  enjoyment?: Enjoyment;
  note?: string;
  photoIds: string[];
  createdAt: Timestamp;
}

export interface Favorite {
  activityRef: ActivityRef;
  addedAt: Timestamp;
}

/** U-Untersuchung als erledigt eingetragen. */
export interface CheckupRecord {
  id: string;
  childId: string;
  checkupId: string;
  /** Tag der Untersuchung; fehlt = erledigt, Datum unbekannt. */
  doneOn?: DateString;
}

export interface PlanEntry {
  id: string;
  childIds: string[];
  activityRef: ActivityRef;
  date: DateString;
  /** "HH:mm" */
  time?: string;
}

export type ThemePreference = 'system' | 'light' | 'dark';

export interface Settings {
  theme: ThemePreference;
  locale: 'de';
  activeChildId?: string;
  homeMaterials: string[];
  onboardingDone: boolean;
  disclaimerAcceptedAt?: Timestamp;
  /** Entwicklungsübersicht: welche Schritte gezeigt werden. Fehlt = nur offene. */
  milestoneView?: 'open' | 'achieved' | 'all';
  /** Ideen: schon gemachte (im Verlauf eingetragene) ausblenden. */
  hideDoneActivities?: boolean;
  /** Hinweis „Zum Home-Bildschirm hinzufügen“ weggeklickt. */
  installHintDismissed?: boolean;
  /** Letzte heruntergeladene Datensicherung. */
  lastBackupAt?: Timestamp;
  /** Erinnerung an die Datensicherung zuletzt mit „Später“ verschoben. */
  backupReminderAt?: Timestamp;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  locale: 'de',
  homeMaterials: [],
  onboardingDone: false,
};

export const BACKUP_FORMAT = 'kleine-schritte-backup';
export const BACKUP_SCHEMA_VERSION = 1;

export interface BackupPhoto {
  id: string;
  mimeType: string;
  dataBase64: string;
}

export interface Backup {
  format: typeof BACKUP_FORMAT;
  schemaVersion: number;
  exportedAt: Timestamp;
  appVersion: string;
  children: Child[];
  milestoneRecords: MilestoneRecord[];
  activityLogs: ActivityLog[];
  favorites: Favorite[];
  customActivities: Activity[];
  planEntries: PlanEntry[];
  settings: Settings;
  photos: BackupPhoto[];
  /** Seit 0.14.0; fehlt in älteren Sicherungen (dann leer). */
  checkupRecords: CheckupRecord[];
  /** Fragen für den Arzttermin je Kind (Schlüssel: Kind-ID). Seit 0.14.0. */
  doctorQuestions: Record<string, string>;
}
