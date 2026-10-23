// Filter der Ideenbibliothek, wie src/core/filter.ts. Leere bzw. fehlende Werte bedeuten „egal“.

import Foundation

public enum LocationChoice: String, Codable, CaseIterable, Sendable {
    case any, indoor, outdoor
}

public struct ActivityFilter: Codable, Hashable, Sendable {
    /// Alter in Dezimal-Monaten; die Idee muss passen (mit Toleranz).
    public var ageMonths: Double?
    public var ageToleranceMonths: Double?
    public var domains: [DomainId]?
    public var categories: [CategoryId]?
    /// Höchstdauer in Minuten; es zählt die Mindestdauer der Idee.
    public var maxDurationMinutes: Int?
    public var location: LocationChoice?
    public var prepEfforts: [PrepEffort]?
    public var socialSettings: [SocialSetting]?
    /// Nur Ideen, deren Pflichtmaterial vollständig vorhanden ist.
    public var availableMaterialIds: [String]?
    /// Mindestens eines dieser Materialien wird verwendet.
    public var usesMaterialIds: [String]?
    public var query: String?
    public var onlyIds: [String]?
    /// Diese Ideen ausblenden, z. B. schon gemachte.
    public var excludeIds: [String]?

    public init(
        ageMonths: Double? = nil, ageToleranceMonths: Double? = nil, domains: [DomainId]? = nil, categories: [CategoryId]? = nil,
        maxDurationMinutes: Int? = nil, location: LocationChoice? = nil, prepEfforts: [PrepEffort]? = nil,
        socialSettings: [SocialSetting]? = nil, availableMaterialIds: [String]? = nil, usesMaterialIds: [String]? = nil,
        query: String? = nil, onlyIds: [String]? = nil, excludeIds: [String]? = nil
    ) {
        self.ageMonths = ageMonths
        self.ageToleranceMonths = ageToleranceMonths
        self.domains = domains
        self.categories = categories
        self.maxDurationMinutes = maxDurationMinutes
        self.location = location
        self.prepEfforts = prepEfforts
        self.socialSettings = socialSettings
        self.availableMaterialIds = availableMaterialIds
        self.usesMaterialIds = usesMaterialIds
        self.query = query
        self.onlyIds = onlyIds
        self.excludeIds = excludeIds
    }

    /// Anzahl aktiver Filter, für „Filter (3)“. Alter zählt nicht mit.
    public var activeCount: Int {
        var n = 0
        if !(domains ?? []).isEmpty { n += 1 }
        if !(categories ?? []).isEmpty { n += 1 }
        if maxDurationMinutes != nil { n += 1 }
        if let location, location != .any { n += 1 }
        if !(prepEfforts ?? []).isEmpty { n += 1 }
        if !(socialSettings ?? []).isEmpty { n += 1 }
        if availableMaterialIds != nil { n += 1 }
        if !(usesMaterialIds ?? []).isEmpty { n += 1 }
        return n
    }
}

public func matchesLocation(_ activity: Activity, _ choice: LocationChoice?) -> Bool {
    guard let choice, choice != .any else { return true }
    return activity.location == .both || activity.location.rawValue == choice.rawValue
}

/// Fehlendes Pflichtmaterial (leer = alles da).
public func missingMaterials(_ activity: Activity, available: some Sequence<String>) -> [String] {
    let have = Set(available)
    return activity.materials.filter { !$0.optional && !have.contains($0.materialId) }.map(\.materialId)
}

public func matchesFilter(_ activity: Activity, _ f: ActivityFilter, locale: String = "de") -> Bool {
    if let only = f.onlyIds, !only.contains(activity.id) { return false }
    if f.excludeIds?.contains(activity.id) == true { return false }
    if let age = f.ageMonths, !inRange(age, activity.ageRange, tolerance: f.ageToleranceMonths ?? 0) { return false }
    if let domains = f.domains, !domains.isEmpty, !activity.allDomains.contains(where: domains.contains) { return false }
    if let categories = f.categories, !categories.isEmpty, !categories.contains(activity.category) { return false }
    if let max = f.maxDurationMinutes, activity.durationMinutes.min > max { return false }
    if !matchesLocation(activity, f.location) { return false }
    if let prep = f.prepEfforts, !prep.isEmpty, !prep.contains(activity.prepEffort) { return false }
    if let social = f.socialSettings, !social.isEmpty, !activity.socialSettings.contains(where: social.contains) { return false }
    if let available = f.availableMaterialIds, !missingMaterials(activity, available: available).isEmpty { return false }
    if let uses = f.usesMaterialIds, !uses.isEmpty, !activity.materials.contains(where: { uses.contains($0.materialId) }) { return false }
    if let query = f.query, !query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
        let texts = ([activity.title, activity.summary] + activity.steps).map { $0.localized(locale) }
        let haystack = normalizeForSearch(texts.joined(separator: " ") + " " + (activity.tags ?? []).joined(separator: " "))
        let words = normalizeForSearch(query).split(whereSeparator: \.isWhitespace).map(String.init)
        if !words.allSatisfy({ haystack.contains($0) }) { return false }
    }
    return true
}

public func filterActivities(_ activities: [Activity], _ f: ActivityFilter, locale: String = "de") -> [Activity] {
    activities.filter { matchesFilter($0, f, locale: locale) }
}
