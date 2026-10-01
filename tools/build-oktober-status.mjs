import { chromium } from "playwright";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const directory = path.join(root, "artifacts/oktoberkurs-whatsapp-2026");
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(path.join(directory, "status.html")).href);
  await page.evaluate(() => document.fonts.ready);
  const audit = await page.evaluate(() => {
    const bounds = [];
    const walker = document.createTreeWalker(document.querySelector("main"), window.NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      if (!walker.currentNode.textContent.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(walker.currentNode);
      for (const rect of range.getClientRects()) {
        bounds.push({ text: walker.currentNode.textContent.trim(), x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom });
      }
    }
    return { bounds, imagesLoaded: [...document.images].every(image => image.complete && image.naturalWidth > 0) };
  });
  // Reserve 180px at the top and 140px at the bottom for status chrome.
  if (!audit.imagesLoaded || audit.bounds.some(rect => rect.x < 60 || rect.right > 1020 || rect.y < 180 || rect.bottom > 1780)) {
    throw new Error(`Export layout check failed: ${JSON.stringify(audit)}`);
  }
  const png = "oktoberkurs-whatsapp-1080x1920.png";
  await page.screenshot({ path: path.join(directory, png) });
  await page.screenshot({ path: path.join(directory, "oktoberkurs-whatsapp-1080x1920.jpg"), type: "jpeg", quality: 94 });
  await page.setViewportSize({ width: 390, height: 694 });
  await page.addStyleTag({ content: "html,body{width:390px;height:694px;overflow:hidden}.canvas{transform:scale(.3611111111);transform-origin:top left}" });
  await page.screenshot({ path: path.join(directory, "phone-preview.png") });
  const bytes = await readFile(path.join(directory, png));
  await writeFile(path.join(directory, "manifest.json"), JSON.stringify({
    dimensions: [1080, 1920], language: "de", website: "https://juliasutter.de/", format: "Single standalone status image",
    source: "status.html", build: "node tools/build-oktober-status.mjs", safeTextBounds: { top: 180, bottom: 1780, left: 60, right: 1020 },
    sha256: createHash("sha256").update(bytes).digest("hex"), audit,
    assets: ["assets/images/coaching-connection.jpg", "assets/images/certified-instructor.png"],
    facts: "Dates and times confirmed by user. Website supplies course benefits and original assets. No availability or deadline claim.",
    editorial: "Fear-focused hook, price omitted for readability; certification retains its original English artwork."
  }, null, 2) + "\n");
  console.log(`Exported PNG, JPEG and phone preview to ${directory}`);
} finally {
  await browser.close();
}
