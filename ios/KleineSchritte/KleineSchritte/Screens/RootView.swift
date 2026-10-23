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
    @State private var tab = 0

    var body: some View {
        if !model.settings.onboardingDone {
            OnboardingView()
        } else {
            TabView(selection: $tab) {
                stack { TodayView() }
                    .tabItem { Label(model.t("nav.today"), systemImage: "sun.max") }
                    .tag(0)
                stack { DevelopmentView() }
                    .tabItem { Label(model.t("nav.development"), systemImage: "leaf") }
                    .tag(1)
                stack { LibraryView() }
                    .tabItem { Label(model.t("nav.ideas"), systemImage: "lightbulb") }
                    .tag(2)
                stack { HistoryView() }
                    .tabItem { Label(model.t("nav.history"), systemImage: "calendar") }
                    .tag(3)
                stack { MoreView() }
                    .tabItem { Label(model.t("nav.more"), systemImage: "ellipsis.circle") }
                    .tag(4)
            }
        }
    }

    private func stack<Content: View>(@ViewBuilder _ content: () -> Content) -> some View {
        NavigationStack {
            content()
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
