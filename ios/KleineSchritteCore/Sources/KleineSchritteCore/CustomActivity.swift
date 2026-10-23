// Eigene Ideen, wie src/core/customActivity.ts: aus einem einfachen Formular wird eine vollwertige Idee.

import Foundation

/// Obergrenze des Contents: Ende der 1. Klasse.
public let maxContentMonths: Double = 84
public let customIdPrefix = "custom-"

public struct CustomActivityInput: Hashable, Sendable {
    public var title: String
    public var summary: String
    public var minMonths: Double
    public var maxMonths: Double
    public var domain: DomainId
    public var category: CategoryId
    public var location: Location
    public var minutes: Int
    /// Mehrzeiliger Text: eine Zeile je Material bzw. Schritt bzw. Tipp.
    public var materials: String
    public var steps: String
    public var tips: String

    public init(title: String = "", summary: String = "", minMonths: Double = 0, maxMonths: Double = 12, domain: DomainId,
                category: CategoryId, location: Location = .indoor, minutes: Int = 10, materials: String = "", steps: String = "", tips: String = "") {
        self.title = title
        self.summary = summary
        self.minMonths = minMonths
        self.maxMonths = maxMonths
        self.domain = domain
        self.category = category
        self.location = location
        self.minutes = minutes
        self.materials = materials
        self.steps = steps
        self.tips = tips
    }

    /// Formular aus einer bestehenden eigenen Idee füllen.
    public init(_ a: Activity) {
        self.init(title: a.title.de, summary: a.summary.de, minMonths: a.ageRange.minMonths, maxMonths: a.ageRange.maxMonths,
                  domain: a.domains.primary, category: a.category, location: a.location, minutes: a.durationMinutes.min,
                  materials: listToLines(a.materialsText), steps: listToLines(a.steps), tips: listToLines(a.guidanceTips))
    }
}

public enum CustomActivityError: String, Error, Sendable {
    case title, age, minutes
}

private let bulletPattern = try! NSRegularExpression(pattern: #"^\s*(?:[-*•]|\d+[.)])\s+"#)

/// Text zeilenweise in eine Liste; leere Zeilen und Aufzählungszeichen fallen weg.
public func linesToList(_ text: String) -> [LocalizedText] {
    text.replacingOccurrences(of: "\r\n", with: "\n").split(separator: "\n", omittingEmptySubsequences: false).compactMap { line in
        let s = String(line)
        let range = NSRange(s.startIndex..., in: s)
        let stripped = bulletPattern.stringByReplacingMatches(in: s, range: range, withTemplate: "")
            .trimmingCharacters(in: .whitespaces)
        return stripped.isEmpty ? nil : LocalizedText(de: stripped)
    }
}

public func listToLines(_ list: [LocalizedText]?) -> String {
    (list ?? []).map(\.de).joined(separator: "\n")
}

public func validateCustomActivity(_ input: CustomActivityInput) -> CustomActivityError? {
    if input.title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { return .title }
    if !(input.minMonths >= 0 && input.maxMonths <= maxContentMonths && input.minMonths < input.maxMonths) { return .age }
    if !(input.minutes >= 1 && input.minutes <= 600) { return .minutes }
    return nil
}

public func newCustomActivityId() -> String {
    customIdPrefix + UUID().uuidString.lowercased()
}

/// Baut die Idee. `existing` behält Felder, die das Formular nicht kennt.
public func buildCustomActivity(_ input: CustomActivityInput, id: String, existing: Activity? = nil) throws -> Activity {
    if let error = validateCustomActivity(input) { throw error }
    var a = existing ?? Activity(id: id, origin: .custom, title: LocalizedText(de: ""), ageRange: MonthRange(minMonths: 0, maxMonths: maxContentMonths),
                                 domains: ActivityDomains(primary: input.domain), category: input.category, prepEffort: .low)
    let materialsText = linesToList(input.materials)
    a.origin = .custom
    a.title = LocalizedText(de: input.title.trimmingCharacters(in: .whitespacesAndNewlines))
    a.summary = LocalizedText(de: input.summary.trimmingCharacters(in: .whitespacesAndNewlines))
    a.ageRange = MonthRange(minMonths: input.minMonths, maxMonths: input.maxMonths)
    a.domains = ActivityDomains(primary: input.domain, secondary: a.domains.secondary.filter { $0 != input.domain })
    a.category = input.category
    a.durationMinutes = DurationRange(min: input.minutes, max: input.minutes)
    a.location = input.location
    a.steps = linesToList(input.steps)
    a.guidanceTips = linesToList(input.tips)
    a.materialsText = materialsText.isEmpty ? nil : materialsText
    return a
}
