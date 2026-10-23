// Texte der Oberfläche, wie src/i18n/index.ts. Die App liest dieselbe Datei de.json wie die Web-App,
// damit Formulierungen an einer Stelle gepflegt werden.

import Foundation

public final class Strings: @unchecked Sendable {
    private let dict: [String: Any]

    /// `overrides`: Texte, die nur in der iPhone-App anders lauten (z. B. Datenschutz ohne Browser).
    public init(json data: Data, overrides: Data? = nil) throws {
        var base = (try JSONSerialization.jsonObject(with: data) as? [String: Any]) ?? [:]
        if let overrides, let extra = try JSONSerialization.jsonObject(with: overrides) as? [String: Any] {
            base = Self.merge(base, extra)
        }
        dict = base
    }

    private static func merge(_ a: [String: Any], _ b: [String: Any]) -> [String: Any] {
        var out = a
        for (k, v) in b {
            if let sub = v as? [String: Any], let existing = out[k] as? [String: Any] { out[k] = merge(existing, sub) } else { out[k] = v }
        }
        return out
    }

    public convenience init(contentsOf url: URL) throws {
        try self.init(json: Data(contentsOf: url))
    }

    private func lookup(_ key: String) -> String? {
        var node: Any? = dict
        for part in key.split(separator: ".") {
            guard let d = node as? [String: Any] else { return nil }
            node = d[String(part)]
        }
        return node as? String
    }

    /// t("today.title"), t("common.minutes", ["n": 5]). Unbekannte Schlüssel kommen unverändert zurück.
    public func t(_ key: String, _ params: [String: Any] = [:]) -> String {
        let raw = lookup(key) ?? key
        guard raw.contains("{") else { return raw }
        var out = ""
        var rest = Substring(raw)
        while let open = rest.firstIndex(of: "{") {
            out += rest[..<open]
            guard let close = rest[open...].firstIndex(of: "}") else { break }
            let name = String(rest[rest.index(after: open)..<close])
            if let value = params[name] { out += formatParam(value) } else { out += "{\(name)}" }
            rest = rest[rest.index(after: close)...]
        }
        return out + rest
    }

    /// Einzahl/Mehrzahl: Schlüssel `key.one` / `key.other`.
    public func tn(_ key: String, _ n: Int, _ params: [String: Any] = [:]) -> String {
        var p = params
        p["n"] = n
        return t("\(key).\(n == 1 ? "one" : "other")", p)
    }
}

/// Zahlen wie JavaScript `String(n)`: 6 → "6", 1.5 → "1.5".
public func jsNumber(_ x: Double) -> String {
    if x == x.rounded(), abs(x) < 1e15 { return String(Int(x)) }
    return String(x)
}

private func formatParam(_ value: Any) -> String {
    switch value {
    case let d as Double: return jsNumber(d)
    case let i as Int: return String(i)
    default: return "\(value)"
    }
}
