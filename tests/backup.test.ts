import { describe, expect, it } from 'vitest';
import { BackupError, createBackup, parseBackup, type BackupData } from '../src/core/backup';
import { DEFAULT_SETTINGS } from '../src/core/models/user';

const data: BackupData = {
  children: [{ id: 'c1', name: 'Mia', birthDate: '2025-03-14', useCorrectedAge: false, createdAt: 'x', updatedAt: 'x' }],
  milestoneRecords: [{ id: 'r1', childId: 'c1', milestoneId: 'gm-sit', achievedOn: '2025-10-01' }],
  activityLogs: [],
  favorites: [],
  customActivities: [],
  planEntries: [],
  settings: DEFAULT_SETTINGS,
  photos: [],
};

describe('Backup', () => {
  it('Rundreise Export → Import', () => {
    const backup = createBackup(data, '0.1.0', new Date('2026-10-08T10:00:00Z'));
    const parsed = parseBackup(JSON.stringify(backup));
    expect(parsed).toEqual(backup);
  });

  it('erkennt fremde Dateien', () => {
    expect(() => parseBackup('kein json')).toThrowError(BackupError);
    expect(() => parseBackup('{"foo":1}')).toThrow(/wrongFormat/);
  });

  it('lehnt neuere Versionen ab', () => {
    const b = { ...createBackup(data, '0.1.0'), schemaVersion: 99 };
    expect(() => parseBackup(JSON.stringify(b))).toThrow(/tooNew/);
  });

  it('prüft Verweise und Datumsformate', () => {
    const b = createBackup({ ...data, milestoneRecords: [{ id: 'r', childId: 'fremd', milestoneId: 'm', achievedOn: '2025-01-01' }] }, '0.1.0');
    expect(() => parseBackup(JSON.stringify(b))).toThrow(/milestoneRecords/);
    const c = createBackup({ ...data, children: [{ ...data.children[0]!, birthDate: '14.03.2025' }] }, '0.1.0');
    expect(() => parseBackup(JSON.stringify(c))).toThrow(/children/);
  });

  it('übernimmt Meilensteine ohne bekanntes Datum', () => {
    const r = { id: 'r2', childId: 'c1', milestoneId: 'gm-walk', achievedOn: '2026-10-21', dateUnknown: true };
    const b = createBackup({ ...data, milestoneRecords: [...data.milestoneRecords, r] }, '0.3.0');
    expect(parseBackup(JSON.stringify(b)).milestoneRecords[1]).toEqual(r);
    const bad = createBackup({ ...data, milestoneRecords: [{ ...r, dateUnknown: 'ja' as unknown as boolean }] }, '0.3.0');
    expect(() => parseBackup(JSON.stringify(bad))).toThrow(/milestoneRecords/);
  });

  it('ergänzt fehlende Listen und Einstellungen', () => {
    const minimal = { format: 'kleine-schritte-backup', schemaVersion: 1, exportedAt: 'x', appVersion: '0', children: [] };
    const parsed = parseBackup(JSON.stringify(minimal));
    expect(parsed.activityLogs).toEqual([]);
    expect(parsed.settings.theme).toBe('system');
  });
});
