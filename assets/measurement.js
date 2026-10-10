(function () {
  const storageKey = "julia-marketing-consent-v1";
  const lifetime = 180 * 24 * 60 * 60 * 1000;
  const pixelId = window.JULIA_MEASUREMENT_CONFIG?.pixelId;
  if (typeof pixelId !== "string" || !/^\d+$/.test(pixelId)) return;

  const english = document.documentElement.lang === "en";
  const copy = english ? {
    title: "May we measure how our ads work?",
    text: "With your permission, we use the Meta Pixel to measure visits, course registrations and enquiries and improve our Facebook and Instagram ads. Meta receives device and usage data and may link it to your Meta account. Cookies may be used. The website works just as well without this.",
    accept: "Allow measurement", reject: "Continue without", settings: "Cookie settings",
    close: "Close", privacy: "Privacy details", privacyUrl: "/en/privacy/", status: "Your choice has been saved."
  } : {
    title: "Dürfen wir messen, wie unsere Anzeigen wirken?",
    text: "Mit deiner Erlaubnis nutzen wir das Meta-Pixel, um Besuche, Kursbuchungen und Anfragen zu messen und unsere Facebook- und Instagram-Anzeigen zu verbessern. Meta erhält Geräte- und Nutzungsdaten und kann sie deinem Meta-Konto zuordnen. Dabei können Cookies verwendet werden. Die Website funktioniert auch ohne diese Messung vollständig.",
    accept: "Messung erlauben", reject: "Ohne Messung weiter", settings: "Cookie-Einstellungen",
    close: "Schließen", privacy: "Details zum Datenschutz", privacyUrl: "/datenschutz/", status: "Deine Auswahl wurde gespeichert."
  };
  const contentPage = ["/", "/index.html", "/en/", "/en/index.html"].includes(window.location.pathname);
  // Local previews and legal pages must never send production measurement events.
  const canMeasure = contentPage && ["juliasutter.de", "www.juliasutter.de"].includes(window.location.hostname);
  const readChoice = () => {
    try {
      const value = JSON.parse(localStorage.getItem(storageKey));
      const age = Date.now() - value?.timestamp;
      return value?.version === 1 && ["accepted", "rejected"].includes(value.choice) && age >= 0 && age < lifetime ? value.choice : null;
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

  const removeMarketingCookies = () => {
    for (const name of ["_fbp", "_fbc"]) {
      for (const domain of ["", window.location.hostname, ".juliasutter.de"]) {
        document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax${domain ? `; Domain=${domain}` : ""}`;
      }
    }
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
    formSucceeded(kind, mode, price) {
      if (kind === "course" && mode === "open" && Number.isFinite(price) && price > 0) {
        track("Purchase", { value: price, currency: "EUR", content_name: "Starter Class" });
      } else {
        track("Lead", { content_name: kind === "course" ? "Course enquiry" : "Contact enquiry" });
      }
    },
    calendarOpened() { track("CalendarOpened", {}, true); }
  };

  const panel = document.createElement("section");
  panel.className = "consent-panel";
  panel.setAttribute("role", "region");
  panel.setAttribute("aria-labelledby", "consent-title");
  panel.hidden = Boolean(choice);
  panel.innerHTML = `<h2 id="consent-title" tabindex="-1"></h2><p></p><a></a><div class="consent-actions"><button type="button" data-consent-reject></button><button type="button" data-consent-accept></button><button type="button" data-consent-close></button></div>`;
  panel.querySelector("h2").textContent = copy.title;
  panel.querySelector("p").textContent = copy.text;
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
    if (choice === "accepted") startMeasurement();
    else {
      pending = [];
      if (window.fbq) window.fbq("consent", "revoke");
      removeMarketingCookies();
    }
  };
  const choose = (next) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ version: 1, choice: next, timestamp: Date.now() }));
    } catch (_) { /* The current page still honours the choice without storage. */ }
    applyChoice(next);
    panel.hidden = true;
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
