// Ideen wie src/ui/screens/library.ts: Suche, Filter, passend fürs Kind, eigene Ideen.

import SwiftUI
import KleineSchritteCore

struct LibraryView: View {
    @Environment(AppModel.self) private var model
    @State private var query = ""
    @State private var forChild = true
    @State private var onlyCustom = false
    @State private var filter = ActivityFilter()
    @State private var showFilters = false

    var body: some View {
        let child = model.activeChild
        let months = child.flatMap { model.age(of: $0)?.effectiveMonths }
        let doneIds = Array(Set(model.logs(for: child).map(\.activityRef.id)))
        let hideDone = model.settings.hideDoneActivities ?? false

        var f = filter
        f.query = query.isEmpty ? nil : query
        if forChild, let months {
            f.ageMonths = months
            f.ageToleranceMonths = Recommend.ageToleranceMonths
        }
        if hideDone { f.excludeIds = doneIds }
        let source = onlyCustom ? model.data.customActivities : model.allActivities
        let list = filterActivities(source, f).stableSorted { a, b in
            a.ageRange.minMonths < b.ageRange.minMonths
                || (a.ageRange.minMonths == b.ageRange.minMonths && localize(a.title).localizedCompare(localize(b.title)) == .orderedAscending)
        }
        let active = filter.activeCount

        return ScrollView {
            LazyVStack(alignment: .leading, spacing: 12) {
                PageHeader(title: model.t("library.title"))
                SearchField(text: $query, prompt: model.t("library.searchPlaceholder"))
                if let child, months != nil {
                    Segmented(legend: model.t("activity.age"), options: [
                        (true, model.t("library.forChild", ["name": child.name])),
                        (false, model.t("library.allAges")),
                    ], selection: $forChild)
                }
                HStack {
                    Button {
                        showFilters = true
                    } label: {
                        Label(active > 0 ? model.t("library.filtersActive", ["n": active]) : model.t("library.filters"), systemImage: "line.3.horizontal.decrease.circle")
                    }
                    .buttonStyle(.ghost)
                    Spacer()
                    Text(model.tn("library.count", list.count)).font(Theme.text(.subheadline)).foregroundStyle(Theme.textMuted)
                }
                Toggle(model.t("library.hideDone", ["n": doneIds.count]), isOn: Binding(
                    get: { hideDone },
                    set: { v in model.update { $0.settings.hideDoneActivities = v } }
                ))
                .tint(Theme.sage)
                if !model.data.customActivities.isEmpty {
                    Toggle(model.t("library.onlyCustom", ["n": model.data.customActivities.count]), isOn: $onlyCustom).tint(Theme.sage)
                }
                NavigationLink(value: Route.customActivity(nil)) { Label(model.t("library.addCustom"), systemImage: "plus") }
                    .buttonStyle(.ghost)

                if list.isEmpty {
                    Text(model.t("library.empty")).foregroundStyle(Theme.textMuted).padding(.top, 20)
                }
                ForEach(list, id: \.id) { ActivityRow(activity: $0) }
            }
            .padding(.horizontal, Theme.gutter)
            .padding(.bottom, Theme.gutter)
        }
        .scrollDismissesKeyboard(.immediately)
        .page()
        .sheet(isPresented: $showFilters) {
            FilterSheet(filter: $filter)
        }
    }
}

private struct FilterSheet: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @Binding var filter: ActivityFilter

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    group(model.t("library.domains")) {
                        ForEach(DomainId.allCases, id: \.self) { d in
                            Chip(label: model.format.domain(d), selected: filter.domains?.contains(d) == true) { toggle(&filter.domains, d) }
                        }
                    }
                    group(model.t("library.categories")) {
                        ForEach(model.content.categories, id: \.id) { c in
                            Chip(label: localize(c.name), selected: filter.categories?.contains(c.id) == true) { toggle(&filter.categories, c.id) }
                        }
                    }
                    group(model.t("library.duration")) {
                        Chip(label: model.t("library.durationAny"), selected: filter.maxDurationMinutes == nil) { filter.maxDurationMinutes = nil }
                        ForEach([10, 20, 30, 60], id: \.self) { n in
                            Chip(label: model.t("common.minutes", ["n": n]), selected: filter.maxDurationMinutes == n) { filter.maxDurationMinutes = n }
                        }
                    }
                    group(model.t("library.location")) {
                        Chip(label: model.t("location.any"), selected: filter.location == nil) { filter.location = nil }
                        Chip(label: model.t("location.indoor"), selected: filter.location == .indoor) { filter.location = .indoor }
                        Chip(label: model.t("location.outdoor"), selected: filter.location == .outdoor) { filter.location = .outdoor }
                    }
                    group(model.t("library.prep")) {
                        ForEach(PrepEffort.allCases, id: \.self) { p in
                            Chip(label: model.t("prep.\(p.rawValue)"), selected: filter.prepEfforts?.contains(p) == true) { toggle(&filter.prepEfforts, p) }
                        }
                    }
                    group(model.t("library.social")) {
                        ForEach(SocialSetting.allCases, id: \.self) { s in
                            Chip(label: model.t("social.\(s.rawValue)"), selected: filter.socialSettings?.contains(s) == true) { toggle(&filter.socialSettings, s) }
                        }
                    }
                    Button(model.t("library.reset")) { filter = ActivityFilter() }.buttonStyle(.ghost)
                }
                .padding(Theme.gutter)
            }
            .page()
            .navigationTitle(model.t("library.filters"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) { Button(model.t("common.close")) { dismiss() } }
            }
        }
        .presentationDetents([.large])
    }

    private func group<Chips: View>(_ title: String, @ViewBuilder _ chips: () -> Chips) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title).font(Theme.text(.subheadline, .semibold))
            FlowLayout { chips() }
        }
    }

    private func toggle<T: Equatable>(_ list: inout [T]?, _ value: T) {
        var l = list ?? []
        if let i = l.firstIndex(of: value) { l.remove(at: i) } else { l.append(value) }
        list = l.isEmpty ? nil : l
    }
}
