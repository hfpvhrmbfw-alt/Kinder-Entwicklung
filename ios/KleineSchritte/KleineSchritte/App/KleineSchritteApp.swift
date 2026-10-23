import SwiftUI

@main
struct KleineSchritteApp: App {
    @State private var model: AppModel = {
        #if DEBUG
        if DemoMode.isOn {
            let model = AppModel(store: nil)
            DemoMode.seed(model)
            return model
        }
        #endif
        return AppModel()
    }()
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
