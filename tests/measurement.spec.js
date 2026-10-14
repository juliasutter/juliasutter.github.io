import { expect, test } from "@playwright/test";

const origin = "https://juliasutter.de";
const pixelScript = "https://connect.facebook.net/en_US/fbevents.js";
const endpoint = "https://formcarry.com/s/measurement-test";
const consentKey = "julia-marketing-consent-v1";
const course = { id: "future", status: "open", dates: ["2099-03-02", "2099-03-09", "2099-03-16", "2099-03-23", "2099-03-30", "2099-04-06"] };
const metaStub = `window.metaCalls=[]; const q=window.fbq; q.callMethod=(...args)=>window.metaCalls.push(args); for(const args of q.queue) q.callMethod(...args); q.queue=[];`;

async function setup(page, baseURL, { courses = [course], delayPixel, openai = false } = {}) {
  const requests = [];
  page.on("request", (request) => {
    if (/facebook\.(net|com)/.test(request.url())) requests.push(request.url());
  });
  // Serve the actual local files under the production origin, with all external
  // measurement and submission requests intercepted. No real Meta events or leads.
  await page.route(`${origin}/**`, async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/assets/measurement-config.js") return route.fulfill({ contentType: "application/javascript", body: `window.JULIA_MEASUREMENT_CONFIG=${JSON.stringify({ pixelId: "123456789", ...(openai ? { openaiPixelId: "test-pixel" } : {}) })};` });
    if (url.pathname === "/assets/course-config.js") return route.fulfill({ contentType: "application/javascript", body: `window.JULIA_SITE_CONFIG=${JSON.stringify({ formEndpoint: endpoint, priceEur: 399, friendPriceEur: 349, courses, introCallUrl: "https://calendar.google.com/test" })};` });
    const response = await page.request.get(`${baseURL}${url.pathname}`);
    return route.fulfill({ response });
  });
  await page.route("https://**.facebook.com/**", (route) => route.abort());
  await page.route("https://bzr.openai.com/**", (route) => route.abort());
  await page.route("https://bzrcdn.openai.com/**", (route) => route.abort());
  await page.route("https://connect.facebook.net/**", async (route) => {
    if (delayPixel) await delayPixel;
    await route.fulfill({ contentType: "application/javascript", body: metaStub });
  });
  await page.route(endpoint, (route) => route.fulfill({ json: { code: 200, status: "success" } }));
  return requests;
}

// Let local asset proxies finish before the request context is disposed.
test.afterEach(async ({ page }) => { await page.unrouteAll({ behavior: "wait" }); });

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

const attributionKey = "julia-campaign-attribution-v1";
const campaignQuery = "utm_source=chatgpt&utm_medium=paid&utm_campaign=starterclass_oktober_2026&utm_content=ad_test123";
const submittedLabels = (request) => Object.fromEntries(
  [...(request.postData() || "").matchAll(/name="(utm_[^"]+)"\r\n\r\n([^\r]*)/g)].map((match) => [match[1], match[2]])
);

test("campaign labels require fresh consent and survive navigation to the English contact form", async ({ page, baseURL }) => {
  await setup(page, baseURL);
  // An older Meta-only consent does not authorize the additional purpose.
  await page.addInitScript(({ key }) => {
    if (!window.localStorage.getItem(key)) window.localStorage.setItem(key, JSON.stringify({ version: 1, choice: "accepted", timestamp: Date.now() }));
  }, { key: consentKey });
  await page.goto(`${origin}/?${campaignQuery}&oppref=secret-click&gclid=secret-google&utm_term=private-search&email=private@example.com`);
  await expect(page.locator(".consent-panel")).toBeVisible();
  expect(await page.evaluate((key) => window.sessionStorage.getItem(key), attributionKey)).toBeNull();
  expect(await page.evaluate(() => window.JULIA_MEASUREMENT.campaignAttribution())).toBeNull();
  await accept(page);
  await page.goto(`${origin}/en/`);
  await expect(page.locator(".consent-panel")).toBeHidden();
  await page.locator("[data-form-tab=contact]").click();
  const form = page.locator("#contact-panel form");
  for (const [name, value] of Object.entries({ name: "PrivateName", email: "private@example.com", message: "Private message" })) await form.locator(`[name=${name}]`).fill(value);
  await form.locator("[name=topic]").selectOption("other");
  const sent = page.waitForRequest(endpoint);
  await form.locator("button[type=submit]").click();
  const request = await sent;
  await expect(page.locator("#contact-panel .form-confirmation")).toBeVisible();
  expect(submittedLabels(request)).toEqual({ utm_source: "chatgpt", utm_medium: "paid", utm_campaign: "starterclass_oktober_2026", utm_content: "ad_test123" });
  expect(request.postData()).not.toMatch(/secret-click|secret-google|private-search|name="email".*email=/);
  const stored = await page.evaluate((key) => window.sessionStorage.getItem(key), attributionKey);
  expect(stored).not.toMatch(/secret|private|oppref|gclid|utm_term|email/);
  expect(JSON.stringify(await eventCalls(page))).not.toMatch(/utm_|chatgpt|ad_test123|Private/);
});

test("course submissions omit campaign labels before consent, after refusal and after withdrawal", async ({ page, baseURL }) => {
  await setup(page, baseURL);
  for (const state of ["undecided", "rejected", "withdrawn"]) {
    await page.goto(`${origin}/?${campaignQuery}`);
    if (state === "rejected") await page.locator("[data-consent-reject]").click();
    if (state === "withdrawn") {
      await page.locator(".consent-settings").click();
      await accept(page);
      await page.locator(".consent-settings").click();
      await page.locator("[data-consent-reject]").click();
    }
    const form = await fillCourse(page);
    const sent = page.waitForRequest(endpoint);
    await form.locator("button[type=submit]").click();
    expect(submittedLabels(await sent)).toEqual({});
    await expect(page.locator(".form-confirmation")).toBeVisible();
    expect(await page.evaluate((key) => window.sessionStorage.getItem(key), attributionKey)).toBeNull();
  }
});

test("a new campaign replaces attribution, invalid labels and expired attribution are dropped", async ({ page, baseURL }) => {
  await setup(page, baseURL);
  await page.goto(`${origin}/?${campaignQuery}`);
  await accept(page);
  await page.goto(`${origin}/?utm_source=google&utm_campaign=new_course&utm_content=person%40example.com&utm_medium=${"x".repeat(129)}`);
  const form = await fillCourse(page);
  const sent = page.waitForRequest(endpoint);
  await form.locator("button[type=submit]").click();
  expect(submittedLabels(await sent)).toEqual({ utm_source: "google", utm_campaign: "new_course" });
  await page.evaluate((key) => window.sessionStorage.setItem(key, JSON.stringify({ labels: { utm_source: "chatgpt" }, timestamp: Date.now() - 31 * 60 * 1000 })), attributionKey);
  await page.goto(origin);
  expect(await page.evaluate(() => window.JULIA_MEASUREMENT.campaignAttribution())).toBeNull();
  expect(await page.evaluate((key) => window.sessionStorage.getItem(key), attributionKey)).toBeNull();
  await page.goto(`${origin}/?${campaignQuery}`);
  await page.goto(`${origin}/?utm_source=person%40example.com`);
  expect(await page.evaluate(() => window.JULIA_MEASUREMENT.campaignAttribution())).toBeNull();
});

test("reloading the same campaign preserves its original attribution expiry", async ({ page, baseURL }) => {
  await setup(page, baseURL);
  await page.goto(`${origin}/?${campaignQuery}&keep=ok#starter-class`);
  await accept(page);
  const originalTimestamp = await page.evaluate((key) => {
    const value = JSON.parse(window.sessionStorage.getItem(key));
    value.timestamp = Date.now() - 29 * 60 * 1000;
    window.sessionStorage.setItem(key, JSON.stringify(value));
    return value.timestamp;
  }, attributionKey);
  expect(page.url()).toBe(`${origin}/?keep=ok#starter-class`);
  await page.reload();
  expect(await page.evaluate((key) => JSON.parse(window.sessionStorage.getItem(key)).timestamp, attributionKey)).toBe(originalTimestamp);
  await page.evaluate((key) => {
    const value = JSON.parse(window.sessionStorage.getItem(key));
    value.timestamp -= 2 * 60 * 1000;
    window.sessionStorage.setItem(key, JSON.stringify(value));
  }, attributionKey);
  await page.reload();
  expect(await page.evaluate(() => window.JULIA_MEASUREMENT.campaignAttribution())).toBeNull();
  expect(await page.evaluate((key) => window.sessionStorage.getItem(key), attributionKey)).toBeNull();
});

for (const scenario of ["older API", "measurement exception"]) {
  test(`forms still submit with ${scenario}`, async ({ page, baseURL }) => {
    await setup(page, baseURL);
    await page.goto(origin);
    await page.evaluate((scenario) => {
      window.JULIA_MEASUREMENT = scenario === "older API" ? {} : { campaignAttribution() { throw new Error("Measurement unavailable"); } };
    }, scenario);
    const form = await fillCourse(page);
    const sent = page.waitForRequest(endpoint);
    await form.locator("button[type=submit]").click();
    expect(submittedLabels(await sent)).toEqual({});
    await expect(page.locator(".form-confirmation")).toBeVisible();
  });
}

const openaiReferenceKey = "julia-openai-click-v1";
function collectOpenai(page) {
  const events = [];
  const scripts = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.hostname === "bzrcdn.openai.com") scripts.push(url.href);
    if (url.hostname === "bzr.openai.com") events.push({ params: Object.fromEntries(url.searchParams), referrer: request.headers().referer });
  });
  return { events, scripts };
}

test("OpenAI requires renewed consent and separates successful registrations from enquiries without form contents", async ({ page, baseURL }) => {
  await setup(page, baseURL, { openai: true });
  const { events, scripts } = collectOpenai(page);
  await page.addInitScript((key) => window.localStorage.setItem(key, JSON.stringify({ version: 2, choice: "accepted", timestamp: Date.now() })), consentKey);
  await page.goto(`${origin}/?${campaignQuery}&oppref=ad-reference#kontakt`);
  await expect(page.locator(".consent-panel")).toBeVisible();
  expect(events).toEqual([]);
  expect(await page.evaluate((key) => window.localStorage.getItem(key), openaiReferenceKey)).toBeNull();
  await accept(page);
  await expect.poll(() => events.length).toBe(1);
  expect(page.url()).not.toContain("oppref");
  const form = await fillCourse(page);
  await form.locator("button[type=submit]").click();
  await expect(page.locator(".form-confirmation")).toBeVisible();
  await page.locator("[data-form-tab=contact]").click();
  const contact = page.locator("#contact-panel form");
  for (const [name, value] of Object.entries({ name: "Private Name", email: "private@example.com", message: "Private child details" })) await contact.locator(`[name=${name}]`).fill(value);
  await contact.locator("[name=topic]").selectOption("starter-class");
  await contact.locator("button[type=submit]").click();
  await expect(page.locator("#contact-panel .form-confirmation")).toBeVisible();
  await page.route("https://calendar.google.com/**", (route) => route.fulfill({ body: "Test calendar" }));
  await page.locator("[data-booking-trigger]").first().click();
  await expect.poll(() => events.length).toBe(3);
  expect(events.map(({ params }) => [params.event, params["data[type]"]])).toEqual([
    ["page_viewed", "contents"], ["registration_completed", "customer_action"], ["lead_created", "customer_action"]
  ]);
  for (const { params, referrer } of events) {
    expect(Object.keys(params).sort()).toEqual(["data[type]", "event", "event_id", "oppref", "pid"]);
    expect(params.oppref).toBe("ad-reference");
    expect(params.pid).toBe("test-pixel");
    expect(referrer).toBe(origin + "/");
  }
  expect(new Set(events.map(({ params }) => params.event_id)).size).toBe(3);
  expect(JSON.stringify(events)).not.toMatch(/Private|private@|utm_|amount|appointment_scheduled/);
  expect(scripts).toEqual([]);
});

for (const mode of ["inquiry", "waitlist"]) {
  test(`OpenAI counts ${mode} only after a successful response`, async ({ page, baseURL }) => {
    await setup(page, baseURL, { openai: true, courses: mode === "inquiry" ? [] : [{ ...course, status: "waitlist" }] });
    const { events } = collectOpenai(page);
    let attempts = 0;
    await page.route(endpoint, (route) => route.fulfill({ json: ++attempts === 1 ? { code: 400, status: "error" } : { code: 200, status: "success" } }));
    await page.goto(origin);
    await accept(page);
    await expect.poll(() => events.length).toBe(1);
    const form = await fillCourse(page, false);
    await form.locator("button[type=submit]").click();
    await expect(form.locator("[data-form-status]")).not.toBeEmpty();
    expect(events).toHaveLength(1);
    await form.locator("button[type=submit]").click();
    await expect(page.locator(".form-confirmation")).toBeVisible();
    await expect.poll(() => events.length).toBe(2);
    expect(events[1].params.event).toBe("lead_created");
    expect(events[1].params).not.toHaveProperty("oppref");
  });
}

test("OpenAI withdrawal during submission prevents the conversion and removes stored attribution", async ({ page, baseURL }) => {
  await setup(page, baseURL, { openai: true });
  const { events } = collectOpenai(page);
  let finish;
  const hold = new Promise((resolve) => { finish = resolve; });
  await page.route(endpoint, async (route) => { await hold; await route.fulfill({ json: { code: 200, status: "success" } }); });
  await page.goto(`${origin}/?oppref=ad-reference`);
  await accept(page);
  await expect.poll(() => events.length).toBe(1);
  const form = await fillCourse(page);
  const submitted = page.waitForRequest(endpoint);
  await form.locator("button[type=submit]").click();
  await submitted;
  await page.locator(".consent-settings").click();
  await page.locator("[data-consent-reject]").click();
  finish();
  await expect(page.locator(".form-confirmation")).toBeVisible();
  expect(events).toHaveLength(1);
  expect(await page.evaluate((key) => window.localStorage.getItem(key), openaiReferenceKey)).toBeNull();
  await page.reload();
  await expect(page.locator(".consent-panel")).toBeHidden();
  expect(events).toHaveLength(1);
});

test("OpenAI preserves the original attribution window on return visits and expires it after 30 days", async ({ page, baseURL }) => {
  await setup(page, baseURL, { openai: true });
  const { events } = collectOpenai(page);
  await page.goto(`${origin}/?oppref=original-reference`);
  await accept(page);
  const saved = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key)), openaiReferenceKey);
  await page.goto(`${origin}/en/?oppref=original-reference`);
  await expect.poll(() => events.length).toBe(2);
  expect(events[1].params.oppref).toBe("original-reference");
  expect(await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key)), openaiReferenceKey)).toEqual(saved);
  const form = await fillCourse(page);
  await form.locator("button[type=submit]").click();
  await expect(page.locator(".form-confirmation")).toBeVisible();
  await expect.poll(() => events.length).toBe(3);
  expect(events[2].params.oppref).toBe("original-reference");
  await page.evaluate((key) => window.localStorage.setItem(key, JSON.stringify({ value: "expired", timestamp: Date.now() - 30 * 86400000 })), openaiReferenceKey);
  await page.goto(origin);
  await expect.poll(() => events.length).toBe(4);
  expect(events[3].params).not.toHaveProperty("oppref");
  expect(await page.evaluate((key) => window.localStorage.getItem(key), openaiReferenceKey)).toBeNull();
});

test("OpenAI rejects malformed click tokens and sends nothing from local or legal pages", async ({ page, baseURL }) => {
  await setup(page, baseURL, { openai: true });
  const { events } = collectOpenai(page);
  await page.goto(`${origin}/?oppref=private%40example.com`);
  await accept(page);
  await expect.poll(() => events.length).toBe(1);
  expect(events[0].params).not.toHaveProperty("oppref");
  await page.goto(`${origin}/datenschutz/`);
  await expect(page.locator(".consent-settings")).toBeVisible();
  expect(events).toHaveLength(1);
  await page.goto(baseURL);
  await page.locator("[data-consent-accept]").click();
  expect(events).toHaveLength(1);
});
