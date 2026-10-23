// Content-Modelle (Fachinhalte aus /content). Entspricht src/core/models/content.ts.
//
// Konventionen wie in der Web-App:
// - optionale Felder fehlen im JSON (statt null) → Optional
// - leere Listen dürfen in den Dateien fehlen (Pages CMS lässt sie weg) → beim Decodieren []

import Foundation

/// Text in mehreren Sprachen; `de` ist Pflicht und Rückfallsprache.
public struct LocalizedText: Codable, Hashable, Sendable {
    public var de: String
    public var en: String?

    public init(de: String, en: String? = nil) {
        self.de = de
        self.en = en
    }

    /// Text in der gewünschten Sprache, sonst Deutsch.
    public func localized(_ locale: String = "de") -> String {
        locale == "en" ? (en ?? de) : de
    }
}

public enum DomainId: String, Codable, CaseIterable, Sendable {
    case grossMotor, fineMotor, language, cognition, socialEmotional, selfCare
}

public enum CategoryId: String, Codable, CaseIterable, Sendable {
    case play, craft, movement, outing, languageReading, senses, everyday
}

public enum Location: String, Codable, CaseIterable, Sendable {
    case indoor, outdoor, both
}

public enum PrepEffort: String, Codable, CaseIterable, Sendable {
    case none, low, medium, high
}

public enum SocialSetting: String, Codable, CaseIterable, Sendable {
    case oneOnOne, siblings, group
}

public enum SafetyKind: String, Codable, CaseIterable, Sendable {
    case supervision, choking, water, heat, sharp, allergy, cord, outdoor, other
}

public enum ReviewStatus: String, Codable, Sendable {
    case draft, needsCheck, reviewed
}

/// Fachlicher Prüfstatus eines Eintrags.
public struct Review: Codable, Hashable, Sendable {
    public var status: ReviewStatus
    public var note: String?
    public var reviewedBy: String?
    public var reviewedOn: String?

    public init(status: ReviewStatus, note: String? = nil, reviewedBy: String? = nil, reviewedOn: String? = nil) {
        self.status = status
        self.note = note
        self.reviewedBy = reviewedBy
        self.reviewedOn = reviewedOn
    }
}

/// Monatsbereich; Untergrenze inklusiv, Obergrenze exklusiv.
public struct MonthRange: Codable, Hashable, Sendable {
    public var minMonths: Double
    public var maxMonths: Double

    public init(minMonths: Double, maxMonths: Double) {
        self.minMonths = minMonths
        self.maxMonths = maxMonths
    }
}

public struct AgeBand: Codable, Hashable, Identifiable, Sendable {
    public var id: String
    public var minMonths: Double
    public var maxMonths: Double
    public var label: LocalizedText

    public var range: MonthRange { MonthRange(minMonths: minMonths, maxMonths: maxMonths) }
}

public struct Domain: Codable, Hashable, Identifiable, Sendable {
    public var id: DomainId
    public var name: LocalizedText
    public var description: LocalizedText
}

public struct Category: Codable, Hashable, Identifiable, Sendable {
    public var id: CategoryId
    public var name: LocalizedText
}

public enum ReferenceKind: String, Codable, Sendable {
    case guideline, study, book, theory, website, official
}

/// Eintrag im Quellen- und Prinzipienkatalog.
public struct Reference: Codable, Hashable, Identifiable, Sendable {
    public var id: String
    public var kind: ReferenceKind
    public var title: String
    public var authors: [String]?
    public var year: Int?
    public var publishedIn: String?
    public var url: String?
    public var summary: LocalizedText
    /// false = bibliografische Details sind noch gegenzuprüfen.
    public var citationVerified: Bool
}

public struct ReferenceLink: Codable, Hashable, Sendable {
    public var referenceId: String
    public var note: LocalizedText?

    public init(referenceId: String, note: LocalizedText? = nil) {
        self.referenceId = referenceId
        self.note = note
    }
}

public enum MaterialGroup: String, Codable, Sendable {
    case household, craft, nature, toy, book, kitchen
}

public struct Material: Codable, Hashable, Identifiable, Sendable {
    public var id: String
    public var name: LocalizedText
    public var group: MaterialGroup
    /// Kleinteile: Verschluckungs-Prüfung bei Aktivitäten unter 36 Monaten.
    public var smallParts: Bool
    public var commonAtHome: Bool
}

public struct MilestoneWindow: Codable, Hashable, Sendable {
    public var fromMonths: Double
    public var toMonths: Double

    public init(fromMonths: Double, toMonths: Double) {
        self.fromMonths = fromMonths
        self.toMonths = toMonths
    }
}

public struct Milestone: Codable, Hashable, Identifiable, Sendable {
    public var id: String
    public var domain: DomainId
    public var title: LocalizedText
    public var description: LocalizedText
    /// Ab `fromMonths` zeigen es erste Kinder, bis `toMonths` die meisten.
    public var window: MilestoneWindow
    /// Ab diesem Alter ruhiger Hinweis, es beim nächsten Arzttermin anzusprechen.
    public var consultHintFromMonths: Double?
    public var supportTips: [LocalizedText]
    public var rationale: LocalizedText
    public var references: [ReferenceLink]
    public var relatedActivityIds: [String]?
    public var background: LocalizedText?
    public var observe: [LocalizedText]?
    public var variety: LocalizedText?
    public var review: Review

    public init(
        id: String, domain: DomainId, title: LocalizedText, description: LocalizedText = LocalizedText(de: ""),
        window: MilestoneWindow, consultHintFromMonths: Double? = nil, supportTips: [LocalizedText] = [],
        rationale: LocalizedText = LocalizedText(de: ""), references: [ReferenceLink] = [],
        relatedActivityIds: [String]? = nil, background: LocalizedText? = nil, observe: [LocalizedText]? = nil,
        variety: LocalizedText? = nil, review: Review = Review(status: .draft)
    ) {
        self.id = id
        self.domain = domain
        self.title = title
        self.description = description
        self.window = window
        self.consultHintFromMonths = consultHintFromMonths
        self.supportTips = supportTips
        self.rationale = rationale
        self.references = references
        self.relatedActivityIds = relatedActivityIds
        self.background = background
        self.observe = observe
        self.variety = variety
        self.review = review
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        domain = try c.decode(DomainId.self, forKey: .domain)
        title = try c.decode(LocalizedText.self, forKey: .title)
        description = try c.decode(LocalizedText.self, forKey: .description)
        window = try c.decode(MilestoneWindow.self, forKey: .window)
        consultHintFromMonths = try c.decodeIfPresent(Double.self, forKey: .consultHintFromMonths)
        supportTips = try c.decodeIfPresent([LocalizedText].self, forKey: .supportTips) ?? []
        rationale = try c.decode(LocalizedText.self, forKey: .rationale)
        references = try c.decodeIfPresent([ReferenceLink].self, forKey: .references) ?? []
        relatedActivityIds = try c.decodeIfPresent([String].self, forKey: .relatedActivityIds)
        background = try c.decodeIfPresent(LocalizedText.self, forKey: .background)
        observe = try c.decodeIfPresent([LocalizedText].self, forKey: .observe)
        variety = try c.decodeIfPresent(LocalizedText.self, forKey: .variety)
        review = try c.decode(Review.self, forKey: .review)
    }
}

public struct ActivityMaterial: Codable, Hashable, Sendable {
    public var materialId: String
    public var optional: Bool
    public var amount: LocalizedText?

    public init(materialId: String, optional: Bool = false, amount: LocalizedText? = nil) {
        self.materialId = materialId
        self.optional = optional
        self.amount = amount
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        materialId = try c.decode(String.self, forKey: .materialId)
        optional = try c.decodeIfPresent(Bool.self, forKey: .optional) ?? false
        amount = try c.decodeIfPresent(LocalizedText.self, forKey: .amount)
    }
}

public struct SafetyNote: Codable, Hashable, Sendable {
    public var kind: SafetyKind
    public var text: LocalizedText

    public init(kind: SafetyKind, text: LocalizedText) {
        self.kind = kind
        self.text = text
    }
}

public enum ActivityOrigin: String, Codable, Sendable {
    case builtin, custom
}

public struct ActivityDomains: Codable, Hashable, Sendable {
    public var primary: DomainId
    public var secondary: [DomainId]

    public init(primary: DomainId, secondary: [DomainId] = []) {
        self.primary = primary
        self.secondary = secondary
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        primary = try c.decode(DomainId.self, forKey: .primary)
        secondary = try c.decodeIfPresent([DomainId].self, forKey: .secondary) ?? []
    }
}

public struct DurationRange: Codable, Hashable, Sendable {
    public var min: Int
    public var max: Int

    public init(min: Int, max: Int) {
        self.min = min
        self.max = max
    }
}

public struct Variations: Codable, Hashable, Sendable {
    public var easier: [LocalizedText]
    public var harder: [LocalizedText]

    public init(easier: [LocalizedText] = [], harder: [LocalizedText] = []) {
        self.easier = easier
        self.harder = harder
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        easier = try c.decodeIfPresent([LocalizedText].self, forKey: .easier) ?? []
        harder = try c.decodeIfPresent([LocalizedText].self, forKey: .harder) ?? []
    }
}

public struct Activity: Codable, Hashable, Identifiable, Sendable {
    public var id: String
    public var origin: ActivityOrigin
    public var title: LocalizedText
    public var summary: LocalizedText
    public var ageRange: MonthRange
    public var domains: ActivityDomains
    public var category: CategoryId
    public var durationMinutes: DurationRange
    public var location: Location
    public var prepEffort: PrepEffort
    public var socialSettings: [SocialSetting]
    public var materials: [ActivityMaterial]
    public var steps: [LocalizedText]
    public var variations: Variations
    public var guidanceTips: [LocalizedText]
    public var learningOutcomes: [LocalizedText]
    public var rationale: LocalizedText
    public var safety: [SafetyNote]
    public var references: [ReferenceLink]
    public var relatedMilestoneIds: [String]
    public var tags: [String]?
    public var background: LocalizedText?
    public var observe: [LocalizedText]?
    public var everyday: [LocalizedText]?
    /// Nur bei eigenen Ideen: Material als Freitext.
    public var materialsText: [LocalizedText]?
    public var review: Review

    public init(
        id: String, origin: ActivityOrigin = .builtin, title: LocalizedText, summary: LocalizedText = LocalizedText(de: ""),
        ageRange: MonthRange, domains: ActivityDomains, category: CategoryId = .play,
        durationMinutes: DurationRange = DurationRange(min: 5, max: 15), location: Location = .indoor,
        prepEffort: PrepEffort = .none, socialSettings: [SocialSetting] = [.oneOnOne], materials: [ActivityMaterial] = [],
        steps: [LocalizedText] = [], variations: Variations = Variations(), guidanceTips: [LocalizedText] = [],
        learningOutcomes: [LocalizedText] = [], rationale: LocalizedText = LocalizedText(de: ""), safety: [SafetyNote] = [],
        references: [ReferenceLink] = [], relatedMilestoneIds: [String] = [], tags: [String]? = nil,
        background: LocalizedText? = nil, observe: [LocalizedText]? = nil, everyday: [LocalizedText]? = nil,
        materialsText: [LocalizedText]? = nil, review: Review = Review(status: .draft)
    ) {
        self.id = id
        self.origin = origin
        self.title = title
        self.summary = summary
        self.ageRange = ageRange
        self.domains = domains
        self.category = category
        self.durationMinutes = durationMinutes
        self.location = location
        self.prepEffort = prepEffort
        self.socialSettings = socialSettings
        self.materials = materials
        self.steps = steps
        self.variations = variations
        self.guidanceTips = guidanceTips
        self.learningOutcomes = learningOutcomes
        self.rationale = rationale
        self.safety = safety
        self.references = references
        self.relatedMilestoneIds = relatedMilestoneIds
        self.tags = tags
        self.background = background
        self.observe = observe
        self.everyday = everyday
        self.materialsText = materialsText
        self.review = review
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        origin = try c.decodeIfPresent(ActivityOrigin.self, forKey: .origin) ?? .builtin
        title = try c.decode(LocalizedText.self, forKey: .title)
        summary = try c.decode(LocalizedText.self, forKey: .summary)
        ageRange = try c.decode(MonthRange.self, forKey: .ageRange)
        domains = try c.decode(ActivityDomains.self, forKey: .domains)
        category = try c.decode(CategoryId.self, forKey: .category)
        durationMinutes = try c.decode(DurationRange.self, forKey: .durationMinutes)
        location = try c.decode(Location.self, forKey: .location)
        prepEffort = try c.decode(PrepEffort.self, forKey: .prepEffort)
        socialSettings = try c.decodeIfPresent([SocialSetting].self, forKey: .socialSettings) ?? []
        materials = try c.decodeIfPresent([ActivityMaterial].self, forKey: .materials) ?? []
        steps = try c.decodeIfPresent([LocalizedText].self, forKey: .steps) ?? []
        variations = try c.decodeIfPresent(Variations.self, forKey: .variations) ?? Variations()
        guidanceTips = try c.decodeIfPresent([LocalizedText].self, forKey: .guidanceTips) ?? []
        learningOutcomes = try c.decodeIfPresent([LocalizedText].self, forKey: .learningOutcomes) ?? []
        rationale = try c.decodeIfPresent(LocalizedText.self, forKey: .rationale) ?? LocalizedText(de: "")
        safety = try c.decodeIfPresent([SafetyNote].self, forKey: .safety) ?? []
        references = try c.decodeIfPresent([ReferenceLink].self, forKey: .references) ?? []
        relatedMilestoneIds = try c.decodeIfPresent([String].self, forKey: .relatedMilestoneIds) ?? []
        tags = try c.decodeIfPresent([String].self, forKey: .tags)
        background = try c.decodeIfPresent(LocalizedText.self, forKey: .background)
        observe = try c.decodeIfPresent([LocalizedText].self, forKey: .observe)
        everyday = try c.decodeIfPresent([LocalizedText].self, forKey: .everyday)
        materialsText = try c.decodeIfPresent([LocalizedText].self, forKey: .materialsText)
        review = try c.decodeIfPresent(Review.self, forKey: .review) ?? Review(status: .draft)
    }

    public var allDomains: [DomainId] { [domains.primary] + domains.secondary }
    public var isCustom: Bool { origin == .custom }
}

public enum CheckupUnit: String, Codable, Sendable {
    case day, week, month
}

public struct CheckupRange: Codable, Hashable, Sendable {
    public var unit: CheckupUnit
    public var from: Int
    public var to: Int
}

/// Früherkennungsuntersuchung (U1–U9). Zeitraum ab Geburt: `from` inklusiv, `to` exklusiv.
public struct Checkup: Codable, Hashable, Identifiable, Sendable {
    public var id: String
    public var name: String
    public var window: CheckupRange
    public var period: LocalizedText
    public var focus: LocalizedText
    public var prepare: [LocalizedText]
    public var references: [ReferenceLink]
    public var review: Review

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        name = try c.decode(String.self, forKey: .name)
        window = try c.decode(CheckupRange.self, forKey: .window)
        period = try c.decode(LocalizedText.self, forKey: .period)
        focus = try c.decode(LocalizedText.self, forKey: .focus)
        prepare = try c.decodeIfPresent([LocalizedText].self, forKey: .prepare) ?? []
        references = try c.decodeIfPresent([ReferenceLink].self, forKey: .references) ?? []
        review = try c.decode(Review.self, forKey: .review)
    }
}

/// Gesamter geladener Content.
public struct ContentBundle: Sendable {
    public var ageBands: [AgeBand]
    public var domains: [Domain]
    public var categories: [Category]
    public var materials: [Material]
    public var references: [Reference]
    public var milestones: [Milestone]
    public var activities: [Activity]
    public var checkups: [Checkup]

    public init(
        ageBands: [AgeBand] = [], domains: [Domain] = [], categories: [Category] = [], materials: [Material] = [],
        references: [Reference] = [], milestones: [Milestone] = [], activities: [Activity] = [], checkups: [Checkup] = []
    ) {
        self.ageBands = ageBands
        self.domains = domains
        self.categories = categories
        self.materials = materials
        self.references = references
        self.milestones = milestones
        self.activities = activities
        self.checkups = checkups
    }
}
