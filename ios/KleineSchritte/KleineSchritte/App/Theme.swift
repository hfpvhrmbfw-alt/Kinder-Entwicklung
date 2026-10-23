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
    static let gutter: CGFloat = 20

    /// Überschriften mit Serifen (wie Lora in der Web-App), Text in der Systemschrift.
    static func heading(_ size: CGFloat) -> Font { .system(size: size, weight: .semibold, design: .serif) }
    static let pageTitle = Font.system(.largeTitle, design: .serif).weight(.semibold)
    static let cardTitle = Font.system(.title3, design: .serif).weight(.semibold)
}
