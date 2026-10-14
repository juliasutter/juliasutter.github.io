# Erfolgsmessung für ChatGPT Ads

## Ereignisse

- `page_viewed`: Seitenbesuch nach Einwilligung. Kein Lead und keine Buchung.
- `lead_created`: Kontaktanfrage, unverbindliche Kursanfrage oder Warteliste, erst nach bestätigtem Erfolg von Formcarry.
- `registration_completed`: verbindliche Kursanmeldung mit erfolgreicher Formcarry-Antwort. Kein Zahlungseingang und keine Teilnahmebestätigung.
- Die Google-Terminbuchung läuft auf einer fremden Domain. Kalenderöffnungen sind keine gebuchten Termine; die Website sendet dafür kein OpenAI-Conversion-Ereignis. Tatsächlich gebuchte Gespräche müssen über die Kalenderbestätigung ermittelt werden; die Herkunft kann Julia beim Gespräch erfragen.

## Einwilligung und Daten

Die öffentliche `openaiPixelId` in `assets/measurement-config.js` ist `6jutvWmnqn6q1ZqrR2aDPL`. Die Datenquelle heißt „Julia Sutter | Website | Anfragen und Kursanmeldungen“. Die Ereignisdefinitionen heißen „Anfrage erfolgreich gesendet“ (`lead_created`) und „Verbindliche Kursanmeldung“ (`registration_completed`).

Die gemeinsame Einwilligung trägt Version 3. Frühere Meta-only- oder Meta-plus-UTM-Einwilligungen reichen nicht für OpenAI. Messung erfolgt nur nach aktueller Zustimmung auf den Produktions-Hauptseiten. Lokale Vorschauen und Rechtstextseiten senden keine Ereignisse.

Da die aktuelle Oberfläche keinen Schalter zum Abschalten des automatischen Kontaktabgleichs bietet, lädt die Website kein OpenAI-SDK. Stattdessen fügt sie beim bestätigten Ereignis ein verborgenes Bild mit dem dokumentierten Image-Tag-Endpunkt ein. Der Request enthält nur `pid`, `event`, `data[type]`, eine zufällige `event_id` und optional `oppref`; der Referrer wird auf die Domain begrenzt. Keine Formularfelder, Kontaktangaben, Bestellnummern oder URL-Suchparameter gelangen in diesen Request. Der Bild-Endpunkt dokumentiert keinen `opt_out`-Parameter; ein solcher Widerspruch wird daher nicht behauptet.

Eine `oppref`-Kennung aus dem Anzeigenlink wird erst nach Zustimmung erfasst, aus der sichtbaren URL entfernt und im lokalen Browserspeicher unter `julia-openai-click-v1` aufbewahrt. Ihre Gültigkeit für die Zuordnung endet nach 30 Tagen; die physische Löschung abgelaufener Einträge erfolgt beim nächsten Seitenaufruf. Ohne erneuten Aufruf kann der Eintrag länger im Browser verbleiben. Ein erneuter Besuch mit derselben Kennung verlängert das Fenster nicht. Bei Widerruf wird sie gelöscht; spätere Ereignisse werden verhindert, auch wenn ein Formular gerade noch auf seine Antwort wartet. Schon gesendete Requests lassen sich nicht zurückrufen.

Die bestehende Zuordnung für Julia bleibt separat: erlaubte UTM-Kampagnenangaben werden nach Einwilligung für höchstens 30 Minuten im Browser-Tab gehalten und mit Formularen an Formcarry gesendet. Sie identifizieren Quelle, Kampagne und Anzeige; persönliche Click-IDs und Suchbegriffe gehören nicht ins Formular. Ohne OpenAI-Klickkennung ist eine Zuordnung im Ads Manager nicht gesichert. Abgelehnte Messung, Browserblocker und andere Geräte begrenzen die Zuordnung. Fehlende gemessene Conversions sind kein Beweis für fehlende tatsächliche Anfragen.

## Aktivierung und Prüfung

1. Beide Ereignisdefinitionen mit der bestehenden Kampagne zur Berichterstattung verknüpfen. Klickoptimierung, Budget und Gebot beibehalten.
2. `npm run test:ci` vollständig ausführen und unabhängige Datenschutz-/Implementierungsprüfung abschließen.
3. Die veröffentlichten Dateien mit dem geprüften Stand vergleichen. Einen echten Seitenbesuch nach Einwilligung im OpenAI-Ereignisstream prüfen. Keine erfundenen Anfragen, Kursanmeldungen oder Zahlungseingänge als Produktionsereignisse senden.
4. Anfrage- und Anmeldungsereignisse werden lokal mit abgefangenen Formcarry- und OpenAI-Aufrufen geprüft. Den Eingang des ersten echten Formularereignisses später im Ereignisstream kontrollieren; erst die Berichte zeigen die Zuordnung zur Kampagne.

Dokumentation: https://developers.openai.com/ads/image-tag und https://developers.openai.com/ads/supported-events
