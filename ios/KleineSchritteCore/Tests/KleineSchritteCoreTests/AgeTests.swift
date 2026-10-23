import XCTest
@testable import KleineSchritteCore

private struct AgeCases: Decodable {
    struct Span: Decodable { var birth: String; var on: String; var months: Int; var days: Int; var totalDays: Int }
    struct ChildCase: Decodable {
        struct C: Decodable { var birthDate: String; var dueDate: String?; var useCorrectedAge: Bool }
        var name: String
        var child: C
        var on: String
        var chronologicalMonths: Int
        var correctedMonths: Int?
        var weeksPremature: Int?
        var usesCorrected: Bool
        var effectiveMonthsFloor: Int
    }
    var ageSpan: [Span]
    var childAge: [ChildCase]
}

final class AgeTests: XCTestCase {
    private func cases() throws -> AgeCases {
        try JSONDecoder().decode(AgeCases.self, from: Repo.fixture("age-cases.json"))
    }

    func testAgeSpan() throws {
        for c in try cases().ageSpan {
            let span = try ageSpan(birthDate: c.birth, on: c.on)
            XCTAssertEqual(span, AgeSpan(months: c.months, days: c.days, totalDays: c.totalDays), "\(c.birth) → \(c.on)")
        }
        XCTAssertThrowsError(try ageSpan(birthDate: "2025-05-01", on: "2025-04-30"))
    }

    func testChildAge() throws {
        for c in try cases().childAge {
            let age = try childAge(birthDate: c.child.birthDate, dueDate: c.child.dueDate, useCorrectedAge: c.child.useCorrectedAge, on: c.on)
            XCTAssertEqual(age.chronological.months, c.chronologicalMonths, c.name)
            XCTAssertEqual(age.usesCorrected, c.usesCorrected, c.name)
            XCTAssertEqual(Int(age.effectiveMonths.rounded(.down)), c.effectiveMonthsFloor, c.name)
            if let m = c.correctedMonths { XCTAssertEqual(age.corrected?.months, m, c.name) }
            if let w = c.weeksPremature { XCTAssertEqual(age.weeksPremature, w, c.name) }
        }
    }

    func testDates() throws {
        XCTAssertEqual(try Dates.addMonths("2025-01-31", 1), "2025-02-28")
        XCTAssertEqual(try Dates.addMonths("2024-01-31", 1), "2024-02-29")
        XCTAssertEqual(try Dates.addDays("2026-12-31", 1), "2027-01-01")
        XCTAssertEqual(try Dates.daysBetween("2026-01-01", "2027-01-01"), 365)
        XCTAssertFalse(Dates.isValid("2026-02-30"))
        XCTAssertFalse(Dates.isValid("2026-2-3"))
    }
}
