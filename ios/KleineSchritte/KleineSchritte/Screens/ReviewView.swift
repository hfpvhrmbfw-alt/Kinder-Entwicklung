// Rückblick „Das hat sich getan“ wie src/ui/screens/review.ts. Ohne Vergleiche mit anderen Kindern.

import SwiftUI
import KleineSchritteCore

struct ReviewView: View {
    @Environment(AppModel.self) private var model
    @State private var period: ReviewPeriod = .sixMonths

    var body: some View {
        Group {
            if let child = model.activeChild {
                content(child)
            } else {
                ScrollView { NoChildView() }.page()
            }
        }
        .navigationTitle(model.t("review.title"))
    }

    private func content(_ child: Child) -> some View {
        let records = model.records(for: child)
        let logs = model.logs(for: child)
        let from = (try? period.start(today: model.today)) ?? nil
        let r = buildReview(milestones: model.content.milestones, activities: model.allActivities, records: records, logs: logs, from: from, to: model.today)
        let mems = memories(today: model.today, records: records, logs: logs)
        let undated = records.filter(\.isDateUnknown).count

        return ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text(model.t("review.intro", ["name": child.name])).foregroundStyle(Theme.textMuted)
                Segmented(legend: model.t("review.period"),
                          options: ReviewPeriod.allCases.map { ($0, model.t("review.periods.\($0.rawValue)")) },
                          selection: $period)

                if !mems.isEmpty {
                    SectionTitle(model.t("review.memoriesTitle"))
                    ForEach(Array(mems.enumerated()), id: \.offset) { _, m in
                        VStack(alignment: .leading, spacing: 4) {
                            Text(model.tn("review.memoryYears", m.yearsAgo)).font(Theme.text(.caption, .semibold)).foregroundStyle(Theme.primaryText)
                            Text(m.kind == .milestone
                                 ? localize(model.milestone(m.id)?.title)
                                 : model.t("review.memoryActivity", ["name": localize(model.activity(m.id)?.title)]))
                            if let note = m.note { Text(note).font(Theme.text(.subheadline)).foregroundStyle(Theme.textMuted) }
                        }
                        .card(Theme.primarySoft)
                    }
                }

                if r.milestones.isEmpty && r.played == 0 {
                    Text(model.t("review.empty")).foregroundStyle(Theme.textMuted)
                } else {
                    HStack(spacing: 12) {
                        tile(model.t("review.tileMilestones"), r.milestones.count, model.tn("review.tileMilestonesSub", r.milestones.count))
                        tile(model.t("review.tilePlayed"), r.played, model.tn("review.tilePlayedSub", r.played) + " · " + model.tn("review.tileIdeasSub", r.distinctIdeas))
                    }
                    if !r.milestones.isEmpty {
                        SectionTitle(model.t("review.milestonesTitle"))
                        ForEach(r.milestones, id: \.milestone.id) { d in
                            HStack(alignment: .firstTextBaseline) {
                                Image(systemName: "checkmark.circle.fill").foregroundStyle(Theme.sage)
                                VStack(alignment: .leading) {
                                    Text(localize(d.milestone.title))
                                    Text(model.format.date(d.date)).font(Theme.text(.caption)).foregroundStyle(Theme.textMuted)
                                }
                            }
                        }
                    }
                    if undated > 0 { Text(model.tn("review.undated", undated)).font(Theme.text(.caption)).foregroundStyle(Theme.textMuted) }
                    if !r.favorites.isEmpty {
                        SectionTitle(model.t("review.favoritesTitle"))
                        ForEach(r.favorites, id: \.activityId) { f in
                            if let a = model.activity(f.activityId) {
                                VStack(alignment: .leading, spacing: 2) {
                                    NavigationLink(value: Route.activity(a.id)) { Text(localize(a.title)).font(Theme.text(.body, .semibold)) }
                                    Text([f.loved > 0 ? model.tn("review.loved", f.loved) : nil, model.tn("review.played", f.count)].compactMap { $0 }.joined(separator: " · "))
                                        .font(Theme.text(.caption)).foregroundStyle(Theme.textMuted)
                                }
                            }
                        }
                    }
                    if !r.domains.isEmpty {
                        SectionTitle(model.t("review.domainsTitle"))
                        ForEach(r.domains, id: \.domain) { d in
                            HStack {
                                DomainBadge(domain: d.domain)
                                Spacer()
                                Text(model.t("review.domainLine", ["milestones": model.tn("review.domainMilestones", d.milestones), "ideas": model.tn("review.domainIdeas", d.ideas)]))
                                    .font(Theme.text(.caption))
                            }
                        }
                    }
                    if !r.notes.isEmpty {
                        SectionTitle(model.t("review.notesTitle"))
                        ForEach(Array(r.notes.enumerated()), id: \.offset) { _, n in
                            VStack(alignment: .leading, spacing: 2) {
                                Text("„\(n.text)“")
                                Text("\(model.format.date(n.date)) · \(localize(model.activity(n.activityId)?.title))").font(Theme.text(.caption)).foregroundStyle(Theme.textMuted)
                            }
                            .card()
                        }
                    }
                }
                Text(model.t("development.noDiagnosis")).font(Theme.text(.footnote)).foregroundStyle(Theme.textMuted)
            }
            .padding(Theme.gutter)
        }
        .page()
    }

    private func tile(_ label: String, _ value: Int, _ sub: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label).font(Theme.text(.caption, .semibold)).foregroundStyle(Theme.textMuted)
            Text("\(value)").font(Theme.heading(30))
            Text(sub).font(Theme.text(.caption)).foregroundStyle(Theme.textMuted)
        }
        .card()
        .accessibilityElement(children: .combine)
    }
}
