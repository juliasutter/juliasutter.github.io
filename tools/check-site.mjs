import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { isFullyCrawlableRobotsPolicy } from "./robots-policy.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const origin = "https://juliasutter.de";
const errors = [];
const pages = [
  { file: "index.html", route: "/", lang: "de", canonical: "/", indexable: true, alternate: "/en/" },
  { file: "en/index.html", route: "/en/", lang: "en", canonical: "/en/", indexable: true, alternate: "/" },
  { file: "404.html", route: "/404.html", lang: "de", noindex: true },
  { file: "impressum/index.html", route: "/impressum/", lang: "de", canonical: "/impressum/", noindex: true, alternate: "/en/imprint/" },
  { file: "datenschutz/index.html", route: "/datenschutz/", lang: "de", canonical: "/datenschutz/", noindex: true, alternate: "/en/privacy/" },
  { file: "agb/index.html", route: "/agb/", lang: "de", canonical: "/agb/", noindex: true, alternate: "/en/terms/" },
  { file: "widerruf/index.html", route: "/widerruf/", lang: "de", canonical: "/widerruf/", noindex: true, alternate: "/en/withdrawal/" },
  { file: "en/imprint/index.html", route: "/en/imprint/", lang: "en", canonical: "/en/imprint/", noindex: true, alternate: "/impressum/" },
  { file: "en/privacy/index.html", route: "/en/privacy/", lang: "en", canonical: "/en/privacy/", noindex: true, alternate: "/datenschutz/" },
  { file: "en/terms/index.html", route: "/en/terms/", lang: "en", canonical: "/en/terms/", noindex: true, alternate: "/agb/" },
  { file: "en/withdrawal/index.html", route: "/en/withdrawal/", lang: "en", canonical: "/en/withdrawal/", noindex: true, alternate: "/widerruf/" }
];

const read = (file) => readFileSync(path.join(root, file), "utf8");
const fail = (message) => errors.push(message);
const attribute = (html, tagPattern, name) => {
  const tag = html.match(tagPattern)?.[0] ?? "";
  return tag.match(new RegExp(`\\b${name}=["']([^"']+)["']`, "i"))?.[1] ?? "";
};

for (const page of pages) {
  const absolute = path.join(root, page.file);
  if (!existsSync(absolute)) {
    fail(`${page.route}: missing ${page.file}`);
    continue;
  }
  const html = read(page.file);
  const htmlLang = html.match(/<html\b[^>]*\blang=["']([^"']+)["']/i)?.[1];
  if (htmlLang !== page.lang) fail(`${page.route}: expected lang=${page.lang}, got ${htmlLang || "none"}`);
  const h1Count = (html.match(/<h1\b/gi) ?? []).length;
  if (h1Count !== 1) fail(`${page.route}: expected one h1, found ${h1Count}`);

  const svgIcon = html.match(/<link\b(?=[^>]*\brel=["']icon["'])(?=[^>]*\btype=["']image\/svg\+xml["'])[^>]*>/i)?.[0] ?? "";
  if (attribute(svgIcon, /<link\b[^>]*>/i, "href") !== "/assets/brand/favicon.svg") fail(`${page.route}: missing SVG favicon`);
  const pngIcon = html.match(/<link\b(?=[^>]*\brel=["']icon["'])(?=[^>]*\btype=["']image\/png["'])(?=[^>]*\bsizes=["']32x32["'])[^>]*>/i)?.[0] ?? "";
  if (attribute(pngIcon, /<link\b[^>]*>/i, "href") !== "/assets/images/favicon-32.png") fail(`${page.route}: missing PNG favicon fallback`);
  const touchIcon = html.match(/<link\b[^>]*\brel=["']apple-touch-icon["'][^>]*>/i)?.[0] ?? "";
  if (attribute(touchIcon, /<link\b[^>]*>/i, "href") !== "/assets/images/apple-touch-icon.png") fail(`${page.route}: missing Apple touch icon`);
  if (!html.includes('src="/assets/brand/julia-logo.svg"')) fail(`${page.route}: official Julia logo is missing from the brand link`);

  const robots = attribute(html, /<meta\b[^>]*\bname=["']robots["'][^>]*>/i, "content");
  if (page.indexable && /noindex/i.test(robots)) fail(`${page.route}: indexable page contains noindex`);
  if (page.noindex && !/noindex/i.test(robots)) fail(`${page.route}: missing noindex`);
  if (page.canonical) {
    const canonical = attribute(html, /<link\b[^>]*\brel=["']canonical["'][^>]*>/i, "href");
    if (canonical !== `${origin}${page.canonical}`) fail(`${page.route}: canonical mismatch`);
  }

  if (page.alternate) {
    const expectedLanguage = page.lang === "de" ? "en" : "de";
    const tag = html.match(new RegExp(`<link\\b(?=[^>]*\\brel=["']alternate["'])(?=[^>]*\\bhreflang=["']${expectedLanguage}["'])[^>]*>`, "i"))?.[0] ?? "";
    if (attribute(tag, /<link\b[^>]*>/i, "href") !== `${origin}${page.alternate}`) fail(`${page.route}: language alternate mismatch`);
  }

  if (page.indexable) {
    for (const language of ["de", "en", "x-default"]) {
      const tag = html.match(new RegExp(`<link\\b(?=[^>]*\\brel=["']alternate["'])(?=[^>]*\\bhreflang=["']${language}["'])[^>]*>`, "i"))?.[0] ?? "";
      if (!attribute(tag, /<link\b[^>]*>/i, "href")) fail(`${page.route}: missing ${language} alternate`);
    }
    const jsonScripts = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
    const nodes = [];
    for (const match of jsonScripts) {
      try {
        const value = JSON.parse(match[1]);
        nodes.push(...(value["@graph"] ?? [value]));
      } catch (error) {
        fail(`${page.route}: invalid JSON-LD (${error.message})`);
      }
    }
    const webPage = nodes.find((node) => node["@type"] === "WebPage");
    if (!webPage || webPage.inLanguage !== page.lang || webPage.url !== `${origin}${page.canonical}`) fail(`${page.route}: incomplete WebPage JSON-LD`);
    for (const metaName of ["og:image:alt", "twitter:image:alt"]) {
      const pattern = metaName.startsWith("og:")
        ? new RegExp(`<meta\\b[^>]*\\bproperty=["']${metaName}["'][^>]*>`, "i")
        : new RegExp(`<meta\\b[^>]*\\bname=["']${metaName}["'][^>]*>`, "i");
      if (!attribute(html, pattern, "content").trim()) fail(`${page.route}: missing ${metaName}`);
    }
  }

  const ids = new Set([...html.matchAll(/\bid=["']([^"']+)["']/gi)].map((match) => match[1]));
  for (const match of html.matchAll(/\bhref=["']#([^"']+)["']/gi)) {
    if (!ids.has(match[1])) fail(`${page.route}: missing in-page target #${match[1]}`);
  }

  const references = [
    ...html.matchAll(/\b(?:src|href)=["']([^"']+)["']/gi),
    ...html.matchAll(/\bsrcset=["']([^"']+)["']/gi)
  ].flatMap((match) => match[1].split(",").map((value) => value.trim().split(/\s+/)[0]));
  for (const reference of references) {
    if (!reference || reference.startsWith("#") || /^(?:https?:|mailto:|tel:|data:)/i.test(reference)) continue;
    const clean = reference.split(/[?#]/)[0];
    const target = clean.startsWith("/") ? path.join(root, clean.slice(1)) : path.resolve(path.dirname(absolute), clean);
    const resolved = clean.endsWith("/") ? path.join(target, "index.html") : target;
    if (!existsSync(resolved)) fail(`${page.route}: missing local target ${reference}`);
  }
}

for (const obsolete of ["imprint/index.html", "privacy/index.html", "terms/index.html", "style.css", "main.js"]) {
  if (existsSync(path.join(root, obsolete))) fail(`obsolete file remains: ${obsolete}`);
}

for (const cssFile of ["assets/site.css", "assets/legal.css"]) {
  const css = read(cssFile);
  for (const match of css.matchAll(/url\((["']?)([^)"'?#]+)\1\)/gi)) {
    const target = match[2].startsWith("/") ? path.join(root, match[2].slice(1)) : path.resolve(path.dirname(path.join(root, cssFile)), match[2]);
    if (!existsSync(target)) fail(`${cssFile}: missing url() target ${match[2]}`);
  }
}

const courseConfig = read("assets/course-config.js");
const configContext = { window: {} };
try {
  vm.runInNewContext(courseConfig, configContext, { filename: "assets/course-config.js" });
} catch (error) {
  fail(`course config could not be evaluated (${error.message})`);
}
const siteConfig = configContext.window.JULIA_SITE_CONFIG;
if (!siteConfig || typeof siteConfig !== "object") fail("course config does not expose JULIA_SITE_CONFIG");

const isValidCourseDate = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
  if (!match) return false;
  const [, yearValue, monthValue, dayValue] = match;
  const year = Number(yearValue);
  const month = Number(monthValue);
  const day = Number(dayValue);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
};

for (const course of Array.isArray(siteConfig?.courses) ? siteConfig.courses : []) {
  const label = course?.id || "without id";
  const dates = Array.isArray(course?.dates) ? course.dates : [];
  if (dates.length !== 6) fail(`course ${label} must contain exactly six dates`);
  if (dates.some((date) => !isValidCourseDate(date))) fail(`course ${label} contains an invalid date`);
  if (new Set(dates).size !== dates.length) fail(`course ${label} contains duplicate dates`);
}
const endpoint = courseConfig.match(/formEndpoint:\s*["']([^"']*)["']/)?.[1] ?? "";
if (endpoint && !/^https:\/\/formcarry\.com\//.test(endpoint)) fail("formEndpoint must be an HTTPS Formcarry URL");

const sitemap = read("sitemap.xml");
const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
if (JSON.stringify(locations) !== JSON.stringify([`${origin}/`, `${origin}/en/`])) fail("sitemap locations mismatch");
for (const language of ["de", "en", "x-default"]) {
  if (!sitemap.includes(`hreflang="${language}"`)) fail(`sitemap missing ${language} alternate`);
}
if (!isFullyCrawlableRobotsPolicy(read("robots.txt"), `${origin}/sitemap.xml`)) fail("robots.txt must allow crawling and list the production sitemap");
if (read("CNAME").trim() !== "juliasutter.de") fail("CNAME must be juliasutter.de");

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exitCode = 1;
} else {
  const formNote = endpoint ? "Formcarry endpoint configured." : "Formcarry endpoint still needs to be configured.";
  console.log(`Site checks passed for ${pages.length} HTML routes. ${formNote}`);
}
