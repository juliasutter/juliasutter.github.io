# juliasutter.de

Statische, zweisprachige Website für Julia Sutter. Die deutsche Version unter `/` ist primär, die englische Version liegt unter `/en/`. Die Seite wird ohne Laufzeit-Framework, Cookies oder Tracking über GitHub Pages ausgeliefert.

## Starter-Class-Termine aktualisieren

Alle Kursdaten stehen ausschließlich in [`assets/course-config.js`](assets/course-config.js). Für einen neuen Kurs den dort auskommentierten Beispielblock kopieren, die sechs Termine im Format `YYYY-MM-DD` eintragen und den Status setzen:

- `open`: zeigt Termine und „Verbindlich anmelden“; Rechnungsadresse und Vertragsbestätigungen werden automatisch Pflichtfelder.
- `waitlist`: zeigt Termine und „Auf die Warteliste“; die Anmeldung bleibt unverbindlich.
- `closed`: blendet den Kurs aus.
- Keine sichtbaren zukünftigen Kurse: die gesamte Seite wechselt automatisch auf „Kursplatz anfragen“.

Vergangene Kurse verschwinden automatisch, sobald ihr letzter Termin vorbei ist. Offene Kurse und Wartelistenkurse können gleichzeitig angeboten werden; die Auswahl schaltet das Formular passend um. Deutsche und englische Seite nutzen dieselbe Konfiguration.

## Formulare

Beide Formulare senden an denselben Formcarry-Endpunkt aus `assets/course-config.js`. Der Endpunkt darf nur dort geändert werden. Empfängerin ist `julia@juliasutter.de`. Falls JavaScript nicht verfügbar ist, zeigt die Seite stattdessen einen direkten E-Mail-Kontakt und verhindert einen wirkungslosen POST an GitHub Pages.

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
