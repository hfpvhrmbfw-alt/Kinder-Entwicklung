// Anzeigeformate, wie src/ui/format.ts. Datumsangaben ohne Systemkalender, damit sie überall gleich aussehen.

import Foundation

public struct TextFormat: Sendable {
    public let s: Strings

    public init(_ strings: Strings) {
        s = strings
    }

    public func span(_ span: AgeSpan) -> String {
        if span.months == 0 {
            return span.totalDays < 14 ? s.tn("age.days", span.totalDays) : s.tn("age.weeks", span.totalDays / 7)
        }
        if span.months < 3 { return s.tn("age.weeks", span.totalDays / 7) }
        if span.months < 24 { return s.tn("age.months", span.months) }
        let years = span.months / 12
        let rest = span.months % 12
        return rest > 0 ? "\(s.tn("age.years", years)), \(s.tn("age.months", rest))" : s.tn("age.years", years)
    }

    public func childAge(_ age: ChildAge) -> String {
        let base = span(age.chronological)
        if let c = age.corrected, age.usesCorrected { return "\(base) (\(s.t("age.corrected", ["age": span(c)])))" }
        return base
    }

    /// Monatsangabe: unter 24 Monaten in Monaten, sonst in Jahren.
    public func months(_ m: Double) -> String {
        let n = Int(m)
        if m < 24 || n % 12 != 0 { return s.tn("age.months", n) }
        return s.tn("age.years", n / 12)
    }

    public func ageRange(_ r: MonthRange) -> String {
        let a = r.minMonths, b = r.maxMonths
        let y = { (m: Double) in m.truncatingRemainder(dividingBy: 12) == 0 }
        if b <= 24 || !y(a) || !y(b) {
            if a >= 24 && y(a) && y(b) { return s.t("age.rangeYears", ["min": a / 12, "max": b / 12]) }
            if b > 24 && y(b) { return s.t("age.rangeMixed", ["min": a, "max": b / 12]) }
            return s.t("age.rangeMonths", ["min": a, "max": b])
        }
        return s.t("age.rangeYears", ["min": a / 12, "max": b / 12])
    }

    public func duration(_ a: Activity) -> String {
        let d = a.durationMinutes
        return d.min == d.max ? s.t("common.minutes", ["n": d.min]) : s.t("common.minutesRange", ["min": d.min, "max": d.max])
    }

    /// „meist mit 4–9 Monaten“, „3–4 Jahren“, „18 Monaten bis 3 Jahren“.
    public func window(_ w: MilestoneWindow) -> String {
        let years = { (m: Double) in m >= 24 && m.truncatingRemainder(dividingBy: 12) == 0 }
        if years(w.fromMonths) && years(w.toMonths) { return s.t("age.windowYears", ["from": w.fromMonths / 12, "to": w.toMonths / 12]) }
        if years(w.toMonths) && w.toMonths > 24 { return s.t("age.windowMixed", ["from": w.fromMonths, "to": w.toMonths / 12]) }
        return s.t("age.windowMonths", ["from": w.fromMonths, "to": w.toMonths])
    }

    private static let monthNames = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"]

    /// „23. Oktober 2026“; ohne Jahr „23. Oktober“.
    public func date(_ value: DateString, withYear: Bool = true) -> String {
        guard let d = try? Dates.parse(value) else { return value }
        let base = "\(d.day). \(Self.monthNames[d.month - 1])"
        return withYear ? "\(base) \(d.year)" : base
    }

    public static let weekdayNames = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"]

    /// „Freitag, 23. Oktober“
    public func dateWithWeekday(_ value: DateString) -> String {
        guard let w = try? Dates.weekday(value) else { return value }
        return "\(Self.weekdayNames[w]), \(date(value, withYear: false))"
    }

    /// „Fr“
    public func weekdayShort(_ value: DateString) -> String {
        guard let w = try? Dates.weekday(value) else { return "" }
        return String(Self.weekdayNames[w].prefix(2))
    }

    /// „14. Mai – 13. Juli 2026“; ein Tag ohne Strich.
    public func dateRange(_ start: DateString, _ end: DateString) -> String {
        if start == end { return date(start) }
        let sameYear = start.prefix(4) == end.prefix(4)
        return "\(date(start, withYear: !sameYear)) – \(date(end))"
    }

    public func domain(_ d: DomainId) -> String { s.t("domain.\(d.rawValue)") }
}
