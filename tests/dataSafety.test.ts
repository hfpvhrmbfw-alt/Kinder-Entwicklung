import { describe, expect, it } from 'vitest';
import { backupReminderDue } from '../src/core/dataSafety';

const kids = [{ createdAt: '2026-09-01T10:00:00.000Z' }, { createdAt: '2026-10-01T10:00:00.000Z' }];

describe('Erinnerung an die Datensicherung', () => {
  it('ohne Kinder nie', () => {
    expect(backupReminderDue({}, [], new Date('2027-01-01'))).toBe(false);
  });
  it('ohne Sicherung 30 Tage nach dem ersten Profil', () => {
    expect(backupReminderDue({}, kids, new Date('2026-09-30T09:00:00Z'))).toBe(false);
    expect(backupReminderDue({}, kids, new Date('2026-10-01T10:00:00Z'))).toBe(true);
  });
  it('Sicherung oder „Später“ setzt die Frist neu', () => {
    expect(backupReminderDue({ lastBackupAt: '2026-10-10T00:00:00Z' }, kids, new Date('2026-11-01'))).toBe(false);
    expect(backupReminderDue({ lastBackupAt: '2026-08-01T00:00:00Z', backupReminderAt: '2026-10-20T00:00:00Z' }, kids, new Date('2026-11-01'))).toBe(false);
    expect(backupReminderDue({ lastBackupAt: '2026-10-10T00:00:00Z' }, kids, new Date('2026-11-10'))).toBe(true);
  });
});
