// Quellen, Hinweise und Haftung, Datenschutz, Einstieg beim ersten Start.

import SwiftUI
import KleineSchritteCore

struct SourcesView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        List {
            Group {
                Section { Text(model.t("sources.intro")) }
                Section(model.t("sources.statusTitle")) { Text(model.t("sources.statusText")).font(Theme.text(.subheadline)) }
                Section {
                    ForEach(model.content.references, id: \.id) { r in
                        VStack(alignment: .leading, spacing: 4) {
                            Text(referenceLabel(r)).font(Theme.text(.subheadline, .semibold))
                            if let p = r.publishedIn { Text(p).font(Theme.text(.caption)).foregroundStyle(Theme.textMuted) }
                            Text(localize(r.summary)).font(Theme.text(.caption))
                            if let url = r.url.flatMap(URL.init(string:)) { Link(url.host() ?? url.absoluteString, destination: url).font(Theme.text(.caption)) }
                            if !r.citationVerified { Text(model.t("sources.unverified")).font(Theme.text(.caption2)).foregroundStyle(Theme.noticeText) }
                        }
                    }
                }
            }
            .listRowBackground(Theme.surface)
        }
        .scrollContentBackground(.hidden)
        .background(Theme.bg)
        .navigationTitle(model.t("sources.title"))
    }
}

/// Absätze wie legalParagraphs() in der Web-App.
struct LegalText: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            ForEach(["p1", "p2", "p5", "p3", "p4"], id: \.self) { Text(model.t("legal.\($0)")) }
        }
    }
}

struct LegalView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                LegalText()
                NavigationLink(model.t("legal.privacyLink"), value: Route.privacy)
            }
            .padding(Theme.gutter)
        }
        .page()
        .navigationTitle(model.t("legal.title"))
    }
}

struct PrivacyView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                Text(model.t("privacy.intro")).font(Theme.text(.headline))
                ForEach(["s1", "s2", "s3", "s4", "s5", "s6", "s7"], id: \.self) { s in
                    SectionTitle(model.t("privacy.\(s)h"))
                    Text(model.t("privacy.\(s)p"))
                    let link = model.t("privacy.\(s)link")
                    if link.hasPrefix("https://"), let url = URL(string: link) { Link(url.host() ?? link, destination: url).font(Theme.text(.subheadline)) }
                }
                Text(model.t("privacy.updated")).font(Theme.text(.caption)).foregroundStyle(Theme.textMuted)
            }
            .padding(Theme.gutter)
        }
        .page()
        .navigationTitle(model.t("privacy.title"))
    }
}

/// Erster Start: Willkommen, Hinweise bestätigen, erstes Kind anlegen.
struct OnboardingView: View {
    @Environment(AppModel.self) private var model
    @State private var accepted = false

    var body: some View {
        NavigationStack {
            if accepted || model.settings.disclaimerAcceptedAt != nil {
                ChildFormView(childId: nil, finishesOnboarding: true)
                    .navigationTitle(model.t("onboarding.firstChild"))
            } else {
                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        Text(model.t("onboarding.welcomeTitle")).font(Theme.pageTitle)
                        StageArt(stage: .none).frame(maxHeight: 180)
                        Text(model.t("onboarding.welcomeText"))
                        Notice(kind: .ok, text: model.t("onboarding.privacy"))
                        VStack(alignment: .leading, spacing: 10) {
                            Text(model.t("legal.title")).font(Theme.cardTitle)
                            LegalText().font(Theme.text(.subheadline))
                        }
                        .card()
                        Button(model.t("onboarding.start")) {
                            model.update { $0.settings.disclaimerAcceptedAt = isoTimestamp() }
                            accepted = true
                        }
                        .buttonStyle(.primary)
                        .frame(maxWidth: .infinity)
                        // Wer schon die Web-App nutzt, nimmt seine Daten mit.
                        NavigationLink(model.t("backup.import"), value: Route.backup)
                            .frame(maxWidth: .infinity)
                    }
                    .padding(Theme.gutter)
                }
                .page()
                .navigationDestination(for: Route.self) { RouteView(route: $0) }
            }
        }
    }
}
