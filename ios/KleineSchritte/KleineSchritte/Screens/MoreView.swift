// „Mehr“ wie src/ui/screens/info.ts: Kind wechseln, Vorsorge, Rückblick, Arzt, Kinder, Einstellungen, Info.

import SwiftUI
import KleineSchritteCore

struct MoreView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 28) {
                PageHeader(title: model.t("more.title"))
                if model.children.count > 1 {
                    Segmented(legend: model.t("children.switch"), options: model.children.map { ($0.id, $0.name) }, selection: Binding(
                        get: { model.activeChild?.id ?? "" },
                        set: { id in model.update { $0.settings.activeChildId = id } }
                    ))
                }
                ListGroup(model.activeChild.map { model.t("more.forChild", ["name": $0.name]) } ?? model.t("more.child")) {
                    if model.activeChild != nil {
                        ListLink(label: model.t("more.checkups"), route: .checkups)
                        ListDivider()
                        ListLink(label: model.t("more.review"), route: .review)
                        ListDivider()
                        ListLink(label: model.t("more.doctor"), route: .doctor)
                        ListDivider()
                    }
                    ListLink(label: model.t("more.children"), value: model.children.count > 1 ? "\(model.children.count)" : nil, route: .children)
                }
                VStack(alignment: .leading, spacing: 12) {
                    Text(model.t("more.settings")).font(Theme.heading(19)).accessibilityAddTraits(.isHeader)
                    Segmented(legend: model.t("settings.theme"), options: [
                        (ThemePreference.system, model.t("settings.themeSystem")),
                        (.light, model.t("settings.themeLight")),
                        (.dark, model.t("settings.themeDark")),
                    ], selection: Binding(get: { model.settings.theme }, set: { v in model.update { $0.settings.theme = v } }))
                    .card()
                    ListGroup(nil) {
                        ListLink(label: model.t("more.backup"),
                                 value: model.settings.lastBackupAt.map { model.format.date(String($0.prefix(10))) } ?? model.t("more.backupNever"),
                                 route: .backup)
                    }
                }
                ListGroup(model.t("more.info")) {
                    ListLink(label: model.t("more.sources"), route: .sources)
                    ListDivider()
                    ListLink(label: model.t("more.legal"), route: .legal)
                    ListDivider()
                    ListLink(label: model.t("more.privacy"), route: .privacy)
                    ListDivider()
                    ListRowLabel(label: model.t("more.about"),
                                 value: Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String, chevron: false)
                }
                Text(model.t("more.aboutText")).font(Theme.text(.footnote)).foregroundStyle(Theme.textMuted)
            }
            .padding(.horizontal, Theme.gutter)
            .padding(.bottom, Theme.gutter)
        }
        .page()
    }
}

struct SettingsView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        Form {
            Group {
                Picker(model.t("settings.theme"), selection: Binding(
                    get: { model.settings.theme },
                    set: { v in model.update { $0.settings.theme = v } }
                )) {
                    Text(model.t("settings.themeSystem")).tag(ThemePreference.system)
                    Text(model.t("settings.themeLight")).tag(ThemePreference.light)
                    Text(model.t("settings.themeDark")).tag(ThemePreference.dark)
                }
                .pickerStyle(.inline)
                NavigationLink(model.t("more.backup"), value: Route.backup)
            }
            .listRowBackground(Theme.surface)
        }
        .scrollContentBackground(.hidden)
        .background(Theme.bg)
        .navigationTitle(model.t("settings.title"))
    }
}
