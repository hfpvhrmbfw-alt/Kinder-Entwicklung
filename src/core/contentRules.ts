/**
 * Fachliche Prüfregeln für Content, die über das JSON-Schema hinausgehen.
 * Läuft in Tests/CI. Ergebnis: Fehler (blockieren das Deployment) und Warnungen.
 */
import type { ContentBundle } from './models/content';

/** Unter diesem Alter gelten Kleinteile als Verschluckungsgefahr (EN 71-1). */
export const SMALL_PARTS_AGE_LIMIT_MONTHS = 36;
export const TARGET_ACTIVITIES_PER_BAND = 20;
/** Bis zu diesem Alter braucht jede Aktivität mit Wasser einen Wasser-Hinweis (Ertrinkungsgefahr bei Kleinkindern). */
export const WATER_NOTE_AGE_LIMIT_MONTHS = 48;
/** Bis zu diesem Alter braucht jede Aktivität mit Schnur oder Seil einen Schnur-Hinweis (Strangulationsgefahr). */
export const CORD_NOTE_AGE_LIMIT_MONTHS = 36;
/** Ein Luftballon wird benutzt (nicht nur erwähnt, z. B. als Malmotiv). */
const BALLOON_USE = /\b(?:mit|ein(?:en|em)?|dem|den)\s+Luftballon\b/i;
const CORD_WORD = /\b(?:Seil|Schnur|Kordel|Bindfaden)\b/;

/** Obergrenze des Contents: Ende der 1. Klasse. */
export const MAX_CONTENT_MONTHS = 84;

export interface ContentIssue {
  level: 'error' | 'warning';
  id: string;
  message: string;
}

export function checkContent(c: ContentBundle): ContentIssue[] {
  const issues: ContentIssue[] = [];
  const err = (id: string, message: string) => issues.push({ level: 'error', id, message });
  const warn = (id: string, message: string) => issues.push({ level: 'warning', id, message });

  const refIds = new Set(c.references.map((r) => r.id));
  const materials = new Map(c.materials.map((m) => [m.id, m]));
  const milestoneIds = new Set(c.milestones.map((m) => m.id));
  const activityIds = new Set(c.activities.map((a) => a.id));

  const seen = new Set<string>();
  for (const id of [...c.milestones.map((m) => m.id), ...c.activities.map((a) => a.id), ...c.checkups.map((u) => u.id), ...c.materials.map((m) => m.id), ...c.references.map((r) => r.id)]) {
    if (seen.has(id)) err(id, 'ID ist doppelt vergeben');
    seen.add(id);
  }

  for (const m of c.milestones) {
    if (m.window.fromMonths >= m.window.toMonths) err(m.id, 'Zeitfenster: fromMonths muss kleiner als toMonths sein');
    if (m.consultHintFromMonths !== undefined && m.consultHintFromMonths < m.window.toMonths) {
      err(m.id, 'consultHintFromMonths darf nicht vor dem Ende des Zeitfensters liegen');
    }
    for (const r of m.references) if (!refIds.has(r.referenceId)) err(m.id, `Unbekannte Quelle ${r.referenceId}`);
    for (const a of m.relatedActivityIds ?? []) if (!activityIds.has(a)) err(m.id, `Unbekannte Aktivität ${a}`);
  }

  for (const a of c.activities) {
    const { minMonths, maxMonths } = a.ageRange;
    if (minMonths >= maxMonths) err(a.id, 'ageRange: minMonths muss kleiner als maxMonths sein');
    if (maxMonths > MAX_CONTENT_MONTHS) err(a.id, `ageRange über ${MAX_CONTENT_MONTHS} Monate (Content deckt 0–7 Jahre ab)`);
    if (a.durationMinutes.min > a.durationMinutes.max) err(a.id, 'durationMinutes: min > max');
    if (a.domains.secondary.includes(a.domains.primary)) err(a.id, 'Hauptbereich steht auch bei den Nebenbereichen');
    if (a.origin === 'builtin' && a.references.length === 0) err(a.id, 'Mindestens eine Quelle bzw. ein Prinzip nötig');
    for (const r of a.references) if (!refIds.has(r.referenceId)) err(a.id, `Unbekannte Quelle ${r.referenceId}`);
    for (const ms of a.relatedMilestoneIds) if (!milestoneIds.has(ms)) err(a.id, `Unbekannter Meilenstein ${ms}`);

    const kinds = new Set(a.safety.map((s) => s.kind));
    for (const am of a.materials) {
      const mat = materials.get(am.materialId);
      if (!mat) {
        err(a.id, `Unbekanntes Material ${am.materialId}`);
        continue;
      }
      if (mat.smallParts && minMonths < SMALL_PARTS_AGE_LIMIT_MONTHS && !kinds.has('choking')) {
        err(a.id, `Material „${mat.name.de}“ hat Kleinteile: Verschluckungs-Hinweis (choking) fehlt`);
      }
      if (am.materialId === 'water' && minMonths < WATER_NOTE_AGE_LIMIT_MONTHS && !kinds.has('water')) {
        err(a.id, 'Material Wasser bei Kleinkindern: Hinweis (water) fehlt');
      }
    }
    const doing = [a.title, a.summary, ...a.steps, ...a.variations.easier, ...a.variations.harder, ...a.guidanceTips, ...(a.materialsText ?? []), ...(a.everyday ?? [])]
      .map((x) => x.de)
      .join('\n');
    const safetyText = a.safety.map((x) => x.text.de).join('\n');
    if (BALLOON_USE.test(doing) && !/Luftballon/i.test(safetyText)) {
      err(a.id, 'Luftballon wird benutzt: Hinweis zu geplatzten Ballons (Erstickungsgefahr) fehlt');
    }
    const usesCord = CORD_WORD.test(doing) || a.materials.some((m) => m.materialId === 'rope');
    if (usesCord && minMonths < CORD_NOTE_AGE_LIMIT_MONTHS && !kinds.has('cord')) {
      err(a.id, 'Schnur oder Seil bei Kleinkindern: Hinweis (cord) fehlt');
    }
    if (minMonths < 12 && !kinds.has('supervision')) warn(a.id, 'Aktivität für Säuglinge ohne Aufsichts-Hinweis');
  }

  for (const u of c.checkups) {
    if (u.window.from >= u.window.to) err(u.id, 'U-Untersuchung: from muss kleiner als to sein');
    for (const r of u.references) if (!refIds.has(r.referenceId)) err(u.id, `Unbekannte Quelle ${r.referenceId}`);
  }

  for (const band of c.ageBands) {
    const n = c.activities.filter((a) => a.ageRange.minMonths < band.maxMonths && a.ageRange.maxMonths > band.minMonths).length;
    if (n < TARGET_ACTIVITIES_PER_BAND) warn(band.id, `${n} von ${TARGET_ACTIVITIES_PER_BAND} Aktivitäten`);
    for (const d of c.domains) {
      const ms = c.milestones.filter(
        (m) => m.domain === d.id && m.window.fromMonths < band.maxMonths && m.window.toMonths > band.minMonths,
      ).length;
      if (ms === 0) warn(band.id, `kein Meilenstein im Bereich ${d.id}`);
    }
  }
  return issues;
}
