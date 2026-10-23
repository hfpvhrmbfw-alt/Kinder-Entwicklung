// Meilenstein-Logik, wie src/core/milestones.ts.
// Grundsatz: Ein nicht abgehakter Schritt ist KEIN Warnsignal. Nur wo der Content quellengestützt
// `consultHintFromMonths` setzt, zeigt die App einen ruhigen Hinweis auf den nächsten Arzttermin.

import Foundation

/// Schritte, deren Fenster so lange vorbei ist, stehen nicht mehr unter „Offen“ und tragen keinen Hinweis.
public let longPastMonths: Double = 12

public enum MilestonePhase: String, Codable, Sendable {
    case upcoming, inWindow, afterWindow
}

public struct MilestoneStatus: Hashable, Sendable {
    public var milestone: Milestone
    public var phase: MilestonePhase
    public var record: MilestoneRecord?
    public var achieved: Bool
    public var showConsultHint: Bool
    public var longPast: Bool
}

public func milestonePhase(_ m: Milestone, ageMonths: Double) -> MilestonePhase {
    if ageMonths < m.window.fromMonths { return .upcoming }
    if ageMonths < m.window.toMonths { return .inWindow }
    return .afterWindow
}

public func milestoneStatus(_ m: Milestone, ageMonths: Double, records: [MilestoneRecord]) -> MilestoneStatus {
    let record = records.first { $0.milestoneId == m.id }
    let achieved = record != nil
    let end = max(m.window.toMonths, m.consultHintFromMonths ?? 0)
    let longPast = !achieved && ageMonths >= end + longPastMonths
    let consult = !achieved && !longPast && m.consultHintFromMonths.map { ageMonths >= $0 } == true
    return MilestoneStatus(milestone: m, phase: milestonePhase(m, ageMonths: ageMonths), record: record, achieved: achieved,
                           showConsultHint: consult, longPast: longPast)
}

func overlaps(_ window: MilestoneWindow, _ range: MonthRange) -> Bool {
    window.fromMonths < range.maxMonths && window.toMonths > range.minMonths
}

/// Alle Schritte, deren Fenster das Altersband berührt, plus frühere, noch nicht abgehakte; nach Fensterbeginn.
public func milestonesForOverview(_ milestones: [Milestone], band: MonthRange, ageMonths: Double, records: [MilestoneRecord]) -> [MilestoneStatus] {
    milestones
        .map { milestoneStatus($0, ageMonths: ageMonths, records: records) }
        .filter { overlaps($0.milestone.window, band) || ($0.phase == .afterWindow && !$0.achieved) }
        .stableSorted { $0.milestone.window.fromMonths < $1.milestone.window.fromMonths }
}

/// Schritte für eine Ansicht: offen (Standard), geschafft oder alle.
public func milestonesForView(_ milestones: [Milestone], band: MonthRange, ageMonths: Double, records: [MilestoneRecord], view: MilestoneView) -> [MilestoneStatus] {
    if view == .achieved {
        return milestones
            .map { milestoneStatus($0, ageMonths: ageMonths, records: records) }
            .filter(\.achieved)
            .stableSorted { $0.milestone.window.fromMonths < $1.milestone.window.fromMonths }
    }
    let overview = milestonesForOverview(milestones, band: band, ageMonths: ageMonths, records: records)
    return view == .open ? overview.filter { !$0.achieved && !$0.longPast } : overview
}

/// Teilt in „aktuell“ (Fenster berührt das Band oder Hinweis fällig) und „früher, noch nicht abgehakt“.
public func splitOverview(_ statuses: [MilestoneStatus], band: MonthRange) -> (current: [MilestoneStatus], earlier: [MilestoneStatus]) {
    var current: [MilestoneStatus] = []
    var earlier: [MilestoneStatus] = []
    for s in statuses {
        if overlaps(s.milestone.window, band) || s.showConsultHint { current.append(s) } else { earlier.append(s) }
    }
    return (current, earlier)
}

/// Vorschau: Schritte, deren Fenster in den nächsten `months` Monaten beginnt.
public func upcomingMilestones(_ milestones: [Milestone], ageMonths: Double, months: Double = 3) -> [Milestone] {
    milestones
        .filter { $0.window.fromMonths > ageMonths && $0.window.fromMonths <= ageMonths + months }
        .stableSorted { $0.window.fromMonths < $1.window.fromMonths }
}

/// „Gerade spannend“: nicht erreichte Schritte, deren Fenster läuft (Zone der nächsten Entwicklung).
public func activeMilestones(_ milestones: [Milestone], ageMonths: Double, records: [MilestoneRecord]) -> [Milestone] {
    let done = Set(records.map(\.milestoneId))
    return milestones.filter { !done.contains($0.id) && milestonePhase($0, ageMonths: ageMonths) == .inWindow }
}
