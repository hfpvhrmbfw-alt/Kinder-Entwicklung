// Verlauf wie src/ui/screens/history.ts: gespielte Ideen und geschaffte Schritte, neueste zuerst.

import SwiftUI
import KleineSchritteCore

struct HistoryView: View {
    @Environment(AppModel.self) private var model
    @State private var editing: ActivityLog?

    private enum Entry: Identifiable {
        case log(ActivityLog)
        case milestone(MilestoneRecord)

        var id: String {
            switch self {
            case .log(let l): return "l-\(l.id)"
            case .milestone(let r): return "m-\(r.id)"
            }
        }

        var date: DateString {
            switch self {
            case .log(let l): return l.date
            case .milestone(let r): return r.achievedOn
            }
        }
    }

    var body: some View {
        let child = model.activeChild
        let showMilestones = !(model.settings.historyHideMilestones ?? false)
        let records = child.map { model.records(for: $0) } ?? []
        let dated = records.filter { !$0.isDateUnknown }
        let undated = records.filter(\.isDateUnknown)
        var entries: [Entry] = model.logs(for: child).map(Entry.log)
        if showMilestones { entries += dated.map(Entry.milestone) }
        let grouped = Dictionary(grouping: entries, by: \.date)
        let dates = grouped.keys.sorted(by: >)

        return List {
            if child != nil {
                Section {
                    NavigationLink(value: Route.review) { Label(model.t("history.toReview"), systemImage: "sparkles") }
                    Toggle(model.t("history.showMilestones", ["n": records.count]), isOn: Binding(
                        get: { showMilestones },
                        set: { v in model.update { $0.settings.historyHideMilestones = !v } }
                    ))
                    .tint(Theme.sage)
                }
            }
            if entries.isEmpty {
                Text(records.isEmpty ? model.t("history.empty") : model.t("history.emptyLogs")).foregroundStyle(Theme.textMuted)
            }
            ForEach(dates, id: \.self) { date in
                Section(model.format.dateWithWeekday(date) + ((try? Dates.parse(date).year) != (try? Dates.parse(model.today).year) ? " \(date.prefix(4))" : "")) {
                    ForEach(grouped[date] ?? []) { entry in
                        row(entry)
                    }
                }
            }
            if showMilestones && !undated.isEmpty {
                Section(model.t("history.noDate")) {
                    ForEach(undated) { row(.milestone($0)) }
                }
            }
        }
        .scrollContentBackground(.hidden)
        .background(Theme.bg)
        .navigationTitle(model.t("history.title"))
        .sheet(item: $editing) { log in
            if let a = model.activity(log.activityRef.id) { LogSheet(activity: a, existing: log) }
        }
    }

    @ViewBuilder
    private func row(_ entry: Entry) -> some View {
        switch entry {
        case .log(let l):
            let a = model.activity(l.activityRef.id)
            VStack(alignment: .leading, spacing: 4) {
                if let a {
                    NavigationLink(value: Route.activity(a.id)) { Text(localize(a.title)).font(.body.weight(.semibold)) }
                } else {
                    Text(model.t("history.unknownActivity")).font(.body.weight(.semibold))
                }
                let meta = [l.enjoyment.map { model.t("enjoyment.\($0.rawValue)") }, l.durationMinutes.map { model.t("common.minutes", ["n": $0]) },
                            l.childIds.count > 1 ? l.childIds.compactMap { id in model.children.first { $0.id == id }?.name }.joined(separator: ", ") : nil]
                    .compactMap { $0 }
                if !meta.isEmpty { Text(meta.joined(separator: " · ")).font(.caption).foregroundStyle(Theme.textMuted) }
                if let note = l.note { Text(note).font(.subheadline) }
            }
            .listRowBackground(Theme.surface)
            .swipeActions {
                Button(model.t("common.delete"), role: .destructive) { model.update { $0.deleteLog(l.id) } }
                if a != nil { Button(model.t("common.edit")) { editing = l }.tint(Theme.sage) }
            }
        case .milestone(let r):
            Label {
                Text("\(model.t("history.milestoneLabel")): \(localize(model.milestone(r.milestoneId)?.title))")
            } icon: {
                Image(systemName: "checkmark.circle.fill").foregroundStyle(Theme.sage)
            }
            .font(.subheadline)
            .listRowBackground(Theme.surface)
        }
    }
}
