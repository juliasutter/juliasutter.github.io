import { chromium } from "playwright";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const directory = path.join(root, "artifacts/oktoberkurs-designvarianten-2026");
const shared = `
@font-face{font-family:Lato;src:url('fonts/lato-400.ttf');font-weight:400}
@font-face{font-family:Lato;src:url('fonts/lato-700.ttf');font-weight:700}
@font-face{font-family:Poppins;src:url('fonts/poppins-700.ttf');font-weight:700}
@font-face{font-family:Balsamiq;src:url('fonts/balsamiq-sans-700.ttf');font-weight:700}
@font-face{font-family:Anton;src:url('fonts/anton-400.ttf');font-weight:400}
*{box-sizing:border-box}html,body{width:1080px;height:1920px;margin:0}body{font-family:Lato,Arial,sans-serif}h1,p{margin:0}.canvas{position:relative;width:1080px;height:1920px;overflow:hidden}.eyebrow{position:absolute;left:76px;top:188px;font-size:27px;font-weight:700;letter-spacing:2px;text-transform:uppercase}.subtitle{position:absolute;left:76px;font-size:39px;line-height:1.3}.trust{position:absolute;left:76px;right:76px;top:1518px;height:112px;display:flex;align-items:center;gap:23px}.avatar{width:104px;height:104px;object-fit:cover;object-position:50% 25%;border-radius:50%}.trust-name{font-size:31px;font-weight:700}.trust-role{font-size:24px;margin-top:6px}.seal{width:112px;height:112px;object-fit:contain;margin-left:auto}.facts{position:absolute;left:76px;right:76px}.facts-label{font-size:27px;font-weight:700}.date{font-size:47px;font-weight:700;margin-top:16px}.time{font-size:34px;margin-top:13px}.benefits{font-size:32px;line-height:1.5;margin-top:20px}.cta{position:absolute;left:76px;right:76px;top:1668px;display:flex;align-items:center;justify-content:space-between;padding:20px 30px;text-decoration:none}.cta-label{font-size:26px}.url{font-size:43px;font-weight:700}.arrow{margin-left:13px}a{color:inherit}
`;
const trust = `<div class="trust"><img class="avatar" src="../../assets/images/julia-headshot.jpg" alt="Julia Sutter"><div><p class="trust-name">Mit Julia Sutter</p><p class="trust-role">Zertifizierte Hand in Hand Instructorin</p></div><img class="seal" src="../../assets/images/certified-instructor.png" alt="Hand in Hand Certified Instructor"></div>`;
const cta = (withArrow = true) => `<a class="cta" href="https://juliasutter.de/"><span class="cta-label">Infos &amp; Anmeldung</span><span class="url">juliasutter.de${withArrow ? '<span class="arrow" aria-hidden="true">↗</span>' : ""}</span></a>`;
const facts = `<p class="facts-label">Hand in Hand Parenting · Starter Class</p><p class="date">Start: 17. Oktober 2026</p><p class="time">6 Samstage · 9–11 Uhr · online</p><div class="benefits"><p>4–7 Eltern in einer kleinen Gruppe</p><p>Inklusive 60 Min. Einzelcoaching</p></div>`;
const variants = [
  {
    id: "01-papierwelt", name: "Spielerische Papierwelt", description: "Lavendel, Papiercollage und Bilderbuchschrift. Das Kind führt im Spiel, Mama spielt mit – beide lachen.",
    style: `
body{background:#f1e9fa;color:#4d315c}.canvas::before{content:'';position:absolute;left:-140px;top:-220px;width:680px;height:380px;border-radius:50%;background:#ffb585;transform:rotate(-14deg)}.canvas::after{content:'';position:absolute;right:-140px;bottom:-200px;width:510px;height:340px;border-radius:50%;background:#ffd45d;transform:rotate(-24deg)}.eyebrow{letter-spacing:1.4px}.play-title{position:absolute;top:272px;left:72px;font:700 108px/1.06 Balsamiq,sans-serif;letter-spacing:-2px}.play-title span{position:relative;z-index:1}.play-title span::before{content:'';position:absolute;z-index:-1;left:-12px;right:-18px;bottom:2px;height:35px;background:#ffd45d;transform:rotate(-2deg);border-radius:42% 20% 27% 10%}.subtitle{top:536px;font-size:40px}.scene{position:absolute;left:34px;top:669px;width:1012px;height:449px;object-fit:contain}.facts{top:1126px;padding:31px 36px 27px;background:#fffdfb;border-radius:12px 25px 16px 27px;transform:rotate(-.6deg)}.facts-label{font-size:26px}.date{font-family:Balsamiq,sans-serif;font-size:49px;margin-top:15px}.benefits{margin-top:13px}.trust{top:1525px}.trust-role{font-size:23px}.cta{background:#4d315c;color:#fffdfb;border-radius:54px;transform:rotate(.4deg)}
`,
    body: `<p class="eyebrow">Online-Elternkurs · ab Oktober</p><h1 class="play-title">Kleiner Schritt.<br><span>Großes Gefühl.</span></h1><p class="subtitle">Wut, Angst und Traurigkeit begleiten.<br>Mit Nähe zum Kind und Unterstützung für dich.</p><img class="scene" src="papierwelt-playlistening.png" alt="Fiktive Playlistening-Szene: Ein lachendes Kind schiebt mit seinen Händen spielerisch Mama zurück in weiche Kissen; beide genießen das Spiel"><div class="facts">${facts}</div>${trust}${cta(false)}`
  },
  {
    id: "02-hand-in-hand", name: "Hand in Hand · fünf Werkzeuge", description: "Aus dem offiziellen Webauftritt abgeleitet: Poppins, Lato, Petrolgrau, Koralle und klare Inhaltskarten.",
    style: `
body{background:#fff;color:#4a6163}.canvas::before{content:'';position:absolute;top:0;left:0;width:1080px;height:32px;background:linear-gradient(90deg,#ff8700 0 33%,#f17a7e 33% 66%,#4a6163 66%)}.eyebrow{font-family:Poppins,sans-serif;font-size:25px;color:#9b4d00;letter-spacing:1.5px}.brand-title{position:absolute;top:265px;left:76px;font:700 87px/1.1 Poppins,sans-serif;letter-spacing:-2.6px}.brand-title span{color:#b94f54}.subtitle{top:593px;font-size:38px}.tools{position:absolute;left:76px;right:76px;top:798px;display:grid;grid-template-columns:1fr 1fr;gap:15px}.tool{display:flex;align-items:center;gap:18px;min-height:92px;padding:18px 23px;background:#fef1e4;border-radius:20px;font-size:29px;font-weight:700;line-height:1.16}.tool b{font-family:Poppins,sans-serif;color:#a04c00;font-size:28px}.tool:last-child{grid-column:1/-1}.facts{top:1155px;background:#4a6163;color:white;padding:29px 35px 28px;border-radius:28px}.facts-label{font-size:27px}.date{font-family:Poppins,sans-serif;font-size:41px;letter-spacing:-1px;margin-top:12px}.time{font-size:33px;margin-top:7px}.benefits{font-size:30px;margin-top:15px}.trust-role{font-size:23px}.cta{background:#f17a7e;border-radius:54px;color:#253b3e}.cta .url{font-family:Poppins,sans-serif;font-size:39px}.cta-label{font-size:25px;font-weight:700}
`,
    body: `<p class="eyebrow">Hand in Hand Parenting · Online-Elternkurs</p><h1 class="brand-title">Fünf Werkzeuge.<br>Für euren<br><span>Familienalltag.</span></h1><p class="subtitle">Große Gefühle begleiten,<br>liebevoll Grenzen setzen und<br>in Verbindung bleiben.</p><div class="tools"><div class="tool"><b>01</b>Wunschzeit</div><div class="tool"><b>02</b>Liebevoll<br>Grenzen setzen</div><div class="tool"><b>03</b>Staylistening</div><div class="tool"><b>04</b>Playlistening</div><div class="tool"><b>05</b>Listening Partnership</div></div><div class="facts"><p class="facts-label">Deine Starter Class</p><p class="date">Start: 17. Oktober 2026</p><p class="time">6 Samstage · 9–11 Uhr · online</p><div class="benefits"><p>4–7 Eltern in einer kleinen Gruppe</p><p>Inklusive 60 Min. Einzelcoaching</p></div></div>${trust}${cta()}`
  },
  {
    id: "03-eltern-halt", name: "Eltern brauchen auch Halt", description: "Ein direktes Plakat in Ultramarin und Signalgelb. Der Kursinhalt trägt die Gestaltung.",
    style: `
body{background:#263edb;color:#fff}.canvas::before{content:'';position:absolute;right:76px;top:186px;width:21px;height:21px;background:#eeff75;box-shadow:-35px 0 #eeff75,-70px 0 #eeff75}.eyebrow{letter-spacing:2.5px;font-size:28px}.poster-title{position:absolute;top:273px;left:72px;font:400 150px/1.11 Anton,Impact,sans-serif;letter-spacing:1px}.poster-title span{color:#eeff75}.subtitle{top:840px;font-size:39px;line-height:1.35}.method{position:absolute;left:76px;top:1080px;color:#eeff75;font-size:26px;letter-spacing:1px}.ticket{position:absolute;left:0;right:0;top:1167px;height:300px;background:#eeff75;color:#162cab;padding:30px 76px}.ticket-top{display:flex;align-items:center;gap:56px}.ticket-date{font:400 103px/1 Anton,sans-serif;letter-spacing:1px}.ticket-info{font-size:32px;line-height:1.35}.ticket-benefits{margin-top:23px;padding-top:20px;border-top:2px solid #263edb;font-size:32px;line-height:1.45}.trust{top:1522px}.seal{background:#fff;padding:5px;border-radius:50%}.trust-role{font-size:23px}.cta{top:1659px;border-top:2px solid #8898f3;padding:25px 0 0}.cta-label{font-size:27px}.url{font-size:47px;color:#eeff75}.arrow{font-size:43px}
`,
    body: `<p class="eyebrow">Online-Elternkurs</p><h1 class="poster-title">ELTERN<br>BRAUCHEN<br><span>AUCH HALT.</span></h1><p class="subtitle">Dein Kind bei Angst und Wut begleiten.<br>Liebevoll Grenzen setzen.<br>Und Unterstützung für dich finden.</p><p class="method">Hand in Hand Parenting · Starter Class</p><div class="ticket"><div class="ticket-top"><p class="ticket-date">17.10.</p><p class="ticket-info">Start 2026 · 6 Samstage<br>9–11 Uhr · online</p></div><div class="ticket-benefits"><p>4–7 Eltern in einer kleinen Gruppe</p><p>Inklusive 60 Min. Einzelcoaching</p></div></div>${trust}${cta()}`
  }
];

const browser = await chromium.launch();
const exports = [];
try {
  for (const variant of variants) {
    const source = `${variant.id}.html`;
    await writeFile(path.join(directory, source), `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${variant.name}</title><style>${shared}${variant.style}</style></head><body><main class="canvas">${variant.body}</main></body></html>\n`);
    const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(path.join(directory, source)).href);
    await page.evaluate(() => document.fonts.ready);
    const audit = await page.evaluate(() => {
      const text = [];
      const walker = document.createTreeWalker(document.querySelector("main"), window.NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        if (!walker.currentNode.textContent.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(walker.currentNode);
        for (const rect of range.getClientRects()) text.push({ text: walker.currentNode.textContent.trim(), x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom });
      }
      return { text, imagesLoaded: [...document.images].every(image => image.complete && image.naturalWidth > 0), portraitWidth: document.querySelector(".avatar").getBoundingClientRect().width };
    });
    if (!audit.imagesLoaded || audit.portraitWidth > 110 || audit.text.some(rect => rect.x < 60 || rect.right > 1020 || rect.y < 180 || rect.bottom > 1780)) throw new Error(`${variant.id}: layout check failed ${JSON.stringify(audit)}`);
    const png = `${variant.id}-1080x1920.png`;
    await page.screenshot({ path: path.join(directory, png) });
    await page.screenshot({ path: path.join(directory, `${variant.id}-1080x1920.jpg`), type: "jpeg", quality: 94 });
    await page.setViewportSize({ width: 390, height: 694 });
    await page.addStyleTag({ content: "html,body{width:390px;height:694px;overflow:hidden}.canvas{transform:scale(.3611111111);transform-origin:top left}" });
    await page.screenshot({ path: path.join(directory, `${variant.id}-phone.png`) });
    exports.push({ id: variant.id, name: variant.name, source, png, sha256: createHash("sha256").update(await readFile(path.join(directory, png))).digest("hex"), audit });
    await page.close();
  }
  const gallery = `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Drei neue Richtungen · Oktoberkurs</title><style>*{box-sizing:border-box}body{margin:0;background:#eceef2;color:#242732;font-family:Arial,sans-serif;padding:28px}header{display:flex;justify-content:space-between;align-items:baseline;gap:20px;margin-bottom:23px}h1{font-size:25px;margin:0}header p{margin:0;color:#555b68;font-size:14px}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:26px;max-width:1240px;margin:auto}article{min-width:0}h2{font-size:17px;margin:0 0 11px}img{width:100%;height:auto;display:block;border-radius:8px;box-shadow:0 4px 20px #17244016}p{font-size:14px;line-height:1.5}a{color:#243dc6}.links{display:flex;gap:20px;margin-top:14px}.note{max-width:1240px;margin:25px auto 0;color:#555b68;font-size:13px}@media(max-width:760px){header{display:block}header p{margin-top:9px}.grid{grid-template-columns:1fr;max-width:390px}article{margin-bottom:22px}}</style></head><body><header><h1>Drei neue Richtungen für den Oktoberkurs</h1><p>Jeweils 1080 × 1920 Pixel · WhatsApp-Status &amp; Direktversand</p></header><main class="grid">${variants.map((variant, i) => `<article><h2>${i + 1} · ${variant.name}</h2><a href="${variant.id}-1080x1920.png"><img src="${variant.id}-1080x1920.png" alt="${variant.name}"></a><p>${variant.description}</p><div class="links"><a download href="${variant.id}-1080x1920.jpg">JPG speichern</a><a download href="${variant.id}-1080x1920.png">PNG speichern</a></div></article>`).join("")}</main><p class="note">Entwurf 2 ist vom <a href="https://www.handinhandparenting.org/">offiziellen Hand-in-Hand-Webauftritt</a> abgeleitet. Ein öffentlicher Markenleitfaden wurde bei der Recherche nicht gefunden. Illustration in Entwurf 1: fiktiv, mit KI erzeugt. Julia ist in allen drei Entwürfen nur als kleine Absenderin sichtbar.</p></body></html>`;
  await writeFile(path.join(directory, "index.html"), gallery);
  const overview = await browser.newPage({ viewport: { width: 1392, height: 1050 }, deviceScaleFactor: 1 });
  await overview.goto(pathToFileURL(path.join(directory, "index.html")).href);
  await overview.screenshot({ path: path.join(directory, "vergleich.png"), fullPage: true });
  await overview.close();
  await writeFile(path.join(directory, "manifest.json"), JSON.stringify({ dimensions: [1080, 1920], website: "https://juliasutter.de/", build: "node tools/build-oktober-variants.mjs", exports, sources: { facts: "User-confirmed October2026 course; website index.html and assets/course-config.js", portrait: "assets/images/julia-headshot.jpg", certification: "assets/images/certified-instructor.png", brand: "https://www.handinhandparenting.org/", brandEvidence: "Live screenshot and computed DOM styles: Poppins700, Lato400; #4A6163, #F17A7E, #FF8700, #FEF1E4, #FFC94B. Formal brand guidelines were not found; variant2 is an interpretation of the official web appearance.", fonts: "Google Fonts; OFL licenses included in fonts/", illustration: "Built-in ImageGen fictional Playlistening scene, preserving the original paper-collage style; see illustration-playlistening-prompt.txt. Child leads a palm-to-palm playful pushing game; mother lets the child win and leans into cushions. Shared laughter and connection." }, decisions: "CMO and CDO discussed and agreed: playful child-experience, method/tool-focused, and parent-support typographic poster. Real children are not used. Portrait width104px in all variants. No price, deadline, availability claim or fictional endorsement." }, null, 2) + "\n");
  console.log(`Exported three variants and comparison gallery: ${directory}`);
} finally {
  await browser.close();
}
