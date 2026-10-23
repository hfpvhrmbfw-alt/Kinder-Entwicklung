// Übersicht für den Kinderarzttermin wie src/ui/screens/doctor.ts, teilbar als PDF.

import SwiftUI
import KleineSchritteCore

struct DoctorView: View {
    @Environment(AppModel.self) private var model
    @State private var questions = ""
    @State private var pdf: URL?

    var body: some View {
        Group {
            if let child = model.activeChild, let age = model.age(of: child) {
                ScrollView {
                    VStack(alignment: .leading, spacing: 14) {
                        Text(model.t("doctor.intro")).foregroundStyle(Theme.textMuted)
                        VStack(alignment: .leading, spacing: 6) {
                            Text(model.t("doctor.questions")).font(Theme.text(.subheadline, .semibold))
                            TextField(model.t("doctor.questionsPlaceholder"), text: $questions, axis: .vertical)
                                .lineLimit(3...10)
                                .padding(10)
                                .background(Theme.surface, in: RoundedRectangle(cornerRadius: Theme.radiusSm))
                                .overlay(RoundedRectangle(cornerRadius: Theme.radiusSm).strokeBorder(Theme.border))
                                .onChange(of: questions) { _, text in
                                    model.update { $0.saveDoctorQuestions(String(text.prefix(4000)), childId: child.id) }
                                }
                            Text(model.t("doctor.questionsHint")).font(Theme.text(.caption)).foregroundStyle(Theme.textMuted)
                        }
                        if let pdf {
                            ShareLink(item: pdf) { Label(model.t("doctor.print"), systemImage: "square.and.arrow.up") }
                                .buttonStyle(.primary)
                            Text(model.t("doctor.printHint")).font(Theme.text(.caption)).foregroundStyle(Theme.textMuted)
                        }
                        DoctorSheet(model: model, child: child, age: age, questions: questions)
                            .card(Color.white, border: Theme.border)
                            .environment(\.colorScheme, .light)
                    }
                    .padding(Theme.gutter)
                }
                .page()
                .onAppear { questions = model.data.doctorQuestions[child.id] ?? "" }
                .task(id: questions) { pdf = renderPdf(child: child, age: age) }
            } else {
                ScrollView { NoChildView() }.page()
            }
        }
        .navigationTitle(model.t("doctor.title"))
    }

    /// A4-PDF, bei Bedarf über mehrere Seiten.
    @MainActor
    private func renderPdf(child: Child, age: ChildAge) -> URL? {
        let pageSize = CGSize(width: 595, height: 842)
        let margin: CGFloat = 40
        let content = DoctorSheet(model: model, child: child, age: age, questions: questions)
            .frame(width: pageSize.width - 2 * margin)
            .environment(\.colorScheme, .light)
        let renderer = ImageRenderer(content: content)
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("Kinderarzt-\(child.name)-\(model.today).pdf")
        var ok = false
        renderer.render { size, draw in
            var box = CGRect(origin: .zero, size: pageSize)
            guard let ctx = CGContext(url as CFURL, mediaBox: &box, nil) else { return }
            let usable = pageSize.height - 2 * margin
            let pages = max(1, Int((size.height / usable).rounded(.up)))
            for i in 0..<pages {
                ctx.beginPDFPage(nil)
                ctx.saveGState()
                ctx.clip(to: CGRect(x: margin, y: margin, width: pageSize.width - 2 * margin, height: usable))
                ctx.translateBy(x: margin, y: pageSize.height - margin - size.height + CGFloat(i) * usable)
                draw(ctx)
                ctx.restoreGState()
                ctx.endPDFPage()
            }
            ctx.closePDF()
            ok = true
        }
        return ok ? url : nil
    }
}

/// Inhalt der Übersicht (auf dem Bildschirm und im PDF gleich).
struct DoctorSheet: View {
    let model: AppModel
    let child: Child
    let age: ChildAge
    let questions: String

    var body: some View {
        let statuses = model.checkupStatuses(for: child)
        let last = lastDoneCheckup(statuses)
        let next = nextCheckup(statuses)
        let overview = try? doctorOverview(milestones: model.content.milestones, records: model.records(for: child),
                                           ageMonths: age.effectiveMonths, today: model.today, since: last?.record?.doneOn)
        VStack(alignment: .leading, spacing: 12) {
            Text(model.t("doctor.title")).font(Theme.heading(24))
            VStack(alignment: .leading, spacing: 3) {
                fact(model.t("doctor.child"), child.name)
                fact(model.t("doctor.born", ["date": model.format.date(child.birthDate)]), nil)
                if let due = child.dueDate { fact(model.t("doctor.due", ["date": model.format.date(due)]), nil) }
                fact(model.t("doctor.age"), model.format.childAge(age))
                if let last, let done = last.record?.doneOn { fact(model.t("doctor.lastCheckup"), "\(last.checkup.name), \(model.format.date(done))") }
                if let next { fact(model.t("doctor.nextCheckup"), "\(next.checkup.name), \(model.format.dateRange(next.window.start, next.window.end))") }
            }
            Text(last?.record?.doneOn.map { model.t("doctor.sinceCheckup", ["name": last!.checkup.name, "date": model.format.date($0)]) }
                 ?? model.t("doctor.sinceMonths", ["n": doctorDefaultMonths]))
                .font(Theme.text(.subheadline, .semibold))
            if let overview {
                if overview.domains.isEmpty { Text(model.t("doctor.nothing")).font(Theme.text(.subheadline)) }
                ForEach(overview.domains, id: \.domain) { d in
                    VStack(alignment: .leading, spacing: 4) {
                        Text(model.format.domain(d.domain)).font(Theme.text(.headline))
                        list(model.t("doctor.achieved"), d.achieved.map { "\(localize($0.milestone.title)) (\(model.format.date($0.date)))" })
                        list(model.t("doctor.inWindow"), d.inWindow.map { localize($0.title) })
                        list(model.t("doctor.consult"), d.consult.map { localize($0.title) })
                    }
                }
                if overview.domains.contains(where: { !$0.consult.isEmpty }) {
                    Text(model.t("doctor.consultIntro")).font(Theme.text(.caption))
                }
                if !overview.undated.isEmpty {
                    list(model.t("doctor.undated"), [overview.undated.map { localize($0.title) }.joined(separator: ", ")])
                }
            }
            if !questions.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                Text(model.t("doctor.questions")).font(Theme.text(.headline))
                Text(questions).font(Theme.text(.subheadline))
            }
            Text("\(model.t("doctor.footer")) \(model.t("doctor.created", ["date": model.format.date(model.today)]))")
                .font(Theme.text(.caption2))
                .foregroundStyle(.secondary)
        }
        .foregroundStyle(Color.black)
    }

    private func fact(_ label: String, _ value: String?) -> some View {
        HStack(alignment: .firstTextBaseline) {
            Text(label).font(Theme.text(.subheadline, value == nil ? .regular : .semibold))
            if let value { Text(value).font(Theme.text(.subheadline)) }
        }
    }

    @ViewBuilder
    private func list(_ label: String, _ items: [String]) -> some View {
        if !items.isEmpty {
            Text(label).font(Theme.text(.caption, .semibold))
            ForEach(Array(items.enumerated()), id: \.offset) { Text("• \($0.element)").font(Theme.text(.subheadline)) }
        }
    }
}
