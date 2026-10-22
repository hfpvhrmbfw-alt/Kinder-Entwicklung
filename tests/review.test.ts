import { describe, expect, it } from 'vitest';
import { buildReview, memories, periodStart } from '../src/core/review';
import { makeActivity, makeLog, makeMilestone } from './helpers';

const milestones = [makeMilestone({ id: 'walk', domain: 'grossMotor' }), makeMilestone({ id: 'word', domain: 'language' })];
const activities = [makeActivity({ id: 'ball', domains: { primary: 'grossMotor', secondary: [] } }), makeActivity({ id: 'book', domains: { primary: 'language', secondary: [] } })];

describe('Rückblick', () => {
  it('Zeiträume', () => {
    expect(periodStart('3m', '2026-10-22')).toBe('2026-07-23');
    expect(periodStart('12m', '2026-10-22')).toBe('2025-10-23');
    expect(periodStart('all', '2026-10-22')).toBeUndefined();
  });

  it('zählt nur den Zeitraum und nur Schritte mit Datum', () => {
    const r = buildReview({
      milestones,
      activities,
      records: [
        { id: '1', childId: 'c1', milestoneId: 'walk', achievedOn: '2026-09-01' },
        { id: '2', childId: 'c1', milestoneId: 'word', achievedOn: '2026-01-01' },
        { id: '3', childId: 'c1', milestoneId: 'word', achievedOn: '2026-10-01', dateUnknown: true },
        { id: '4', childId: 'c1', milestoneId: 'gibtsnicht', achievedOn: '2026-10-01' },
      ],
      logs: [
        makeLog('ball', '2026-10-01', { id: 'a', enjoyment: 'high', note: ' Hat gelacht ' }),
        makeLog('ball', '2026-10-02', { id: 'b' }),
        makeLog('book', '2026-10-03', { id: 'c', enjoyment: 'high' }),
        makeLog('book', '2026-01-03', { id: 'd' }),
      ],
      from: '2026-07-23',
      to: '2026-10-22',
    });
    expect(r.milestones.map((m) => m.milestone.id)).toEqual(['walk']);
    expect(r.played).toBe(3);
    expect(r.distinctIdeas).toBe(2);
    expect(r.favorites.map((f) => [f.activityId, f.loved, f.count])).toEqual([
      ['ball', 1, 2],
      ['book', 1, 1],
    ]);
    expect(r.domains).toEqual([
      { domain: 'grossMotor', milestones: 1, ideas: 1 },
      { domain: 'language', milestones: 0, ideas: 1 },
    ]);
    expect(r.notes).toEqual([{ date: '2026-10-01', activityId: 'ball', text: 'Hat gelacht' }]);
  });

  it('einmal gespielt ohne Begeisterung ist kein Favorit', () => {
    const r = buildReview({ milestones, activities, records: [], logs: [makeLog('ball', '2026-10-01')], to: '2026-10-22' });
    expect(r.favorites).toEqual([]);
    expect(r.played).toBe(1);
  });

  it('Erinnerungen ungefähr auf den Tag vor einem oder mehreren Jahren', () => {
    const m = memories(
      '2026-10-22',
      [
        { id: '1', childId: 'c1', milestoneId: 'walk', achievedOn: '2025-10-20' },
        { id: '2', childId: 'c1', milestoneId: 'word', achievedOn: '2025-10-22', dateUnknown: true },
        { id: '3', childId: 'c1', milestoneId: 'word', achievedOn: '2025-09-01' },
      ],
      [makeLog('book', '2024-10-25', { enjoyment: 'high' }), makeLog('ball', '2025-10-22'), makeLog('ball', '2025-10-23', { note: 'Erster Wurf!' })],
    );
    expect(m.map((x) => [x.yearsAgo, x.kind, x.id])).toEqual([
      [1, 'milestone', 'walk'],
      [1, 'activity', 'ball'],
      [2, 'activity', 'book'],
    ]);
    expect(m[1]!.note).toBe('Erster Wurf!');
  });
});
