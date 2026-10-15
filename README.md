# juliasutter.de

Statische, zweisprachige Website für Julia Sutter. Die deutsche Version unter `/` ist primär, die englische Version liegt unter `/en/`. Die Seite wird ohne Laufzeit-Framework über GitHub Pages ausgeliefert. Optionale Meta-Werbemessung lädt ausschließlich nach Einwilligung. Google-Terminbuchung wird erst nach einem bewussten Klick geladen; dabei gelten zusätzlich Googles Datenschutz- und Cookie-Regeln.

## Kurse verwalten

Die eigene Verwaltung liegt unter `/verwaltung/`. Einrichtung, Veröffentlichung, Token und Fehlerbehandlung sind in [docs/kursverwaltung.md](docs/kursverwaltung.md) beschrieben. Es gibt keinen öffentlichen Navigationslink und keinen Sitemap-Eintrag.

Die einzige gepflegte Datenquelle ist `assets/course-config.json`. `npm run build:courses` erzeugt daraus `assets/course-config.js` und `assets/course-version.json`; `./dev` und `npm run test:ci` führen diesen Schritt automatisch aus. Erzeugte Dateien nicht manuell bearbeiten. Die übrigen Website-Einstellungen in der JSON-Datei können über den Kurseditor nicht verändert werden.

Die Verwaltung pflegt sechs Termine, gemeinsame oder abweichende Uhrzeiten, Bezeichnungen DE/EN, Format, öffentlichen Ort, Preise, Anmeldungszahl, Gesamtkapazität und Anmeldeschluss. Die öffentliche Zahl freier Plätze ergibt sich aus Gesamtkapazität minus Anmeldungen. Zeitzone ist `Europe/Berlin`. Neue Kurse erhalten sechs wöchentliche Termine, sieben Gesamtplätze und null Anmeldungen sowie den Vortag um 21 Uhr als Anmeldeschluss. Die vorausgefüllten Namen folgen Datum und Uhrzeit bis zur manuellen Änderung. Der englische Name erscheint beim Bearbeiten des deutschen Namens. Änderungen werden direkt mit „Speichern“ übertragen; Die Plus-/Minus-Buttons zählen Anmeldungen und speichern automatisch. Laufende Veröffentlichungen werden gebündelt und nacheinander abgearbeitet. Es gibt keine gespeicherten Kursentwürfe oder Vorschau vor der Veröffentlichung. Nur die Kennung eines laufenden GitHub-Auftrags bleibt lokal gespeichert, damit Neuladen keinen doppelten Auftrag auslöst. Noch nicht übertragene Änderungen bleiben ausschließlich im geöffneten Fenster. Die nur lokal angebotene Testvorschau setzt Änderungen beim Neuladen zurück. Abgeschlossene Kurse wechseln nach dem Ende des letzten Termins automatisch in das eingeklappte Verwaltungsarchiv. Bestehende Fristen mit explizitem UTC-Offset bleiben gültig.

- `open`: verbindliche Anmeldung; Rechnungsadresse und Bestellübersicht werden eingeblendet.
- `waitlist`: unverbindliche Warteliste; auch hier schließen null freie Plätze die Auswahl aus.
- `closed`: ausgeblendet; `archived: true` blendet ebenfalls aus und bewahrt den Kurs im Verwaltungsarchiv.
- `remainingPlaces`: manuell gepflegte freie Plätze. Bis drei wird die genaue Zahl angezeigt, darüber „Freie Plätze“. Die Website reserviert und zählt keine Anmeldungen.
- Nach Anmeldeschluss bleibt der Kurs bis zum Start als geschlossen sichtbar. Ab Beginn seines ersten Termins verschwindet er aus Übersicht und Auswahl. Ohne buchbare Kurse erscheint die unverbindliche Kursanfrage.

Im geöffneten Formular wird die Verfügbarkeit im Hintergrund aktualisiert (beim Öffnen, bei Rückkehr zum Tab und höchstens einmal je Minute, während es sichtbar ist). Das Absenden wartet nicht auf diesen Abruf. Fehler beim Aktualisieren ändern den Ablauf nicht; bekannte Sperren und Zeitgrenzen werden vor dem Absenden geprüft. Eingaben und Preise werden nicht stillschweigend ersetzt. Tatsächlich geänderte Vertragsangaben müssen über „Aktuelle Kursangaben ansehen“ übernommen werden; unveränderte Anmeldungen benötigen keinen weiteren Schritt. Die Prüfung erfolgt im Browser, nicht bei Formcarry; gleichzeitige Überbuchungen sind dadurch nicht ausgeschlossen.

Beginnt ein Kurs innerhalb der nächsten 14 Kalendertage, erfordert das Formular die Zustimmung zum vorzeitigen Leistungsbeginn. Wenn eine Leistung bereits vor dem ersten Termin beginnt, muss die bestehende Logik vorher entsprechend angepasst werden.

## Formulare

Beide Formulare senden an denselben Formcarry-Endpunkt aus `assets/course-config.json`. Der Endpunkt darf nur in dieser Quelle geändert werden; anschließend `npm run build:courses` ausführen. Empfängerin ist `julia@juliasutter.de`. Falls JavaScript nicht verfügbar ist, zeigt die Seite stattdessen einen direkten E-Mail-Kontakt und verhindert einen wirkungslosen POST an GitHub Pages.

Bei offenen Kursen können Freund:innen den gemeinsamen Tarif wählen. Jede Person meldet sich selbst an und nennt die andere Person; Elternpaare besuchen getrennte Kurse zum regulären Preis. Die Bestellübersicht und das übermittelte Feld `price_eur` verwenden denselben ausgewählten Preis aus der Kurskonfiguration. Beim Freund:innen-Tarif werden zusätzlich `friend_registration=yes` und `friend_name` übermittelt. Unverbindliche Anfragen und Wartelisteneinträge enthalten diese Preis- und Freund:innen-Felder nicht.

Nach einer bestätigten erfolgreichen Formcarry-Antwort ersetzt eine große Bestätigung das jeweilige Formular. Bei Anmeldungen zeigt sie Kursdatum und Preis aus den abgeschickten Daten. Kontakt, Warteliste und unverbindliche Anfrage verwenden eigene Texte. Die Bestätigung erhält den Fokus und wird ins Blickfeld gescrollt; sie bleibt beim Wechsel zwischen den Formular-Tabs erhalten. Bei Fehlern bleiben Formular und Eingaben stehen. Die Bestätigung gilt für den aktuellen Seitenbesuch; sie ersetzt keine serverseitige Erkennung doppelter Einreichungen und versendet selbst keine E-Mail.

## Kostenfreies Kennenlerngespräch

`introCallUrl` und `introCallEmbedUrl` in `assets/course-config.json` enthalten den öffentlichen Buchungslink und die kanonische Google-Kalender-Einbettung mit `gv=true`. Bei einer Änderung des Direktlinks müssen auch die statischen `data-booking-trigger`-Links in beiden Sprachseiten aktualisiert werden; `npm run check:site` prüft ihre Übereinstimmung.

Die Gesprächslinks öffnen einen nativen Dialog, mobil bildschirmfüllend. Das iframe wird erst beim ersten Klick erzeugt und während des Seitenbesuchs wiederverwendet. Vorher werden keine Google-Ressourcen für die Buchung geladen. Ohne JavaScript oder Dialog-Unterstützung führen die Links direkt zur Buchungsseite. Der Dialog enthält nur den Kopfbereich mit Schließen-Button und die Terminauswahl; eine Fußzeile mit zusätzlichen Links gibt es nicht. Buchung und Bestätigung liegen vollständig bei Google; die Website liest keine Buchungsdaten oder Erfolgszustände aus.

Der Dialog schließt über seinen sichtbaren Schließen-Button oder Escape, solange der Fokus im Website-Dialog liegt. Innerhalb des fremden Google-Frames verarbeitet Google Tastatureingaben selbst; dort kann Escape nicht durch die Website abgefangen werden. Der Schließen-Button bleibt außerhalb des Frames erreichbar. Wenn Google-Inhalte nicht laden, kann der Dialog weiterhin geschlossen werden.

Terminbeschreibung, freie Zeiten und Google Meet werden in Google Kalender gepflegt. Die englische Website verwendet dieselbe Buchungsseite und deren dort gepflegten Beschreibungstext. Die Datenschutzhinweise beider Sprachen beschreiben die Einbettung.

## Optionale Meta-Werbemessung

`assets/measurement-config.js` enthält die öffentliche Pixel-ID des Datensatzes „Julia Sutter · Website“. Ohne konfigurierte ID ist die Messung deaktiviert. `assets/measurement.js` lädt Meta nur auf der deutschen und englischen Hauptseite unter `juliasutter.de` oder `www.juliasutter.de`, ausschließlich nach Zustimmung. Lokale Vorschauen zeigen den Banner, übertragen aber keine Ereignisse an Meta. Rechtstextseiten ermöglichen nur die Verwaltung der Einwilligung.

Die Auswahl wird für 180 Tage lokal gespeichert und ist über „Cookie-Einstellungen“ im Footer änderbar. Ablehnen und Widerrufen verhindern weitere Ereignisse, verwerfen wartende Ereignisse und löschen die von dieser Implementierung erreichbaren `_fbp`-/`_fbc`-Cookies. Änderungen gelten auch in anderen offenen Tabs. Vor der Einwilligung erfolgte Handlungen werden nicht nachträglich gemeldet.

- `Purchase`: bestätigte erfolgreiche Formcarry-Antwort für eine verbindliche Kursanmeldung, mit dem tatsächlich abgeschickten Preis in EUR. Das bedeutet noch keinen Zahlungseingang.
- `Lead`: bestätigte Kontaktanfrage, unverbindliche Kursanfrage oder Wartelisteneintragung.
- `CalendarOpened`: Öffnen der Google-Terminbuchung; kein Nachweis einer gebuchten Sprechstunde.

Formularinhalte wie Namen, E-Mail-Adressen, Rechnungsadressen und Nachrichten werden nicht an Meta übergeben. Automatischer Abgleich und automatische Ereignisse sind nicht Teil der Implementierung. Im Events Manager müssen automatischer erweiterter Abgleich, automatische Ereignisse und zusätzliche automatische Seiten-/Produktinformationen ausgeschaltet bleiben; die Traffic-Zulassung ist auf `juliasutter.de` samt Subdomains begrenzt. Keine Conversions API eingerichtet.

`tests/measurement.spec.js` prüft die Einwilligung und Ereignisse mit abgefangenen Meta- und Formcarry-Anfragen. Vor Anzeigenstart ist zusätzlich die tatsächliche Übermittlung nach Veröffentlichung im Meta-Testereigniswerkzeug zu kontrollieren, ohne eine erfundene Produktionsbuchung zu erzeugen.

## Lokal ausführen und prüfen

```bash
./dev
```

Der Server benötigt Python 3 und Node.js ab 24.8.0; vor dem Start erzeugt er die Kurskonfiguration und gibt anschließend seine vollständige URL aus. Er nutzt Port 8000 oder den nächsten freien Port. `./dev --port 8005` verlangt einen festen Port und bricht ab, wenn dieser belegt ist. `npm run dev` startet denselben Server. Für die Prüfungen einmalig `npm ci` mit Node.js ab 24.8.0 ausführen.

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
