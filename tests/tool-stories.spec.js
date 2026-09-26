import { expect, test } from "@playwright/test";

const storyIds = ["special-time", "staylistening", "playlistening", "listening-partnership"];

for (const language of ["de", "en"]) {
  const path = language === "de" ? "/" : "/en/";

  test(`${language}: each tool opens its own complete story and restores the same article`, async ({ page }) => {
    await page.goto(path);
    const dialog = page.locator("#story-dialog");
    const cards = page.locator(".tool-item");
    await expect(cards).toHaveCount(5);
    await expect(cards.locator(".tool-story")).toHaveCount(4);
    await expect(cards.locator(".tool-story-placeholder")).toHaveCount(1);
    await expect(cards.nth(1).locator(".tool-story-trigger, a, button")).toHaveCount(0);
    await expect(dialog).toBeHidden();

    for (const id of storyIds) {
      const details = page.locator(`#story-${id}`);
      const source = page.locator(`.tool-story-article:has(#story-${id}-title)`);
      const summary = details.locator(".tool-story-trigger");
      const title = source.locator(".story-title");
      const heading = await title.textContent();
      const byline = await source.locator(".story-byline").textContent();
      const paragraphs = await source.locator(".story-prose p").allTextContents();
      const toolName = await details.locator("xpath=parent::*").locator("h3").innerText();
      const artSource = await details.locator("xpath=parent::*").locator(".tool-art").evaluate((element) => element.src);
      expect(paragraphs.length).toBeGreaterThan(1);
      expect(paragraphs.at(-1).trim().length).toBeGreaterThan(20);
      await expect(summary).toHaveAttribute("aria-haspopup", "dialog");
      await expect(summary).toHaveAttribute("aria-controls", "story-dialog");

      await summary.click();
      await expect(dialog).toBeVisible();
      await expect(page.locator("dialog[open]")).toHaveCount(1);
      await expect(dialog).toHaveAttribute("aria-labelledby", `story-${id}-title`);
      await expect(dialog.locator(".story-title")).toHaveText(heading);
      await expect(dialog.locator(".story-byline")).toHaveText(byline);
      await expect(dialog.locator(".story-prose p")).toHaveText(paragraphs);
      await expect(dialog.locator("[data-story-tool]")).toHaveText(toolName);
      await expect(dialog.locator("[data-story-art]")).toHaveAttribute("src", artSource);
      await expect(dialog.locator(".story-title")).toBeFocused();
      await expect(page.locator(`#story-${id}-title`)).toHaveCount(1);
      await expect(details).not.toHaveAttribute("open", "");
      await expect(dialog.locator("a, [data-booking-trigger], .course-call")).toHaveCount(0);
      await expect(dialog.locator("button")).toHaveCount(2);
      await expect(page.locator("body")).toHaveClass(/story-open/);

      await dialog.locator("[data-story-close]").click();
      await expect(dialog).toBeHidden();
      await expect(source).toHaveCount(1);
      await expect(details.locator(".tool-story-article")).toHaveCount(1);
      await expect(summary).toBeFocused();
      await expect(page.locator("body")).not.toHaveClass(/story-open/);
    }
  });

  test(`${language}: keyboard, return, Escape, and backdrop closing keep focus and page position`, async ({ page }) => {
    await page.goto(path);
    const summary = page.locator(".tool-story-trigger").first();
    const dialog = page.locator("#story-dialog");
    await summary.scrollIntoViewIfNeeded();
    await summary.focus();
    const initialScroll = await page.evaluate(() => window.scrollY);
    await page.keyboard.press("Enter");
    await expect(dialog).toBeVisible();
    await expect(dialog.locator(".story-title")).toBeFocused();
    await page.locator(".hero-actions a").first().evaluate((element) => element.focus());
    await expect(dialog.locator(".story-title")).toBeFocused();
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => document.activeElement.closest("#story-dialog") !== null)).toBe(true);
    await dialog.locator("[data-story-return]").click();
    await expect(dialog).toBeHidden();
    await expect(summary).toBeFocused();
    expect(await page.evaluate(() => window.scrollY)).toBe(initialScroll);

    await summary.focus();
    const beforeEscape = await page.evaluate(() => window.scrollY);
    await page.keyboard.press("Space");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(summary).toBeFocused();
    expect(await page.evaluate(() => window.scrollY)).toBe(beforeEscape);

    await summary.focus();
    const beforeBackdrop = await page.evaluate(() => window.scrollY);
    await page.keyboard.press("Enter");
    const bounds = await dialog.boundingBox();
    if (bounds.x > 8 || bounds.y > 8) {
      await page.mouse.click(bounds.x > 8 ? bounds.x - 8 : bounds.x + bounds.width / 2,
        bounds.y > 8 ? bounds.y - 8 : bounds.y + bounds.height / 2);
      await expect(dialog).toBeHidden();
      await expect(summary).toBeFocused();
      expect(await page.evaluate(() => window.scrollY)).toBe(beforeBackdrop);
    } else {
      await dialog.locator("[data-story-close]").click();
    }
  });

  test(`${language}: story scroll resets on reopen while close remains reachable`, async ({ page }) => {
    await page.goto(path);
    const longestId = await page.locator(".tool-item .tool-story-article").evaluateAll((articles) =>
      articles.reduce((longest, article) => article.textContent.length > longest.textContent.length ? article : longest).querySelector(".story-title").id
    );
    const summary = page.locator(`.tool-story:has(#${longestId}) .tool-story-trigger`);
    const dialog = page.locator("#story-dialog");
    const content = dialog.locator("[data-story-content]");
    await summary.click();
    const initialScroll = await page.evaluate(() => window.scrollY);
    await expect(dialog.locator("[data-story-close]")).toBeInViewport();
    const height = await content.evaluate((element) => ({ scroll: element.scrollHeight, client: element.clientHeight }));
    expect(height.scroll).toBeGreaterThan(height.client);
    await content.evaluate((element) => { element.scrollTop = element.scrollHeight; });
    await expect.poll(() => content.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    await expect(dialog.locator("[data-story-close]")).toBeInViewport();
    const lockedScroll = await page.evaluate(() => window.scrollY);
    await page.mouse.wheel(0, 800);
    expect(await page.evaluate(() => window.scrollY)).toBe(lockedScroll);
    await dialog.locator("[data-story-close]").click();
    await expect(summary).toBeFocused();
    expect(await page.evaluate(() => window.scrollY)).toBe(initialScroll);
    // Reopen from the restored focus without Playwright's click auto-scrolling.
    await page.keyboard.press("Enter");
    await expect(dialog).toBeVisible();
    expect(await content.evaluate((element) => element.scrollTop)).toBe(0);
    await dialog.locator("[data-story-close]").click();
    await expect(summary).toBeFocused();
    expect(await page.evaluate(() => window.scrollY)).toBe(initialScroll);
  });

  test(`${language}: tool grid keeps its row grouping and story alignment at five widths`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-desktop");
    await page.goto(path);
    await page.evaluate(() => document.fonts.ready);

    for (const width of [360, 390, 720, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const layout = await page.locator(".tool-item").evaluateAll((items) => {
        const rect = (element) => {
          const { x, y, width, height } = element.getBoundingClientRect();
          return { x, y, width, height };
        };
        return {
          noOverflow: document.documentElement.scrollWidth <= window.innerWidth,
          cards: items.map(rect),
          entries: items.map((item) => rect(item.querySelector(".tool-story, .tool-story-placeholder"))),
          arts: items.map((item) => rect(item.querySelector(".tool-art"))),
          headings: items.map((item) => rect(item.querySelector("h3")))
        };
      });
      const { cards, entries, arts, headings } = layout;
      expect(layout.noOverflow, `${language} at ${width}px`).toBe(true);
      expect(cards).toHaveLength(5);
      for (let i = 0; i < cards.length; i += 1) {
        expect(arts[i].x + arts[i].width).toBeLessThan(headings[i].x);
        expect(Math.abs((arts[i].y + arts[i].height / 2) -
          (headings[i].y + headings[i].height / 2))).toBeLessThan(2);
      }

      if (width <= 720) {
        for (let i = 1; i < cards.length; i += 1) {
          expect(cards[i].x, `${width}px card ${i + 1} column`).toBeCloseTo(cards[0].x, 0);
          expect(cards[i].y - (cards[i - 1].y + cards[i - 1].height),
            `${width}px gap before card ${i + 1}`).toBeCloseTo(28, 0);
        }
      } else if (width <= 1080) {
        expect(cards[0].y).toBeCloseTo(cards[1].y, 0);
        expect(cards[2].y).toBeCloseTo(cards[3].y, 0);
        expect(cards[2].y).toBeGreaterThan(cards[0].y);
        expect(cards[4].y).toBeGreaterThan(cards[2].y);
        expect(cards[0].x).toBeLessThan(cards[1].x);
        expect(cards[2].x).toBeLessThan(cards[3].x);
        expect(cards[4].x).toBeGreaterThan(cards[0].x);
        expect(cards[4].x).toBeLessThan(cards[1].x);
        expect(entries[0].y).toBeCloseTo(entries[1].y, 0);
        expect(entries[2].y).toBeCloseTo(entries[3].y, 0);
      } else {
        expect(cards[0].y).toBeCloseTo(cards[1].y, 0);
        expect(cards[1].y).toBeCloseTo(cards[2].y, 0);
        expect(cards[3].y).toBeCloseTo(cards[4].y, 0);
        expect(cards[3].y).toBeGreaterThan(cards[0].y);
        expect(cards[0].x).toBeLessThan(cards[1].x);
        expect(cards[1].x).toBeLessThan(cards[2].x);
        expect(cards[3].x).toBeLessThan(cards[4].x);
        expect(entries[0].y).toBeCloseTo(entries[1].y, 0);
        expect(entries[1].y).toBeCloseTo(entries[2].y, 0);
        expect(entries[3].y).toBeCloseTo(entries[4].y, 0);
      }
    }
  });

  test(`${language}: stories remain available as native details without dialog support`, async ({ page }) => {
    await page.addInitScript(() => { window.HTMLDialogElement.prototype.showModal = undefined; });
    await page.goto(path);
    await page.addStyleTag({ content: "dialog { display: block; }" });
    await expect(page.locator("#story-dialog")).toBeHidden();
    for (const id of storyIds) {
      const details = page.locator(`.tool-story:has(#story-${id}-title)`);
      const summary = details.locator("summary");
      await expect(summary).not.toHaveAttribute("aria-haspopup", "dialog");
      await summary.click();
      await expect(details).toHaveAttribute("open", "");
      await expect(details.locator(".story-prose p").last()).toBeVisible();
      await summary.click();
    }
  });

  test(`${language}: stories remain available without JavaScript`, async ({ browser }, testInfo) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport: testInfo.project.use.viewport,
      baseURL: testInfo.project.use.baseURL
    });
    const page = await context.newPage();
    await page.goto(path);
    await expect(page.locator("#story-dialog")).toBeHidden();
    for (const id of storyIds) {
      const details = page.locator(`.tool-story:has(#story-${id}-title)`);
      await details.locator("summary").click();
      await expect(details).toHaveAttribute("open", "");
      await expect(details.locator(".story-prose p").last()).toBeVisible();
    }
    await context.close();
  });
}
