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
  achievedOn: DateString;
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
}
