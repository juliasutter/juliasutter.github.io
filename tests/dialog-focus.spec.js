import { expect, test } from "@playwright/test";

async function expectFocusRing(element, visible) {
  await expect(element).toBeFocused();
  await expect.poll(() => element.evaluate((node) => {
    const style = window.getComputedStyle(node);
    return style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0;
  })).toBe(visible);
}

async function activate(element, hasTouch) {
  if (hasTouch) await element.tap();
  else await element.click();
}

async function tab(page, browserName, backwards = false) {
  // macOS WebKit uses Option+Tab to include buttons in keyboard navigation.
  const option = browserName === "webkit" && process.platform === "darwin" ? "Alt+" : "";
  await page.keyboard.press(`${option}${backwards ? "Shift+" : ""}Tab`);
}

test.beforeEach(async ({ page }) => {
  await page.route("https://calendar.google.com/**", (route) => route.fulfill({
    contentType: "text/html",
    body: '<!doctype html><html lang="en"><title>Booking fixture</title><body><label>Name <input></label><button>Choose time</button></body></html>'
  }));
});

for (const path of ["/", "/en/"]) {
  test(`${path}: pointer opening and closing never outline dialog focus targets`, async ({ page, hasTouch }) => {
    await page.goto(path);
    const storyDialog = page.locator("#story-dialog");
    for (const trigger of await page.locator(".tool-story-trigger").all()) {
      await activate(trigger, hasTouch);
      await expectFocusRing(storyDialog.locator(".story-title"), false);
      await activate(storyDialog.locator("[data-story-close]"), hasTouch);
      await expect(storyDialog).toBeHidden();
      await expect(storyDialog.locator(".story-title")).toHaveCount(0);
      await expectFocusRing(trigger, false);
      await activate(trigger, hasTouch);
      await activate(storyDialog.locator("[data-story-return]"), hasTouch);
      await expect(storyDialog.locator(".story-title")).toHaveCount(0);
      await expectFocusRing(trigger, false);
    }
    const bookingDialog = page.locator("#booking-dialog");
    for (const trigger of await page.locator("[data-booking-trigger]").all()) {
      await activate(trigger, hasTouch);
      await expectFocusRing(bookingDialog.locator("[data-booking-close]"), false);
      await activate(bookingDialog.locator("[data-booking-close]"), hasTouch);
      await expect(bookingDialog).toBeHidden();
      await expectFocusRing(trigger, false);
    }
  });

  test(`${path}: keyboard opening, navigation and closing retain visible focus`, async ({ page, browserName }) => {
    await page.goto(path);
    for (const selector of [".tool-item .tool-story-trigger", ".about-more .tool-story-trigger"]) {
      const trigger = page.locator(selector).first();
      const dialog = page.locator("#story-dialog");
      for (const key of ["Enter", "Space"]) {
        await trigger.focus();
        await page.keyboard.press(key);
        await expectFocusRing(dialog.locator(".story-title"), true);
        await tab(page, browserName);
        await expectFocusRing(dialog.locator("[data-story-return]"), true);
        await tab(page, browserName, true);
        await expectFocusRing(dialog.locator("[data-story-close]"), true);
        await page.keyboard.press("Escape");
        await expect(dialog).toBeHidden();
        await expect(dialog.locator(".story-title")).toHaveCount(0);
        await expectFocusRing(trigger, true);
      }
    }
    const trigger = page.locator("[data-booking-trigger]").first();
    await trigger.focus();
    await page.keyboard.press("Enter");
    await expectFocusRing(page.locator("[data-booking-close]"), true);
    await page.keyboard.press("Enter");
    await expectFocusRing(trigger, true);
  });

  test(`${path}: switching from pointer to keyboard restores rings including after iframe focus`, async ({ page, hasTouch, browserName }) => {
    await page.goto(path);
    const trigger = page.locator(".about-more .tool-story-trigger");
    await activate(trigger, hasTouch);
    await expectFocusRing(page.locator("#story-dialog .story-title"), false);
    await tab(page, browserName);
    await expectFocusRing(page.locator("#story-dialog [data-story-return]"), true);
    await page.keyboard.press("Escape");
    await expect(page.locator("#story-dialog .story-title")).toHaveCount(0);
    await expectFocusRing(trigger, true);
    await activate(trigger, hasTouch);
    await expectFocusRing(page.locator("#story-dialog .story-title"), false);
    await activate(page.locator("[data-story-close]"), hasTouch);
    await expect(page.locator("#story-dialog .story-title")).toHaveCount(0);
    await expectFocusRing(trigger, false);
    await page.keyboard.press("Enter");
    await expectFocusRing(page.locator("#story-dialog .story-title"), true);
    await page.keyboard.press("Escape");
    await expect(page.locator("#story-dialog .story-title")).toHaveCount(0);

    await activate(page.locator("[data-booking-trigger]").first(), hasTouch);
    const close = page.locator("[data-booking-close]");
    await expectFocusRing(close, false);
    const input = page.frameLocator("#booking-dialog iframe").getByRole("textbox", { name: "Name" });
    // Enter the cross-origin frame by pointer, so its keyboard events cannot
    // clear any suppression left behind on the parent's close button.
    await activate(input, hasTouch);
    await tab(page, browserName, true);
    await expectFocusRing(close, true);
    await page.keyboard.press("Escape");
    await expectFocusRing(page.locator("[data-booking-trigger]").first(), true);
  });
}
