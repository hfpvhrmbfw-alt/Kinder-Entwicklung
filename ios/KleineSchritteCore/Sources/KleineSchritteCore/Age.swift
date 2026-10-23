// Altersberechnung inkl. korrigiertem Alter bei Frühgeburt, wie src/core/age.ts.

import Foundation

public enum Age {
    /// Bis zu diesem chronologischen Alter (Monate) gilt das korrigierte Alter. Zu prüfen.
    public static let correctedAgeLimitMonths = 24
    /// Durchschnittliche Monatslänge, nur für Dezimal-Monate.
    static let avgDaysPerMonth = 30.436875
}

public struct AgeSpan: Hashable, Sendable {
    /// Volle Kalendermonate.
    public var months: Int
    /// Resttage nach den vollen Monaten.
    public var days: Int
    public var totalDays: Int

    public init(months: Int, days: Int, totalDays: Int) {
        self.months = months
        self.days = days
        self.totalDays = totalDays
    }

    /// Alter als Dezimalzahl in Monaten (z. B. 9.5), für Filter und Empfehlung.
    public var decimalMonths: Double { Double(months) + Double(days) / Age.avgDaysPerMonth }
}

public struct AgeBeforeBirthError: Error {}

/// Alter in vollen Kalendermonaten und Resttagen. Fehlt der Monatstag (Geburt am 31.), zählt der Monatsletzte.
public func ageSpan(birthDate: DateString, on onDate: DateString) throws -> AgeSpan {
    if try Dates.compare(onDate, birthDate) < 0 { throw AgeBeforeBirthError() }
    let b = try Dates.parse(birthDate)
    let t = try Dates.parse(onDate)
    var months = (t.year - b.year) * 12 + (t.month - b.month)
    let anniversaryDay = min(b.day, Dates.daysInMonth(t.year, t.month))
    if t.day < anniversaryDay { months -= 1 }
    let last = try Dates.addMonths(birthDate, months)
    return AgeSpan(months: months, days: try Dates.daysBetween(last, onDate), totalDays: try Dates.daysBetween(birthDate, onDate))
}

public struct ChildAge: Hashable, Sendable {
    public var chronological: AgeSpan
    /// Nur gesetzt, wenn ein korrigiertes Alter berechnet werden kann.
    public var corrected: AgeSpan?
    /// Das korrigierte Alter wird gerade für Empfehlungen genutzt.
    public var usesCorrected: Bool
    /// Errechneter Termin liegt noch in der Zukunft.
    public var beforeDueDate: Bool
    /// Maßgebliches Alter in Dezimal-Monaten.
    public var effectiveMonths: Double
    public var weeksPremature: Int?
}

/// Alle Altersangaben eines Kindes zum Stichtag.
public func childAge(birthDate: DateString, dueDate: DateString?, useCorrectedAge: Bool, on onDate: DateString) throws -> ChildAge {
    let chronological = try ageSpan(birthDate: birthDate, on: onDate)
    var result = ChildAge(chronological: chronological, corrected: nil, usesCorrected: false, beforeDueDate: false,
                          effectiveMonths: chronological.decimalMonths, weeksPremature: nil)
    guard let due = dueDate, try Dates.compare(due, birthDate) > 0 else { return result }

    let prematureDays = try Dates.daysBetween(birthDate, due)
    result.weeksPremature = prematureDays / 7

    if try Dates.compare(onDate, due) < 0 {
        result.beforeDueDate = true
        result.corrected = AgeSpan(months: 0, days: 0, totalDays: 0)
    } else {
        result.corrected = try ageSpan(birthDate: due, on: onDate)
    }
    if useCorrectedAge, chronological.months < Age.correctedAgeLimitMonths, let corrected = result.corrected {
        result.usesCorrected = true
        result.effectiveMonths = corrected.decimalMonths
    }
    return result
}

public func childAge(_ child: Child, on onDate: DateString) throws -> ChildAge {
    try childAge(birthDate: child.birthDate, dueDate: child.dueDate, useCorrectedAge: child.useCorrectedAge, on: onDate)
}

/// Liegt ein Alter im Bereich? Untergrenze inklusiv, Obergrenze exklusiv.
public func inRange(_ months: Double, _ range: MonthRange, tolerance: Double = 0) -> Bool {
    months >= range.minMonths - tolerance && months < range.maxMonths + tolerance
}

/// Altersband für ein Alter; über dem letzten Band das letzte.
public func ageBand(for months: Double, in bands: [AgeBand]) -> AgeBand? {
    let sorted = bands.stableSorted { $0.minMonths < $1.minMonths }
    if let hit = sorted.first(where: { inRange(months, $0.range) }) { return hit }
    if let last = sorted.last, months >= last.maxMonths { return last }
    return nil
}
