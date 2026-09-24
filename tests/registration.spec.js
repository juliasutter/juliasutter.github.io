import { expect, test } from "@playwright/test";

const endpoint = "https://formcarry.com/s/registration-test";
const course = {
  id: "open-course", labelDe: "Testkurs", labelEn: "Test course", status: "open", format: "online",
  dates: ["2099-01-05", "2099-01-12", "2099-01-19", "2099-01-26", "2099-02-02", "2099-02-09"]
};
const configure = (page, courses = [course]) => page.route("**/assets/course-config.js", (route) => route.fulfill({
  contentType: "application/javascript",
  body: `window.JULIA_SITE_CONFIG=${JSON.stringify({ formEndpoint: endpoint, timeZone: "Europe/Berlin", priceEur: 425, friendPriceEur: 375, courses })};`
}));

for (const language of ["de", "en"]) {
  const path = language === "de" ? "/" : "/en/";
  const regularPrice = language === "de" ? "425 €" : "€425";
  const friendPrice = language === "de" ? "375 €" : "€375";

  test(`${language}: friend registration validates the name and sends the displayed price`, async ({ page }) => {
    await configure(page);
    const submissions = [];
    await page.route(endpoint, async (route) => {
      const body = await new globalThis.Request(endpoint, {
        method: "POST", headers: { "content-type": route.request().headers()["content-type"] },
        body: route.request().postDataBuffer()
      }).formData();
      submissions.push(Object.fromEntries(body));
      await route.fulfill({ contentType: "application/json", body: JSON.stringify({ code: 200, status: "success" }) });
    });
    await page.goto(path);
    const form = page.locator("[data-course-form]");
    const friend = form.locator("[name=friend_registration]");
    const friendName = form.locator("[name=friend_name]");
    const price = form.locator("[data-binding-price]");
    await expect(price).toHaveText(regularPrice);
    await expect(friendName).toBeHidden();
    await form.locator("[name=first_name]").fill("Test");
    await form.locator("[name=last_name]").fill("Person");
    await form.locator("[name=email]").fill("test@example.com");
    await form.locator("[name=street]").fill("Testweg 1");
    await form.locator("[name=postal_code]").fill("10115");
    await form.locator("[name=city]").fill("Berlin");
    await friend.check();
    await expect(price).toHaveText(friendPrice);
    await expect(friendName).toHaveAttribute("required", "");
    await form.locator("button[type=submit]").click();
    await expect(friendName).toBeFocused();
    expect(submissions).toHaveLength(0);
    await friendName.fill("Alex Beispiel");
    await friend.uncheck();
    await expect(price).toHaveText(regularPrice);
    await expect(friendName).toBeDisabled();
    await friend.check();
    await form.locator("button[type=submit]").click();
    await expect(form.locator("[data-form-status]")).toHaveClass(/is-success/);
    expect(submissions).toHaveLength(1);
    expect(submissions[0]).toMatchObject({ friend_registration: "yes", friend_name: "Alex Beispiel", price_eur: "375", registration_mode: "open" });
    await expect(price).toHaveText(regularPrice);
    await expect(friend).not.toBeChecked();
    await expect(friendName).toBeHidden();
  });

  test(`${language}: inquiry links bring the active form and its heading into view`, async ({ page }) => {
    await page.goto(path);
    await page.locator(".faq-intro [data-open-form=contact]").click();
    const heading = page.locator("#contact-panel > h3");
    await expect(heading).toBeFocused();
    await expect.poll(async () => {
      const bounds = await heading.boundingBox();
      return bounds.y >= 0 && bounds.y + bounds.height < page.viewportSize().height;
    }).toBe(true);
    await expect(page.locator("#contact-name")).toBeInViewport();
    await page.keyboard.press("Tab");
    await expect(page.locator("#contact-name")).toBeFocused();
  });
}

test("friend fields and price are excluded from non-binding submissions", async ({ page }) => {
  const waitlist = { ...course, id: "waitlist-course", status: "waitlist" };
  await configure(page, [course, waitlist]);
  await page.goto("/");
  const form = page.locator("[data-course-form]");
  await form.locator("[name=friend_registration]").check();
  await form.locator("[name=friend_name]").fill("Alex Beispiel");
  await form.locator("[name=course_id]").selectOption("waitlist-course");
  await expect(form.locator("[name=friend_registration]")).toBeDisabled();
  await expect(form.locator("[name=friend_name]")).toBeDisabled();
  const payload = await form.evaluate((element) => Object.fromEntries(new window.FormData(element)));
  expect(payload.registration_mode).toBe("waitlist");
  expect(payload).not.toHaveProperty("friend_registration");
  expect(payload).not.toHaveProperty("friend_name");
  expect(payload).not.toHaveProperty("price_eur");
  await form.locator("[name=course_id]").selectOption("open-course");
  await expect(form.locator("[data-binding-price]")).toHaveText("375 €");
});

test("a failed friend registration retains its price and payment-obligation button", async ({ page }) => {
  await configure(page);
  await page.route(endpoint, (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ code: 422, status: "error" }) }));
  await page.goto("/");
  const form = page.locator("[data-course-form]");
  for (const [name, value] of Object.entries({ first_name: "Test", last_name: "Person", email: "test@example.com", street: "Testweg 1", postal_code: "10115", city: "Berlin" })) {
    await form.locator(`[name=${name}]`).fill(value);
  }
  await form.locator("[name=friend_registration]").check();
  await form.locator("[name=friend_name]").fill("Alex Beispiel");
  await form.locator("button[type=submit]").click();
  await expect(form.locator("[data-form-status]")).toHaveClass(/is-error/);
  await expect(form.locator("[data-binding-price]")).toHaveText("375 €");
  await expect(form.locator("[name=friend_name]")).toHaveValue("Alex Beispiel");
  await expect(form.locator("button[type=submit]")).toHaveText("Zahlungspflichtig anmelden");
});
