// Linien-Icons aus src/ui/lib/h.ts (ICONS), 24×24, für die Tab-Leiste und den Kopf.
// Erzeugt aus den SVG-Pfaden der Web-App (Bögen als Bézierkurven). Nicht von Hand ändern.

import SwiftUI

enum AppIcon: String, CaseIterable {
    case today, growth, ideas, history, more, heart, check, back, child, home, themeLight, themeDark, themeSystem, arrow, plus, chevron, calendar, print, edit

    /// Pfad im 24×24-Raster, skaliert auf `rect`.
    func path(in rect: CGRect) -> Path {
        let s = min(rect.width, rect.height) / 24
        let ox = rect.midX - 12 * s, oy = rect.midY - 12 * s
        func p(_ x: CGFloat, _ y: CGFloat) -> CGPoint { CGPoint(x: ox + x * s, y: oy + y * s) }
        var path = Path()
        switch self {
        case .today:
            path.move(to: p(12, 3))
            path.addLine(to: p(12, 5))
            path.move(to: p(12, 19))
            path.addLine(to: p(12, 21))
            path.move(to: p(5, 12))
            path.addLine(to: p(3, 12))
            path.move(to: p(21, 12))
            path.addLine(to: p(19, 12))
            path.move(to: p(6.3, 6.3))
            path.addLine(to: p(4.9, 4.9))
            path.move(to: p(19.1, 19.1))
            path.addLine(to: p(17.7, 17.7))
            path.move(to: p(6.3, 17.7))
            path.addLine(to: p(4.9, 19.1))
            path.move(to: p(19.1, 4.9))
            path.addLine(to: p(17.7, 6.3))
            path.move(to: p(12, 8))
            path.addCurve(to: p(8, 12), control1: p(9.806, 8), control2: p(8, 9.806))
            path.addCurve(to: p(12, 16), control1: p(8, 14.19), control2: p(9.806, 16))
            path.addCurve(to: p(16, 12), control1: p(14.19, 16), control2: p(16, 14.19))
            path.addCurve(to: p(12, 8), control1: p(16, 9.806), control2: p(14.19, 8))
        case .growth:
            path.move(to: p(4, 20))
            path.addLine(to: p(20, 20))
            path.move(to: p(6, 16))
            path.addLine(to: p(10, 11))
            path.addLine(to: p(14, 14))
            path.addLine(to: p(19, 7))
        case .ideas:
            path.move(to: p(9, 18))
            path.addLine(to: p(15, 18))
            path.move(to: p(10, 21))
            path.addLine(to: p(14, 21))
            path.move(to: p(12, 3))
            path.addCurve(to: p(6.25, 7.166), control1: p(9.386, 2.984), control2: p(7.049, 4.677))
            path.addCurve(to: p(8.5, 13.9), control1: p(5.451, 9.654), control2: p(6.365, 12.39))
            path.addCurve(to: p(9.5, 15.9), control1: p(9.1, 14.4), control2: p(9.5, 15.1))
            path.addLine(to: p(9.5, 16))
            path.addLine(to: p(14.5, 16))
            path.addLine(to: p(14.5, 15.9))
            path.addCurve(to: p(15.5, 13.9), control1: p(14.5, 15.1), control2: p(14.9, 14.4))
            path.addCurve(to: p(17.75, 7.166), control1: p(17.63, 12.39), control2: p(18.55, 9.654))
            path.addCurve(to: p(12, 3), control1: p(16.95, 4.677), control2: p(14.61, 2.984))
        case .history:
            path.move(to: p(3, 12))
            path.addCurve(to: p(10.12, 20.81), control1: p(2.996, 16.23), control2: p(5.977, 19.92))
            path.addCurve(to: p(20.21, 15.69), control1: p(14.25, 21.69), control2: p(18.48, 19.55))
            path.addCurve(to: p(17.31, 4.741), control1: p(21.94, 11.82), control2: p(20.73, 7.238))
            path.addCurve(to: p(6, 5.3), control1: p(13.89, 2.245), control2: p(9.154, 2.479))
            path.addLine(to: p(3, 8))
            path.move(to: p(3, 3))
            path.addLine(to: p(3, 8))
            path.addLine(to: p(8, 8))
            path.move(to: p(12, 7))
            path.addLine(to: p(12, 12))
            path.addLine(to: p(15, 15))
        case .more:
            path.move(to: p(5, 12))
            path.addLine(to: p(5.01, 12))
            path.move(to: p(12, 12))
            path.addLine(to: p(12.01, 12))
            path.move(to: p(19, 12))
            path.addLine(to: p(19.01, 12))
        case .heart:
            path.move(to: p(12, 20))
            path.addCurve(to: p(5, 10), control1: p(12, 20), control2: p(5, 15.6))
            path.addCurve(to: p(7.607, 6.296), control1: p(5.019, 8.348), control2: p(6.059, 6.871))
            path.addCurve(to: p(12, 7.4), control1: p(9.155, 5.721), control2: p(10.91, 6.161))
            path.addCurve(to: p(16.39, 6.296), control1: p(13.09, 6.161), control2: p(14.84, 5.721))
            path.addCurve(to: p(19, 10), control1: p(17.94, 6.871), control2: p(18.98, 8.348))
            path.addCurve(to: p(12, 20), control1: p(19, 15.6), control2: p(12, 20))
        case .check:
            path.move(to: p(5, 12))
            path.addLine(to: p(10, 17))
            path.addLine(to: p(20, 7))
        case .back:
            path.move(to: p(15, 18))
            path.addLine(to: p(9, 12))
            path.addLine(to: p(15, 6))
        case .child:
            path.move(to: p(12, 4))
            path.addCurve(to: p(9, 7), control1: p(10.35, 4), control2: p(9, 5.354))
            path.addCurve(to: p(12, 10), control1: p(9, 8.646), control2: p(10.35, 10))
            path.addCurve(to: p(15, 7), control1: p(13.65, 10), control2: p(15, 8.646))
            path.addCurve(to: p(12, 4), control1: p(15, 5.354), control2: p(13.65, 4))
            path.move(to: p(6, 21))
            path.addLine(to: p(6, 19))
            path.addCurve(to: p(12, 13), control1: p(6, 15.71), control2: p(8.708, 13))
            path.addCurve(to: p(18, 19), control1: p(15.29, 13), control2: p(18, 15.71))
            path.addLine(to: p(18, 21))
        case .home:
            path.move(to: p(4, 11))
            path.addLine(to: p(12, 4))
            path.addLine(to: p(20, 11))
            path.addLine(to: p(20, 19.5))
            path.addCurve(to: p(19.5, 20), control1: p(20, 19.77), control2: p(19.77, 20))
            path.addLine(to: p(15, 20))
            path.addLine(to: p(15, 14))
            path.addLine(to: p(9, 14))
            path.addLine(to: p(9, 20))
            path.addLine(to: p(4.5, 20))
            path.addCurve(to: p(4, 19.5), control1: p(4.226, 20), control2: p(4, 19.77))
            path.addLine(to: p(4, 11))
        case .themeLight:
            path.move(to: p(12, 8))
            path.addCurve(to: p(8, 12), control1: p(9.806, 8), control2: p(8, 9.806))
            path.addCurve(to: p(12, 16), control1: p(8, 14.19), control2: p(9.806, 16))
            path.addCurve(to: p(16, 12), control1: p(14.19, 16), control2: p(16, 14.19))
            path.addCurve(to: p(12, 8), control1: p(16, 9.806), control2: p(14.19, 8))
            path.move(to: p(12, 2.5))
            path.addLine(to: p(12, 4.5))
            path.move(to: p(12, 19.5))
            path.addLine(to: p(12, 21.5))
            path.move(to: p(2.5, 12))
            path.addLine(to: p(4.5, 12))
            path.move(to: p(19.5, 12))
            path.addLine(to: p(21.5, 12))
            path.move(to: p(5.3, 5.3))
            path.addLine(to: p(6.7, 6.7))
            path.move(to: p(17.3, 17.3))
            path.addLine(to: p(18.7, 18.7))
            path.move(to: p(5.3, 18.7))
            path.addLine(to: p(6.7, 17.3))
            path.move(to: p(17.3, 6.7))
            path.addLine(to: p(18.7, 5.3))
        case .themeDark:
            path.move(to: p(19.5, 14.5))
            path.addCurve(to: p(11.49, 12.51), control1: p(16.67, 15.37), control2: p(13.58, 14.6))
            path.addCurve(to: p(9.5, 4.5), control1: p(9.396, 10.42), control2: p(8.629, 7.329))
            path.addCurve(to: p(3.894, 12.94), control1: p(5.874, 5.616), control2: p(3.517, 9.166))
            path.addCurve(to: p(11.06, 20.11), control1: p(4.271, 16.72), control2: p(7.284, 19.73))
            path.addCurve(to: p(19.5, 14.5), control1: p(14.83, 20.48), control2: p(18.38, 18.13))
        case .themeSystem:
            path.move(to: p(12, 3.5))
            path.addCurve(to: p(3.5, 12), control1: p(7.337, 3.5), control2: p(3.5, 7.337))
            path.addCurve(to: p(12, 20.5), control1: p(3.5, 16.66), control2: p(7.337, 20.5))
            path.addCurve(to: p(20.5, 12), control1: p(16.66, 20.5), control2: p(20.5, 16.66))
            path.addCurve(to: p(12, 3.5), control1: p(20.5, 7.337), control2: p(16.66, 3.5))
            path.move(to: p(12, 3.5))
            path.addLine(to: p(12, 20.5))
            path.move(to: p(12, 6.5))
            path.addLine(to: p(17, 6.5))
            path.move(to: p(12, 10))
            path.addLine(to: p(19, 10))
            path.move(to: p(12, 14))
            path.addLine(to: p(19, 14))
            path.move(to: p(12, 17.5))
            path.addLine(to: p(17, 17.5))
        case .arrow:
            path.move(to: p(5, 12))
            path.addLine(to: p(19, 12))
            path.move(to: p(13, 6))
            path.addLine(to: p(19, 12))
            path.addLine(to: p(13, 18))
        case .plus:
            path.move(to: p(12, 5))
            path.addLine(to: p(12, 19))
            path.move(to: p(5, 12))
            path.addLine(to: p(19, 12))
        case .chevron:
            path.move(to: p(9, 6))
            path.addLine(to: p(15, 12))
            path.addLine(to: p(9, 18))
        case .calendar:
            path.move(to: p(4, 6.5))
            path.addCurve(to: p(5.5, 5), control1: p(4, 5.677), control2: p(4.677, 5))
            path.addLine(to: p(18.5, 5))
            path.addCurve(to: p(20, 6.5), control1: p(19.32, 5), control2: p(20, 5.677))
            path.addLine(to: p(20, 18.5))
            path.addCurve(to: p(18.5, 20), control1: p(20, 19.32), control2: p(19.32, 20))
            path.addLine(to: p(5.5, 20))
            path.addCurve(to: p(4, 18.5), control1: p(4.677, 20), control2: p(4, 19.32))
            path.addLine(to: p(4, 6.5))
            path.move(to: p(4, 10))
            path.addLine(to: p(20, 10))
            path.move(to: p(8, 3))
            path.addLine(to: p(8, 7))
            path.move(to: p(16, 3))
            path.addLine(to: p(16, 7))
        case .print:
            path.move(to: p(7, 9))
            path.addLine(to: p(7, 4))
            path.addLine(to: p(17, 4))
            path.addLine(to: p(17, 9))
            path.move(to: p(7, 17))
            path.addLine(to: p(5, 17))
            path.addCurve(to: p(4, 16), control1: p(4.451, 17), control2: p(4, 16.55))
            path.addLine(to: p(4, 11))
            path.addCurve(to: p(6, 9), control1: p(4, 9.903), control2: p(4.903, 9))
            path.addLine(to: p(18, 9))
            path.addCurve(to: p(20, 11), control1: p(19.1, 9), control2: p(20, 9.903))
            path.addLine(to: p(20, 16))
            path.addCurve(to: p(19, 17), control1: p(20, 16.55), control2: p(19.55, 17))
            path.addLine(to: p(17, 17))
            path.move(to: p(7, 14))
            path.addLine(to: p(17, 14))
            path.addLine(to: p(17, 20))
            path.addLine(to: p(7, 20))
            path.addLine(to: p(7, 14))
        case .edit:
            path.move(to: p(4, 20))
            path.addLine(to: p(8, 20))
            path.addLine(to: p(19, 9))
            path.addLine(to: p(15, 5))
            path.addLine(to: p(4, 16))
            path.addLine(to: p(4, 20))
            path.move(to: p(14, 6))
            path.addLine(to: p(18, 10))
        }
        return path
    }
}

/// Icon als Linie wie in der Web-App (Strichstärke 1,8, runde Enden).
struct IconView: View {
    let icon: AppIcon
    var size: CGFloat = 24
    var lineWidth: CGFloat = 1.8

    var body: some View {
        IconShape(icon: icon)
            .stroke(style: StrokeStyle(lineWidth: lineWidth * size / 24, lineCap: .round, lineJoin: .round))
            .frame(width: size, height: size)
            .accessibilityHidden(true)
    }
}

struct IconShape: Shape {
    let icon: AppIcon
    func path(in rect: CGRect) -> Path { icon.path(in: rect) }
}
