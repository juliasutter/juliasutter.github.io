import { expect, test } from "@playwright/test";

const languages = [
  { name: "de", path: "/", section: "#ueber-julia", label: "Über Julia", returnLabel: "Zurück zu Über Julia", trigger: "Meine Geschichte lesen" },
  { name: "en", path: "/en/", section: "#about-julia", label: "About Julia", returnLabel: "Back to About Julia", trigger: "Read my story" }
];

for (const language of languages) {
  test(`${language.name}: biography opens in the shared story dialog and restores the anecdote presentation`, async ({ page }) => {
    await page.goto(language.path);
    const section = page.locator(language.section);
    const details = section.locator("#story-julia");
    const summary = details.locator(".tool-story-trigger");
    const source = details.locator(".tool-story-article");
    const dialog = page.locator("#story-dialog");
    const paragraphs = await source.locator(".story-prose p").allTextContents();
    expect(paragraphs.length).toBeGreaterThan(2);
    await expect(summary).toContainText(language.trigger);
    await expect(summary).toHaveAttribute("aria-controls", "story-dialog");

    await summary.click();
    await expect(dialog).toBeVisible();
    await expect(page.locator("dialog[open]")).toHaveCount(1);
    await expect(dialog).toHaveAttribute("aria-labelledby", "story-julia-title");
    await expect(dialog.locator(".story-prose p")).toHaveText(paragraphs);
    await expect(dialog.locator("#story-julia-title")).toBeFocused();
    await expect(page.locator("#story-julia-title")).toHaveCount(1);
    await expect(dialog.locator("[data-story-tool]")).toHaveText(language.label);
    await expect(dialog.locator("[data-story-art]")).toBeHidden();
    await expect(dialog.locator("[data-story-return]")).toHaveText(language.returnLabel);
    await expect(dialog.locator("a, [data-booking-trigger]")).toHaveCount(0);
    await expect(details).not.toHaveAttribute("open", "");

    await dialog.locator("[data-story-close]").click();
    await expect(dialog).toBeHidden();
    await expect(summary).toBeFocused();
    await expect(source).toHaveCount(1);

    const anecdote = page.locator(".tool-item .tool-story").first();
    const anecdoteName = await anecdote.locator("xpath=parent::*").locator("h3").innerText();
    await anecdote.locator(".tool-story-trigger").click();
    await expect(dialog.locator("[data-story-tool]")).toHaveText(anecdoteName);
    await expect(dialog.locator("[data-story-art]")).toBeVisible();
    await expect(dialog.locator("[data-story-return]")).not.toHaveText(language.returnLabel);
    await dialog.locator("[data-story-close]").click();
  });

  test(`${language.name}: biography keyboard closing preserves focus and page position; reopening resets content scroll`, async ({ page }) => {
    await page.goto(language.path);
    const summary = page.locator(`${language.section} #story-julia .tool-story-trigger`);
    const dialog = page.locator("#story-dialog");
    const content = dialog.locator("[data-story-content]");
    await summary.scrollIntoViewIfNeeded();
    await summary.focus();
    const initialScroll = await page.evaluate(() => window.scrollY);
    await page.keyboard.press("Enter");
    await expect(dialog).toBeVisible();
    await expect(dialog.locator(".story-title")).toBeFocused();
    await content.evaluate((element) => { element.scrollTop = element.scrollHeight; });
    await expect.poll(() => content.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    await dialog.locator("[data-story-return]").click();
    await expect(summary).toBeFocused();
    expect(await page.evaluate(() => window.scrollY)).toBe(initialScroll);

    await summary.focus();
    await page.keyboard.press("Space");
    await expect(dialog).toBeVisible();
    expect(await content.evaluate((element) => element.scrollTop)).toBe(0);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(summary).toBeFocused();
    expect(await page.evaluate(() => window.scrollY)).toBe(initialScroll);
  });

  test(`${language.name}: biography has native details fallback without dialog support`, async ({ page }) => {
    await page.addInitScript(() => { window.HTMLDialogElement.prototype.showModal = undefined; });
    await page.goto(language.path);
    const details = page.locator(`${language.section} #story-julia`);
    const summary = details.locator("summary");
    await expect(summary).not.toHaveAttribute("aria-haspopup", "dialog");
    await summary.click();
    await expect(details).toHaveAttribute("open", "");
    await expect(details.locator(".story-prose p").last()).toBeVisible();
    await expect(page.locator("#story-dialog")).toBeHidden();
  });

  test(`${language.name}: biography remains readable without JavaScript`, async ({ browser }, testInfo) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport: testInfo.project.use.viewport,
      baseURL: testInfo.project.use.baseURL
    });
    const page = await context.newPage();
    await page.goto(language.path);
    const details = page.locator(`${language.section} #story-julia`);
    await details.locator("summary").click();
    await expect(details).toHaveAttribute("open", "");
    await expect(details.locator(".story-prose p").last()).toBeVisible();
    await context.close();
  });

  test(`${language.name}: About call opens the existing booking dialog`, async ({ page }) => {
    await page.route("https://calendar.google.com/**", (route) => route.fulfill({ contentType: "text/html", body: "Booking fixture" }));
    await page.goto(language.path);
    const trigger = page.locator(`${language.section} .about-call [data-booking-trigger]`);
    const dialog = page.locator("#booking-dialog");
    await trigger.click();
    await expect(dialog).toBeVisible();
    await expect(dialog.locator("iframe")).toHaveAttribute("src", /calendar\.google\.com\/calendar\/appointments\/schedules\//);
    await dialog.locator("[data-booking-close]").click();
    await expect(trigger).toBeFocused();
  });

  test(`${language.name}: About layout preserves editorial order and avoids overflow at five widths`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-desktop");
    await page.goto(language.path);
    await page.evaluate(() => document.fonts.ready);

    for (const width of [360, 390, 720, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const layout = await page.locator(language.section).evaluate((section) => {
        const rect = (selector) => {
          const { left, top, right, bottom, width, height } = section.querySelector(selector).getBoundingClientRect();
          return { left, top, right, bottom, width, height };
        };
        return {
          overflow: document.documentElement.scrollWidth > window.innerWidth,
          heading: rect(".about-heading"),
          portrait: rect(".about-portrait img"),
          story: rect(".about-story"),
          more: rect("#story-julia"),
          quote: rect(".about-quote-block"),
          call: rect(".about-call")
        };
      });
      const { heading, portrait, story, more, quote, call } = layout;
      expect(layout.overflow, `${language.name} at ${width}px`).toBe(false);
      for (const [name, box] of Object.entries({ heading, portrait, story, more, quote, call })) {
        expect(box.width, `${name} width at ${width}px`).toBeGreaterThan(0);
        expect(box.left, `${name} left at ${width}px`).toBeGreaterThanOrEqual(-1);
        expect(box.right, `${name} right at ${width}px`).toBeLessThanOrEqual(width + 1);
      }
      expect(story.top).toBeLessThanOrEqual(more.top + 1);
      expect(more.bottom).toBeLessThanOrEqual(quote.top + 1);
      expect(quote.bottom).toBeLessThanOrEqual(call.top + 1);
      if (width <= 720) {
        expect(heading.bottom).toBeLessThanOrEqual(portrait.top + 1);
        expect(portrait.bottom).toBeLessThanOrEqual(story.top + 1);
      } else {
        expect(Math.abs(heading.top - portrait.top)).toBeLessThan(80);
        expect(portrait.right).toBeLessThanOrEqual(story.left + 1);
        expect(portrait.width / portrait.height).toBeCloseTo(2 / 3, 1);
      }
    }
  });
}
