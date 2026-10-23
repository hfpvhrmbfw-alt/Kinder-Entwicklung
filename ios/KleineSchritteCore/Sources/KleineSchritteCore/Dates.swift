// Reine Kalenderrechnung auf "YYYY-MM-DD"-Strings, wie src/core/dates.ts.
// Ohne Uhrzeit, also ohne Zeitzonen- und Sommerzeitfehler: Ein Geburtstag ist ein Kalendertag.

import Foundation

public struct CalendarDate: Hashable, Sendable {
    public var year: Int
    public var month: Int // 1–12
    public var day: Int // 1–31

    public init(year: Int, month: Int, day: Int) {
        self.year = year
        self.month = month
        self.day = day
    }
}

public struct InvalidDateError: Error, CustomStringConvertible {
    public let value: String
    public var description: String { "Ungültiges Datum: \"\(value)\" (erwartet YYYY-MM-DD)" }
}

public enum Dates {
    public static func isLeapYear(_ year: Int) -> Bool {
        (year % 4 == 0 && year % 100 != 0) || year % 400 == 0
    }

    public static func daysInMonth(_ year: Int, _ month: Int) -> Int {
        let table = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
        return (1...12).contains(month) ? table[month - 1] : 30
    }

    public static func parse(_ value: String) throws -> CalendarDate {
        let parts = value.split(separator: "-", omittingEmptySubsequences: false)
        guard parts.count == 3, parts[0].count == 4, parts[1].count == 2, parts[2].count == 2,
              parts.allSatisfy({ $0.allSatisfy(\.isASCII) && $0.allSatisfy(\.isNumber) }),
              let y = Int(parts[0]), let m = Int(parts[1]), let d = Int(parts[2])
        else { throw InvalidDateError(value: value) }
        guard (1...12).contains(m), d >= 1, d <= daysInMonth(y, m) else { throw InvalidDateError(value: value) }
        return CalendarDate(year: y, month: m, day: d)
    }

    public static func isValid(_ value: String) -> Bool {
        (try? parse(value)) != nil
    }

    public static func format(_ d: CalendarDate) -> String {
        String(format: "%04d-%02d-%02d", d.year, d.month, d.day)
    }

    /// Tage seit 1970-01-01 (proleptischer Gregorianischer Kalender).
    public static func dayNumber(_ d: CalendarDate) -> Int {
        // Algorithmus „days from civil“ (Howard Hinnant), exakt für alle Jahre.
        let y = d.month <= 2 ? d.year - 1 : d.year
        let era = (y >= 0 ? y : y - 399) / 400
        let yoe = y - era * 400
        let mp = (d.month + 9) % 12
        let doy = (153 * mp + 2) / 5 + d.day - 1
        let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy
        return era * 146_097 + doe - 719_468
    }

    public static func fromDayNumber(_ n: Int) -> CalendarDate {
        let z = n + 719_468
        let era = (z >= 0 ? z : z - 146_096) / 146_097
        let doe = z - era * 146_097
        let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146_096) / 365
        let doy = doe - (365 * yoe + yoe / 4 - yoe / 100)
        let mp = (5 * doy + 2) / 153
        let day = doy - (153 * mp + 2) / 5 + 1
        let month = mp < 10 ? mp + 3 : mp - 9
        return CalendarDate(year: yoe + era * 400 + (month <= 2 ? 1 : 0), month: month, day: day)
    }

    public static func compare(_ a: DateString, _ b: DateString) throws -> Int {
        try dayNumber(parse(a)) - dayNumber(parse(b))
    }

    public static func daysBetween(_ from: DateString, _ to: DateString) throws -> Int {
        try dayNumber(parse(to)) - dayNumber(parse(from))
    }

    public static func addDays(_ date: DateString, _ days: Int) throws -> DateString {
        try format(fromDayNumber(dayNumber(parse(date)) + days))
    }

    /// Monate addieren; fehlt der Tag im Zielmonat, gilt der Monatsletzte (31. Jan + 1 Monat = 28./29. Feb).
    public static func addMonths(_ date: DateString, _ months: Int) throws -> DateString {
        let d = try parse(date)
        let total = d.year * 12 + (d.month - 1) + months
        let year = Int((Double(total) / 12).rounded(.down))
        let month = total - year * 12 + 1
        return format(CalendarDate(year: year, month: month, day: min(d.day, daysInMonth(year, month))))
    }

    /// Wochentag: 0 = Montag … 6 = Sonntag.
    public static func weekday(_ date: DateString) throws -> Int {
        let n = try dayNumber(parse(date))
        return ((n + 3) % 7 + 7) % 7
    }

    /// Heutiges Datum in lokaler Zeit (der Kalendertag, den Eltern gerade erleben).
    public static func today(_ now: Date = Date(), calendar: Calendar = .current) -> DateString {
        let c = calendar.dateComponents([.year, .month, .day], from: now)
        return format(CalendarDate(year: c.year ?? 1970, month: c.month ?? 1, day: c.day ?? 1))
    }
}
