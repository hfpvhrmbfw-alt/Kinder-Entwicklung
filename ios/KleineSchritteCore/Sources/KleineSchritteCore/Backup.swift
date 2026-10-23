// Sicherungsdatei: Export und Import aller Nutzerdaten, wie src/core/backup.ts.
// Gleiches Format wie die Web-App: Sicherungen lassen sich zwischen Web und iPhone austauschen.

import Foundation

public enum BackupError: Error, Equatable, Sendable {
    case notJson
    case wrongFormat
    case tooNew
    case invalid(String)

    public var code: String {
        switch self {
        case .notJson: return "notJson"
        case .wrongFormat: return "wrongFormat"
        case .tooNew: return "tooNew"
        case .invalid: return "invalid"
        }
    }
}

public func createBackup(_ data: UserData, appVersion: String, now: Date = Date()) -> Backup {
    Backup(format: backupFormat, schemaVersion: backupSchemaVersion, exportedAt: isoTimestamp(now), appVersion: appVersion,
           children: data.children, milestoneRecords: data.milestoneRecords, activityLogs: data.activityLogs,
           favorites: data.favorites, customActivities: data.customActivities, planEntries: data.planEntries,
           settings: data.settings, photos: data.photos, checkupRecords: data.checkupRecords,
           doctorQuestions: data.doctorQuestions)
}

/// Sicherung als JSON (eingerückt wie in der Web-App, Schlüssel sortiert für stabile Dateien).
public func encodeBackup(_ backup: Backup) throws -> Data {
    let encoder = JSONEncoder()
    encoder.outputFormatting = [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]
    return try encoder.encode(backup)
}

/// Migrationen: Schlüssel = Ausgangsversion. Jede hebt das Backup um eine Version an.
private let migrations: [Int: ([String: Any]) -> [String: Any]] = [:]

/// Liest und prüft eine Sicherungsdatei. Wirft `BackupError` mit sprechendem Code.
public func parseBackup(_ data: Data) throws -> Backup {
    guard let raw = try? JSONSerialization.jsonObject(with: data) else { throw BackupError.notJson }
    guard var b = raw as? [String: Any], b["format"] as? String == backupFormat else { throw BackupError.wrongFormat }
    guard let number = (b["schemaVersion"] as? NSNumber)?.doubleValue, number == number.rounded(), number >= 1 else {
        throw BackupError.invalid("schemaVersion")
    }
    var version = Int(number)
    if version > backupSchemaVersion { throw BackupError.tooNew }
    while version < backupSchemaVersion {
        guard let migrate = migrations[version] else { throw BackupError.invalid("keine Migration ab Version \(version)") }
        b = migrate(b)
        version += 1
    }

    for key in ["children", "milestoneRecords", "activityLogs", "favorites", "customActivities", "planEntries", "photos", "checkupRecords"] {
        if b[key] == nil || b[key] is NSNull { b[key] = [Any]() }
        guard b[key] is [Any] else { throw BackupError.invalid(key) }
    }
    if b["settings"] == nil || b["settings"] is NSNull { b["settings"] = [String: Any]() }
    if b["doctorQuestions"] == nil { b["doctorQuestions"] = [String: Any]() }
    guard let questions = b["doctorQuestions"] as? [String: Any], questions.values.allSatisfy({ $0 is String }) else {
        throw BackupError.invalid("doctorQuestions")
    }
    if b["exportedAt"] == nil { b["exportedAt"] = "" }
    if b["appVersion"] == nil { b["appVersion"] = "" }

    let backup: Backup
    do {
        let normalized = try JSONSerialization.data(withJSONObject: b)
        backup = try JSONDecoder().decode(Backup.self, from: normalized)
    } catch let error as DecodingError {
        throw BackupError.invalid(decodingPath(error))
    }

    for c in backup.children {
        guard Dates.isValid(c.birthDate) else { throw BackupError.invalid("children") }
        if let due = c.dueDate, !Dates.isValid(due) { throw BackupError.invalid("children.dueDate") }
    }
    let childIds = Set(backup.children.map(\.id))
    for r in backup.milestoneRecords where !childIds.contains(r.childId) || !Dates.isValid(r.achievedOn) {
        throw BackupError.invalid("milestoneRecords")
    }
    for l in backup.activityLogs where !Dates.isValid(l.date) {
        throw BackupError.invalid("activityLogs")
    }
    for r in backup.checkupRecords where !childIds.contains(r.childId) || (r.doneOn.map { !Dates.isValid($0) } ?? false) {
        throw BackupError.invalid("checkupRecords")
    }
    return backup
}

private func decodingPath(_ error: DecodingError) -> String {
    let context: DecodingError.Context
    switch error {
    case .typeMismatch(_, let c), .valueNotFound(_, let c), .dataCorrupted(let c): context = c
    case .keyNotFound(_, let c): context = c
    @unknown default: return "unbekannt"
    }
    return context.codingPath.first?.stringValue ?? "unbekannt"
}
