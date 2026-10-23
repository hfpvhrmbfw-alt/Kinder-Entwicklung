// Farben und Formen aus src/styles/tokens.css (Stil „Beet“). Hell und dunkel wie in der Web-App.

import SwiftUI
import UIKit
import KleineSchritteCore

extension UIColor {
    convenience init(hex: UInt32) {
        self.init(red: CGFloat((hex >> 16) & 0xFF) / 255, green: CGFloat((hex >> 8) & 0xFF) / 255,
                  blue: CGFloat(hex & 0xFF) / 255, alpha: 1)
    }
}

extension Color {
    /// Farbe, die sich mit hell/dunkel ändert.
    static func dynamic(_ light: UInt32, _ dark: UInt32) -> Color {
        Color(uiColor: UIColor { $0.userInterfaceStyle == .dark ? UIColor(hex: dark) : UIColor(hex: light) })
    }
}

enum Theme {
    static let bg = Color.dynamic(0xEADFCC, 0x1C1B1A)
    static let surface = Color.dynamic(0xEFE6D6, 0x252321)
    static let surfaceMuted = Color.dynamic(0xE0D3BD, 0x302D2A)
    static let text = Color.dynamic(0x1E1A16, 0xEFE6D6)
    static let textMuted = Color.dynamic(0x5C5247, 0xB6AB9B)
    static let border = Color.dynamic(0xB9AA91, 0x4E4943)
    static let borderSoft = Color.dynamic(0xD2C4AC, 0x3A3632)
    static let primary = Color.dynamic(0xF47A4B, 0xF47A4B)
    static let onPrimary = Color.dynamic(0x1E1A16, 0x1C1B1A)
    static let primarySoft = Color.dynamic(0xF6D2BE, 0x4A2C1F)
    static let primaryText = Color.dynamic(0x9E4019, 0xFF9A70)
    static let sage = Color.dynamic(0x5E8F6E, 0x8DBB9A)
    static let sageSoft = Color.dynamic(0xBFD6C3, 0x3B5446)
    static let infoBg = Color.dynamic(0xD6DEE6, 0x212A36)
    static let infoText = Color.dynamic(0x2C4F80, 0x9DBBE6)
    static let noticeBg = Color.dynamic(0xF0DDB3, 0x352B17)
    static let noticeText = Color.dynamic(0x7A5200, 0xE3B55E)
    static let okBg = Color.dynamic(0xD3E2CF, 0x25332A)
    static let okText = Color.dynamic(0x2F6B40, 0x8CC79A)
    static let danger = Color.dynamic(0xA3182B, 0xF08A8F)

    static func domain(_ d: DomainId) -> Color {
        switch d {
        case .grossMotor: return .dynamic(0x2F6F5E, 0x7CC8B0)
        case .fineMotor: return .dynamic(0x1F7A80, 0x7FCFD3)
        case .language: return .dynamic(0xB0532A, 0xF0A27E)
        case .cognition: return .dynamic(0x2B5EA7, 0x8FB5EE)
        case .socialEmotional: return .dynamic(0xA6346B, 0xEC9CC2)
        case .selfCare: return .dynamic(0x6B6A1F, 0xCFCD7A)
        }
    }

    static let radiusSm: CGFloat = 12
    static let radiusMd: CGFloat = 20
    static let radiusLg: CGFloat = 22
    /// Höhe der Zweige über dem Seitentitel (--header-art-height).
    static let headerArtHeight: CGFloat = 88
    /// --shadow-float
    static let floatShadow = Color(uiColor: UIColor { $0.userInterfaceStyle == .dark
        ? UIColor(white: 0, alpha: 0.6) : UIColor(red: 70 / 255, green: 50 / 255, blue: 20 / 255, alpha: 0.22) })
    static let gutter: CGFloat = 20

    // Schriften wie in der Web-App: Lora für Überschriften, Source Sans 3 für Text
    // (src/styles/tokens.css). Die Dateien liegen unter Resources/Fonts und stehen in UIAppFonts.

    /// Überschrift in Lora (Halbfett), wächst mit der Textgröße der Bedienungshilfen.
    static func heading(_ size: CGFloat, bold: Bool = false) -> Font {
        .custom(bold ? FontName.loraBold : FontName.loraSemiBold, size: size, relativeTo: .title)
    }
    /// Seitentitel wie `h1.page-title` (34 pt, Lora fett).
    static let pageTitle = heading(34, bold: true)
    /// Kartenüberschrift wie `.card__title` (19 pt, Lora halbfett).
    static let cardTitle = heading(19)

    /// Fließtext in Source Sans 3. Größen wie in der Web-App (Text 16, klein 14, sehr klein 13).
    static func text(_ style: Font.TextStyle = .body, _ weight: Font.Weight = .regular) -> Font {
        let size: CGFloat
        var weight = weight
        switch style {
        case .largeTitle: size = 34
        case .title: size = 28
        case .title2: size = 24
        case .title3: size = 19
        case .headline: size = 16; if weight == .regular { weight = .semibold }
        case .callout: size = 15
        case .subheadline: size = 14
        case .footnote: size = 13
        case .caption: size = 13
        case .caption2: size = 11
        default: size = 16
        }
        return .custom(FontName.sans(weight), size: size, relativeTo: style)
    }

    enum FontName {
        static let loraSemiBold = "Lora-SemiBold"
        static let loraBold = "Lora-Bold"
        // So heißen die Schnitte in den Dateien von Fontsource.
        static func sans(_ weight: Font.Weight) -> String {
            switch weight {
            case .medium: return "SourceSans3ExtraLight-Medium"
            case .semibold: return "SourceSans3ExtraLight-SemiBold"
            case .bold, .heavy, .black: return "SourceSans3ExtraLight-Bold"
            default: return "SourceSans3ExtraLight-Regular"
            }
        }
    }

    static func uiSans(_ size: CGFloat, _ weight: Font.Weight = .regular) -> UIFont {
        UIFont(name: FontName.sans(weight), size: size) ?? .systemFont(ofSize: size)
    }
    static func uiHeading(_ size: CGFloat, bold: Bool = false) -> UIFont {
        UIFont(name: bold ? FontName.loraBold : FontName.loraSemiBold, size: size) ?? .systemFont(ofSize: size, weight: .semibold)
    }

    /// Navigationsleiste und Auswahlschalter (UIKit) in den Schriften und Farben der Web-App.
    @MainActor static func applyAppearance() {
        let nav = UINavigationBarAppearance()
        nav.configureWithTransparentBackground()
        nav.backgroundColor = UIColor(bg)
        nav.largeTitleTextAttributes = [.font: UIFontMetrics(forTextStyle: .largeTitle).scaledFont(for: uiHeading(28, bold: true)), .foregroundColor: UIColor(text)]
        nav.titleTextAttributes = [.font: UIFontMetrics(forTextStyle: .headline).scaledFont(for: uiHeading(18)), .foregroundColor: UIColor(text)]
        let button = UIBarButtonItemAppearance()
        button.normal.titleTextAttributes = [.font: uiSans(17, .medium)]
        nav.buttonAppearance = button
        nav.backButtonAppearance = button
        UINavigationBar.appearance().standardAppearance = nav
        UINavigationBar.appearance().scrollEdgeAppearance = nav
        UINavigationBar.appearance().compactAppearance = nav

        let seg = UISegmentedControl.appearance()
        seg.selectedSegmentTintColor = UIColor(sageSoft)
        seg.backgroundColor = UIColor(surface)
        seg.setTitleTextAttributes([.font: uiSans(14, .medium), .foregroundColor: UIColor(textMuted)], for: .normal)
        seg.setTitleTextAttributes([.font: uiSans(14, .semibold), .foregroundColor: UIColor(text)], for: .selected)

        UITextField.appearance(whenContainedInInstancesOf: [UISearchBar.self]).font = uiSans(16)
    }
}
