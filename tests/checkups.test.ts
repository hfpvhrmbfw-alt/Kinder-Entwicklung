import { describe, expect, it } from 'vitest';
import { checkupStatus, checkupStatuses, checkupWindow, currentCheckup, lastDoneCheckup, nextCheckup, CHECKUP_SOON_DAYS } from '../src/core/checkups';
import { addDays } from '../src/core/dates';
import type { Checkup } from '../src/core/models/content';
import checkups from '../content/checkups.json';

const all = checkups as Checkup[];
const byId = (id: string) => all.find((c) => c.id === id)!;
const birth = '2026-01-31';

describe('U-Untersuchungen: Zeiträume', () => {
  it('U1 bis U9 inklusive U7a, in zeitlicher Reihenfolge', () => {
    expect(checkupStatuses(all, birth, birth, []).map((s) => s.checkup.name)).toEqual(['U1', 'U2', 'U3', 'U4', 'U5', 'U6', 'U7', 'U7a', 'U8', 'U9']);
  });

  it('U1 ist der Geburtstag', () => {
    expect(checkupWindow(byId('u1'), birth)).toEqual({ start: birth, end: birth });
  });

  it('U2: 3.–10. Lebenstag', () => {
    expect(checkupWindow(byId('u2'), '2026-03-01')).toEqual({ start: '2026-03-03', end: '2026-03-10' });
  });

  it('U3: 4.–5. Lebenswoche', () => {
    expect(checkupWindow(byId('u3'), '2026-03-01')).toEqual({ start: '2026-03-22', end: '2026-04-04' });
  });

  it('U4: 3.–4. Lebensmonat, Monatsende wird gekürzt', () => {
    // 31. Januar + 2 Monate = 31. März; + 4 Monate = 31. Mai, letzter Tag also 30. Mai
    expect(checkupWindow(byId('u4'), birth)).toEqual({ start: '2026-03-31', end: '2026-05-30' });
    expect(checkupWindow(byId('u4'), '2025-12-31')).toEqual({ start: '2026-02-28', end: '2026-04-29' });
  });

  it('U9: 60.–64. Lebensmonat', () => {
    expect(checkupWindow(byId('u9'), '2021-06-15')).toEqual({ start: '2026-05-15', end: '2026-10-14' });
  });
});

describe('U-Untersuchungen: Status', () => {
  const u5 = byId('u5'); // 6.–7. Lebensmonat → 2026-06-30 bis 2026-08-30
  it('Phasen über die Zeit', () => {
    expect(checkupStatus(u5, birth, '2026-05-01', []).phase).toBe('upcoming');
    expect(checkupStatus(u5, birth, addDays('2026-06-30', -CHECKUP_SOON_DAYS - 1), []).phase).toBe('upcoming');
    expect(checkupStatus(u5, birth, addDays('2026-06-30', -CHECKUP_SOON_DAYS), []).phase).toBe('soon');
    expect(checkupStatus(u5, birth, '2026-06-30', []).phase).toBe('due');
    expect(checkupStatus(u5, birth, '2026-08-30', []).phase).toBe('due');
    expect(checkupStatus(u5, birth, '2026-08-31', []).phase).toBe('past');
  });

  it('Eingetragen ist erledigt, egal wann', () => {
    const r = { id: 'r', childId: 'c', checkupId: 'u5' };
    expect(checkupStatus(u5, birth, '2026-05-01', [r]).phase).toBe('done');
    expect(checkupStatus(u5, birth, '2027-05-01', [r]).record).toEqual(r);
  });

  it('aktuelle, nächste und letzte Untersuchung', () => {
    const records = [
      { id: 'a', childId: 'c', checkupId: 'u2', doneOn: '2026-02-05' },
      { id: 'b', childId: 'c', checkupId: 'u3', doneOn: '2026-03-01' },
      { id: 'c', childId: 'c', checkupId: 'u1' },
    ];
    const statuses = checkupStatuses(all, birth, '2026-03-20', records);
    expect(currentCheckup(statuses)?.checkup.id).toBe('u4'); // beginnt am 31.3., also „bald“
    expect(nextCheckup(statuses)?.checkup.id).toBe('u4');
    expect(lastDoneCheckup(statuses)?.checkup.id).toBe('u3');
    // U5 vorbei, U6 beginnt erst in über sechs Wochen
    expect(currentCheckup(checkupStatuses(all, birth, '2026-09-10', records))).toBeUndefined();
    expect(nextCheckup(checkupStatuses(all, birth, '2026-09-10', records))?.checkup.id).toBe('u6');
  });
});
