/**
 * Daten absichern: wann die Heute-Seite an eine Datensicherung erinnert.
 * Die Daten liegen nur auf dem Gerät; eine Sicherungsdatei ist der einzige Schutz bei Geräteverlust.
 */
import type { Child, Settings, Timestamp } from './models/user';

/** Erinnerung, wenn die letzte Sicherung (bzw. das „Später“) so viele Tage zurückliegt. */
export const BACKUP_REMINDER_DAYS = 30;

const DAY_MS = 86_400_000;

/**
 * Erinnerung fällig? Gezählt ab der letzten Sicherung, dem letzten „Später“
 * oder, falls es keins von beiden gibt, ab dem ersten Kinderprofil.
 */
export function backupReminderDue(settings: Pick<Settings, 'lastBackupAt' | 'backupReminderAt'>, children: Pick<Child, 'createdAt'>[], now: Date): boolean {
  if (!children.length) return false;
  const times: Timestamp[] = [settings.lastBackupAt, settings.backupReminderAt].filter((x): x is Timestamp => !!x);
  if (!times.length) times.push(children.map((c) => c.createdAt).sort()[0]!);
  const latest = Math.max(...times.map((t) => Date.parse(t)).filter((n) => !Number.isNaN(n)));
  if (!Number.isFinite(latest)) return false;
  return now.getTime() - latest >= BACKUP_REMINDER_DAYS * DAY_MS;
}
