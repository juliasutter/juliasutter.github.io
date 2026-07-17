# Cutover-Checkliste für juliasutter.de

## Vor dem Umschalten

- Formcarry-Endpunkt in `assets/course-config.js` eingetragen und beide Formulare mit Testdaten erfolgreich empfangen.
- Formcarry-Empfängerin `julia@juliasutter.de`, Spam-Schutz und Auftragsverarbeitung geprüft.
- `npm run test:ci` vollständig erfolgreich.
- Deutsche und englische Inhalte, Preise, Kursmodus und Kontaktdaten von Julia freigegeben.
- Impressum, Datenschutz, AGB und Widerruf fachlich geprüft.
- GitHub Pages für den Branch `main` aktiviert; Custom Domain zeigt `juliasutter.de` und HTTPS ist erzwungen.
- Aktuelle DNS-Einträge und Framer-Konfiguration vor Änderungen dokumentiert.

## Umschalten

- DNS gemäß den aktuellen GitHub-Pages-Anweisungen für die Apex-Domain setzen.
- Erst nach erfolgreicher DNS-Prüfung die Custom Domain in GitHub Pages bestätigen.
- Produktion unter `https://juliasutter.de/`, `/en/`, allen Legal-Routen und `/404.html` prüfen.
- Beide Formulararten noch einmal mit klar gekennzeichneten Testdaten absenden.

## Nach dem Umschalten

- HTTPS, Canonicals, Sprachalternativen, Sitemap und `robots.txt` prüfen.
- Mobile Menü, FAQ, Kursumschaltung und Formulare auf iPhone und Android gegenprüfen.
- Framer erst kündigen, wenn Website, DNS und Formulare mindestens 48 Stunden stabil laufen.
