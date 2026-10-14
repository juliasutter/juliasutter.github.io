# Erfolgsmessung für ChatGPT Ads

## Ereignisse

- `page_viewed`: Seitenbesuch nach Einwilligung. Kein Lead und keine Buchung.
- `lead_created`: Kontaktanfrage, unverbindliche Kursanfrage oder Warteliste, erst nach bestätigtem Erfolg von Formcarry.
- `registration_completed`: verbindliche Kursanmeldung mit erfolgreicher Formcarry-Antwort. Kein Zahlungseingang und keine Teilnahmebestätigung.
- Die Google-Terminbuchung läuft auf einer fremden Domain. Kalenderöffnungen sind keine gebuchten Termine; die Website sendet dafür kein OpenAI-Conversion-Ereignis. Tatsächlich gebuchte Gespräche müssen über die Kalenderbestätigung ermittelt werden; die Herkunft kann Julia beim Gespräch erfragen.

## Einwilligung und Daten

Die öffentliche `openaiPixelId` gehört in `assets/measurement-config.js`. Ohne sie wird kein OpenAI-Pixel geladen. Vor Aktivierung muss in der Datenquelle der automatische erweiterte Abgleich deaktiviert und geprüft sein: keine automatische Erfassung und Übertragung gehashter Kontaktangaben.

Die gemeinsame Einwilligung trägt Version 3. Frühere Meta-only- oder Meta-plus-UTM-Einwilligungen reichen nicht für OpenAI. Das SDK lädt nur nach aktueller Zustimmung auf den Produktions-Hauptseiten. Lokale Vorschauen und Rechtstextseiten senden keine Ereignisse. Der eigene Ereignispuffer wird bei Widerruf geleert, auch wenn das SDK noch lädt. Widerruf setzt zusätzlich die SDK-Einwilligung auf `false` und löscht erreichbare `__oppref`- und `__obref`-Cookies. Formularinhalte werden nicht an OpenAI übergeben; Ereignisse setzen `opt_out: true`.

Die bestehende Zuordnung für Julia bleibt separat: erlaubte UTM-Kampagnenangaben werden nach Einwilligung für höchstens 30 Minuten im Browser-Tab gehalten und mit Formularen an Formcarry gesendet. Sie identifizieren Quelle, Kampagne und Anzeige; persönliche Click-IDs und Suchbegriffe gehören nicht ins Formular. OpenAI ordnet Ereignisse über seine eigenen Kennungen zu. Abgelehnte Messung, gelöschte Cookies, Browserblocker und Besuche auf anderen Geräten begrenzen die Zuordnung. Fehlende gemessene Conversions sind kein Beweis für fehlende tatsächliche Anfragen.

## Einrichtung und Prüfung

1. Datenquelle im OpenAI Ads Manager erstellen und automatischen erweiterten Abgleich deaktivieren.
2. Getrennte Conversion-Definitionen für `lead_created` (Anfragen) und `registration_completed` (verbindliche Kursanmeldungen) anlegen und für die laufende Kampagne zur Auswertung verknüpfen. Budget, CPC-Gebot und Klickoptimierung beibehalten.
3. Öffentliche Pixel-ID konfigurieren, vollständige Repo-Prüfungen und Datenschutz-/Einwilligungsreview abschließen, dann veröffentlichen.
4. Die veröffentlichten Dateien mit dem geprüften Stand vergleichen. Einen echten Seitenbesuch nach Einwilligung im OpenAI-Ereignisstream prüfen. Keine erfundenen Anfragen, Kursanmeldungen oder Zahlungseingänge als Produktionsereignisse senden.
5. Anfrage- und Anmeldungsereignisse werden lokal mit abgefangenen Formcarry- und OpenAI-Aufrufen geprüft. Den Eingang des ersten echten Formularereignisses später im Ereignisstream kontrollieren; erst die Berichte zeigen die Zuordnung zur Kampagne.

Dokumentation: https://developers.openai.com/ads/measurement-pixel und https://developers.openai.com/ads/supported-events
