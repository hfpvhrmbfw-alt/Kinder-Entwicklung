# Änderungen

Jede Version bleibt auf GitHub Pages unter `/v/<version>/` erreichbar, die neueste liegt zusätzlich unter der normalen Adresse. Übersicht aller Versionen: `versionen.html`.

## 1.1.0 – 2026-10-23
Inhalte nach der Vorprüfung gegen die CDC-Meilensteine (2022), die WHO-Motorikstudie und die Kinder-Richtlinie. Alle geänderten Einträge bleiben auf „fachlich noch nicht abschließend geprüft“, bis die Fachleute zugestimmt haben.
- Entwicklung: Drei Zeitfenster endeten zu früh und sind jetzt länger („Wird auch von Fremden meist verstanden“ 2–3½ Jahre, „Zeigt auf etwas, um es dir zu zeigen“ bis 18 Monate, „Isst Fingerfood selbst“ bis 16 Monate). „Kommt selbst zum Sitzen“ reicht bis 12 Monate, „Stapelt zwei, drei Bausteine“ heißt genauer und liegt bei 10–20 Monaten. 25 weitere Fenster, die genau dort endeten, wo erst drei Viertel der Kinder so weit sind, sind etwas länger. Seilspringen und erstes Lesen erklären, dass viele Kinder später dran sind.
- Neuer Hinweis auf der Entwicklungsseite und unter „Hinweise und Haftung“: Wenn ein Kind etwas wieder verlernt, das es schon konnte, zeitnah in der Kinderarztpraxis ansprechen.
- Sicherheit: Hinweise zu Luftballons („Ball fangen“) und Schnüren („Wie komme ich da ran?“). Die Inhaltsprüfung verlangt solche Hinweise jetzt auch für neue Ideen aus dem Redaktionssystem.
- Vorsorge: Pulsoxymetrie-Screening bei der U2, Hinweis auf U10 und U11 bei der U9.
- Quellen: 22 Quellen bibliografisch geprüft und mit Links, Montessori mit Werk, „Lernen über die Sinne“ als Grundsatz gekennzeichnet.
- Für die iPhone-App: gemeinsame Testfälle (tests/fixtures/parity.json), damit Web und iPhone genau gleich rechnen. Der Swift-Teil liegt unter ios/ und ändert an der Web-App nichts.

## 1.0.0 – 2026-10-22
Erste vollständige Version: Heute, Entwicklung mit U1–U9 und Übersicht für den Kinderarzttermin, Ideen inklusive eigener Ideen, Verlauf mit Rückblick, Datensicherung, Datenschutz. Dieser Stand ist die Vorlage für die iPhone-App.
- Barrierefreiheit: Alle Seiten in hell und dunkel automatisch nach WCAG 2.1 AA geprüft. Blasse Hilfstexte (Wochentage, Altersgrenzen unter dem Balken) und Links haben jetzt genug Kontrast. Der Knopf „Erledigt“ bei einer fälligen U-Untersuchung war im Dunkelmodus kaum lesbar. Das Feld zum Einspielen einer Sicherung hat eine Beschriftung für Bildschirmleser.
- Klicktests im Browser für die wichtigsten Wege: erstes Kind anlegen, Idee eintragen (auch mit anderem Datum), Meilenstein abhaken, U-Untersuchung abhaken, eigene Idee anlegen, Sicherung herunterladen und einspielen, Arzt-Übersicht, App ohne Netz, schmale Bildschirme ohne seitliches Scrollen. Sie laufen bei jeder Änderung automatisch mit, bevor etwas veröffentlicht wird.
- Noch offen vor dem App Store: fachliche Prüfung der Inhalte und Angaben zum Verantwortlichen auf der Datenschutzseite.

## 0.18.0 – 2026-10-22
- Neue Schriften „Ruhig & klassisch“: Lora für Überschriften und Source Sans 3 für Text statt Playfair Display und DM Sans. Ruhiger und auch in kleinen Größen und im Dunkelmodus gut lesbar. Die Schriften liegen weiter lokal in der App, sie funktioniert also auch offline.

## 0.17.1 – 2026-10-22
- Entwicklung: Engere Abstände zwischen Kopfbereich, Bereichsüberschriften, Meilenstein-Karten und „Frühere Schritte“, damit mehr auf einen Blick zu sehen ist.

## 0.17.0 – 2026-10-22
- Heute: Engere Abstände zwischen Karten, Wochenleiste und Kacheln, damit mehr auf den ersten Blick zu sehen ist.
- Ideen: Beim Eintragen („Haben wir gemacht“) öffnet sich kein Datumsfeld mehr. Es gilt das heutige Datum, ein anderes lässt sich über „Datum ändern“ wählen.

## 0.16.0 – 2026-10-22
- Verlauf: Geschaffte Meilensteine stehen als schmale Zeile mit Häkchen statt als große grüne Karte. Mit „Meilensteine zeigen“ lassen sie sich ganz ausblenden, dann sieht man nur die gespielten Ideen. Die Auswahl bleibt gespeichert.
- Entwicklung: Die Karten der Schritte sind etwas enger.
- Vorsorge: Ein Tipp auf „Erledigt“ hakt die U-Untersuchung ohne Rückfrage ab. Das Datum lässt sich danach über „Datum eintragen“ ergänzen.

## 0.15.1 – 2026-10-22
- Fehler behoben: Auf dem iPhone scrollte die Navigationsleiste unten mit der Seite nach oben weg. Sie bleibt jetzt beim Scrollen fest am unteren Rand.

## 0.15.0 – 2026-10-22
- „Mehr“ ist übersichtlicher: drei Gruppen („Für {Kind}“ mit Vorsorge, Rückblick, Arzttermin und Kinder; „Einstellungen“; „Info“) als kompakte Listenzeilen statt großer Karten, so passt alles auf einen Blick.
- Die Darstellung (Hell/Dunkel) lässt sich direkt auf „Mehr“ umstellen, die Datensicherung zeigt dort das Datum der letzten Sicherung. Die Versionsnummer steht bei „Frühere Versionen“.

## 0.14.0 – 2026-10-22
- **Eigene Ideen:** Unter „Ideen“ lassen sich eigene Spielideen anlegen, bearbeiten und löschen (Name, Alter, Bereich, Ort, Dauer, Material, Schritte, Tipps). Sie erscheinen in der Bibliothek (mit Filter „Nur eigene Ideen“), bei „Was passt heute?“, als Favorit und im Verlauf.
- **Vorsorge U1–U9:** Die Zeiträume aller U-Untersuchungen inkl. U7a, berechnet ab dem Geburtsdatum, mit Status (jetzt, bald, später, erledigt), was dort typischerweise angeschaut wird und was man vorbereiten kann. Abhaken mit oder ohne Datum, frühere auf einmal eintragen, alle kommenden als Kalenderdatei (.ics) mit Erinnerung drei Wochen vorher. Die Heute-Seite zeigt eine Untersuchung, sobald sie läuft oder in den nächsten sechs Wochen beginnt. Texte sind zum Gegenlesen markiert.
- **Rückblick „Das hat sich getan“** (aus dem Verlauf erreichbar): neu geschaffte Schritte, gemeinsames Spielen, Ideen mit besonders viel Freude, Bereiche, Notizen, wählbar für 3 Monate, 6 Monate, 1 Jahr oder alles. Dazu „Heute vor einem Jahr …“. Ohne Vergleiche mit anderen Kindern.
- **Übersicht für den Arzttermin** (aus „Entwicklung“ erreichbar): Alter, letzte und nächste U, was seit der letzten U geschafft ist, was gerade im Zeitfenster liegt, was man ansprechen kann, dazu eigene Fragen (werden gespeichert). Drucken oder als PDF sichern.
- **Datenschutz:** neue Seite in der App und als öffentliche Webseite `datenschutz.html` (auch für den App Store nutzbar).
- **Daten absichern:** Die App bittet den Browser um dauerhaften Speicher. Hinweis auf der Heute-Seite, die App auf den Home-Bildschirm zu legen, und alle 30 Tage eine Erinnerung an die Datensicherung. Die Datensicherung zeigt das Datum der letzten Sicherung und den Speicherstatus.
- Sicherungen enthalten jetzt auch U-Untersuchungen und Arztfragen. Ältere Versionen können neue Sicherungen weiter einspielen und laufen mit denselben Daten weiter.

## 0.12.0 – 2026-10-22
- Unter „Offen“ erscheinen keine Schritte mehr, deren Zeitfenster mehr als ein Jahr zurückliegt. Wer ein älteres Kind neu anlegt, sieht also nicht mehr Dutzende Baby-Schritte als offen. Sie stehen weiter unter „Alle“, dort ohne Hinweis zur Kinderärztin bzw. zum Kinderarzt. Ein kurzer Satz unter den Filtern sagt, wie viele Schritte so ausgeblendet sind.
- Abgehakt wird dabei nichts automatisch.

## 0.11.0 – 2026-10-22
- Neues Altersband „6–7 Jahre“: Die App reicht jetzt bis zum Ende der 1. Klasse. Die Kinderkarte zeigt dafür den Abschnitt „Schulstart“ mit eigenem Bild.
- Inhaltspaket 5: 20 neue Ideen und 14 neue Entwicklungsschritte für den Schulstart (z. B. „Radfahren lernen“, „Roboter-Sprache“, „Rechnen mit Snacks“, „Gewinnen und Verlieren üben“, „Tasche selbst packen“, „Schulweg üben“). 27 bestehende Ideen, die auch mit sechs gut passen, reichen jetzt bis 7 Jahre. Im Band 6–7 Jahre gibt es damit 61 Ideen und 15 Schritte.
- Alle neuen Schritte haben geschätzte Zeitfenster und sind zum Gegenlesen markiert.

## 0.10.0 – 2026-10-22
- Inhaltspaket 4: 31 neue Ideen und 16 neue Entwicklungsschritte für 3–6 Jahre, Schwerpunkt 4–6 Jahre (z. B. „Zahlen-Detektiv“, „Buchstaben-Suche“, „Gesprächs-Pingpong beim Essen“, „Seiltänzer“, „Gefühls-Barometer“, „Schwimmt es oder sinkt es?“). Neue Schritte u. a. „Hält ein Gespräch über mehrere Wechsel“, „Erkennt einige Buchstaben“, „Malt Formen ab“, „Hat feste Freundschaften“. Alle Texte sind zum Gegenlesen markiert.
- Ideen je Band jetzt: 3–4 Jahre 74, 4–5 Jahre 62, 5–6 Jahre 50 (vorher 47, 31, 21).

## 0.9.0 – 2026-10-22
- Inhaltspaket 3: 25 neue Ideen und 10 neue Entwicklungsschritte für 1–3 Jahre (z. B. „Teddy ins Bett bringen“, „Treppe üben“, „Tanzen und Stopp“, „Kaufladen spielen“, „Ich bin dran, du bist dran“). Neue Schritte u. a. „Zeigt auf Körperteile“, „Spricht etwa 50 Wörter“, „Versteht Aufforderungen mit zwei Schritten“, „Hilft beim Aufräumen“. Alle Texte sind zum Gegenlesen markiert.
- Ideen je Band jetzt: 12–18 Monate 49, 18–24 Monate 47, 2–3 Jahre 54.

## 0.8.0 – 2026-10-22
- Inhaltspaket 2: 26 neue Ideen und 10 neue Entwicklungsschritte für das erste Lebensjahr, Schwerpunkt 0–3 Monate (z. B. „Gesicht auf Wanderschaft“, „Bauchlage auf deiner Brust“, „Wiegen im eigenen Takt“, „Kurz weg, gleich zurück“). Neue Schritte u. a. „Schaut dir ins Gesicht“, „Lacht laut“, „Reagiert, wenn du weggehst“. Alle Texte sind zum Gegenlesen markiert.
- Im Band 0–3 Monate gibt es jetzt 33 Ideen und 17 Schritte (vorher 21 und 11).

## 0.7.0 – 2026-10-22
- Inhaltspaket 1a: Alle 80 Entwicklungsschritte haben jetzt einen pädagogischen Hintergrund, Beobachtungsfragen („Worauf du achten kannst“) und einen Absatz zur normalen Vielfalt („So unterschiedlich kann es aussehen“). Zu sehen unter „So kannst du unterstützen“. Alle Texte sind zum Gegenlesen markiert.
- Inhaltspaket 1b: Alle 92 Ideen haben jetzt einen pädagogischen Hintergrund, Beobachtungsfragen und Vorschläge „Im Alltag weiterführen“ (unter „Warum das hilft“). Ebenfalls zum Gegenlesen markiert.
- Durchsicht: Vier Ideen für Babys (Baden, Fingerfood, Bilderbuch, Zeigespaziergang) haben einen Aufsichts-Hinweis bekommen.

## 0.6.0 – 2026-10-22
- Inhalte lassen sich mit Pages CMS im Browser bearbeiten (Anleitung: `docs/REDAKTION.md`). Jede Idee und jeder Entwicklungsschritt liegt dafür in einer eigenen Datei.
- Neue optionale Felder für pädagogische Erklärungen: „Pädagogischer Hintergrund“, „Worauf du achten kannst“, „Im Alltag weiterführen“ (Ideen) und „So unterschiedlich kann es aussehen“ (Schritte). Die App zeigt sie, sobald sie befüllt sind.
- Inhalte dürfen jetzt bis 7 Jahre (84 Monate) reichen; das Band 6–7 Jahre kommt mit dem Inhaltspaket für die 1. Klasse.

## 0.5.0 – 2026-10-21
- Entwicklung: Umschalter „Offen / Geschafft / Alle“. Standard ist „Offen“: Abgehakte Schritte verschwinden aus der Liste (mit „Rückgängig“) und stehen gesammelt unter „Geschafft“, dort lässt sich auch das Datum nachtragen. Die Auswahl bleibt gespeichert.
- Je Bereich steht, wie viele Schritte schon geschafft sind.
- Ideen: „Schon gemachte ausblenden“ blendet Ideen aus, die für das Kind schon im Verlauf stehen.

## 0.4.0 – 2026-10-21
- Neues App-Icon (Pflänzchen auf Trittsteinen) für Startbildschirm, iOS und Browser-Tab, inkl. Variante für runde Android-Icons.

## 0.3.0 – 2026-10-21
- Meilensteine lassen sich ohne Datum abhaken. Das Feld „Seit wann?“ ist optional, ein Datum kann jederzeit nachgetragen oder wieder entfernt werden. So lässt sich der aktuelle Stand schnell eintragen, auch wenn das Kind schon älter ist.
- Verlauf: Meilensteine ohne Datum stehen gesammelt unter „Ohne Datum“.
- Ältere Versionen zeigen solche Meilensteine weiter als erreicht, dort mit dem Tag des Abhakens als Datum.

## 0.2.0 – 2026-10-21
- Stil „Beet“ wie im Zyklus-Tracker: warme Beige-Töne, Serifen-Überschriften, orange Pillen-Buttons, Zweige oben, schwebende Leiste unten.
- Heute-Seite neu: Begrüßung, Kinderkarte mit Abschnitt und Fortschritt bis zum nächsten Altersband, Spielwoche, Ausblick-Kacheln.
- Versionen: alte Stände bleiben unter `/v/<version>/` nutzbar.

## 0.1.0 – 2026-10-12
- MVP: Kinderprofile, Meilensteine, 92 Aktivitäten, Verlauf, Datensicherung, offline als PWA.
- Stil „Brause“.
