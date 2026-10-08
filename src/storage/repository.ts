/**
 * Zugriff auf Nutzerdaten. Die UI spricht nur mit dieser Klasse, nie direkt mit IndexedDB.
 * So kann die Speichertechnik später getauscht werden, ohne UI oder Logik anzufassen.
 */
import type { IDBPDatabase } from 'idb';
import type { BackupData } from '../core/backup';
import type { Activity } from '../core/models/content';
import {
  DEFAULT_SETTINGS,
  type ActivityLog,
  type ActivityRef,
  type BackupPhoto,
  type Child,
  type Favorite,
  type MilestoneRecord,
  type PlanEntry,
  type Settings,
} from '../core/models/user';
import { openAppDB, type AppDB, type StoredPhoto } from './db';

const SETTINGS_KEY = 'settings';

export function favoriteKey(ref: ActivityRef): string {
  return `${ref.source}:${ref.id}`;
}

export function newId(): string {
  return crypto.randomUUID();
}

export class Repository {
  private constructor(private readonly db: IDBPDatabase<AppDB>) {}

  static async open(name?: string): Promise<Repository> {
    return new Repository(await openAppDB(name));
  }

  close(): void {
    this.db.close();
  }

  // --- Einstellungen ---
  async getSettings(): Promise<Settings> {
    return { ...DEFAULT_SETTINGS, ...((await this.db.get('settings', SETTINGS_KEY)) ?? {}) };
  }
  async saveSettings(settings: Settings): Promise<void> {
    await this.db.put('settings', settings, SETTINGS_KEY);
  }

  // --- Kinder ---
  async listChildren(): Promise<Child[]> {
    const all = await this.db.getAll('children');
    return all.sort((a, b) => a.birthDate.localeCompare(b.birthDate));
  }
  async saveChild(child: Child): Promise<void> {
    await this.db.put('children', child);
  }
  /** Löscht ein Kind samt seiner Meilensteine; Verlaufseinträge verlieren nur den Bezug. */
  async deleteChild(id: string): Promise<void> {
    const tx = this.db.transaction(['children', 'milestoneRecords', 'activityLogs', 'photos'], 'readwrite');
    const child = await tx.objectStore('children').get(id);
    if (child?.photoId) await tx.objectStore('photos').delete(child.photoId);
    await tx.objectStore('children').delete(id);
    const recs = await tx.objectStore('milestoneRecords').index('byChild').getAllKeys(id);
    for (const key of recs) await tx.objectStore('milestoneRecords').delete(key);
    const logStore = tx.objectStore('activityLogs');
    for (const log of await logStore.getAll()) {
      if (!log.childIds.includes(id)) continue;
      const rest = log.childIds.filter((c) => c !== id);
      if (rest.length) await logStore.put({ ...log, childIds: rest });
      else await logStore.delete(log.id);
    }
    await tx.done;
  }

  // --- Meilensteine ---
  async listMilestoneRecords(childId: string): Promise<MilestoneRecord[]> {
    return this.db.getAllFromIndex('milestoneRecords', 'byChild', childId);
  }
  async saveMilestoneRecord(record: MilestoneRecord): Promise<void> {
    await this.db.put('milestoneRecords', record);
  }
  async deleteMilestoneRecord(id: string): Promise<void> {
    await this.db.delete('milestoneRecords', id);
  }

  // --- Verlauf ---
  async listLogs(childId?: string): Promise<ActivityLog[]> {
    const all = await this.db.getAll('activityLogs');
    return all
      .filter((l) => !childId || l.childIds.includes(childId))
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }
  async saveLog(log: ActivityLog): Promise<void> {
    await this.db.put('activityLogs', log);
  }
  async deleteLog(id: string): Promise<void> {
    await this.db.delete('activityLogs', id);
  }

  // --- Favoriten ---
  async listFavorites(): Promise<Favorite[]> {
    return this.db.getAll('favorites');
  }
  async setFavorite(ref: ActivityRef, on: boolean): Promise<void> {
    if (on) await this.db.put('favorites', { activityRef: ref, addedAt: new Date().toISOString() }, favoriteKey(ref));
    else await this.db.delete('favorites', favoriteKey(ref));
  }

  // --- Eigene Aktivitäten / Wochenplan (Phase 2/3, Struktur steht schon) ---
  async listCustomActivities(): Promise<Activity[]> {
    return this.db.getAll('customActivities');
  }
  async listPlanEntries(): Promise<PlanEntry[]> {
    return this.db.getAll('planEntries');
  }

  // --- Fotos ---
  async getPhoto(id: string): Promise<StoredPhoto | undefined> {
    return this.db.get('photos', id);
  }

  // --- Backup ---
  async exportData(): Promise<BackupData> {
    const photos: BackupPhoto[] = [];
    for (const p of await this.db.getAll('photos')) {
      photos.push({ id: p.id, mimeType: p.mimeType, dataBase64: await blobToBase64(p.blob) });
    }
    const favorites = await this.db.getAll('favorites');
    return {
      children: await this.db.getAll('children'),
      milestoneRecords: await this.db.getAll('milestoneRecords'),
      activityLogs: await this.db.getAll('activityLogs'),
      favorites,
      customActivities: await this.db.getAll('customActivities'),
      planEntries: await this.db.getAll('planEntries'),
      settings: await this.getSettings(),
      photos,
    };
  }

  /** Ersetzt ALLE Nutzerdaten durch das Backup (in einer Transaktion). */
  async replaceAll(data: BackupData): Promise<void> {
    const stores = ['children', 'milestoneRecords', 'activityLogs', 'favorites', 'customActivities', 'planEntries', 'photos', 'settings'] as const;
    const tx = this.db.transaction([...stores], 'readwrite');
    for (const s of stores) await tx.objectStore(s).clear();
    for (const c of data.children) await tx.objectStore('children').put(c);
    for (const r of data.milestoneRecords) await tx.objectStore('milestoneRecords').put(r);
    for (const l of data.activityLogs) await tx.objectStore('activityLogs').put(l);
    for (const f of data.favorites) await tx.objectStore('favorites').put(f, favoriteKey(f.activityRef));
    for (const a of data.customActivities) await tx.objectStore('customActivities').put(a);
    for (const p of data.planEntries) await tx.objectStore('planEntries').put(p);
    for (const p of data.photos) {
      await tx.objectStore('photos').put({ id: p.id, mimeType: p.mimeType, createdAt: new Date().toISOString(), blob: base64ToBlob(p.dataBase64, p.mimeType) });
    }
    await tx.objectStore('settings').put(data.settings, SETTINGS_KEY);
    await tx.done;
  }
}

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

function base64ToBlob(data: string, mimeType: string): Blob {
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}
