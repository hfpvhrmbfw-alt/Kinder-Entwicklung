// Nutzerdaten (in der Web-App IndexedDB, hier eine JSON-Datei). Entspricht src/core/models/user.ts.
// Das Sicherungsformat ist dasselbe wie in der Web-App, damit Familien ihre Daten mitnehmen können.

import Foundation

/// "YYYY-MM-DD" ohne Uhrzeit.
public typealias DateString = String
/// ISO-8601-Zeitpunkt, z. B. "2026-10-08T10:30:00.000Z".
public typealias Timestamp = String

public struct Child: Codable, Hashable, Identifiable, Sendable {
    public var id: String
    public var name: String
    public var birthDate: DateString
    /// Errechneter Geburtstermin; nur bei Frühgeburt relevant.
    public var dueDate: DateString?
    /// Korrigiertes Alter verwenden (wirkt nur bis 24 Monate).
    public var useCorrectedAge: Bool
    public var photoId: String?
    public var createdAt: Timestamp
    public var updatedAt: Timestamp

    public init(id: String, name: String, birthDate: DateString, dueDate: DateString? = nil, useCorrectedAge: Bool = false,
                photoId: String? = nil, createdAt: Timestamp, updatedAt: Timestamp) {
        self.id = id
        self.name = name
        self.birthDate = birthDate
        self.dueDate = dueDate
        self.useCorrectedAge = useCorrectedAge
        self.photoId = photoId
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}

public struct MilestoneRecord: Codable, Hashable, Identifiable, Sendable {
    public var id: String
    public var childId: String
    public var milestoneId: String
    /// Seit wann das Kind es kann. Bei `dateUnknown` der Tag des Abhakens.
    public var achievedOn: DateString
    /// Abgehakt ohne bekanntes Datum.
    public var dateUnknown: Bool?
    public var note: String?

    public init(id: String, childId: String, milestoneId: String, achievedOn: DateString, dateUnknown: Bool? = nil, note: String? = nil) {
        self.id = id
        self.childId = childId
        self.milestoneId = milestoneId
        self.achievedOn = achievedOn
        self.dateUnknown = dateUnknown
        self.note = note
    }

    public var isDateUnknown: Bool { dateUnknown ?? false }
}

public struct ActivityRef: Codable, Hashable, Sendable {
    public var source: ActivityOrigin
    public var id: String

    public init(source: ActivityOrigin, id: String) {
        self.source = source
        self.id = id
    }
}

public enum Enjoyment: String, Codable, CaseIterable, Sendable {
    case low, medium, high
}

/// Eintrag im Verlauf.
public struct ActivityLog: Codable, Hashable, Identifiable, Sendable {
    public var id: String
    public var childIds: [String]
    public var activityRef: ActivityRef
    public var date: DateString
    public var durationMinutes: Int?
    public var enjoyment: Enjoyment?
    public var note: String?
    public var photoIds: [String]
    public var createdAt: Timestamp

    public init(id: String, childIds: [String], activityRef: ActivityRef, date: DateString, durationMinutes: Int? = nil,
                enjoyment: Enjoyment? = nil, note: String? = nil, photoIds: [String] = [], createdAt: Timestamp) {
        self.id = id
        self.childIds = childIds
        self.activityRef = activityRef
        self.date = date
        self.durationMinutes = durationMinutes
        self.enjoyment = enjoyment
        self.note = note
        self.photoIds = photoIds
        self.createdAt = createdAt
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        childIds = try c.decode([String].self, forKey: .childIds)
        activityRef = try c.decode(ActivityRef.self, forKey: .activityRef)
        date = try c.decode(DateString.self, forKey: .date)
        durationMinutes = try c.decodeIfPresent(Int.self, forKey: .durationMinutes)
        enjoyment = try c.decodeIfPresent(Enjoyment.self, forKey: .enjoyment)
        note = try c.decodeIfPresent(String.self, forKey: .note)
        photoIds = try c.decodeIfPresent([String].self, forKey: .photoIds) ?? []
        createdAt = try c.decodeIfPresent(Timestamp.self, forKey: .createdAt) ?? "\(date)T00:00:00.000Z"
    }
}

public struct Favorite: Codable, Hashable, Sendable {
    public var activityRef: ActivityRef
    public var addedAt: Timestamp

    public init(activityRef: ActivityRef, addedAt: Timestamp) {
        self.activityRef = activityRef
        self.addedAt = addedAt
    }
}

/// U-Untersuchung als erledigt eingetragen.
public struct CheckupRecord: Codable, Hashable, Identifiable, Sendable {
    public var id: String
    public var childId: String
    public var checkupId: String
    /// Tag der Untersuchung; fehlt = erledigt, Datum unbekannt.
    public var doneOn: DateString?

    public init(id: String, childId: String, checkupId: String, doneOn: DateString? = nil) {
        self.id = id
        self.childId = childId
        self.checkupId = checkupId
        self.doneOn = doneOn
    }
}

public struct PlanEntry: Codable, Hashable, Identifiable, Sendable {
    public var id: String
    public var childIds: [String]
    public var activityRef: ActivityRef
    public var date: DateString
    public var time: String?
}

public enum ThemePreference: String, Codable, Sendable {
    case system, light, dark
}

public enum MilestoneView: String, Codable, CaseIterable, Sendable {
    case open, achieved, all
}

public struct Settings: Codable, Hashable, Sendable {
    public var theme: ThemePreference
    public var locale: String
    public var activeChildId: String?
    public var homeMaterials: [String]
    public var onboardingDone: Bool
    public var disclaimerAcceptedAt: Timestamp?
    public var milestoneView: MilestoneView?
    public var hideDoneActivities: Bool?
    public var historyHideMilestones: Bool?
    public var installHintDismissed: Bool?
    public var lastBackupAt: Timestamp?
    public var backupReminderAt: Timestamp?

    public static let defaults = Settings()

    public init(theme: ThemePreference = .system, locale: String = "de", activeChildId: String? = nil, homeMaterials: [String] = [],
                onboardingDone: Bool = false) {
        self.theme = theme
        self.locale = locale
        self.activeChildId = activeChildId
        self.homeMaterials = homeMaterials
        self.onboardingDone = onboardingDone
    }

    /// Fehlende Felder bekommen die Standardwerte (wie `{ ...DEFAULT_SETTINGS, ...settings }`).
    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        theme = try c.decodeIfPresent(ThemePreference.self, forKey: .theme) ?? .system
        locale = try c.decodeIfPresent(String.self, forKey: .locale) ?? "de"
        activeChildId = try c.decodeIfPresent(String.self, forKey: .activeChildId)
        homeMaterials = try c.decodeIfPresent([String].self, forKey: .homeMaterials) ?? []
        onboardingDone = try c.decodeIfPresent(Bool.self, forKey: .onboardingDone) ?? false
        disclaimerAcceptedAt = try c.decodeIfPresent(Timestamp.self, forKey: .disclaimerAcceptedAt)
        milestoneView = try c.decodeIfPresent(MilestoneView.self, forKey: .milestoneView)
        hideDoneActivities = try c.decodeIfPresent(Bool.self, forKey: .hideDoneActivities)
        historyHideMilestones = try c.decodeIfPresent(Bool.self, forKey: .historyHideMilestones)
        installHintDismissed = try c.decodeIfPresent(Bool.self, forKey: .installHintDismissed)
        lastBackupAt = try c.decodeIfPresent(Timestamp.self, forKey: .lastBackupAt)
        backupReminderAt = try c.decodeIfPresent(Timestamp.self, forKey: .backupReminderAt)
    }
}

public struct BackupPhoto: Codable, Hashable, Sendable {
    public var id: String
    public var mimeType: String
    public var dataBase64: String
}

public let backupFormat = "kleine-schritte-backup"
public let backupSchemaVersion = 1

/// Alle Nutzerdaten. Gleichzeitig Inhalt der Sicherungsdatei (ohne Kopfzeilen) und der Speicherdatei der App.
public struct UserData: Codable, Hashable, Sendable {
    public var children: [Child] = []
    public var milestoneRecords: [MilestoneRecord] = []
    public var activityLogs: [ActivityLog] = []
    public var favorites: [Favorite] = []
    public var customActivities: [Activity] = []
    public var planEntries: [PlanEntry] = []
    public var settings: Settings = .defaults
    public var photos: [BackupPhoto] = []
    public var checkupRecords: [CheckupRecord] = []
    /// Fragen für den Arzttermin je Kind (Schlüssel: Kind-ID).
    public var doctorQuestions: [String: String] = [:]

    public init() {}
}

/// Sicherungsdatei, wie die Web-App sie schreibt und liest.
public struct Backup: Codable, Sendable {
    public var format: String
    public var schemaVersion: Int
    public var exportedAt: Timestamp
    public var appVersion: String
    public var children: [Child]
    public var milestoneRecords: [MilestoneRecord]
    public var activityLogs: [ActivityLog]
    public var favorites: [Favorite]
    public var customActivities: [Activity]
    public var planEntries: [PlanEntry]
    public var settings: Settings
    public var photos: [BackupPhoto]
    public var checkupRecords: [CheckupRecord]
    public var doctorQuestions: [String: String]

    public var data: UserData {
        var d = UserData()
        d.children = children
        d.milestoneRecords = milestoneRecords
        d.activityLogs = activityLogs
        d.favorites = favorites
        d.customActivities = customActivities
        d.planEntries = planEntries
        d.settings = settings
        d.photos = photos
        d.checkupRecords = checkupRecords
        d.doctorQuestions = doctorQuestions
        return d
    }
}
