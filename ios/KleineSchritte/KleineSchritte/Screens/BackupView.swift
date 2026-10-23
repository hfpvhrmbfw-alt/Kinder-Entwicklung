// Datensicherung: gleiche Datei wie in der Web-App, speichern über das Teilen-Menü, einspielen aus „Dateien“.

import SwiftUI
import UniformTypeIdentifiers
import KleineSchritteCore

struct BackupView: View {
    @Environment(AppModel.self) private var model
    @State private var exportURL: URL?
    @State private var importing = false
    @State private var pending: Backup?
    @State private var message: String?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                Text(model.t("backup.intro"))
                Text(model.settings.lastBackupAt.map { model.t("backup.lastBackup", ["date": model.format.date(String($0.prefix(10)))]) } ?? model.t("backup.neverBackedUp"))
                    .font(.subheadline).foregroundStyle(Theme.textMuted)
                if let exportURL {
                    ShareLink(item: exportURL) { Label(model.t("backup.export"), systemImage: "square.and.arrow.up") }
                        .buttonStyle(.primary)
                        .simultaneousGesture(TapGesture().onEnded {
                            model.update { $0.settings.lastBackupAt = isoTimestamp() }
                        })
                }
                Text(model.t("backup.deviceBackup")).font(.caption).foregroundStyle(Theme.textMuted)

                SectionTitle(model.t("backup.import"))
                Notice(kind: .notice, text: model.t("backup.importWarning"))
                Button { importing = true } label: { Label(model.t("backup.importFile"), systemImage: "folder") }
                    .buttonStyle(.ghost)
                if let message { Notice(kind: .info, text: message) }
            }
            .padding(Theme.gutter)
        }
        .page()
        .navigationTitle(model.t("backup.title"))
        .onAppear(perform: prepareExport)
        .fileImporter(isPresented: $importing, allowedContentTypes: [.json]) { result in
            switch result {
            case .success(let url): read(url)
            case .failure(let error): message = error.localizedDescription
            }
        }
        .confirmationDialog(confirmText, isPresented: Binding(get: { pending != nil }, set: { if !$0 { pending = nil } }), titleVisibility: .visible) {
            Button(model.t("backup.import"), role: .destructive) {
                if let b = pending { model.replaceAll(with: b.data) }
                pending = nil
                message = model.t("backup.imported")
                prepareExport()
            }
        }
    }

    private var confirmText: String {
        guard let b = pending else { return "" }
        return model.t("backup.importConfirm", ["date": model.format.date(String(b.exportedAt.prefix(10))), "n": b.children.count])
    }

    private func prepareExport() {
        let version = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? ""
        guard let data = try? encodeBackup(createBackup(model.data, appVersion: "ios-\(version)")) else { return }
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("kleine-schritte-sicherung-\(model.today).json")
        if (try? data.write(to: url, options: .atomic)) != nil { exportURL = url }
    }

    private func read(_ url: URL) {
        let access = url.startAccessingSecurityScopedResource()
        defer { if access { url.stopAccessingSecurityScopedResource() } }
        do {
            pending = try parseBackup(Data(contentsOf: url))
        } catch let e as BackupError {
            message = model.t("backup.error.\(e.code)")
        } catch {
            message = model.t("backup.error.notJson")
        }
    }
}
