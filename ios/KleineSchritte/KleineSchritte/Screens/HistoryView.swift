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

    @State private var deleting: ActivityLog?

    var body: some View {
        let child = model.activeChild
        let showMilestones = !(model.settings.historyHideMilestones ?? false)
        let records = child.map { model.records(for: $0) } ?? []
        let dated = records.filter { !$0.isDateUnknown }
        let undated = records.filter(\.isDateUnknown)
        var entries: [Entry] = model.logs(for: child).map(Entry.log)
        if showMilestones { entries += dated.map(Entry.milestone) }
        entries = entries.stableSorted { $0.date > $1.date }
        // Nach Monat gruppiert wie in der Web-App
        let months = entries.map { String($0.date.prefix(7)) }.reduce(into: [String]()) { if $0.last != $1 { $0.append($1) } }

        return ScrollView {
            LazyVStack(alignment: .leading, spacing: 0) {
                PageHeader(title: model.t("history.title")).padding(.bottom, 24)
                if child != nil {
                    NavigationLink(value: Route.review) {
                        Text(model.t("history.toReview")).frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.ghost)
                    .padding(.bottom, 16)
                    Chip(label: model.t("history.showMilestones", ["n": records.count]), selected: showMilestones) {
                        model.update { $0.settings.historyHideMilestones = showMilestones }
                    }
                }
                if entries.isEmpty && (undated.isEmpty || !showMilestones) {
                    Text(records.isEmpty ? model.t("history.empty") : model.t("history.emptyLogs"))
                        .foregroundStyle(Theme.textMuted)
                        .multilineTextAlignment(.center)
                        .frame(maxWidth: .infinity)
                        .padding(.top, 40)
                }
                ForEach(months, id: \.self) { month in
                    SectionHeading(String(model.format.date("\(month)-01").dropFirst(3)))
                    ForEach(entries.filter { $0.date.hasPrefix(month) }) { row($0) }
                }
                if showMilestones && !undated.isEmpty {
                    SectionHeading(model.t("history.noDate"))
                    ForEach(undated) { row(.milestone($0)) }
                }
            }
            .padding(.horizontal, Theme.gutter)
            .padding(.bottom, Theme.gutter)
        }
        .page()
        .sheet(item: $editing) { log in
            if let a = model.activity(log.activityRef.id) { LogSheet(activity: a, existing: log) }
        }
        .confirmationDialog(model.t("history.deleteConfirm"), isPresented: Binding(get: { deleting != nil }, set: { if !$0 { deleting = nil } }),
                            titleVisibility: .visible) {
            Button(model.t("common.delete"), role: .destructive) {
                if let l = deleting { model.update { $0.deleteLog(l.id) } }
                deleting = nil
            }
        }
    }

    @ViewBuilder
    private func row(_ entry: Entry) -> some View {
        switch entry {
        case .log(let l):
            let a = model.activity(l.activityRef.id)
            VStack(alignment: .leading, spacing: 8) {
                if let a {
                    NavigationLink(value: Route.activity(a.id)) {
                        Text(localize(a.title)).font(Theme.cardTitle).foregroundStyle(Theme.text).multilineTextAlignment(.leading)
                    }
                    .buttonStyle(.plain)
                } else {
                    Text(model.t("history.unknownActivity")).font(Theme.cardTitle)
                }
                let meta = [model.format.date(l.date), l.enjoyment.map { model.t("enjoyment.\($0.rawValue)") }, l.durationMinutes.map { model.t("common.minutes", ["n": $0]) },
                            l.childIds.count > 1 ? l.childIds.compactMap { id in model.children.first { $0.id == id }?.name }.joined(separator: ", ") : nil]
                    .compactMap { $0 }
                Text(meta.joined(separator: " · ")).font(Theme.text(.subheadline)).foregroundStyle(Theme.textMuted)
                if let note = l.note, !note.isEmpty { Text(note) }
                HStack(spacing: 8) {
                    if a != nil {
                        Button(model.t("common.edit")) { editing = l }
                            .font(Theme.text(.subheadline, .medium))
                            .foregroundStyle(Theme.text)
                    }
                    Button(model.t("common.delete")) { deleting = l }
                        .font(Theme.text(.subheadline, .medium))
                        .foregroundStyle(Theme.danger)
                }
                .buttonStyle(.plain)
                .padding(.top, 4)
            }
            .card()
            .padding(.bottom, 14)
        case .milestone(let r):
            HStack(spacing: 8) {
                IconView(icon: .check, size: 16, lineWidth: 2.4).foregroundStyle(Theme.sage)
                Text(localize(model.milestone(r.milestoneId)?.title))
                    .font(Theme.text(.subheadline, .medium))
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .accessibilityLabel("\(model.t("history.milestoneLabel")): \(localize(model.milestone(r.milestoneId)?.title))")
                if !r.isDateUnknown {
                    Text(model.format.date(r.achievedOn, withYear: false)).font(Theme.text(.subheadline)).opacity(0.75)
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(Theme.sageSoft, in: RoundedRectangle(cornerRadius: Theme.radiusSm, style: .continuous))
            .padding(.bottom, 8)
        }
    }
}

/// Abschnittsüberschrift wie `h2` in der Web-App (Lora, 24 pt).
struct SectionHeading: View {
    let text: String
    init(_ text: String) { self.text = text }

    var body: some View {
        Text(text)
            .font(Theme.heading(24))
            .accessibilityAddTraits(.isHeader)
            .padding(.top, 44)
            .padding(.bottom, 16)
    }
}
