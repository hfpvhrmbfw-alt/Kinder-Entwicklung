// Empfehlung für „Was passt heute?“ und den Tagesvorschlag, wie src/core/recommend.ts.
// Deterministisch: gleiche Eingabe → gleiches Ergebnis wie in der Web-App (siehe Parity-Tests).

import Foundation

public enum Recommend {
    /// Toleranz in Monaten an den Rändern der Altersspanne.
    public static let ageToleranceMonths: Double = 2

    enum W {
        static let relatedActiveMilestone = 3.0
        static let maxRelatedMilestonesCounted = 2
        static let activeDomainPrimary = 1.5
        static let activeDomainSecondary = 0.5
        static let neverDone = 1.0
        static let doneVeryRecently = -3.0
        static let doneRecently = -1.0
        static let favorite = 1.0
        static let likedBefore = 1.0
        static let dislikedBefore = -1.0
        static let outsideCoreAge = -0.75
        static let jitter = 0.8
        static let samePrimaryDomainPenalty = 1.5
        static let sameCategoryPenalty = 0.5
    }
}

public enum ReasonKind: String, Codable, Sendable {
    case activeMilestone, activeDomain, neverDone, favorite, likedBefore
}

/// Begründung für die Anzeige („passt zu …“).
public struct RecommendationReason: Codable, Hashable, Sendable {
    public var kind: ReasonKind
    public var milestoneId: String?
    public var domain: DomainId?

    public init(kind: ReasonKind, milestoneId: String? = nil, domain: DomainId? = nil) {
        self.kind = kind
        self.milestoneId = milestoneId
        self.domain = domain
    }
}

public struct RankedActivity: Hashable, Sendable {
    public var activity: Activity
    public var score: Double
    public var reasons: [RecommendationReason]
}

public struct RecommendInput: Sendable {
    public var activities: [Activity]
    public var milestones: [Milestone]
    public var ageMonths: Double
    public var today: DateString
    public var availableMinutes: Int?
    public var location: LocationChoice?
    public var availableMaterialIds: [String]?
    public var milestoneRecords: [MilestoneRecord]
    /// Verlauf dieses Kindes.
    public var logs: [ActivityLog]
    public var favoriteIds: [String]
    /// Startwert für den Zufall, z. B. "\(today):\(childId)".
    public var seed: String
    public var limit: Int

    public init(activities: [Activity], milestones: [Milestone], ageMonths: Double, today: DateString, availableMinutes: Int? = nil,
                location: LocationChoice? = nil, availableMaterialIds: [String]? = nil, milestoneRecords: [MilestoneRecord] = [],
                logs: [ActivityLog] = [], favoriteIds: [String] = [], seed: String, limit: Int = 5) {
        self.activities = activities
        self.milestones = milestones
        self.ageMonths = ageMonths
        self.today = today
        self.availableMinutes = availableMinutes
        self.location = location
        self.availableMaterialIds = availableMaterialIds
        self.milestoneRecords = milestoneRecords
        self.logs = logs
        self.favoriteIds = favoriteIds
        self.seed = seed
        self.limit = limit
    }
}

private struct Scored {
    var activity: Activity
    var score: Double
    var base: Double
    var reasons: [RecommendationReason]
}

private func scoreActivity(_ activity: Activity, _ input: RecommendInput, activeIds: Set<String>, activeDomains: Set<DomainId>,
                           random: inout SeededRandom) -> Scored {
    typealias W = Recommend.W
    var reasons: [RecommendationReason] = []
    var score = 0.0

    // 1. Zone der nächsten Entwicklung
    let related = activity.relatedMilestoneIds.filter(activeIds.contains)
    if !related.isEmpty {
        score += W.relatedActiveMilestone * Double(min(related.count, W.maxRelatedMilestonesCounted))
        for id in related.prefix(W.maxRelatedMilestonesCounted) { reasons.append(RecommendationReason(kind: .activeMilestone, milestoneId: id)) }
    } else if activeDomains.contains(activity.domains.primary) {
        score += W.activeDomainPrimary
        reasons.append(RecommendationReason(kind: .activeDomain, domain: activity.domains.primary))
    } else if let sec = activity.domains.secondary.first(where: activeDomains.contains) {
        score += W.activeDomainSecondary
        reasons.append(RecommendationReason(kind: .activeDomain, domain: sec))
    }

    // 2. Verlauf
    let logs = input.logs.filter { $0.activityRef.id == activity.id }
    if logs.isEmpty {
        score += W.neverDone
        reasons.append(RecommendationReason(kind: .neverDone))
    } else {
        let daysSince = logs.compactMap { try? Dates.daysBetween($0.date, input.today) }.min() ?? Int.max
        if daysSince <= 3 { score += W.doneVeryRecently } else if daysSince <= 14 { score += W.doneRecently }
        let ratings = logs.compactMap(\.enjoyment)
        if ratings.contains(.high) {
            score += W.likedBefore
            reasons.append(RecommendationReason(kind: .likedBefore))
        } else if !ratings.isEmpty, ratings.allSatisfy({ $0 == .low }) {
            score += W.dislikedBefore
        }
    }

    // 3. Favorit
    if input.favoriteIds.contains(activity.id) {
        score += W.favorite
        reasons.append(RecommendationReason(kind: .favorite))
    }

    // 4. Nur über die Toleranz passend → leicht nach hinten
    if input.ageMonths < activity.ageRange.minMonths || input.ageMonths >= activity.ageRange.maxMonths { score += W.outsideCoreAge }

    // 5. Etwas Abwechslung von Tag zu Tag
    score += random.next() * W.jitter
    return Scored(activity: activity, score: score, base: score, reasons: reasons)
}

/// Rangliste passender Ideen.
public func recommend(_ input: RecommendInput) -> [RankedActivity] {
    let filter = ActivityFilter(ageMonths: input.ageMonths, ageToleranceMonths: Recommend.ageToleranceMonths,
                                maxDurationMinutes: input.availableMinutes, location: input.location,
                                availableMaterialIds: input.availableMaterialIds)
    let candidates = input.activities.filter { matchesFilter($0, filter) }
    let active = activeMilestones(input.milestones, ageMonths: input.ageMonths, records: input.milestoneRecords)
    let activeIds = Set(active.map(\.id))
    let activeDomains = Set(active.map(\.domain))

    // Nach ID sortiert, damit die Zufallsfolge nicht von der Eingabereihenfolge abhängt.
    var random = SeededRandom(seed: input.seed)
    var pool = candidates.stableSorted { $0.id < $1.id }.map {
        scoreActivity($0, input, activeIds: activeIds, activeDomains: activeDomains, random: &random)
    }

    // Gierige Auswahl mit Vielfalts-Abzug je bereits gewähltem Bereich und gewählter Kategorie.
    var picked: [Scored] = []
    while picked.count < input.limit, !pool.isEmpty {
        for i in pool.indices {
            let s = pool[i]
            let sameDomain = picked.filter { $0.activity.domains.primary == s.activity.domains.primary }.count
            let sameCategory = picked.filter { $0.activity.category == s.activity.category }.count
            pool[i].score = s.base - Double(sameDomain) * Recommend.W.samePrimaryDomainPenalty - Double(sameCategory) * Recommend.W.sameCategoryPenalty
        }
        pool = pool.stableSorted { $0.score > $1.score || ($0.score == $1.score && $0.activity.id < $1.activity.id) }
        picked.append(pool.removeFirst())
    }
    return picked.map { RankedActivity(activity: $0.activity, score: $0.score, reasons: $0.reasons) }
}

/// Tagesvorschlag: stabil für Kind und Tag.
public func dailySuggestion(activities: [Activity], milestones: [Milestone], ageMonths: Double, today: DateString, childId: String,
                            milestoneRecords: [MilestoneRecord] = [], logs: [ActivityLog] = [], favoriteIds: [String] = []) -> RankedActivity? {
    recommend(RecommendInput(activities: activities, milestones: milestones, ageMonths: ageMonths, today: today,
                             milestoneRecords: milestoneRecords, logs: logs, favoriteIds: favoriteIds,
                             seed: "daily:\(today):\(childId)", limit: 1)).first
}
