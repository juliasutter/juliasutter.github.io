(function () {
  const storageKey = "julia-marketing-consent-v1";
  const lifetime = 180 * 24 * 60 * 60 * 1000;
  const pixelId = window.JULIA_MEASUREMENT_CONFIG?.pixelId;
  const validPixel = typeof pixelId === "string" && /^\d+$/.test(pixelId);
  const openaiPixelId = window.JULIA_MEASUREMENT_CONFIG?.openaiPixelId;
  const validOpenaiPixel = typeof openaiPixelId === "string" && /^[a-zA-Z0-9_-]+$/.test(openaiPixelId);
  const consentVersion = 3;
  const attributionKey = "julia-campaign-attribution-v1";
  const attributionLifetime = 30 * 60 * 1000;

  const english = document.documentElement.lang === "en";
  const copy = english ? {
    title: "Cookies & privacy",
    text: "With your consent, we use cookies and similar technologies to measure how our ads work. Two providers receive usage data for this, including outside the European Economic Area. One provider may link these data to your account and use them for personalised ads.",
    note: "You can withdraw consent at any time through ‘Cookie settings’.",
    details: "Privacy details",
    sections: [
      ["Meta", "Meta Platforms Ireland Limited receives page views, successfully submitted enquiries and course registrations, and events when the appointment calendar is opened. These include technical data such as IP address, browser, device, page address and ad click identifiers. A binding course registration also includes its value in euros. Meta may link these data to your account and use them for personalised ads."],
      ["OpenAI", "OpenAI receives visits, successfully submitted enquiries and course registrations to measure our ChatGPT ads, along with the event time, website domain, a random event identifier and technical connection data such as your IP address. Opening the calendar is not reported to OpenAI as a booked call."],
      ["Data and storage", "Both providers may process data in the United States. We do not send form contents such as names, email addresses, messages or information about children to Meta or OpenAI as measurement data. With your consent, Julia receives campaign labels with your form; these are stored in your browser tab for up to 30 minutes. Meta measurement cookies typically last up to three months. An OpenAI ad click identifier is used for up to 30 days and removed on your next visit after expiry, or immediately on withdrawal."],
      ["Your choice", "Consent is voluntary. You can use the website and book just as well without it. Your choice is saved in your browser for up to 180 days. To withdraw, open ‘Cookie settings’ in the footer and choose ‘Decline’. Further measurement events stop and accessible measurement cookies and stored campaign and click identifiers are removed. Withdrawal does not undo previous lawful processing."]
    ],
    accept: "Accept", reject: "Decline", settings: "Cookie settings",
    close: "Close", privacy: "Full privacy policy", privacyUrl: "/en/privacy/#cookies", status: "Your choice has been saved."
  } : {
    title: "Cookies & Datenschutz",
    text: "Mit deiner Einwilligung nutzen wir Cookies und ähnliche Techniken, um die Wirkung unserer Anzeigen zu messen. Dafür erhalten zwei Anbieter Nutzungsdaten, auch außerhalb des Europäischen Wirtschaftsraums. Ein Anbieter kann diese mit deinem Konto verknüpfen und für personalisierte Anzeigen nutzen.",
    note: "Jederzeit über „Cookie-Einstellungen“ widerrufbar.",
    details: "Datenschutzdetails",
    sections: [
      ["Meta", "Meta Platforms Ireland Limited erhält Seitenaufrufe, erfolgreich übermittelte Anfragen und Kursanmeldungen sowie Ereignisse beim Öffnen der Terminbuchung. Dazu kommen technische Daten wie IP-Adresse, Browser, Gerät, Seitenadresse und Anzeigen-Klickkennungen. Bei einer verbindlichen Kursanmeldung wird auch der Buchungswert in Euro übermittelt. Meta kann die Daten mit deinem Konto verknüpfen und für personalisierte Anzeigen nutzen."],
      ["OpenAI", "OpenAI erhält Besuche, erfolgreich übermittelte Anfragen und Kursanmeldungen zur Messung unserer ChatGPT-Anzeigen sowie Ereigniszeitpunkt, Website-Domain, eine zufällige Ereigniskennung und technische Verbindungsdaten wie deine IP-Adresse. Das Öffnen des Kalenders wird nicht als gebuchtes Gespräch an OpenAI gemeldet."],
      ["Daten und Speicherung", "Beide Anbieter können Daten in den USA verarbeiten. Formularinhalte wie Namen, E-Mail-Adressen, Nachrichten oder Angaben über Kinder übermitteln wir nicht als Messdaten an Meta oder OpenAI. Mit deiner Einwilligung erhält Julia mit deinem Formular Kampagnenangaben; diese werden für höchstens 30 Minuten im Browser-Tab gespeichert. Meta-Messcookies haben üblicherweise eine Laufzeit von bis zu drei Monaten. Eine OpenAI-Anzeigen-Klickkennung wird höchstens 30 Tage verwendet und nach Ablauf beim nächsten Besuch oder bei Widerruf sofort gelöscht."],
      ["Deine Wahl", "Die Einwilligung ist freiwillig. Du kannst die Website auch ohne sie genauso nutzen und buchen. Deine Auswahl wird für bis zu 180 Tage im Browser gespeichert. Zum Widerrufen öffnest du „Cookie-Einstellungen“ im Seitenfuß und wählst „Ablehnen“. Weitere Messereignisse werden verhindert und erreichbare Messcookies sowie gespeicherte Kampagnen- und Klickkennungen entfernt. Bereits rechtmäßig verarbeitete Daten werden dadurch nicht rückwirkend gelöscht."]
    ],
    accept: "Einwilligen", reject: "Ablehnen", settings: "Cookie-Einstellungen",
    close: "Schließen", privacy: "Vollständige Datenschutzerklärung", privacyUrl: "/datenschutz/#cookies", status: "Deine Auswahl wurde gespeichert."
  };
  const contentPage = ["/", "/index.html", "/en/", "/en/index.html"].includes(window.location.pathname);
  // Local previews and legal pages must never send production measurement events.
  const productionPage = contentPage && ["juliasutter.de", "www.juliasutter.de"].includes(window.location.hostname);
  const canMeasure = validPixel && productionPage;
  const canMeasureOpenai = validOpenaiPixel && productionPage;
  const readChoice = () => {
    try {
      const value = JSON.parse(localStorage.getItem(storageKey));
      const age = Date.now() - value?.timestamp;
      return value?.version === consentVersion && ["accepted", "rejected"].includes(value.choice) && age >= 0 && age < lifetime ? value.choice : null;
    } catch (_) {
      // Storage can be unavailable; consent then lasts only for this page visit.
      return null;
    }
  };
  let choice = readChoice();
  let loading = false;
  let ready = false;
  let initialized = false;
  let viewed = false;
  let pending = [];
  let openaiViewed = false;


  // Only campaign labels enter form attribution: no referrer, full URL,
  // search terms or person-level click identifiers (gclid, fbclid, oppref).
  const attributionFields = ["utm_source", "utm_medium", "utm_campaign", "utm_content"];
  const sanitizeAttribution = (value) => {
    const result = {};
    for (const key of attributionFields) {
      if (typeof value?.[key] === "string" && /^[a-zA-Z0-9_-]{1,128}$/.test(value[key])) result[key] = value[key];
    }
    return result.utm_source ? result : null;
  };
  let attribution = null;
  const clearAttribution = () => {
    attribution = null;
    try { sessionStorage.removeItem(attributionKey); } catch (_) { /* Storage is optional. */ }
  };
  const readAttribution = () => {
    if (choice !== "accepted") return null;
    if (!attribution) {
      try {
        const stored = JSON.parse(sessionStorage.getItem(attributionKey));
        const labels = sanitizeAttribution(stored?.labels);
        if (labels) attribution = { labels, timestamp: stored.timestamp };
      } catch (_) { /* Storage is optional. */ }
    }
    const age = Date.now() - attribution?.timestamp;
    if (!Number.isFinite(age) || age < 0 || age >= attributionLifetime) {
      clearAttribution();
      return null;
    }
    return attribution.labels;
  };
  const captureAttribution = () => {
    if (!contentPage || choice !== "accepted") return;
    const params = new window.URLSearchParams(window.location.search);
    if (!params.has("utm_source")) { readAttribution(); return; }
    const labels = sanitizeAttribution(Object.fromEntries(attributionFields.map((key) => [key, params.get(key)])));
    // Consume these labels after consent so a reload cannot restart an expired
    // attribution window. Keep the anchor and unrelated URL parameters intact.
    const cleanUrl = new window.URL(window.location.href);
    for (const key of attributionFields) cleanUrl.searchParams.delete(key);
    window.history.replaceState(window.history.state, "", cleanUrl);
    const previous = readAttribution();
    // Reloading the same campaign must not extend its existing attribution window.
    if (labels && previous && attributionFields.every((key) => labels[key] === previous[key])) return;
    clearAttribution();
    if (!labels) return;
    attribution = { labels, timestamp: Date.now() };
    try { sessionStorage.setItem(attributionKey, JSON.stringify(attribution)); } catch (_) { /* This page can still attribute forms. */ }
  };

  const removeMarketingCookies = () => {
    for (const name of ["_fbp", "_fbc", "__oppref", "__obref"]) {
      for (const domain of ["", window.location.hostname, ".juliasutter.de"]) {
        document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax${domain ? `; Domain=${domain}` : ""}`;
      }
    }
  };
  const openaiReferenceKey = "julia-openai-click-v1";
  const openaiReferenceLifetime = 30 * 24 * 60 * 60 * 1000;
  let openaiReference = null;
  // Opaque attribution token only; never contact data, UTM labels or full URLs.
  const validReference = (value) => typeof value === "string" && /^[a-zA-Z0-9._~+/=-]{1,1024}$/.test(value);
  const clearOpenaiReference = () => {
    openaiReference = null;
    try { localStorage.removeItem(openaiReferenceKey); } catch (_) { /* Storage is optional. */ }
  };
  const readOpenaiReference = () => {
    if (choice !== "accepted") return null;
    if (!openaiReference) {
      try { openaiReference = JSON.parse(localStorage.getItem(openaiReferenceKey)); } catch (_) { /* Storage is optional. */ }
    }
    const age = Date.now() - openaiReference?.timestamp;
    if (!validReference(openaiReference?.value) || !Number.isFinite(age) || age < 0 || age >= openaiReferenceLifetime) {
      clearOpenaiReference();
      return null;
    }
    return openaiReference.value;
  };
  const captureOpenaiReference = () => {
    if (!canMeasureOpenai || choice !== "accepted") return;
    const url = new window.URL(window.location.href);
    if (!url.searchParams.has("oppref")) { readOpenaiReference(); return; }
    const value = url.searchParams.get("oppref");
    url.searchParams.delete("oppref");
    window.history.replaceState(window.history.state, "", url);
    if (validReference(value) && readOpenaiReference() === value) return;
    clearOpenaiReference();
    if (!validReference(value)) return;
    openaiReference = { value, timestamp: Date.now() };
    try { localStorage.setItem(openaiReferenceKey, JSON.stringify(openaiReference)); } catch (_) { /* Current-page attribution remains available. */ }
  };
  const measureOpenai = (name, data) => {
    if (!canMeasureOpenai || choice !== "accepted") return;
    // Use the documented image endpoint, without the SDK's automatic form matching.
    // Insert only on the confirmed event; never add a static/no-consent pixel.
    const url = new window.URL("https://bzr.openai.com/v1/sdk/events");
    url.searchParams.set("pid", openaiPixelId);
    url.searchParams.set("event", name);
    url.searchParams.set("data[type]", data.type);
    url.searchParams.set("event_id", window.crypto.randomUUID());
    const reference = readOpenaiReference();
    if (reference) url.searchParams.set("oppref", reference);
    const image = document.createElement("img");
    image.width = 1;
    image.height = 1;
    image.alt = "";
    image.style.display = "none";
    image.referrerPolicy = "origin";
    image.onload = image.onerror = () => image.remove();
    image.src = url.href;
    document.body.append(image);
  };
  const startOpenai = () => {
    if (!canMeasureOpenai || choice !== "accepted" || openaiViewed) return;
    measureOpenai("page_viewed", { type: "contents" });
    openaiViewed = true;
  };
  const startMeasurement = () => {
    if (!canMeasure || choice !== "accepted") return;
    if (ready) {
      if (!initialized) {
        window.fbq("set", "autoConfig", false, pixelId);
        window.fbq("init", pixelId);
        initialized = true;
      }
      window.fbq("consent", "grant");
      if (!viewed) {
        window.fbq("trackSingle", pixelId, "PageView");
        viewed = true;
      }
      for (const event of pending) window.fbq(...event);
      pending = [];
      return;
    }
    if (loading) return;
    loading = true;
    // Meta's queue is installed only after affirmative consent. No noscript pixel.
    const fbq = function () {
      if (fbq.callMethod) fbq.callMethod.apply(fbq, arguments);
      else fbq.queue.push(arguments);
    };
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = "2.0";
    fbq.queue = [];
    window.fbq = fbq;
    window._fbq = fbq;
    fbq("consent", "revoke");
    const script = document.createElement("script");
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    script.async = true;
    script.onload = () => {
      ready = true;
      startMeasurement();
    };
    script.onerror = () => { pending = []; };
    document.head.append(script);
  };
  const track = (event, parameters = {}, custom = false) => {
    if (!canMeasure || choice !== "accepted") return;
    const args = [custom ? "trackSingleCustom" : "trackSingle", pixelId, event, parameters];
    if (ready && initialized) window.fbq(...args);
    else pending.push(args);
  };
  // No names, contact details, addresses, child details or free text enter this API.
  window.JULIA_MEASUREMENT = {
    campaignAttribution() { return readAttribution(); },
    formSucceeded(kind, mode, price) {
      if (kind === "course" && mode === "open" && Number.isFinite(price) && price > 0) {
        track("Purchase", { value: price, currency: "EUR", content_name: "Starter Class" });
        // A submitted binding registration is not a confirmed payment.
        measureOpenai("registration_completed", { type: "customer_action" });
      } else {
        track("Lead", { content_name: kind === "course" ? "Course enquiry" : "Contact enquiry" });
        measureOpenai("lead_created", { type: "customer_action" });
      }
    },
    calendarOpened() { track("CalendarOpened", {}, true); }
  };

  const panel = document.createElement("section");
  panel.className = "consent-panel";
  panel.setAttribute("role", "region");
  panel.setAttribute("aria-labelledby", "consent-title");
  panel.hidden = Boolean(choice);
  panel.innerHTML = `<h2 id="consent-title" tabindex="-1"></h2><p></p><p class="consent-note"></p><div class="consent-actions"><button type="button" data-consent-accept></button><button type="button" data-consent-reject></button><button type="button" data-consent-close></button></div><details class="consent-details"><summary></summary><div class="consent-details-body"></div><a></a></details>`;
  panel.querySelector("h2").textContent = copy.title;
  panel.querySelector("p").textContent = copy.text;
  panel.querySelector(".consent-note").textContent = copy.note;
  const details = panel.querySelector("details");
  details.querySelector("summary").textContent = copy.details;
  const detailsBody = panel.querySelector(".consent-details-body");
  for (const [title, text] of copy.sections) {
    const heading = document.createElement("h3");
    heading.textContent = title;
    const paragraph = document.createElement("p");
    paragraph.textContent = text;
    detailsBody.append(heading, paragraph);
  }
  const privacy = panel.querySelector("a");
  privacy.href = copy.privacyUrl;
  privacy.textContent = copy.privacy;
  const reject = panel.querySelector("[data-consent-reject]");
  const accept = panel.querySelector("[data-consent-accept]");
  const close = panel.querySelector("[data-consent-close]");
  reject.textContent = copy.reject;
  accept.textContent = copy.accept;
  close.textContent = copy.close;
  close.hidden = !choice;
  const settings = document.createElement("button");
  settings.type = "button";
  settings.className = "consent-settings";
  settings.textContent = copy.settings;
  settings.addEventListener("click", () => {
    panel.hidden = false;
    close.hidden = !choice;
    panel.querySelector("h2").focus();
  });
  close.addEventListener("click", () => { panel.hidden = true; settings.focus(); });
  const status = document.createElement("span");
  status.className = "consent-status";
  status.setAttribute("role", "status");
  const applyChoice = (next) => {
    choice = next;
    if (choice === "accepted") {
      captureAttribution();
      captureOpenaiReference();
      startMeasurement();
      startOpenai();
    }
    else {
      clearAttribution();
      pending = [];
      clearOpenaiReference();
      if (window.fbq) window.fbq("consent", "revoke");
      removeMarketingCookies();
    }
  };
  const choose = (next) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ version: consentVersion, choice: next, timestamp: Date.now() }));
    } catch (_) { /* The current page still honours the choice without storage. */ }
    applyChoice(next);
    panel.hidden = true;
    details.open = false;
    status.textContent = copy.status;
    settings.focus({ preventScroll: true });
  };
  reject.addEventListener("click", () => choose("rejected"));
  accept.addEventListener("click", () => choose("accepted"));
  window.addEventListener("storage", (event) => {
    if (event.key !== storageKey && event.key !== null) return;
    applyChoice(readChoice());
    panel.hidden = Boolean(choice);
  });
  document.body.append(panel, status);
  (document.querySelector(".site-footer .footer-column[aria-label='Rechtliches'], .site-footer .footer-column[aria-label='Legal'], .legal-footer-links") || document.body).append(settings);
  applyChoice(choice);
})();
