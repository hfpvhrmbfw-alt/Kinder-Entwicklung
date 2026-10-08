/**
 * Content-Modelle (Fachinhalte aus /content).
 *
 * Swift-Konvention: Jeder Typ hier ist 1:1 als `struct …: Codable` abbildbar.
 * - String-Unions → `enum …: String, Codable`
 * - optionale Felder (`?`) → `Optional`, im JSON fehlt das Feld statt `null`
 * - LocalizedText → `[String: String]`
 * Die JSON-Schemas in /content/schema beschreiben dieselben Strukturen.
 */

/** Text in mehreren Sprachen; `de` ist Pflicht und Rückfallsprache. */
export interface LocalizedText {
  de: string;
  en?: string;
}

export const DOMAIN_IDS = [
  'grossMotor',
  'fineMotor',
  'language',
  'cognition',
  'socialEmotional',
  'selfCare',
] as const;
export type DomainId = (typeof DOMAIN_IDS)[number];

export const CATEGORY_IDS = [
  'play',
  'craft',
  'movement',
  'outing',
  'languageReading',
  'senses',
  'everyday',
] as const;
export type CategoryId = (typeof CATEGORY_IDS)[number];

export const LOCATIONS = ['indoor', 'outdoor', 'both'] as const;
export type Location = (typeof LOCATIONS)[number];

export const PREP_EFFORTS = ['none', 'low', 'medium', 'high'] as const;
export type PrepEffort = (typeof PREP_EFFORTS)[number];

export const SOCIAL_SETTINGS = ['oneOnOne', 'siblings', 'group'] as const;
export type SocialSetting = (typeof SOCIAL_SETTINGS)[number];

export const SAFETY_KINDS = [
  'supervision',
  'choking',
  'water',
  'heat',
  'sharp',
  'allergy',
  'cord',
  'outdoor',
  'other',
] as const;
export type SafetyKind = (typeof SAFETY_KINDS)[number];

export type ReviewStatus = 'draft' | 'needsCheck' | 'reviewed';

/** Fachlicher Prüfstatus eines Eintrags. */
export interface Review {
  status: ReviewStatus;
  /** Was genau noch zu prüfen ist. */
  note?: string;
  reviewedBy?: string;
  /** "YYYY-MM-DD" */
  reviewedOn?: string;
}

/** Monatsbereich; Untergrenze inklusiv, Obergrenze exklusiv. */
export interface MonthRange {
  minMonths: number;
  maxMonths: number;
}

export interface AgeBand extends MonthRange {
  id: string;
  label: LocalizedText;
}

export interface Domain {
  id: DomainId;
  name: LocalizedText;
  description: LocalizedText;
}

export interface Category {
  id: CategoryId;
  name: LocalizedText;
}

export type ReferenceKind = 'guideline' | 'study' | 'book' | 'theory' | 'website' | 'official';

/** Eintrag im Quellen- und Prinzipienkatalog. */
export interface Reference {
  id: string;
  kind: ReferenceKind;
  title: string;
  authors?: string[];
  year?: number;
  publishedIn?: string;
  url?: string;
  summary: LocalizedText;
  /** false = bibliografische Details sind noch gegenzuprüfen. */
  citationVerified: boolean;
}

export interface ReferenceLink {
  referenceId: string;
  note?: LocalizedText;
}

export type MaterialGroup = 'household' | 'craft' | 'nature' | 'toy' | 'book' | 'kitchen';

export interface Material {
  id: string;
  name: LocalizedText;
  group: MaterialGroup;
  /** Kleinteile: löst bei Aktivitäten unter 36 Monaten eine Verschluckungs-Prüfung aus. */
  smallParts: boolean;
  /** In vielen Haushalten vorhanden; Vorauswahl im Materialcheck. */
  commonAtHome: boolean;
}

export interface Milestone {
  id: string;
  domain: DomainId;
  title: LocalizedText;
  description: LocalizedText;
  /** Zeitfenster: ab `fromMonths` zeigen es erste Kinder, bis `toMonths` die meisten. */
  window: { fromMonths: number; toMonths: number };
  /** Ab diesem Alter: ruhiger Hinweis, es beim nächsten Arzttermin anzusprechen. Nur wenn quellengestützt. */
  consultHintFromMonths?: number;
  supportTips: LocalizedText[];
  rationale: LocalizedText;
  references: ReferenceLink[];
  relatedActivityIds?: string[];
  review: Review;
}

export interface ActivityMaterial {
  materialId: string;
  optional: boolean;
  amount?: LocalizedText;
}

export interface SafetyNote {
  kind: SafetyKind;
  text: LocalizedText;
}

export type ActivityOrigin = 'builtin' | 'custom';

export interface Activity {
  id: string;
  origin: ActivityOrigin;
  title: LocalizedText;
  summary: LocalizedText;
  ageRange: MonthRange;
  domains: { primary: DomainId; secondary: DomainId[] };
  category: CategoryId;
  durationMinutes: { min: number; max: number };
  location: Location;
  prepEffort: PrepEffort;
  socialSettings: SocialSetting[];
  materials: ActivityMaterial[];
  steps: LocalizedText[];
  variations: { easier: LocalizedText[]; harder: LocalizedText[] };
  guidanceTips: LocalizedText[];
  learningOutcomes: LocalizedText[];
  rationale: LocalizedText;
  safety: SafetyNote[];
  references: ReferenceLink[];
  relatedMilestoneIds: string[];
  tags?: string[];
  review: Review;
}

/** Gesamter geladener Content. */
export interface ContentBundle {
  ageBands: AgeBand[];
  domains: Domain[];
  categories: Category[];
  materials: Material[];
  references: Reference[];
  milestones: Milestone[];
  activities: Activity[];
}
