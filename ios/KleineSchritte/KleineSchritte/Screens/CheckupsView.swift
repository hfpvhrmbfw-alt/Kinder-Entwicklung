// U-Untersuchungen wie src/ui/screens/checkups.ts: Zeiträume, abhaken, Kalenderdatei.

import SwiftUI
import KleineSchritteCore

struct CheckupsView: View {
    @Environment(AppModel.self) private var model
    @State private var dateFor: CheckupStatus?

    /// Vorlauf der Kalender-Erinnerung: genug Zeit, um einen Termin zu bekommen.
    private let alarmDays = 21

    var body: some View {
        Group {
            if let child = model.activeChild {
                content(child)
            } else {
                ScrollView { NoChildView() }.page()
            }
        }
        .navigationTitle(model.t("checkups.title"))
    }

    private func content(_ child: Child) -> some View {
        let statuses = model.checkupStatuses(for: child)
        let past = statuses.filter { $0.phase == .past }
        let open = statuses.filter { [.due, .soon, .upcoming].contains($0.phase) }

        return ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                Text(model.t("checkups.intro", ["name": child.name])).foregroundStyle(Theme.textMuted)
                Text(model.t("checkups.tolerance")).font(.subheadline).foregroundStyle(Theme.textMuted)

                if !open.isEmpty, let url = calendarFile(child, open) {
                    ShareLink(item: url) { Label(model.t("checkups.calendar"), systemImage: "calendar.badge.plus") }
                        .buttonStyle(.primary)
                    Text(model.t("checkups.calendarHint")).font(.caption).foregroundStyle(Theme.textMuted)
                }
                if past.count > 1 {
                    Button(model.t("checkups.markPast", ["n": past.count])) {
                        model.update { $0.saveCheckupRecords(past.map { CheckupRecord(id: newId(), childId: child.id, checkupId: $0.checkup.id) }) }
                    }
                    .buttonStyle(.ghost)
                }

                ForEach(statuses, id: \.checkup.id) { s in row(child, s) }

                Text(model.t("checkups.source")).font(.footnote).foregroundStyle(Theme.textMuted)
            }
            .padding(Theme.gutter)
        }
        .page()
        .sheet(item: Binding(get: { dateFor.map(IdentifiedStatus.init) }, set: { dateFor = $0?.status })) { item in
            CheckupDateSheet(child: child, status: item.status)
        }
    }

    private func row(_ child: Child, _ s: CheckupStatus) -> some View {
        let (bg, fg): (Color, Color) = switch s.phase {
        case .done: (Theme.okBg, Theme.okText)
        case .due: (Theme.primarySoft, Theme.primaryText)
        case .soon: (Theme.infoBg, Theme.infoText)
        case .past: (Theme.noticeBg, Theme.noticeText)
        case .upcoming: (Theme.surfaceMuted, Theme.textMuted)
        }
        return VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(s.checkup.name).font(Theme.heading(22))
                Text(model.t("checkups.phase.\(s.phase.rawValue)"))
                    .font(.caption.weight(.semibold)).padding(.horizontal, 8).padding(.vertical, 3)
                    .foregroundStyle(fg).background(bg, in: Capsule())
                Spacer()
            }
            Text("\(localize(s.checkup.period)) · \(model.format.dateRange(s.window.start, s.window.end))").font(.subheadline)
            if let r = s.record {
                Text(r.doneOn.map { model.t("checkups.doneOn", ["date": model.format.date($0)]) } ?? model.t("checkups.doneNoDate"))
                    .font(.subheadline).foregroundStyle(Theme.okText)
                HStack {
                    Button(r.doneOn == nil ? model.t("checkups.addDate") : model.t("checkups.changeDate")) { dateFor = s }.buttonStyle(.ghost)
                    Button(model.t("checkups.undo")) { model.update { $0.deleteCheckupRecord(r.id) } }.buttonStyle(.ghost)
                }
            } else {
                if s.phase == .past { Text(model.t("checkups.pastHint")).font(.caption).foregroundStyle(Theme.textMuted) }
                Button(model.t("checkups.markDone")) {
                    model.update { $0.saveCheckupRecords([CheckupRecord(id: newId(), childId: child.id, checkupId: s.checkup.id)]) }
                }
                .buttonStyle(.primary)
            }
            DisclosureGroup(model.t("checkups.focus")) {
                VStack(alignment: .leading, spacing: 8) {
                    Text(localize(s.checkup.focus))
                    if !s.checkup.prepare.isEmpty {
                        Text(model.t("checkups.prepare")).font(.subheadline.weight(.semibold))
                        BulletList(items: s.checkup.prepare)
                    }
                }
                .padding(.top, 6)
            }
            .tint(Theme.text)
        }
        .card()
    }

    private func calendarFile(_ child: Child, _ open: [CheckupStatus]) -> URL? {
        let events = open.map { s in
            IcsEvent(uid: "\(s.checkup.id)-\(child.id)@kleine-schritte",
                     title: model.t("checkups.calendarTitle", ["name": child.name, "checkup": s.checkup.name]),
                     description: model.t("checkups.calendarText", ["checkup": s.checkup.name, "period": localize(s.checkup.period)]),
                     start: s.window.start, end: s.window.end, alarmDaysBefore: alarmDays)
        }
        guard let text = try? buildIcs(events) else { return nil }
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("U-Untersuchungen-\(child.name).ics")
        do { try Data(text.utf8).write(to: url, options: .atomic) } catch { return nil }
        return url
    }
}

private struct IdentifiedStatus: Identifiable {
    let status: CheckupStatus
    var id: String { status.checkup.id }
}

private struct CheckupDateSheet: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    let child: Child
    let status: CheckupStatus
    @State private var date = Date()

    var body: some View {
        NavigationStack {
            Form {
                DatePicker(model.t("checkups.dateLabel"), selection: $date, in: dateValue(child.birthDate)...Date(), displayedComponents: .date)
                Text(model.t("checkups.dateHint")).font(.caption).foregroundStyle(Theme.textMuted)
            }
            .navigationTitle(model.t("checkups.dialogTitle", ["name": status.checkup.name]))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button(model.t("common.cancel")) { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button(model.t("common.save")) {
                        guard var r = status.record else { return dismiss() }
                        r.doneOn = Dates.today(date)
                        model.update { $0.saveCheckupRecords([r]) }
                        dismiss()
                    }
                }
            }
            .onAppear { date = status.record?.doneOn.map(dateValue) ?? dateValue(status.window.start) }
        }
        .presentationDetents([.medium])
    }
}
