/**
 * Rückblick „Das hat sich getan“: was ein Kind in einem Zeitraum geschafft und gern gespielt hat.
 *
 * Ressourcenorientiert: nur was da ist, keine Vergleiche mit anderen Kindern und keine Kurven.
 */
import { addDays, addMonths, daysBetween, parseDate } from './dates';
import { DOMAIN_IDS, type Activity, type DomainId, type Milestone } from './models/content';
import type { ActivityLog, DateString, MilestoneRecord } from './models/user';

export const REVIEW_PERIODS = ['3m', '6m', '12m', 'all'] as const;
export type ReviewPeriod = (typeof REVIEW_PERIODS)[number];

/** Erster Tag des Zeitraums; `undefined` = alles. */
export function periodStart(period: ReviewPeriod, today: DateString): DateString | undefined {
  if (period === 'all') return undefined;
  return addDays(addMonths(today, -Number(period.slice(0, -1))), 1);
}

export interface ReviewInput {
  milestones: Milestone[];
  activities: Activity[];
  records: MilestoneRecord[];
  /** Verlauf dieses Kindes. */
  logs: ActivityLog[];
  from?: DateString;
  to: DateString;
}

export interface ReviewMilestone {
  milestone: Milestone;
  date: DateString;
}

export interface ReviewIdea {
  activityId: string;
  count: number;
  /** Wie oft „Begeistert“. */
  loved: number;
}

export interface ReviewDomain {
  domain: DomainId;
  milestones: number;
  ideas: number;
}

export interface ReviewNote {
  date: DateString;
  activityId: string;
  text: string;
}

export interface Review {
  /** Mit Datum geschaffte Schritte im Zeitraum, neueste zuerst. */
  milestones: ReviewMilestone[];
  /** Verlaufseinträge im Zeitraum. */
  played: number;
  /** Verschiedene Ideen im Zeitraum. */
  distinctIdeas: number;
  /** Ideen mit den meisten „Begeistert“, dann den meisten Einträgen; höchstens drei. */
  favorites: ReviewIdea[];
  /** Bereiche mit mindestens einem Schritt oder einer Idee, in fester Reihenfolge. */
  domains: ReviewDomain[];
  /** Notizen aus dem Verlauf, neueste zuerst; höchstens fünf. */
  notes: ReviewNote[];
}

const inRange = (date: DateString, from: DateString | undefined, to: DateString) => (!from || date >= from) && date <= to;

export function buildReview(input: ReviewInput): Review {
  const { from, to } = input;
  const milestoneIndex = new Map(input.milestones.map((m) => [m.id, m]));
  const activityIndex = new Map(input.activities.map((a) => [a.id, a]));

  const milestones = input.records
    .filter((r) => !r.dateUnknown && inRange(r.achievedOn, from, to) && milestoneIndex.has(r.milestoneId))
    .map((r) => ({ milestone: milestoneIndex.get(r.milestoneId)!, date: r.achievedOn }))
    .sort((a, b) => b.date.localeCompare(a.date) || a.milestone.id.localeCompare(b.milestone.id));

  const logs = input.logs.filter((l) => inRange(l.date, from, to));
  const ideas = new Map<string, ReviewIdea>();
  for (const l of logs) {
    const idea = ideas.get(l.activityRef.id) ?? { activityId: l.activityRef.id, count: 0, loved: 0 };
    idea.count++;
    if (l.enjoyment === 'high') idea.loved++;
    ideas.set(l.activityRef.id, idea);
  }
  const favorites = [...ideas.values()]
    .filter((i) => activityIndex.has(i.activityId) && (i.loved > 0 || i.count > 1))
    .sort((a, b) => b.loved - a.loved || b.count - a.count || a.activityId.localeCompare(b.activityId))
    .slice(0, 3);

  const domains = DOMAIN_IDS.map((domain) => ({
    domain,
    milestones: milestones.filter((m) => m.milestone.domain === domain).length,
    ideas: [...ideas.keys()].filter((id) => activityIndex.get(id)?.domains.primary === domain).length,
  })).filter((d) => d.milestones > 0 || d.ideas > 0);

  const notes = logs
    .filter((l) => l.note?.trim())
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5)
    .map((l) => ({ date: l.date, activityId: l.activityRef.id, text: l.note!.trim() }));

  return { milestones, played: logs.length, distinctIdeas: ideas.size, favorites, domains, notes };
}

export interface Memory {
  yearsAgo: number;
  date: DateString;
  kind: 'milestone' | 'activity';
  /** Meilenstein- bzw. Ideen-ID. */
  id: string;
  note?: string;
}

/** So viele Tage um den Jahrestag herum gilt ein Eintrag als „heute vor einem Jahr“. */
export const MEMORY_DAYS = 7;

/**
 * „Vor einem Jahr …“: geschaffte Schritte und begeisterte oder kommentierte Einträge,
 * die ungefähr auf den Tag ein oder mehrere Jahre zurückliegen.
 */
export function memories(today: DateString, records: MilestoneRecord[], logs: ActivityLog[]): Memory[] {
  const year = parseDate(today).year;
  const yearsAgo = (date: DateString): number | undefined => {
    for (let n = 1; n <= year - parseDate(date).year + 1; n++) {
      const anniversary = addMonths(today, -12 * n);
      if (Math.abs(daysBetween(anniversary, date)) <= MEMORY_DAYS) return n;
    }
    return undefined;
  };
  const out: Memory[] = [];
  for (const r of records) {
    if (r.dateUnknown) continue;
    const n = yearsAgo(r.achievedOn);
    if (n) out.push({ yearsAgo: n, date: r.achievedOn, kind: 'milestone', id: r.milestoneId });
  }
  for (const l of logs) {
    if (l.enjoyment !== 'high' && !l.note?.trim()) continue;
    const n = yearsAgo(l.date);
    if (n) out.push({ yearsAgo: n, date: l.date, kind: 'activity', id: l.activityRef.id, ...(l.note?.trim() ? { note: l.note.trim() } : {}) });
  }
  return out.sort((a, b) => a.yearsAgo - b.yearsAgo || (a.kind === b.kind ? 0 : a.kind === 'milestone' ? -1 : 1) || b.date.localeCompare(a.date));
}
