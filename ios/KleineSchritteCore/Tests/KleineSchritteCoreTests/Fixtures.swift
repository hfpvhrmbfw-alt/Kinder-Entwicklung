// Zugriff auf die gemeinsamen Testfälle und den Content im Repository (eine Ebene über ios/).

import Foundation
@testable import KleineSchritteCore

enum Repo {
    /// .../ios/KleineSchritteCore/Tests/KleineSchritteCoreTests/Fixtures.swift → Repository-Wurzel
    static let root = URL(fileURLWithPath: #filePath)
        .deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
        .deletingLastPathComponent().deletingLastPathComponent()

    static func fixture(_ name: String) throws -> Data {
        try Data(contentsOf: root.appendingPathComponent("tests/fixtures/\(name)"))
    }

    nonisolated(unsafe) static var cachedContent: ContentBundle?

    static func content() throws -> ContentBundle {
        if let c = cachedContent { return c }
        let c = try ContentLoader.load(from: root.appendingPathComponent("content"))
        cachedContent = c
        return c
    }
}

func round6(_ x: Double) -> Double { (x * 1e6).rounded() / 1e6 }
