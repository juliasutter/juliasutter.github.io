import { expect, test } from "@playwright/test";

const bookingUrl = "https://calendar.app.google/B3vTLDTfrUF47nM58";
const embedUrl = "https://calendar.google.com/calendar/appointments/schedules/AcZssZ0BujbeeHh7PjShTgs1trg18VaDbZoE7h26y8n-Cj27nWhG7GxY6TcpBGLL2ZfS7Ta0hlERijcc?gv=true";

for (const language of ["de", "en"]) {
  const path = language === "de" ? "/" : "/en/";

  test(`${language}: coaching and course questions preserve inputs and select the right topic`, async ({ page }) => {
    await page.route("https://calendar.google.com/**", (route) => route.abort());
    await page.goto(path);
    await page.locator('.hero-actions a[href="#coaching"]').click();
    await expect(page).toHaveURL(/#coaching$/);
    await expect(page.locator("#coaching-heading")).toBeInViewport();
    await expect(page.locator("#booking-dialog")).toBeHidden();
    await page.locator(".coaching [data-open-form=contact]").click();
    await expect(page.locator("#contact-topic")).toHaveValue("one-on-one");
    await expect(page.locator(".contact-facts")).toBeHidden();
    await expect(page.locator("#contact-heading")).toBeVisible();
    await page.locator("#contact-name").fill("Test Person");
    await page.locator("#contact-message").fill("Meine Frage / My question");
    await page.locator(".course-call [data-booking-trigger]").click();
    await page.locator("#booking-dialog [data-open-form=contact]").click();
    await expect(page.locator("#contact-topic")).toHaveValue("starter-class");
    await page.locator("footer [data-open-form=contact]").click();
    await expect(page.locator("#contact-topic")).toHaveValue("starter-class");
    await expect(page.locator("#contact-message")).toHaveValue("Meine Frage / My question");
    await expect(page.locator("#contact-name")).toHaveValue("Test Person");
    await page.locator("#course-tab").click();
    await expect(page.locator(".contact-facts")).toBeVisible({ visible: page.viewportSize().width > 920 });
    await page.locator("#contact-tab").click();
    await expect(page.locator("#contact-message")).toHaveValue("Meine Frage / My question");
  });

  test(`${language}: booking loads only on demand and all entries reuse the same dialog`, async ({ page }) => {
    const googleRequests = [];
    page.on("request", (request) => {
      if (/google|gstatic/.test(new URL(request.url()).hostname)) googleRequests.push(request.url());
    });
    await page.route("https://calendar.google.com/**", (route) => route.fulfill({
      contentType: "text/html",
      body: '<!doctype html><html lang="en"><title>Booking fixture</title><body><label>First name <input></label><button>Choose time</button></body></html>'
    }));
    await page.goto(path, { waitUntil: "networkidle" });
    expect(googleRequests).toEqual([]);
    const dialog = page.locator("#booking-dialog");
    await expect(dialog).toBeHidden();
    await expect(dialog.locator("iframe")).toHaveCount(0);
    const triggers = page.locator("[data-booking-trigger]");
    await expect(triggers).toHaveCount(2);
    let openedBefore = false;
    for (const trigger of await triggers.all()) {
      await expect(trigger).toHaveAttribute("href", bookingUrl);
      await trigger.click();
      await expect(dialog).toBeVisible();
      await expect(page.locator("dialog[open]")).toHaveCount(1);
      await expect(dialog.locator("iframe")).toHaveAttribute("src", embedUrl);
      await expect(dialog.locator("[data-booking-close]")).toBeFocused();
      const frameInput = page.frameLocator("#booking-dialog iframe").getByLabel("First name");
      if (!openedBefore) await frameInput.fill("Kept between openings");
      openedBefore = true;
      await expect(frameInput).toHaveValue("Kept between openings");
      await dialog.locator("[data-booking-close]").focus();
      // An attempted background focus must stay inside the native modal.
      await page.locator(".hero-actions > a").first().evaluate((element) => element.focus());
      await expect(dialog.locator("[data-booking-close]")).toBeFocused();
      await dialog.locator("[data-booking-close]").click();
      await expect(dialog).toBeHidden();
      await expect(trigger).toBeFocused();
    }
    await expect.poll(() => googleRequests.length).toBe(1);
    await triggers.first().click();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Shift+Tab");
    await expect(dialog.locator("[data-booking-close]")).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(triggers.first()).toBeFocused();
    await expect(page.locator("body")).not.toHaveClass(/booking-open/);
  });

  test(`${language}: unavailable Google content keeps direct booking and written contact reachable`, async ({ page }) => {
    await page.route("https://calendar.google.com/**", (route) => route.abort());
    await page.goto(path);
    await page.locator(".course-call [data-booking-trigger]").click();
    const dialog = page.locator("#booking-dialog");
    const direct = dialog.locator("[data-booking-direct]");
    await expect(direct).toBeVisible();
    await expect(direct).toHaveAttribute("href", bookingUrl);
    await expect(direct).toHaveAttribute("target", "_blank");
    await expect(direct).toHaveAttribute("rel", /noopener/);
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await dialog.locator("[data-open-form=contact]").click();
    await expect(dialog).toBeHidden();
    await expect(page.locator("#contact-panel > h3")).toBeFocused();
    await expect(page.locator("#contact-topic")).toHaveValue("starter-class");
    await expect(page.locator("body")).not.toHaveClass(/booking-open/);
  });

  test(`${language}: booking links work without dialog support`, async ({ page }) => {
    await page.addInitScript(() => { window.HTMLDialogElement.prototype.showModal = undefined; });
    await page.context().route(bookingUrl, (route) => route.fulfill({ contentType: "text/html", body: "Direct booking destination" }));
    await page.goto(path);
    // Simulate the missing user-agent dialog hiding rule as well as missing API.
    await page.addStyleTag({ content: "dialog { display: block; }" });
    await expect(page.locator("#booking-dialog")).toBeHidden();
    const popupPromise = page.waitForEvent("popup");
    await page.locator(".course-call [data-booking-trigger]").click();
    const popup = await popupPromise;
    await expect(popup).toHaveURL(bookingUrl);
    await expect(page.locator("#booking-dialog")).toBeHidden();
    await popup.close();
  });

  test(`${language}: booking links work without JavaScript`, async ({ browser }, testInfo) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: testInfo.project.use.viewport });
    await context.route(bookingUrl, (route) => route.fulfill({ contentType: "text/html", body: "Direct booking destination" }));
    const page = await context.newPage();
    await page.goto(path);
    const popupPromise = page.waitForEvent("popup");
    await page.locator(".course-call [data-booking-trigger]").click();
    const popup = await popupPromise;
    await expect(popup).toHaveURL(bookingUrl);
    await context.close();
  });
}

for (const viewport of [{ width: 320, height: 568 }, { width: 568, height: 320 }]) {
  test(`booking controls fit ${viewport.width} × ${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.route("https://calendar.google.com/**", (route) => route.fulfill({ contentType: "text/html", body: "Booking fixture" }));
    await page.goto("/");
    await page.locator(".course-call [data-booking-trigger]").click();
    const dialog = page.locator("#booking-dialog");
    await expect(dialog.locator("[data-booking-close]")).toBeInViewport();
    await expect(dialog.locator("[data-booking-direct]")).toBeInViewport();
    await expect(dialog.locator("[data-open-form=contact]")).toBeInViewport();
    const frame = await dialog.locator("iframe").boundingBox();
    expect(frame.height).toBeGreaterThan(100);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}
