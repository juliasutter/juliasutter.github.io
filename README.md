# juliasutter.de

Statische, zweisprachige Website für Julia Sutter. Die deutsche Version unter `/` ist primär, die englische Version liegt unter `/en/`. Die Seite wird ohne Laufzeit-Framework über GitHub Pages ausgeliefert. Optionale Meta-Werbemessung lädt ausschließlich nach Einwilligung. Google-Terminbuchung wird erst nach einem bewussten Klick geladen; dabei gelten zusätzlich Googles Datenschutz- und Cookie-Regeln.

## Starter-Class-Termine aktualisieren

Alle Kursdaten stehen ausschließlich in [`assets/course-config.js`](assets/course-config.js). Für einen neuen Kurs den dort auskommentierten Beispielblock kopieren, die sechs Termine im Format `YYYY-MM-DD` eintragen und den Status setzen:

- `open`: zeigt Termine und das Anmeldeformular; Rechnungsadresse, Bestellübersicht sowie der Hinweis auf AGB und Widerruf werden automatisch eingeblendet. Der abschließende Button heißt „Anmelden“; für AGB und Widerrufsbelehrung sind keine separaten Checkboxen vorgesehen.
- `waitlist`: zeigt Termine und „Auf die Warteliste“; die Anmeldung bleibt unverbindlich.
- `closed`: blendet den Kurs aus.
- `format`: optional `online` oder `vor_ort`; ohne Wert wird kein Format angezeigt.
- `remainingPlaces`: tatsächlich verfügbare Plätze, nach Buchungen, Reservierungen und Absagen aktualisieren. Ab drei Restplätzen erscheint die genaue Zahl, darüber „Freie Plätze“. Bei null Plätzen erscheint „Ausgebucht“ und der Kurs ist nicht mehr buchbar; eine ausdrücklich konfigurierte Warteliste bleibt möglich. Die Website zählt Anmeldungen nicht automatisch und reserviert beim Ausfüllen keinen Platz.
- `registrationDeadline`: Anmeldeschluss als ISO-Zeitstempel mit explizitem UTC-Offset, z. B. `2026-10-16T21:00:00+02:00` für 21 Uhr deutscher Sommerzeit. Im Winter gilt `+01:00`. Die vorhandenen Kurse schließen jeweils am Vortag um 21 Uhr. In der Terminübersicht erscheint die Frist während der letzten sieben Kalendertage vor Kursstart, im Formular immer beim ausgewählten Kurs.
- Keine sichtbaren zukünftigen Kurse: die gesamte Seite wechselt automatisch auf „Kursplatz anfragen“.

Nach Anmeldeschluss bleiben Kurse bis zum ersten Termin als „Anmeldung geschlossen“ in der Übersicht stehen und sind nicht mehr auswählbar. Sobald ihr erster Termin zur konfigurierten Startzeit beginnt, verschwinden sie auch aus der Übersicht. Ohne explizite Frist endet die Anmeldung weiterhin zum Kursstart. Maßgeblich ist die Zeitzone aus der Kurskonfiguration. Auch ein bereits geöffnetes Formular verhindert eine Anmeldung nach Fristende oder Kursstart; ein späterer Einstieg ist nicht vorgesehen. Diese Prüfung erfolgt im Browser, nicht beim Formularanbieter. Offene Kurse und Wartelistenkurse stehen gemeinsam in der Terminübersicht. Der jeweilige Anmeldelink wählt den Kurs im Formular vor; die Auswahl dort bleibt änderbar und schaltet das Formular passend um. Deutsche und englische Seite nutzen dieselbe Konfiguration.

Beginnt ein offener Kurs innerhalb der nächsten 14 Kalendertage, blendet das Anmeldeformular zusätzlich die verpflichtende Zustimmung zum vorzeitigen Leistungsbeginn ein. Maßgeblich ist aktuell der erste Kurstermin aus `dates`. Falls Unterlagen, Onboarding oder persönliche Begleitung schon davor beginnen, muss stattdessen dieser frühere Leistungsbeginn in der Logik berücksichtigt werden.

## Formulare

Beide Formulare senden an denselben Formcarry-Endpunkt aus `assets/course-config.js`. Der Endpunkt darf nur dort geändert werden. Empfängerin ist `julia@juliasutter.de`. Falls JavaScript nicht verfügbar ist, zeigt die Seite stattdessen einen direkten E-Mail-Kontakt und verhindert einen wirkungslosen POST an GitHub Pages.

Bei offenen Kursen können Freund:innen den gemeinsamen Tarif wählen. Jede Person meldet sich selbst an und nennt die andere Person; Elternpaare besuchen getrennte Kurse zum regulären Preis. Die Bestellübersicht und das übermittelte Feld `price_eur` verwenden denselben ausgewählten Preis aus der Kurskonfiguration. Beim Freund:innen-Tarif werden zusätzlich `friend_registration=yes` und `friend_name` übermittelt. Unverbindliche Anfragen und Wartelisteneinträge enthalten diese Preis- und Freund:innen-Felder nicht.

Nach einer bestätigten erfolgreichen Formcarry-Antwort ersetzt eine große Bestätigung das jeweilige Formular. Bei Anmeldungen zeigt sie Kursdatum und Preis aus den abgeschickten Daten. Kontakt, Warteliste und unverbindliche Anfrage verwenden eigene Texte. Die Bestätigung erhält den Fokus und wird ins Blickfeld gescrollt; sie bleibt beim Wechsel zwischen den Formular-Tabs erhalten. Bei Fehlern bleiben Formular und Eingaben stehen. Die Bestätigung gilt für den aktuellen Seitenbesuch; sie ersetzt keine serverseitige Erkennung doppelter Einreichungen und versendet selbst keine E-Mail.

## Kostenfreies Kennenlerngespräch

`introCallUrl` und `introCallEmbedUrl` in `assets/course-config.js` enthalten den öffentlichen Buchungslink und die kanonische Google-Kalender-Einbettung mit `gv=true`. Bei einer Änderung des Direktlinks müssen auch die statischen `data-booking-trigger`-Links in beiden Sprachseiten aktualisiert werden; `npm run check:site` prüft ihre Übereinstimmung.

Die Gesprächslinks öffnen einen nativen Dialog, mobil bildschirmfüllend. Das iframe wird erst beim ersten Klick erzeugt und während des Seitenbesuchs wiederverwendet. Vorher werden keine Google-Ressourcen für die Buchung geladen. Ohne JavaScript oder Dialog-Unterstützung führen die Links direkt zur Buchungsseite. Der Dialog enthält nur den Kopfbereich mit Schließen-Button und die Terminauswahl; eine Fußzeile mit zusätzlichen Links gibt es nicht. Buchung und Bestätigung liegen vollständig bei Google; die Website liest keine Buchungsdaten oder Erfolgszustände aus.

Der Dialog schließt über seinen sichtbaren Schließen-Button oder Escape, solange der Fokus im Website-Dialog liegt. Innerhalb des fremden Google-Frames verarbeitet Google Tastatureingaben selbst; dort kann Escape nicht durch die Website abgefangen werden. Der Schließen-Button bleibt außerhalb des Frames erreichbar. Wenn Google-Inhalte nicht laden, kann der Dialog weiterhin geschlossen werden.

Terminbeschreibung, freie Zeiten und Google Meet werden in Google Kalender gepflegt. Die englische Website verwendet dieselbe Buchungsseite und deren dort gepflegten Beschreibungstext. Die Datenschutzhinweise beider Sprachen beschreiben die Einbettung.

## Optionale Meta-Werbemessung

`assets/measurement-config.js` enthält die öffentliche Pixel-ID des Datensatzes „Julia Sutter · Website“. Ohne konfigurierte ID ist die Messung deaktiviert. `assets/measurement.js` lädt Meta nur auf der deutschen und englischen Hauptseite unter `juliasutter.de` oder `www.juliasutter.de`, ausschließlich nach Zustimmung. Lokale Vorschauen zeigen den Banner, übertragen aber keine Ereignisse an Meta. Rechtstextseiten ermöglichen nur die Verwaltung der Einwilligung.

Die Auswahl wird für 180 Tage lokal gespeichert und ist über „Cookie-Einstellungen“ im Footer änderbar. Ablehnen und Widerrufen verhindern weitere Ereignisse, verwerfen wartende Ereignisse und löschen die von dieser Implementierung erreichbaren `_fbp`-/`_fbc`-Cookies. Änderungen gelten auch in anderen offenen Tabs. Vor der Einwilligung erfolgte Handlungen werden nicht nachträglich gemeldet.

Der kurze Einwilligungstext enthält direkt aufklappbare „Datenschutzdetails“ mit Angaben zu Meta, OpenAI, Datenübermittlungen und Speicherung sowie einem Link zum vollständigen Datenschutzhinweis. Das Öffnen der Details erteilt keine Einwilligung. „Einwilligen“ ist farbig hervorgehoben, „Ablehnen“ bleibt als gleich großer umrandeter Button direkt erreichbar.

- `Purchase`: bestätigte erfolgreiche Formcarry-Antwort für eine verbindliche Kursanmeldung, mit dem tatsächlich abgeschickten Preis in EUR. Das bedeutet noch keinen Zahlungseingang.
- `Lead`: bestätigte Kontaktanfrage, unverbindliche Kursanfrage oder Wartelisteneintragung.
- `CalendarOpened`: Öffnen der Google-Terminbuchung; kein Nachweis einer gebuchten Sprechstunde.

Formularinhalte wie Namen, E-Mail-Adressen, Rechnungsadressen und Nachrichten werden nicht an Meta übergeben. Automatischer Abgleich und automatische Ereignisse sind nicht Teil der Implementierung. Im Events Manager müssen automatischer erweiterter Abgleich, automatische Ereignisse und zusätzliche automatische Seiten-/Produktinformationen ausgeschaltet bleiben; die Traffic-Zulassung ist auf `juliasutter.de` samt Subdomains begrenzt. Keine Conversions API eingerichtet.

`tests/measurement.spec.js` prüft die Einwilligung und Ereignisse mit abgefangenen Meta- und Formcarry-Anfragen. Vor Anzeigenstart ist zusätzlich die tatsächliche Übermittlung nach Veröffentlichung im Meta-Testereigniswerkzeug zu kontrollieren, ohne eine erfundene Produktionsbuchung zu erzeugen.

## Lokal ausführen und prüfen

```bash
./dev
```

Der Server benötigt Python 3 und gibt nach dem Start seine vollständige URL aus. Er nutzt Port 8000 oder den nächsten freien Port. `./dev --port 8005` verlangt einen festen Port und bricht ab, wenn dieser belegt ist. `npm run dev` startet denselben Server. Für die Prüfungen einmalig `npm ci` mit Node.js ab 24.8.0 ausführen.

Vollständiger Qualitätslauf:

```bash
npm run test:ci
```

Die Prüfungen benötigen Node.js ab 24.8.0. Die Browsertests starten immer einen eigenen Server aus dem aktuellen Arbeitsverzeichnis. Falls Port 4173 bereits belegt ist (etwa durch eine Vorschau oder einen anderen Worktree), einen freien Testport wählen:

```bash
PLAYWRIGHT_PORT=4183 npm run test:ci
```

Die Dialog-Fokustests und Formularprüfungen laufen zusätzlich in WebKit mit iPhone-Profil und Touch-Ereignissen. Vor dem ersten Testlauf beide Browser installieren: `npx playwright install chromium webkit`. Das ersetzt keine Prüfung auf einem echten iPhone.

## Veröffentlichung

Die Produktionsdomain ist in `CNAME` als `juliasutter.de` hinterlegt. Vor dem DNS-/Framer-Cutover die Schritte in [`docs/cutover-checklist.md`](docs/cutover-checklist.md) abarbeiten.

## Rechtstexte

Die technischen Angaben zu Hosting, Formularverarbeitung, Cookies und Tracking sind an diese Implementierung angepasst. Die Texte ersetzen keine individuelle Rechtsberatung und sollten vor dem Produktionsstart fachlich geprüft werden.
