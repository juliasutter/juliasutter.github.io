import { expect, test } from "@playwright/test";

const targets = {
  ".hero h1": 2,
  ".hero-intro": 2,
  ".faq-contact p": 1,
  ".course-copy .lede": 2,
  ".course-facts li:nth-child(3) > span": 1,
  ".course-facts li:nth-child(4) > span": 1,
  ".course-dates .fine-print": 1,
  ".course-call > p": 1,
  "#contact-heading": 1,
  ".binding-schedule": 1,
  ".friend-pricing > .checkbox > span": 1,
  ".binding-legal-notice": 1
};

test("mobile copy fits its line targets across phone widths and course selections", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-09-25T12:00:00Z"));
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);

  for (const width of [360, 375, 390, 393, 414, 430, 720]) {
    await page.setViewportSize({ width, height: 852 });
    const lines = await page.evaluate((selectors) => selectors.map((selector) => {
      const element = document.querySelector(selector);
      const walker = document.createTreeWalker(element, window.NodeFilter.SHOW_TEXT);
      const tops = new Set();
      while (walker.nextNode()) {
        if (!walker.currentNode.textContent.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(walker.currentNode);
        for (const rect of range.getClientRects()) {
          if (rect.width && rect.height) tops.add(Math.round(rect.top));
        }
      }
      return [selector, tops.size];
    }), Object.keys(targets));
    for (const [selector, count] of lines) {
      expect(count, `${width}px: ${selector} must remain visible`).toBeGreaterThan(0);
      expect(count, `${width}px: ${selector}`).toBeLessThanOrEqual(targets[selector]);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.locator(".binding-legal-notice")).toHaveCSS("font-size", "11px");
    await expect(page.locator(".hero-eyebrow")).toBeHidden();
    await expect(page.getByRole("heading", { name: "Verbindung verändert alles.", exact: true })).toBeVisible();

    for (const option of await page.locator("[data-course-select] option").all()) {
      await page.locator("[data-course-select]").selectOption(await option.getAttribute("value"));
      const schedule = page.locator(".binding-schedule");
      const dimensions = await schedule.evaluate((element) => ({
        height: element.getBoundingClientRect().height,
        lineHeight: Number.parseFloat(window.getComputedStyle(element).lineHeight)
      }));
      expect(dimensions.height, `${width}px: selected course schedule`).toBeLessThanOrEqual(dimensions.lineHeight + 1);
    }
  }

  await page.locator("#contact-tab").click();
  await expect(page.getByRole("heading", { name: "Wie kann ich dich unterstützen?", exact: true })).toBeVisible();
  await page.locator("#course-tab").click();
  await expect(page.getByRole("heading", { name: "Begleitung für euren Alltag", exact: true })).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator(".hero-eyebrow")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Mit Begleitung in euren Alltag", exact: true })).toBeVisible();
  await expect(page.locator(".hero-intro")).toHaveText(/Nähe und Verbindung/, { useInnerText: true });
  await expect(page.locator(".course-copy .lede")).toHaveText("Fünf Werkzeuge für euren Alltag – mit Zeit zum Üben, Zuhören und für deine Fragen.", { useInnerText: true });
  await expect(page.locator(".course-call > p")).toHaveText(/20-Minuten-Gespräch/, { useInnerText: true });
});
