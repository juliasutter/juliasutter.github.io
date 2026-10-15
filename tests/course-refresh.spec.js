import { expect, test } from "@playwright/test";
import { fixtureConfig } from "./course-fixtures.js";

const endpoint = "https://formcarry.com/s/refresh-test";
const current = { ...fixtureConfig, dataVersion: "test-version", formEndpoint: endpoint };
const configure = async (page, config = current) => {
  await page.clock.install({ time: new Date("2026-10-15T10:00:00Z") });
  await page.route("**/assets/course-config.js", (route) => route.fulfill({ contentType: "application/javascript", body: `window.JULIA_SITE_CONFIG=${JSON.stringify(config)};` }));
};
async function fill(page) {
  const form = page.locator("[data-course-form]");
  for (const [name, value] of Object.entries({ first_name: "Test", last_name: "Person", email: "test@example.com", street: "Testweg 1", postal_code: "10115", city: "Berlin" })) await form.locator(`[name=${name}]`).fill(value);
  await form.locator("[name=early_start_requested]").check();
  return form;
}
for (const behavior of ["slow", "failed"]) test(`a ${behavior} availability refresh never delays or prevents registration`, async ({ page }) => {
  await configure(page);
  let release;
  const waiting = new Promise((resolve) => { release = resolve; });
  await page.route("**/assets/course-config.json*", async (route) => {
    if (behavior === "slow") await waiting;
    if (behavior === "failed") await route.abort();
    else await route.fulfill({ json: current });
  });
  let posts = 0;
  await page.route(endpoint, (route) => { posts += 1; return route.fulfill({ json: { code: 200, status: "success" } }); });
  await page.goto("/");
  const form = await fill(page);
  await form.locator("button[type=submit]").click();
  await expect(page.locator("#course-panel .form-confirmation")).toBeVisible();
  expect(posts).toBe(1);
  release();
});
for (const reason of ["sold-out", "deleted", "archived"]) test(`known ${reason} state blocks a stale form, retaining all input and its selected course`, async ({ page }) => {
  await configure(page);
  const updated = structuredClone(current);
  if (reason === "sold-out") updated.courses[0].remainingPlaces = 0;
  if (reason === "deleted") updated.courses.shift();
  if (reason === "archived") updated.courses[0].archived = true;
  await page.route("**/assets/course-config.json*", (route) => route.fulfill({ json: updated }));
  let posts = 0;
  await page.route(endpoint, (route) => { posts += 1; return route.fulfill({ json: { code: 200, status: "success" } }); });
  await page.goto("/");
  const form = await fill(page);
  await expect(form.locator("[data-course-availability]")).toHaveText(reason === "sold-out" ? "Ausgebucht" : "Anmeldung geschlossen");
  await form.locator("button[type=submit]").click();
  await expect(form.locator("[data-form-status]")).not.toBeEmpty();
  await expect(form.locator("[name=first_name]")).toHaveValue("Test");
  await expect(form.locator("[name=course_id]")).toHaveValue("starter-2026-autumn");
  expect(posts).toBe(0);
});
test("refreshes are throttled and do not silently change prices", async ({ page }) => {
  await configure(page);
  const updated = structuredClone(current); updated.courses[0].priceEur = 999;
  let reads = 0;
  await page.route("**/assets/course-config.json*", (route) => { reads += 1; return route.fulfill({ json: updated }); });
  await page.goto("/");
  await fill(page);
  await expect.poll(() => reads).toBe(1);
  await expect(page.locator("[data-binding-price]")).toHaveText("399 €");
  await page.locator("[name=first_name]").focus();
  expect(reads).toBe(1);
});
test("per-course cent prices, locations and irregular times appear consistently in both languages", async ({ page }) => {
  const config = structuredClone(current);
  config.dataVersion = undefined;
  const course = config.courses[0];
  course.priceEur = 425.5; course.friendPriceEur = 375.5;
  course.format = "vor_ort"; course.location = "Kempten";
  course.dates[1] = "2026-10-25";
  course.sessionTimes = { "2026-10-25": { startTime: "10:00", endTime: "12:30" } };
  await configure(page, config);
  for (const language of ["de", "en"]) {
    await page.goto(language === "de" ? "/" : "/en/");
    await expect(page.locator("[data-binding-price]")).toHaveText(language === "de" ? "425,5 €" : "€425.5");
    await expect(page.locator("[data-binding-course-format]")).toContainText("Kempten");
    await expect(page.locator("[data-binding-session-dates]")).toContainText("10:00–12:30");
    await page.locator("[name=friend_registration]").check();
    await expect(page.locator("[name=price_eur]")).toHaveValue("375.5");
    await expect(page.locator("[data-binding-price]")).toHaveText(language === "de" ? "375,5 €" : "€375.5");
  }
});

for (const [before, after] of [["open", "waitlist"], ["waitlist", "open"]]) test(`a refreshed ${before}→${after} change requires reviewing the new registration type`, async ({ page }) => {
  const initial = structuredClone(current); initial.courses[0].status = before;
  const updated = structuredClone(initial); updated.courses[0].status = after;
  await configure(page, initial);
  await page.route("**/assets/course-config.json*", (route) => route.fulfill({ json: updated }));
  await page.goto("/");
  const form = page.locator("[data-course-form]");
  await form.locator("[name=first_name]").fill("Test");
  await expect(form.locator(".course-change-notice")).toBeVisible();
  await expect(form.locator("[name=registration_mode]")).toHaveValue(before);
  await form.getByRole("button", { name: "Aktuelle Kursangaben ansehen", exact: true }).click();
  await expect(form.locator("[name=registration_mode]")).toHaveValue(after);
  await expect(form.locator("[name=first_name]")).toHaveValue("Test");
  if (after === "waitlist") await expect(form.locator("[name=price_eur]")).toBeDisabled();
  else await expect(form.locator("[name=price_eur]")).toBeEnabled();
});

test("reopening a sold-out selected course re-enables its ID in the submitted form", async ({ page }) => {
  await configure(page);
  const updated = structuredClone(current); updated.courses[0].remainingPlaces = 0;
  await page.route("**/assets/course-config.json*", (route) => route.fulfill({ json: updated }));
  let payload;
  await page.route(endpoint, async (route) => {
    payload = Object.fromEntries(await new globalThis.Request(endpoint, { method: "POST", headers: { "content-type": route.request().headers()["content-type"] }, body: route.request().postDataBuffer() }).formData());
    await route.fulfill({ json: { code: 200, status: "success" } });
  });
  await page.goto("/");
  const form = await fill(page);
  const selected = form.locator('option[value="starter-2026-autumn"]');
  await expect(selected).toBeDisabled();
  updated.courses[0].remainingPlaces = 2;
  await page.clock.fastForward(61000);
  await expect(selected).toBeEnabled();
  await form.locator("button[type=submit]").click();
  await expect(page.locator("#course-panel .form-confirmation")).toBeVisible();
  expect(payload.course_id).toBe("starter-2026-autumn");
});

test("known new prices cannot be submitted as an obsolete order; reviewing updates the quote and keeps personal input", async ({ page }) => {
  await configure(page);
  const updated = structuredClone(current); updated.courses[0].priceEur = 450;
  await page.route("**/assets/course-config.json*", (route) => route.fulfill({ json: updated }));
  let posts = 0;
  await page.route(endpoint, (route) => { posts += 1; return route.fulfill({ json: { code: 200, status: "success" } }); });
  await page.goto("/");
  const form = await fill(page);
  await expect(form.locator(".course-change-notice")).toBeVisible();
  await expect(form.locator("[name=price_eur]")).toHaveValue("399");
  await form.locator("button[type=submit]").click();
  await expect(form.locator("[data-form-status]")).toContainText("aktualisiert");
  expect(posts).toBe(0);
  await form.getByRole("button", { name: "Aktuelle Kursangaben ansehen", exact: true }).click();
  await expect(form.locator("[name=price_eur]")).toHaveValue("450");
  await expect(form.locator("[name=first_name]")).toHaveValue("Test");
  await form.locator("button[type=submit]").click();
  await expect(page.locator("#course-panel .form-confirmation")).toBeVisible();
  expect(posts).toBe(1);
});

test("when every course was initially sold out, a reopened course becomes explicitly bookable", async ({ page }) => {
  const initial = { ...structuredClone(current), courses: [{ ...structuredClone(current.courses[0]), remainingPlaces: 0 }] };
  await configure(page, initial);
  const updated = structuredClone(initial); updated.courses[0].remainingPlaces = 2;
  await page.route("**/assets/course-config.json*", (route) => route.fulfill({ json: updated }));
  await page.goto("/");
  await expect(page.locator("[name=registration_mode]")).toHaveValue("inquiry");
  await page.locator("[data-course-form] [name=first_name]").fill("Test");
  const row = page.locator('[data-course-list] [data-course-id="starter-2026-autumn"]');
  await expect(row).toHaveAttribute("href", "#anmeldung");
  await row.click();
  await expect(page.locator("[name=registration_mode]")).toHaveValue("open");
  await expect(page.locator("[name=course_id]")).toHaveValue("starter-2026-autumn");
  await expect(page.locator("[data-binding-checkout]")).toBeVisible();
  await expect(page.locator("[data-course-form] [name=first_name]")).toHaveValue("Test");
});
