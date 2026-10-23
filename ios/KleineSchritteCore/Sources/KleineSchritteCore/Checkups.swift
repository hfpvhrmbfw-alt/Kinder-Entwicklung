// U-Untersuchungen (U1–U9), wie src/core/checkups.ts.
// Gerechnet wird ab dem tatsächlichen Geburtsdatum, nicht mit korrigiertem Alter.

import Foundation

/// So lange vor Beginn gilt eine Untersuchung als „bald“ (Zeit zum Termin vereinbaren).
public let checkupSoonDays = 42

public enum CheckupPhase: String, Codable, Sendable {
    case done, upcoming, soon, due, past
}

public struct CheckupWindow: Hashable, Sendable {
    /// Erster Tag des Zeitraums.
    public var start: DateString
    /// Letzter Tag (inklusiv).
    public var end: DateString
}

public struct CheckupStatus: Hashable, Sendable {
    public var checkup: Checkup
    public var window: CheckupWindow
    public var phase: CheckupPhase
    public var record: CheckupRecord?
    /// Tage bis zum Beginn (negativ, wenn schon begonnen).
    public var daysUntilStart: Int
}

private func offset(_ birthDate: DateString, _ unit: CheckupUnit, _ n: Int) throws -> DateString {
    switch unit {
    case .month: return try Dates.addMonths(birthDate, n)
    case .week: return try Dates.addDays(birthDate, n * 7)
    case .day: return try Dates.addDays(birthDate, n)
    }
}

public func checkupWindow(_ c: Checkup, birthDate: DateString) throws -> CheckupWindow {
    let start = try offset(birthDate, c.window.unit, c.window.from)
    let end = try Dates.addDays(offset(birthDate, c.window.unit, c.window.to), -1)
    return CheckupWindow(start: start, end: end)
}

public func checkupStatus(_ c: Checkup, birthDate: DateString, today: DateString, records: [CheckupRecord]) throws -> CheckupStatus {
    let window = try checkupWindow(c, birthDate: birthDate)
    let record = records.first { $0.checkupId == c.id }
    let daysUntilStart = try Dates.daysBetween(today, window.start)
    let phase: CheckupPhase
    if record != nil { phase = .done }
    else if today > window.end { phase = .past }
    else if today >= window.start { phase = .due }
    else if daysUntilStart <= checkupSoonDays { phase = .soon }
    else { phase = .upcoming }
    return CheckupStatus(checkup: c, window: window, phase: phase, record: record, daysUntilStart: daysUntilStart)
}

/// Alle Untersuchungen eines Kindes in zeitlicher Reihenfolge.
public func checkupStatuses(_ checkups: [Checkup], birthDate: DateString, today: DateString, records: [CheckupRecord]) throws -> [CheckupStatus] {
    try checkups.map { try checkupStatus($0, birthDate: birthDate, today: today, records: records) }
        .stableSorted { $0.window.start < $1.window.start }
}

/// Die Untersuchung, um die man sich jetzt kümmern sollte: läuft gerade oder beginnt bald.
public func currentCheckup(_ statuses: [CheckupStatus]) -> CheckupStatus? {
    statuses.first { $0.phase == .due } ?? statuses.first { $0.phase == .soon }
}

/// Die nächste noch nicht erledigte, deren Zeitraum nicht vorbei ist.
public func nextCheckup(_ statuses: [CheckupStatus]) -> CheckupStatus? {
    statuses.first { [.due, .soon, .upcoming].contains($0.phase) }
}

/// Letzte erledigte Untersuchung mit Datum.
public func lastDoneCheckup(_ statuses: [CheckupStatus]) -> CheckupStatus? {
    statuses.filter { $0.record?.doneOn != nil }
        .stableSorted { ($0.record?.doneOn ?? "") > ($1.record?.doneOn ?? "") }
        .first
}
