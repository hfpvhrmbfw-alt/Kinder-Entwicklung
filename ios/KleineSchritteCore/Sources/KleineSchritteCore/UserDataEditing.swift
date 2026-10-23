// Änderungen an den Nutzerdaten, wie src/storage/repository.ts. Die Oberfläche ruft nur diese Funktionen auf
// und speichert danach; so bleibt die Logik testbar und unabhängig von SwiftUI.

import Foundation

public func newId() -> String { UUID().uuidString.lowercased() }

extension UserData {
    // MARK: Kinder

    /// Nach Geburtsdatum sortiert (älteste zuerst), wie in der Web-App.
    public var sortedChildren: [Child] { children.stableSorted { $0.birthDate < $1.birthDate } }

    public var activeChild: Child? {
        children.first { $0.id == settings.activeChildId } ?? sortedChildren.first
    }

    public mutating func saveChild(_ child: Child) {
        if let i = children.firstIndex(where: { $0.id == child.id }) { children[i] = child } else { children.append(child) }
        if settings.activeChildId == nil || !children.contains(where: { $0.id == settings.activeChildId }) {
            settings.activeChildId = child.id
        }
    }

    /// Löscht ein Kind samt Meilensteinen, U-Untersuchungen und Arztfragen; gemeinsame Verlaufseinträge verlieren nur den Bezug.
    public mutating func deleteChild(_ id: String) {
        if let photoId = children.first(where: { $0.id == id })?.photoId { photos.removeAll { $0.id == photoId } }
        children.removeAll { $0.id == id }
        milestoneRecords.removeAll { $0.childId == id }
        checkupRecords.removeAll { $0.childId == id }
        doctorQuestions[id] = nil
        activityLogs = activityLogs.compactMap { log in
            guard log.childIds.contains(id) else { return log }
            var l = log
            l.childIds.removeAll { $0 == id }
            return l.childIds.isEmpty ? nil : l
        }
        if settings.activeChildId == id { settings.activeChildId = sortedChildren.first?.id }
    }

    // MARK: Meilensteine

    public func milestoneRecords(for childId: String) -> [MilestoneRecord] {
        milestoneRecords.filter { $0.childId == childId }
    }

    /// Abhaken; ohne Datum zählt heute als Tag des Abhakens (`dateUnknown`).
    public mutating func markMilestone(_ milestoneId: String, childId: String, on date: DateString?, today: DateString, note: String? = nil) {
        let existing = milestoneRecords.first { $0.childId == childId && $0.milestoneId == milestoneId }
        let record = MilestoneRecord(id: existing?.id ?? newId(), childId: childId, milestoneId: milestoneId, achievedOn: date ?? today,
                                     dateUnknown: date == nil ? true : nil, note: note)
        milestoneRecords.removeAll { $0.id == record.id }
        milestoneRecords.append(record)
    }

    public mutating func unmarkMilestone(_ milestoneId: String, childId: String) {
        milestoneRecords.removeAll { $0.childId == childId && $0.milestoneId == milestoneId }
    }

    // MARK: Verlauf

    /// Neueste zuerst.
    public func logs(for childId: String?) -> [ActivityLog] {
        activityLogs.filter { childId == nil || $0.childIds.contains(childId!) }
            .stableSorted { $0.date > $1.date || ($0.date == $1.date && $0.createdAt > $1.createdAt) }
    }

    public mutating func saveLog(_ log: ActivityLog) {
        if let i = activityLogs.firstIndex(where: { $0.id == log.id }) { activityLogs[i] = log } else { activityLogs.append(log) }
    }

    public mutating func deleteLog(_ id: String) {
        activityLogs.removeAll { $0.id == id }
    }

    // MARK: Favoriten

    public func isFavorite(_ ref: ActivityRef) -> Bool {
        favorites.contains { $0.activityRef == ref }
    }

    public var favoriteIds: [String] { favorites.map(\.activityRef.id) }

    public mutating func setFavorite(_ ref: ActivityRef, _ on: Bool, now: Date = Date()) {
        favorites.removeAll { $0.activityRef == ref }
        if on { favorites.append(Favorite(activityRef: ref, addedAt: isoTimestamp(now))) }
    }

    // MARK: U-Untersuchungen

    public func checkupRecords(for childId: String) -> [CheckupRecord] {
        checkupRecords.filter { $0.childId == childId }
    }

    /// Ein vorhandener Eintrag für dasselbe Kind und dieselbe Untersuchung wird ersetzt.
    public mutating func saveCheckupRecords(_ records: [CheckupRecord]) {
        let keys = Set(records.map { "\($0.childId):\($0.checkupId)" })
        checkupRecords.removeAll { keys.contains("\($0.childId):\($0.checkupId)") }
        checkupRecords += records
    }

    public mutating func deleteCheckupRecord(_ id: String) {
        checkupRecords.removeAll { $0.id == id }
    }

    // MARK: Arztfragen

    public mutating func saveDoctorQuestions(_ text: String, childId: String) {
        doctorQuestions[childId] = text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : text
    }

    // MARK: Eigene Ideen

    public mutating func saveCustomActivity(_ a: Activity) {
        if let i = customActivities.firstIndex(where: { $0.id == a.id }) { customActivities[i] = a } else { customActivities.append(a) }
    }

    /// Löscht die Idee und ihren Favoriten; Verlaufseinträge bleiben („Gelöschte Idee“).
    public mutating func deleteCustomActivity(_ id: String) {
        customActivities.removeAll { $0.id == id }
        favorites.removeAll { $0.activityRef == ActivityRef(source: .custom, id: id) }
    }
}
