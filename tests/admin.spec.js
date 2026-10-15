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
  await page.getByRole("button", { name: "Lokalen Entwurf öffnen" }).click();
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
  await page.getByRole("button", { name: "Entwurf speichern", exact: true }).click();
}

test("own admin UI creates, duplicates, edits, archives, restores and deletes local courses", async ({ page }) => {
  await localEditor(page);
  await page.getByRole("button", { name: "+ Neuer Kurs", exact: true }).click();
  await page.getByLabel("Bezeichnung · Deutsch").fill("Frühjahr · Eigener Kurs");
  await page.getByLabel("Bezeichnung · Englisch").fill("Spring · Own course");
  await page.getByLabel("Freie Plätze", { exact: true }).fill("5");
  await page.getByLabel("Gesamtzahl der Plätze (optional)").fill("7");
  await page.getByLabel("Standardpreis · €", { exact: true }).fill("450.50");
  await page.getByRole("button", { name: "Entwurf speichern", exact: true }).click();
  const card = page.locator("#course-list article").filter({ hasText: "Frühjahr · Eigener Kurs" });
  await expect(card).toContainText("5 / 7 freie Plätze");
  await card.getByRole("button", { name: "Duplizieren", exact: true }).click();
  await page.getByRole("button", { name: "Entwurf speichern", exact: true }).click();
  const duplicate = page.locator("#course-list article").filter({ hasText: "Frühjahr · Eigener Kurs · Kopie" });
  await duplicate.getByRole("button", { name: "Archivieren", exact: true }).click();
  await page.locator("#past-section > summary").click();
  const archived = page.locator("#past-list article").filter({ hasText: "Frühjahr · Eigener Kurs · Kopie" });
  await archived.getByRole("button", { name: "Wiederherstellen", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "Lokalen Entwurf öffnen" }).click();
  await expect(duplicate).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await duplicate.getByRole("button", { name: "Löschen", exact: true }).click();
  await expect(duplicate).toHaveCount(0);
  await page.getByRole("button", { name: "Änderungen ansehen", exact: true }).click();
  await expect(page.locator("#public-preview")).toContainText("Frühjahr · Eigener Kurs");
  await page.getByLabel("Sprache der Vorschau").selectOption("en");
  await expect(page.locator("#public-preview")).toContainText("Spring · Own course");
  await expect(page.locator("#publish")).toBeDisabled();
});

test("per-session times and deadline changes survive local saving; unknown capacity stays blank", async ({ page }) => {
  await localEditor(page);
  await page.locator("#course-list article").first().getByRole("button", { name: "Bearbeiten", exact: true }).click();
  await expect(page.locator("#capacity")).toHaveValue("");
  await page.locator("#start-1").fill("10:00");
  await page.locator("#end-1").fill("12:30");
  await page.getByRole("button", { name: "Entwurf speichern", exact: true }).click();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("julia-course-draft-v1")));
  expect(stored.courses[0].sessionTimes["2026-10-24"]).toEqual({ startTime: "10:00", endTime: "12:30" });
  await page.getByRole("button", { name: "Änderungen ansehen", exact: true }).click();
  await expect(page.locator("#public-preview")).toContainText("10:00–12:30");
});

test("a publication dispatch carries only courses and revision; tokens never enter persistent storage", async ({ page }) => {
  const mock = await github(page);
  await login(page);
  await editPlaces(page, 1);
  const stored = await page.evaluate(() => JSON.stringify({ ...localStorage }));
  expect(stored).not.toContain(fakeToken);
  await expect(page.locator("#token")).toHaveValue("");
  await page.getByRole("button", { name: "Änderungen ansehen", exact: true }).click();
  await page.getByRole("button", { name: "Jetzt veröffentlichen", exact: true }).click();
  await expect(page.locator("#publish-status")).toContainText("Veröffentlicht.");
  expect(mock.publication().ref).toBe("main");
  expect(mock.publication().inputs.expected_head).toBe(sha);
  expect(JSON.parse(mock.publication().inputs.courses)[0].remainingPlaces).toBe(1);
  expect(JSON.stringify(mock.publication())).not.toContain(fakeToken);
  expect(mock.runFetches()).toBe(1);
  await page.getByRole("button", { name: "Schließen", exact: true }).click();
  await page.getByRole("button", { name: "Abmelden", exact: true }).click();
  await expect(page.locator("#login-panel")).toBeVisible();
});
for (const [scenario, options, message] of [
  ["invalid credentials", { invalid: true }, "ungültig oder abgelaufen"],
  ["missing permission", { forbidden: true }, "Zugriff abgelehnt"],
  ["failed workflow", { failed: true }, "fehlgeschlagen"],
  ["unconfirmed public version", { wrongVersion: true }, "noch nicht bestätigt"]
]) test(`admin handles ${scenario} without losing the draft`, async ({ page }) => {
  await github(page, options);
  await login(page);
  if (options.invalid) { await expect(page.locator("#status")).toContainText(message); return; }
  await editPlaces(page, 1);
  await page.getByRole("button", { name: "Änderungen ansehen", exact: true }).click();
  await page.getByRole("button", { name: "Jetzt veröffentlichen", exact: true }).click();
  await expect(page.locator("#publish-status")).toContainText(message);
  expect(await page.evaluate(() => localStorage.getItem("julia-course-draft-v1"))).toContain('"remainingPlaces":1');
});

test("remote course conflict prevents dispatch and retains the local draft", async ({ page }) => {
  const mock = await github(page);
  await login(page);
  await editPlaces(page, 1);
  const remote = configCopy(); remote.courses[0].remainingPlaces = 0;
  await page.route(`${apiRoot}/contents/**`, (route) => route.fulfill({ json: { encoding: "base64", content: Buffer.from(JSON.stringify(remote)).toString("base64") } }));
  await page.getByRole("button", { name: "Änderungen ansehen", exact: true }).click();
  await page.getByRole("button", { name: "Jetzt veröffentlichen", exact: true }).click();
  await expect(page.locator("#publish-status")).toContainText("auch auf GitHub geändert");
  expect(mock.publication()).toBeUndefined();
  expect(await page.evaluate(() => localStorage.getItem("julia-course-draft-v1"))).toContain('"remainingPlaces":1');
});

test("admin has no external resources or public navigation link and renders untrusted labels as text", async ({ page }) => {
  const requests = [];
  page.on("request", (request) => { if (!request.url().startsWith("http://127.0.0.1")) requests.push(request.url()); });
  await localEditor(page);
  await page.locator("#course-list article").first().getByRole("button", { name: "Bearbeiten", exact: true }).click();
  await page.getByLabel("Bezeichnung · Deutsch").fill('<img src=x onerror="alert(1)">');
  await page.getByRole("button", { name: "Entwurf speichern", exact: true }).click();
  await expect(page.locator("#course-list h3").first()).toHaveText('<img src=x onerror="alert(1)">');
  await expect(page.locator("#course-list img")).toHaveCount(0);
  expect(requests).toEqual([]);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await page.goto("/");
  await expect(page.locator('a[href*="verwaltung"]')).toHaveCount(0);
});
