# Content-Leitfaden

Alle Fachinhalte liegen als JSON in `content/` und werden gegen `content/schema/content.schema.json` geprüft (`npm test`). Ideen und Meilensteine lassen sich bequem mit Pages CMS bearbeiten, siehe [REDAKTION.md](REDAKTION.md).

## Dateien

| Datei | Inhalt |
|---|---|
| `age-bands.json` | Altersbänder (Untergrenze inklusiv, Obergrenze exklusiv); bis 7 Jahre (84 Monate, Ende der 1. Klasse) |
| `domains.json`, `categories.json` | Entwicklungsbereiche und Kategorien |
| `materials.json` | Materialkatalog; `smallParts: true` löst die Verschluckungs-Prüfung aus |
| `references.json` | Quellen- und Prinzipienkatalog; `citationVerified: false` = bibliografisch noch gegenprüfen |
| `milestones/<id>.json` | Meilensteine, eine Datei pro Eintrag |
| `activities/<id>.json` | Aktivitäten (Ideen), eine Datei pro Eintrag |

Leere Listen (z. B. keine Nebenbereiche, keine Sicherheitshinweise) dürfen in den Dateien fehlen; Pages CMS lässt sie beim Speichern weg. Der Loader ergänzt sie (`src/core/normalize.ts`).

## Regeln (werden automatisch geprüft)

- Jede Aktivität und jeder Meilenstein hat Bereich, Altersfenster, Begründung (`rationale`) und mindestens eine Quelle.
- Quellen nur aus `references.json`, nie frei erfunden. Unsicheres bekommt `review.status: "needsCheck"` mit einer `note`.
- Meilensteine sind Zeitfenster (`window.fromMonths`/`toMonths`). `consultHintFromMonths` nur setzen, wenn eine Quelle die Grenze stützt; der Wert liegt nie vor dem Fensterende.
- Material mit Kleinteilen bei Aktivitäten unter 36 Monaten → Sicherheitshinweis `choking`.
- Material Wasser bei Aktivitäten unter 48 Monaten → Sicherheitshinweis `water`.
- Aktivitäten unter 12 Monaten sollten einen `supervision`-Hinweis haben (Warnung).
- Ziel: 20 Aktivitäten je Altersband (Warnung, solange in Etappen befüllt wird).

## Pädagogische Felder (optional)

| Feld | Bei | Inhalt |
|---|---|---|
| `background` | Ideen, Meilensteine | Pädagogischer Hintergrund, 2 bis 4 Sätze |
| `observe` | Ideen, Meilensteine | Worauf du achten kannst (Liste) |
| `everyday` | Ideen | Im Alltag weiterführen (Liste) |
| `variety` | Meilensteine | So unterschiedlich kann es aussehen |

## Prüfstatus

`draft` → `needsCheck` → `reviewed` (mit `reviewedBy` und `reviewedOn`). Die App zeigt bei nicht geprüften Einträgen einen dezenten Hinweis bei den Quellen.

## Erweitern

- Neue Altersstufe: Band in `age-bands.json`, Einträge mit passendem `ageRange`. Kein Code nötig. Obergrenze für Content: 84 Monate (`MAX_CONTENT_MONTHS`).
- Neue Sprache: `en`-Felder ergänzen; fehlende Texte fallen auf Deutsch zurück.
- Neue Felder: immer optional einführen, `contentSchemaVersion` in `manifest.json` erhöhen und das Feld in `scripts/pages-config.mjs` ergänzen (`npm run cms:config`). Ein Test prüft, dass jedes Feld im CMS bearbeitbar ist.
- Neues Material oder neue Quelle: in `materials.json` bzw. `references.json` eintragen, dann `npm run cms:config`.
