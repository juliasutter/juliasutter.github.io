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

Kurse anlegen oder duplizieren, Plätze und Termine bearbeiten und **Entwurf speichern** wählen. Entwürfe und ihre ursprüngliche Datenbasis werden lokal in diesem Browser gespeichert. Erst **Änderungen ansehen → Jetzt veröffentlichen** übergibt sie an GitHub. Apple Passwörter übernimmt die Zugangsdaten; die Anwendung hält den Token nur im Arbeitsspeicher bis zum Neuladen oder Abmelden.

Die sechs Termine können unterschiedliche Wochentage und Uhrzeiten haben. Leere Uhrzeitfelder eines Termins übernehmen die gemeinsame Kurszeit. Abweichungen werden auf der Website als einzelne Termine ausgewiesen. Sommer- und Winterzeit werden für Berlin berechnet; nicht existierende oder doppeldeutige Uhrzeiten werden abgelehnt.

Die Gesamtzahl der Plätze ist optional. Freie Plätze dürfen sie nicht überschreiten. Bestehende unbekannte Gesamtkapazitäten werden nicht erfunden. Ein leerer Freund:innenpreis deaktiviert diesen Tarif für den jeweiligen Kurs. Der öffentliche Veranstaltungsort darf keine privaten Einwahldaten enthalten.

Archivieren bewahrt den Kurs in den veröffentlichten Kursdaten, blendet ihn öffentlich aber aus. Vergangene Kurse werden automatisch separat angezeigt. Lokale Entwürfe verlassen den Browser erst bei der Veröffentlichung; veröffentlichte und archivierte Kursdaten sowie Git-Historie sind öffentlich. Teilnehmerdaten gehören nicht hierher.

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
