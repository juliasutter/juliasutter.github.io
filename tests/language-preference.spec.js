import { expect, test } from "@playwright/test";

test("explicit language links persist the landing preference", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.removeItem("preferredLanguage"));
  await page.locator(".site-footer [data-language-link=en]").click();
  await expect(page).toHaveURL(/\/en\/$/);
  expect(await page.evaluate(() => window.localStorage.getItem("preferredLanguage"))).toBe("en");

  await page.locator(".site-footer [data-language-link=de]").click();
  await expect(page).toHaveURL(/\/$/);
  expect(await page.evaluate(() => window.localStorage.getItem("preferredLanguage"))).toBe("de");
});

test("header language switch shows only the destination language", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".desktop-nav [data-language-link]")).toHaveCount(1);
  await expect(page.locator(".desktop-nav [data-language-link]")).toHaveText("EN");
  await expect(page.locator(".desktop-nav [data-language-link]")).toHaveAttribute("aria-label", "Auf Englisch wechseln");

  await page.goto("/en/");
  await expect(page.locator(".desktop-nav [data-language-link]")).toHaveCount(1);
  await expect(page.locator(".desktop-nav [data-language-link]")).toHaveText("DE");
  await expect(page.locator(".desktop-nav [data-language-link]")).toHaveAttribute("aria-label", "Switch to German");
});
