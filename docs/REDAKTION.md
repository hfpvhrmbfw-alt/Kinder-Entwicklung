# Inhalte bearbeiten mit Pages CMS

Ideen und Entwicklungsschritte lassen sich im Browser bearbeiten, auch am Handy, ohne JSON anzufassen. Dafür nutzen wir [Pages CMS](https://pagescms.org), ein quelloffenes Redaktionssystem, das direkt mit diesem GitHub-Repository arbeitet.

## Einmal einrichten

1. [app.pagescms.org](https://app.pagescms.org) öffnen und **Sign in with GitHub** wählen.
2. Die GitHub-App von Pages CMS installieren. Bei der Auswahl **Only select repositories** nehmen und nur `Kinder-Entwicklung` anhaken.
3. In Pages CMS das Repository `Kinder-Entwicklung` öffnen, Branch `main`.
4. Links erscheinen **Ideen** und **Entwicklungsschritte**.

Pages CMS bekommt damit Schreibzugriff auf dieses Repository. Den Zugriff kannst du jederzeit unter GitHub → Settings → Applications wieder entziehen.

## Bearbeiten

- Eintrag öffnen, Felder ändern, **Save**. Jede Speicherung ist ein Commit auf `main`.
- Danach laufen automatisch die Tests und das Deployment (Reiter **Actions** im Repository, etwa 2 Minuten). Erst dann ist die Änderung in der App.
- Schlägt ein Test fehl, wird nichts veröffentlicht und die App bleibt wie sie war. Typische Gründe: Kleinteile unter 3 Jahren ohne Verschlucken-Hinweis, Wasser unter 4 Jahren ohne Wasser-Hinweis, Alter „ab“ nicht kleiner als „bis unter“, keine Quelle. Der rote Lauf unter **Actions** nennt den Eintrag.
- **Neue Idee / neuer Schritt:** in der Liste **Add an entry**. Die Kennung wird der Dateiname und sollte danach nicht mehr geändert werden (Ideen beginnen mit `a-`).
- **Prüfstatus:** Wenn du einen Eintrag fachlich gegengelesen hast, Status auf **Geprüft** setzen und Name und Datum eintragen. Offene Punkte gehören in „Was ist noch zu prüfen?“.

## Was es nur hier gibt

- **Pädagogischer Hintergrund**, **Worauf du achten kannst**, **Im Alltag weiterführen** (Ideen) und **So unterschiedlich kann es aussehen** (Schritte). Die App zeigt sie bei jeder Idee und unter „So kannst du unterstützen“ bei jedem Schritt.

## Grenzen

- Material und Quellen wählst du aus festen Listen. Fehlt etwas, im Prüfstatus notieren; neue Einträge kommen in `materials.json` bzw. `references.json`, danach wird `.pages.yml` neu erzeugt (`npm run cms:config`).
- `.pages.yml` nicht von Hand ändern, sie wird aus `scripts/pages-config.mjs` erzeugt.
- Änderungen über Pages CMS landen in der aktuellen Version der App. Ältere Versionen unter `/v/<version>/` bleiben unverändert.
