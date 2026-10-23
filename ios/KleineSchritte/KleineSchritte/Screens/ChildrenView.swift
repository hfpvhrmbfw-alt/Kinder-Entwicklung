// Kinderprofile wie src/ui/screens/children.ts.

import SwiftUI
import KleineSchritteCore

struct ChildrenView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        List {
            Group {
                ForEach(model.children) { c in
                    NavigationLink(value: Route.childForm(c.id)) {
                        VStack(alignment: .leading, spacing: 2) {
                            HStack {
                                Text(c.name).font(Theme.text(.body, .semibold))
                                if c.id == model.activeChild?.id {
                                    Text(model.t("children.active")).font(Theme.text(.caption)).foregroundStyle(Theme.okText)
                                }
                            }
                            if let age = model.age(of: c) { Text(model.format.childAge(age)).font(Theme.text(.caption)).foregroundStyle(Theme.textMuted) }
                        }
                    }
                }
                NavigationLink(value: Route.childForm(nil)) { Label(model.t("children.add"), systemImage: "plus") }
            }
            .listRowBackground(Theme.surface)
        }
        .scrollContentBackground(.hidden)
        .background(Theme.bg)
        .navigationTitle(model.t("children.title"))
    }
}

struct ChildFormView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    let childId: String?
    /// Beim ersten Start: nach dem Speichern ist die Einführung fertig.
    var finishesOnboarding = false

    @State private var name = ""
    @State private var birth = Date()
    @State private var premature = false
    @State private var due = Date()
    @State private var useCorrected = true
    @State private var error: String?
    @State private var confirmDelete = false
    @State private var loaded = false

    var body: some View {
        Form {
            Group {
                Section(model.t("children.name")) {
                    TextField(model.t("children.name"), text: $name).textContentType(.givenName)
                }
                Section {
                    DatePicker(model.t("children.birthDate"), selection: $birth, in: ...Date(), displayedComponents: .date)
                    Toggle(model.t("children.premature"), isOn: $premature).tint(Theme.sage)
                    if premature {
                        DatePicker(model.t("children.dueDate"), selection: $due, in: birth..., displayedComponents: .date)
                        Text(model.t("children.dueDateHint")).font(Theme.text(.caption)).foregroundStyle(Theme.textMuted)
                        Toggle(model.t("children.useCorrected"), isOn: $useCorrected).tint(Theme.sage)
                        Text(model.t("age.correctedHint")).font(Theme.text(.caption)).foregroundStyle(Theme.textMuted)
                    }
                }
                if let error { Section { Text(error).foregroundStyle(Theme.danger) } }
                if childId != nil {
                    Section {
                        Button(model.t("common.delete"), role: .destructive) { confirmDelete = true }
                    }
                }
            }
            .listRowBackground(Theme.surface)
        }
        .scrollContentBackground(.hidden)
        .background(Theme.bg)
        .navigationTitle(childId == nil ? model.t("children.new") : model.t("children.edit"))
        .navigationBarTitleDisplayMode(.inline)
        .toolbar { ToolbarItem(placement: .confirmationAction) { Button(model.t("common.save"), action: save) } }
        .confirmationDialog(model.t("children.deleteConfirm", ["name": name]), isPresented: $confirmDelete, titleVisibility: .visible) {
            Button(model.t("common.delete"), role: .destructive) {
                if let id = childId { model.update { $0.deleteChild(id) } }
                dismiss()
            }
        }
        .onAppear(perform: load)
    }

    private func load() {
        guard !loaded else { return }
        loaded = true
        guard let id = childId, let c = model.data.children.first(where: { $0.id == id }) else { return }
        name = c.name
        birth = dateValue(c.birthDate)
        premature = c.dueDate != nil
        if let d = c.dueDate { due = dateValue(d) }
        useCorrected = c.useCorrectedAge
    }

    private func save() {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        let birthDate = Dates.today(birth)
        let dueDate = premature ? Dates.today(due) : nil
        guard !trimmed.isEmpty else { error = model.t("children.errorName"); return }
        guard birthDate <= model.today else { error = model.t("children.errorBirthDate"); return }
        if let dueDate, dueDate <= birthDate { error = model.t("children.errorDueDate"); return }
        let now = isoTimestamp()
        let existing = childId.flatMap { id in model.data.children.first { $0.id == id } }
        let child = Child(id: existing?.id ?? newId(), name: trimmed, birthDate: birthDate, dueDate: dueDate,
                          useCorrectedAge: premature && useCorrected, photoId: existing?.photoId,
                          createdAt: existing?.createdAt ?? now, updatedAt: now)
        model.update {
            $0.saveChild(child)
            if existing == nil { $0.settings.activeChildId = child.id }
            if finishesOnboarding { $0.settings.onboardingDone = true }
        }
        if !finishesOnboarding { dismiss() }
    }
}
