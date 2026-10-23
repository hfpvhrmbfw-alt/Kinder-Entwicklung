// Entwicklung wie src/ui/screens/development.ts: Schritte je Bereich als Zeitfenster, abhakbar mit oder ohne Datum.

import SwiftUI
import KleineSchritteCore

struct DevelopmentView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        Group {
            if let child = model.activeChild, let age = model.age(of: child) {
                content(child, age)
            } else {
                ScrollView {
                    PageHeader(title: model.t("development.title")).padding(.horizontal, Theme.gutter)
                    NoChildView()
                }.page()
            }
        }
    }

    private func content(_ child: Child, _ age: ChildAge) -> some View {
        let months = age.effectiveMonths
        let band = model.band(for: months)?.range ?? MonthRange(minMonths: 0, maxMonths: 3)
        let records = model.records(for: child)
        let view = model.settings.milestoneView ?? .open
        let statuses = milestonesForView(model.content.milestones, band: band, ageMonths: months, records: records, view: view)
        let split = splitOverview(statuses, band: band)
        let openCount = milestonesForView(model.content.milestones, band: band, ageMonths: months, records: records, view: .open).count
        let achievedCount = records.filter { model.milestone($0.milestoneId) != nil }.count
        let scale = Scale(statuses: statuses, months: months)

        return ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                PageHeader(title: model.t("development.title"), subtitle: "\(child.name): \(model.format.childAge(age))")
                Text(model.t("development.intro")).font(Theme.text(.subheadline)).foregroundStyle(Theme.textMuted)

                Segmented(legend: model.t("development.viewLegend"), options: [
                    (MilestoneView.open, model.t("development.view_open", ["n": openCount])),
                    (.achieved, model.t("development.view_achieved", ["n": achievedCount])),
                    (.all, model.t("development.viewAll")),
                ], selection: Binding(get: { view }, set: { v in model.update { $0.settings.milestoneView = v } }))

                // Umbrechen statt quetschen, sonst trennt „U-Untersuchungen“ am Bindestrich.
                FlowLayout(spacing: 8) {
                    NavigationLink(value: Route.doctor) { Text(model.t("development.toDoctor")).lineLimit(1) }.buttonStyle(.ghost)
                    NavigationLink(value: Route.checkups) { Text(model.t("development.toCheckups")).lineLimit(1) }.buttonStyle(.ghost)
                }

                ForEach(DomainId.allCases, id: \.self) { domain in
                    let rows = split.current.filter { $0.milestone.domain == domain }
                    let earlier = split.earlier.filter { $0.milestone.domain == domain }
                    if !rows.isEmpty || !earlier.isEmpty {
                        SectionTitle(model.format.domain(domain))
                        if rows.isEmpty {
                            Text(view == .achieved ? model.t("development.emptyAchieved") : model.t("development.allDone"))
                                .font(Theme.text(.subheadline)).foregroundStyle(Theme.textMuted)
                        }
                        ForEach(rows, id: \.milestone.id) { MilestoneRow(child: child, status: $0, scale: scale) }
                        if !earlier.isEmpty {
                            DisclosureGroup(model.t("development.earlier", ["n": earlier.count])) {
                                ForEach(earlier, id: \.milestone.id) { MilestoneRow(child: child, status: $0, scale: scale) }
                            }
                            .tint(Theme.text)
                        }
                    }
                }
                if statuses.isEmpty {
                    Text(view == .achieved ? model.t("development.emptyAchieved") : model.t("development.empty")).foregroundStyle(Theme.textMuted)
                }

                let upcoming = upcomingMilestones(model.content.milestones, ageMonths: months)
                if view != .achieved && !upcoming.isEmpty {
                    SectionTitle(model.t("development.upcoming"))
                    VStack(alignment: .leading, spacing: 6) {
                        ForEach(upcoming, id: \.id) { m in
                            Text("• \(localize(m.title)) (\(model.t("development.window", ["range": model.format.window(m.window)])))")
                        }
                    }
                }

                Notice(kind: .notice, text: model.t("development.lossHint"))
                Text(model.t("development.noDiagnosis")).font(Theme.text(.footnote)).foregroundStyle(Theme.textMuted)
            }
            .padding(.horizontal, Theme.gutter)
            .padding(.bottom, Theme.gutter)
        }
        .page()
    }
}

/// Gemeinsame Skala für alle Zeitfenster-Balken einer Seite.
struct Scale {
    var min: Double
    var max: Double
    var months: Double

    init(statuses: [MilestoneStatus], months: Double) {
        self.months = months
        min = Swift.max(0, Swift.min(months, statuses.map(\.milestone.window.fromMonths).min() ?? months))
        max = Swift.max(months + 1, statuses.map(\.milestone.window.toMonths).max() ?? months + 1)
    }

    func fraction(_ m: Double) -> CGFloat { CGFloat((m - min) / (max - min)) }
}

/// Zeitfenster als Balken, die Linie markiert das heutige Alter.
struct WindowBar: View {
    let window: MilestoneWindow
    let scale: Scale
    let domain: DomainId

    var body: some View {
        GeometryReader { geo in
            let w = geo.size.width
            ZStack(alignment: .leading) {
                Capsule().fill(Theme.surfaceMuted)
                Capsule()
                    .fill(Theme.domain(domain).opacity(0.55))
                    .frame(width: max(6, w * (scale.fraction(window.toMonths) - scale.fraction(window.fromMonths))))
                    .offset(x: w * scale.fraction(window.fromMonths))
                Rectangle().fill(Theme.text).frame(width: 2, height: 14).offset(x: min(w - 2, w * scale.fraction(scale.months)))
            }
        }
        .frame(height: 10)
        .accessibilityHidden(true)
    }
}

struct MilestoneRow: View {
    @Environment(AppModel.self) private var model
    let child: Child
    let status: MilestoneStatus
    let scale: Scale

    var body: some View {
        let m = status.milestone
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .top, spacing: 12) {
                Button {
                    model.update {
                        if status.achieved { $0.unmarkMilestone(m.id, childId: child.id) }
                        else { $0.markMilestone(m.id, childId: child.id, on: nil, today: model.today) }
                    }
                } label: {
                    Image(systemName: status.achieved ? "checkmark.circle.fill" : "circle")
                        .font(Theme.text(.title2))
                        .foregroundStyle(status.achieved ? Theme.sage : Theme.border)
                        .frame(width: 44, height: 44)
                }
                .buttonStyle(.plain)
                .accessibilityLabel(model.t("development.markAchieved", ["name": child.name]))
                .accessibilityValue(status.achieved ? model.t("common.yes") : model.t("common.no"))

                NavigationLink(value: Route.milestone(m.id)) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(localize(m.title)).font(Theme.text(.body, .semibold)).foregroundStyle(Theme.text).multilineTextAlignment(.leading)
                        Text(model.t("development.window", ["range": model.format.window(m.window)]))
                            .font(Theme.text(.caption)).foregroundStyle(Theme.textMuted)
                        if let r = status.record {
                            Text(r.isDateUnknown ? model.t("history.dateUnknown") : model.t("development.achievedOn", ["date": model.format.date(r.achievedOn)]))
                                .font(Theme.text(.caption)).foregroundStyle(Theme.okText)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
                .buttonStyle(.plain)
            }
            WindowBar(window: m.window, scale: scale, domain: m.domain)
            if status.showConsultHint { Notice(kind: .notice, text: model.t("development.consultHint")) }
        }
        .card()
    }
}

/// Ein Schritt im Detail: Datum, Beschreibung, Unterstützung, Hintergrund, passende Ideen.
struct MilestoneDetailView: View {
    @Environment(AppModel.self) private var model
    let milestoneId: String

    var body: some View {
        if let m = model.milestone(milestoneId), let child = model.activeChild {
            let record = model.records(for: child).first { $0.milestoneId == m.id }
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    DomainBadge(domain: m.domain)
                    Text(localize(m.title)).font(Theme.heading(28))
                    Text(model.t("development.window", ["range": model.format.window(m.window)])).foregroundStyle(Theme.textMuted)
                    Text(localize(m.description))

                    achievedCard(m, child, record)

                    if !m.supportTips.isEmpty {
                        SectionTitle(model.t("development.supportTips"))
                        BulletList(items: m.supportTips)
                    }
                    if let observe = m.observe, !observe.isEmpty {
                        SectionTitle(model.t("pedagogy.observe"))
                        BulletList(items: observe)
                    }
                    if let variety = m.variety {
                        SectionTitle(model.t("pedagogy.variety"))
                        Text(localize(variety))
                    }
                    if let background = m.background {
                        SectionTitle(model.t("pedagogy.title"))
                        Text(localize(background))
                    }
                    SectionTitle(model.t("development.why"))
                    Text(localize(m.rationale))

                    let ideas = model.allActivities.filter { $0.relatedMilestoneIds.contains(m.id) || (m.relatedActivityIds ?? []).contains($0.id) }
                    if !ideas.isEmpty {
                        SectionTitle(model.t("development.ideas"))
                        ForEach(ideas, id: \.id) { ActivityRow(activity: $0) }
                    }
                    ReferenceList(links: m.references)
                    ReviewBadge(review: m.review)
                }
                .padding(Theme.gutter)
            }
            .page()
            .navigationBarTitleDisplayMode(.inline)
        } else {
            Text(model.t("activity.notFound")).padding()
        }
    }

    private func achievedCard(_ m: Milestone, _ child: Child, _ record: MilestoneRecord?) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Toggle(model.t("development.markAchieved", ["name": child.name]), isOn: Binding(
                get: { record != nil },
                set: { on in
                    model.update {
                        if on { $0.markMilestone(m.id, childId: child.id, on: nil, today: model.today) }
                        else { $0.unmarkMilestone(m.id, childId: child.id) }
                    }
                }
            ))
            .tint(Theme.sage)
            if let record {
                if record.isDateUnknown {
                    Text(model.t("development.dateUnknownHint")).font(Theme.text(.caption)).foregroundStyle(Theme.textMuted)
                }
                DatePicker(model.t("development.whenAchieved"), selection: Binding(
                    get: { dateValue(record.isDateUnknown ? model.today : record.achievedOn) },
                    set: { d in model.update { $0.markMilestone(m.id, childId: child.id, on: Dates.today(d), today: model.today, note: record.note) } }
                ), in: ...Date(), displayedComponents: .date)
                if !record.isDateUnknown {
                    Button(model.t("development.dateClear")) {
                        model.update { $0.markMilestone(m.id, childId: child.id, on: nil, today: model.today, note: record.note) }
                    }
                    .buttonStyle(.ghost)
                }
            }
        }
        .card()
    }
}

/// "YYYY-MM-DD" → Date (Mittag lokal, damit Zeitzonen den Tag nicht verschieben).
func dateValue(_ s: DateString) -> Date {
    guard let d = try? Dates.parse(s) else { return Date() }
    return Calendar.current.date(from: DateComponents(year: d.year, month: d.month, day: d.day, hour: 12)) ?? Date()
}

/// Quellen eines Eintrags.
struct ReferenceList: View {
    @Environment(AppModel.self) private var model
    let links: [ReferenceLink]

    var body: some View {
        if !links.isEmpty {
            DisclosureGroup(model.t("activity.sources")) {
                VStack(alignment: .leading, spacing: 8) {
                    ForEach(links, id: \.referenceId) { link in
                        if let r = model.reference(link.referenceId) {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(referenceLabel(r)).font(Theme.text(.subheadline, .semibold))
                                if let note = link.note { Text(localize(note)).font(Theme.text(.caption)) }
                                if let url = r.url.flatMap(URL.init(string:)) {
                                    Link(url.host() ?? url.absoluteString, destination: url).font(Theme.text(.caption))
                                }
                            }
                        }
                    }
                }
                .padding(.top, 6)
            }
            .tint(Theme.text)
        }
    }
}

func referenceLabel(_ r: Reference) -> String {
    let who = r.authors?.first.map { $0 + ((r.authors?.count ?? 0) > 1 ? " u. a." : "") }
    return [who, r.year.map(String.init), r.title].compactMap { $0 }.joined(separator: " · ")
}

/// Hinweis, solange ein Eintrag fachlich nicht abschließend geprüft ist.
struct ReviewBadge: View {
    @Environment(AppModel.self) private var model
    let review: Review

    var body: some View {
        if review.status != .reviewed {
            Label(model.t("activity.reviewNeedsCheck"), systemImage: "info.circle")
                .font(Theme.text(.caption))
                .foregroundStyle(Theme.textMuted)
        }
    }
}
