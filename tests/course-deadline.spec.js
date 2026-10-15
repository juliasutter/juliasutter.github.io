import { expect, test } from "@playwright/test";

for (const language of ["de", "en"]) {
  for (const [time, state] of [
    ["2026-10-16T18:59:59Z", "open"],
    ["2026-10-16T19:00:00Z", "closed"],
    ["2026-10-17T07:00:00Z", "started"]
  ]) {
    test(`${language}: October registration availability at ${time}`, async ({ page }) => {
      await page.clock.install({ time: new Date(time) });
      await page.goto(language === "de" ? "/" : "/en/");
      const october = page.locator('[data-course-list] [data-course-id="starter-2026-autumn"]');
      await expect(october).toHaveCount(state === "started" ? 0 : 1);
      await expect(page.locator('[data-course-select] option[value="starter-2026-autumn"]')).toHaveCount(state === "open" ? 1 : 0);
      if (state === "closed") {
        await expect(october).toContainText(language === "de" ? "Anmeldung geschlossen" : "Registration closed");
        await expect(october).not.toHaveAttribute("href");
        await expect(october).not.toContainText(language === "de" ? "Plätze frei" : "places left");
      }
      await expect(page.locator('[data-course-list] [data-course-id="starter-2027-winter"]')).toHaveCount(1);
    });
  }
}

test("a page left open cannot submit an October registration after the deadline", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-16T18:59:00Z") });
  let submissions = 0;
  await page.route("https://formcarry.com/**", (route) => {
    submissions += 1;
    return route.fulfill({ json: { code: 200, status: "success" } });
  });
  await page.goto("/");
  const form = page.locator("[data-course-form]");
  await form.locator('[name="first_name"]').fill("Test");
  await form.locator('[name="last_name"]').fill("Person");
  await form.locator('[name="email"]').fill("test@example.com");
  await form.locator('[name="street"]').fill("Teststraße 1");
  await form.locator('[name="postal_code"]').fill("12345");
  await form.locator('[name="city"]').fill("Teststadt");
  await form.locator('[name="early_start_requested"]').check();
  await page.clock.setFixedTime(new Date("2026-10-16T19:00:00Z"));
  await form.locator('button[type="submit"]').click();
  await expect(form.locator("[data-form-status]")).toContainText("Anmeldung geschlossen");
  expect(submissions).toBe(0);
  await expect(form.locator('[name="first_name"]')).toHaveValue("Test");
});
