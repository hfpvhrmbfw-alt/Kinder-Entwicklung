// Speicherung der Nutzerdaten als JSON-Datei (in der App unter Application Support).
// Geschrieben wird atomar, damit ein Absturz beim Speichern keine halbe Datei hinterlässt.

import Foundation

public struct UserDataStore: Sendable {
    public var fileURL: URL

    public init(fileURL: URL) {
        self.fileURL = fileURL
    }

    /// Standardort: Application Support/KleineSchritte/daten.json
    public static func defaultLocation() throws -> UserDataStore {
        let base = try FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
        let dir = base.appendingPathComponent("KleineSchritte", isDirectory: true)
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return UserDataStore(fileURL: dir.appendingPathComponent("daten.json"))
    }

    /// Ohne Datei: leere Daten (erster Start).
    public func load() throws -> UserData {
        guard FileManager.default.fileExists(atPath: fileURL.path) else { return UserData() }
        let data = try Data(contentsOf: fileURL)
        // Gleiches Format wie die Sicherung, daher dieselbe Prüfung und dieselben Standardwerte.
        return try parseBackup(data).data
    }

    public func save(_ userData: UserData) throws {
        let backup = createBackup(userData, appVersion: "")
        try encodeBackup(backup).write(to: fileURL, options: [.atomic])
    }
}
