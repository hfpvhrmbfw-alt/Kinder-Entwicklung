// Gleiche Ergebnisse wie die Web-App: liest tests/fixtures/parity.json (erzeugt von tests/parity.test.ts).

import XCTest
@testable import KleineSchritteCore

private struct Parity: Decodable {
    struct RandomCase: Decodable { var seed: String; var hash: UInt32; var values: [Double] }
    struct Ranked: Decodable { var id: String; var score: Double; var reasons: [RecommendationReason] }
    struct RecommendCase: Decodable {
        struct Input: Decodable {
            var name: String
            var ageMonths: Double
            var today: String
            var seed: String
            var records: [MilestoneRecord]
            var logs: [ActivityLog]
            var favoriteIds: [String]
            var availableMinutes: Int?
            var location: LocationChoice?
            var limit: Int?
        }
        var input: Input
        var result: [Ranked]
    }
    struct DailyCase: Decodable {
        struct Input: Decodable { var childId: String; var ageMonths: Double; var today: String }
        var input: Input
        var id: String?
    }
    struct FilterCase: Decodable {
        struct Input: Decodable { var name: String; var filter: ActivityFilter }
        var input: Input
        var ids: [String]
    }
    struct AgeCase: Decodable {
        struct Input: Decodable { var birthDate: String; var dueDate: String?; var today: String; var useCorrectedAge: Bool }
        var input: Input
        var effectiveMonths: Double
        var band: String?
    }
    struct MilestoneCase: Decodable {
        struct Input: Decodable { var name: String; var ageMonths: Double; var view: MilestoneView; var records: [MilestoneRecord] }
        struct Row: Decodable, Equatable { var id: String; var phase: MilestonePhase; var achieved: Bool; var consult: Bool; var longPast: Bool }
        var input: Input
        var result: [Row]
    }
    struct CheckupCase: Decodable {
        struct Input: Decodable { var birthDate: String; var today: String; var records: [CheckupRecord] }
        struct Row: Decodable, Equatable { var id: String; var start: String; var end: String; var phase: CheckupPhase; var daysUntilStart: Int }
        var input: Input
        var result: [Row]
    }
    struct DoctorCase: Decodable {
        struct Input: Decodable { var ageMonths: Double; var today: String; var since: String; var records: [MilestoneRecord] }
        struct Row: Decodable, Equatable { var domain: DomainId; var achieved: [String]; var inWindow: [String]; var consult: [String] }
        var input: Input
        var since: String
        var domains: [Row]
        var undated: [String]
    }
    struct ReviewCase: Decodable {
        struct Input: Decodable { var from: String; var to: String; var records: [MilestoneRecord]; var logs: [ActivityLog] }
        var input: Input
        var milestones: [String]
        var played: Int
        var distinctIdeas: Int
        var favorites: [ReviewIdea]
        var domains: [ReviewDomain]
        var notes: [ReviewNote]
        var memories: [Memory]
    }
    struct IcsCase: Decodable { var now: String; var output: String }

    var random: [RandomCase]
    var recommend: [RecommendCase]
    var daily: [DailyCase]
    var filter: [FilterCase]
    var age: [AgeCase]
    var milestones: [MilestoneCase]
    var checkups: [CheckupCase]
    var doctor: [DoctorCase]
    var review: [ReviewCase]
    var ics: IcsCase
}

final class ParityTests: XCTestCase {
    private var parity: Parity!
    private var content: ContentBundle!

    override func setUpWithError() throws {
        parity = try JSONDecoder().decode(Parity.self, from: Repo.fixture("parity.json"))
        content = try Repo.content()
    }

    func testRandom() {
        for c in parity.random {
            XCTAssertEqual(hashString(c.seed), c.hash, c.seed)
            var r = SeededRandom(seed: c.seed)
            XCTAssertEqual((0..<5).map { _ in round6(r.next()) }, c.values, c.seed)
        }
    }

    func testRecommend() {
        for c in parity.recommend {
            let i = c.input
            let result = recommend(RecommendInput(activities: content.activities, milestones: content.milestones, ageMonths: i.ageMonths,
                                                  today: i.today, availableMinutes: i.availableMinutes, location: i.location,
                                                  milestoneRecords: i.records, logs: i.logs, favoriteIds: i.favoriteIds, seed: i.seed,
                                                  limit: i.limit ?? 5))
            XCTAssertEqual(result.map(\.activity.id), c.result.map(\.id), i.name)
            XCTAssertEqual(result.map { round6($0.score) }, c.result.map(\.score), i.name)
            XCTAssertEqual(result.map(\.reasons), c.result.map(\.reasons), i.name)
        }
    }

    func testDaily() {
        for c in parity.daily {
            let s = dailySuggestion(activities: content.activities, milestones: content.milestones, ageMonths: c.input.ageMonths,
                                    today: c.input.today, childId: c.input.childId)
            XCTAssertEqual(s?.activity.id, c.id)
        }
    }

    func testFilter() {
        for c in parity.filter {
            XCTAssertEqual(filterActivities(content.activities, c.input.filter).map(\.id).sorted(), c.ids, c.input.name)
        }
    }

    func testAge() throws {
        for c in parity.age {
            let age = try childAge(birthDate: c.input.birthDate, dueDate: c.input.dueDate, useCorrectedAge: c.input.useCorrectedAge, on: c.input.today)
            XCTAssertEqual(round6(age.effectiveMonths), c.effectiveMonths)
            XCTAssertEqual(ageBand(for: age.effectiveMonths, in: content.ageBands)?.id, c.band)
        }
    }

    func testMilestones() throws {
        for c in parity.milestones {
            let band = try XCTUnwrap(ageBand(for: c.input.ageMonths, in: content.ageBands))
            let rows = milestonesForView(content.milestones, band: band.range, ageMonths: c.input.ageMonths, records: c.input.records, view: c.input.view)
                .map { Parity.MilestoneCase.Row(id: $0.milestone.id, phase: $0.phase, achieved: $0.achieved, consult: $0.showConsultHint, longPast: $0.longPast) }
            XCTAssertEqual(rows, c.result, c.input.name)
        }
    }

    func testCheckups() throws {
        for c in parity.checkups {
            let rows = try checkupStatuses(content.checkups, birthDate: c.input.birthDate, today: c.input.today, records: c.input.records)
                .map { Parity.CheckupCase.Row(id: $0.checkup.id, start: $0.window.start, end: $0.window.end, phase: $0.phase, daysUntilStart: $0.daysUntilStart) }
            XCTAssertEqual(rows, c.result, c.input.birthDate)
        }
    }

    func testDoctor() throws {
        for c in parity.doctor {
            let o = try doctorOverview(milestones: content.milestones, records: c.input.records, ageMonths: c.input.ageMonths,
                                       today: c.input.today, since: c.input.since)
            XCTAssertEqual(o.since, c.since)
            XCTAssertEqual(o.domains.map { Parity.DoctorCase.Row(domain: $0.domain, achieved: $0.achieved.map(\.milestone.id),
                                                                inWindow: $0.inWindow.map(\.id), consult: $0.consult.map(\.id)) }, c.domains)
            XCTAssertEqual(o.undated.map(\.id), c.undated)
        }
    }

    func testReview() {
        for c in parity.review {
            let r = buildReview(milestones: content.milestones, activities: content.activities, records: c.input.records, logs: c.input.logs,
                                from: c.input.from, to: c.input.to)
            XCTAssertEqual(r.milestones.map(\.milestone.id), c.milestones)
            XCTAssertEqual(r.played, c.played)
            XCTAssertEqual(r.distinctIdeas, c.distinctIdeas)
            XCTAssertEqual(r.favorites, c.favorites)
            XCTAssertEqual(r.domains, c.domains)
            XCTAssertEqual(r.notes, c.notes)
            XCTAssertEqual(memories(today: c.input.to, records: c.input.records, logs: c.input.logs), c.memories)
        }
    }

    func testIcs() throws {
        let now = try XCTUnwrap(parseTimestamp(parity.ics.now))
        let out = try buildIcs([
            IcsEvent(uid: "u7-kind@kleine-schritte", title: "Mia: U7",
                     description: "Zeitraum für die U7 (21.–24. Lebensmonat). Termin vereinbaren, gelbes Heft mitnehmen; danke!",
                     start: "2027-10-31", end: "2028-01-30", alarmDaysBefore: 21),
            IcsEvent(uid: "x@kleine-schritte", title: "Ohne Erinnerung", start: "2026-12-01", end: "2026-12-01"),
        ], now: now)
        XCTAssertEqual(out, parity.ics.output)
    }
}
