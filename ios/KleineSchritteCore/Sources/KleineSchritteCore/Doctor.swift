// Übersicht für den Kinderarzttermin, wie src/core/doctor.ts. Neutral: nur die eigenen Einträge.

import Foundation

/// Ohne erledigte U-Untersuchung mit Datum: so viele Monate zurück.
public let doctorDefaultMonths = 6

public struct DoctorDomain: Hashable, Sendable {
    public var domain: DomainId
    /// Seit `since` mit Datum geschafft, älteste zuerst.
    public var achieved: [DatedMilestone]
    /// Nicht abgehakt, Fenster läuft gerade.
    public var inWindow: [Milestone]
    /// Nicht abgehakt, Hinweisgrenze erreicht: beim Termin ansprechen.
    public var consult: [Milestone]
}

public struct DoctorOverview: Sendable {
    public var since: DateString
    public var domains: [DoctorDomain]
    /// Ohne Datum abgehakte Schritte.
    public var undated: [Milestone]
}

public func doctorOverview(milestones: [Milestone], records: [MilestoneRecord], ageMonths: Double, today: DateString, since: DateString? = nil) throws -> DoctorOverview {
    let since = try since ?? Dates.addMonths(today, -doctorDefaultMonths)
    let statuses = milestones.map { milestoneStatus($0, ageMonths: ageMonths, records: records) }
    let byWindow: (Milestone, Milestone) -> Bool = { a, b in
        a.window.fromMonths < b.window.fromMonths || (a.window.fromMonths == b.window.fromMonths && a.id < b.id)
    }
    let domains = DomainId.allCases.map { domain -> DoctorDomain in
        let inDomain = statuses.filter { $0.milestone.domain == domain }
        let achieved = inDomain
            .compactMap { s -> DatedMilestone? in
                guard let r = s.record, !r.isDateUnknown, r.achievedOn >= since else { return nil }
                return DatedMilestone(milestone: s.milestone, date: r.achievedOn)
            }
            .stableSorted { $0.date < $1.date || ($0.date == $1.date && byWindow($0.milestone, $1.milestone)) }
        return DoctorDomain(
            domain: domain,
            achieved: achieved,
            inWindow: inDomain.filter { !$0.achieved && $0.phase == .inWindow && !$0.showConsultHint }.map(\.milestone).stableSorted(by: byWindow),
            consult: inDomain.filter(\.showConsultHint).map(\.milestone).stableSorted(by: byWindow)
        )
    }.filter { !$0.achieved.isEmpty || !$0.inWindow.isEmpty || !$0.consult.isEmpty }
    let undated = statuses.filter { $0.record?.isDateUnknown == true }.map(\.milestone).stableSorted(by: byWindow)
    return DoctorOverview(since: since, domains: domains, undated: undated)
}
