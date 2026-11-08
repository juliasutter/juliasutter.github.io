import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { resolve } from "node:path";
import lighthouse from "lighthouse";
import { Launcher } from "chrome-launcher";
import compression from "compression";
import serveStatic from "serve-static";
import { chromium } from "@playwright/test";
import configuration from "../lighthouserc.cjs";

function testEnvironment() {
  const env = { ...process.env };
  for (const key of ["SENTRY_AUTH_TOKEN", "GH_TOKEN", "GITHUB_TOKEN", "NPM_TOKEN", "NODE_AUTH_TOKEN", "SSH_AUTH_SOCK"]) delete env[key];
  return env;
}

export function startPreview(root) {
  // Keep LHCI's compressed static responses and default cache/MIME handling.
  const compress = compression();
  const serve = serveStatic(root);
  const server = createServer((request, response) => {
    compress(request, response, () => serve(request, response, (error) => {
      response.statusCode = error ? error.statusCode || 500 : 404;
      response.end(error ? "Static preview request failed" : "Not found");
    }));
  });
  const ready = new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const url = `http://127.0.0.1:${server.address().port}/`;
      console.log(`Lighthouse preview: ${url}`);
      resolve(url);
    });
  });
  return { ready, stop: async () => {
    try { await ready; } catch { return; }
    if (!server.listening) return;
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
      server.closeAllConnections();
    });
  } };
}

// Preserve LHCI's optimistic minScore aggregation: best score per category, not one chosen run.
export function evaluateReports(reports, assertions) {
  const failures = [];
  for (const [url, group] of Map.groupBy(reports, ({ lhr }) => lhr.finalUrl)) {
    for (const [key, [level, options]] of Object.entries(assertions)) {
      if (!key.startsWith("categories:") || Object.keys(options).some((key) => key !== "minScore")) throw new Error(`Unsupported Lighthouse assertion: ${key}`);
      const category = key.slice("categories:".length);
      const missing = group.some(({ lhr }) => !lhr.categories[category]);
      const values = group.map(({ lhr }) => missing ? Number(Boolean(lhr.categories[category])) : lhr.categories[category].score);
      const scores = values.filter((value) => typeof value === "number" && Number.isFinite(value));
      const actual = missing ? 0 : scores.length ? Math.max(...scores) : undefined;
      const expected = missing ? 1 : options.minScore;
      const passed = actual !== undefined && actual >= expected;
      if (!passed) failures.push({ name: missing ? "auditRan" : "minScore", expected, actual, values, operator: ">=", passed, auditProperty: category, auditId: "categories", level, url });
    }
  }
  return failures;
}

function representativeReports(reports) {
  const representatives = new Set();
  const value = (report, name) => report.lhr.audits[name]?.numericValue || 0;
  for (const group of Map.groupBy(reports, ({ lhr }) => lhr.requestedUrl).values()) {
    const medians = ["first-contentful-paint", "interactive"].map((name) => group.map((report) => value(report, name)).sort((a, b) => a - b)[Math.floor(group.length / 2)]);
    const distance = (report) => (value(report, "first-contentful-paint") - medians[0]) ** 2 + (value(report, "interactive") - medians[1]) ** 2;
    representatives.add(group.toSorted((a, b) => distance(a) - distance(b))[0]);
  }
  return representatives;
}

async function saveReports(reports, outputDir, assertions) {
  const representatives = representativeReports(reports);
  const sanitize = (value) => value.replace(/[^a-z0-9]+/gi, "_").replace(/^_/, "");
  const manifest = [];
  // As with LHCI, representative reports are written last if filenames collide.
  for (const item of reports.toSorted((a, b) => Number(representatives.has(a)) - Number(representatives.has(b)))) {
    const { lhr, report } = item;
    const url = new URL(lhr.requestedUrl);
    const timestamp = new Date(lhr.fetchTime).toISOString().replace(/\.\d{3}Z/, "").replace("T", " ");
    const filename = `${sanitize(url.hostname)}-${sanitize(url.pathname)}-${sanitize(timestamp)}.report`;
    const entry = {
      url: lhr.requestedUrl,
      isRepresentativeRun: representatives.has(item),
      htmlPath: resolve(outputDir, `${filename}.html`),
      jsonPath: resolve(outputDir, `${filename}.json`),
      summary: Object.fromEntries(Object.entries(lhr.categories).map(([key, category]) => [key, category.score]))
    };
    await writeFile(entry.htmlPath, report[0]);
    await writeFile(entry.jsonPath, report[1]);
    manifest.push(entry);
  }
  const failures = evaluateReports(reports, assertions);
  await writeFile(resolve(outputDir, "manifest.json"), JSON.stringify(manifest, null, 2));
  await writeFile(resolve(outputDir, "assertion-results.json"), JSON.stringify(failures, null, 2));
  return { manifest, failures };
}

export async function runLighthouse({ root = resolve(import.meta.dirname, ".."), config = configuration.ci, signal, startServer = startPreview, createChrome = (options) => new Launcher(options), audit = lighthouse } = {}) {
  if (config.collect.staticDistDir !== "." || config.upload.target !== "filesystem") throw new Error("Lighthouse supports this project's local preview and filesystem reports");
  const reports = [];
  const stops = [];
  const own = (stop) => {
    let stopped;
    const once = () => stopped ??= Promise.resolve().then(stop);
    stops.push(once);
    return once;
  };
  const cancel = () => { for (const stop of stops) void stop().catch(() => {}); };
  const outputDir = resolve(root, config.upload.outputDir);
  await mkdir(outputDir, { recursive: true });
  await writeFile(resolve(outputDir, "manifest.json"), "[]");
  await writeFile(resolve(outputDir, "assertion-results.json"), "[]");
  signal?.addEventListener("abort", cancel);
  let result;
  try {
    signal?.throwIfAborted();
    const server = startServer(root);
    own(() => server.stop());
    const origin = new URL(await server.ready);
    signal?.throwIfAborted();
    const { chromeFlags, ...settings } = config.collect.settings;
    for (const configuredUrl of config.collect.url) {
      const url = new URL(configuredUrl);
      url.port = origin.port;
      for (let run = 0; run < config.collect.numberOfRuns; run++) {
        console.log(`Lighthouse ${url} — run ${run + 1}/${config.collect.numberOfRuns}`);
        // LHCI retried collection failures up to three times; keep that behavior.
        for (let attempt = 0; attempt < 3; attempt++) {
          signal?.throwIfAborted();
          const chrome = createChrome({ chromePath: chromium.executablePath(), chromeFlags: chromeFlags.split(/\s+/), envVars: testEnvironment(), logLevel: "error" });
          const launching = chrome.launch();
          // A cancelled launch must settle before cleanup can kill a late browser process.
          const stopChrome = own(async () => { try { await launching; } catch { /* Cleanup also covers failed launches. */ } chrome.kill(); });
          try {
            await launching;
            signal?.throwIfAborted();
            const report = await audit(url.href, { ...settings, port: chrome.port, output: ["html", "json"], logLevel: "error" });
            signal?.throwIfAborted();
            if (!report || report.lhr.runtimeError) throw new Error(report?.lhr.runtimeError?.message || "Lighthouse returned no report");
            reports.push(report);
            break;
          } catch (error) {
            signal?.throwIfAborted();
            if (attempt === 2) throw error;
            console.warn(`Lighthouse collection failed; retrying: ${error.message}`);
          } finally {
            await stopChrome();
          }
        }
      }
    }
  } finally {
    signal?.removeEventListener("abort", cancel);
    try {
      result = await saveReports(reports, outputDir, config.assert.assertions);
    } finally {
      const stopped = await Promise.allSettled(stops.map((stop) => stop()));
      const errors = stopped.filter((item) => item.status === "rejected").map((item) => item.reason);
      if (errors.length) throw new AggregateError(errors, "Lighthouse resource cleanup failed");
    }
  }
  signal?.throwIfAborted();
  if (result.failures.some(({ level }) => level === "error")) throw new Error(`Lighthouse assertions failed: ${JSON.stringify(result.failures)}`);
  console.log(`Lighthouse: ${reports.length} reports, all assertions passed. Reports: ${outputDir}`);
  return result;
}

if (import.meta.main) {
  const controller = new globalThis.AbortController();
  const cancel = () => controller.abort(new Error("Lighthouse interrupted"));
  process.once("SIGINT", cancel);
  process.once("SIGTERM", cancel);
  const awake = process.platform === "darwin" ? spawn("/usr/bin/caffeinate", ["-dimsu", "-w", String(process.pid)], { stdio: "ignore" }) : undefined;
  const awakeClosed = awake && new Promise((resolve) => awake.once("close", resolve));
  awake?.once("error", (error) => controller.abort(error));
  try {
    await runLighthouse({ signal: controller.signal });
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    process.off("SIGINT", cancel);
    process.off("SIGTERM", cancel);
    awake?.kill();
    await awakeClosed;
  }
}
