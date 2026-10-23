// Zustand der App: Content, Nutzerdaten und Texte. Die Oberfläche liest hier und ändert nur über `update`.
// Die eigentliche Logik liegt im Paket KleineSchritteCore (dieselbe wie in der Web-App).

import Foundation
import Observation
import SwiftUI
import KleineSchritteCore

@MainActor
@Observable
final class AppModel {
    let content: ContentBundle
    let strings: Strings
    let format: TextFormat
    private(set) var data: UserData
    private(set) var today: DateString
    /// Fehler beim Laden (Content oder gespeicherte Daten); wird auf der Startseite angezeigt.
    var loadError: String?
    var saveError: String?

    private let store: UserDataStore?

    /// `store: nil` für Vorschauen und Tests: nichts wird gespeichert.
    init(store: UserDataStore? = try? UserDataStore.defaultLocation()) {
        let bundle = Bundle.main
        var errors: [String] = []

        var loadedStrings: Strings?
        if let url = bundle.url(forResource: "de", withExtension: "json") {
            let overrides = bundle.url(forResource: "ios-de", withExtension: "json").flatMap { try? Data(contentsOf: $0) }
            do { loadedStrings = try Strings(json: Data(contentsOf: url), overrides: overrides) } catch { errors.append("Texte: \(error)") }
        }
        strings = loadedStrings ?? (try! Strings(json: Data("{}".utf8)))
        format = TextFormat(strings)

        var loadedContent = ContentBundle()
        if let url = bundle.url(forResource: "content", withExtension: nil) {
            do { loadedContent = try ContentLoader.load(from: url) } catch { errors.append("Inhalte: \(error)") }
        } else {
            errors.append("Inhalte fehlen im App-Paket.")
        }
        content = loadedContent

        self.store = store
        var loadedData = UserData()
        if let store {
            do { loadedData = try store.load() } catch {
                // Nicht überschreiben: die Datei bleibt daneben liegen und lässt sich als Sicherung einspielen.
                let moved = try? store.moveAside()
                errors.append("Gespeicherte Daten konnten nicht gelesen werden (\(error)). Die Datei liegt jetzt unter \(moved?.lastPathComponent ?? "?").")
            }
        }
        data = loadedData
        today = Dates.today()
        loadError = errors.isEmpty ? nil : errors.joined(separator: "\n")
    }

    func refreshToday() {
        let now = Dates.today()
        if now != today { today = now }
    }

    // MARK: Ändern und speichern

    func update(_ change: (inout UserData) -> Void) {
        change(&data)
        save()
    }

    private func save() {
        guard let store else { return }
        do {
            try store.save(data)
            saveError = nil
        } catch {
            saveError = "\(error)"
        }
    }

    /// Ersetzt alle Daten (Sicherung einspielen).
    func replaceAll(with newData: UserData) {
        data = newData
        loadError = nil
        save()
    }

    // MARK: Texte

    func t(_ key: String, _ params: [String: Any] = [:]) -> String { strings.t(key, params) }
    func tn(_ key: String, _ n: Int, _ params: [String: Any] = [:]) -> String { strings.tn(key, n, params) }

    // MARK: Abgeleitete Werte

    var settings: Settings { data.settings }

    var colorScheme: ColorScheme? {
        switch data.settings.theme {
        case .system: return nil
        case .light: return .light
        case .dark: return .dark
        }
    }

    var children: [Child] { data.sortedChildren }
    var activeChild: Child? { data.activeChild }

    func age(of child: Child) -> ChildAge? {
        try? childAge(child, on: today)
    }

    var allActivities: [Activity] { content.activities + data.customActivities }

    func activity(_ id: String) -> Activity? {
        allActivities.first { $0.id == id }
    }

    func milestone(_ id: String) -> Milestone? {
        content.milestones.first { $0.id == id }
    }

    func reference(_ id: String) -> Reference? {
        content.references.first { $0.id == id }
    }

    func material(_ id: String) -> Material? {
        content.materials.first { $0.id == id }
    }

    func band(for months: Double) -> AgeBand? {
        ageBand(for: months, in: content.ageBands)
    }

    func records(for child: Child) -> [MilestoneRecord] { data.milestoneRecords(for: child.id) }
    func logs(for child: Child?) -> [ActivityLog] { data.logs(for: child?.id) }

    func checkupStatuses(for child: Child) -> [CheckupStatus] {
        (try? KleineSchritteCore.checkupStatuses(content.checkups, birthDate: child.birthDate, today: today,
                                                  records: data.checkupRecords(for: child.id))) ?? []
    }

    func ref(_ a: Activity) -> ActivityRef { ActivityRef(source: a.origin, id: a.id) }
    func isFavorite(_ a: Activity) -> Bool { data.isFavorite(ref(a)) }

    func toggleFavorite(_ a: Activity) {
        let r = ref(a)
        update { $0.setFavorite(r, !$0.isFavorite(r)) }
    }

    func reasonText(_ r: RecommendationReason) -> String {
        switch r.kind {
        case .activeMilestone:
            return t("reason.activeMilestone", ["name": localize(r.milestoneId.flatMap(milestone)?.title)])
        case .activeDomain:
            return t("reason.activeDomain", ["name": r.domain.map(format.domain) ?? ""])
        case .neverDone: return t("reason.neverDone")
        case .favorite: return t("reason.favorite")
        case .likedBefore: return t("reason.likedBefore")
        }
    }
}

/// Lebensabschnitt für Begrüßung und Bild, wie stageFor in src/ui/art.ts.
enum Stage: String {
    case newborn, baby, toddler, preschool, school, none

    init(months: Double?) {
        guard let m = months else { self = .none; return }
        switch m {
        case ..<3: self = .newborn
        case ..<12: self = .baby
        case ..<36: self = .toddler
        case ..<72: self = .preschool
        default: self = .school
        }
    }
}
