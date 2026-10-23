// „Mehr“ wie src/ui/screens/info.ts: Kind wechseln, Vorsorge, Rückblick, Arzt, Kinder, Einstellungen, Info.

import SwiftUI
import KleineSchritteCore

struct MoreView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        List {
            Group {
                if model.children.count > 1 {
                    Section(model.t("children.switch")) {
                        Picker(model.t("children.switch"), selection: Binding(
                            get: { model.activeChild?.id ?? "" },
                            set: { id in model.update { $0.settings.activeChildId = id } }
                        )) {
                            ForEach(model.children) { Text($0.name).tag($0.id) }
                        }
                        .pickerStyle(.segmented)
                    }
                }
                Section(model.activeChild.map { model.t("more.forChild", ["name": $0.name]) } ?? model.t("more.child")) {
                    if model.activeChild != nil {
                        NavigationLink(model.t("more.checkups"), value: Route.checkups)
                        NavigationLink(model.t("more.review"), value: Route.review)
                        NavigationLink(model.t("more.doctor"), value: Route.doctor)
                    }
                    NavigationLink(value: Route.children) {
                        LabeledContent(model.t("more.children"), value: model.children.count > 1 ? "\(model.children.count)" : "")
                    }
                }
                Section(model.t("more.settings")) {
                    NavigationLink(model.t("settings.title"), value: Route.settings)
                    NavigationLink(value: Route.backup) {
                        LabeledContent(model.t("more.backup"), value: model.settings.lastBackupAt.map { model.format.date(String($0.prefix(10))) } ?? model.t("more.backupNever"))
                    }
                }
                Section(model.t("more.info")) {
                    NavigationLink(model.t("more.sources"), value: Route.sources)
                    NavigationLink(model.t("more.legal"), value: Route.legal)
                    NavigationLink(model.t("more.privacy"), value: Route.privacy)
                    LabeledContent(model.t("more.about"), value: Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "")
                }
                Section {
                    Text(model.t("more.aboutText")).font(.footnote).foregroundStyle(Theme.textMuted)
                }
            }
            .listRowBackground(Theme.surface)
        }
        .scrollContentBackground(.hidden)
        .background(Theme.bg)
        .navigationTitle(model.t("more.title"))
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
