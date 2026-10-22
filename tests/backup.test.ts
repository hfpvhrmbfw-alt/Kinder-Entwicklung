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
  checkupRecords: [],
  doctorQuestions: {},
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

  it('übernimmt U-Untersuchungen und Arztfragen, ältere Sicherungen bekommen leere Werte', () => {
    const withData = createBackup(
      { ...data, checkupRecords: [{ id: 'u', childId: 'c1', checkupId: 'u5', doneOn: '2025-09-20' }, { id: 'v', childId: 'c1', checkupId: 'u4' }], doctorQuestions: { c1: 'Schlaf?' } },
      '0.14.0',
    );
    expect(parseBackup(JSON.stringify(withData))).toEqual(withData);
    const { checkupRecords: _c, doctorQuestions: _d, ...old } = createBackup(data, '0.13.0');
    const parsed = parseBackup(JSON.stringify(old));
    expect(parsed.checkupRecords).toEqual([]);
    expect(parsed.doctorQuestions).toEqual({});
  });

  it('prüft U-Untersuchungen und Arztfragen', () => {
    const bad = (patch: Partial<BackupData>) => JSON.stringify(createBackup({ ...data, ...patch }, '0.14.0'));
    expect(() => parseBackup(bad({ checkupRecords: [{ id: 'u', childId: 'fremd', checkupId: 'u5' }] }))).toThrow(/checkupRecords/);
    expect(() => parseBackup(bad({ checkupRecords: [{ id: 'u', childId: 'c1', checkupId: 'u5', doneOn: '20.09.2025' }] }))).toThrow(/checkupRecords/);
    expect(() => parseBackup(bad({ doctorQuestions: { c1: 3 as unknown as string } }))).toThrow(/doctorQuestions/);
  });
});
