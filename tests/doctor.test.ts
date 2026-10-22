import { describe, expect, it } from 'vitest';
import { doctorOverview } from '../src/core/doctor';
import { makeMilestone } from './helpers';

describe('Übersicht für den Arzttermin', () => {
  const milestones = [
    makeMilestone({ id: 'sit', domain: 'grossMotor', window: { fromMonths: 4, toMonths: 9 } }),
    makeMilestone({ id: 'crawl', domain: 'grossMotor', window: { fromMonths: 6, toMonths: 12 } }),
    makeMilestone({ id: 'babble', domain: 'language', window: { fromMonths: 4, toMonths: 8 }, consultHintFromMonths: 9 }),
    makeMilestone({ id: 'grab', domain: 'fineMotor', window: { fromMonths: 3, toMonths: 6 } }),
    makeMilestone({ id: 'walk', domain: 'grossMotor', window: { fromMonths: 9, toMonths: 18 } }),
  ];

  it('geschafft seit dem letzten Termin, im Zeitfenster, ansprechen', () => {
    const o = doctorOverview({
      milestones,
      ageMonths: 10,
      today: '2026-10-22',
      since: '2026-08-01',
      records: [
        { id: '1', childId: 'c', milestoneId: 'sit', achievedOn: '2026-09-10' },
        { id: '2', childId: 'c', milestoneId: 'grab', achievedOn: '2026-05-01' },
        { id: '3', childId: 'c', milestoneId: 'walk', achievedOn: '2026-10-22', dateUnknown: true },
      ],
    });
    expect(o.since).toBe('2026-08-01');
    const gm = o.domains.find((d) => d.domain === 'grossMotor')!;
    expect(gm.achieved.map((a) => a.milestone.id)).toEqual(['sit']);
    expect(gm.inWindow.map((m) => m.id)).toEqual(['crawl']);
    expect(o.domains.find((d) => d.domain === 'language')!.consult.map((m) => m.id)).toEqual(['babble']);
    // Feinmotorik: vor dem Zeitraum geschafft, nichts offen → kein Abschnitt
    expect(o.domains.some((d) => d.domain === 'fineMotor')).toBe(false);
    expect(o.undated.map((m) => m.id)).toEqual(['walk']);
  });

  it('ohne letzte U: die letzten sechs Monate', () => {
    expect(doctorOverview({ milestones, ageMonths: 10, today: '2026-10-22', records: [] }).since).toBe('2026-04-22');
  });
});
