import { describe, expect, it } from 'vitest';
import { dailySuggestion, recommend, type RecommendInput } from '../src/core/recommend';
import { makeActivity, makeLog, makeMilestone } from './helpers';

const milestones = [
  makeMilestone({ id: 'ms-walk', domain: 'grossMotor', window: { fromMonths: 9, toMonths: 18 } }),
  makeMilestone({ id: 'ms-words', domain: 'language', window: { fromMonths: 10, toMonths: 18 } }),
];
const activities = [
  makeActivity({ id: 'a-walk-push', domains: { primary: 'grossMotor', secondary: [] }, relatedMilestoneIds: ['ms-walk'], category: 'movement' }),
  makeActivity({ id: 'a-book', domains: { primary: 'language', secondary: [] }, relatedMilestoneIds: ['ms-words'], category: 'languageReading' }),
  makeActivity({ id: 'a-puzzle', domains: { primary: 'cognition', secondary: [] } }),
  makeActivity({ id: 'a-crawl', domains: { primary: 'grossMotor', secondary: [] }, category: 'movement' }),
  makeActivity({ id: 'a-outside', location: 'outdoor', domains: { primary: 'socialEmotional', secondary: [] } }),
  makeActivity({ id: 'a-long', durationMinutes: { min: 45, max: 60 } }),
  makeActivity({ id: 'a-baby', ageRange: { minMonths: 0, maxMonths: 6 } }),
];

const base: RecommendInput = {
  activities,
  milestones,
  ageMonths: 12,
  today: '2026-10-08',
  milestoneRecords: [],
  logs: [],
  favoriteIds: [],
  seed: 'test',
  limit: 10,
};
const ids = (r: { activity: { id: string } }[]) => r.map((x) => x.activity.id);

describe('recommend', () => {
  it('ist deterministisch', () => {
    expect(ids(recommend(base))).toEqual(ids(recommend(base)));
    expect(ids(recommend({ ...base, activities: [...activities].reverse() }))).toEqual(ids(recommend(base)));
  });

  it('filtert Alter, Zeit und Ort hart', () => {
    const r = ids(recommend({ ...base, availableMinutes: 20, location: 'indoor' }));
    expect(r).not.toContain('a-baby');
    expect(r).not.toContain('a-long');
    expect(r).not.toContain('a-outside');
  });

  it('bevorzugt Aktivitäten zu laufenden, offenen Meilensteinen und begründet das', () => {
    const r = recommend({ ...base, limit: 2 });
    expect(ids(r).sort()).toEqual(['a-book', 'a-walk-push']);
    expect(r[0]!.reasons.some((x) => x.kind === 'activeMilestone')).toBe(true);
  });

  it('abgehakter Meilenstein verliert Vorrang', () => {
    const rec = [{ id: 'r', childId: 'c1', milestoneId: 'ms-walk', achievedOn: '2026-09-01' }];
    const r = recommend({ ...base, milestoneRecords: rec, limit: 1 });
    expect(ids(r)).toEqual(['a-book']);
  });

  it('kürzlich gemacht rutscht nach hinten', () => {
    const logs = [makeLog('a-book', '2026-10-07')];
    const r = ids(recommend({ ...base, logs }));
    expect(r.indexOf('a-book')).toBeGreaterThan(r.indexOf('a-walk-push'));
    expect(r.indexOf('a-book')).toBeGreaterThan(1);
  });

  it('sorgt für Vielfalt: zwei Grobmotorik-Aktivitäten nicht direkt vorne', () => {
    const r = ids(recommend({ ...base, limit: 3 }));
    expect(r.filter((id) => id === 'a-walk-push' || id === 'a-crawl').length).toBeLessThanOrEqual(1);
  });

  it('Materialcheck schließt fehlendes Pflichtmaterial aus', () => {
    const withMat = [...activities, makeActivity({ id: 'a-box', materials: [{ materialId: 'cardboard-box', optional: false }] })];
    expect(ids(recommend({ ...base, activities: withMat, availableMaterialIds: [] }))).not.toContain('a-box');
    expect(ids(recommend({ ...base, activities: withMat, availableMaterialIds: ['cardboard-box'] }))).toContain('a-box');
  });

  it('Tagesvorschlag ist stabil pro Tag und Kind', () => {
    const input = { activities, milestones, ageMonths: 12, today: '2026-10-08', milestoneRecords: [], logs: [], favoriteIds: [], childId: 'c1' };
    expect(dailySuggestion(input)?.activity.id).toBe(dailySuggestion(input)?.activity.id);
    expect(dailySuggestion({ ...input, activities: [] })).toBeUndefined();
  });
});
