import { expect, test } from "@playwright/test";

const origin = "https://juliasutter.de";
const pixelScript = "https://connect.facebook.net/en_US/fbevents.js";
const endpoint = "https://formcarry.com/s/measurement-test";
const consentKey = "julia-marketing-consent-v1";
const course = { id: "future", status: "open", dates: ["2099-03-02", "2099-03-09", "2099-03-16", "2099-03-23", "2099-03-30", "2099-04-06"] };
const metaStub = `window.metaCalls=[]; const q=window.fbq; q.callMethod=(...args)=>window.metaCalls.push(args); for(const args of q.queue) q.callMethod(...args); q.queue=[];`;

async function setup(page, baseURL, { courses = [course], delayPixel } = {}) {
  const requests = [];
  page.on("request", (request) => {
    if (/facebook\.(net|com)/.test(request.url())) requests.push(request.url());
  });
  // Serve the actual local files under the production origin, with all external
  // measurement and submission requests intercepted. No real Meta events or leads.
  await page.route(`${origin}/**`, async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/assets/measurement-config.js") return route.fulfill({ contentType: "application/javascript", body: 'window.JULIA_MEASUREMENT_CONFIG={pixelId:"123456789"};' });
    if (url.pathname === "/assets/course-config.js") return route.fulfill({ contentType: "application/javascript", body: `window.JULIA_SITE_CONFIG=${JSON.stringify({ formEndpoint: endpoint, priceEur: 399, friendPriceEur: 349, courses, introCallUrl: "https://calendar.google.com/test" })};` });
    const response = await page.request.get(`${baseURL}${url.pathname}`);
    return route.fulfill({ response });
  });
  await page.route("https://**.facebook.com/**", (route) => route.abort());
  await page.route("https://connect.facebook.net/**", async (route) => {
    if (delayPixel) await delayPixel;
    await route.fulfill({ contentType: "application/javascript", body: metaStub });
  });
  await page.route(endpoint, (route) => route.fulfill({ json: { code: 200, status: "success" } }));
  return requests;
}

const eventCalls = (page) => page.evaluate(() => (window.metaCalls || []).filter((args) => args[0] === "trackSingle" || args[0] === "trackSingleCustom"));
async function accept(page) {
  await page.locator("[data-consent-accept]").click();
  await expect.poll(() => eventCalls(page)).toHaveLength(1);
}
async function fillCourse(page, binding = true) {
  const form = page.locator("[data-course-form]");
  const fields = { first_name: "PrivateFirst", last_name: "PrivateLast", email: "private@example.com" };
  if (binding) Object.assign(fields, { street: "Secret Road 9", postal_code: "10115", city: "Berlin" });
  for (const [name, value] of Object.entries(fields)) await form.locator(`[name=${name}]`).fill(value);
  return form;
}

for (const language of ["de", "en"]) {
  const path = language === "de" ? "/" : "/en/";
  test(`${language}: nothing loads before consent or after refusal; choice survives reload`, async ({ page, baseURL }) => {
    const requests = await setup(page, baseURL);
    await page.goto(origin + path);
    await expect(page.locator(".consent-panel")).toBeVisible();
    expect(requests).toEqual([]);
    const form = await fillCourse(page);
    await form.locator("button[type=submit]").click();
    await expect(page.locator(".form-confirmation")).toBeVisible();
    expect(requests).toEqual([]);
    await page.locator("[data-consent-reject]").click();
    await page.reload();
    await expect(page.locator(".consent-panel")).toBeHidden();
    expect(requests).toEqual([]);
    await page.locator(".consent-settings").click();
    await accept(page);
    expect(requests).toEqual([pixelScript]);
    expect(await eventCalls(page)).toEqual([["trackSingle", "123456789", "PageView"]]);
    const calls = await page.evaluate(() => window.metaCalls);
    expect(calls.slice(0, 4)).toEqual([["consent", "revoke"], ["set", "autoConfig", false, "123456789"], ["init", "123456789"], ["consent", "grant"]]);
  });
}

test("binding registration sends exactly the submitted price without personal form data", async ({ page, baseURL }) => {
  await setup(page, baseURL, { courses: [course, { ...course, id: "other" }] });
  let finish;
  const hold = new Promise((resolve) => { finish = resolve; });
  await page.route(endpoint, async (route) => { await hold; await route.fulfill({ json: { code: 200, status: "success" } }); });
  await page.goto(origin);
  await accept(page);
  const form = await fillCourse(page);
  await form.locator("[name=friend_registration]").check();
  await form.locator("[name=friend_name]").fill("PrivateFriend");
  const sent = page.waitForRequest(endpoint);
  await form.locator("button[type=submit]").click();
  await sent;
  expect(await eventCalls(page)).toHaveLength(1);
  await form.locator("[name=friend_registration]").uncheck();
  await form.locator("[name=course_id]").selectOption("other");
  finish();
  await expect(page.locator(".form-confirmation")).toBeVisible();
  const calls = await eventCalls(page);
  expect(calls).toEqual([["trackSingle", "123456789", "PageView"], ["trackSingle", "123456789", "Purchase", { value: 349, currency: "EUR", content_name: "Starter Class" }]]);
  expect(JSON.stringify(calls)).not.toMatch(/Private|Secret|@|Berlin/);
});

test("failed submission is not a conversion; a successful retry counts once", async ({ page, baseURL }) => {
  await setup(page, baseURL);
  let submissions = 0;
  await page.route(endpoint, (route) => route.fulfill({ json: ++submissions === 1 ? { code: 400, status: "error" } : { code: 200, status: "success" } }));
  await page.goto(origin);
  await accept(page);
  const form = await fillCourse(page);
  await form.locator("button[type=submit]").click();
  await expect(form.locator("[data-form-status]")).toHaveClass(/is-error/);
  expect(await eventCalls(page)).toHaveLength(1);
  await form.locator("button[type=submit]").click();
  await expect(page.locator(".form-confirmation")).toBeVisible();
  expect(await eventCalls(page)).toHaveLength(2);
});

for (const mode of ["waitlist", "inquiry"]) {
  test(`${mode} is a lead, never a purchase`, async ({ page, baseURL }) => {
    await setup(page, baseURL, { courses: mode === "inquiry" ? [] : [{ ...course, status: mode }] });
    await page.goto(origin);
    await accept(page);
    const form = await fillCourse(page, false);
    await form.locator("button[type=submit]").click();
    await expect(page.locator(".form-confirmation")).toBeVisible();
    expect((await eventCalls(page)).slice(1)).toEqual([["trackSingle", "123456789", "Lead", { content_name: "Course enquiry" }]]);
  });
}

test("withdrawal on the privacy page stops another open tab and clears marketing cookies", async ({ page, context, baseURL }) => {
  await setup(page, baseURL);
  await page.goto(origin);
  await accept(page);
  await context.addCookies([{ name: "_fbp", value: "test", domain: ".juliasutter.de", path: "/" }, { name: "_fbc", value: "test", url: origin }]);
  const privacy = await context.newPage();
  const requests = await setup(privacy, baseURL);
  await privacy.goto(`${origin}/datenschutz/`);
  expect(requests).toEqual([]);
  await privacy.locator(".consent-settings").click();
  await privacy.locator("[data-consent-reject]").click();
  await expect.poll(() => page.evaluate(() => window.metaCalls.at(-1))).toEqual(["consent", "revoke"]);
  expect((await context.cookies(origin)).filter((cookie) => ["_fbp", "_fbc"].includes(cookie.name))).toEqual([]);
  const form = await fillCourse(page);
  await form.locator("button[type=submit]").click();
  await expect(page.locator(".form-confirmation")).toBeVisible();
  expect(await eventCalls(page)).toHaveLength(1);
});

test("revoking while the script loads discards pending conversions", async ({ page, baseURL }) => {
  let finish;
  const delayPixel = new Promise((resolve) => { finish = resolve; });
  await setup(page, baseURL, { delayPixel });
  await page.goto(origin);
  await page.locator("[data-consent-accept]").click();
  const form = await fillCourse(page);
  await form.locator("button[type=submit]").click();
  await expect(page.locator(".form-confirmation")).toBeVisible();
  await page.locator(".consent-settings").click();
  await page.locator("[data-consent-reject]").click();
  finish();
  await expect.poll(() => page.evaluate(() => Boolean(window.metaCalls))).toBe(true);
  expect(await eventCalls(page)).toEqual([]);
  await page.locator(".consent-settings").click();
  await accept(page);
  expect(await eventCalls(page)).toEqual([["trackSingle", "123456789", "PageView"]]);
});

test("expired consent is ignored and local previews never load Meta", async ({ page, baseURL }) => {
  const requests = await setup(page, baseURL);
  await page.addInitScript(({ key }) => window.localStorage.setItem(key, JSON.stringify({ version: 1, choice: "accepted", timestamp: 1 })), { key: consentKey });
  await page.goto(origin);
  await expect(page.locator(".consent-panel")).toBeVisible();
  expect(requests).toEqual([]);
  await page.route("**/assets/measurement-config.js", (route) => route.fulfill({ contentType: "application/javascript", body: 'window.JULIA_MEASUREMENT_CONFIG={pixelId:"123456789"};' }));
  await page.goto(baseURL);
  await page.locator("[data-consent-accept]").click();
  expect(requests).toEqual([]);
});

test("contact success and calendar opening remain distinct from purchases and scheduled calls", async ({ page, baseURL }) => {
  await setup(page, baseURL);
  await page.goto(origin);
  await accept(page);
  await page.locator("[data-form-tab=contact]").click();
  const form = page.locator("#contact-panel form");
  for (const [name, value] of Object.entries({ name: "PrivateName", email: "private@example.com", message: "Private message" })) await form.locator(`[name=${name}]`).fill(value);
  await form.locator("[name=topic]").selectOption("other");
  await form.locator("button[type=submit]").click();
  await expect(page.locator("#contact-panel .form-confirmation")).toBeVisible();
  await page.route("https://calendar.google.com/**", (route) => route.fulfill({ body: "Test calendar" }));
  await page.locator("[data-booking-trigger]").first().click();
  expect((await eventCalls(page)).slice(1)).toEqual([["trackSingle", "123456789", "Lead", { content_name: "Contact enquiry" }], ["trackSingleCustom", "123456789", "CalendarOpened", {}]]);
});
