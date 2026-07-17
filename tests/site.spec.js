import { expect, test } from "@playwright/test";

const routes = [
  "/", "/en/", "/404.html", "/impressum/", "/datenschutz/", "/agb/", "/widerruf/",
  "/en/imprint/", "/en/privacy/", "/en/terms/", "/en/withdrawal/"
];

for (const route of routes) {
  test(`${route} loads without errors, broken images or overflow`, async ({ page }) => {
    const consoleErrors = [];
    const pageErrors = [];
    const failedLocalResponses = [];
    page.on("console", (message) => {
      if (message.type() === "error" || message.type() === "warning") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("response", (response) => {
      const url = new URL(response.url());
      if (url.origin === "http://127.0.0.1:4173" && response.status() >= 400) failedLocalResponses.push(`${response.status()} ${url.pathname}`);
    });

    const response = await page.goto(route, { waitUntil: "networkidle" });
    expect(response?.ok()).toBeTruthy();
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(120);
    const diagnostics = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > window.innerWidth,
      brokenImages: Array.from(document.images).filter((image) => image.complete && image.naturalWidth === 0).map((image) => image.getAttribute("src"))
    }));
    expect(diagnostics.overflow).toBe(false);
    expect(diagnostics.brokenImages).toEqual([]);
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
    expect(failedLocalResponses).toEqual([]);
  });
}

test("editorial images keep natural proportions without overlapping content", async ({ page }) => {
  await page.goto("/");
  const layout = await page.evaluate(() => {
    const rect = (selector) => {
      const bounds = document.querySelector(selector).getBoundingClientRect();
      return { top: bounds.top, right: bounds.right, bottom: bounds.bottom, left: bounds.left, width: bounds.width, height: bounds.height };
    };
    return {
      viewportWidth: window.innerWidth,
      courseImage: rect(".course-media img"),
      courseSeal: rect(".course-seal"),
      aboutImage: rect(".about-portrait img"),
      aboutQuote: rect(".about-quote-block"),
      aboutStory: rect(".about-story"),
      coachingPicture: rect(".coaching-card picture"),
      coachingCopy: rect(".coaching-copy")
    };
  });

  expect(layout.courseImage.width / layout.courseImage.height).toBeCloseTo(16 / 11, 1);
  expect(layout.aboutImage.width / layout.aboutImage.height).toBeCloseTo(2 / 3, 1);
  expect(layout.courseSeal.top).toBeGreaterThanOrEqual(layout.courseImage.bottom - 1);
  expect(layout.aboutImage.right).toBeLessThanOrEqual(layout.aboutQuote.left + 1);
  expect(layout.aboutStory.top).toBeGreaterThanOrEqual(layout.aboutQuote.bottom - 1);
  await expect(page.locator(".about-quote-block blockquote")).toContainText("Ich weiß, wie es sich anfühlt, am Limit zu sein");

  if (layout.viewportWidth > 920) {
    expect(layout.coachingPicture.right).toBeLessThanOrEqual(layout.coachingCopy.left + 1);
  } else {
    expect(layout.coachingPicture.bottom).toBeLessThanOrEqual(layout.coachingCopy.top + 1);
  }
});

test("Kathi testimonial provides image-backed social proof before the method", async ({ page }) => {
  await page.goto("/");
  const testimonial = page.locator(".featured-testimonial");
  await expect(testimonial.getByText("Kathi", { exact: true })).toBeVisible();
  await expect(testimonial.locator("blockquote")).toContainText("Meine Einstellung hat sich verändert");
  await expect(testimonial.locator("img")).toHaveAttribute("alt", "Porträt von Kathi");

  const appearsBeforeMethod = await page.evaluate(() => {
    const proof = document.querySelector(".featured-testimonial");
    return Array.from(document.querySelectorAll(".featured-testimonial, #methode"))[0] === proof;
  });
  expect(appearsBeforeMethod).toBe(true);
});

test("tool descriptions stay readable at narrow tablet widths", async ({ page }) => {
  await page.setViewportSize({ width: 601, height: 1201 });
  await page.goto("/");

  const layout = await page.locator(".tool-list").evaluate((list) => {
    const listBounds = list.getBoundingClientRect();
    return {
      listWidth: listBounds.width,
      items: Array.from(list.children).map((item) => {
        const itemBounds = item.getBoundingClientRect();
        const headingBounds = item.querySelector("h3").getBoundingClientRect();
        return {
          top: itemBounds.top,
          bottom: itemBounds.bottom,
          width: itemBounds.width,
          headingWidth: headingBounds.width
        };
      })
    };
  });

  expect(layout.items).toHaveLength(5);
  for (const [index, item] of layout.items.entries()) {
    expect(item.width).toBeGreaterThanOrEqual(layout.listWidth - 1);
    expect(item.headingWidth).toBeGreaterThan(180);
    if (index > 0) expect(item.top).toBeGreaterThanOrEqual(layout.items[index - 1].bottom);
  }
});

test("navigation and FAQ are keyboard friendly", async ({ page }, testInfo) => {
  await page.goto("/");
  if (testInfo.project.name === "chromium-mobile") {
    const menuButton = page.locator("[data-menu-button]");
    await menuButton.click();
    await expect(menuButton).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("link", { name: "Die Methode", exact: true })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(menuButton).toBeFocused();
    await expect(menuButton).toHaveAttribute("aria-expanded", "false");
  } else {
    await expect(page.getByRole("navigation", { name: "Hauptnavigation" })).toBeVisible();
  }

  const firstQuestion = page.getByText("Für welches Alter ist Hand in Hand geeignet?", { exact: true });
  await firstQuestion.click();
  await expect(page.locator(".faq details[open]")).toHaveCount(1);
  await page.getByText("Wer kann an der Starter Class teilnehmen?", { exact: true }).click();
  await expect(page.locator(".faq details[open]")).toHaveCount(1);
});

test("mobile navigation remains reachable in a short viewport", async ({ page }) => {
  await page.setViewportSize({ width: 568, height: 320 });
  await page.goto("/");
  await page.locator("[data-menu-button]").click();
  const nav = page.locator("[data-mobile-nav]");
  const links = nav.getByRole("link");
  await expect(links).toHaveCount(7);
  const last = links.last();
  await last.scrollIntoViewIfNeeded();
  const bounds = await last.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(321);
  expect(await nav.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
});

test("content and navigation remain usable without JavaScript", async ({ browser }, testInfo) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: testInfo.project.use.viewport });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.locator(".reveal").first()).toBeVisible();
  await expect(page.locator(".no-js-form-fallback")).toBeVisible();
  await expect(page.getByRole("link", { name: "julia@juliasutter.de" })).toBeVisible();
  await expect(page.locator(".form-panel").first()).toBeHidden();
  if (testInfo.project.name === "chromium-mobile") {
    await expect(page.locator("[data-menu-button]")).toBeHidden();
    await expect(page.getByRole("navigation", { name: "Hauptnavigation" })).toBeVisible();
  }
  await context.close();
});

test("form fallback remains visible when site initialization fails", async ({ page }) => {
  await page.route("**/assets/site.js", (route) => route.fulfill({
    contentType: "application/javascript",
    body: `document.documentElement.classList.add("js"); throw new Error("simulated initialization failure");`
  }));
  await page.goto("/");
  await expect(page.locator(".no-js-form-fallback")).toBeVisible();
  await expect(page.locator(".form-panel").first()).toBeHidden();
});

test("course dates stay stable outside the configured time zone", async ({ browser }, testInfo) => {
  const context = await browser.newContext({
    timezoneId: "Pacific/Honolulu",
    viewport: testInfo.project.use.viewport
  });
  const page = await context.newPage();
  await page.route("**/assets/course-config.js", (route) => route.fulfill({
    contentType: "application/javascript",
    body: `window.JULIA_SITE_CONFIG={formEndpoint:"",timeZone:"Europe/Berlin",courses:[{id:"timezone-test",labelDe:"Zeitzonentest",labelEn:"Time zone test",status:"open",dates:["2099-09-07","2099-09-14","2099-09-21","2099-09-28","2099-10-05","2099-10-12"]}]};`
  }));
  await page.goto("/");
  await expect(page.locator("[data-course-status-detail]").first()).toContainText("7. September");
  await expect(page.locator("[data-course-status-detail]").first()).not.toContainText("8. September");
  await context.close();
});

test("open and waitlist courses remain selectable together", async ({ page }) => {
  await page.route("**/assets/course-config.js", (route) => route.fulfill({
    contentType: "application/javascript",
    body: `window.JULIA_SITE_CONFIG={formEndpoint:"",timeZone:"Europe/Berlin",courses:[{id:"waitlist-first",labelDe:"Frühkurs",labelEn:"Early course",status:"waitlist",dates:["2099-01-05","2099-01-12","2099-01-19","2099-01-26","2099-02-02","2099-02-09"]},{id:"open-later",labelDe:"Folgekurs",labelEn:"Later course",status:"open",dates:["2099-03-02","2099-03-09","2099-03-16","2099-03-23","2099-03-30","2099-04-06"]}]};`
  }));
  await page.goto("/");
  const courseSelect = page.getByLabel("Kurs auswählen");
  await expect(courseSelect.locator("option")).toHaveCount(2);
  await expect(courseSelect.locator("option").first()).toContainText("Frühkurs");
  await expect(page.locator("[name=registration_mode]")).toHaveValue("waitlist");
  await expect(page.getByLabel("Straße und Hausnummer")).toBeHidden();

  await courseSelect.selectOption("open-later");
  await expect(page.locator("[name=registration_mode]")).toHaveValue("open");
  await expect(page.getByLabel("Straße und Hausnummer")).toBeVisible();
  await expect(page.getByLabel("Straße und Hausnummer")).toHaveAttribute("required", "");
  await expect(page.getByRole("button", { name: "Verbindlich anmelden" }).last()).toBeVisible();

  await courseSelect.selectOption("waitlist-first");
  await expect(page.locator("[name=registration_mode]")).toHaveValue("waitlist");
  await expect(page.getByLabel("Straße und Hausnummer")).toBeHidden();
  await expect(page.getByRole("button", { name: "Auf die Warteliste" }).last()).toBeVisible();
});

test("configured prices update both localized pages", async ({ page }) => {
  await page.route("**/assets/course-config.js", (route) => route.fulfill({
    contentType: "application/javascript",
    body: `window.JULIA_SITE_CONFIG={formEndpoint:"",timeZone:"Europe/Berlin",priceEur:425,friendPriceEur:375,courses:[]};`
  }));
  const normalizeSpaces = (values) => values.map((value) => value.replace(/\s/g, " "));

  await page.goto("/");
  expect(normalizeSpaces(await page.locator("[data-course-price]").allTextContents())).toEqual(["425 €", "425 €"]);
  expect(normalizeSpaces(await page.locator("[data-friend-price]").allTextContents())).toEqual(["375 €", "375 €"]);

  await page.goto("/en/");
  expect(normalizeSpaces(await page.locator("[data-course-price]").allTextContents())).toEqual(["€425", "€425"]);
  expect(normalizeSpaces(await page.locator("[data-friend-price]").allTextContents())).toEqual(["€375", "€375"]);
});

test("an upcoming course switches the site to binding registration", async ({ page }) => {
  await page.route("**/assets/course-config.js", (route) => route.fulfill({
    contentType: "application/javascript",
    body: `window.JULIA_SITE_CONFIG={formEndpoint:"",timeZone:"Europe/Berlin",priceEur:399,friendPriceEur:349,defaultStartTime:"20:00",defaultEndTime:"22:30",courses:[{id:"starter-test",labelDe:"Testkurs",labelEn:"Test course",status:"open",dates:["2027-09-06","2027-09-13","2027-09-20","2027-09-27","2027-10-04","2027-10-11"]}]};`
  }));
  await page.goto("/");
  await expect(page.locator("[data-course-status]").first()).toHaveText("Nächster Kurs");
  await expect(page.locator("[data-course-status-detail]").first()).toContainText("6. September");
  await page.locator(".hero-actions [data-open-form=course]").click();
  await expect(page.getByLabel("Straße und Hausnummer")).toBeVisible();
  await expect(page.getByLabel("Straße und Hausnummer")).toHaveAttribute("required", "");
  await expect(page.getByText("Ich melde mich verbindlich an", { exact: false })).toBeVisible();
});

test("a course with an invalid or duplicate date stays unavailable", async ({ page }) => {
  await page.route("**/assets/course-config.js", (route) => route.fulfill({
    contentType: "application/javascript",
    body: `window.JULIA_SITE_CONFIG={formEndpoint:"",timeZone:"Europe/Berlin",courses:[{id:"invalid-course",labelDe:"Ungültiger Kurs",labelEn:"Invalid course",status:"open",dates:["2099-01-05","2099-01-12","2099-01-19","2099-01-26","2099-02-02","2099-02-29"]},{id:"duplicate-course",labelDe:"Doppelter Kurs",labelEn:"Duplicate course",status:"open",dates:["2099-03-02","2099-03-09","2099-03-16","2099-03-23","2099-03-30","2099-03-30"]}]};`
  }));
  await page.goto("/");
  await expect(page.locator("[data-course-status]").first()).toHaveText("Nächster Kurs auf Anfrage");
  await expect(page.getByLabel("Kurs auswählen")).toBeHidden();
  await expect(page.getByLabel("Straße und Hausnummer")).toBeHidden();
});

test("unconfigured forms give an honest fallback and keep entries", async ({ page }) => {
  await page.route("**/assets/course-config.js", (route) => route.fulfill({
    contentType: "application/javascript",
    body: "window.JULIA_SITE_CONFIG={formEndpoint:\"\",timeZone:\"Europe/Berlin\",courses:[]};"
  }));
  await page.goto("/");
  await page.getByLabel("Vorname").fill("Test");
  await page.getByLabel("Nachname").fill("Person");
  await page.getByLabel("E-Mail-Adresse").first().fill("test@example.com");
  await page.getByRole("button", { name: "Kursplatz anfragen" }).last().click();
  await expect(page.locator("[data-course-form] [data-form-status]")).toContainText("wird gerade eingerichtet");
  await expect(page.getByLabel("Vorname")).toHaveValue("Test");
});

test("configured forms send one sanitized request", async ({ page }) => {
  const endpoint = "https://formcarry.com/s/test-endpoint";
  let requestCount = 0;
  let submittedBody = "";
  await page.route("**/assets/course-config.js", (route) => route.fulfill({
    contentType: "application/javascript",
    body: `window.JULIA_SITE_CONFIG={formEndpoint:"${endpoint}",timeZone:"Europe/Berlin",courses:[]};`
  }));
  await page.route(endpoint, async (route) => {
    requestCount += 1;
    submittedBody = route.request().postData() ?? "";
    await new Promise((resolve) => setTimeout(resolve, 120));
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ code: 200, status: "success" }) });
  });
  await page.goto("/?utm_source=ci#anmeldung");
  await page.getByLabel("Vorname").fill("Test");
  await page.getByLabel("Nachname").fill("Person");
  await page.getByLabel("E-Mail-Adresse").first().fill("test@example.com");
  const submit = page.getByRole("button", { name: "Kursplatz anfragen" }).last();
  await submit.click();
  await page.evaluate(() => document.querySelector("[data-course-form]").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  await expect(page.locator("[data-course-form] [data-form-status]")).toHaveClass(/is-success/);
  expect(requestCount).toBe(1);
  expect(submittedBody).toContain("name=\"registration_mode\"");
  expect(submittedBody).toContain("inquiry");
  expect(submittedBody).toContain("http://127.0.0.1:4173/");
  expect(submittedBody).not.toContain("utm_source");
});

test("a non-success Formcarry payload keeps the entered values", async ({ page }) => {
  const endpoint = "https://formcarry.com/s/test-endpoint";
  await page.route("**/assets/course-config.js", (route) => route.fulfill({
    contentType: "application/javascript",
    body: `window.JULIA_SITE_CONFIG={formEndpoint:"${endpoint}",timeZone:"Europe/Berlin",courses:[]};`
  }));
  await page.route(endpoint, (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ code: 422, status: "error", message: "Validation failed" })
  }));
  await page.goto("/");
  await page.getByLabel("Vorname").fill("Test");
  await page.getByLabel("Nachname").fill("Person");
  await page.getByLabel("E-Mail-Adresse").first().fill("test@example.com");
  await page.getByRole("button", { name: "Kursplatz anfragen" }).last().click();
  await expect(page.locator("[data-course-form] [data-form-status]")).toHaveClass(/is-error/);
  await expect(page.getByLabel("Vorname")).toHaveValue("Test");
  await expect(page.getByLabel("Nachname")).toHaveValue("Person");
});

test("legal pages expose their language counterpart", async ({ page }) => {
  const pairs = [
    ["/impressum/", "de", "/en/imprint/"], ["/datenschutz/", "de", "/en/privacy/"],
    ["/agb/", "de", "/en/terms/"], ["/widerruf/", "de", "/en/withdrawal/"],
    ["/en/imprint/", "en", "/impressum/"], ["/en/privacy/", "en", "/datenschutz/"],
    ["/en/terms/", "en", "/agb/"], ["/en/withdrawal/", "en", "/widerruf/"]
  ];
  for (const [route, lang, counterpart] of pairs) {
    await page.goto(route);
    await expect(page.locator("html")).toHaveAttribute("lang", lang);
    await expect(page.locator(".legal-language")).toHaveAttribute("href", counterpart);
    await expect(page.locator("a[aria-current=page]")).toHaveCount(1);
  }
});
