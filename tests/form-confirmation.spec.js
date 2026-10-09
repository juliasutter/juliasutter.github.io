import { expect, test } from "@playwright/test";

const endpoint = "https://formcarry.com/s/confirmation-test";
const course = {
  id: "selected-course", labelDe: "Testkurs", labelEn: "Test course", status: "open",
  dates: ["2099-03-02", "2099-03-09", "2099-03-16", "2099-03-23", "2099-03-30", "2099-04-06"]
};

for (const language of ["de", "en"]) {
  const path = language === "de" ? "/" : "/en/";

  test(`${language}: contact success replaces the form, takes focus and survives tab changes`, async ({ page }) => {
    await page.route("**/assets/course-config.js", (route) => route.fulfill({
      contentType: "application/javascript",
      body: `window.JULIA_SITE_CONFIG=${JSON.stringify({ formEndpoint: endpoint, courses: [] })};`
    }));
    let requests = 0;
    await page.route(endpoint, (route) => {
      requests += 1;
      return route.fulfill({ json: { code: 200, status: "success" } });
    });
    await page.goto(path);
    await page.locator("[data-form-tab=contact]").click();
    const panel = page.locator("#contact-panel");
    await panel.locator("[name=name]").fill("Test Person");
    await panel.locator("[name=email]").fill("test@example.com");
    await panel.locator("[name=topic]").selectOption("other");
    await panel.locator("[name=message]").fill("A test message.");
    await panel.locator("button[type=submit]").click();
    const confirmation = panel.locator(".form-confirmation");
    await expect(confirmation).toBeVisible();
    await expect(confirmation).toBeFocused();
    await expect(confirmation).toHaveAccessibleName(language === "de" ? "Deine Nachricht ist angekommen!" : "Your message has arrived!");
    await expect(panel.locator("form")).toHaveCount(0);
    await expect(confirmation.locator("[data-confirmation-summary]")).toBeHidden();
    await expect(confirmation).toBeInViewport({ ratio: 0.9 });
    await page.locator("[data-form-tab=course]").click();
    await expect(page.locator("[data-course-form]")).toBeVisible();
    await page.locator(".faq-contact [data-open-form=contact]").click();
    await expect(confirmation).toBeVisible();
    await expect(confirmation.locator("h3")).toBeFocused();
    expect(requests).toBe(1);
  });

  for (const mode of ["inquiry", "waitlist"]) {
    test(`${language}: ${mode} confirmation does not imply a paid booking`, async ({ page }) => {
      await page.route("**/assets/course-config.js", (route) => route.fulfill({
        contentType: "application/javascript",
        body: `window.JULIA_SITE_CONFIG=${JSON.stringify({ formEndpoint: endpoint, courses: mode === "inquiry" ? [] : [{ ...course, status: mode }] })};`
      }));
      await page.route(endpoint, (route) => route.fulfill({ json: { code: 200, status: "success" } }));
      await page.goto(path);
      const form = page.locator("[data-course-form]");
      await form.locator("[name=first_name]").fill("Test");
      await form.locator("[name=last_name]").fill("Person");
      await form.locator("[name=email]").fill("test@example.com");
      await form.locator("button[type=submit]").click();
      const confirmation = page.locator("#course-panel .form-confirmation");
      await expect(confirmation).toBeVisible();
      await expect(confirmation.locator("h3")).toContainText(mode === "waitlist" ? /Warteliste|waitlist/i : /Anfrage|request/i);
      await expect(confirmation).not.toContainText(/€|Rechnung|invoice/);
      if (mode === "waitlist") await expect(confirmation.locator("[data-confirmation-summary]")).toContainText("2099");
      else await expect(confirmation.locator("[data-confirmation-summary]")).toBeHidden();
    });
  }
}

test("confirmation reflects the submitted course and price even if fields change while sending", async ({ page }) => {
  await page.route("**/assets/course-config.js", (route) => route.fulfill({
    contentType: "application/javascript",
    body: `window.JULIA_SITE_CONFIG=${JSON.stringify({ formEndpoint: endpoint, priceEur: 425, friendPriceEur: 375, courses: [course, { ...course, id: "other-course", dates: ["2099-05-04", "2099-05-11", "2099-05-18", "2099-05-25", "2099-06-01", "2099-06-08"] }] })};`
  }));
  let finishRequest;
  const responseReady = new Promise((resolve) => { finishRequest = resolve; });
  await page.route(endpoint, async (route) => {
    await responseReady;
    await route.fulfill({ json: { code: 200, status: "success" } });
  });
  await page.goto("/");
  const form = page.locator("[data-course-form]");
  for (const [name, value] of Object.entries({ first_name: "Test", last_name: "Person", email: "test@example.com", street: "Testweg 1", postal_code: "10115", city: "Berlin" })) {
    await form.locator(`[name=${name}]`).fill(value);
  }
  await form.locator("[name=friend_registration]").check();
  await form.locator("[name=friend_name]").fill("Alex Beispiel");
  const sent = page.waitForRequest(endpoint);
  await form.locator("button[type=submit]").click();
  await sent;
  await form.locator("[name=course_id]").selectOption("other-course");
  await form.locator("[name=friend_registration]").uncheck();
  finishRequest();
  await expect(page.locator(".form-confirmation [data-confirmation-summary]")).toHaveText("2. März – 6. April 2099 · 375 €");
});
