import { expect, test } from "@playwright/test";
import { createHash } from "node:crypto";
import { fixtureConfig } from "./course-fixtures.js";

const sha = "a".repeat(40);
const fakeToken = "test-token-for-mocked-github-only";
const apiRoot = "https://api.github.com/repos/juliasutter/juliasutter.github.io";
const configCopy = () => structuredClone(fixtureConfig);

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-15T10:00:00Z") });
  await page.route("**/assets/course-config.json*", (route) => route.fulfill({ json: fixtureConfig }));
});
async function localEditor(page) {
  await page.goto("/verwaltung/");
  await page.getByRole("button", { name: "Testvorschau öffnen" }).click();
  await expect(page.locator("#workspace")).toBeVisible();
}
async function github(page, options = {}) {
  let publication;
  let runFetches = 0;
  await page.route("https://api.github.com/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    if (path === "/user") return route.fulfill({ status: options.invalid ? 401 : 200, json: { login: "juliasutter" } });
    if (request.method() === "POST") {
      publication = request.postDataJSON();
      if (options.forbidden) return route.fulfill({ status: 403, json: {} });
      const candidate = { ...fixtureConfig, courses: JSON.parse(publication.inputs.courses) };
      const version = createHash("sha256").update(JSON.stringify(candidate)).digest("hex");
      await page.route("**/assets/course-version.json*", (versionRoute) => versionRoute.fulfill({ json: { version: options.wrongVersion ? "old" : version } }));
      return route.fulfill({ json: { workflow_run_id: 42 } });
    }
    if (path.endsWith("/git/ref/heads/main")) return route.fulfill({ json: { object: { sha } } });
    if (path.includes("/contents/")) {
      const data = options.remote || fixtureConfig;
      return route.fulfill({ json: { encoding: "base64", content: Buffer.from(JSON.stringify(data)).toString("base64") } });
    }
    if (path.endsWith("/actions/runs/42")) {
      runFetches += 1;
      return route.fulfill({ json: { status: "completed", conclusion: options.failed ? "failure" : "success" } });
    }
    return route.fulfill({ json: { id: 1, state: "active" } });
  });
  return { publication: () => publication, runFetches: () => runFetches };
}
async function login(page) {
  await page.goto("/verwaltung/");
  await page.locator("#token").fill(fakeToken);
  await page.getByRole("button", { name: "Verwaltung öffnen", exact: true }).click();
}
async function editPlaces(page, count) {
  await page.locator("#course-list article").first().getByRole("button", { name: "Bearbeiten", exact: true }).click();
  await page.getByLabel("Freie Plätze", { exact: true }).fill(String(count));
  await page.getByRole("button", { name: "Speichern", exact: true }).click();
}

test("new courses need only a start date; defaults, names and weekly dates follow automatically", async ({ page }) => {
  await localEditor(page);
  await expect(page.getByRole("button", { name: /^(Duplizieren|Archivieren|Löschen|Wiederherstellen)$/ })).toHaveCount(0);
  await page.getByRole("button", { name: "+ Neuer Kurs", exact: true }).click();
  await expect(page.locator("#label-de")).not.toHaveValue("");
  await expect(page.locator("#label-en")).toBeHidden();
  await expect(page.locator("#editor details")).toHaveCount(0);
  await expect(page.locator("#location")).toBeHidden();
  await expect(page.locator("#capacity")).toHaveValue("7");
  await expect(page.locator("#remaining")).toHaveValue("7");
  await page.locator("#date-0").fill("2027-03-06");
  await page.locator("#start-time").fill("10:00");
  await expect(page.locator("#label-de")).toHaveValue("Frühling 2027 · Samstagvormittag");
  await expect(page.locator("#date-5")).toHaveValue("2027-04-10");
  await expect(page.locator("#deadline-date")).toHaveValue("2027-03-05");
  await page.locator("#capacity").fill("8");
  await expect(page.locator("#remaining")).toHaveValue("8");
  await page.getByRole("button", { name: "Speichern", exact: true }).click();
  const card = page.locator("#course-list article").filter({ hasText: "Frühling 2027 · Samstagvormittag" });
  await expect(card).toContainText("von 8 Plätzen frei");
  await card.getByRole("button", { name: "Bearbeiten", exact: true }).click();
  await expect(page.locator("#label-en")).toHaveValue("Spring 2027 · Saturday morning");
  await page.getByRole("button", { name: "Schließen", exact: true }).click();
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage }))).not.toContain("courses");
  await page.reload();
  await page.getByRole("button", { name: "Testvorschau öffnen" }).click();
  await expect(card).toHaveCount(0);
});

test("in-person courses require a location; custom dates, names, times and deadline survive saving", async ({ page }) => {
  await localEditor(page);
  await page.locator("#course-list article").first().getByRole("button", { name: "Bearbeiten", exact: true }).click();
  await expect(page.locator("#capacity")).toHaveValue("7");
  await page.getByLabel("Format", { exact: true }).selectOption("vor_ort");
  await expect(page.locator("#location")).toBeVisible();
  await page.getByRole("button", { name: "Speichern", exact: true }).click();
  await expect(page.locator("#editor")).toBeVisible();
  await page.getByLabel("Öffentlicher Veranstaltungsort", { exact: true }).fill("Kempten");
  await page.locator("#edit-sessions").click();
  await page.locator("#start-1").fill("10:00");
  await page.locator("#end-1").fill("12:30");
  await page.locator("#date-1").fill("2026-10-25");
  await page.locator("#edit-settings").click();
  await page.locator("#deadline-date").fill("2026-10-15");
  await page.locator("#label-de").fill("Mein Herbstkurs");
  await page.locator("#label-en").fill("My autumn course");
  await page.locator("#date-0").fill("2026-10-18");
  await expect(page.locator("#deadline-date")).toHaveValue("2026-10-15");
  await expect(page.locator("#date-1")).toHaveValue("2026-10-25");
  await page.getByRole("button", { name: "Speichern", exact: true }).click();
  await page.locator("#course-list article").first().getByRole("button", { name: "Bearbeiten", exact: true }).click();
  await expect(page.locator("#label-en")).toHaveValue("My autumn course");
  await expect(page.locator("#location")).toHaveValue("Kempten");
  await page.locator("#edit-sessions").click();
  await expect(page.locator("#start-1")).toHaveValue("10:00");
  await expect(page.locator("#end-1")).toHaveValue("12:30");
  await expect(page.locator("#schedule-summary")).toContainText("unterschiedlichen Uhrzeiten");
  await page.getByLabel("Format", { exact: true }).selectOption("online");
  await expect(page.locator("#location")).toBeHidden();
  await page.getByRole("button", { name: "Speichern", exact: true }).click();
  await expect(page.locator("#course-list article").first()).not.toContainText("Kempten");
});

test("courses remain current while running and enter the collapsed archive at their final end", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-11-21T09:59:59Z"));
  await localEditor(page);
  await expect(page.locator("#course-list article").first()).toContainText("Läuft gerade");
  await expect(page.locator("#past-list article")).toHaveCount(0);
  await page.clock.setFixedTime(new Date("2026-11-21T10:00:00Z"));
  await page.reload();
  await page.getByRole("button", { name: "Testvorschau öffnen" }).click();
  await expect(page.locator("#past-section")).not.toHaveAttribute("open");
  await page.locator("#past-section > summary").click();
  await expect(page.locator("#past-list article")).toContainText("Herbst 2026");
  await expect(page.locator("#past-list article")).toContainText("Abgeschlossen");
});

test("local seat buttons save immediately, retain keyboard focus and respect zero and capacity", async ({ page }) => {
  const data = configCopy(); data.courses[0].capacity = 2;
  await page.route("**/assets/course-config.json*", (route) => route.fulfill({ json: data }));
  await localEditor(page);
  const card = page.locator("#course-list article").first();
  const minus = card.getByRole("button", { name: /Einen Platz weniger/ });
  const plus = card.getByRole("button", { name: /Einen Platz mehr/ });
  await expect(plus).toBeDisabled();
  await minus.focus();
  await minus.press("Enter");
  await expect(minus).toBeFocused();
  await minus.press("Enter");
  await expect(minus).toBeDisabled();
  await expect(card.locator(".seat-stepper strong")).toHaveText("0");
  await expect(page.locator("#save-status")).toContainText("In der Testvorschau übernommen");
  await plus.click();
  await page.reload();
  await page.getByRole("button", { name: "Testvorschau öffnen" }).click();
  await expect(card.locator(".seat-stepper strong")).toHaveText("2");
});

test("a publication dispatch carries only courses and revision; tokens never enter persistent storage", async ({ page }) => {
  const mock = await github(page);
  await login(page);
  await editPlaces(page, 1);
  const stored = await page.evaluate(() => JSON.stringify({ ...localStorage }));
  expect(stored).not.toContain(fakeToken);
  await expect(page.locator("#token")).toHaveValue("");
  await expect(page.locator("#save-status")).toContainText("auf der Website bestätigt");
  expect(mock.publication().ref).toBe("main");
  expect(mock.publication().inputs.expected_head).toBe(sha);
  expect(JSON.parse(mock.publication().inputs.courses)[0].remainingPlaces).toBe(1);
  expect(JSON.stringify(mock.publication())).not.toContain(fakeToken);
  expect(mock.runFetches()).toBe(1);
  await page.getByRole("button", { name: "Abmelden", exact: true }).click();
  await expect(page.locator("#login-panel")).toBeVisible();
});
for (const [scenario, options, message] of [
  ["invalid credentials", { invalid: true }, "ungültig oder abgelaufen"],
  ["missing permission", { forbidden: true }, "Zugriff abgelehnt"],
  ["failed workflow", { failed: true }, "fehlgeschlagen"],
  ["unconfirmed public version", { wrongVersion: true }, "noch nicht bestätigt"]
]) test(`admin handles ${scenario} without losing the current inputs`, async ({ page }) => {
  await github(page, options);
  await login(page);
  if (options.invalid) { await expect(page.locator("#status")).toContainText(message); return; }
  await editPlaces(page, 1);
  await expect(page.locator("#save-status")).toContainText(message);
  await expect(page.locator("#course-list .seat-stepper strong").first()).toHaveText("1");
});

test("remote course conflict prevents dispatch and retains the current inputs", async ({ page }) => {
  const mock = await github(page);
  await login(page);
  await expect(page.locator("#workspace")).toBeVisible();
  const remote = configCopy(); remote.courses[0].remainingPlaces = 0;
  await page.route(`${apiRoot}/contents/**`, (route) => route.fulfill({ json: { encoding: "base64", content: Buffer.from(JSON.stringify(remote)).toString("base64") } }));
  await editPlaces(page, 1);
  await expect(page.locator("#save-status")).toContainText("auch auf GitHub geändert");
  expect(mock.publication()).toBeUndefined();
  await expect(page.locator("#course-list .seat-stepper strong").first()).toHaveText("1");
});

test("admin has no external resources or public navigation link and renders untrusted labels as text", async ({ page }) => {
  const requests = [];
  page.on("request", (request) => { if (!request.url().startsWith("http://127.0.0.1")) requests.push(request.url()); });
  await localEditor(page);
  await page.locator("#course-list article").first().getByRole("button", { name: "Bearbeiten", exact: true }).click();
  await page.getByLabel("Kursname", { exact: true }).fill('<img src=x onerror="alert(1)">');
  await page.getByRole("button", { name: "Speichern", exact: true }).click();
  await expect(page.locator("#course-list h3").first()).toHaveText('<img src=x onerror="alert(1)">');
  await expect(page.locator("#course-list img")).toHaveCount(0);
  expect(requests).toEqual([]);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await page.goto("/");
  await expect(page.locator('a[href*="verwaltung"]')).toHaveCount(0);
});

// Stateful GitHub boundary: a completed run updates main and the served version.
async function queuedGithub(page, { fail = false, uncertain = false } = {}) {
  let remote = configCopy();
  let pending = true;
  let publicVersion = "initial";
  const runs = [];
  await page.route("https://api.github.com/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === "/user") return route.fulfill({ json: { login: "juliasutter" } });
    if (request.method() === "POST") {
      const payload = request.postDataJSON();
      const data = { ...remote, courses: JSON.parse(payload.inputs.courses) };
      const version = createHash("sha256").update(JSON.stringify(data)).digest("hex");
      const run = { id: runs.length + 1, payload, data, version };
      runs.push(run);
      if (uncertain && runs.length === 1) return route.abort("failed");
      return route.fulfill({ json: { workflow_run_id: run.id } });
    }
    if (path.endsWith("/git/ref/heads/main")) return route.fulfill({ json: { object: { sha } } });
    if (path.includes("/contents/")) return route.fulfill({ json: { encoding: "base64", content: Buffer.from(JSON.stringify(remote)).toString("base64") } });
    if (path.endsWith("/site-quality.yml/runs")) return route.fulfill({ json: { workflow_runs: runs.map((run) => ({ id: run.id, display_title: `Kurse · ${run.payload.inputs.request_id}` })) } });
    if (/\/actions\/runs\/\d+$/.test(path)) {
      const run = runs.find((entry) => String(entry.id) === path.split("/").at(-1));
      if (pending) return route.fulfill({ json: { status: "in_progress" } });
      if (!fail) { remote = run.data; publicVersion = run.version; }
      return route.fulfill({ json: { status: "completed", conclusion: fail ? "failure" : "success" } });
    }
    return route.fulfill({ json: { id: 1, state: "active" } });
  });
  await page.route("**/assets/course-version.json*", (route) => route.fulfill({ json: { version: publicVersion } }));
  return { runs, finish: () => { pending = false; }, remote: () => remote };
}

test("rapid seat clicks coalesce; later course saves are serialized without losing changes", async ({ page }) => {
  const mock = await queuedGithub(page);
  await login(page);
  const card = page.locator("#course-list article").first();
  const minus = card.getByRole("button", { name: /Einen Platz weniger/ });
  await minus.click(); await minus.click();
  await page.clock.fastForward(1000);
  await expect.poll(() => mock.runs.length).toBe(1);
  await expect(page.locator("#save-status")).toContainText("läuft im Hintergrund");
  expect(mock.runs[0].data.courses[0].remainingPlaces).toBe(0);
  await card.getByRole("button", { name: "Bearbeiten", exact: true }).click();
  await page.locator("#label-de").fill("Mein neuer Kursname");
  await page.clock.fastForward(1000);
  expect(mock.runs[0].data.courses[0].labelDe).toBe(fixtureConfig.courses[0].labelDe);
  await page.getByRole("button", { name: "Speichern", exact: true }).click();
  await card.getByRole("button", { name: /Einen Platz mehr/ }).click();
  expect(mock.runs.length).toBe(1);
  await expect(card.locator(".seat-stepper strong")).toHaveText("1");
  mock.finish();
  await page.clock.fastForward(5000);
  await expect(page.locator("#save-status")).toContainText("weitere Änderungen werden als Nächstes übertragen");
  await page.clock.fastForward(1000);
  await expect.poll(() => mock.runs.length).toBe(2);
  await expect(page.locator("#save-status")).toContainText("auf der Website bestätigt");
  expect(mock.remote().courses[0].remainingPlaces).toBe(1);
  expect(mock.remote().courses[0].labelDe).toBe("Mein neuer Kursname");
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage }))).not.toContain(fakeToken);
});

test("reloading resumes an in-flight seat publication without dispatching again", async ({ page }) => {
  const mock = await queuedGithub(page);
  await login(page);
  await page.locator("#course-list article").first().getByRole("button", { name: /Einen Platz weniger/ }).click();
  await page.clock.fastForward(1000);
  await expect(page.locator("#save-status")).toContainText("läuft im Hintergrund");
  await page.reload();
  await page.locator("#token").fill(fakeToken);
  await page.getByRole("button", { name: "Verwaltung öffnen", exact: true }).click();
  mock.finish();
  await page.clock.fastForward(1000);
  await expect(page.locator("#save-status")).toContainText("auf der Website bestätigt");
  expect(mock.runs.length).toBe(1);
});

test("an uncertain dispatch response is reconciled by request identity without a duplicate publication", async ({ page }) => {
  const mock = await queuedGithub(page, { uncertain: true });
  await login(page);
  await page.locator("#course-list article").first().getByRole("button", { name: /Einen Platz weniger/ }).click();
  await page.clock.fastForward(1000);
  await expect(page.locator("#save-status")).toContainText("Noch nicht abgeschlossen");
  mock.finish();
  await page.getByRole("button", { name: "Status erneut prüfen", exact: true }).click();
  await page.clock.fastForward(1000);
  await expect(page.locator("#save-status")).toContainText("auf der Website bestätigt");
  expect(mock.runs.length).toBe(1);
});

for (const failure of ["conflict", "workflow"]) test(`automatic seat saving retains changes after ${failure}`, async ({ page }) => {
  const mock = await queuedGithub(page, { fail: failure === "workflow" });
  await login(page);
  await expect(page.locator("#course-list .seat-stepper strong").first()).toHaveText("2");
  if (failure === "conflict") {
    const remote = configCopy(); remote.courses[0].remainingPlaces = 0;
    await page.route(`${apiRoot}/contents/**`, (route) => route.fulfill({ json: { encoding: "base64", content: Buffer.from(JSON.stringify(remote)).toString("base64") } }));
  }
  mock.finish();
  await page.locator("#course-list article").first().getByRole("button", { name: /Einen Platz weniger/ }).click();
  await page.clock.fastForward(1000);
  await expect(page.locator("#save-status")).toContainText(failure === "conflict" ? "auch auf GitHub geändert" : "fehlgeschlagen");
  await expect(page.locator("#retry-save")).toBeVisible();
  expect(mock.runs.length).toBe(failure === "conflict" ? 0 : 1);
  await expect(page.locator("#course-list .seat-stepper strong").first()).toHaveText("1");
});

test("resuming locks changes until the submitted version is confirmed and stores only request identity", async ({ page }) => {
  const mock = await queuedGithub(page);
  await login(page);
  await editPlaces(page, 1);
  await expect(page.locator("#save-status")).toContainText("läuft im Hintergrund");
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("julia-course-publication-v1")));
  expect(Object.keys(stored).sort()).toEqual(["id", "requestId", "version"]);
  await page.reload();
  await page.locator("#token").fill(fakeToken);
  await page.getByRole("button", { name: "Verwaltung öffnen", exact: true }).click();
  await expect(page.locator("#save-status")).toContainText("läuft im Hintergrund");
  await expect(page.locator("#add-course")).toBeDisabled();
  await expect(page.locator("#course-list article").first().getByRole("button", { name: "Bearbeiten", exact: true })).toBeDisabled();
  mock.finish();
  await page.clock.fastForward(5000);
  await expect(page.locator("#save-status")).toContainText("auf der Website bestätigt");
  await expect(page.locator("#add-course")).toBeEnabled();
  await expect(page.locator("#course-list .seat-stepper strong").first()).toHaveText("1");
  expect(mock.runs.length).toBe(1);
  expect(await page.evaluate(() => localStorage.getItem("julia-course-publication-v1"))).toBeNull();
});

for (const override of ["start-time", "end-time"]) test(`new course times follow the start weekday until ${override} is changed manually`, async ({ page }) => {
  await localEditor(page);
  await page.getByRole("button", { name: "+ Neuer Kurs", exact: true }).click();
  for (const [date, start, end] of [["2027-03-05", "20:00", "22:00"], ["2027-03-06", "09:00", "11:00"], ["2027-03-07", "09:00", "11:00"], ["2027-03-08", "20:00", "22:00"]]) {
    await page.locator("#date-0").fill(date);
    await expect(page.locator("#start-time")).toHaveValue(start);
    await expect(page.locator("#end-time")).toHaveValue(end);
  }
  await page.locator(`#${override}`).fill(override === "start-time" ? "19:00" : "21:00");
  await page.locator("#date-0").fill("2027-03-13");
  await expect(page.locator("#start-time")).toHaveValue(override === "start-time" ? "19:00" : "20:00");
  await expect(page.locator("#end-time")).toHaveValue(override === "end-time" ? "21:00" : "22:00");
  await page.getByRole("button", { name: "Speichern", exact: true }).click();
  const card = page.locator("#course-list article").filter({ hasText: "Frühling 2027" });
  await card.getByRole("button", { name: "Bearbeiten", exact: true }).click();
  await expect(page.locator("#start-time")).toHaveValue(override === "start-time" ? "19:00" : "20:00");
  await expect(page.locator("#end-time")).toHaveValue(override === "end-time" ? "21:00" : "22:00");
});

test("rescheduling an existing course preserves its previously saved time", async ({ page }) => {
  await localEditor(page);
  await page.locator("#course-list article").first().getByRole("button", { name: "Bearbeiten", exact: true }).click();
  await page.locator("#date-0").fill("2026-10-19");
  await expect(page.locator("#start-time")).toHaveValue("09:00");
  await expect(page.locator("#end-time")).toHaveValue("11:00");
});


test("generated names follow the date until edited; English appears directly beneath German", async ({ page }) => {
  await localEditor(page);
  await page.locator("#add-course").click();
  await page.locator("#date-0").fill("2027-03-06");
  await expect(page.locator("#label-de")).toHaveValue("Frühling 2027 · Samstagvormittag");
  await expect(page.locator("#label-en")).toBeHidden();
  await expect(page.locator("#schedule-summary")).toContainText("6 Samstage vom 06.03.2027 bis 10.04.2027, jeweils 09:00–11:00 Uhr");
  await expect(page.locator("#session-settings")).toBeHidden();
  await expect(page.locator("#extra-settings")).toBeHidden();
  await expect(page.locator("#defaults-summary")).toContainText("399 € / 349 € mit Freund:in");
  await page.locator("#label-de").fill("Mein Kurs");
  await expect(page.locator("#label-en")).toBeVisible();
  await page.locator("#label-en").fill("My course");
  await page.locator("#date-0").fill("2027-03-08");
  await expect(page.locator("#label-de")).toHaveValue("Mein Kurs");
  await expect(page.locator("#label-en")).toHaveValue("My course");
  await page.locator("#edit-settings").click();
  await page.locator("#price").fill("450");
  await expect(page.locator("#defaults-summary")).toContainText("450 €");
  await page.locator("#edit-sessions").click();
  await page.locator("#date-1").fill("2027-03-16");
  await expect(page.locator("#schedule-summary")).toContainText("6 Termine");
  await page.locator("#save-course").click();
  await expect(page.locator("#course-list")).toContainText("Mein Kurs");
});

test("clicking the date field invokes its native picker and keeps manual entry available", async ({ page }) => {
  await page.addInitScript(() => {
    window.HTMLInputElement.prototype.showPicker = function () { this.dataset.pickerOpened = "yes"; };
  });
  await localEditor(page);
  await page.locator("#add-course").click();
  await page.locator("#date-0").click({ position: { x: 12, y: 12 } });
  await expect(page.locator("#date-0")).toHaveAttribute("data-picker-opened", "yes");
  await page.locator("#date-0").fill("2027-04-03");
  await expect(page.locator("#date-0")).toHaveValue("2027-04-03");
  await page.locator("#edit-sessions").click();
  await page.locator("#date-1").click({ position: { x: 12, y: 12 } });
  await expect(page.locator("#date-1")).toHaveAttribute("data-picker-opened", "yes");
});

test("saving an unrelated field preserves an existing custom English name", async ({ page }) => {
  const data = configCopy(); data.courses[0].labelEn = "My custom English title";
  await page.route("**/assets/course-config.json*", (route) => route.fulfill({ json: data }));
  await localEditor(page);
  await editPlaces(page, 1);
  await page.locator("#course-list article").first().getByRole("button", { name: "Bearbeiten", exact: true }).click();
  await expect(page.locator("#label-en")).toHaveValue("My custom English title");
});

test("obsolete preview drafts are removed instead of restored", async ({ page }) => {
  await page.goto("/verwaltung/");
  await page.evaluate(() => localStorage.setItem("julia-course-draft-v1", JSON.stringify({ courses: [{ labelDe: "Obsolete draft" }] })));
  await page.getByRole("button", { name: "Testvorschau öffnen" }).click();
  await expect(page.locator("#workspace")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("julia-course-draft-v1"))).toBeNull();
  await expect(page.locator("#course-list")).not.toContainText("Obsolete draft");
});

test("a successful superseded request reloads verified current courses and unlocks editing", async ({ page }) => {
  const remote = configCopy(); remote.courses[0].remainingPlaces = 0;
  const version = createHash("sha256").update(JSON.stringify(remote)).digest("hex");
  const mock = await github(page, { remote });
  await page.route("**/assets/course-version.json*", (route) => route.fulfill({ json: { version } }));
  await page.goto("/verwaltung/");
  await page.evaluate(() => localStorage.setItem("julia-course-publication-v1", JSON.stringify({ id: 42, requestId: "12345678-1234-1234-1234-123456789abc", version: "b".repeat(64) })));
  await page.locator("#token").fill(fakeToken);
  await page.getByRole("button", { name: "Verwaltung öffnen", exact: true }).click();
  await expect(page.locator("#save-status")).toContainText("aktueller Website-Stand geladen");
  await expect(page.locator("#add-course")).toBeEnabled();
  await expect(page.locator("#course-list .seat-stepper strong").first()).toHaveText("0");
  expect(mock.publication()).toBeUndefined();
  expect(await page.evaluate(() => localStorage.getItem("julia-course-publication-v1"))).toBeNull();
});

for (const [capacity, remaining, expected] of [[undefined, 7, 7], [undefined, 9, 9], [10, 10, 10]]) {
  test(`seat capacity is consistent before and after editing (${capacity ?? "legacy"}, ${remaining} remaining)`, async ({ page }) => {
    const data = configCopy();
    data.courses[0].remainingPlaces = remaining;
    if (capacity !== undefined) data.courses[0].capacity = capacity;
    await page.route("**/assets/course-config.json*", (route) => route.fulfill({ json: data }));
    await localEditor(page);
    const card = page.locator("#course-list article").first();
    const plus = card.getByRole("button", { name: /Einen Platz mehr/ });
    await expect(card.locator(".seat-stepper")).toContainText(`von ${expected} Plätzen frei`);
    await expect(plus).toBeDisabled();
    await card.getByRole("button", { name: /Einen Platz weniger/ }).click();
    await expect(card.locator(".seat-stepper")).toContainText(`von ${expected} Plätzen frei`);
    await expect(plus).toBeEnabled();
    await plus.click();
    await expect(plus).toBeDisabled();
    await card.getByRole("button", { name: "Bearbeiten", exact: true }).click();
    await expect(page.locator("#capacity")).toHaveValue(String(expected));
    await page.locator("#save-course").click();
    await expect(card.locator(".seat-stepper")).toContainText(`von ${expected} Plätzen frei`);
    await expect(plus).toBeDisabled();
  });
}
