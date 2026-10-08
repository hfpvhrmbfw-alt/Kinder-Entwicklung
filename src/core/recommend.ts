/**
 * Empfehlungslogik für „Was passt heute?“ und den Tagesvorschlag.
 *
 * Fachliche Idee:
 * - Zone der nächsten Entwicklung (Vygotsky): bevorzugt Aktivitäten zu Fähigkeiten,
 *   deren Zeitfenster gerade läuft und die noch nicht gezeigt wurden.
 * - Vielfalt über alle Entwicklungsbereiche, keine einseitige „Förderung“.
 * - Freude zählt: Lieblingsaktivitäten und gut angekommene Aktivitäten kommen öfter.
 *
 * Alles deterministisch (gleiche Eingabe → gleiches Ergebnis), damit Tests
 * und die spätere Swift-Version exakt vergleichbar sind.
 */
import { daysBetween } from './dates';
import { matchesFilter, type LocationChoice } from './filter';
import { activeMilestones } from './milestones';
import type { Activity, DomainId, Milestone } from './models/content';
import type { ActivityLog, MilestoneRecord } from './models/user';
import { seededRandom } from './random';

/** Toleranz in Monaten an den Rändern der Altersspanne. */
export const AGE_TOLERANCE_MONTHS = 2;

export const WEIGHTS = {
  relatedActiveMilestone: 3,
  maxRelatedMilestonesCounted: 2,
  activeDomainPrimary: 1.5,
  activeDomainSecondary: 0.5,
  neverDone: 1,
  doneVeryRecently: -3, // in den letzten 3 Tagen
  doneRecently: -1, // in den letzten 14 Tagen
  favorite: 1,
  likedBefore: 1,
  dislikedBefore: -1,
  outsideCoreAge: -0.75, // nur über die Toleranz hinein gerutscht
  jitter: 0.8,
  samePrimaryDomainPenalty: 1.5,
  sameCategoryPenalty: 0.5,
} as const;

export type ReasonKind =
  | 'activeMilestone'
  | 'activeDomain'
  | 'neverDone'
  | 'favorite'
  | 'likedBefore';

/** Begründung für die Anzeige („passt zu …“). Strukturiert, damit die UI übersetzt. */
export interface RecommendationReason {
  kind: ReasonKind;
  milestoneId?: string;
  domain?: DomainId;
}

export interface RankedActivity {
  activity: Activity;
  score: number;
  reasons: RecommendationReason[];
}

export interface RecommendInput {
  activities: Activity[];
  milestones: Milestone[];
  ageMonths: number;
  today: string;
  /** Verfügbare Zeit in Minuten; fehlt = egal. */
  availableMinutes?: number;
  location?: LocationChoice;
  /** Wenn gesetzt: nur Aktivitäten, deren Pflichtmaterial vorhanden ist. */
  availableMaterialIds?: string[];
  milestoneRecords: MilestoneRecord[];
  /** Verlauf dieses Kindes. */
  logs: ActivityLog[];
  favoriteIds: string[];
  /** Startwert für Zufall, z. B. `${today}:${childId}`. */
  seed: string;
  limit?: number;
}

interface Scored extends RankedActivity {
  base: number;
}

function scoreActivity(
  activity: Activity,
  input: RecommendInput,
  active: Milestone[],
  activeDomains: Set<DomainId>,
  random: () => number,
): Scored {
  const reasons: RecommendationReason[] = [];
  let score = 0;

  // 1. Zone der nächsten Entwicklung
  const activeIds = new Set(active.map((m) => m.id));
  const related = activity.relatedMilestoneIds.filter((id) => activeIds.has(id));
  if (related.length) {
    score += WEIGHTS.relatedActiveMilestone * Math.min(related.length, WEIGHTS.maxRelatedMilestonesCounted);
    for (const id of related.slice(0, WEIGHTS.maxRelatedMilestonesCounted)) {
      reasons.push({ kind: 'activeMilestone', milestoneId: id });
    }
  } else if (activeDomains.has(activity.domains.primary)) {
    score += WEIGHTS.activeDomainPrimary;
    reasons.push({ kind: 'activeDomain', domain: activity.domains.primary });
  } else {
    const sec = activity.domains.secondary.find((d) => activeDomains.has(d));
    if (sec) {
      score += WEIGHTS.activeDomainSecondary;
      reasons.push({ kind: 'activeDomain', domain: sec });
    }
  }

  // 2. Verlauf
  const logs = input.logs.filter((l) => l.activityRef.id === activity.id);
  if (logs.length === 0) {
    score += WEIGHTS.neverDone;
    reasons.push({ kind: 'neverDone' });
  } else {
    const daysSince = Math.min(...logs.map((l) => daysBetween(l.date, input.today)));
    if (daysSince <= 3) score += WEIGHTS.doneVeryRecently;
    else if (daysSince <= 14) score += WEIGHTS.doneRecently;

    const ratings = logs.map((l) => l.enjoyment).filter(Boolean);
    if (ratings.includes('high')) {
      score += WEIGHTS.likedBefore;
      reasons.push({ kind: 'likedBefore' });
    } else if (ratings.length && ratings.every((r) => r === 'low')) {
      score += WEIGHTS.dislikedBefore;
    }
  }

  // 3. Favorit
  if (input.favoriteIds.includes(activity.id)) {
    score += WEIGHTS.favorite;
    reasons.push({ kind: 'favorite' });
  }

  // 4. Nur über die Toleranz passend → leicht nach hinten
  const { minMonths, maxMonths } = activity.ageRange;
  if (input.ageMonths < minMonths || input.ageMonths >= maxMonths) score += WEIGHTS.outsideCoreAge;

  // 5. Etwas Abwechslung von Tag zu Tag
  score += random() * WEIGHTS.jitter;

  return { activity, score, base: score, reasons };
}

/** Rangliste passender Aktivitäten. */
export function recommend(input: RecommendInput): RankedActivity[] {
  const limit = input.limit ?? 5;
  const candidates = input.activities.filter((a) =>
    matchesFilter(a, {
      ageMonths: input.ageMonths,
      ageToleranceMonths: AGE_TOLERANCE_MONTHS,
      maxDurationMinutes: input.availableMinutes,
      location: input.location,
      availableMaterialIds: input.availableMaterialIds,
    }),
  );

  const active = activeMilestones(input.milestones, input.ageMonths, input.milestoneRecords);
  const activeDomains = new Set(active.map((m) => m.domain));
  // Kandidaten sortiert nach ID, damit die Zufallsfolge nicht von der Eingabereihenfolge abhängt.
  const random = seededRandom(input.seed);
  const pool = [...candidates]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((a) => scoreActivity(a, input, active, activeDomains, random));

  // Gierige Auswahl mit Vielfalts-Abzug je bereits gewähltem Bereich/Kategorie.
  const picked: Scored[] = [];
  while (picked.length < limit && pool.length) {
    for (const s of pool) {
      const sameDomain = picked.filter((p) => p.activity.domains.primary === s.activity.domains.primary).length;
      const sameCategory = picked.filter((p) => p.activity.category === s.activity.category).length;
      s.score = s.base - sameDomain * WEIGHTS.samePrimaryDomainPenalty - sameCategory * WEIGHTS.sameCategoryPenalty;
    }
    pool.sort((a, b) => b.score - a.score || a.activity.id.localeCompare(b.activity.id));
    picked.push(pool.shift()!);
  }
  return picked.map(({ activity, score, reasons }) => ({ activity, score, reasons }));
}

/** Tagesvorschlag: stabil für Kind und Tag. */
export function dailySuggestion(
  input: Omit<RecommendInput, 'seed' | 'limit' | 'availableMinutes' | 'location' | 'availableMaterialIds'> & {
    childId: string;
  },
): RankedActivity | undefined {
  return recommend({ ...input, seed: `daily:${input.today}:${input.childId}`, limit: 1 })[0];
}
