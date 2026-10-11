import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const directory = fileURLToPath(new URL("../artifacts/meta-ads-2026-10/", import.meta.url));
await mkdir(directory, { recursive: true });

const ads = [
  {
    id: "gefuehle", name: "Große Gefühle begleiten", theme: "paper",
    heading: "Kleiner Schritt.<br>Großes Gefühl.",
    subtitle: "Wut, Angst und Traurigkeit begleiten.<br>Mit Nähe zum Kind und Unterstützung für dich.",
    image: "../oktoberkurs-designvarianten-2026/papierwelt-playlistening.png",
    primaryText: "Manchmal fühlt sich eine Kleinigkeit riesengroß an. In der Hand in Hand Parenting Starter Class übst du, Wut, Angst und Traurigkeit zu begleiten – mit Nähe zum Kind und Unterstützung für dich.\n\n6 Wochen live online, eine kleine Gruppe und konkrete Werkzeuge für euren Alltag. Mit 60 Minuten Einzelcoaching und WhatsApp-Begleitung durch Julia Sutter, zertifizierte Hand in Hand Parenting Instructorin.\n\nStart am 17. Oktober · samstags 9–11 Uhr · 399 € pro Person. Alle Termine und die Anmeldung findest du auf der Website. Noch unsicher? Dort kannst du auch ein kostenfreies 20-Minuten-Gespräch buchen.",
    headline: "Online-Elternkurs ab 17. Oktober",
    description: "6 Wochen · kleine Gruppe · persönliche Begleitung"
  },
  {
    id: "grenzen", name: "Grenzen und Verbindung", theme: "cream",
    heading: "Klar bleiben.<br>Nah bleiben.",
    subtitle: "Liebevoll Grenzen setzen.<br>Großen Gefühlen Raum geben.",
    primaryText: "Eine Grenze darf klar sein. Und die Verbindung darf bleiben.\n\nWie das im Familienalltag aussehen kann, übst du in der Hand in Hand Parenting Starter Class. Du lernst fünf Werkzeuge kennen, probierst sie zu Hause aus und besprichst deine Erfahrungen in einer kleinen Gruppe. Besonders passend für Eltern von Kindern zwischen etwa 2 und 10 Jahren.\n\n6 Samstage ab 17. Oktober, 9–11 Uhr, live online. Inklusive 60 Minuten Einzelcoaching und WhatsApp-Begleitung. 399 € pro Person. Kurs kennenlernen und anmelden – oder zuerst ein kostenfreies 20-Minuten-Gespräch vereinbaren.",
    headline: "Liebevoll Grenzen setzen",
    description: "Hand in Hand Parenting · Start am 17. Oktober"
  },
  {
    id: "halt", name: "Unterstützung für Eltern", theme: "blue",
    heading: "Eltern brauchen<br>auch Halt.",
    subtitle: "Große Gefühle begleiten.<br>Und selbst Unterstützung finden.",
    primaryText: "Auch Eltern brauchen jemanden, der zuhört.\n\nDie Hand in Hand Parenting Starter Class verbindet konkrete Werkzeuge für schwierige Familienmomente mit Unterstützung für dich: Austausch in einer kleinen Gruppe, eine Listening-Partnerschaft, 60 Minuten Einzelcoaching und persönliche WhatsApp-Begleitung.\n\n6 Wochen live online mit Julia Sutter. Start: 17. Oktober · samstags 9–11 Uhr · 399 € pro Person. Auf der Website findest du alle Kursinfos, weitere Termine und ein kostenfreies 20-Minuten-Gespräch zum Kennenlernen.",
    headline: "Unterstützung für euren Familienalltag",
    description: "Online-Elternkurs · 6 Wochen mit Begleitung"
  }
];

const css = `
@font-face{font-family:Lato;src:url('../oktoberkurs-designvarianten-2026/fonts/lato-400.ttf');font-weight:400}
@font-face{font-family:Lato;src:url('../oktoberkurs-designvarianten-2026/fonts/lato-700.ttf');font-weight:700}
@font-face{font-family:Balsamiq;src:url('../oktoberkurs-designvarianten-2026/fonts/balsamiq-sans-700.ttf');font-weight:700}
@font-face{font-family:Anton;src:url('../oktoberkurs-designvarianten-2026/fonts/anton-400.ttf')}
*{box-sizing:border-box}body{margin:0;font-family:Lato,sans-serif}.canvas{width:1080px;height:1350px;position:relative;overflow:hidden;background:var(--bg);color:var(--ink)}
.paper{--bg:#f1e9fa;--ink:#4d315c;--accent:#ffd45d}.cream{--bg:#f5f0e7;--ink:#294942;--accent:#dfb096}.blue{--bg:#263edb;--ink:#fff;--accent:#eeff75}
.content{position:absolute;inset:72px 76px 82px;display:flex;flex-direction:column}.eyebrow{font-size:26px;letter-spacing:2px;text-transform:uppercase;font-weight:700;margin:0 0 32px}h1{font-size:101px;line-height:1.04;letter-spacing:-3px;margin:0 0 25px}.paper h1{font-family:Balsamiq,sans-serif;font-size:100px}.blue h1{font-family:Anton,sans-serif;font-weight:400;font-size:105px;letter-spacing:0;color:var(--accent)}.subtitle{font-size:36px;line-height:1.35;margin:0}.scene{width:100%;height:324px;object-fit:contain;margin:14px 0}.method{font-size:26px;font-weight:700;margin:0 0 14px}.facts{margin-top:auto;padding:28px 31px;background:#fffaf2;color:#294942;border-radius:18px}.date{font-weight:700;font-size:42px;margin:0 0 12px}.details{font-size:31px;line-height:1.45;margin:0}.price{font-weight:700;font-size:33px;margin:15px 0 0}.trust{display:flex;align-items:center;gap:20px;margin-top:26px}.portrait{width:88px;height:88px;object-fit:cover;object-position:50% 25%;border-radius:50%}.name{font-size:29px;font-weight:700;margin:0 0 5px}.role{font-size:22px;margin:0}.seal{width:90px;height:90px;object-fit:contain;margin-left:auto;background:#fff;border-radius:50%;padding:3px}.url{font-size:28px;letter-spacing:.5px;font-weight:700;margin:23px 0 0}.cream .shapes{display:flex;justify-content:center;gap:16px;align-items:center;height:225px;margin:16px 0}.shape{width:132px;height:132px;background:#dfb096;border-radius:52% 48% 48% 52%;transform:rotate(-12deg)}.shape:last-child{background:#b5c6b3;width:178px;height:178px;transform:rotate(17deg)}.blue .promise{font-size:34px;line-height:1.55;margin:34px 0;color:var(--accent)}.story{height:1920px}.story .content{top:270px;bottom:410px}.story .scene{height:315px}.story h1{font-size:100px}
`;
const escape = (value) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const outputs = [];
for (const ad of ads) {
  for (const format of ["feed", "story"]) {
    const filename = `${ad.id}-${format}.html`;
    const visual = ad.image ? `<img class="scene" src="${ad.image}" alt="Fiktive Papiercollage: Kind und Mutter lachen beim gemeinsamen Spiel">` : ad.id === "grenzen" ? '<div class="shapes" aria-hidden="true"><span class="shape"></span><span class="shape"></span></div>' : '<p class="promise">Eine kleine Gruppe.<br>Zeit für deine Fragen.<br>Werkzeuge für euren Alltag.</p>';
    const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${ad.name}</title><style>${css}</style></head><body><main class="canvas ${ad.theme} ${format === "story" ? "story" : ""}"><div class="content"><p class="eyebrow">Live online · Elternkurs</p><h1>${ad.heading}</h1><p class="subtitle">${ad.subtitle}</p>${visual}<div class="facts"><p class="method">Hand in Hand Parenting · Starter Class</p><p class="date">Ab 17. Oktober 2026</p><p class="details">6 Samstage · 9–11 Uhr<br>Inklusive 60 Min. Einzelcoaching</p><p class="price">399 € pro Person</p></div><div class="trust"><img class="portrait" src="../../assets/images/julia-headshot.jpg" alt="Julia Sutter"><div><p class="name">Mit Julia Sutter</p><p class="role">Zertifizierte Hand in Hand Instructorin</p></div><img class="seal" src="../../assets/images/certified-instructor.png" alt="Certified Instructor"></div><p class="url">Kurs kennenlernen · juliasutter.de</p></div></main></body></html>`;
    await writeFile(directory + filename, html);
    outputs.push({ adId: ad.id, format, source: filename, export: `${ad.id}-${format}.jpg`, width: 1080, height: format === "feed" ? 1350 : 1920 });
  }
}

const campaign = {
  status: "created_in_meta_inactive_draft", preparedOn: "2026-10-10",
  meta: {
    businessId: "1593733235570443", pageId: "1347170898485193",
    pageUrl: "https://www.facebook.com/profile.php?id=61594944944862",
    adAccountId: "2078353439472400", datasetId: "1413667660358552",
    campaignId: "120246675416200669", adSetId: "120246675416190669",
    campaignEnabled: false, published: false,
    paymentStatus: "Verification pending, reported by user",
    instagramIdentity: "Facebook page identity offered but selection does not persist; unresolved",
    previewStatus: "Facebook feed renders; Instagram and story previews remain incomplete",
    measurementStatus: "Published on 2026-10-11; live files match reviewed source and rejection persists without Meta requests. Browser blocks fbevents.js with ERR_BLOCKED_BY_CLIENT after consent; receipt in Meta Test Events not yet verified.",
    websiteDeployment: { approved: true, date: "2026-10-11", commit: "13d9e3d", url: "https://juliasutter.de/" },
    securityStatus: "Portfolio does not require two-factor authentication yet; personal account setup needs user verification",
    automaticAdvancedMatching: false, automaticEvents: false,
    conversionsApi: false, allowedTrafficDomain: "juliasutter.de (including subdomains)"
  },
  name: "Starter Class | Oktober 2026 | DE | Test",
  objective: "Sales", conversionLocation: "Website", optimizationEvent: "Purchase",
  launchRequirements: ["Payment verification completed", "Instagram identity saved and all selected placement previews checked", "Live consent-gated tracking verified in Meta (temporary browser-blocker exception awaiting approval)", "Personal two-factor authentication verified and portfolio requirement configured", "Final ad review and launch approval", "Exact remaining capacity confirmed"],
  budget: { lifetimeMediaEur: 150, optionalReserveEur: 50, currency: "EUR", note: "150 EUR initial media cap; optional 50 EUR requires a decision based on results. Tax treatment must be confirmed before activation; VAT may increase cash cost." },
  schedule: { start: "after setup and approval", endExclusive: "2026-10-17T09:00:00+02:00", timeZone: "Europe/Berlin" },
  audience: { location: "Germany", language: "German", minimumAge: 18, gender: "all", guidance: "Adults only. Creative addresses parents of children 2–10, especially mothers of children 2–8. Do not invent exact audience estimates. Avoid fragmenting the test into multiple interests or countries." },
  placements: ["Facebook Feed", "Instagram Feed", "Facebook Stories", "Instagram Stories"],
  excludedPlacementSpendAllowed: false,
  adSetCount: 1, initialAdCount: 2, reserveAd: "halt",
  evaluation: { targetCacEur: 30, primary: "confirmed binding course registrations", secondaries: ["successful contact form", "verified introduction appointment, if confirmation data is available"], diagnosticOnly: ["booking calendar opened", "landing page visit"], review: "Manual review at approximately 50 EUR spend. Fix delivery or funnel failures; do not treat this sample as a conclusive creative test. Stop October ads when full or at course start." },
  currentCourses: [
    { start: "2026-10-17", end: "2026-11-21", time: "Saturday 09:00–11:00" },
    { start: "2027-01-13", end: "2027-02-17", time: "Wednesday 20:00–22:00" },
    { start: "2027-02-20", end: "2027-03-27", time: "Saturday 09:00–11:00" }
  ],
  ads: ads.map(({ id, name, primaryText, headline, description }) => ({ id, name, metaAdId: id === "gefuehle" ? "120246675416210669" : id === "grenzen" ? "120246675630640669" : null, primaryText, headline, description, cta: "Details ansehen", destination: `https://juliasutter.de/?utm_source=meta&utm_medium=paid_social&utm_campaign=starter_oct2026&utm_content=${id}#starter-class` })),
  exports: outputs,
  provenance: { offer: "Website, local course-config.js and user confirmations on 2026-10-10; live 2027 dates verified after reload", portrait: "assets/images/julia-headshot.jpg", illustration: "Existing fictional AI paper-collage illustration from approved WhatsApp flyer", exclusions: "No photos of the user's children; no fabricated testimonials, results or scarcity claims", artwork: "Deterministic HTML/CSS composition, local fonts from existing licensed flyer assets" }
};
await writeFile(directory + "campaign.json", JSON.stringify(campaign, null, 2) + "\n");
await writeFile(directory + "index.html", `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Meta Ads · Julia Sutter</title><style>body{margin:0;background:#f5f0e7;color:#294942;font:16px/1.55 system-ui,sans-serif;padding:32px}main{max-width:1300px;margin:auto}h1{font-size:36px;margin-bottom:8px}.status{display:inline-block;background:#e6dbc7;padding:6px 12px;border-radius:9px}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px;margin-top:24px}article{min-width:0}img{width:100%;border-radius:12px}details{margin:14px 0;padding:15px;background:white;border-radius:12px}p.copy{white-space:pre-line}a{color:#294942}h2{font-size:22px}.links{display:flex;gap:16px}table{border-collapse:collapse}td,th{padding:8px 20px 8px 0;text-align:left}@media(max-width:800px){.grid{grid-template-columns:1fr}body{padding:20px}}</style></head><body><main><span class="status">Zwei Entwürfe in Meta angelegt · Kampagne ausgeschaltet</span><h1>Große Gefühle. Klare Grenzen. Halt für Eltern.</h1><p>Start mit zwei Motiven; das dritte bleibt als Alternative. Alle Texte und Bilder sind für diesen Test vorbereitet, nicht als Leistungsversprechen validiert.</p><p>In Meta eingestellt: Deutschland · deutsche Sprache · Facebook &amp; Instagram Feed/Stories · eine Anzeigengruppe · 150 € Laufzeitbudget · Ende am 17.10.2026 um 9 Uhr. Steuerliche Mehrkosten sind vor Aktivierung zu klären.</p><p><strong>Noch offen:</strong> Zahlungsmittel-Verifizierung, Instagram-Zuordnung und vollständige Platzierungsvorschauen. Website, Einwilligungsbanner und Buchungsmessung sind seit 11.10.2026 veröffentlicht. Ablehnung funktioniert im Live-Test; nach Zustimmung blockiert der Testbrowser noch das Meta-Skript. Der Empfang in Meta ist deshalb noch nicht bestätigt. Die Zwei-Faktor-Anmeldung muss mit Julia geprüft werden.</p><div class="grid">${ads.map((ad, i) => `<article><h2>${i + 1}. ${ad.name}</h2><img src="${ad.id}-feed.jpg" alt="${ad.name}"><p class="links"><a href="${ad.id}-feed.jpg" download>Feed · JPG</a><a href="${ad.id}-story.jpg" download>Story · JPG</a></p><details><summary>Anzeigentext &amp; Link</summary><p class="copy">${escape(ad.primaryText)}</p><p><b>${escape(ad.headline)}</b><br>${escape(ad.description)}</p><a href="${escape(campaign.ads[i].destination)}">Zielseite ansehen</a></details></article>`).join("")}</div><details><summary>Tracking und Erfolgskriterien</summary><p>Primär: eine vom Formularanbieter bestätigte verbindliche Anmeldung. Kontaktanfragen separat zählen. Das Öffnen des Google-Kalenders ist noch keine Terminbuchung. Meta-Tracking erst nach Einwilligung; keine Formularinhalte oder Angaben zu Kindern an Meta übertragen.</p><p>30 € pro Buchung bleibt ein Ziel, keine Prognose. Bei 150 € Kosten entsprechen 1 / 3 / 4 Buchungen einem CAC von 150 / 50 / 37,50 €. Erstattungen und Zahlungseingänge werden getrennt geprüft.</p></details><p><a href="campaign.json">Gespeicherte Einstellungen und offene Schritte</a></p></main></body></html>`);
console.log(directory);
