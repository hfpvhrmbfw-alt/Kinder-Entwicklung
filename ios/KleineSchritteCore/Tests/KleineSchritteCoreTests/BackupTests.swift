import XCTest
@testable import KleineSchritteCore

final class BackupTests: XCTestCase {
    private func json(_ s: String) -> Data { Data(s.utf8) }

    func testRoundTrip() throws {
        var data = UserData()
        data.children = [Child(id: "k1", name: "Mia", birthDate: "2025-03-14", createdAt: "2025-03-20T10:00:00.000Z", updatedAt: "2025-03-20T10:00:00.000Z")]
        data.milestoneRecords = [MilestoneRecord(id: "r1", childId: "k1", milestoneId: "gm-walks-alone", achievedOn: "2026-04-01")]
        data.activityLogs = [ActivityLog(id: "l1", childIds: ["k1"], activityRef: ActivityRef(source: .builtin, id: "a-peekaboo"), date: "2026-04-02",
                                         enjoyment: .high, note: "Gelacht", createdAt: "2026-04-02T09:00:00.000Z")]
        data.customActivities = [try buildCustomActivity(CustomActivityInput(title: "Kissenburg", minMonths: 24, maxMonths: 48, domain: .grossMotor,
                                                                              category: .movement, steps: "- Kissen holen\n2. Bauen\n\n"), id: "custom-1")]
        data.doctorQuestions = ["k1": "Schlaf?"]
        let encoded = try encodeBackup(createBackup(data, appVersion: "1.0.0", now: Date(timeIntervalSince1970: 0)))
        let parsed = try parseBackup(encoded)
        XCTAssertEqual(parsed.exportedAt, "1970-01-01T00:00:00.000Z")
        XCTAssertEqual(parsed.data, data)
        XCTAssertEqual(parsed.customActivities.first?.steps.map(\.de), ["Kissen holen", "Bauen"])
    }

    func testOldBackupWithoutNewFields() throws {
        let b = try parseBackup(json(#"{"format":"kleine-schritte-backup","schemaVersion":1,"exportedAt":"x","appVersion":"0.9.0","children":[{"id":"k","name":"A","birthDate":"2025-01-01","useCorrectedAge":false,"createdAt":"2025-01-01T00:00:00.000Z","updatedAt":"2025-01-01T00:00:00.000Z"}],"settings":{"theme":"dark"}}"#))
        XCTAssertEqual(b.children.count, 1)
        XCTAssertEqual(b.checkupRecords, [])
        XCTAssertEqual(b.doctorQuestions, [:])
        XCTAssertEqual(b.settings.theme, .dark)
        XCTAssertEqual(b.settings.locale, "de")
    }

    func testErrors() {
        func code(_ s: String) -> String? {
            do { _ = try parseBackup(json(s)); return nil } catch let e as BackupError { return e.code } catch { return "other" }
        }
        XCTAssertEqual(code("kein json"), "notJson")
        XCTAssertEqual(code(#"{"format":"anders"}"#), "wrongFormat")
        XCTAssertEqual(code(#"{"format":"kleine-schritte-backup","schemaVersion":99}"#), "tooNew")
        XCTAssertEqual(code(#"{"format":"kleine-schritte-backup","schemaVersion":1,"children":{}}"#), "invalid")
        XCTAssertEqual(code(#"{"format":"kleine-schritte-backup","schemaVersion":1,"children":[{"id":"k","name":"A","birthDate":"2025-02-30","useCorrectedAge":false,"createdAt":"","updatedAt":""}]}"#), "invalid")
        XCTAssertEqual(code(#"{"format":"kleine-schritte-backup","schemaVersion":1,"milestoneRecords":[{"id":"r","childId":"fremd","milestoneId":"m","achievedOn":"2025-01-01"}]}"#), "invalid")
    }

    func testStore() throws {
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("ks-\(UUID().uuidString).json")
        defer { try? FileManager.default.removeItem(at: url) }
        let store = UserDataStore(fileURL: url)
        XCTAssertEqual(try store.load(), UserData())
        var data = UserData()
        data.settings.onboardingDone = true
        try store.save(data)
        XCTAssertEqual(try store.load(), data)
    }

    func testCustomActivityValidation() {
        XCTAssertEqual(validateCustomActivity(CustomActivityInput(title: " ", domain: .language, category: .play)), .title)
        XCTAssertEqual(validateCustomActivity(CustomActivityInput(title: "A", minMonths: 12, maxMonths: 12, domain: .language, category: .play)), .age)
        XCTAssertEqual(validateCustomActivity(CustomActivityInput(title: "A", maxMonths: 90, domain: .language, category: .play)), .age)
        XCTAssertEqual(validateCustomActivity(CustomActivityInput(title: "A", domain: .language, category: .play, minutes: 0)), .minutes)
        XCTAssertEqual(linesToList("• Eins\n* Zwei\n3) Drei\n  \nVier ").map(\.de), ["Eins", "Zwei", "Drei", "Vier"])
    }

    func testBackupReminder() {
        let child = Child(id: "k", name: "A", birthDate: "2025-01-01", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "")
        let now = parseTimestamp("2026-02-01T00:00:00.000Z")!
        XCTAssertFalse(backupReminderDue(settings: Settings(), children: [], now: now))
        XCTAssertTrue(backupReminderDue(settings: Settings(), children: [child], now: now))
        var s = Settings()
        s.lastBackupAt = "2026-01-20T00:00:00.000Z"
        XCTAssertFalse(backupReminderDue(settings: s, children: [child], now: now))
    }
}

final class StoreRecoveryTests: XCTestCase {
    func testBrokenFileIsMovedAside() throws {
        let dir = FileManager.default.temporaryDirectory.appendingPathComponent("ks-\(UUID().uuidString)")
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: dir) }
        let store = UserDataStore(fileURL: dir.appendingPathComponent("daten.json"))
        try Data("kaputt".utf8).write(to: store.fileURL)
        XCTAssertThrowsError(try store.load())
        let moved = try store.moveAside()
        XCTAssertTrue(FileManager.default.fileExists(atPath: moved.path))
        XCTAssertEqual(try store.load(), UserData())
    }
}
