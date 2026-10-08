# Content-Leitfaden

Alle Fachinhalte liegen als JSON in `content/` und werden gegen `content/schema/content.schema.json` geprüft (`npm test`).

## Dateien

| Datei | Inhalt |
|---|---|
| `age-bands.json` | 10 Altersbänder (Untergrenze inklusiv, Obergrenze exklusiv) |
| `domains.json`, `categories.json` | Entwicklungsbereiche und Kategorien |
| `materials.json` | Materialkatalog; `smallParts: true` löst die Verschluckungs-Prüfung aus |
| `references.json` | Quellen- und Prinzipienkatalog; `citationVerified: false` = bibliografisch noch gegenprüfen |
| `milestones/*.json` | Meilensteine, eine Datei pro Bereich |
| `activities/*.json` | Aktivitäten, eine Datei pro Altersband (Zuordnung nur zur Ordnung; maßgeblich ist `ageRange`) |

## Regeln (werden automatisch geprüft)

- Jede Aktivität und jeder Meilenstein hat Bereich, Altersfenster, Begründung (`rationale`) und mindestens eine Quelle.
- Quellen nur aus `references.json`, nie frei erfunden. Unsicheres bekommt `review.status: "needsCheck"` mit einer `note`.
- Meilensteine sind Zeitfenster (`window.fromMonths`/`toMonths`). `consultHintFromMonths` nur setzen, wenn eine Quelle die Grenze stützt; der Wert liegt nie vor dem Fensterende.
- Material mit Kleinteilen bei Aktivitäten unter 36 Monaten → Sicherheitshinweis `choking`.
- Material Wasser bei Aktivitäten unter 48 Monaten → Sicherheitshinweis `water`.
- Aktivitäten unter 12 Monaten sollten einen `supervision`-Hinweis haben (Warnung).
- Ziel: 20 Aktivitäten je Altersband (Warnung, solange in Etappen befüllt wird).

## Prüfstatus

`draft` → `needsCheck` → `reviewed` (mit `reviewedBy` und `reviewedOn`). Die App zeigt bei nicht geprüften Einträgen einen dezenten Hinweis bei den Quellen.

## Erweitern

- Neue Altersstufe: Band in `age-bands.json`, neue Datei in `activities/`. Kein Code nötig.
- Neue Sprache: `en`-Felder ergänzen; fehlende Texte fallen auf Deutsch zurück.
- Neue Felder: immer optional einführen und `contentSchemaVersion` in `manifest.json` erhöhen.
