/**
 * Ergänzt fehlende leere Listen in Content-Einträgen.
 *
 * Das Redaktionssystem (Pages CMS) lässt leere Listen und leere Texte beim Speichern weg.
 * In den Dateien dürfen sie deshalb fehlen; im Modell sind sie Pflicht. Swift macht das später
 * genauso mit Standardwerten beim Decodieren.
 */
import type { Activity, Milestone } from './models/content';

type Raw<T> = Partial<T>;

export function normalizeActivity(raw: Raw<Activity>): Activity {
  const a = raw as Activity;
  return {
    ...a,
    origin: a.origin ?? 'builtin',
    domains: { primary: a.domains.primary, secondary: a.domains.secondary ?? [] },
    materials: (a.materials ?? []).map((m) => ({ ...m, optional: m.optional ?? false })),
    variations: { easier: a.variations?.easier ?? [], harder: a.variations?.harder ?? [] },
    guidanceTips: a.guidanceTips ?? [],
    safety: a.safety ?? [],
    references: a.references ?? [],
    relatedMilestoneIds: a.relatedMilestoneIds ?? [],
  };
}

export function normalizeMilestone(raw: Raw<Milestone>): Milestone {
  const m = raw as Milestone;
  return { ...m, supportTips: m.supportTips ?? [], references: m.references ?? [] };
}
