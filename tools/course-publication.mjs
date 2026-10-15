import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateCourses } from "../assets/course-model.mjs";
import { buildConfig, configPath, configVersion } from "./build-course-config.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();

export function applyCandidate(config, raw, expected, actual, requestId) {
  if (!/^[a-f0-9]{40}$/.test(expected || "") || expected !== actual) throw new Error("Main wurde inzwischen geändert. Bitte den aktuellen Stand laden und erneut veröffentlichen.");
  if (!/^[a-f0-9-]{36}$/.test(requestId || "")) throw new Error("Ungültige Veröffentlichungskennung.");
  if (typeof raw !== "string" || Buffer.byteLength(raw) > 60000) throw new Error("Die Kursdaten sind zu groß.");
  const courses = JSON.parse(raw);
  validateCourses(courses, config);
  return { ...config, courses };
}

export function packageSite(destination) {
  mkdirSync(destination, { recursive: true });
  // Explicit public surface: never upload the checkout, dependencies, tests, or private records.
  const files = ["index.html", "404.html", "CNAME", "robots.txt", "sitemap.xml"];
  const directories = ["assets", "en", "starterclass", "impressum", "datenschutz", "agb", "widerruf", "verwaltung"];
  for (const entry of [...files, ...directories]) cpSync(path.join(root, entry), path.join(destination, entry), { recursive: true });
  const verify = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) throw new Error("Symlinks sind im Website-Artefakt nicht erlaubt.");
      if (entry.isDirectory()) verify(path.join(directory, entry.name));
    }
  };
  verify(destination);
}

async function run(mode) {
  if (mode === "prepare") {
    if (process.env.GITHUB_REF !== "refs/heads/main") throw new Error("Veröffentlichungen sind nur auf main erlaubt.");
    const candidate = applyCandidate(JSON.parse(readFileSync(configPath, "utf8")), process.env.COURSES_JSON, process.env.EXPECTED_HEAD, git("rev-parse", "HEAD"), process.env.REQUEST_ID);
    writeFileSync(configPath, JSON.stringify(candidate, null, 2) + "\n");
    buildConfig();
  } else if (mode === "commit") {
    const expected = process.env.EXPECTED_HEAD;
    const remote = git("ls-remote", "origin", "refs/heads/main").split(/\s/)[0];
    if (remote !== expected || git("rev-parse", "HEAD") !== expected) throw new Error("Main wurde inzwischen geändert. Es wurde nichts überschrieben.");
    const allowed = ["assets/course-config.json", "assets/course-config.js", "assets/course-version.json"];
    const dirty = git("diff", "--name-only").split("\n").filter(Boolean);
    if (dirty.some((file) => !allowed.includes(file)) || git("diff", "--cached", "--name-only")) throw new Error("Die Veröffentlichung enthält unerwartete Änderungen.");
    git("config", "user.name", "github-actions[bot]");
    git("config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com");
    git("add", "--", ...allowed);
    if (git("diff", "--cached", "--name-only")) {
      git("commit", "-m", "chore(courses): update course schedule");
      // A normal fast-forward push makes a concurrent update fail rather than overwriting it.
      git("push", "origin", "HEAD:main");
    }
    writeFileSync(process.env.GITHUB_OUTPUT, `commit=${git("rev-parse", "HEAD")}\n`, { flag: "a" });
  } else if (mode === "package") {
    buildConfig();
    packageSite(path.join(root, "dist"));
  } else if (mode === "check-deployment") {
    const config = JSON.parse(readFileSync(configPath, "utf8"));
    const version = configVersion(config);
    for (let attempt = 0; attempt < 18; attempt += 1) {
      try {
        const response = await fetch(`https://juliasutter.de/assets/course-version.json?v=${version}`, { cache: "no-store", signal: AbortSignal.timeout(10000) });
        if (response.ok && (await response.json()).version === version) return;
      } catch (_) { /* Pages can still be propagating; only a matching version confirms publication. */ }
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
    throw new Error("Das Deployment wurde ausgeführt, die neue Datenversion ist öffentlich aber noch nicht bestätigt. Bitte den Status später erneut prüfen.");
  } else throw new Error("Unbekannter Veröffentlichungsschritt.");
}

// Importing validation helpers in tests must never perform writes or git operations.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run(process.argv[2]).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
