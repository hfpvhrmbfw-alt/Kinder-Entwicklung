// Startseite wie src/ui/screens/today.ts: Begrüßung, Kinderkarte, Hinweise, Spielwoche, Ausblick,
// Idee für heute und „Was passt heute?“.

import SwiftUI
import UIKit
import KleineSchritteCore

struct TodayView: View {
    @Environment(AppModel.self) private var model
    @State private var time = "20"
    @State private var location: LocationChoice? = nil
    @State private var results: [RankedActivity]? = nil

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(greeting(Calendar.current.component(.hour, from: Date())))
                        .font(Theme.pageTitle)
                        .accessibilityAddTraits(.isHeader)
                    Text(model.format.dateWithWeekday(model.today)).foregroundStyle(Theme.textMuted)
                }
                if let error = model.loadError { Notice(kind: .notice, text: error) }

                if let child = model.activeChild, let age = model.age(of: child) {
                    content(child, age)
                } else {
                    welcome
                }
            }
            .padding(Theme.gutter)
        }
        .page()
        .toolbar(.hidden, for: .navigationBar)
    }

    private func greeting(_ hour: Int) -> String {
        switch hour {
        case ..<5: return model.t("today.greetNight")
        case ..<11: return model.t("today.greetMorning")
        case ..<14: return model.t("today.greetNoon")
        case ..<18: return model.t("today.greetDay")
        case ..<23: return model.t("today.greetEvening")
        default: return model.t("today.greetNight")
        }
    }

    private var welcome: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(model.t("app.name")).font(.subheadline).foregroundStyle(Theme.textMuted)
            Text(model.t("today.heroWelcome")).font(Theme.heading(28))
            StageArt(stage: .none)
            Text(model.t("today.heroWelcomeText")).foregroundStyle(Theme.textMuted)
            NavigationLink(value: Route.childForm(nil)) { Label(model.t("today.addChild"), systemImage: "arrow.right") }
                .buttonStyle(.primary)
        }
        .card()
    }

    @ViewBuilder
    private func content(_ child: Child, _ age: ChildAge) -> some View {
        let months = age.effectiveMonths
        let records = model.records(for: child)
        let logs = model.logs(for: child)
        let favorites = model.data.favoriteIds
        let daily = dailySuggestion(activities: model.allActivities, milestones: model.content.milestones, ageMonths: months,
                                    today: model.today, childId: child.id, milestoneRecords: records, logs: logs, favoriteIds: favorites)

        HeroCard(child: child, age: age, daily: daily)

        if backupReminderDue(settings: model.settings, children: model.data.children, now: Date()) {
            VStack(alignment: .leading, spacing: 8) {
                Text(model.t("today.backupTitle")).font(Theme.cardTitle)
                Text(model.t("today.backupText")).font(.subheadline)
                HStack {
                    NavigationLink(value: Route.backup) { Text(model.t("today.backupNow")) }.buttonStyle(.primary)
                    Button(model.t("today.backupLater")) {
                        model.update { $0.settings.backupReminderAt = isoTimestamp() }
                    }
                    .buttonStyle(.ghost)
                }
            }
            .card(Theme.noticeBg)
        }

        if let s = currentCheckup(model.checkupStatuses(for: child)) {
            NavigationLink(value: Route.checkups) {
                VStack(alignment: .leading, spacing: 6) {
                    Text(s.phase == .due ? model.t("today.checkupDue", ["name": s.checkup.name]) : model.t("today.checkupSoon", ["name": s.checkup.name]))
                        .font(Theme.cardTitle)
                    Text("\(localize(s.checkup.period)) · \(model.format.dateRange(s.window.start, s.window.end))").font(.subheadline)
                    Text(model.t("today.checkupBook")).font(.caption).foregroundStyle(Theme.textMuted)
                }
                .card(Theme.infoBg)
            }
            .buttonStyle(.plain)
        }

        WeekStrip(logs: logs)

        SectionTitle(model.t("today.outlookTitle"))
        OutlookTiles(child: child, months: months, records: records, logs: logs)

        if let daily {
            SectionTitle(model.t("today.dailyTitle"))
            ActivityRow(activity: daily.activity, reasons: daily.reasons)
        } else {
            Text(model.t("today.dailyEmpty")).foregroundStyle(Theme.textMuted)
        }

        SectionTitle(model.t("today.whatFitsTitle"))
        VStack(alignment: .leading, spacing: 12) {
            Text(model.t("today.time")).font(.subheadline.weight(.semibold))
            FlowLayout {
                ForEach(["any", "10", "20", "30", "60"], id: \.self) { v in
                    Chip(label: v == "any" ? model.t("today.timeAny") : model.t("common.minutes", ["n": Int(v)!]), selected: time == v) { time = v }
                }
            }
            Text(model.t("today.where")).font(.subheadline.weight(.semibold))
            FlowLayout {
                Chip(label: model.t("location.any"), selected: location == nil) { location = nil }
                Chip(label: model.t("location.indoor"), selected: location == .indoor) { location = .indoor }
                Chip(label: model.t("location.outdoor"), selected: location == .outdoor) { location = .outdoor }
            }
            Button(model.t("today.show")) {
                results = recommend(RecommendInput(
                    activities: model.allActivities, milestones: model.content.milestones, ageMonths: months, today: model.today,
                    availableMinutes: time == "any" ? nil : Int(time), location: location, milestoneRecords: records, logs: logs,
                    favoriteIds: favorites, seed: "\(model.today):\(child.id):\(time):\(location?.rawValue ?? "any")", limit: 5))
            }
            .buttonStyle(.primary)
        }
        .card()

        if let results {
            SectionTitle(model.t("today.resultsTitle"))
            if results.isEmpty {
                Text(model.t("today.noResults")).foregroundStyle(Theme.textMuted)
            } else {
                ForEach(results, id: \.activity.id) { ActivityRow(activity: $0.activity, reasons: $0.reasons) }
            }
        }

        Notice(kind: .info, text: model.t("development.noDiagnosis"))
    }
}

/// Kinderkarte: Name, Abschnitt, Alter, Fortschritt bis zum nächsten Abschnitt.
private struct HeroCard: View {
    @Environment(AppModel.self) private var model
    let child: Child
    let age: ChildAge
    let daily: RankedActivity?

    var body: some View {
        let months = age.effectiveMonths
        let stage = Stage(months: months)
        let bands = model.content.ageBands.stableSorted { $0.minMonths < $1.minMonths }
        let band = ageBand(for: months, in: bands)
        let shown = age.usesCorrected ? (age.corrected ?? age.chronological) : age.chronological

        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("\(child.name) · \(model.t("today.stage.\(stage.rawValue)"))").font(.subheadline).foregroundStyle(Theme.textMuted)
                    Text(model.format.span(shown)).font(Theme.heading(30))
                    if let daily {
                        NavigationLink(value: Route.activity(daily.activity.id)) { Label(model.t("today.toIdea"), systemImage: "arrow.right") }
                            .buttonStyle(.primary)
                    }
                }
                Spacer()
                StageArt(stage: stage).frame(width: 110)
            }
            if let band {
                let progress = min(1, max(0, (months - band.minMonths) / (band.maxMonths - band.minMonths)))
                Text(model.t("today.heroBand", ["band": localize(band.label)]) + (age.usesCorrected ? " (\(model.t("age.corrected", ["age": ""]).trimmingCharacters(in: .whitespaces)))" : ""))
                    .font(.subheadline)
                ProgressView(value: progress).tint(Theme.sage)
                HStack {
                    Text(model.format.months(band.minMonths))
                    Spacer()
                    Text(model.format.months(band.maxMonths))
                }
                .font(.caption).foregroundStyle(Theme.textMuted)
                Text(remainingText(band: band, bands: bands)).font(.subheadline)
            }
        }
        .card()
    }

    private func remainingText(band: AgeBand, bands: [AgeBand]) -> String {
        let start = age.usesCorrected ? (child.dueDate ?? child.birthDate) : child.birthDate
        guard let next = bands.first(where: { $0.minMonths == band.maxMonths }),
              let end = try? Dates.addMonths(start, Int(band.maxMonths)),
              let days = try? Dates.daysBetween(model.today, end), days > 0
        else { return model.t("today.heroLast") }
        let time: String
        if days < 14 { time = model.tn("age.days", max(days, 1)) }
        else if days < 63 { time = model.tn("age.weeks", Int((Double(days) / 7).rounded())) }
        else { time = model.tn("age.months", Int((Double(days) / 30.44).rounded())) }
        return model.t("today.heroNext", ["time": time, "band": "„\(localize(next.label))“"])
    }
}

/// Woche Montag bis Sonntag: Bild je Tag nach der besten Bewertung.
private struct WeekStrip: View {
    @Environment(AppModel.self) private var model
    let logs: [ActivityLog]

    var body: some View {
        let weekday = (try? Dates.weekday(model.today)) ?? 0
        let monday = (try? Dates.addDays(model.today, -weekday)) ?? model.today
        let days = (0..<7).compactMap { try? Dates.addDays(monday, $0) }

        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(model.t("today.weekTitle")).font(Theme.cardTitle)
                Spacer()
            }
            HStack(spacing: 4) {
                ForEach(days, id: \.self) { date in
                    day(date)
                }
            }
        }
        .card()
    }

    private static func symbol(for best: Enjoyment?) -> String {
        switch best {
        case .high: return "sun.max.fill"
        case .medium: return "cloud.sun.fill"
        case .low: return "cloud.fill"
        case nil: return "heart.fill"
        }
    }

    private func day(_ date: DateString) -> some View {
        let dayLogs = logs.filter { $0.date == date }
        let isToday = date == model.today
        let future = date > model.today
        let rank: [Enjoyment: Int] = [.low: 1, .medium: 2, .high: 3]
        let best = dayLogs.compactMap(\.enjoyment).max { rank[$0]! < rank[$1]! }
        let symbol = dayLogs.isEmpty ? (future ? "" : "circle.dashed") : Self.symbol(for: best)
        let label = [
            model.format.dateWithWeekday(date),
            isToday ? model.t("today.weekToday") : nil,
            future ? nil : (dayLogs.isEmpty ? model.t("today.weekNothing") : model.tn("today.weekPlayed", dayLogs.count)),
        ].compactMap { $0 }.joined(separator: ", ")

        return VStack(spacing: 4) {
            Text(model.format.weekdayShort(date)).font(.caption2).foregroundStyle(Theme.textMuted)
            Text("\((try? Dates.parse(date).day) ?? 0)").font(.subheadline.weight(isToday ? .bold : .regular))
            Image(systemName: symbol.isEmpty ? "circle" : symbol)
                .symbolRenderingMode(.multicolor)
                .foregroundStyle(dayLogs.isEmpty ? Theme.border : Theme.primary)
                .opacity(symbol.isEmpty ? 0 : 1)
                .frame(height: 22)
            Text(dayLogs.count > 1 ? "×\(dayLogs.count)" : " ").font(.caption2).foregroundStyle(Theme.textMuted)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 6)
        .background(isToday ? Theme.primarySoft : .clear, in: RoundedRectangle(cornerRadius: 12))
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(label)
    }
}

/// Vier Kacheln: gerade spannend, demnächst, diese Woche, gemerkt.
private struct OutlookTiles: View {
    @Environment(AppModel.self) private var model
    let child: Child
    let months: Double
    let records: [MilestoneRecord]
    let logs: [ActivityLog]

    var body: some View {
        let active = activeMilestones(model.content.milestones, ageMonths: months, records: records)
        let soon = upcomingMilestones(model.content.milestones, ageMonths: months)
        let weekday = (try? Dates.weekday(model.today)) ?? 0
        let monday = (try? Dates.addDays(model.today, -weekday)) ?? model.today
        let thisWeek = logs.filter { $0.date >= monday && $0.date <= model.today }.count
        let favorites = model.data.favorites.count

        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
            tile(model.t("today.tileActive"), "\(active.count)", model.tn("today.tileActiveSub", active.count), symbol: "leaf.fill", route: .milestone(active.first?.id ?? ""), enabled: !active.isEmpty)
            tile(model.t("today.tileSoon"), soon.first.map { localize($0.title) } ?? "–",
                 soon.first.map { model.t("today.tileSoonSub", ["age": model.format.months($0.window.fromMonths.rounded(.down))]) } ?? model.t("today.tileSoonNone"),
                 symbol: "sparkles", route: nil, small: true)
            tile(model.t("today.tileWeek"), "\(thisWeek)", model.tn("today.tileWeekSub", thisWeek), symbol: "sun.max.fill", route: nil)
            tile(model.t("today.tileFav"), "\(favorites)", model.tn("today.tileFavSub", favorites), symbol: "heart.fill", route: nil)
        }
    }

    @ViewBuilder
    private func tile(_ label: String, _ value: String, _ sub: String, symbol: String, route: Route?, enabled: Bool = true, small: Bool = false) -> some View {
        let content = VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(label).font(.caption.weight(.semibold)).foregroundStyle(Theme.textMuted)
                Spacer()
                Image(systemName: symbol).foregroundStyle(Theme.sage)
            }
            Text(value).font(small ? Theme.heading(17) : Theme.heading(30)).lineLimit(2).minimumScaleFactor(0.8)
            Text(sub).font(.caption).foregroundStyle(Theme.textMuted).lineLimit(2)
        }
        .frame(maxWidth: .infinity, minHeight: 110, alignment: .topLeading)
        .card()
        .accessibilityElement(children: .combine)

        if let route, enabled {
            NavigationLink(value: route) { content }.buttonStyle(.plain)
        } else {
            content
        }
    }
}

/// Bild zum Lebensabschnitt. Die gemalten Szenen liegen im Asset-Katalog („scene-…“);
/// fehlt eines, steht ein ruhiges Symbol da.
struct StageArt: View {
    let stage: Stage

    var body: some View {
        if let image = UIImage(named: "scene-\(stage.rawValue)") {
            Image(uiImage: image).resizable().scaledToFit().accessibilityHidden(true)
        } else {
            Image(systemName: fallback)
                .resizable()
                .scaledToFit()
                .foregroundStyle(Theme.sage)
                .padding(20)
                .accessibilityHidden(true)
        }
    }

    private var fallback: String {
        switch stage {
        case .newborn: return "moon.stars"
        case .baby: return "sun.max"
        case .toddler: return "leaf"
        case .preschool: return "camera.macro"
        case .school: return "backpack"
        case .none: return "leaf"
        }
    }
}
