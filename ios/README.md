# iPhone-App „Kleine Schritte“

Zwei Teile:

- **KleineSchritteCore** – die Logik als Swift-Paket, ohne Oberfläche: Alter, Filter, Empfehlung, Meilensteine,
  U-Untersuchungen, Arzt-Übersicht, Rückblick, Kalenderdatei, Sicherung, eigene Ideen, Texte.
  Sie rechnet genau wie die Web-App: `tests/fixtures/parity.json` wird von beiden Seiten gegen den echten Content geprüft.
- **KleineSchritte** – die SwiftUI-App (iPhone, ab iOS 17). Sie liest denselben Content (`content/`) und dieselben Texte
  (`src/i18n/locales/de.json`) wie die Web-App; was nur auf dem iPhone anders heißt, steht in `Resources/ios-de.json`.

Die Daten liegen als JSON-Datei im App-Ordner (Application Support) und haben dasselbe Format wie die Sicherungsdatei
der Web-App. Eine Sicherung aus der Web-App lässt sich also auf dem iPhone einspielen und umgekehrt.

## Auf dem Mac starten

1. Xcode installieren (aus dem App Store), einmal öffnen und die Zusatzkomponenten laden lassen.
2. Im Terminal:
   ```sh
   brew install xcodegen
   cd ios/KleineSchritte
   xcodegen
   open KleineSchritte.xcodeproj
   ```
3. In Xcode oben „KleineSchritte“ und ein iPhone-Simulator wählen, dann ▶︎ (⌘R).
4. Auf dem eigenen iPhone: Xcode → Settings → Accounts → Apple-ID hinzufügen. Im Projekt unter
   „Signing & Capabilities“ das eigene Team wählen, iPhone per Kabel verbinden, ▶︎. Beim ersten Mal auf dem iPhone unter
   Einstellungen → Allgemein → VPN und Geräteverwaltung dem Entwickler vertrauen.

`KleineSchritte.xcodeproj` wird aus `project.yml` erzeugt und nicht eingecheckt. Nach `git pull` einfach `xcodegen`
erneut ausführen.

## Tests

- Kern (geht auch ohne Mac, z. B. unter Linux): `cd ios/KleineSchritteCore && swift test`
- App: in Xcode ⌘U.
- Auf GitHub prüft `.github/workflows/ios.yml` beides bei jeder Änderung.

Nach einer gewollten Änderung an Logik oder Content die gemeinsamen Testfälle neu erzeugen:
`UPDATE_FIXTURES=1 npx vitest run tests/parity.test.ts` (im Hauptordner), dann beide Testsuiten laufen lassen.

## Für den App Store

- Bundle-ID ist `de.kleineschritte.app` (in `project.yml` änderbar, muss zur Bundle-ID in App Store Connect passen).
- App-Icon: `KleineSchritte/Resources/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png`, Vorlage `ios/design/app-icon.svg`.
- Datenschutz-Manifest: `KleineSchritte/Resources/PrivacyInfo.xcprivacy` (kein Tracking, keine erfassten Daten).
- `ITSAppUsesNonExemptEncryption` ist `false` (keine eigene Verschlüsselung), damit entfällt die Exportfrage beim Hochladen.
- Archivieren: Product → Archive, dann im Organizer „Distribute App“ → App Store Connect.

## Noch offen

- Die Oberfläche ist geschrieben, aber noch nicht auf einem echten Gerät angesehen. Erste Rückmeldungen am besten mit
  Bildschirmfotos aus dem Simulator.
- Bilder: Die gemalten Szenen aus der Web-App sind eingebunden (Kleinkind, Schule, Willkommen). Für Neugeborene, Baby
  und Kindergarten steht noch ein Symbol; neue Bilder einfach als `scene-newborn`, `scene-baby`, `scene-preschool`
  in `Assets.xcassets` legen.
- Fotos zu Einträgen gibt es in der iPhone-App noch nicht (in Sicherungen enthaltene Fotos bleiben erhalten).
