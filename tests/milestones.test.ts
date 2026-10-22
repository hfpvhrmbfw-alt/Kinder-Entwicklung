import { describe, expect, it } from 'vitest';
import { activeMilestones, splitOverview, milestonePhase, milestoneStatus, milestonesForOverview, milestonesForView, upcomingMilestones } from '../src/core/milestones';
import { makeMilestone } from './helpers';

const sit = makeMilestone({ id: 'sit', window: { fromMonths: 4, toMonths: 9 }, consultHintFromMonths: 10 });
const walk = makeMilestone({ id: 'walk', window: { fromMonths: 8, toMonths: 18 } });
const words = makeMilestone({ id: 'words', domain: 'language', window: { fromMonths: 10, toMonths: 18 } });
const head = makeMilestone({ id: 'head', window: { fromMonths: 1, toMonths: 4 } });
const all = [sit, walk, words, head];

describe('Meilensteine', () => {
  it('Phase je Alter', () => {
    expect(milestonePhase(sit, 3)).toBe('upcoming');
    expect(milestonePhase(sit, 4)).toBe('inWindow');
    expect(milestonePhase(sit, 9)).toBe('afterWindow');
  });

  it('Hinweis nur mit quellengestützter Grenze und nur wenn nicht erreicht', () => {
    expect(milestoneStatus(sit, 9.5, []).showConsultHint).toBe(false);
    expect(milestoneStatus(sit, 10, []).showConsultHint).toBe(true);
    const rec = [{ id: 'r', childId: 'c', milestoneId: 'sit', achievedOn: '2026-01-01' }];
    expect(milestoneStatus(sit, 10, rec).showConsultHint).toBe(false);
    expect(milestoneStatus(walk, 30, []).showConsultHint).toBe(false);
  });

  it('Übersicht: Fenster überlappt das Band, plus frühere offene', () => {
    const band = { minMonths: 9, maxMonths: 12 };
    const rec = [{ id: 'r', childId: 'c', milestoneId: 'head', achievedOn: '2025-01-01' }];
    expect(milestonesForOverview(all, band, 10, rec).map((s) => s.milestone.id)).toEqual(['sit', 'walk', 'words']);
    expect(milestonesForOverview(all, band, 10, []).map((s) => s.milestone.id)).toEqual(['head', 'sit', 'walk', 'words']);
  });

  it('Ansichten: offen blendet Abgehaktes aus, geschafft zeigt alle Abgehakten', () => {
    const band = { minMonths: 9, maxMonths: 12 };
    const rec = [
      { id: 'r1', childId: 'c', milestoneId: 'head', achievedOn: '2025-01-01' },
      { id: 'r2', childId: 'c', milestoneId: 'walk', achievedOn: '2025-09-01', dateUnknown: true },
    ];
    const ids = (v: 'open' | 'achieved' | 'all') => milestonesForView(all, band, 10, rec, v).map((s) => s.milestone.id);
    expect(ids('open')).toEqual(['sit', 'words']);
    // „head“ liegt vor dem Band und erscheint trotzdem unter „Geschafft“
    expect(ids('achieved')).toEqual(['head', 'walk']);
    expect(ids('all')).toEqual(['sit', 'walk', 'words']);
  });

  it('Übersicht aufteilen: frühere offene eingeklappt, fällige Hinweise bleiben sichtbar', () => {
    const band = { minMonths: 12, maxMonths: 18 };
    const statuses = milestonesForOverview(all, band, 12, []);
    const { current, earlier } = splitOverview(statuses, band);
    expect(current.map((s) => s.milestone.id)).toEqual(['sit', 'walk', 'words']);
    expect(earlier.map((s) => s.milestone.id)).toEqual(['head']);
  });

  it('lange vorbei: ein Jahr nach Fensterende nur noch unter „Alle“, ohne Hinweis', () => {
    expect(milestoneStatus(sit, 21.9, []).longPast).toBe(false);
    expect(milestoneStatus(sit, 21.9, []).showConsultHint).toBe(true);
    const late = milestoneStatus(sit, 22, []);
    expect(late.longPast).toBe(true);
    expect(late.showConsultHint).toBe(false);
    const rec = [{ id: 'r', childId: 'c', milestoneId: 'sit', achievedOn: '2026-01-01' }];
    expect(milestoneStatus(sit, 30, rec).longPast).toBe(false);
    const band = { minMonths: 18, maxMonths: 24 };
    const ids = (v: 'open' | 'all') => milestonesForView(all, band, 22, [], v).map((s) => s.milestone.id);
    expect(ids('open')).toEqual(['walk', 'words']);
    expect(ids('all')).toEqual(['head', 'sit', 'walk', 'words']);
  });

  it('Vorschau auf die nächsten Monate', () => {
    expect(upcomingMilestones(all, 7, 3).map((m) => m.id)).toEqual(['walk', 'words']);
  });

  it('aktive Meilensteine: Fenster läuft, nicht abgehakt', () => {
    const rec = [{ id: 'r', childId: 'c', milestoneId: 'walk', achievedOn: '2026-01-01' }];
    expect(activeMilestones(all, 10, rec).map((m) => m.id)).toEqual(['words']);
  });
});
