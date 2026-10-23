// Eigene Idee anlegen oder bearbeiten, wie src/ui/screens/customActivity.ts.

import SwiftUI
import KleineSchritteCore

struct CustomActivityFormView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    let activityId: String?

    @State private var input = CustomActivityInput(domain: .cognition, category: .play)
    @State private var error: CustomActivityError?
    @State private var loaded = false

    private let ageSteps: [Double] = [0, 3, 6, 9, 12, 18, 24, 36, 48, 60, 72, 84]

    var body: some View {
        Form {
            Group {
                Section { Text(model.t("custom.intro")).font(Theme.text(.subheadline)).foregroundStyle(Theme.textMuted) }
                Section(model.t("custom.title")) {
                    TextField(model.t("custom.titlePlaceholder"), text: $input.title)
                }
                Section(model.t("custom.summary")) {
                    TextField(model.t("custom.summaryPlaceholder"), text: $input.summary, axis: .vertical)
                }
                Section {
                    Picker(model.t("custom.ageFrom"), selection: $input.minMonths) {
                        ForEach(ageSteps.dropLast(), id: \.self) { Text(model.format.months($0)).tag($0) }
                    }
                    Picker(model.t("custom.ageTo"), selection: $input.maxMonths) {
                        ForEach(ageSteps.dropFirst(), id: \.self) { Text(model.format.months($0)).tag($0) }
                    }
                    Picker(model.t("custom.domain"), selection: $input.domain) {
                        ForEach(DomainId.allCases, id: \.self) { Text(model.format.domain($0)).tag($0) }
                    }
                    Picker(model.t("custom.category"), selection: $input.category) {
                        ForEach(model.content.categories, id: \.id) { Text(localize($0.name)).tag($0.id) }
                    }
                    Picker(model.t("custom.location"), selection: $input.location) {
                        ForEach(Location.allCases, id: \.self) { Text(model.t("location.\($0.rawValue)")).tag($0) }
                    }
                    Stepper("\(model.t("custom.minutes")): \(input.minutes)", value: $input.minutes, in: 1...600, step: 5)
                }
                Section {
                    TextField(model.t("custom.materialsHint"), text: $input.materials, axis: .vertical).lineLimit(2...8)
                } header: { Text(model.t("custom.materials")) }
                Section {
                    TextField(model.t("custom.stepsHint"), text: $input.steps, axis: .vertical).lineLimit(3...12)
                } header: { Text(model.t("custom.steps")) }
                Section(model.t("custom.tips")) {
                    TextField("", text: $input.tips, axis: .vertical).lineLimit(2...8)
                }
                if let error {
                    Section { Text(model.t(errorKey(error))).foregroundStyle(Theme.danger) }
                }
            }
            .listRowBackground(Theme.surface)
        }
        .scrollContentBackground(.hidden)
        .background(Theme.bg)
        .navigationTitle(activityId == nil ? model.t("custom.newTitle") : model.t("custom.editTitle"))
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .confirmationAction) { Button(model.t("common.save"), action: save) }
        }
        .onAppear {
            guard !loaded else { return }
            loaded = true
            if let id = activityId, let a = model.data.customActivities.first(where: { $0.id == id }) {
                input = CustomActivityInput(a)
            } else if let c = model.activeChild, let months = model.age(of: c)?.effectiveMonths {
                let from = ageSteps.last { $0 <= months } ?? 0
                input.minMonths = min(from, 72)
                input.maxMonths = ageSteps.first { $0 > input.minMonths + 6 } ?? 84
            }
        }
    }

    private func errorKey(_ e: CustomActivityError) -> String {
        switch e {
        case .title: return "custom.errorTitle"
        case .age: return "custom.errorAge"
        case .minutes: return "custom.errorMinutes"
        }
    }

    private func save() {
        if let e = validateCustomActivity(input) {
            error = e
            return
        }
        let existing = activityId.flatMap { id in model.data.customActivities.first { $0.id == id } }
        guard let a = try? buildCustomActivity(input, id: existing?.id ?? newCustomActivityId(), existing: existing) else { return }
        model.update { $0.saveCustomActivity(a) }
        dismiss()
    }
}
