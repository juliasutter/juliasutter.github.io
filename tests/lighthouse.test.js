import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import config from "../lighthouserc.cjs";
import { evaluateReports, runLighthouse, startPreview } from "../tools/run-lighthouse.mjs";

const deferred = () => { let resolve; let reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
function report(index = 0, url = "http://localhost:8123/") {
  const lhr = {
    requestedUrl: url, finalUrl: url, fetchTime: new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString(),
    categories: Object.fromEntries(["performance", "accessibility", "best-practices", "seo"].map((name) => [name, { score: 1 }])),
    audits: { "first-contentful-paint": { numericValue: [100, 200, 1000][index % 3] }, interactive: { numericValue: [1000, 200, 100][index % 3] } }
  };
  return { lhr, report: [`<html>run ${index}</html>`, JSON.stringify(lhr)] };
}

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "julia-lighthouse-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const state = { serverStops: 0, launches: 0, kills: 0, urls: [], flags: [] };
  const options = {
    root, config: structuredClone(config.ci),
    startServer: () => ({ ready: Promise.resolve("http://127.0.0.1:8123/"), stop: () => { state.serverStops++; } }),
    createChrome: () => ({ port: 9222, launch: async () => { state.launches++; }, kill: () => { state.kills++; } }),
    audit: async (url, flags) => { const index = state.urls.length; state.urls.push(url); state.flags.push(flags); return report(index, url); }
  };
  return { root, state, options, read: async (name) => JSON.parse(await readFile(join(root, "artifacts/lighthouse", name), "utf8")) };
}

test("category thresholds preserve LHCI's per-category optimistic aggregation", () => {
  const runs = [report(0), report(1), report(2)];
  runs[0].lhr.categories.performance.score = 0.9;
  runs[1].lhr.categories.performance.score = 0.88;
  runs[2].lhr.categories.performance.score = 0.87;
  runs[0].lhr.categories.accessibility.score = 0.99;
  runs[2].lhr.categories.accessibility.score = 0.99;
  assert.deepEqual(evaluateReports(runs, config.ci.assert.assertions), []);
  runs[0].lhr.categories.performance.score = 0.89;
  assert.deepEqual(evaluateReports(runs, config.ci.assert.assertions), [{ name: "minScore", expected: 0.9, actual: 0.89, values: [0.89, 0.88, 0.87], operator: ">=", passed: false, auditProperty: "performance", auditId: "categories", level: "error", url: "http://localhost:8123/" }]);
  for (const category of ["accessibility", "best-practices", "seo"]) {
    const under = report(); under.lhr.categories[category].score = 0.999;
    assert(evaluateReports([under], config.ci.assert.assertions).some((failure) => failure.auditProperty === category && failure.expected === 1));
  }
});

test("missing or unusable categories cannot pass on another run's score", () => {
  const missing = [report(0), report(1)]; delete missing[0].lhr.categories.seo;
  assert.equal(evaluateReports(missing, config.ci.assert.assertions)[0].name, "auditRan");
  const invalid = report(); invalid.lhr.categories.seo.score = null;
  assert.equal(evaluateReports([invalid], config.ci.assert.assertions)[0].passed, false);
});

test("six mobile reports, representative runs and filesystem manifest are retained", async (t) => {
  const f = await fixture(t);
  const { manifest, failures } = await runLighthouse(f.options);
  assert.deepEqual(failures, []);
  assert.deepEqual(f.state.urls, ["http://localhost:8123/", "http://localhost:8123/", "http://localhost:8123/", "http://localhost:8123/en/", "http://localhost:8123/en/", "http://localhost:8123/en/"]);
  assert.equal(manifest.length, 6);
  assert.deepEqual(manifest.filter((entry) => entry.isRepresentativeRun).map((entry) => entry.jsonPath.split("/").at(-1)), ["localhost--2026_01_01_00_00_01.report.json", "localhost-en_-2026_01_01_00_00_04.report.json"]);
  for (const entry of manifest) {
    assert.match(await readFile(entry.htmlPath, "utf8"), /<html>run/);
    assert.equal(JSON.parse(await readFile(entry.jsonPath, "utf8")).requestedUrl, entry.url);
  }
  assert.deepEqual(await f.read("manifest.json"), manifest);
  assert.deepEqual(await f.read("assertion-results.json"), []);
  assert.deepEqual(f.state.flags[0], { onlyCategories: ["performance", "accessibility", "best-practices", "seo"], formFactor: "mobile", screenEmulation: { mobile: true, width: 390, height: 844, deviceScaleFactor: 1, disabled: false }, port: 9222, output: ["html", "json"], logLevel: "error" });
  assert.equal(f.state.launches, 6); assert.equal(f.state.kills, 6); assert.equal(f.state.serverStops, 1);
});

test("score failure preserves all reports and returns a failing result", async (t) => {
  const f = await fixture(t);
  f.options.audit = async (url) => { const value = report(f.state.urls.length, url); f.state.urls.push(url); value.lhr.categories.performance.score = 0.89; value.report[1] = JSON.stringify(value.lhr); return value; };
  await assert.rejects(runLighthouse(f.options), /assertions failed/);
  assert.equal((await f.read("manifest.json")).length, 6);
  assert.equal((await f.read("assertion-results.json")).length, 2);
  assert.equal(f.state.kills, 6); assert.equal(f.state.serverStops, 1);
});

test("collection retries remain bounded and keep completed reports on exhaustion", async (t) => {
  const f = await fixture(t);
  let calls = 0;
  f.options.audit = async (url) => { if (calls++ === 0) return report(0, url); throw new Error("collection failed"); };
  await assert.rejects(runLighthouse(f.options), /collection failed/);
  assert.equal(calls, 4); assert.equal(f.state.kills, 4); assert.equal(f.state.serverStops, 1);
  assert.equal((await f.read("manifest.json")).length, 1);
});

test("a transient collection failure can recover within the existing three attempts", async (t) => {
  const f = await fixture(t);
  const audit = f.options.audit;
  let calls = 0;
  f.options.audit = async (...args) => { if (calls++ < 2) throw new Error("temporary failure"); return audit(...args); };
  const { manifest } = await runLighthouse(f.options);
  assert.equal(manifest.length, 6); assert.equal(calls, 8); assert.equal(f.state.kills, 8); assert.equal(f.state.serverStops, 1);
});

test("cleanup failure cannot produce a successful quality result", async (t) => {
  const f = await fixture(t);
  f.options.startServer = () => ({ ready: Promise.resolve("http://127.0.0.1:8123/"), stop: () => { throw new Error("server cleanup failed"); } });
  await assert.rejects(runLighthouse(f.options), (error) => error instanceof AggregateError && error.errors.some((item) => item.message === "server cleanup failed"));
  assert.equal(f.state.kills, 6);
});

test("startup failure cleans up the server without launching Chrome", async (t) => {
  const f = await fixture(t);
  f.options.startServer = () => ({ ready: Promise.reject(new Error("preview failed")), stop: () => { f.state.serverStops++; } });
  await assert.rejects(runLighthouse(f.options), /preview failed/);
  assert.equal(f.state.launches, 0); assert.equal(f.state.serverStops, 1);
});

test("cancellation closes a browser that finishes launching late", async (t) => {
  const f = await fixture(t);
  const started = deferred(); const launch = deferred();
  const controller = new globalThis.AbortController();
  f.options.signal = controller.signal;
  f.options.createChrome = () => ({ port: 9222, launch: () => { started.resolve(); return launch.promise; }, kill: () => { f.state.kills++; } });
  const running = runLighthouse(f.options);
  const rejected = assert.rejects(running, /cancelled/);
  await started.promise;
  controller.abort(new Error("cancelled"));
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(f.state.kills, 0, "cleanup must wait for launch before killing the owned browser");
  launch.resolve();
  await rejected;
  assert.equal(f.state.kills, 1); assert.equal(f.state.serverStops, 1); assert.equal(f.state.urls.length, 0);
});

test("cancellation during an audit stops owned resources and prevents retries", async (t) => {
  const f = await fixture(t);
  const started = deferred(); const audit = deferred();
  const controller = new globalThis.AbortController();
  f.options.signal = controller.signal;
  f.options.createChrome = () => ({ port: 9222, launch: async () => {}, kill: () => { f.state.kills++; audit.reject(new Error("browser stopped")); } });
  f.options.audit = () => { started.resolve(); return audit.promise; };
  const running = runLighthouse(f.options); const rejected = assert.rejects(running, /cancelled/);
  await started.promise; controller.abort(new Error("cancelled")); await rejected;
  assert.equal(f.state.kills, 1); assert.equal(f.state.serverStops, 1);
});

test("the audit server preserves compressed responses and cache headers", async (t) => {
  const f = await fixture(t);
  const html = `<html>${"compressed fixture ".repeat(200)}</html>`;
  await writeFile(join(f.root, "index.html"), html);
  const server = startPreview(f.root); t.after(() => server.stop());
  const response = await fetch(await server.ready, { headers: { "Accept-Encoding": "gzip" } });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-encoding"), "gzip");
  assert.equal(response.headers.get("cache-control"), "public, max-age=0");
  assert.match(response.headers.get("content-type"), /^text\/html; charset=utf-8$/i);
  assert.equal(await response.text(), html);
});

test("stopping an audit server during startup closes its eventual listener", async (t) => {
  const f = await fixture(t);
  const server = startPreview(f.root);
  await server.stop();
  await assert.rejects(fetch(await server.ready), /fetch failed/);
});
