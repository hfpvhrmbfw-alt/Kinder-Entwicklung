/**
 * IndexedDB-Schema und Migrationen.
 * Jede Schema-Änderung: DB_VERSION erhöhen und einen neuen `if (oldVersion < n)`-Block ergänzen.
 * Swift-Pendant: SwiftData-Modelle mit VersionedSchema.
 */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Activity } from '../core/models/content';
import type {
  ActivityLog,
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
  settings: { key: string; value: Settings };
}

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
