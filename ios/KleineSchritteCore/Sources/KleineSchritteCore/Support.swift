// Kleine Hilfen, damit Swift genauso rechnet wie JavaScript.

import Foundation

extension Array {
    /// Stabile Sortierung wie `Array.prototype.sort` in JavaScript: Gleiche Elemente behalten ihre Reihenfolge.
    public func stableSorted(by areInIncreasingOrder: (Element, Element) -> Bool) -> [Element] {
        enumerated()
            .sorted { a, b in
                if areInIncreasingOrder(a.element, b.element) { return true }
                if areInIncreasingOrder(b.element, a.element) { return false }
                return a.offset < b.offset
            }
            .map(\.element)
    }
}

/// Text in der gewünschten Sprache, sonst Deutsch; leer bei fehlendem Text.
public func localize(_ text: LocalizedText?, _ locale: String = "de") -> String {
    text?.localized(locale) ?? ""
}

/// Normalisiert für die Volltextsuche: Kleinbuchstaben, ohne Akzente, ß → ss.
public func normalizeForSearch(_ value: String) -> String {
    let lowered = value.lowercased().replacingOccurrences(of: "ß", with: "ss")
    let scalars = lowered.decomposedStringWithCanonicalMapping.unicodeScalars.filter { !(0x300...0x36F).contains($0.value) }
    return String(String.UnicodeScalarView(scalars))
}

/// FNV-1a-Hash eines Strings auf 32 Bit (über UTF-16-Einheiten wie `charCodeAt`).
public func hashString(_ value: String) -> UInt32 {
    var h: UInt32 = 0x811C_9DC5
    for unit in value.utf16 {
        h ^= UInt32(unit)
        h = h &* 0x0100_0193
    }
    return h
}

/// Mulberry32: deterministischer Zufall, gleicher Startwert → gleiche Folge wie in der Web-App.
public struct SeededRandom: Sendable {
    private var a: UInt32

    public init(seed: String) {
        a = hashString(seed)
    }

    /// Zahl in [0, 1).
    public mutating func next() -> Double {
        a = a &+ 0x6D2B_79F5
        var t = a
        t = (t ^ (t >> 15)) &* (t | 1)
        t ^= t &+ ((t ^ (t >> 7)) &* (t | 61))
        return Double(t ^ (t >> 14)) / 4_294_967_296
    }
}

/// Zeitpunkt als ISO-8601 mit Millisekunden in UTC, wie `Date.toISOString()`.
public func isoTimestamp(_ date: Date = Date()) -> Timestamp {
    let f = ISO8601DateFormatter()
    f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    f.timeZone = TimeZone(identifier: "UTC")
    return f.string(from: date)
}

/// ISO-8601-Zeitpunkt lesen (mit oder ohne Millisekunden).
public func parseTimestamp(_ value: String) -> Date? {
    let f = ISO8601DateFormatter()
    f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    if let d = f.date(from: value) { return d }
    f.formatOptions = [.withInternetDateTime]
    return f.date(from: value)
}
