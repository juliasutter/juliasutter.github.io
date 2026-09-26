import { expect, test } from "@playwright/test";

const courses = [
  {
    id: "early", labelDe: "Frühkurs", labelEn: "Early course", status: "open", format: "online",
    startTime: "09:00", endTime: "11:00",
    dates: ["2099-01-05", "2099-01-12", "2099-01-19", "2099-01-26", "2099-02-02", "2099-02-09"]
  },
  {
    id: "later", labelDe: "Folgekurs", labelEn: "Later course", status: "open", format: "vor_ort",
    startTime: "18:00", endTime: "20:30",
    dates: ["2099-03-02", "2099-03-09", "2099-03-16", "2099-03-23", "2099-03-30", "2099-04-06"]
  },
  {
    id: "waiting", labelDe: "Wartelistenkurs", labelEn: "Waitlist course", status: "waitlist", format: "online",
    dates: ["2099-05-04", "2099-05-11", "2099-05-18", "2099-05-25", "2099-06-01", "2099-06-08"]
  }
];

for (const language of ["de", "en"]) {
  test(`${language}: all available dates lead to the matching registration or waitlist`, async ({ page }) => {
    await page.route("**/assets/course-config.js", (route) => route.fulfill({
      contentType: "application/javascript",
      body: `window.JULIA_SITE_CONFIG=${JSON.stringify({
        formEndpoint: "", timeZone: "Europe/Berlin", priceEur: 399, friendPriceEur: 349,
        courses: [...courses, { ...courses[0], id: "closed", status: "closed" }]
      })};`
    }));
    await page.goto(language === "de" ? "/" : "/en/");
    const list = page.locator("[data-course-list]");
    await expect(list.locator("li")).toHaveCount(3);
    await expect(list.locator("strong")).toHaveText(language === "de" ? [
      "5. Januar – 9. Februar 2099", "2. März – 6. April 2099", "4. Mai – 8. Juni 2099"
    ] : [
      "5 January – 9 February 2099", "2 March – 6 April 2099", "4 May – 8 June 2099"
    ]);
    await expect(list).toContainText(language === "de" ? "2. März – 6. April 2099" : "2 March – 6 April 2099");
    await expect(list).toContainText("18:00–20:30");
    await expect(list.locator('[data-course-id="later"]')).toHaveAccessibleName(/18:00–20:30/);

    await list.locator('[data-course-id="later"]').click();
    await expect(page.locator("[data-course-select]")).toHaveValue("later");
    await expect(page.locator("[name=registration_mode]")).toHaveValue("open");
    await expect(page.locator("[data-binding-course-schedule]")).toContainText(language === "de" ? "2. März–6. Apr. 2099" : "2 Mar–6 Apr 2099");
    await expect(page.locator("[data-binding-course-schedule]")).toContainText("18:00–20:30");
    if (language === "de") {
      await expect(page.locator("[data-binding-course-schedule-mobile]")).toContainText("2.03.–6.04.2099 · 6×");
      await expect(page.locator("[data-binding-course-schedule-mobile]")).toContainText("18–20:30 Uhr");
    }
    await expect(page.locator("[data-binding-course-format]")).toHaveText(language === "de" ? "Vor Ort" : "In person");
    await expect(page.locator("#course-panel > h3")).toBeFocused();

    await list.locator('[data-course-id="waiting"]').click();
    await expect(page.locator("[data-course-select]")).toHaveValue("waiting");
    await expect(page.locator("[name=registration_mode]")).toHaveValue("waitlist");
    await expect(page.locator("[data-binding-checkout]")).toBeHidden();
    await expect(page.locator("[data-course-form] button[type=submit]")).toHaveText(language === "de" ? "Auf die Warteliste" : "Join the waitlist");

    await page.locator("[data-course-select]").selectOption("early");
    await expect(page.locator("[data-binding-course-schedule]")).toContainText(language === "de" ? "5. Jan.–9. Feb. 2099" : "5 Jan–9 Feb 2099");
    await expect(page.locator("[data-binding-course-schedule]")).toContainText("09:00–11:00");
    if (language === "de") {
      await expect(page.locator("[data-binding-course-schedule-mobile]")).toContainText("5.01.–9.02.2099 · 6×");
      await expect(page.locator("[data-binding-course-schedule-mobile]")).toContainText("9–11 Uhr");
    }
    await expect(page.locator("[data-binding-checkout]")).toBeVisible();
  });
}
