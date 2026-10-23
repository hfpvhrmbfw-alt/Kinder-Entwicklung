// Kalenderdatei (.ics, RFC 5545), wie src/core/ics.ts. In der iPhone-App gibt es zusätzlich
// lokale Erinnerungen; die Kalenderdatei bleibt für alle, die lieber ihren Kalender nutzen.

import Foundation

public struct IcsEvent: Sendable {
    public var uid: String
    public var title: String
    public var description: String?
    /// Erster Tag (inklusiv).
    public var start: DateString
    /// Letzter Tag (inklusiv).
    public var end: DateString
    /// Erinnerung so viele Tage vor Beginn.
    public var alarmDaysBefore: Int?

    public init(uid: String, title: String, description: String? = nil, start: DateString, end: DateString, alarmDaysBefore: Int? = nil) {
        self.uid = uid
        self.title = title
        self.description = description
        self.start = start
        self.end = end
        self.alarmDaysBefore = alarmDaysBefore
    }
}

public func escapeIcsText(_ text: String) -> String {
    text.replacingOccurrences(of: "\\", with: "\\\\")
        .replacingOccurrences(of: ";", with: "\\;")
        .replacingOccurrences(of: ",", with: "\\,")
        .replacingOccurrences(of: "\r\n", with: "\\n")
        .replacingOccurrences(of: "\n", with: "\\n")
}

/// Zeilen auf 75 Oktette falten (Folgezeilen beginnen mit einem Leerzeichen).
public func foldIcsLine(_ line: String) -> String {
    if line.utf8.count <= 75 { return line }
    var parts: [String] = []
    var current = ""
    var size = 0
    for scalar in line.unicodeScalars {
        let len = String(scalar).utf8.count
        let limit = parts.isEmpty ? 75 : 74
        if size + len > limit {
            parts.append(current)
            current = ""
            size = 0
        }
        current.unicodeScalars.append(scalar)
        size += len
    }
    parts.append(current)
    return parts.joined(separator: "\r\n ")
}

private func stamp(_ now: Date) -> String {
    let f = DateFormatter()
    f.locale = Locale(identifier: "en_US_POSIX")
    f.timeZone = TimeZone(identifier: "UTC")
    f.dateFormat = "yyyyMMdd'T'HHmmss'Z'"
    return f.string(from: now)
}

public func buildIcs(_ events: [IcsEvent], now: Date = Date()) throws -> String {
    var lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Kleine Schritte//DE", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"]
    let ymd: (String) -> String = { $0.replacingOccurrences(of: "-", with: "") }
    for e in events {
        _ = try Dates.parse(e.start)
        _ = try Dates.parse(e.end)
        lines += [
            "BEGIN:VEVENT",
            "UID:\(e.uid)",
            "DTSTAMP:\(stamp(now))",
            "DTSTART;VALUE=DATE:\(ymd(e.start))",
            // DTEND ist bei ganztägigen Terminen exklusiv
            "DTEND;VALUE=DATE:\(ymd(try Dates.addDays(e.end, 1)))",
            "SUMMARY:\(escapeIcsText(e.title))",
            "TRANSP:TRANSPARENT",
        ]
        if let d = e.description { lines.append("DESCRIPTION:\(escapeIcsText(d))") }
        if let days = e.alarmDaysBefore {
            lines += ["BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:\(escapeIcsText(e.title))", "TRIGGER:-P\(days)D", "END:VALARM"]
        }
        lines.append("END:VEVENT")
    }
    lines.append("END:VCALENDAR")
    return lines.map(foldIcsLine).joined(separator: "\r\n") + "\r\n"
}
