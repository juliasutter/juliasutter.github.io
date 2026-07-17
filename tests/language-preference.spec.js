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
