# Kleine Schritte

PWA zur Begleitung der Kindesentwicklung von 0 bis 7 Jahren (Ende der 1. Klasse): Kinderprofile mit (korrigiertem) Alter, Meilensteine als Zeitfenster, eine Ideenbibliothek mit Filtern, Tagesvorschlag und „Was passt heute?“, Verlauf und JSON-Backup.

Offline-fähig, ohne Konto, ohne Server, ohne Tracker. Alle Daten bleiben im Browser (IndexedDB).

> Die App stellt keine Diagnosen und ersetzt keine ärztliche Beratung. Inhalte mit Prüfstatus „needsCheck“ sind fachlich noch gegenzulesen.

## Entwicklung

```bash
npm install
npm run dev        # lokaler Server
npm test           # Kernlogik, Speicher, Content-Validierung
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
docs/           Plan, Content-Leitfaden
```

Versionen: siehe `CHANGELOG.md` und `versions.json`. Neue Version = `version` in package.json erhöhen, Eintrag in versions.json ergänzen und beim bisherigen Eintrag den Merge-Commit als `commit` eintragen. Pages baut jede Version nach `/v/<version>/`, Übersicht unter `versionen.html`.

Design anpassen: nur `src/styles/tokens.css` ersetzen. Aktueller Stil: „Beet“ wie im Zyklus-Tracker (Schriften Lora und Source Sans 3 liegen lokal im Bundle über @fontsource, kein Abruf bei Google). Illustrationen: `src/ui/art.ts`.

## Deployment

Jeder Push auf `main` testet, baut und veröffentlicht die App über GitHub Actions auf GitHub Pages. Einmalig: Repository → Settings → Pages → Source „GitHub Actions“.

Mehr dazu in [docs/PLAN.md](docs/PLAN.md) und [docs/CONTENT.md](docs/CONTENT.md). Inhalte im Browser bearbeiten: [docs/REDAKTION.md](docs/REDAKTION.md).
