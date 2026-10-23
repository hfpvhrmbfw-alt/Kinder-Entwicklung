// Wiederkehrende Bausteine: Karte, Knöpfe, Bereichs-Abzeichen, Ideen-Zeile, Abschnittstitel.

import SwiftUI
import KleineSchritteCore

struct CardModifier: ViewModifier {
    var background: Color = Theme.surface
    var border: Color = Theme.border

    func body(content: Content) -> some View {
        content
            .padding(20)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(background, in: RoundedRectangle(cornerRadius: Theme.radiusMd, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: Theme.radiusMd, style: .continuous).strokeBorder(border, lineWidth: 1))
    }
}

extension View {
    func card(_ background: Color = Theme.surface, border: Color = Theme.border) -> some View {
        modifier(CardModifier(background: background, border: border))
    }

    /// Hintergrund und Abstände einer Seite.
    func page() -> some View {
        scrollContentBackground(.hidden)
            .background(Theme.bg.ignoresSafeArea())
    }
}

struct PrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(Theme.text(.body, .semibold))
            .padding(.horizontal, 20)
            .frame(minHeight: 44)
            .foregroundStyle(Theme.onPrimary)
            .background(Theme.primary.opacity(configuration.isPressed ? 0.8 : 1), in: Capsule())
    }
}

struct GhostButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(Theme.text(.body, .medium))
            .padding(.horizontal, 16)
            .frame(minHeight: 44)
            .foregroundStyle(Theme.text)
            .background(configuration.isPressed ? Theme.surfaceMuted : .clear, in: Capsule())
            .overlay(Capsule().strokeBorder(Theme.border, lineWidth: 1))
    }
}

extension ButtonStyle where Self == PrimaryButtonStyle {
    static var primary: PrimaryButtonStyle { PrimaryButtonStyle() }
}

extension ButtonStyle where Self == GhostButtonStyle {
    static var ghost: GhostButtonStyle { GhostButtonStyle() }
}

/// Auswahl-Pille (Salbei, wenn gewählt), z. B. für Zeit, Ort und Filter.
struct Chip: View {
    let label: String
    let selected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(label)
                .font(Theme.text(.subheadline, selected ? .semibold : .regular))
                .padding(.horizontal, 14)
                .frame(minHeight: 36)
                .foregroundStyle(Theme.text)
                .background(selected ? Theme.sageSoft : Theme.surface, in: Capsule())
                .overlay(Capsule().strokeBorder(selected ? Theme.sage : Theme.border, lineWidth: 1))
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(selected ? .isSelected : [])
    }
}

/// Zeilenumbruch für Pillen.
struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let width = proposal.width ?? .infinity
        var x: CGFloat = 0, y: CGFloat = 0, rowHeight: CGFloat = 0, maxX: CGFloat = 0
        for v in subviews {
            let size = v.sizeThatFits(.unspecified)
            if x > 0 && x + size.width > width {
                x = 0
                y += rowHeight + spacing
                rowHeight = 0
            }
            x += size.width + spacing
            maxX = max(maxX, x - spacing)
            rowHeight = max(rowHeight, size.height)
        }
        return CGSize(width: min(maxX, width), height: y + rowHeight)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x = bounds.minX, y = bounds.minY, rowHeight: CGFloat = 0
        for v in subviews {
            let size = v.sizeThatFits(.unspecified)
            if x > bounds.minX && x + size.width > bounds.maxX {
                x = bounds.minX
                y += rowHeight + spacing
                rowHeight = 0
            }
            v.place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(size))
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
    }
}

/// Bereich als Pille mit farbigem Punkt (.badge--domain).
struct DomainBadge: View {
    @Environment(AppModel.self) private var model
    let domain: DomainId
    var large = false

    var body: some View {
        HStack(spacing: 6) {
            Circle().fill(Theme.domain(domain)).frame(width: large ? 9 : 8, height: large ? 9 : 8)
            Text(model.format.domain(domain))
        }
        .badge(large: large)
    }
}

/// Schlagwort-Pille (.badge): feiner Rand, 12 pt.
struct Badge: View {
    let text: String
    var dashed = false

    var body: some View { Text(text).badge(dashed: dashed) }
}

extension View {
    func badge(large: Bool = false, dashed: Bool = false) -> some View {
        font(.custom(Theme.FontName.sans(.medium), size: large ? 14 : 12, relativeTo: .caption))
            .foregroundStyle(Theme.text)
            .lineLimit(1)
            .padding(.horizontal, large ? 12 : 10)
            .padding(.vertical, large ? 7 : 5)
            .overlay(Capsule().strokeBorder(Theme.border, style: StrokeStyle(lineWidth: 1, dash: dashed ? [4, 3] : [])))
    }
}

struct SectionTitle: View {
    let text: String

    init(_ text: String) {
        self.text = text
    }

    var body: some View {
        Text(text)
            .font(Theme.heading(24))
            .foregroundStyle(Theme.text)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.top, 8)
            .accessibilityAddTraits(.isHeader)
    }
}

/// Hinweis-Kasten (Info, Achtung, Erfolg).
struct Notice: View {
    enum Kind { case info, notice, ok }
    let kind: Kind
    let text: String

    private var colors: (bg: Color, fg: Color) {
        switch kind {
        case .info: return (Theme.infoBg, Theme.infoText)
        case .notice: return (Theme.noticeBg, Theme.noticeText)
        case .ok: return (Theme.okBg, Theme.okText)
        }
    }

    var body: some View {
        Text(text)
            .font(Theme.text(.subheadline))
            .foregroundStyle(colors.fg)
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(colors.bg, in: RoundedRectangle(cornerRadius: Theme.radiusSm, style: .continuous))
    }
}

/// Idee in Listen: Titel, Kurzbeschreibung, Alter, Dauer, Bereich, optional Begründung.
struct ActivityRow: View {
    @Environment(AppModel.self) private var model
    let activity: Activity
    var reasons: [RecommendationReason] = []

    var body: some View {
        // Wie activityCard() in der Web-App: Titel, kurze Beschreibung, Schlagwort-Pillen
        NavigationLink(value: Route.activity(activity.id)) {
            VStack(alignment: .leading, spacing: 8) {
                HStack(alignment: .firstTextBaseline) {
                    Text(localize(activity.title))
                        .font(Theme.cardTitle)
                        .foregroundStyle(Theme.text)
                        .multilineTextAlignment(.leading)
                    Spacer(minLength: 8)
                    if model.isFavorite(activity) {
                        IconView(icon: .heart, size: 18).foregroundStyle(Theme.primary).accessibilityLabel(model.t("reason.favorite"))
                    }
                }
                if !activity.summary.de.isEmpty {
                    Text(localize(activity.summary)).font(Theme.text(.subheadline)).foregroundStyle(Theme.text).multilineTextAlignment(.leading)
                }
                FlowLayout(spacing: 6) {
                    DomainBadge(domain: activity.domains.primary)
                    Badge(text: model.t("location.\(activity.location.rawValue)"))
                    Badge(text: model.format.duration(activity))
                    Badge(text: model.format.ageRange(activity.ageRange))
                    if activity.origin == .custom { Badge(text: model.t("activity.custom"), dashed: true) }
                }
                .padding(.top, 2)
                if !reasons.isEmpty {
                    Text(reasons.map(model.reasonText).joined(separator: " · "))
                        .font(Theme.text(.subheadline)).foregroundStyle(Theme.textMuted)
                }
            }
            .card()
        }
        .buttonStyle(.plain)
    }
}

/// Aufzählung lokalisierter Texte.
struct BulletList: View {
    let items: [LocalizedText]
    var numbered = false

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            ForEach(Array(items.enumerated()), id: \.offset) { i, item in
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    Text(numbered ? "\(i + 1)." : "•").foregroundStyle(Theme.textMuted).monospacedDigit()
                    Text(localize(item)).fixedSize(horizontal: false, vertical: true)
                }
            }
        }
    }
}
