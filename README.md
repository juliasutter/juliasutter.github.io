# juliasutter.de

Statische, zweisprachige Website für Julia Sutter. Die deutsche Version unter `/` ist primär, die englische Version liegt unter `/en/`. Die Seite wird ohne Laufzeit-Framework und ohne eigenes Analyse- oder Marketing-Tracking über GitHub Pages ausgeliefert. Google-Terminbuchung wird erst nach einem bewussten Klick geladen; dabei gelten zusätzlich Googles Datenschutz- und Cookie-Regeln.

## Starter-Class-Termine aktualisieren

Alle Kursdaten stehen ausschließlich in [`assets/course-config.js`](assets/course-config.js). Für einen neuen Kurs den dort auskommentierten Beispielblock kopieren, die sechs Termine im Format `YYYY-MM-DD` eintragen und den Status setzen:

- `open`: zeigt Termine und das Anmeldeformular; Rechnungsadresse, Bestellübersicht sowie der Hinweis auf AGB und Widerruf werden automatisch eingeblendet. Der abschließende Button heißt „Anmelden“; für AGB und Widerrufsbelehrung sind keine separaten Checkboxen vorgesehen.
- `waitlist`: zeigt Termine und „Auf die Warteliste“; die Anmeldung bleibt unverbindlich.
- `closed`: blendet den Kurs aus.
- `format`: optional `online` oder `vor_ort`; ohne Wert wird kein Format angezeigt.
- Keine sichtbaren zukünftigen Kurse: die gesamte Seite wechselt automatisch auf „Kursplatz anfragen“.

Vergangene Kurse verschwinden automatisch, sobald ihr letzter Termin vorbei ist. Offene Kurse und Wartelistenkurse stehen gemeinsam in der Terminübersicht. Der jeweilige Anmeldelink wählt den Kurs im Formular vor; die Auswahl dort bleibt änderbar und schaltet das Formular passend um. Deutsche und englische Seite nutzen dieselbe Konfiguration.

Beginnt ein offener Kurs innerhalb der nächsten 14 Kalendertage, blendet das Anmeldeformular zusätzlich die verpflichtende Zustimmung zum vorzeitigen Leistungsbeginn ein. Maßgeblich ist aktuell der erste Kurstermin aus `dates`. Falls Unterlagen, Onboarding oder persönliche Begleitung schon davor beginnen, muss stattdessen dieser frühere Leistungsbeginn in der Logik berücksichtigt werden.

## Formulare

Beide Formulare senden an denselben Formcarry-Endpunkt aus `assets/course-config.js`. Der Endpunkt darf nur dort geändert werden. Empfängerin ist `julia@juliasutter.de`. Falls JavaScript nicht verfügbar ist, zeigt die Seite stattdessen einen direkten E-Mail-Kontakt und verhindert einen wirkungslosen POST an GitHub Pages.

Bei offenen Kursen können Freund:innen den gemeinsamen Tarif wählen. Jede Person meldet sich selbst an und nennt die andere Person; Elternpaare besuchen getrennte Kurse zum regulären Preis. Die Bestellübersicht und das übermittelte Feld `price_eur` verwenden denselben ausgewählten Preis aus der Kurskonfiguration. Beim Freund:innen-Tarif werden zusätzlich `friend_registration=yes` und `friend_name` übermittelt. Unverbindliche Anfragen und Wartelisteneinträge enthalten diese Preis- und Freund:innen-Felder nicht.

## Kostenfreies Kennenlerngespräch

`introCallUrl` und `introCallEmbedUrl` in `assets/course-config.js` enthalten den öffentlichen Buchungslink und die kanonische Google-Kalender-Einbettung mit `gv=true`. Bei einer Änderung des Direktlinks müssen auch die statischen `data-booking-trigger`- und `data-booking-direct`-Links in beiden Sprachseiten aktualisiert werden; `npm run check:site` prüft ihre Übereinstimmung.

Die Gesprächslinks öffnen einen nativen Dialog, mobil bildschirmfüllend. Das iframe wird erst beim ersten Klick erzeugt und während des Seitenbesuchs wiederverwendet. Vorher werden keine Google-Ressourcen für die Buchung geladen. Ohne JavaScript oder Dialog-Unterstützung führen die Links direkt zur Buchungsseite. Auch im Dialog bleiben ein direkter Google-Link und eine schriftliche Kontaktalternative erreichbar. Buchung und Bestätigung liegen vollständig bei Google; die Website liest keine Buchungsdaten oder Erfolgszustände aus.

Der Dialog schließt über seinen sichtbaren Schließen-Button oder Escape, solange der Fokus im Website-Dialog liegt. Innerhalb des fremden Google-Frames verarbeitet Google Tastatureingaben selbst; dort kann Escape nicht durch die Website abgefangen werden. Der Schließen-Button bleibt außerhalb des Frames erreichbar. Falls ein eingebetteter Browser Google-Inhalte nicht lädt, steht weiterhin der direkte Buchungslink zur Verfügung.

Terminbeschreibung, freie Zeiten und Google Meet werden in Google Kalender gepflegt. Die englische Website verwendet dieselbe Buchungsseite und deren dort gepflegten Beschreibungstext. Die Datenschutzhinweise beider Sprachen beschreiben die Einbettung.

## Lokal ausführen und prüfen

```bash
npm install
npm run dev
```

Die Seite läuft dann unter `http://127.0.0.1:4173/`.

Vollständiger Qualitätslauf:

```bash
npm run test:ci
```

## Veröffentlichung

Die Produktionsdomain ist in `CNAME` als `juliasutter.de` hinterlegt. Vor dem DNS-/Framer-Cutover die Schritte in [`docs/cutover-checklist.md`](docs/cutover-checklist.md) abarbeiten.

## Rechtstexte

Die technischen Angaben zu Hosting, Formularverarbeitung, Cookies und Tracking sind an diese Implementierung angepasst. Die Texte ersetzen keine individuelle Rechtsberatung und sollten vor dem Produktionsstart fachlich geprüft werden.
