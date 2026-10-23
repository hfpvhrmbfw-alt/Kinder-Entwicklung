// Idee im Detail wie src/ui/screens/activity.ts, mit „Haben wir gemacht“ und Merken.

import SwiftUI
import KleineSchritteCore

struct ActivityDetailView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    let activityId: String
    @State private var logging = false
    @State private var confirmDelete = false

    var body: some View {
        if let a = model.activity(activityId) {
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    FlowLayout {
                        ForEach(a.allDomains, id: \.self) { DomainBadge(domain: $0) }
                        if a.isCustom {
                            Text(model.t("activity.custom")).font(.caption.weight(.semibold)).padding(.horizontal, 8).padding(.vertical, 3)
                                .background(Theme.primarySoft, in: Capsule())
                        }
                    }
                    Text(localize(a.title)).font(Theme.heading(28)).accessibilityAddTraits(.isHeader)
                    if !a.summary.de.isEmpty { Text(localize(a.summary)) }

                    Grid(alignment: .leading, horizontalSpacing: 16, verticalSpacing: 10) {
                        GridRow {
                            meta(model.t("activity.age"), model.format.ageRange(a.ageRange))
                            meta(model.t("activity.duration"), model.format.duration(a))
                        }
                        GridRow {
                            meta(model.t("activity.where"), model.t("location.\(a.location.rawValue)"))
                            meta(model.t("activity.prep"), model.t("prep.\(a.prepEffort.rawValue)"))
                        }
                    }
                    .card()

                    HStack {
                        Button { logging = true } label: { Label(model.t("activity.markDone"), systemImage: "checkmark") }
                            .buttonStyle(.primary)
                        Button { model.toggleFavorite(a) } label: {
                            Label(model.isFavorite(a) ? model.t("activity.favoriteRemove") : model.t("activity.favoriteAdd"),
                                  systemImage: model.isFavorite(a) ? "heart.fill" : "heart")
                        }
                        .buttonStyle(.ghost)
                        .accessibilityAddTraits(model.isFavorite(a) ? .isSelected : [])
                    }

                    if a.isCustom { Notice(kind: .info, text: model.t("activity.customNote")) }

                    section(model.t("activity.materials")) {
                        if a.materials.isEmpty && (a.materialsText ?? []).isEmpty {
                            Text(model.t("activity.noMaterials")).foregroundStyle(Theme.textMuted)
                        } else {
                            VStack(alignment: .leading, spacing: 4) {
                                ForEach(a.materials, id: \.materialId) { m in
                                    let name = model.material(m.materialId).map { localize($0.name) } ?? m.materialId
                                    Text("• " + [m.amount.map { localize($0) }, name].compactMap { $0 }.joined(separator: " ")
                                         + (m.optional ? " \(model.t("activity.optional"))" : ""))
                                }
                                ForEach(Array((a.materialsText ?? []).enumerated()), id: \.offset) { Text("• " + localize($0.element)) }
                            }
                        }
                    }
                    if !a.steps.isEmpty { section(model.t("activity.steps")) { BulletList(items: a.steps, numbered: true) } }
                    if !a.variations.easier.isEmpty || !a.variations.harder.isEmpty {
                        section(model.t("activity.variations")) {
                            VStack(alignment: .leading, spacing: 8) {
                                if !a.variations.easier.isEmpty {
                                    Text(model.t("activity.easier")).font(.subheadline.weight(.semibold))
                                    BulletList(items: a.variations.easier)
                                }
                                if !a.variations.harder.isEmpty {
                                    Text(model.t("activity.harder")).font(.subheadline.weight(.semibold))
                                    BulletList(items: a.variations.harder)
                                }
                            }
                        }
                    }
                    if !a.guidanceTips.isEmpty { section(model.t("activity.tips")) { BulletList(items: a.guidanceTips) } }
                    if !a.safety.isEmpty {
                        section(model.t("activity.safety")) {
                            VStack(alignment: .leading, spacing: 6) {
                                ForEach(Array(a.safety.enumerated()), id: \.offset) { _, s in
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(model.t("safetyKind.\(s.kind.rawValue)")).font(.caption.weight(.semibold))
                                        Text(localize(s.text))
                                    }
                                }
                            }
                            .padding(12)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Theme.noticeBg, in: RoundedRectangle(cornerRadius: Theme.radiusSm))
                        }
                    }
                    if !a.learningOutcomes.isEmpty { section(model.t("activity.learns")) { BulletList(items: a.learningOutcomes) } }
                    if !a.rationale.de.isEmpty { section(model.t("activity.why")) { Text(localize(a.rationale)) } }
                    if let background = a.background { section(model.t("pedagogy.title")) { Text(localize(background)) } }
                    if let observe = a.observe, !observe.isEmpty { section(model.t("pedagogy.observe")) { BulletList(items: observe) } }
                    if let everyday = a.everyday, !everyday.isEmpty { section(model.t("pedagogy.everyday")) { BulletList(items: everyday) } }

                    let related = a.relatedMilestoneIds.compactMap(model.milestone)
                    if !related.isEmpty {
                        section(model.t("activity.relatedMilestones")) {
                            VStack(alignment: .leading, spacing: 6) {
                                ForEach(related, id: \.id) { m in
                                    NavigationLink(value: Route.milestone(m.id)) { Text(localize(m.title)).underline() }
                                }
                            }
                        }
                    }
                    ReferenceList(links: a.references)
                    if !a.isCustom { ReviewBadge(review: a.review) }

                    if a.isCustom {
                        HStack {
                            NavigationLink(value: Route.customActivity(a.id)) { Text(model.t("common.edit")) }.buttonStyle(.ghost)
                            Button(model.t("common.delete"), role: .destructive) { confirmDelete = true }.buttonStyle(.ghost)
                        }
                    }
                }
                .padding(Theme.gutter)
            }
            .page()
            .navigationBarTitleDisplayMode(.inline)
            .sheet(isPresented: $logging) { LogSheet(activity: a) }
            .confirmationDialog(model.t("activity.deleteCustomConfirm", ["name": localize(a.title)]), isPresented: $confirmDelete, titleVisibility: .visible) {
                Button(model.t("common.delete"), role: .destructive) {
                    model.update { $0.deleteCustomActivity(a.id) }
                    dismiss()
                }
            }
        } else {
            Text(model.t("activity.notFound")).padding()
        }
    }

    private func meta(_ label: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label).font(.caption).foregroundStyle(Theme.textMuted)
            Text(value).font(.subheadline.weight(.medium))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func section<Content: View>(_ title: String, @ViewBuilder _ content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            SectionTitle(title)
            content()
        }
    }
}

/// Eintrag im Verlauf: wann, wer, wie hat es gefallen, Notiz.
struct LogSheet: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    let activity: Activity
    var existing: ActivityLog? = nil

    @State private var date = Date()
    @State private var childIds: Set<String> = []
    @State private var enjoyment: Enjoyment?
    @State private var minutes = ""
    @State private var note = ""

    var body: some View {
        NavigationStack {
            Form {
                Section(model.t("log.date")) {
                    DatePicker(model.t("log.date"), selection: $date, in: ...Date(), displayedComponents: .date)
                }
                if model.children.count > 1 {
                    Section(model.t("log.children")) {
                        ForEach(model.children) { c in
                            Toggle(c.name, isOn: Binding(
                                get: { childIds.contains(c.id) },
                                set: { on in if on { childIds.insert(c.id) } else { childIds.remove(c.id) } }
                            ))
                        }
                    }
                }
                Section(model.t("log.enjoyment")) {
                    Picker(model.t("log.enjoyment"), selection: $enjoyment) {
                        Text("–").tag(Enjoyment?.none)
                        ForEach(Enjoyment.allCases, id: \.self) { Text(model.t("enjoyment.\($0.rawValue)")).tag(Enjoyment?.some($0)) }
                    }
                    .pickerStyle(.segmented)
                }
                Section(model.t("log.duration")) {
                    TextField(model.format.duration(activity), text: $minutes).keyboardType(.numberPad)
                }
                Section(model.t("log.note")) {
                    TextField(model.t("log.notePlaceholder"), text: $note, axis: .vertical).lineLimit(3...8)
                }
            }
            .scrollContentBackground(.hidden)
            .background(Theme.bg)
            .navigationTitle(model.t("log.dialogTitle"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button(model.t("common.cancel")) { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button(model.t("common.save")) { save() }.disabled(childIds.isEmpty)
                }
            }
            .onAppear(perform: prefill)
        }
    }

    private func prefill() {
        if let e = existing {
            date = dateValue(e.date)
            childIds = Set(e.childIds)
            enjoyment = e.enjoyment
            minutes = e.durationMinutes.map(String.init) ?? ""
            note = e.note ?? ""
        } else if let c = model.activeChild {
            childIds = [c.id]
        }
    }

    private func save() {
        let trimmed = note.trimmingCharacters(in: .whitespacesAndNewlines)
        let log = ActivityLog(
            id: existing?.id ?? newId(),
            childIds: model.children.map(\.id).filter(childIds.contains),
            activityRef: existing?.activityRef ?? model.ref(activity),
            date: Dates.today(date),
            durationMinutes: Int(minutes).flatMap { $0 > 0 ? $0 : nil },
            enjoyment: enjoyment,
            note: trimmed.isEmpty ? nil : trimmed,
            photoIds: existing?.photoIds ?? [],
            createdAt: existing?.createdAt ?? isoTimestamp()
        )
        model.update { $0.saveLog(log) }
        dismiss()
    }
}
