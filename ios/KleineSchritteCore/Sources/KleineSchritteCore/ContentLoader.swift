// Lädt den Content aus dem Ordner `content` (in der App als Ressource eingebunden), wie src/content/loader.ts.
// Ideen und Meilensteine liegen je Eintrag in einer Datei; die Reihenfolge ist die der Dateinamen.

import Foundation

public enum ContentLoader {
    public static func load(from directory: URL) throws -> ContentBundle {
        let decoder = JSONDecoder()
        func one<T: Decodable>(_ name: String, as: T.Type) throws -> T {
            try decoder.decode(T.self, from: Data(contentsOf: directory.appendingPathComponent(name)))
        }
        func each<T: Decodable>(_ folder: String, as: T.Type) throws -> [T] {
            let dir = directory.appendingPathComponent(folder)
            let files = try FileManager.default.contentsOfDirectory(atPath: dir.path)
                .filter { $0.hasSuffix(".json") }
                .sorted()
            return try files.map { file in
                do {
                    return try decoder.decode(T.self, from: Data(contentsOf: dir.appendingPathComponent(file)))
                } catch {
                    throw ContentLoadError(file: "\(folder)/\(file)", underlying: error)
                }
            }
        }
        return ContentBundle(
            ageBands: try one("age-bands.json", as: [AgeBand].self),
            domains: try one("domains.json", as: [Domain].self),
            categories: try one("categories.json", as: [Category].self),
            materials: try one("materials.json", as: [Material].self),
            references: try one("references.json", as: [Reference].self),
            milestones: try each("milestones", as: Milestone.self),
            activities: try each("activities", as: Activity.self),
            checkups: try one("checkups.json", as: [Checkup].self)
        )
    }
}

public struct ContentLoadError: Error, CustomStringConvertible {
    public var file: String
    public var underlying: Error
    public var description: String { "\(file): \(underlying)" }
}
