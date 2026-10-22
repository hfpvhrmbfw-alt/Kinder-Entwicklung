/**
 * IndexedDB-Schema und Migrationen.
 * Jede Schema-Änderung: DB_VERSION erhöhen und einen neuen `if (oldVersion < n)`-Block ergänzen.
 * Swift-Pendant: SwiftData-Modelle mit VersionedSchema.
 *
 * Achtung: Alle Versionen unter /v/<version>/ teilen sich diese Datenbank. Öffnet die neue Version sie
 * mit einer höheren DB_VERSION, starten ältere Versionen nicht mehr (VersionError). Neue Datenarten
 * deshalb möglichst ohne neuen Store ablegen: kleine Listen als eigener Schlüssel im Store `settings`
 * (siehe KV_KEYS), den ältere Versionen nur unter dem Schlüssel „settings“ lesen.
 */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Activity } from '../core/models/content';
import type {
  ActivityLog,
  CheckupRecord,
  Child,
  Favorite,
  MilestoneRecord,
  PlanEntry,
  Settings,
} from '../core/models/user';

export const DB_NAME = 'kleine-schritte';
export const DB_VERSION = 1;

export interface StoredPhoto {
  id: string;
  mimeType: string;
  createdAt: string;
  blob: Blob;
}

export interface AppDB extends DBSchema {
  children: { key: string; value: Child };
  milestoneRecords: { key: string; value: MilestoneRecord; indexes: { byChild: string } };
  activityLogs: { key: string; value: ActivityLog; indexes: { byDate: string } };
  /** Schlüssel: `${source}:${id}` */
  favorites: { key: string; value: Favorite };
  customActivities: { key: string; value: Activity };
  planEntries: { key: string; value: PlanEntry; indexes: { byDate: string } };
  photos: { key: string; value: StoredPhoto };
  /** Schlüssel-Wert-Speicher: „settings“ plus die Einträge aus KV_KEYS. */
  settings: { key: string; value: Settings | CheckupRecord[] | Record<string, string> };
}

/** Zusätzliche Schlüssel im Store `settings` (seit 0.14.0). */
export const KV_KEYS = { settings: 'settings', checkupRecords: 'checkupRecords', doctorQuestions: 'doctorQuestions' } as const;

export type StoreName = 'children' | 'milestoneRecords' | 'activityLogs' | 'favorites' | 'customActivities' | 'planEntries' | 'photos' | 'settings';

export function openAppDB(name = DB_NAME): Promise<IDBPDatabase<AppDB>> {
  return openDB<AppDB>(name, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        db.createObjectStore('children', { keyPath: 'id' });
        db.createObjectStore('milestoneRecords', { keyPath: 'id' }).createIndex('byChild', 'childId');
        db.createObjectStore('activityLogs', { keyPath: 'id' }).createIndex('byDate', 'date');
        db.createObjectStore('favorites');
        db.createObjectStore('customActivities', { keyPath: 'id' });
        db.createObjectStore('planEntries', { keyPath: 'id' }).createIndex('byDate', 'date');
        db.createObjectStore('photos', { keyPath: 'id' });
        db.createObjectStore('settings');
      }
    },
  });
}
