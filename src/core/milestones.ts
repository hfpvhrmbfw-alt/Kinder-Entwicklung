/**
 * Meilenstein-Logik: Status je Kind, Auswahl für das aktuelle Alter, Vorschau.
 *
 * Grundsatz: Meilensteine sind Zeitfenster mit individueller Streuung.
 * Ein nicht abgehakter Meilenstein ist KEIN Warnsignal. Nur wenn der Content
 * quellengestützt `consultHintFromMonths` setzt und dieses Alter erreicht ist,
 * zeigt die UI einen ruhigen Hinweis auf das nächste Gespräch in der Kinderarztpraxis.
 */
import type { DomainId, Milestone, MonthRange } from './models/content';
import type { MilestoneRecord } from './models/user';

/**
 * Schritte, deren Zeitfenster (bzw. Hinweisgrenze) so lange vorbei ist, gelten als „lange vorbei“:
 * Sie stehen nicht mehr unter „Offen“ und tragen keinen Arzthinweis. So zeigt ein neu
 * angelegtes älteres Kind nicht alle Babyschritte als offen. Abgehakt wird nichts.
 */
export const LONG_PAST_MONTHS = 12;

export type MilestonePhase =
  | 'upcoming' // Fenster beginnt erst später
  | 'inWindow' // Fenster läuft gerade
  | 'afterWindow'; // Fenster ist vorbei (meist schon gezeigt, sonst einfach offen)

export interface MilestoneStatus {
  milestone: Milestone;
  phase: MilestonePhase;
  record?: MilestoneRecord;
  achieved: boolean;
  /** Ruhiger Hinweis angebracht (nur wenn nicht erreicht und quellengestützte Grenze überschritten). */
  showConsultHint: boolean;
  /** Nicht erreicht und Fenster seit mindestens LONG_PAST_MONTHS vorbei: nur unter „Alle“, ohne Hinweis. */
  longPast: boolean;
}

export function milestonePhase(m: Milestone, ageMonths: number): MilestonePhase {
  if (ageMonths < m.window.fromMonths) return 'upcoming';
  if (ageMonths < m.window.toMonths) return 'inWindow';
  return 'afterWindow';
}

export function milestoneStatus(m: Milestone, ageMonths: number, records: MilestoneRecord[]): MilestoneStatus {
  const record = records.find((r) => r.milestoneId === m.id);
  const achieved = !!record;
  const end = Math.max(m.window.toMonths, m.consultHintFromMonths ?? 0);
  const longPast = !achieved && ageMonths >= end + LONG_PAST_MONTHS;
  return {
    milestone: m,
    phase: milestonePhase(m, ageMonths),
    record,
    achieved,
    showConsultHint: !achieved && !longPast && m.consultHintFromMonths !== undefined && ageMonths >= m.consultHintFromMonths,
    longPast,
  };
}

function overlaps(window: { fromMonths: number; toMonths: number }, range: MonthRange): boolean {
  return window.fromMonths < range.maxMonths && window.toMonths > range.minMonths;
}

/**
 * Meilensteine für die Entwicklungsübersicht: alle, deren Fenster das
 * aktuelle Altersband berührt, plus frühere, noch nicht abgehakte.
 * Sortiert nach Fensterbeginn.
 */
export function milestonesForOverview(
  milestones: Milestone[],
  band: MonthRange,
  ageMonths: number,
  records: MilestoneRecord[],
): MilestoneStatus[] {
  return milestones
    .map((m) => milestoneStatus(m, ageMonths, records))
    .filter((s) => overlaps(s.milestone.window, band) || (s.phase === 'afterWindow' && !s.achieved))
    .sort((a, b) => a.milestone.window.fromMonths - b.milestone.window.fromMonths);
}

/** Ansicht der Entwicklungsübersicht: nur offene, nur geschaffte oder alle Schritte. */
export const MILESTONE_VIEWS = ['open', 'achieved', 'all'] as const;
export type MilestoneView = (typeof MILESTONE_VIEWS)[number];

/**
 * Meilensteine für eine Ansicht.
 * - `open`: wie die Übersicht, aber ohne Abgehakte und ohne Schritte, deren Fenster lange vorbei ist (Standard)
 * - `achieved`: alle abgehakten, unabhängig vom Altersband
 * - `all`: die Übersicht wie bisher
 */
export function milestonesForView(
  milestones: Milestone[],
  band: MonthRange,
  ageMonths: number,
  records: MilestoneRecord[],
  view: MilestoneView,
): MilestoneStatus[] {
  if (view === 'achieved') {
    return milestones
      .map((m) => milestoneStatus(m, ageMonths, records))
      .filter((s) => s.achieved)
      .sort((a, b) => a.milestone.window.fromMonths - b.milestone.window.fromMonths);
  }
  const overview = milestonesForOverview(milestones, band, ageMonths, records);
  return view === 'open' ? overview.filter((s) => !s.achieved && !s.longPast) : overview;
}

/**
 * Teilt die Übersicht in „aktuell“ (Fenster berührt das Altersband, oder ein
 * quellengestützter Hinweis ist fällig) und „früher, noch nicht abgehakt“.
 * Letztere zeigt die UI eingeklappt, damit die Seite bei neuen Profilen nicht überläuft.
 */
export function splitOverview(statuses: MilestoneStatus[], band: MonthRange): { current: MilestoneStatus[]; earlier: MilestoneStatus[] } {
  const current: MilestoneStatus[] = [];
  const earlier: MilestoneStatus[] = [];
  for (const s of statuses) {
    if (overlaps(s.milestone.window, band) || s.showConsultHint) current.push(s);
    else earlier.push(s);
  }
  return { current, earlier };
}

/** Vorschau: Meilensteine, deren Fenster in den nächsten `months` Monaten beginnt. */
export function upcomingMilestones(milestones: Milestone[], ageMonths: number, months = 3): Milestone[] {
  return milestones
    .filter((m) => m.window.fromMonths > ageMonths && m.window.fromMonths <= ageMonths + months)
    .sort((a, b) => a.window.fromMonths - b.window.fromMonths);
}

/**
 * „Gerade spannend“: nicht erreichte Meilensteine, deren Fenster läuft.
 * Entspricht der Zone der nächsten Entwicklung (Vygotsky) und steuert die Empfehlung.
 */
export function activeMilestones(milestones: Milestone[], ageMonths: number, records: MilestoneRecord[]): Milestone[] {
  const done = new Set(records.map((r) => r.milestoneId));
  return milestones.filter((m) => !done.has(m.id) && milestonePhase(m, ageMonths) === 'inWindow');
}

/** Wie viele aktive (offene, laufende) Meilensteine gibt es je Bereich? */
export function activeCountByDomain(active: Milestone[]): Partial<Record<DomainId, number>> {
  const counts: Partial<Record<DomainId, number>> = {};
  for (const m of active) counts[m.domain] = (counts[m.domain] ?? 0) + 1;
  return counts;
}
