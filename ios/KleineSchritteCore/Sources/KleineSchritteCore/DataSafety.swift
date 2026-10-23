// Daten absichern, wie src/core/dataSafety.ts: wann „Heute“ an eine Sicherung erinnert.
// Die Daten liegen nur auf dem Gerät; eine Sicherungsdatei schützt bei Geräteverlust.

import Foundation

/// Erinnerung, wenn die letzte Sicherung (bzw. das „Später“) so viele Tage zurückliegt.
public let backupReminderDays = 30

/// Gezählt ab der letzten Sicherung, dem letzten „Später“ oder sonst ab dem ersten Kinderprofil.
public func backupReminderDue(settings: Settings, children: [Child], now: Date) -> Bool {
    guard !children.isEmpty else { return false }
    var times = [settings.lastBackupAt, settings.backupReminderAt].compactMap { $0 }.filter { !$0.isEmpty }
    if times.isEmpty, let first = children.map(\.createdAt).sorted().first { times.append(first) }
    guard let latest = times.compactMap(parseTimestamp).max() else { return false }
    return now.timeIntervalSince(latest) >= Double(backupReminderDays) * 86_400
}
