/**
 * Gemeinsame Testfälle für Web und iPhone-App (ios/KleineSchritteCore).
 *
 * Rechnet mit dem echten Content eine Reihe fester Fälle durch und vergleicht sie mit
 * tests/fixtures/parity.json. Dieselbe Datei liest die Swift-Testsuite; so rechnen beide Apps gleich.
 * Nach einer gewollten Änderung an Logik oder Content neu erzeugen:
 *   UPDATE_FIXTURES=1 npx vitest run tests/parity.test.ts
 */
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadContent } from '../src/content/loader';
import { childAge } from '../src/core/age';
import { checkupStatuses } from '../src/core/checkups';
import { doctorOverview } from '../src/core/doctor';
import { filterActivities, type ActivityFilter } from '../src/core/filter';
import { buildIcs } from '../src/core/ics';
import { milestonesForView, type MilestoneView } from '../src/core/milestones';
import { hashString, seededRandom } from '../src/core/random';
import { dailySuggestion, recommend } from '../src/core/recommend';
import { buildReview, memories } from '../src/core/review';
import { ageBandFor } from '../src/core/age';
import type { ActivityLog, CheckupRecord, MilestoneRecord } from '../src/core/models/user';

const FIXTURE = new URL('./fixtures/parity.json', import.meta.url);
const content = loadContent();
const round = (n: number) => Math.round(n * 1e6) / 1e6;

const log = (id: string, date: string, extra: Partial<ActivityLog> = {}): ActivityLog => ({
  id: `log-${id}-${date}`,
  childIds: ['kind'],
  activityRef: { source: 'builtin', id },
  date,
  photoIds: [],
  createdAt: `${date}T10:00:00.000Z`,
  ...extra,
});
const rec = (milestoneId: string, achievedOn: string, dateUnknown = false): MilestoneRecord => ({
  id: `r-${milestoneId}`,
  childId: 'kind',
  milestoneId,
  achievedOn,
  ...(dateUnknown ? { dateUnknown: true } : {}),
});

/** Eingaben der Fälle. Die Swift-Tests lesen sie aus der Fixture, nicht aus diesem Code. */
const inputs = {
  random: ['test', 'daily:2026-10-23:kind', 'Kleine Schritte äöü'],
  recommend: [
    { name: 'Baby 2 Monate', ageMonths: 2.1, today: '2026-10-23', seed: 's1', records: [], logs: [], favoriteIds: [] },
    {
      name: '9 Monate mit Verlauf',
      ageMonths: 9.4,
      today: '2026-10-23',
      seed: 's2',
      records: [rec('gm-sits-without-support', '2026-09-01')],
      logs: [log('a-peekaboo', '2026-10-21', { enjoyment: 'high' }), log('a-tummy-time-mirror', '2026-10-01', { enjoyment: 'low' })],
      favoriteIds: ['a-peekaboo'],
    },
    { name: '2 Jahre draußen, 15 Minuten', ageMonths: 26, today: '2026-10-23', seed: 's3', records: [], logs: [], favoriteIds: [], availableMinutes: 15, location: 'outdoor' as const },
    { name: '4 Jahre drinnen', ageMonths: 50.2, today: '2026-10-23', seed: 's4', records: [], logs: [], favoriteIds: [], location: 'indoor' as const },
    { name: 'Schulkind', ageMonths: 78, today: '2026-10-23', seed: 's5', records: [], logs: [], favoriteIds: [], limit: 8 },
  ],
  daily: [
    { childId: 'kind', ageMonths: 14.5, today: '2026-10-23' },
    { childId: 'kind', ageMonths: 14.5, today: '2026-10-24' },
    { childId: 'geschwister', ageMonths: 40, today: '2026-10-23' },
  ],
  filter: [
    { name: 'Suche Ball, 30 Monate', filter: { ageMonths: 30, ageToleranceMonths: 2, query: 'Ball' } },
    { name: 'Sprache 12 Monate, wenig Vorbereitung', filter: { ageMonths: 12, domains: ['language'], prepEfforts: ['none', 'low'] } },
    { name: 'Suche mit Umlaut', filter: { query: 'schütten' } },
    { name: 'Gruppe, draußen, 5 Jahre', filter: { ageMonths: 60, socialSettings: ['group'], location: 'outdoor' } },
  ] as { name: string; filter: ActivityFilter }[],
  age: [
    { birthDate: '2025-01-31', today: '2026-10-23', useCorrectedAge: false },
    { birthDate: '2026-03-01', dueDate: '2026-04-20', today: '2026-10-23', useCorrectedAge: true },
  ],
  milestones: [
    { name: '10 Monate, offen', ageMonths: 10.2, view: 'open' as MilestoneView, records: [rec('gm-sits-without-support', '2026-08-01')] },
    { name: '20 Monate, alle', ageMonths: 20, view: 'all' as MilestoneView, records: [rec('gm-walks-alone', '2026-05-01'), rec('la-first-words', '2026-04-01', true)] },
    { name: '5 Jahre neu angelegt, offen', ageMonths: 61, view: 'open' as MilestoneView, records: [] },
    { name: 'geschafft', ageMonths: 30, view: 'achieved' as MilestoneView, records: [rec('gm-runs', '2026-01-01'), rec('fm-scribbles', '2025-06-01')] },
  ],
  checkups: [
    { birthDate: '2026-01-31', today: '2026-10-23', records: [{ id: 'c1', childId: 'kind', checkupId: 'u4', doneOn: '2026-05-02' }] as CheckupRecord[] },
    { birthDate: '2021-11-20', today: '2026-10-23', records: [] as CheckupRecord[] },
  ],
  doctor: [
    {
      ageMonths: 19.5,
      today: '2026-10-23',
      since: '2026-04-15',
      records: [rec('gm-walks-alone', '2026-06-01'), rec('fm-scribbles', '2026-09-10'), rec('la-gestures', '2026-03-01'), rec('se-plays-games', '2026-02-01', true)],
    },
  ],
  review: [
    {
      from: '2026-04-24',
      to: '2026-10-23',
      records: [rec('gm-walks-alone', '2026-06-01'), rec('fm-scribbles', '2026-09-10'), rec('la-gestures', '2025-10-20')],
      logs: [
        log('a-peekaboo', '2026-10-01', { enjoyment: 'high', note: 'Hat laut gelacht' }),
        log('a-peekaboo', '2026-09-01', { enjoyment: 'high' }),
        log('a-tummy-time-mirror', '2026-08-01'),
        log('a-tummy-time-mirror', '2026-08-15', { note: '  Kurz, aber gut ' }),
        log('a-airplane-hold', '2025-10-22', { enjoyment: 'high' }),
      ],
    },
  ],
};

function compute() {
  const a = content.activities;
  const m = content.milestones;
  return {
    description: 'Gemeinsame Testfälle für Web (tests/parity.test.ts) und iPhone-App (ios/KleineSchritteCore). Erzeugt mit UPDATE_FIXTURES=1.',
    random: inputs.random.map((seed) => {
      const r = seededRandom(seed);
      return { seed, hash: hashString(seed), values: [r(), r(), r(), r(), r()].map(round) };
    }),
    recommend: inputs.recommend.map((c) => ({
      input: c,
      result: recommend({
        activities: a,
        milestones: m,
        ageMonths: c.ageMonths,
        today: c.today,
        seed: c.seed,
        milestoneRecords: c.records,
        logs: c.logs,
        favoriteIds: c.favoriteIds,
        availableMinutes: 'availableMinutes' in c ? c.availableMinutes : undefined,
        location: 'location' in c ? c.location : undefined,
        limit: 'limit' in c ? c.limit : undefined,
      }).map((r) => ({ id: r.activity.id, score: round(r.score), reasons: r.reasons })),
    })),
    daily: inputs.daily.map((c) => ({
      input: c,
      id: dailySuggestion({ activities: a, milestones: m, ageMonths: c.ageMonths, today: c.today, childId: c.childId, milestoneRecords: [], logs: [], favoriteIds: [] })?.activity.id,
    })),
    filter: inputs.filter.map((c) => ({ input: c, ids: filterActivities(a, c.filter).map((x) => x.id).sort() })),
    age: inputs.age.map((c) => {
      const age = childAge(c, c.today);
      return { input: c, effectiveMonths: round(age.effectiveMonths), band: ageBandFor(age.effectiveMonths, content.ageBands)?.id };
    }),
    milestones: inputs.milestones.map((c) => {
      const band = ageBandFor(c.ageMonths, content.ageBands)!;
      return {
        input: c,
        result: milestonesForView(m, band, c.ageMonths, c.records, c.view).map((s) => ({ id: s.milestone.id, phase: s.phase, achieved: s.achieved, consult: s.showConsultHint, longPast: s.longPast })),
      };
    }),
    checkups: inputs.checkups.map((c) => ({
      input: c,
      result: checkupStatuses(content.checkups, c.birthDate, c.today, c.records).map((s) => ({ id: s.checkup.id, start: s.window.start, end: s.window.end, phase: s.phase, daysUntilStart: s.daysUntilStart })),
    })),
    doctor: inputs.doctor.map((c) => {
      const o = doctorOverview({ milestones: m, records: c.records, ageMonths: c.ageMonths, today: c.today, since: c.since });
      return {
        input: c,
        since: o.since,
        domains: o.domains.map((d) => ({ domain: d.domain, achieved: d.achieved.map((x) => x.milestone.id), inWindow: d.inWindow.map((x) => x.id), consult: d.consult.map((x) => x.id) })),
        undated: o.undated.map((x) => x.id),
      };
    }),
    review: inputs.review.map((c) => {
      const r = buildReview({ milestones: m, activities: a, records: c.records, logs: c.logs, from: c.from, to: c.to });
      return {
        input: c,
        milestones: r.milestones.map((x) => x.milestone.id),
        played: r.played,
        distinctIdeas: r.distinctIdeas,
        favorites: r.favorites,
        domains: r.domains,
        notes: r.notes,
        memories: memories(c.to, c.records, c.logs),
      };
    }),
    ics: {
      now: '2026-10-23T08:00:00.000Z',
      output: buildIcs(
        [
          { uid: 'u7-kind@kleine-schritte', title: 'Mia: U7', description: 'Zeitraum für die U7 (21.–24. Lebensmonat). Termin vereinbaren, gelbes Heft mitnehmen; danke!', start: '2027-10-31', end: '2028-01-30', alarmDaysBefore: 21 },
          { uid: 'x@kleine-schritte', title: 'Ohne Erinnerung', start: '2026-12-01', end: '2026-12-01' },
        ],
        new Date('2026-10-23T08:00:00.000Z'),
      ),
    },
  };
}

describe('Gemeinsame Testfälle (parity.json)', () => {
  const actual = JSON.parse(JSON.stringify(compute()));
  if (process.env.UPDATE_FIXTURES) fs.writeFileSync(FIXTURE, JSON.stringify(actual, null, 2) + '\n');
  const expected = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));

  for (const key of Object.keys(actual)) {
    it(key, () => expect(actual[key]).toEqual(expected[key]));
  }
});
