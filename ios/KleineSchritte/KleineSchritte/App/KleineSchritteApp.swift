import SwiftUI

@main
struct KleineSchritteApp: App {
    @State private var model = AppModel()
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(model)
                .preferredColorScheme(model.colorScheme)
                .tint(Theme.primary)
        }
        .onChange(of: scenePhase) { _, phase in
            // Nach Mitternacht oder nach Tagen im Hintergrund: „heute“ neu bestimmen.
            if phase == .active { model.refreshToday() }
        }
    }
}
