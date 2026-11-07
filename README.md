# Kleine Schritte

App zur Begleitung der Kindesentwicklung von 0 bis 7 Jahren (Ende der 1. Klasse): Kinderprofile mit (korrigiertem) Alter, Meilensteine als Zeitfenster, eine Ideenbibliothek mit Filtern, Tagesvorschlag und „Was passt heute?“, Verlauf und JSON-Backup.

Offline-fähig, ohne Konto, ohne Server, ohne Tracker.

**Veröffentlicht wird nur die iPhone-App** (`ios/`, siehe [ios/README.md](ios/README.md)). Die Web-App in diesem Ordner dient der Entwicklung: Sie ist die Vorlage für Logik, Texte und Aussehen, und ihre Tests sichern ab, dass Web und iPhone gleich rechnen. Sie wird nicht veröffentlicht.

> Die App stellt keine Diagnosen und ersetzt keine ärztliche Beratung. Inhalte mit Prüfstatus „needsCheck“ sind fachlich noch gegenzulesen.

## Entwicklung

```bash
npm install
npm run dev        # lokaler Server
npm test           # Kernlogik, Speicher, Content-Validierung
npm run build && npm run test:e2e   # Klicktests + Barrierefreiheit (Playwright, axe)
npm run build      # Produktions-Build nach dist/
```

## Aufbau

```
content/        Fachinhalte als JSON + JSON-Schema
src/core/       reine Logik ohne DOM (Alter, Filter, Empfehlung, Backup) – Vorlage für Swift
src/storage/    IndexedDB hinter einem Repository
src/ui/         Bildschirme und Bausteine, ohne Framework
src/styles/     tokens.css (alle Design-Tokens) + base.css
tests/          Vitest; tests/fixtures/*.json sind auch für XCTest gedacht
e2e/            Playwright: Abläufe, WCAG-2.1-AA-Prüfung (hell/dunkel), offline, 320 px
docs/           Plan, Content-Leitfaden
```

Versionen: siehe `CHANGELOG.md`. Neue Version = `version` in package.json erhöhen und `MARKETING_VERSION` in `ios/KleineSchritte/project.yml` anpassen.

Design anpassen: nur `src/styles/tokens.css` ersetzen. Aktueller Stil: „Beet“ wie im Zyklus-Tracker (Schriften Lora und Source Sans 3 liegen lokal im Bundle über @fontsource, kein Abruf bei Google). Illustrationen: `src/ui/art.ts`.

## Deployment

Jeder Push testet und baut die Web-App, veröffentlicht wird sie aber nicht. Auf GitHub Pages landet nur `site/`: eine kurze Startseite und die Datenschutzerklärung (`datenschutz.html`, Datenschutz-URL für App Store Connect) mit genau den Texten der iPhone-App. Nach Änderungen an den Datenschutz-Texten `npm run privacy:page` ausführen, ein Test prüft das. Einmalig: Repository → Settings → Pages → Source „GitHub Actions“.

Mehr dazu in [docs/PLAN.md](docs/PLAN.md) und [docs/CONTENT.md](docs/CONTENT.md). Inhalte im Browser bearbeiten: [docs/REDAKTION.md](docs/REDAKTION.md).
