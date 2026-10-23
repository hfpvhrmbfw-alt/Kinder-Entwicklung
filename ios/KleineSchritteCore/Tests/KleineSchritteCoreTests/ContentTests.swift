import XCTest
@testable import KleineSchritteCore

final class ContentTests: XCTestCase {
    func testLoadsAllContent() throws {
        let c = try Repo.content()
        XCTAssertGreaterThan(c.activities.count, 100)
        XCTAssertGreaterThan(c.milestones.count, 50)
        XCTAssertEqual(c.checkups.map(\.id), ["u1", "u2", "u3", "u4", "u5", "u6", "u7", "u7a", "u8", "u9"])
        XCTAssertFalse(c.ageBands.isEmpty)
        // Fehlende Listen aus dem Redaktionssystem werden ergänzt
        XCTAssertTrue(c.activities.allSatisfy { $0.origin == .builtin })
    }

    func testReferencesResolve() throws {
        let c = try Repo.content()
        let refs = Set(c.references.map(\.id))
        for a in c.activities { for r in a.references { XCTAssertTrue(refs.contains(r.referenceId), "\(a.id) → \(r.referenceId)") } }
        for m in c.milestones { for r in m.references { XCTAssertTrue(refs.contains(r.referenceId), "\(m.id) → \(r.referenceId)") } }
    }
}
