import { expect, test } from "@playwright/test";
import { installCourseFixture } from "./course-fixtures.js";

test.beforeEach(async ({ page }) => { await installCourseFixture(page); });

test.use({ timezoneId: "America/Los_Angeles" });

const dates = ["2026-10-17", "2026-10-24", "2026-10-31", "2026-11-07", "2026-11-14", "2026-11-21"];
const configureCourses = (page, courses) => page.route("**/assets/course-config.js", (route) => route.fulfill({
  contentType: "application/javascript",
  body: `window.JULIA_SITE_CONFIG=${JSON.stringify({ timeZone: "Europe/Berlin", courses })};`
}));

for (const language of ["de", "en"]) {
  const path = language === "de" ? "/" : "/en/";
  test(`${language}: remaining places are numeric only at three or fewer, and sold-out courses cannot be selected`, async ({ page }) => {
    await page.clock.install({ time: new Date("2026-10-15T10:00:00Z") });
    const quantities = [7, 4, 3, 2, 1, 0];
    await configureCourses(page, quantities.map((remainingPlaces) => ({
      id: `places-${remainingPlaces}`, status: "open", remainingPlaces, dates
    })));
    await page.goto(path);
    for (const quantity of quantities) {
      const row = page.locator(`[data-course-list] [data-course-id="places-${quantity}"]`);
      const expected = quantity === 0 ? (language === "de" ? "Ausgebucht" : "Fully booked")
        : quantity > 3 ? (language === "de" ? "Freie Plätze" : "Places available")
          : language === "de" ? `Noch ${quantity} ${quantity === 1 ? "Platz" : "Plätze"} frei`
            : `${quantity} ${quantity === 1 ? "place" : "places"} left`;
      await expect(row.locator("[data-course-availability]")).toHaveText(expected);
    }
    await expect(page.locator('[data-course-list] [data-course-id="places-0"]')).not.toHaveAttribute("href");
    await expect(page.locator('[data-course-select] option[value="places-0"]')).toHaveCount(0);
    await page.locator('[data-course-list] [data-course-id="places-2"]').click();
    await expect(page.locator("[data-course-form] [data-course-availability]")).toHaveText(language === "de" ? "Noch 2 Plätze frei" : "2 places left");
    await page.locator("[data-course-select]").selectOption("places-7");
    await expect(page.locator("[data-course-form] [data-course-availability]")).toHaveText(language === "de" ? "Freie Plätze" : "Places available");
  });

  for (const [time, visible] of [["2026-10-09T21:59:59Z", false], ["2026-10-09T22:00:00Z", true]]) {
    test(`${language}: list deadline is shown in the final seven Berlin calendar days at ${time}`, async ({ page }) => {
      await page.clock.install({ time: new Date(time) });
      await page.goto(path);
      const october = page.locator('[data-course-list] [data-course-id="starter-2026-autumn"]');
      await expect(october.locator("[data-course-deadline]")).toHaveCount(visible ? 1 : 0);
      const formDeadline = page.locator("[data-course-form] [data-course-deadline]");
      await expect(formDeadline).toHaveText(language === "de"
        ? "Anmeldung bis Freitag, 16. Oktober, 21 Uhr"
        : "Register by Friday, 16 October, 21:00 (Berlin time)");
      await expect(page.locator('[data-course-list] [data-course-id="starter-2027-winter"] [data-course-deadline]')).toHaveCount(0);
      await page.locator("[data-course-select]").selectOption("starter-2027-winter");
      await expect(formDeadline).toHaveText(language === "de"
        ? "Anmeldung bis Dienstag, 12. Januar, 21 Uhr"
        : "Register by Tuesday, 12 January, 21:00 (Berlin time)");
    });
  }
}

test("winter registration closes at 21:00 Berlin time, independent of the visitor's timezone", async ({ page }) => {
  await page.clock.install({ time: new Date("2027-01-12T19:59:59Z") });
  await page.goto("/");
  await expect(page.locator('[data-course-select] option[value="starter-2027-winter"]')).toHaveCount(1);
  await page.clock.setFixedTime(new Date("2027-01-12T20:00:00Z"));
  await page.reload();
  await expect(page.locator('[data-course-select] option[value="starter-2027-winter"]')).toHaveCount(0);
  await expect(page.locator('[data-course-list] [data-course-id="starter-2027-winter"]')).toContainText("Anmeldung geschlossen");
});

test("a waitlist with no remaining places is also excluded from booking", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-15T10:00:00Z") });
  await configureCourses(page, [{ id: "waiting", status: "waitlist", remainingPlaces: 0, dates }]);
  await page.goto("/");
  await expect(page.locator('[data-course-list] [data-course-id="waiting"]')).not.toHaveAttribute("href");
  await expect(page.locator('[data-course-select] option[value="waiting"]')).toHaveCount(0);
  await expect(page.locator("[name=registration_mode]")).toHaveValue("inquiry");
  await expect(page.locator("[data-binding-checkout]")).toBeHidden();
});
