# Entwicklungs-App: Plan

Stand: 8. Oktober 2026 · Repo: `hfpvhrmbfw-alt/Kinder-Entwicklung` · Arbeitstitel: „Kleine Schritte“

Getroffene Entscheidungen: 10 Altersbänder, Content in Etappen mit Prüfstatus, Erinnerungen per .ics-Export, Du-Form mit Doppelnennung.

---

## 1. Tech-Stack und Begründung

| Baustein | Wahl | Warum |
|---|---|---|
| Sprache | **TypeScript** (strict) | Typen sind gleichzeitig die Vorlage für die Swift-Structs. |
| UI | **Kein Framework**, eigene Mini-Helfer (`h()` zum Erzeugen von DOM, Hash-Router, einfacher Store mit Abonnement) | Die UI wird in Phase 2 ohnehin komplett in SwiftUI neu gebaut. Was übertragbar sein soll, ist Logik und Datenmodell, und das bleibt so frei von Framework-Konzepten. Weniger Abhängigkeiten, weniger Updates, kleiner Download. |
| Build | **Vite** | Schneller Dev-Server, Base-Path für GitHub Pages per Konfiguration, Dateien mit Hash für sauberes Caching. |
| PWA | **vite-plugin-pwa** (Workbox, Modus `generateSW`) | Cache-Versionierung und Update-Verhalten selbst zu schreiben ist fehleranfällig; das Plugin ist der etablierte Weg und erzeugt Manifest und Service Worker zuverlässig. |
| Speicher | **IndexedDB** über die winzige Bibliothek **`idb`** (ca. 1 KB) | IndexedDB-Rohschnittstelle ist sehr umständlich; `idb` legt nur Promises darüber, keine eigene Logik. |
| Tests | **Vitest** (+ `fake-indexeddb` für die Speicherschicht) | Gleiche Konfiguration wie Vite, schnell. |
| Content-Validierung | **JSON Schema** (Draft 2020-12) + **Ajv** – nur im Test und in der CI, nicht in der App | Fehlerhafter Content schafft es nicht ins Deployment. Das Schema ist sprachneutral und dient später auch als Doku für die Swift-Seite. |
| Deployment | **GitHub Actions → GitHub Pages** | Bei jedem Push auf `main`: Tests, Content-Validierung, Build, Deployment. |

Bewusst **nicht** verwendet: React/Vue/Svelte (Framework-Magie, wird nicht übertragen), CSS-Frameworks (Design kommt später per Token), Analyse- oder Fehler-Tracking-Dienste, externe Schriften/CDNs, Wetter-APIs.

**Gemeinsame Testfälle für Swift:** Die Testfälle der Kernlogik (Altersberechnung, Empfehlung) liegen als JSON in `tests/fixtures/`. Dieselben Dateien kann später XCTest einlesen; so ist sichergestellt, dass beide Apps gleich rechnen.

---

## 2. Ordnerstruktur

```
Kinder-Entwicklung/
├─ .github/workflows/deploy.yml     # Test + Build + Pages-Deployment
├─ content/                          # Fachinhalte, reine Daten
│  ├─ schema/                        # JSON-Schemas (activity, milestone, …)
│  ├─ age-bands.json
│  ├─ domains.json                   # 6 Entwicklungsbereiche mit Texten
│  ├─ categories.json
│  ├─ materials.json                 # Materialkatalog (Karton, Wasser, …)
│  ├─ references.json                # Quellen- und Prinzipienkatalog
│  ├─ milestones/                    # eine Datei pro Entwicklungsbereich
│  │  ├─ gross-motor.json … self-care.json
│  └─ activities/                    # eine Datei pro Altersband
│     ├─ m00-03.json … y05-06.json
├─ src/
│  ├─ core/                          # reine Logik, KEIN DOM, KEIN IndexedDB
│  │  ├─ models/                     # TS-Typen = spätere Swift-Structs
│  │  ├─ age.ts                      # Alter, korrigiertes Alter, Altersband
│  │  ├─ filter.ts                   # Bibliotheksfilter
│  │  ├─ recommend.ts                # „Was passt heute?“, Tagesvorschlag
│  │  ├─ milestones.ts               # Status, Vorschau, Hinweislogik
│  │  ├─ backup.ts                   # Export/Import inkl. Versionsmigration
│  │  └─ ics.ts                      # Kalenderexport (später)
│  ├─ content/loader.ts              # lädt Content-JSON
│  ├─ storage/                       # IndexedDB hinter Repository-Interfaces
│  │  ├─ db.ts                       # Schema + Migrationen
│  │  └─ repositories.ts
│  ├─ i18n/                          # t()-Funktion, locales/de.json
│  ├─ ui/
│  │  ├─ lib/                        # h(), router, store
│  │  ├─ components/                 # Karten, Filterleiste, Formulare
│  │  └─ screens/                    # je Bildschirm eine Datei
│  ├─ styles/
│  │  ├─ tokens.css                  # ALLE Farben, Abstände, Schriften
│  │  └─ base.css                    # nutzt nur Tokens
│  └─ main.ts
├─ public/icons/                     # App-Icons
├─ tests/                            # Vitest + fixtures/*.json
├─ docs/                             # Plan, Content-Leitfaden, Swift-Notizen
├─ vite.config.ts
└─ package.json
```

Regel für Erweiterbarkeit: `core/` darf nichts aus `ui/` oder `storage/` importieren. Neue Funktionen bekommen eine eigene Datei in `core/`, ein Repository in `storage/` und einen Screen in `ui/screens/`.

---

## 3. Datenmodell (Nutzerdaten, lokal in IndexedDB)

Konventionen, damit Swift `Codable` es 1:1 abbildet:
- Datum ohne Uhrzeit als `"YYYY-MM-DD"`, Zeitpunkte als ISO-8601 (`"2026-10-08T10:30:00Z"`).
- IDs sind Strings (UUID für Nutzerdaten, sprechende Kebab-IDs für Content).
- Aufzählungen sind String-Enums (`"indoor"`), in Swift `enum: String, Codable`.
- Optionale Felder fehlen im JSON (statt `null`), in Swift `Optional`.
- Keine Unions ohne Diskriminator; keine Zahlen-als-Strings.

```ts
interface Child {
  id: string;
  name: string;
  birthDate: string;          // "2025-03-14"
  dueDate?: string;           // errechneter Termin, nur bei Frühgeburt
  useCorrectedAge: boolean;   // nur wirksam bis 24 Monate
  photoId?: string;
  createdAt: string; updatedAt: string;
}

interface MilestoneRecord {
  id: string; childId: string; milestoneId: string;
  achievedOn: string;         // Datum, vom Elternteil wählbar
  note?: string;
}

interface ActivityLog {          // Verlauf / Tagebuch
  id: string;
  childIds: string[];            // Geschwister gemeinsam möglich
  activityRef: ActivityRef;
  date: string;
  durationMinutes?: number;
  enjoyment?: 'low' | 'medium' | 'high';   // „Wie hat's gefallen?“
  note?: string;
  photoIds: string[];
}

interface ActivityRef { source: 'builtin' | 'custom'; id: string; }

interface Favorite   { activityRef: ActivityRef; addedAt: string; }
interface PlanEntry  { id: string; childIds: string[]; activityRef: ActivityRef; date: string; time?: string; }   // Phase 3
interface Photo      { id: string; mimeType: string; createdAt: string; /* Blob separat */ }
interface Settings   { theme: 'system'|'light'|'dark'; locale: 'de'; activeChildId?: string;
                       homeMaterials: string[]; onboardingDone: boolean; disclaimerAcceptedAt?: string; }

interface Backup {               // Export-Datei
  format: 'kleine-schritte-backup';
  schemaVersion: number;         // Import migriert ältere Versionen
  exportedAt: string; appVersion: string;
  children: Child[]; milestoneRecords: MilestoneRecord[]; activityLogs: ActivityLog[];
  favorites: Favorite[]; customActivities: Activity[]; planEntries: PlanEntry[];
  settings: Settings;
  photos: { id: string; mimeType: string; dataBase64: string; }[];
}
```

Eigene Aktivitäten nutzen **dasselbe** `Activity`-Schema wie der Basis-Content (mit `origin: "custom"` und weniger Pflichtfeldern), damit Filter und Empfehlung für beide gleich funktionieren.

---

## 4. Content-Schema (bitte abstimmen)

### 4.1 Grundbausteine

```ts
type LocalizedText = { de: string; en?: string };   // Swift: [String: String]

type DomainId = 'grossMotor' | 'fineMotor' | 'language'
              | 'cognition' | 'socialEmotional' | 'selfCare';

type CategoryId = 'play' | 'craft' | 'movement' | 'outing'
                | 'languageReading' | 'senses' | 'everyday';

interface AgeBand { id: string; minMonths: number; maxMonths: number; label: LocalizedText; }
// m00-03, m03-06, m06-09, m09-12, m12-18, m18-24, y02-03, y03-04, y04-05, y05-06
// Untergrenze inklusiv, Obergrenze exklusiv: 3 Monate gehört zu m03-06.

interface Review {
  status: 'draft' | 'needsCheck' | 'reviewed';
  note?: string;            // was genau zu prüfen ist
  reviewedBy?: string;      // z. B. Initialen oder Rolle
  reviewedOn?: string;
}

interface ReferenceLink {
  referenceId: string;      // verweist auf references.json
  note?: LocalizedText;     // z. B. „Zeitfenster aus Tabelle 2“
}
```

### 4.2 Quellen- und Prinzipienkatalog (`references.json`)

```ts
interface Reference {
  id: string;                                   // "cdc-milestones-2022"
  kind: 'guideline' | 'study' | 'book' | 'theory' | 'website' | 'official';
  title: string;
  authors?: string[];
  year?: number;
  publishedIn?: string;                         // Zeitschrift, Verlag
  url?: string;
  summary: LocalizedText;                       // ein Satz: was steckt drin
  citationVerified: boolean;                    // false = bibliografische Details zu prüfen
}
```

Ein Katalog statt freier Quellentexte pro Eintrag hat zwei Vorteile: Jede Quelle wird genau einmal geprüft, und die Quellen-Seite der App entsteht automatisch aus dem Katalog.

Startkatalog (alles reale Werke; bibliografische Details setze ich vorsichtshalber auf `citationVerified: false`, bis sie einmal gegengeprüft sind):
- WHO Multicentre Growth Reference Study Group (2006): *WHO Motor Development Study: Windows of achievement for six gross motor development milestones*, Acta Paediatrica.
- Zubler et al. (2022): *Evidence-Informed Milestones for Developmental Surveillance Tools*, Pediatrics (Grundlage der CDC-Checklisten „Learn the Signs. Act Early.“), plus CDC-Website.
- Michaelis et al.: *Grenzsteine der Entwicklung* (validierte Fassung 2013, Monatsschrift Kinderheilkunde) – nur als Prinzip, keine Listen übernommen.
- WHO (2019): *Guidelines on physical activity, sedentary behaviour and sleep for children under 5 years of age*.
- Bowlby (1969): *Attachment and Loss, Vol. 1*; Ainsworth (Fremde-Situation) – Bindungstheorie.
- Piaget: *The Origins of Intelligence in Children* (engl. 1952) – sensomotorische und präoperationale Phase.
- Vygotsky (1978): *Mind in Society* – Zone der nächsten Entwicklung, Scaffolding.
- Erikson (1950): *Childhood and Society* – psychosoziale Stufen (Urvertrauen, Autonomie, Initiative).
- Diamond (2013): *Executive Functions*, Annual Review of Psychology.
- Yogman et al. (2018): *The Power of Play*, Pediatrics (AAP-Bericht).
- Harvard Center on the Developing Child: „Serve and Return“.
- Whitehurst et al. (1988): Dialogisches Lesen, Developmental Psychology.
- G-BA Kinder-Richtlinie (U-Untersuchungen U1–U9) – für den PDF-Export.

### 4.3 Meilenstein

```ts
interface Milestone {
  id: string;                       // "gm-sits-without-support"
  domain: DomainId;
  title: LocalizedText;             // „Sitzt ohne Unterstützung“
  description: LocalizedText;       // woran man es im Alltag erkennt
  window: {
    fromMonths: number;             // ab hier zeigen es die ersten Kinder typischerweise
    toMonths: number;               // bis hier zeigen es die meisten Kinder
  };
  consultHintFromMonths?: number;   // ab hier ruhiger Hinweis „beim nächsten Termin ansprechen“
  supportTips: LocalizedText[];     // wie Eltern unterstützen können
  rationale: LocalizedText;         // warum dieser Schritt wichtig ist
  references: ReferenceLink[];      // mindestens 1
  relatedActivityIds?: string[];
  review: Review;
}
```

Darstellung in der App: als Balken über die Monate („meist zwischen 4 und 9 Monaten“) mit dem Hinweistext „Jedes Kind hat sein eigenes Tempo“. `consultHintFromMonths` setze ich nur dort, wo eine Quelle eine klare Grenze nahelegt (CDC-Checkpoints, Grenzstein-Prinzip, WHO-Fenster); sonst bleibt das Feld weg und es erscheint kein Hinweis.

Altersbänder sind für Meilensteine nicht fest verdrahtet: Ein Meilenstein erscheint in jedem Band, das sein Zeitfenster berührt. So bleiben spätere Änderungen an den Bändern ohne Content-Umbau möglich.

### 4.4 Aktivität

```ts
interface Activity {
  id: string;                         // "a-tummy-time-mirror"
  origin: 'builtin' | 'custom';
  title: LocalizedText;
  summary: LocalizedText;             // ein Satz für die Karte
  ageRange: { minMonths: number; maxMonths: number };   // frei, nicht an Bänder gebunden
  domains: { primary: DomainId; secondary: DomainId[] };
  category: CategoryId;
  durationMinutes: { min: number; max: number };
  location: 'indoor' | 'outdoor' | 'both';
  prepEffort: 'none' | 'low' | 'medium' | 'high';
  socialSettings: ('oneOnOne' | 'siblings' | 'group')[];
  materials: { materialId: string; optional: boolean; amount?: LocalizedText }[];
  steps: LocalizedText[];
  variations: { easier: LocalizedText[]; harder: LocalizedText[] };
  guidanceTips: LocalizedText[];      // Tipps zur Begleitung
  learningOutcomes: LocalizedText[];  // „Das lernt dein Kind dabei“
  rationale: LocalizedText;           // „Warum fördert das die Entwicklung?“
  safety: { kind: SafetyKind; text: LocalizedText }[];
  references: ReferenceLink[];        // mind. 1 bei builtin
  relatedMilestoneIds: string[];
  tags?: string[];
  review: Review;
}

type SafetyKind = 'supervision' | 'choking' | 'water' | 'heat' | 'sharp'
                | 'allergy' | 'cord' | 'outdoor' | 'other';
```

Pflichtregeln, die die Validierung zusätzlich prüft (über das Schema hinaus):
- Jede Aktivität für unter 36 Monate mit Kleinteilen-Material muss einen `choking`-Hinweis haben (Material ist im Katalog mit `smallParts: true` markiert).
- Jede Aktivität mit Material `water` braucht einen `water`-Hinweis.
- `ageRange` liegt in 0–72 Monaten, `minMonths < maxMonths`.
- Alle `referenceId`, `materialId`, `relatedMilestoneIds` existieren.
- Mindestens 20 Aktivitäten pro Band als **Ziel** (Warnung, kein Fehler, solange wir in Etappen befüllen).

### 4.5 Material

```ts
interface Material {
  id: string;                   // "cardboard-box"
  name: LocalizedText;
  group: 'household' | 'craft' | 'nature' | 'toy' | 'book' | 'kitchen';
  smallParts: boolean;          // löst Verschluckungs-Prüfung aus
  commonAtHome: boolean;        // für die Vorauswahl im Materialcheck
}
```

### 4.6 Beispiel-Eintrag

```json
{
  "id": "a-tummy-time-mirror",
  "origin": "builtin",
  "title": { "de": "Bauchzeit mit Spiegel" },
  "summary": { "de": "Kurze Bauchlage-Momente, bei denen dein Baby sich selbst im Spiegel entdeckt." },
  "ageRange": { "minMonths": 0, "maxMonths": 6 },
  "domains": { "primary": "grossMotor", "secondary": ["socialEmotional", "cognition"] },
  "category": "movement",
  "durationMinutes": { "min": 2, "max": 10 },
  "location": "indoor",
  "prepEffort": "none",
  "socialSettings": ["oneOnOne", "siblings"],
  "materials": [
    { "materialId": "blanket", "optional": false },
    { "materialId": "unbreakable-mirror", "optional": true }
  ],
  "steps": [
    { "de": "Lege eine Decke auf den Boden und dein waches Baby auf den Bauch." },
    { "de": "Leg dich auf Augenhöhe dazu oder stelle den Spiegel schräg vor das Gesicht." },
    { "de": "Sprich mit deinem Baby und beende die Runde, sobald es quengelt." }
  ],
  "variations": {
    "easier": [{ "de": "Baby bäuchlings auf deine Brust legen, während du halb liegst." }],
    "harder": [{ "de": "Ein Spielzeug etwas seitlich legen, damit es den Kopf dreht oder sich danach streckt." }]
  },
  "guidanceTips": [{ "de": "Lieber oft und kurz als selten und lang. Mehrere Minuten über den Tag verteilt zählen." }],
  "learningOutcomes": [
    { "de": "Kräftigt Nacken-, Schulter- und Rumpfmuskulatur." },
    { "de": "Übt, den Kopf zu heben und zu drehen, eine Grundlage für Rollen und Krabbeln." }
  ],
  "rationale": { "de": "Die WHO empfiehlt für Säuglinge täglich mehrmals Bauchlage im Wachzustand. Die Haltung trainiert die Muskulatur, die für spätere grobmotorische Schritte nötig ist; das Gesicht im Spiegel und deine Stimme halten die Aufmerksamkeit." },
  "safety": [
    { "kind": "supervision", "text": { "de": "Nur im Wachzustand und unter Aufsicht. Zum Schlafen immer in Rückenlage." } }
  ],
  "references": [
    { "referenceId": "who-under5-activity-2019" },
    { "referenceId": "cdc-milestones-2022" }
  ],
  "relatedMilestoneIds": ["gm-lifts-head-prone"],
  "review": { "status": "needsCheck", "note": "Mindestdauer-Empfehlung der WHO für Bauchlage gegenprüfen." }
}
```

### 4.7 Erweiterbarkeit

- Neue Altersstufe (z. B. 6–8 Jahre): Band in `age-bands.json` ergänzen, neue Datei `activities/y06-07.json`. Keine Code-Änderung.
- Neue Sprache: `en`-Felder ergänzen, `locales/en.json` anlegen. Fehlende Übersetzungen fallen auf `de` zurück.
- Neue Felder: Schema-Version in `content/manifest.json` hochzählen; neue Felder immer optional einführen, damit ältere App-Versionen (und die Swift-App) nicht brechen.

---

## 5. Kernlogik (Auszug)

**Alter:** Kalendermonate plus Resttage (nicht 30-Tage-Näherung), damit „9 Monate“ am Monatstag umspringt. Monatsende-Fälle (Geburt am 31.) sind ausdrücklich getestet. Korrigiertes Alter = chronologisches Alter minus (Termin − Geburt), nur wenn `useCorrectedAge` und chronologisch unter 24 Monaten; die App zeigt dann beides an.

**„Was passt heute?“** – reine Funktion `recommend(input) → RankedActivity[]`:
1. *Harte Filter:* Alter im Bereich (± 2 Monate Toleranz, damit Übergänge nicht abrupt sind), Dauer ≤ verfügbare Zeit, Ort passt zur Wahl drinnen/draußen, bei aktivem Materialcheck nur Aktivitäten, deren Pflichtmaterial vorhanden ist.
2. *Punkte:* + für Bereiche mit Meilensteinen, deren Zeitfenster gerade läuft und die noch nicht abgehakt sind (Zone der nächsten Entwicklung); + wenn länger nicht gemacht; + leicht für Favoriten und gut angekommene Aktivitäten; − wenn in den letzten 3 Tagen gemacht.
3. *Vielfalt:* Top-Liste verteilt sich auf verschiedene Bereiche.
4. *Tagesvorschlag:* stabil für einen Tag (Zufall mit Startwert aus Datum + Kind-ID), damit er beim Neuladen nicht wechselt.

Jede Empfehlung trägt eine kurze Begründung („passt zu: Sprache, gerade spannend: erste Wörter“), damit die Logik für Eltern nachvollziehbar ist.

---

## 6. Phasen

**Phase 0 – Grundgerüst** (startet jetzt, unabhängig vom Content-Schema)
Vite + TS, Design-Tokens hell/dunkel, Router, i18n, IndexedDB-Schicht, PWA (Manifest, Service Worker, Icons), GitHub-Actions-Deployment mit Base-Path, Altersberechnung mit Tests.

**Phase 1 – MVP**
- Onboarding mit Hinweis-/Haftungstext, erstes Kinderprofil
- Kinderprofile (mehrere, Frühgeburt/korrigiertes Alter, ohne Foto)
- Entwicklungsübersicht: Meilensteine je Bereich für das aktuelle Alter, abhakbar mit Datum (wird für die Empfehlung gebraucht)
- Aktivitätenbibliothek mit allen Filtern aus deiner Liste
- Aktivitäts-Detailseite (Schritte, Material, Variationen, Begleittipps, „Das lernt dein Kind dabei“, Sicherheit, Quellen)
- Tagesvorschlag und „Was passt heute?“
- Verlauf: als erledigt markieren mit Notiz und „Wie hat's gefallen?“
- JSON-Backup Export/Import, Einstellungen (Theme), Quellen-Seite
- Content: alle Meilensteine (ca. 5–8 pro Bereich und Altersabschnitt), 6–8 Aktivitäten pro Band

**Phase 2 – Begleiten**
Favoriten, eigene Aktivitäten, Materialcheck, Fotos (Profil und Tagebuch), Zeitleiste der Entwicklung, Content-Pakete bis 20 Aktivitäten pro Band.

**Phase 3 – Planen und Teilen**
Wochenplan mit .ics-Export, Meilenstein-Vorschau (nächste Monate + Tipps), Fortschritts-Visualisierung (ressourcenorientiert: „Das hat sich getan“, keine Vergleichskurven), PDF-Export der Entwicklungsübersicht per Druckansicht.

**Phase 4 – Feinschliff**
Hausstil per Skill, Barrierefreiheits-Prüfung, englische Übersetzung, Content-Review-Durchgang.

**Phase 5 – Swift/SwiftUI**

---

## 7. Aufwand bei der Übertragung nach Swift

| Teil | Aufwand | Warum |
|---|---|---|
| Content-JSON | sehr gering | Wird unverändert ins App-Bundle gelegt. |
| Datenmodelle | gering | Typen sind auf `Codable` ausgelegt; fast mechanische Übersetzung. |
| Kernlogik (Alter, Filter, Empfehlung) | gering bis mittel | Reine Funktionen, gemeinsame Testfälle. Fallstrick: Datumsrechnung mit `Calendar` und Zeitzonen sauber nachbauen. |
| Erinnerungen | gering | Nativ mit `UNUserNotificationCenter` sogar einfacher als im Web. |
| Diagramme | gering | Swift Charts. |
| Speicher | mittel | IndexedDB → SwiftData (oder SQLite). Backup-Format bleibt die Brücke: Nutzer können ihre PWA-Daten in die iOS-App importieren. |
| PDF-Export | mittel | Im Web Druckansicht, in Swift eigenes Layout mit `ImageRenderer`/PDFKit. |
| Fotos | mittel | PhotosPicker, Speicherung, Größenreduktion, Berechtigungen. |
| **UI** | **hoch** | Kompletter Neubau in SwiftUI, aller Bildschirme. Größter Posten, aber geradlinig, weil die Logik fertig ist. |
| App-Store-Anforderungen | mittel | Datenschutz-Angaben, Gesundheits-/Medizin-Hinweise, keine Einordnung in die „Kids“-Kategorie (Zielgruppe sind Eltern). |
| Design-Tokens | gering bis mittel | CSS-Variablen auf ein SwiftUI-Theme abbilden; Token-Namen von Anfang an plattformneutral gewählt. |

---

## 8. Was ich von dir brauche

Abstimmung des Content-Schemas (Abschnitt 4). Besonders:
1. Passt die Zeitfenster-Logik bei Meilensteinen (`fromMonths`/`toMonths`, optionaler Hinweis ab `consultHintFromMonths`)?
2. Passen die sieben Kategorien und die drei Sozialformen?
3. Fehlt dir ein Feld bei Aktivitäten?
