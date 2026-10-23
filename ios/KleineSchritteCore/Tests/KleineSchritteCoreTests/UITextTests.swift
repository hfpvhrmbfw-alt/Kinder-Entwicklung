import XCTest
@testable import KleineSchritteCore

final class UITextTests: XCTestCase {
    private func strings() throws -> Strings {
        try Strings(contentsOf: Repo.root.appendingPathComponent("src/i18n/locales/de.json"))
    }

    func testStrings() throws {
        let s = try strings()
        XCTAssertEqual(s.t("nav.today"), "Heute")
        XCTAssertEqual(s.t("common.minutes", ["n": 5]), "5 Min.")
        XCTAssertEqual(s.tn("age.months", 1), "1 Monat")
        XCTAssertEqual(s.tn("age.months", 3), "3 Monate")
        XCTAssertEqual(s.t("gibt.es.nicht"), "gibt.es.nicht")
        XCTAssertEqual(s.t("today.hello", ["name": "Mia"]), "Hallo! Mia ist heute {age} alt.")
    }

    func testOverrides() throws {
        let s = try Strings(json: Data(#"{"a":{"b":"Web","c":"bleibt"}}"#.utf8), overrides: Data(#"{"a":{"b":"iPhone"}}"#.utf8))
        XCTAssertEqual(s.t("a.b"), "iPhone")
        XCTAssertEqual(s.t("a.c"), "bleibt")
    }

    func testIosOverridesFileIsValid() throws {
        let url = Repo.root.appendingPathComponent("ios/KleineSchritte/KleineSchritte/Resources/ios-de.json")
        let s = try Strings(json: Data(contentsOf: Repo.root.appendingPathComponent("src/i18n/locales/de.json")), overrides: Data(contentsOf: url))
        XCTAssertFalse(s.t("privacy.s2p").contains("Browser"))
        XCTAssertFalse(s.t("backup.intro").contains("Browser"))
    }

    func testFormat() throws {
        let f = TextFormat(try strings())
        XCTAssertEqual(f.span(AgeSpan(months: 0, days: 5, totalDays: 5)), "5 Tage")
        XCTAssertEqual(f.span(AgeSpan(months: 2, days: 3, totalDays: 65)), "9 Wochen")
        XCTAssertEqual(f.span(AgeSpan(months: 30, days: 0, totalDays: 900)), "2 Jahre, 6 Monate")
        XCTAssertEqual(f.ageRange(MonthRange(minMonths: 6, maxMonths: 12)), "6–12 Monate")
        XCTAssertEqual(f.ageRange(MonthRange(minMonths: 36, maxMonths: 60)), "3–5 Jahre")
        XCTAssertEqual(f.ageRange(MonthRange(minMonths: 18, maxMonths: 36)), "18 Monate – 3 Jahre")
        XCTAssertEqual(f.window(MilestoneWindow(fromMonths: 4, toMonths: 9)), "4–9 Monaten")
        XCTAssertEqual(f.window(MilestoneWindow(fromMonths: 1.5, toMonths: 3)), "1.5–3 Monaten")
        XCTAssertEqual(f.date("2026-10-03"), "3. Oktober 2026")
        XCTAssertEqual(f.dateWithWeekday("2026-10-23"), "Freitag, 23. Oktober")
        XCTAssertEqual(f.weekdayShort("1970-01-01"), "Do")
        XCTAssertEqual(f.dateRange("2026-05-14", "2026-07-13"), "14. Mai – 13. Juli 2026")
        XCTAssertEqual(f.dateRange("2026-12-14", "2027-01-13"), "14. Dezember 2026 – 13. Januar 2027")
    }

    func testEditing() {
        var d = UserData()
        d.saveChild(Child(id: "a", name: "A", birthDate: "2024-01-01", createdAt: "", updatedAt: ""))
        d.saveChild(Child(id: "b", name: "B", birthDate: "2025-01-01", createdAt: "", updatedAt: ""))
        XCTAssertEqual(d.activeChild?.id, "a")
        d.markMilestone("m1", childId: "a", on: nil, today: "2026-10-23")
        d.markMilestone("m1", childId: "a", on: "2026-10-01", today: "2026-10-23")
        XCTAssertEqual(d.milestoneRecords.count, 1)
        XCTAssertEqual(d.milestoneRecords.first?.isDateUnknown, false)
        d.saveLog(ActivityLog(id: "l1", childIds: ["a", "b"], activityRef: ActivityRef(source: .builtin, id: "x"), date: "2026-10-01", createdAt: ""))
        d.saveLog(ActivityLog(id: "l2", childIds: ["a"], activityRef: ActivityRef(source: .builtin, id: "y"), date: "2026-10-02", createdAt: ""))
        d.saveDoctorQuestions("Schlaf", childId: "a")
        d.saveCheckupRecords([CheckupRecord(id: "c", childId: "a", checkupId: "u5")])
        d.deleteChild("a")
        XCTAssertEqual(d.activeChild?.id, "b")
        XCTAssertEqual(d.activityLogs.map(\.id), ["l1"])
        XCTAssertEqual(d.activityLogs.first?.childIds, ["b"])
        XCTAssertTrue(d.milestoneRecords.isEmpty && d.checkupRecords.isEmpty && d.doctorQuestions.isEmpty)

        let ref = ActivityRef(source: .custom, id: "custom-1")
        d.setFavorite(ref, true)
        XCTAssertTrue(d.isFavorite(ref))
        d.deleteCustomActivity("custom-1")
        XCTAssertFalse(d.isFavorite(ref))
    }
}
