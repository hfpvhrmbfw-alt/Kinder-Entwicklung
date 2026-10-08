/**
 * Filter der Aktivitätenbibliothek. Reine Funktionen, keine UI.
 * Leere bzw. fehlende Filterwerte bedeuten „egal“.
 */
import { inRange } from './age';
import type {
  Activity,
  CategoryId,
  DomainId,
  PrepEffort,
  SocialSetting,
} from './models/content';
import { localize, normalizeForSearch } from './text';

export type LocationChoice = 'any' | 'indoor' | 'outdoor';

export interface ActivityFilter {
  /** Alter in Dezimal-Monaten; Aktivität muss passen (mit Toleranz). */
  ageMonths?: number;
  ageToleranceMonths?: number;
  domains?: DomainId[];
  categories?: CategoryId[];
  /** Höchstdauer in Minuten; es zählt die Mindestdauer der Aktivität. */
  maxDurationMinutes?: number;
  location?: LocationChoice;
  prepEfforts?: PrepEffort[];
  socialSettings?: SocialSetting[];
  /** Nur Aktivitäten, deren Pflichtmaterial vollständig vorhanden ist. */
  availableMaterialIds?: string[];
  /** Mindestens eines dieser Materialien wird verwendet. */
  usesMaterialIds?: string[];
  query?: string;
  onlyIds?: string[];
}

export function matchesLocation(activity: Activity, choice: LocationChoice | undefined): boolean {
  if (!choice || choice === 'any') return true;
  return activity.location === 'both' || activity.location === choice;
}

export function activityDomains(activity: Activity): DomainId[] {
  return [activity.domains.primary, ...activity.domains.secondary];
}

/** Fehlendes Pflichtmaterial (leer = alles da). */
export function missingMaterials(activity: Activity, available: Iterable<string>): string[] {
  const have = new Set(available);
  return activity.materials.filter((m) => !m.optional && !have.has(m.materialId)).map((m) => m.materialId);
}

export function matchesFilter(activity: Activity, f: ActivityFilter, locale = 'de'): boolean {
  if (f.onlyIds && !f.onlyIds.includes(activity.id)) return false;
  if (f.ageMonths !== undefined && !inRange(f.ageMonths, activity.ageRange, f.ageToleranceMonths ?? 0)) return false;
  if (f.domains?.length && !activityDomains(activity).some((d) => f.domains!.includes(d))) return false;
  if (f.categories?.length && !f.categories.includes(activity.category)) return false;
  if (f.maxDurationMinutes !== undefined && activity.durationMinutes.min > f.maxDurationMinutes) return false;
  if (!matchesLocation(activity, f.location)) return false;
  if (f.prepEfforts?.length && !f.prepEfforts.includes(activity.prepEffort)) return false;
  if (f.socialSettings?.length && !activity.socialSettings.some((s) => f.socialSettings!.includes(s))) return false;
  if (f.availableMaterialIds && missingMaterials(activity, f.availableMaterialIds).length > 0) return false;
  if (f.usesMaterialIds?.length && !activity.materials.some((m) => f.usesMaterialIds!.includes(m.materialId))) {
    return false;
  }
  if (f.query?.trim()) {
    const haystack = normalizeForSearch(
      [activity.title, activity.summary, ...activity.steps].map((t) => localize(t, locale)).join(' ') +
        ' ' +
        (activity.tags ?? []).join(' '),
    );
    const words = normalizeForSearch(f.query).split(/\s+/).filter(Boolean);
    if (!words.every((w) => haystack.includes(w))) return false;
  }
  return true;
}

export function filterActivities(activities: Activity[], f: ActivityFilter, locale = 'de'): Activity[] {
  return activities.filter((a) => matchesFilter(a, f, locale));
}

/** Anzahl aktiver Filter, für die Anzeige „Filter (3)“. Alter zählt nicht mit. */
export function countActiveFilters(f: ActivityFilter): number {
  let n = 0;
  if (f.domains?.length) n++;
  if (f.categories?.length) n++;
  if (f.maxDurationMinutes !== undefined) n++;
  if (f.location && f.location !== 'any') n++;
  if (f.prepEfforts?.length) n++;
  if (f.socialSettings?.length) n++;
  if (f.availableMaterialIds) n++;
  if (f.usesMaterialIds?.length) n++;
  return n;
}
