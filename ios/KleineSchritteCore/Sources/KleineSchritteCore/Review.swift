// Rückblick „Das hat sich getan“, wie src/core/review.ts. Ohne Vergleiche mit anderen Kindern.

import Foundation

public enum ReviewPeriod: String, CaseIterable, Sendable {
    case threeMonths = "3m", sixMonths = "6m", twelveMonths = "12m", all

    /// Erster Tag des Zeitraums; nil = alles.
    public func start(today: DateString) throws -> DateString? {
        let months: Int
        switch self {
        case .threeMonths: months = 3
        case .sixMonths: months = 6
        case .twelveMonths: months = 12
        case .all: return nil
        }
        return try Dates.addDays(Dates.addMonths(today, -months), 1)
    }
}

public struct ReviewIdea: Codable, Hashable, Sendable {
    public var activityId: String
    public var count: Int
    /// Wie oft „Begeistert“.
    public var loved: Int
}

public struct ReviewDomain: Codable, Hashable, Sendable {
    public var domain: DomainId
    public var milestones: Int
    public var ideas: Int
}

public struct ReviewNote: Codable, Hashable, Sendable {
    public var date: DateString
    public var activityId: String
    public var text: String
}

/// Geschaffter Schritt mit Datum.
public struct DatedMilestone: Hashable, Sendable {
    public var milestone: Milestone
    public var date: DateString
}

public struct ReviewSummary: Sendable {
    /// Mit Datum geschaffte Schritte im Zeitraum, neueste zuerst.
    public var milestones: [DatedMilestone]
    public var played: Int
    public var distinctIdeas: Int
    /// Höchstens drei: meiste „Begeistert“, dann meiste Einträge.
    public var favorites: [ReviewIdea]
    public var domains: [ReviewDomain]
    /// Neueste zuerst, höchstens fünf.
    public var notes: [ReviewNote]
}

private func within(_ date: DateString, _ from: DateString?, _ to: DateString) -> Bool {
    (from == nil || date >= from!) && date <= to
}

private func trimmed(_ s: String?) -> String? {
    guard let t = s?.trimmingCharacters(in: .whitespacesAndNewlines), !t.isEmpty else { return nil }
    return t
}

public func buildReview(milestones: [Milestone], activities: [Activity], records: [MilestoneRecord], logs allLogs: [ActivityLog],
                        from: DateString?, to: DateString) -> ReviewSummary {
    let milestoneIndex = Dictionary(milestones.map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
    let activityIndex = Dictionary(activities.map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })

    var done: [DatedMilestone] = []
    for r in records where !r.isDateUnknown && within(r.achievedOn, from, to) {
        if let m = milestoneIndex[r.milestoneId] { done.append(DatedMilestone(milestone: m, date: r.achievedOn)) }
    }
    done = done.stableSorted { a, b in a.date > b.date || (a.date == b.date && a.milestone.id < b.milestone.id) }

    let logs = allLogs.filter { within($0.date, from, to) }
    var order: [String] = []
    var ideas: [String: ReviewIdea] = [:]
    for l in logs {
        var idea = ideas[l.activityRef.id] ?? ReviewIdea(activityId: l.activityRef.id, count: 0, loved: 0)
        if ideas[l.activityRef.id] == nil { order.append(l.activityRef.id) }
        idea.count += 1
        if l.enjoyment == .high { idea.loved += 1 }
        ideas[l.activityRef.id] = idea
    }
    let favorites = order.compactMap { ideas[$0] }
        .filter { activityIndex[$0.activityId] != nil && ($0.loved > 0 || $0.count > 1) }
        .stableSorted { a, b in
            if a.loved != b.loved { return a.loved > b.loved }
            if a.count != b.count { return a.count > b.count }
            return a.activityId < b.activityId
        }
        .prefix(3)

    let domains = DomainId.allCases.map { domain in
        ReviewDomain(domain: domain,
                     milestones: done.filter { $0.milestone.domain == domain }.count,
                     ideas: order.filter { activityIndex[$0]?.domains.primary == domain }.count)
    }.filter { $0.milestones > 0 || $0.ideas > 0 }

    let notes = logs
        .filter { trimmed($0.note) != nil }
        .stableSorted { $0.date > $1.date || ($0.date == $1.date && $0.createdAt > $1.createdAt) }
        .prefix(5)
        .map { ReviewNote(date: $0.date, activityId: $0.activityRef.id, text: trimmed($0.note)!) }

    return ReviewSummary(milestones: done, played: logs.count, distinctIdeas: ideas.count, favorites: Array(favorites),
                         domains: domains, notes: Array(notes))
}

public struct Memory: Codable, Hashable, Sendable {
    public enum Kind: String, Codable, Sendable { case milestone, activity }
    public var yearsAgo: Int
    public var date: DateString
    public var kind: Kind
    /// Meilenstein- bzw. Ideen-ID.
    public var id: String
    public var note: String?
}

/// So viele Tage um den Jahrestag herum gilt ein Eintrag als „heute vor einem Jahr“.
public let memoryDays = 7

/// „Vor einem Jahr …“: geschaffte Schritte und begeisterte oder kommentierte Einträge.
public func memories(today: DateString, records: [MilestoneRecord], logs: [ActivityLog]) -> [Memory] {
    guard let year = try? Dates.parse(today).year else { return [] }
    func yearsAgo(_ date: DateString) -> Int? {
        guard let y = try? Dates.parse(date).year, year - y + 1 >= 1 else { return nil }
        for n in 1...(year - y + 1) {
            guard let anniversary = try? Dates.addMonths(today, -12 * n), let diff = try? Dates.daysBetween(anniversary, date) else { continue }
            if abs(diff) <= memoryDays { return n }
        }
        return nil
    }
    var out: [Memory] = []
    for r in records where !r.isDateUnknown {
        if let n = yearsAgo(r.achievedOn) { out.append(Memory(yearsAgo: n, date: r.achievedOn, kind: .milestone, id: r.milestoneId)) }
    }
    for l in logs where l.enjoyment == .high || trimmed(l.note) != nil {
        if let n = yearsAgo(l.date) { out.append(Memory(yearsAgo: n, date: l.date, kind: .activity, id: l.activityRef.id, note: trimmed(l.note))) }
    }
    return out.stableSorted { a, b in
        if a.yearsAgo != b.yearsAgo { return a.yearsAgo < b.yearsAgo }
        if a.kind != b.kind { return a.kind == .milestone }
        return a.date > b.date
    }
}
