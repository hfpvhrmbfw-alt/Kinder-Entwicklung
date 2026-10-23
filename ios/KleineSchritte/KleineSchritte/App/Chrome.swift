// Rahmen wie in der Web-App (src/main.ts, src/styles/base.css): Kopf mit Zweigen, Farbwahl und Kind-Knopf,
// schwebende Tab-Leiste unten und Listenkarten wie auf „Mehr“.

import SwiftUI
import KleineSchritteCore

// MARK: Tab-Leiste (.tabbar)

struct TabItem {
    let icon: AppIcon
    let label: String
}

/// Schwebende, abgerundete Karte mit fünf Bereichen; der aktive hat eine Salbei-Pille hinter dem Icon.
struct TabBar: View {
    let items: [TabItem]
    let selection: Int
    let select: (Int) -> Void

    var body: some View {
        HStack(spacing: 0) {
            ForEach(items.indices, id: \.self) { i in
                let active = i == selection
                Button { select(i) } label: {
                    VStack(spacing: 3) {
                        IconView(icon: items[i].icon, size: 22, lineWidth: active ? 2.1 : 1.8)
                            .frame(width: 48, height: 30)
                            .background(active ? Theme.sageSoft : .clear, in: Capsule())
                        Text(items[i].label)
                            .font(Theme.text(.caption2, active ? .semibold : .medium))
                            .lineLimit(1)
                            .minimumScaleFactor(0.8)
                    }
                    .foregroundStyle(active ? Theme.text : Theme.textMuted)
                    .frame(maxWidth: .infinity, minHeight: 52)
                    .padding(.top, 6)
                    .padding(.bottom, 4)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel(items[i].label)
                .accessibilityAddTraits(active ? [.isSelected, .isButton] : .isButton)
            }
        }
        .padding(6)
        .background(Theme.surface, in: RoundedRectangle(cornerRadius: Theme.radiusLg, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: Theme.radiusLg, style: .continuous).strokeBorder(Theme.border, lineWidth: 1))
        .shadow(color: Theme.floatShadow, radius: 15, x: 0, y: 10)
        .padding(.horizontal, 14)
        .padding(.bottom, 12)
        .frame(maxWidth: 520 - 2 * Theme.gutter + 28)
    }
}

// MARK: Kopf (.sprigs, .app-header, .page-title)

/// Seitenkopf der fünf Bereiche: Zweige in den Ecken, großer Titel in Lora, rechts Farbwahl und Kind.
struct PageHeader: View {
    @Environment(AppModel.self) private var model
    let title: String
    var subtitle: String? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(alignment: .center, spacing: 2) {
                Text(title)
                    .font(Theme.pageTitle)
                    .foregroundStyle(Theme.text)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                    .accessibilityAddTraits(.isHeader)
                Spacer(minLength: 8)
                ThemeButton()
                if let child = model.activeChild { ChildButton(child: child) }
            }
            .frame(minHeight: 44)
            if let subtitle {
                Text(subtitle).font(Theme.text(.callout)).foregroundStyle(Theme.textMuted)
            }
        }
        .padding(.top, Theme.headerArtHeight)
        .background(alignment: .top) { Sprigs().padding(.horizontal, -Theme.gutter) }
    }
}

/// Die beiden Zweige oben links und rechts (rechts gespiegelt).
struct Sprigs: View {
    var body: some View {
        HStack(alignment: .top) {
            Image("sprig").resizable().scaledToFit().frame(width: 96)
            Spacer()
            Image("sprig").resizable().scaledToFit().frame(width: 96).scaleEffect(x: -1)
        }
        .frame(height: Theme.headerArtHeight, alignment: .top)
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }
}

/// Farbwahl wie in der Web-App: wechselt System → Hell → Dunkel.
struct ThemeButton: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        let theme = model.settings.theme
        let order: [ThemePreference] = [.system, .light, .dark]
        let icon: AppIcon = theme == .light ? .themeLight : theme == .dark ? .themeDark : .themeSystem
        let name = theme == .light ? "settings.themeLight" : theme == .dark ? "settings.themeDark" : "settings.themeSystem"
        Button {
            let next = order[((order.firstIndex(of: theme) ?? 0) + 1) % order.count]
            model.update { $0.settings.theme = next }
        } label: {
            IconView(icon: icon, size: 24)
                .foregroundStyle(Theme.text)
                .frame(width: 44, height: 44)
                .contentShape(Circle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(model.t("settings.theme")): \(model.t(name))")
    }
}

/// Runder Knopf mit dem Anfangsbuchstaben des Kindes, führt zu „Kinder verwalten“.
struct ChildButton: View {
    @Environment(AppModel.self) private var model
    let child: Child

    var body: some View {
        NavigationLink(value: Route.children) {
            Text(child.name.trimmingCharacters(in: .whitespaces).prefix(1).uppercased())
                .font(Theme.heading(16, bold: true))
                .foregroundStyle(Theme.text)
                .frame(width: 36, height: 36)
                .background(Theme.sageSoft, in: Circle())
                .overlay(Circle().strokeBorder(Theme.sage, lineWidth: 1))
                .padding(4)
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(model.t("more.children")): \(child.name)")
    }
}

// MARK: Listenkarten (.listgroup, .listcard, .listrow)

/// Abschnitt mit Überschrift in Lora und einer Karte mit Zeilen.
struct ListGroup<Content: View>: View {
    let title: String?
    let content: Content

    init(_ title: String?, @ViewBuilder content: () -> Content) {
        self.title = title
        self.content = content()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            if let title {
                Text(title).font(Theme.heading(19)).accessibilityAddTraits(.isHeader)
            }
            VStack(spacing: 0) { content }
                .background(Theme.surface, in: RoundedRectangle(cornerRadius: Theme.radiusMd, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: Theme.radiusMd, style: .continuous).strokeBorder(Theme.border, lineWidth: 1))
                .clipShape(RoundedRectangle(cornerRadius: Theme.radiusMd, style: .continuous))
        }
    }
}

/// Feine Linie zwischen zwei Zeilen einer Listenkarte.
struct ListDivider: View {
    var body: some View { Rectangle().fill(Theme.borderSoft).frame(height: 1) }
}

/// Zeile mit Text, optionalem Wert rechts und Pfeil.
struct ListRowLabel: View {
    let label: String
    var value: String? = nil
    var chevron = true

    var body: some View {
        HStack(spacing: 12) {
            Text(label).font(Theme.text(.body, .medium)).foregroundStyle(Theme.text)
                .frame(maxWidth: .infinity, alignment: .leading)
            if let value, !value.isEmpty {
                Text(value).font(Theme.text(.subheadline)).foregroundStyle(Theme.textMuted).lineLimit(1)
            }
            if chevron { IconView(icon: .chevron, size: 18).foregroundStyle(Theme.textMuted) }
        }
        .padding(.leading, 18)
        .padding(.trailing, 14)
        .padding(.vertical, 10)
        .frame(minHeight: 52)
        .contentShape(Rectangle())
    }
}

/// Navigationszeile in einer Listenkarte.
struct ListLink: View {
    let label: String
    var value: String? = nil
    let route: Route

    var body: some View {
        NavigationLink(value: route) { ListRowLabel(label: label, value: value) }
            .buttonStyle(RowButtonStyle())
    }
}

struct RowButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.background(configuration.isPressed ? Theme.surfaceMuted : .clear)
    }
}

// MARK: Suchfeld (input[type=search])

struct SearchField: View {
    @Binding var text: String
    let prompt: String

    var body: some View {
        HStack(spacing: 8) {
            TextField(prompt, text: $text)
                .font(Theme.text())
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .submitLabel(.search)
            if !text.isEmpty {
                Button { text = "" } label: { Image(systemName: "xmark.circle.fill").foregroundStyle(Theme.textMuted) }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Suche leeren")
            }
        }
        .padding(.horizontal, 16)
        .frame(minHeight: 44)
        .background(Theme.surface, in: Capsule())
        .overlay(Capsule().strokeBorder(Theme.border, lineWidth: 1))
    }
}

// MARK: Auswahlschalter (.segmented)

/// Pillen-Auswahl wie in der Web-App: gewählte Option salbeigrün mit feinem Rand, optional mit Überschrift.
struct Segmented<Value: Hashable>: View {
    var legend: String? = nil
    let options: [(Value, String)]
    @Binding var selection: Value

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            if let legend {
                Text(legend).font(Theme.text(.subheadline, .medium)).foregroundStyle(Theme.textMuted)
            }
            HStack(spacing: 4) {
                ForEach(options.indices, id: \.self) { i in
                    let (value, label) = options[i]
                    let on = value == selection
                    Button { selection = value } label: {
                        Text(label)
                            .font(Theme.text(.subheadline, .medium))
                            .foregroundStyle(Theme.text)
                            .lineLimit(1)
                            .minimumScaleFactor(0.8)
                            .frame(maxWidth: .infinity, minHeight: 40)
                            .background(on ? Theme.sageSoft : .clear, in: Capsule())
                            .overlay(Capsule().strokeBorder(on ? Theme.sage : .clear, lineWidth: 1))
                            .contentShape(Capsule())
                    }
                    .buttonStyle(.plain)
                    .accessibilityAddTraits(on ? [.isSelected, .isButton] : .isButton)
                }
            }
            .padding(4)
            .background(Theme.bg, in: Capsule())
            .overlay(Capsule().strokeBorder(Theme.border, lineWidth: 1))
        }
    }
}
