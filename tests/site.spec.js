import { expect, test } from "@playwright/test";

const routes = [
  "/", "/starterclass/", "/en/", "/404.html", "/impressum/", "/datenschutz/", "/agb/", "/widerruf/",
  "/en/imprint/", "/en/privacy/", "/en/terms/", "/en/withdrawal/"
];

for (const route of routes) {
  test(`${route} loads without errors, broken images or overflow`, async ({ page, baseURL }) => {
    const consoleErrors = [];
    const pageErrors = [];
    const failedLocalResponses = [];
    page.on("console", (message) => {
      if (message.type() === "error" || message.type() === "warning") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("response", (response) => {
      const url = new URL(response.url());
      if (url.origin === new URL(baseURL).origin && response.status() >= 400) failedLocalResponses.push(`${response.status()} ${url.pathname}`);
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

test("/starterclass/ redirects to the Starter Class section", async ({ page }) => {
  await page.goto("/starterclass/");
  await expect(page).toHaveURL(/\/#starter-class$/);
  await expect(page.locator("#starter-class")).toBeVisible();
  await expect(page.locator("#starter-class h2")).toContainText("Starter Class");
});

test("editorial images keep natural proportions without overlapping content", async ({ page }) => {
  await page.goto("/");
  const layout = await page.evaluate(() => {
    const rect = (selector) => {
      const bounds = document.querySelector(selector).getBoundingClientRect();
      return { top: bounds.top, right: bounds.right, bottom: bounds.bottom, left: bounds.left, width: bounds.width, height: bounds.height };
    };
    return {
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      courseSection: rect("#starter-class"),
      courseImage: rect(".course-media img"),
      courseFacts: rect(".course-facts"),
      courseDates: rect(".course-dates"),
      courseStory: rect(".course-story"),
      aboutImage: rect(".about-portrait img"),
      aboutQuote: rect(".about-quote-block"),
      aboutStory: rect(".about-story"),
      coachingPicture: rect(".coaching-card picture"),
      coachingCopy: rect(".coaching-copy")
    };
  });

  expect(layout.courseImage.width / layout.courseImage.height).toBeCloseTo(16 / 11, 1);
  expect(layout.aboutImage.width / layout.aboutImage.height).toBeCloseTo(2 / 3, 1);
  expect(layout.courseDates.top).toBeGreaterThanOrEqual(layout.courseFacts.bottom + 20);
  expect(layout.aboutImage.right).toBeLessThanOrEqual(layout.aboutQuote.left + 1);
  expect(layout.aboutStory.top).toBeGreaterThanOrEqual(layout.aboutQuote.bottom - 1);
  await expect(page.locator(".about-quote-block blockquote")).toContainText("Als Kursleiterin zeige ich dir, was gerade dann helfen kann.");

  if (layout.viewportWidth > 920) {
    expect(layout.courseSection.height).toBeLessThanOrEqual(layout.viewportHeight - 90);
    expect(layout.courseFacts.left).toBeGreaterThanOrEqual(layout.courseStory.right);
    expect(Math.abs(layout.courseFacts.top - layout.courseStory.top)).toBeLessThanOrEqual(1);
    expect(layout.coachingPicture.right).toBeLessThanOrEqual(layout.coachingCopy.left + 1);
  } else {
    expect(layout.courseFacts.top).toBeGreaterThanOrEqual(layout.courseStory.bottom);
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

test("navigation is keyboard friendly", async ({ page }, testInfo) => {
  await page.goto("/");
  if (testInfo.project.name === "chromium-mobile") {
    const menuButton = page.locator("[data-menu-button]");
    await menuButton.click();
    await expect(menuButton).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator("[data-mobile-nav]").getByRole("link", { name: "Die 5 Werkzeuge", exact: true })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(menuButton).toBeFocused();
    await expect(menuButton).toHaveAttribute("aria-expanded", "false");
  } else {
    await expect(page.getByRole("navigation", { name: "Hauptnavigation" })).toBeVisible();
  }
});

for (const route of ["/", "/en/"]) {
  for (const reducedMotion of ["no-preference", "reduce"]) {
    test(`${route} FAQ keeps the latest choice during rapid switches (${reducedMotion})`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion });
      await page.goto(route);
      const items = page.locator(".faq details");
      await items.first().locator("summary").focus();
      await page.keyboard.press("Enter");
      await page.keyboard.press("Tab");
      await page.keyboard.press("Enter");
      await page.keyboard.press("Shift+Tab");
      await page.keyboard.press("Enter");

      await expect(items.nth(1)).not.toHaveAttribute("open", "");
      await expect(items.first()).toHaveAttribute("open", "");
      await expect(page.locator(".faq details[open]")).toHaveCount(1);
      await expect(items.first().locator(".details-answer")).toBeVisible();
    });
  }

  test(`${route} FAQ supports keyboard and pointer interaction`, async ({ page }) => {
    await page.goto(route);
    const items = page.locator(".faq details");
    await expect(items).toHaveCount(5);
    await expect(page.locator(".faq details[open]")).toHaveCount(0);
    const first = items.nth(0);
    const second = items.nth(1);

    await first.locator("summary").focus();
    await page.keyboard.press("Enter");
    await expect(first).toHaveAttribute("open", "");
    await expect(first.locator(".details-answer")).toBeVisible();

    await second.locator("summary").click();
    await expect(first).not.toHaveAttribute("open", "");
    await expect(second).toHaveAttribute("open", "");
    await expect(second.locator(".details-answer")).toBeVisible();
    await expect(page.locator(".faq details[open]")).toHaveCount(1);

    await second.locator("summary").focus();
    await page.keyboard.press("Space");
    await expect(page.locator(".faq details[open]")).toHaveCount(0);
    await expect(second.locator(".details-answer")).toBeHidden();
    await expect(first.locator(".details-answer")).toBeHidden();

    await first.locator("summary").click();
    await expect(first).toHaveAttribute("open", "");
    await first.locator("summary").click();
    await expect(page.locator(".faq details[open]")).toHaveCount(0);
  });
}

test("mobile navigation remains reachable in a short viewport", async ({ page }) => {
  await page.setViewportSize({ width: 568, height: 320 });
  await page.goto("/");
  await page.locator("[data-menu-button]").click();
  const nav = page.locator("[data-mobile-nav]");
  const links = nav.getByRole("link");
  await expect(links).toHaveCount(6);
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
  await expect(page.locator("[data-course-list]")).toContainText("7. September");
  await expect(page.locator("[data-course-list]")).not.toContainText("8. September");
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
  await expect(page.getByRole("button", { name: "Anmelden" }).last()).toBeVisible();

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
  expect(normalizeSpaces(await page.locator("[data-course-price]").allTextContents())).toEqual(["425 €"]);
  expect(normalizeSpaces(await page.locator("[data-friend-price]").allTextContents())).toEqual(["375 €", "375 €"]);

  await page.goto("/en/");
  expect(normalizeSpaces(await page.locator("[data-course-price]").allTextContents())).toEqual(["€425"]);
  expect(normalizeSpaces(await page.locator("[data-friend-price]").allTextContents())).toEqual(["€375", "€375"]);
});

test("an upcoming course switches the site to binding registration", async ({ page }) => {
  await page.route("**/assets/course-config.js", (route) => route.fulfill({
    contentType: "application/javascript",
    body: `window.JULIA_SITE_CONFIG={formEndpoint:"",timeZone:"Europe/Berlin",priceEur:399,friendPriceEur:349,defaultStartTime:"20:00",defaultEndTime:"22:00",courses:[{id:"starter-test",labelDe:"Testkurs",labelEn:"Test course",status:"open",dates:["2027-09-06","2027-09-13","2027-09-20","2027-09-27","2027-10-04","2027-10-11"]}]};`
  }));
  await page.goto("/");
  await expect(page.locator("[data-course-list] a")).toHaveCount(1);
  await expect(page.locator("[data-course-list]")).toContainText("6. September");
  await expect(page.locator("[data-early-start-consent]")).toBeHidden();
  await page.locator("[data-course-list] [data-open-form=course]").click();
  await expect(page.getByLabel("Straße und Hausnummer")).toBeVisible();
  await expect(page.getByLabel("Straße und Hausnummer")).toHaveAttribute("required", "");
  await expect(page.locator("[data-binding-order-summary]")).toContainText("6 Termine");
  await expect(page.locator("[data-binding-order-summary]")).toContainText("399 €");
  await expect(page.locator(".binding-legal-notice a[href='/agb/']")).toBeVisible();
  await expect(page.locator("[data-binding-checkout] input[type=checkbox]:visible")).toHaveCount(1);
  await expect(page.locator("[data-binding-checkout] [name=friend_registration]")).toBeVisible();
  await expect(page.locator("[data-binding-checkout] input[type=checkbox][required]:visible")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Anmelden" }).last()).toBeVisible();
});

test("early-start consent appears only inside the withdrawal period", async ({ page }) => {
  await page.addInitScript(() => {
    const NativeDate = Date;
    const fixedNow = new NativeDate("2026-09-10T10:00:00+02:00").getTime();
    class FixedDate extends NativeDate {
      constructor(...args) {
        super(...(args.length ? args : [fixedNow]));
      }

      static now() {
        return fixedNow;
      }
    }
    window.Date = FixedDate;
  });
  await page.route("**/assets/course-config.js", (route) => route.fulfill({
    contentType: "application/javascript",
    body: `window.JULIA_SITE_CONFIG={formEndpoint:"",timeZone:"Europe/Berlin",priceEur:399,friendPriceEur:349,courses:[{id:"starter-near",labelDe:"Herbst 2026",labelEn:"Autumn 2026",status:"open",startTime:"09:00",endTime:"11:00",dates:["2026-09-19","2026-09-26","2026-10-03","2026-10-10","2026-10-17","2026-10-24"]}]};`
  }));

  await page.goto("/");
  const earlyStart = page.getByLabel("Ich verlange ausdrücklich", { exact: false });
  await expect(earlyStart).toBeVisible();
  await expect(earlyStart).toHaveAttribute("required", "");
  await expect(page.locator("[data-early-start-consent]")).toContainText("vollständiger Vertragserfüllung");
  await expect(page.locator("[data-binding-course-schedule]")).toContainText("19. Sep.–24. Okt. 2026 · Sa 09:00–11:00 Uhr");
});

for (const path of ["/", "/en/"]) {
  test(`${path} registration keeps the form near the compact introduction`, async ({ page }) => {
    await page.goto(path);
    const compact = page.viewportSize().width <= 920;
    await expect(page.locator(".contact-facts")).toBeVisible({ visible: !compact });
    await expect(page.locator(".registration-testimonial")).toBeVisible({ visible: !compact });
    await expect(page.locator(".contact-intro-compact")).toBeVisible({ visible: compact });
    const layout = await page.evaluate(() => {
      const rect = (selector) => document.querySelector(selector).getBoundingClientRect().toJSON();
      return { story: rect(".contact-story"), form: rect(".contact-form-wrap"), tabs: rect(".form-tabs"), firstName: rect("#course-first-name"), note: rect(".contact-note") };
    });
    if (compact) {
      expect(layout.story.height).toBeLessThan(300);
      expect(layout.tabs.top - layout.story.top).toBeLessThan(380);
      expect(layout.firstName.bottom - layout.story.top).toBeLessThan(page.viewportSize().height);
      expect(layout.note.top).toBeGreaterThanOrEqual(layout.form.bottom - 1);
    } else {
      expect(layout.story.right).toBeLessThanOrEqual(layout.form.left + 1);
      expect(layout.note.top).toBeGreaterThanOrEqual(layout.story.bottom - 1);
    }
    await page.locator("#contact-tab").click();
    await expect(page.locator(".contact-intro-full")).toBeVisible();
    await expect(page.locator(".contact-intro-compact")).toBeHidden();
    await expect(page.locator(".contact-note")).toBeHidden();
    await page.locator("#course-tab").click();
    await expect(page.locator(".contact-note")).toBeVisible();
  });
}

test("selected copy meets the desktop line-count targets", async ({ page }) => {
  await page.setViewportSize({ width: 1453, height: 999 });
  await page.goto("/");
  const lines = await page.evaluate(() => {
    const count = (selector) => {
      const element = document.querySelector(selector);
      const lineHeight = Number.parseFloat(window.getComputedStyle(element).lineHeight);
      return Math.round(element.getBoundingClientRect().height / lineHeight);
    };
    return {
      hero: count(".hero-intro"),
      toolsTitle: count(".tools-heading h2"),
      tools: count(".tools-heading > p"),
      course: count(".course-copy .lede"),
      courseFact: count(".course-facts li:nth-child(4) span"),
      privacy: count("#course-panel .privacy-hint span")
    };
  });

  expect(lines).toEqual({
    hero: 2,
    toolsTitle: 1,
    tools: 1,
    course: 1,
    courseFact: 1,
    privacy: 1
  });
});

test("a course with an invalid or duplicate date stays unavailable", async ({ page }) => {
  await page.route("**/assets/course-config.js", (route) => route.fulfill({
    contentType: "application/javascript",
    body: `window.JULIA_SITE_CONFIG={formEndpoint:"",timeZone:"Europe/Berlin",courses:[{id:"invalid-course",labelDe:"Ungültiger Kurs",labelEn:"Invalid course",status:"open",dates:["2099-01-05","2099-01-12","2099-01-19","2099-01-26","2099-02-02","2099-02-29"]},{id:"duplicate-course",labelDe:"Doppelter Kurs",labelEn:"Duplicate course",status:"open",dates:["2099-03-02","2099-03-09","2099-03-16","2099-03-23","2099-03-30","2099-03-30"]}]};`
  }));
  await page.goto("/");
  await expect(page.locator("[data-course-list]")).toBeHidden();
  await expect(page.locator(".course-booking a[data-course-inquiry]")).toBeVisible();
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
  await page.getByLabel("Nachname", { exact: true }).fill("Person");
  await page.getByLabel("E-Mail-Adresse").first().fill("test@example.com");
  await page.getByRole("button", { name: "Kursplatz anfragen" }).last().click();
  await expect(page.locator("[data-course-form] [data-form-status]")).toContainText("wird gerade eingerichtet");
  await expect(page.getByLabel("Vorname")).toHaveValue("Test");
});

test("configured forms send one sanitized request", async ({ page, baseURL }) => {
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
  await page.getByLabel("Nachname", { exact: true }).fill("Person");
  await page.getByLabel("E-Mail-Adresse").first().fill("test@example.com");
  const submit = page.getByRole("button", { name: "Kursplatz anfragen" }).last();
  await submit.click();
  await page.evaluate(() => document.querySelector("[data-course-form]").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  await expect(page.locator("[data-course-form] [data-form-status]")).toHaveClass(/is-success/);
  expect(requestCount).toBe(1);
  expect(submittedBody).toContain("name=\"registration_mode\"");
  expect(submittedBody).toContain("inquiry");
  expect(submittedBody).toContain(`${new URL(baseURL).origin}/`);
  expect(submittedBody).not.toContain("utm_source");
});

test("binding registration keeps its registration label after success", async ({ page }) => {
  const endpoint = "https://formcarry.com/s/test-endpoint";
  await page.route("**/assets/course-config.js", (route) => route.fulfill({
    contentType: "application/javascript",
    body: `window.JULIA_SITE_CONFIG={formEndpoint:"${endpoint}",timeZone:"Europe/Berlin",priceEur:399,courses:[{id:"open-course",labelDe:"Testkurs",labelEn:"Test course",status:"open",dates:["2099-01-05","2099-01-12","2099-01-19","2099-01-26","2099-02-02","2099-02-09"]}]};`
  }));
  await page.route(endpoint, (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ code: 200, status: "success" })
  }));

  await page.goto("/#anmeldung");
  await page.getByLabel("Vorname").fill("Test");
  await page.getByLabel("Nachname", { exact: true }).fill("Person");
  await page.getByLabel("E-Mail-Adresse").first().fill("test@example.com");
  await page.getByLabel("Straße und Hausnummer").fill("Testweg 1");
  await page.getByLabel("Ort", { exact: true }).fill("Berlin");
  await page.getByLabel("Postleitzahl").fill("10115");
  const submit = page.getByRole("button", { name: "Anmelden" }).last();
  await submit.click();

  await expect(page.locator("[data-course-form] [data-form-status]")).toHaveClass(/is-success/);
  await expect(submit).toHaveText("Anmelden");
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
  await page.getByLabel("Nachname", { exact: true }).fill("Person");
  await page.getByLabel("E-Mail-Adresse").first().fill("test@example.com");
  await page.getByRole("button", { name: "Kursplatz anfragen" }).last().click();
  await expect(page.locator("[data-course-form] [data-form-status]")).toHaveClass(/is-error/);
  await expect(page.getByLabel("Vorname")).toHaveValue("Test");
  await expect(page.getByLabel("Nachname", { exact: true })).toHaveValue("Person");
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
