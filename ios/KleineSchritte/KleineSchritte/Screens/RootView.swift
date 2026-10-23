// Fünf Bereiche wie in der Web-App: Heute, Entwicklung, Ideen, Verlauf, Mehr.

import SwiftUI
import KleineSchritteCore

/// Ziele innerhalb eines Bereichs.
enum Route: Hashable {
    case activity(String)
    case milestone(String)
    case children
    case childForm(String?)
    case checkups
    case doctor
    case review
    case backup
    case settings
    case sources
    case legal
    case privacy
    case customActivity(String?)
}

struct RootView: View {
    @Environment(AppModel.self) private var model
    @State private var tab: Int = {
        #if DEBUG
        return DemoMode.startTab
        #else
        return 0
        #endif
    }()
    /// Ein Navigationsstapel je Bereich; ein Tipp auf den Bereich führt zurück zu seiner Startseite.
    @State private var paths = Array(repeating: NavigationPath(), count: 5)

    var body: some View {
        if !model.settings.onboardingDone {
            OnboardingView()
        } else {
            // Eigene Tab-Leiste wie in der Web-App statt der Systemleiste; alle Bereiche bleiben geladen.
            ZStack {
                ForEach(0..<5, id: \.self) { i in
                    stack(i)
                        .opacity(tab == i ? 1 : 0)
                        .allowsHitTesting(tab == i)
                        .accessibilityHidden(tab != i)
                }
            }
            .safeAreaInset(edge: .bottom, spacing: 0) {
                TabBar(items: [
                    TabItem(icon: .home, label: model.t("nav.today")),
                    TabItem(icon: .growth, label: model.t("nav.development")),
                    TabItem(icon: .ideas, label: model.t("nav.ideas")),
                    TabItem(icon: .history, label: model.t("nav.history")),
                    TabItem(icon: .more, label: model.t("nav.more")),
                ], selection: tab) { i in
                    paths[i] = NavigationPath()
                    tab = i
                }
            }
            .background(Theme.bg.ignoresSafeArea())
        }
    }

    @ViewBuilder
    private func stack(_ i: Int) -> some View {
        NavigationStack(path: $paths[i]) {
            Group {
                switch i {
                case 0: TodayView()
                case 1: DevelopmentView()
                case 2: LibraryView()
                case 3: HistoryView()
                default: MoreView()
                }
            }
            .toolbar(.hidden, for: .navigationBar)
            .navigationDestination(for: Route.self) { RouteView(route: $0) }
        }
    }
}

struct RouteView: View {
    let route: Route

    var body: some View {
        switch route {
        case .activity(let id): ActivityDetailView(activityId: id)
        case .milestone(let id): MilestoneDetailView(milestoneId: id)
        case .children: ChildrenView()
        case .childForm(let id): ChildFormView(childId: id)
        case .checkups: CheckupsView()
        case .doctor: DoctorView()
        case .review: ReviewView()
        case .backup: BackupView()
        case .settings: SettingsView()
        case .sources: SourcesView()
        case .legal: LegalView()
        case .privacy: PrivacyView()
        case .customActivity(let id): CustomActivityFormView(activityId: id)
        }
    }
}

/// Seite ohne Kind: Hinweis und Knopf zum Anlegen.
struct NoChildView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(model.t("today.noChild")).foregroundStyle(Theme.textMuted)
            NavigationLink(value: Route.childForm(nil)) { Text(model.t("today.addChild")) }
                .buttonStyle(.primary)
        }
        .card()
        .padding(Theme.gutter)
    }
}
