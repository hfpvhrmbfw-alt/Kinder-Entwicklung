// Vorführmodus für Screenshots aus dem Simulator (nur in Debug-Builds).
// Start mit `-demo` legt ein Beispielkind an und speichert nichts; `-tab 0…4` wählt den Bereich.

#if DEBUG
import Foundation
import KleineSchritteCore

enum DemoMode {
    static var isOn: Bool { ProcessInfo.processInfo.arguments.contains("-demo") }

    /// Bereich, der beim Start gezeigt wird.
    static var startTab: Int {
        let args = ProcessInfo.processInfo.arguments
        guard let i = args.firstIndex(of: "-tab"), i + 1 < args.count, let n = Int(args[i + 1]) else { return 0 }
        return n
    }

    /// Beispielkind (20 Monate) mit ein paar geschafften Schritten und Einträgen.
    static func seed(_ model: AppModel) {
        let today = model.today
        guard let birth = try? Dates.addMonths(today, -20) else { return }
        let child = Child(id: "demo", name: "Mia", birthDate: birth, createdAt: isoTimestamp(), updatedAt: isoTimestamp())
        model.update { data in
            data.saveChild(child)
            data.settings.onboardingDone = true
            for m in model.content.milestones where m.window.toMonths <= 14 {
                let on = (try? Dates.addMonths(birth, Int(m.window.fromMonths) + 1)) ?? today
                data.markMilestone(m.id, childId: child.id, on: on, today: today)
            }
            let ideas = model.content.activities
                .filter { $0.ageRange.minMonths <= 20 && $0.ageRange.maxMonths >= 20 }
                .sorted { $0.id < $1.id }
                .prefix(4)
            for (n, a) in ideas.enumerated() {
                let ref = ActivityRef(source: a.origin, id: a.id)
                let date = (try? Dates.addDays(today, -2 * n)) ?? today
                data.saveLog(ActivityLog(id: "demo-log-\(n)", childIds: [child.id], activityRef: ref, date: date,
                                         durationMinutes: 15, enjoyment: n == 0 ? .high : .medium,
                                         note: n == 0 ? "Hat sich gar nicht mehr losreißen können." : nil,
                                         createdAt: isoTimestamp()))
                if n < 2 { data.setFavorite(ref, true) }
            }
        }
    }
}
#endif
