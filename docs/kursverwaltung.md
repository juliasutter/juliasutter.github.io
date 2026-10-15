# Kursverwaltung

Die eigene Oberfläche ist nach der Veröffentlichung direkt unter https://juliasutter.de/verwaltung/ erreichbar. Sie ist nicht auf der Website verlinkt, fehlt in der Sitemap und verwendet `noindex`. Ihre URL und der Quellcode sind im öffentlichen Repository trotzdem auffindbar. GitHub schützt den tatsächlichen Änderungszugriff.

## Einmalige Einrichtung nach Freigabe der Veröffentlichung

1. Den geprüften Stand lokal nach `main` integrieren. Vor dem anschließenden Push muss unverändert der vollständige Lauf `npm run test:ci` bestehen.
2. In den GitHub-Repository-Einstellungen unter **Pages → Build and deployment → Source** die Quelle auf **GitHub Actions** umstellen. Die vorhandene Domain `juliasutter.de` und HTTPS beibehalten.
3. Im Environment `github-pages` Veröffentlichungen von `main` erlauben. Repository-Regeln dürfen den hier vorgesehenen normalen Fast-forward-Push des `GITHUB_TOKEN` nicht blockieren. Schutzregeln nicht pauschal deaktivieren; wenn diese zwingend PRs verlangen, muss der Veröffentlichungsablauf daran angepasst werden.
4. Den geprüften Stand nach `main` pushen. Der Workflow **Site quality** startet dadurch automatisch. Er prüft den Stand, lädt ausschließlich die explizit erlaubten öffentlichen Dateien hoch, veröffentlicht und kontrolliert die ausgelieferte Datenversion. Für einen späteren erneuten Durchlauf kann er auf `main` ohne Kurs-Inputs manuell gestartet werden.
5. Unter Julias GitHub-Konto einen **Fine-grained personal access token** anlegen: Resource owner des Repositorys, ausschließlich `juliasutter.github.io`, Repository permission **Actions: Read and write**. Metadata wird automatisch ergänzt. Keine direkten Contents-Schreibrechte erforderlich. Ein angemessenes Ablaufdatum wählen und die Erneuerung einplanen.
6. In Apple Passwörter einen Eintrag für `https://juliasutter.de` mit Julias GitHub-Benutzernamen und dem Token als Passwort speichern. Safari-Autofill/Touch ID aktivieren. Der Token gehört niemals in Git, Chat, URLs oder Dokumentation.
7. In `/verwaltung/` anmelden und zunächst die vorhandenen Kurse prüfen. Die erste echte Kursveröffentlichung muss mit einem autorisierten, sinnvollen Datenupdate erfolgen; keine erfundenen Produktionsbuchungen zum Testen erzeugen.

Die produktive Einrichtung wurde durch die lokale Implementierung nicht vorgenommen. Safari-Autofill auf einem echten Apple-Gerät und ein echtes GitHub-/Pages-Deployment sind gesonderte Abnahmeprüfungen.

## Alltag

**Plätze ändern:** Direkt in der Übersicht auf − oder + klicken. Die Zahl und der lokale Entwurf werden sofort aktualisiert. Angemeldet werden Änderungen nach einer kurzen Klickpause automatisch veröffentlicht. Schnelle Klicks werden zusammengefasst; während eines laufenden Auftrags sammelt die Oberfläche weitere Änderungen und veröffentlicht den neuesten Stand erst nach dessen Abschluss. Es läuft aus dieser Sitzung immer nur ein Auftrag. Andere lokale Kursentwürfe werden dabei nicht veröffentlicht. Bei Fehlern bleiben die Änderungen erhalten; **Erneut versuchen** gleicht sie erneut ab. Ein unklarer Dispatch wird anhand seiner gespeicherten Auftragskennung geprüft, ohne einen zweiten Auftrag zu senden. Das funktioniert auch nach Neuladen und erneuter Anmeldung. GitHub benötigt weiterhin einige Minuten; erst die bestätigte ausgelieferte Version gilt als veröffentlicht. Bei Schließen oder Abmelden pausieren noch nicht übertragene Änderungen bis zur erneuten Anmeldung in diesem Browser.

**Neuen Kurs planen:** Startdatum und gemeinsame Zeit prüfen. Die sechs wöchentlichen Termine, Anmeldeschluss am Vortag um 21 Uhr, Online-Format, sieben Gesamtplätze und sieben freie Plätze sind voreingestellt. Bei einem neuen Kurs folgt die freie Platzanzahl Änderungen der Gesamtkapazität, solange sie nicht separat geändert wurde. Kursnamen können leer bleiben: Die grauen Vorschläge aus Jahreszeit, Jahr, Wochentag und Tageszeit werden beim Speichern übernommen, auf Deutsch und Englisch. Bestehende eigene Namen bleiben erhalten.

**Ausnahmen:** Einzelne Termine und Uhrzeiten sowie Preise, englischer Name, Anmeldeschluss und Sichtbarkeit sind aufklappbar. Bei **Vor Ort** erscheint der verpflichtende öffentliche Veranstaltungsort; bei **Online** entfällt er. Keine privaten Einwahldaten eintragen. Individuell geänderte Termine oder Fristen werden beim Verschieben des Startdatums erhalten. **Wieder wöchentlich ab erstem Termin** setzt die Terminfolge und abweichenden Uhrzeiten bewusst zurück. Ein leerer Freund:innenpreis deaktiviert diesen Tarif.

**Entwürfe veröffentlichen:** Neue Kurse und weitere Bearbeitungen mit **Entwurf speichern** übernehmen, gesammelt über **Änderungen ansehen → Jetzt veröffentlichen** prüfen und veröffentlichen. Entwürfe und ihre ursprüngliche Datenbasis liegen lokal in diesem Browser. Die Anwendung hält den Token nur im Arbeitsspeicher bis zum Neuladen oder Abmelden. Apple Passwörter übernimmt die Zugangsdaten.

**Automatisches Archiv:** Zukünftige und laufende Kurse stehen unter **Aktuelle Kurse**. Erst ab dem Ende des letzten Termins wechseln sie automatisch in das eingeklappte Archiv. Dafür wird nichts veröffentlicht und nichts gelöscht. Frühere manuell archivierte Datensätze bleiben ebenfalls dort erhalten. Öffentlich verschwinden Kurse weiterhin schon mit dem Beginn des ersten Termins. Veröffentlichte Kursdaten und Git-Historie sind öffentlich; Teilnehmerdaten gehören nicht hierher.

Zeitzone ist `Europe/Berlin` (in der Oberfläche „Deutsche Zeit“), einschließlich Sommer- und Winterzeit. Nicht existierende oder doppeldeutige Uhrzeiten werden abgelehnt. Die Gesamtzahl ist im Editor verpflichtend, mit sieben als Vorgabe bei neuen und bislang unbekannten Kapazitäten (mindestens vorhandene freie Plätze). Bestehende Daten ohne Kapazität bleiben bis zur Bearbeitung unverändert.

## Veröffentlichung und Fehler

Die UI startet ausschließlich `site-quality.yml` auf `main` mit Kursliste, erwarteter Commit-ID und Veröffentlichungskennung. Der Prüfschritt besitzt keine Schreibrechte. Er validiert sämtliche Kursdaten und führt die vollständige Qualitätssuite aus. Erst der nachgelagerte Veröffentlichungsschritt erhält Contents-/Pages-Schreibrechte und reproduziert exakt die getestete Datenversion. Änderungen sind auf Kursdaten und ihre erzeugten Dateien beschränkt. Ein normaler Git-Push verhindert das Überschreiben konkurrierender Commits; es gibt keinen Force-Push.

Der Workflow baut und veröffentlicht Pages ausdrücklich, da ein Push mit dem automatischen `GITHUB_TOKEN` keinen weiteren Pages-Build auslöst. Das Artefakt enthält ausschließlich Website-Dateien; beispielsweise `.git`, Abhängigkeiten, Tests, interne Dokumente und private Werbeunterlagen werden nicht hochgeladen. Die Oberfläche meldet Erfolg erst nach erfolgreichem Workflow und übereinstimmender öffentlicher Datenversion.

- **Token ungültig/abgelaufen:** Token ersetzen und den Apple-Passwörter-Eintrag aktualisieren. Lokale Entwürfe bleiben bestehen.
- **Zugriff verweigert:** Repository-Auswahl, Actions-Schreibrechte und GitHub-Anfragelimit prüfen.
- **Main geändert:** Unabhängige Kursänderungen werden beim erneuten Abgleich erhalten. Wenn derselbe Kurs beidseitig verändert wurde, wird nicht veröffentlicht; der lokale Entwurf bleibt erhalten. Aktuelle Kursdaten auf GitHub mit dem Entwurf vergleichen und die gewünschten Werte nach bewusstem Neuladen erneut übernehmen.
- **Prüfung fehlgeschlagen:** Den verlinkten Workflow prüfen. Keine Veröffentlichung erfolgt vor bestandener Qualitätssuite.
- **Commit erfolgreich, Deployment fehlgeschlagen:** Den fehlgeschlagenen Workflow auf GitHub erneut starten; der unveränderte geprüfte Stand bleibt im Repository. Die UI meldet das ausdrücklich als Fehler, nicht als erfolgreiche Veröffentlichung.
- **Öffentliche Version noch nicht bestätigt:** Den Status später erneut prüfen. Ein erfolgreicher Commit allein bedeutet noch keine ausgelieferte Änderung.

Die Tests verwenden feste Kursfixtures, damit Julia veröffentlichte Termine ändern oder löschen kann, ohne Tests an Geschäftsdaten anpassen zu müssen. `./dev` bietet unter `/verwaltung/` zusätzlich den ausschließlich lokal sichtbaren Button **Lokalen Entwurf öffnen**; diese Vorschau kann ohne Token nicht veröffentlichen.
