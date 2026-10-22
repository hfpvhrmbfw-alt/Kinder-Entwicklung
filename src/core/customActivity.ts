/**
 * Eigene Ideen: aus einem einfachen Formular wird eine vollwertige Aktivität,
 * die Bibliothek, Empfehlung, Favoriten und Verlauf wie eingebaute Ideen nutzen.
 */
import { MAX_CONTENT_MONTHS } from './contentRules';
import type { Activity, CategoryId, DomainId, LocalizedText, Location } from './models/content';

export const CUSTOM_ID_PREFIX = 'custom-';

export interface CustomActivityInput {
  title: string;
  summary: string;
  minMonths: number;
  maxMonths: number;
  domain: DomainId;
  category: CategoryId;
  location: Location;
  minutes: number;
  /** Mehrzeiliger Text: eine Zeile je Material bzw. Schritt bzw. Tipp. */
  materials: string;
  steps: string;
  tips: string;
}

export type CustomActivityError = 'title' | 'age' | 'minutes';

/** Text zeilenweise in eine Liste; leere Zeilen und Aufzählungszeichen fallen weg. */
export function linesToList(text: string): LocalizedText[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '').trim())
    .filter(Boolean)
    .map((de) => ({ de }));
}

export function listToLines(list: LocalizedText[] | undefined): string {
  return (list ?? []).map((l) => l.de).join('\n');
}

export function validateCustomActivity(input: CustomActivityInput): CustomActivityError | undefined {
  if (!input.title.trim()) return 'title';
  if (!(input.minMonths >= 0 && input.maxMonths <= MAX_CONTENT_MONTHS && input.minMonths < input.maxMonths)) return 'age';
  if (!(Number.isInteger(input.minutes) && input.minutes >= 1 && input.minutes <= 600)) return 'minutes';
  return undefined;
}

/** Baut die Aktivität. Ohne `id` bekommt sie eine neue; `existing` behält Felder, die das Formular nicht kennt. */
export function buildCustomActivity(input: CustomActivityInput, id: string, existing?: Activity): Activity {
  const error = validateCustomActivity(input);
  if (error) throw new Error(`Eigene Idee ungültig: ${error}`);
  const summary = input.summary.trim();
  const materialsText = linesToList(input.materials);
  const tips = linesToList(input.tips);
  const base: Activity = existing ?? {
    id,
    origin: 'custom',
    title: { de: '' },
    summary: { de: '' },
    ageRange: { minMonths: 0, maxMonths: MAX_CONTENT_MONTHS },
    domains: { primary: input.domain, secondary: [] },
    category: input.category,
    durationMinutes: { min: input.minutes, max: input.minutes },
    location: input.location,
    prepEffort: 'low',
    socialSettings: ['oneOnOne'],
    materials: [],
    steps: [],
    variations: { easier: [], harder: [] },
    guidanceTips: [],
    learningOutcomes: [],
    rationale: { de: '' },
    safety: [],
    references: [],
    relatedMilestoneIds: [],
    review: { status: 'draft' },
  };
  const { materialsText: _m, ...rest } = base;
  return {
    ...rest,
    id: base.id,
    origin: 'custom',
    title: { de: input.title.trim() },
    summary: { de: summary },
    ageRange: { minMonths: input.minMonths, maxMonths: input.maxMonths },
    domains: { primary: input.domain, secondary: base.domains.secondary.filter((d) => d !== input.domain) },
    category: input.category,
    durationMinutes: { min: input.minutes, max: input.minutes },
    location: input.location,
    steps: linesToList(input.steps),
    guidanceTips: tips,
    ...(materialsText.length ? { materialsText } : {}),
  };
}

export function isCustomActivity(a: Pick<Activity, 'origin'>): boolean {
  return a.origin === 'custom';
}
