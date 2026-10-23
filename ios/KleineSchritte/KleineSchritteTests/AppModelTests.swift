import XCTest
@testable import KleineSchritte
import KleineSchritteCore

/// Prüft, dass Content und Texte im App-Bundle liegen und sich laden lassen.
@MainActor
final class AppModelTests: XCTestCase {
    func testLoadsBundledContent() throws {
        let model = AppModel(store: nil)
        XCTAssertNil(model.loadError)
        XCTAssertGreaterThan(model.content.activities.count, 100)
        XCTAssertEqual(model.t("nav.today"), "Heute")
    }

    func testAddChild() {
        let model = AppModel(store: nil)
        model.update { $0.saveChild(Child(id: "k", name: "Mia", birthDate: "2025-01-01", createdAt: "", updatedAt: "")) }
        XCTAssertEqual(model.activeChild?.name, "Mia")
        XCTAssertNotNil(model.age(of: model.activeChild!))
    }
}
