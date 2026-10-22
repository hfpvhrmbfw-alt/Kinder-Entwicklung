/**
 * Übersicht für den Kinderarzttermin: was seit dem letzten Termin geschafft ist,
 * was gerade im Zeitfenster liegt und was man ansprechen kann.
 *
 * Bewusst neutral: keine Bewertung, keine Prozentwerte, nur die eigenen Einträge.
 */
import { addMonths } from './dates';
import { milestoneStatus } from './milestones';
import { DOMAIN_IDS, type DomainId, type Milestone } from './models/content';
import type { DateString, MilestoneRecord } from './models/user';

/** Ohne erledigte U-Untersuchung mit Datum: so viele Monate zurück. */
export const DOCTOR_DEFAULT_MONTHS = 6;

export interface DoctorDomain {
  domain: DomainId;
  /** Seit `since` mit Datum geschafft, älteste zuerst. */
  achieved: { milestone: Milestone; date: DateString }[];
  /** Nicht abgehakt, Zeitfenster läuft gerade. */
  inWindow: Milestone[];
  /** Nicht abgehakt, quellengestützte Hinweisgrenze erreicht: beim Termin ansprechen. */
  consult: Milestone[];
}

export interface DoctorOverview {
  since: DateString;
  domains: DoctorDomain[];
  /** Ohne Datum abgehakte Schritte (zählen als geschafft, Zeitpunkt unbekannt). */
  undated: Milestone[];
}

export function doctorOverview(input: {
  milestones: Milestone[];
  records: MilestoneRecord[];
  ageMonths: number;
  today: DateString;
  /** Datum der letzten U-Untersuchung, falls bekannt. */
  since?: DateString;
}): DoctorOverview {
  const since = input.since ?? addMonths(input.today, -DOCTOR_DEFAULT_MONTHS);
  const statuses = input.milestones.map((m) => milestoneStatus(m, input.ageMonths, input.records));
  const byWindow = (a: Milestone, b: Milestone) => a.window.fromMonths - b.window.fromMonths || a.id.localeCompare(b.id);

  const domains = DOMAIN_IDS.map((domain): DoctorDomain => {
    const inDomain = statuses.filter((s) => s.milestone.domain === domain);
    return {
      domain,
      achieved: inDomain
        .filter((s) => s.record && !s.record.dateUnknown && s.record.achievedOn >= since)
        .map((s) => ({ milestone: s.milestone, date: s.record!.achievedOn }))
        .sort((a, b) => a.date.localeCompare(b.date) || byWindow(a.milestone, b.milestone)),
      inWindow: inDomain.filter((s) => !s.achieved && s.phase === 'inWindow' && !s.showConsultHint).map((s) => s.milestone).sort(byWindow),
      consult: inDomain.filter((s) => s.showConsultHint).map((s) => s.milestone).sort(byWindow),
    };
  }).filter((d) => d.achieved.length || d.inWindow.length || d.consult.length);

  const undated = statuses.filter((s) => s.record?.dateUnknown).map((s) => s.milestone).sort(byWindow);
  return { since, domains, undated };
}
