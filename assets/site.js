(function () {
  document.documentElement.classList.add("js");
  const config = window.JULIA_SITE_CONFIG || {};
  const language = document.documentElement.lang.slice(0, 2) === "en" ? "en" : "de";
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const copy = {
    de: {
      menuOpen: "Menü öffnen",
      menuClose: "Menü schließen",
      inquiryCta: "Kursplatz anfragen",
      inquiryFormTitle: "Kursplatz anfragen",
      inquirySummary: "Schreib mir, wann ein Kurs für dich gut passen würde. Die Anfrage ist unverbindlich.",
      bindingCta: "Anmelden",
      bindingSubmitCta: "Zahlungspflichtig anmelden",
      bindingFormTitle: "Anmelden",
      waitlistCta: "Auf die Warteliste",
      waitlistStatus: "Warteliste geöffnet",
      waitlistFormTitle: "Auf die Warteliste",
      waitlistSummary: "Trag dich unverbindlich ein. Ich melde mich, sobald ein Platz frei wird.",
      courseFallback: "Neue Termine auf Anfrage",
      courseOptionFallback: "Über neue Termine informieren",
      sixDates: "6 Termine",
      courseFormatOnline: "Online",
      courseFormatInPerson: "Vor Ort",
      shortMonths: ["Jan.", "Feb.", "März", "Apr.", "Mai", "Juni", "Juli", "Aug.", "Sep.", "Okt.", "Nov.", "Dez."],
      shortWeekdays: ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"],
      sending: "Wird gesendet…",
      success: "Vielen Dank — deine Nachricht ist unterwegs. Ich melde mich zeitnah.",
      error: "Das hat gerade nicht geklappt. Deine Eingaben sind noch da — bitte versuche es erneut oder schreib an julia@juliasutter.de.",
      timeout: "Das Senden hat zu lange gedauert. Deine Eingaben sind noch da — bitte versuche es erneut oder schreib an julia@juliasutter.de.",
      retry: "Erneut versuchen",
      preview: "Das Formular wird gerade eingerichtet. Schreib bis dahin bitte an julia@juliasutter.de.",
      weekdays: ["sonntags", "montags", "dienstags", "mittwochs", "donnerstags", "freitags", "samstags"]
    },
    en: {
      menuOpen: "Open menu",
      menuClose: "Close menu",
      inquiryCta: "Request a course place",
      inquiryFormTitle: "Request a course place",
      inquirySummary: "Tell me when a course would work well for you. Your request is non-binding.",
      bindingCta: "Register",
      bindingSubmitCta: "Register with payment obligation",
      bindingFormTitle: "Register",
      waitlistCta: "Join the waitlist",
      waitlistStatus: "Waitlist open",
      waitlistFormTitle: "Join the waitlist",
      waitlistSummary: "Join without obligation. I will contact you as soon as a place becomes available.",
      courseFallback: "New dates on request",
      courseOptionFallback: "Tell me about new dates",
      sixDates: "6 sessions",
      courseFormatOnline: "Online",
      courseFormatInPerson: "In person",
      shortMonths: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      shortWeekdays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      sending: "Sending…",
      success: "Thank you — your message is on its way. I will get back to you soon.",
      error: "That did not work just now. Your entries are still here — please try again or email julia@juliasutter.de.",
      timeout: "The submission took too long. Your entries are still here — please try again or email julia@juliasutter.de.",
      retry: "Try again",
      preview: "The form is currently being set up. In the meantime, please email julia@juliasutter.de.",
      weekdays: ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"]
    }
  }[language];

  const menuButton = document.querySelector("[data-menu-button]");
  const mobileNav = document.querySelector("[data-mobile-nav]");
  const menuBackground = Array.from(document.querySelectorAll(".hero-content, .site-header .brand, main, footer, [data-language-suggestion]"));

  const setMenuBackgroundInert = (inert) => {
    menuBackground.forEach((element) => element.toggleAttribute("inert", inert));
  };

  const closeMenu = (restoreFocus = false) => {
    if (!menuButton || !mobileNav) return;
    const wasOpen = menuButton.getAttribute("aria-expanded") === "true";
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", copy.menuOpen);
    mobileNav.hidden = true;
    document.body.classList.remove("menu-open");
    setMenuBackgroundInert(false);
    if (restoreFocus && wasOpen) menuButton.focus();
  };

  if (menuButton && mobileNav) {
    const menuLinks = Array.from(mobileNav.querySelectorAll("a"));
    menuButton.addEventListener("click", () => {
      const opening = menuButton.getAttribute("aria-expanded") !== "true";
      if (!opening) {
        closeMenu(true);
        return;
      }
      menuButton.setAttribute("aria-expanded", "true");
      menuButton.setAttribute("aria-label", copy.menuClose);
      mobileNav.hidden = false;
      document.body.classList.add("menu-open");
      setMenuBackgroundInert(true);
      if (menuLinks[0]) menuLinks[0].focus();
    });
    menuLinks.forEach((link) => link.addEventListener("click", () => closeMenu()));
    window.addEventListener("keydown", (event) => {
      if (menuButton.getAttribute("aria-expanded") !== "true") return;
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu(true);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = [menuButton, ...menuLinks];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
    window.addEventListener("resize", () => {
      if (window.innerWidth > 920) closeMenu();
    });
  }

  document.querySelectorAll("[data-language-link]").forEach((link) => {
    link.addEventListener("click", () => {
      try { localStorage.setItem("preferredLanguage", link.dataset.languageLink); } catch (_) {}
    });
  });

  const languageSuggestion = document.querySelector("[data-language-suggestion]");
  if (languageSuggestion) {
    const current = language;
    let preferred = "";
    let dismissed = false;
    try {
      preferred = localStorage.getItem("preferredLanguage") || "";
      dismissed = sessionStorage.getItem("languageSuggestionDismissed") === "true";
    } catch (_) {}
    const browserLanguages = (navigator.languages || [navigator.language || "de"]).map((value) => value.toLowerCase());
    const browserSpeaksGerman = browserLanguages.some((value) => value === "de" || value.startsWith("de-"));
    const shouldSuggest = !dismissed && !preferred && ((current === "de" && !browserSpeaksGerman) || (current === "en" && browserSpeaksGerman));
    if (shouldSuggest) languageSuggestion.hidden = false;
    const dismiss = languageSuggestion.querySelector("[data-dismiss-language]");
    if (dismiss) dismiss.addEventListener("click", () => {
      languageSuggestion.hidden = true;
      try { sessionStorage.setItem("languageSuggestionDismissed", "true"); } catch (_) {}
    });
  }

  const faqItems = Array.from(document.querySelectorAll(".faq details"));
  const faqAnimations = new WeakMap();
  let activeFaqItem = faqItems.find((item) => item.open) || null;
  const animateDetails = (item, opening) => {
    const summary = item.querySelector("summary");
    const answer = item.querySelector(".details-answer");
    if (!summary || !answer || reducedMotion || typeof item.animate !== "function") {
      item.open = opening;
      return;
    }
    const startHeight = item.offsetHeight;
    const currentAnimation = faqAnimations.get(item);
    if (currentAnimation) {
      currentAnimation.oncancel = null;
      currentAnimation.cancel();
    }
    if (opening) item.open = true;
    const endHeight = opening ? summary.offsetHeight + answer.offsetHeight : summary.offsetHeight;
    item.style.overflow = "hidden";
    const animation = item.animate(
      { height: [`${startHeight}px`, `${endHeight}px`] },
      { duration: 260, easing: "cubic-bezier(.4, 0, .2, 1)" }
    );
    faqAnimations.set(item, animation);
    const cleanUp = () => {
      item.style.overflow = "";
      faqAnimations.delete(item);
    };
    animation.onfinish = () => {
      if (!opening) item.open = false;
      cleanUp();
    };
    animation.oncancel = cleanUp;
  };

  faqItems.forEach((item) => {
    const summary = item.querySelector("summary");
    if (!summary) return;
    summary.addEventListener("click", (event) => {
      event.preventDefault();
      const opening = activeFaqItem !== item;
      if (opening && activeFaqItem) animateDetails(activeFaqItem, false);
      activeFaqItem = opening ? item : null;
      animateDetails(item, opening);
    });
  });

  const reveals = document.querySelectorAll(".reveal");
  if (reducedMotion || !("IntersectionObserver" in window)) {
    reveals.forEach((element) => element.classList.add("is-visible"));
  } else {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.08 });
    reveals.forEach((element) => observer.observe(element));
  }

  const courseTimeZone = config.timeZone || "Europe/Berlin";
  const parseCourseDate = (value) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
    if (!match) return null;
    const [, yearValue, monthValue, dayValue] = match;
    const year = Number(yearValue);
    const month = Number(monthValue);
    const day = Number(dayValue);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) return null;
    return parsed;
  };

  const calendarDateInTimeZone = (date, timeZone) => {
    const parts = new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone
    }).formatToParts(date);
    const value = (type) => Number(parts.find((part) => part.type === type)?.value);
    return new Date(Date.UTC(value("year"), value("month") - 1, value("day")));
  };

  const normalizeCourse = (course) => {
    if (!course || !course.id || !["open", "waitlist", "closed"].includes(course.status)) return null;
    const dates = Array.isArray(course.dates) ? course.dates.map(parseCourseDate) : [];
    if (dates.length !== 6 || dates.some((date) => !date)) return null;
    if (new Set(dates.map((date) => date.getTime())).size !== dates.length) return null;
    dates.sort((a, b) => a - b);
    return { ...course, dates };
  };

  const today = calendarDateInTimeZone(new Date(), courseTimeZone);
  const courses = (Array.isArray(config.courses) ? config.courses : [])
    .map(normalizeCourse)
    .filter((course) => course && course.status !== "closed" && course.dates[course.dates.length - 1] >= today)
    .sort((a, b) => a.dates[0] - b.dates[0]);
  const featuredCourse = courses[0] || null;
  let selectedCourse = featuredCourse;
  let courseMode = selectedCourse ? selectedCourse.status : "inquiry";

  const dateFormatter = new Intl.DateTimeFormat(language === "de" ? "de-DE" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  });
  const shortDateFormatter = new Intl.DateTimeFormat(language === "de" ? "de-DE" : "en-GB", {
    day: "numeric",
    month: "long",
    timeZone: "UTC"
  });

  const formatDateRange = (course) => {
    if (!course) return copy.courseFallback;
    const first = course.dates[0];
    const last = course.dates[course.dates.length - 1];
    if (first.getUTCFullYear() === last.getUTCFullYear()) {
      return `${shortDateFormatter.format(first)} – ${dateFormatter.format(last)}`;
    }
    return `${dateFormatter.format(first)} – ${dateFormatter.format(last)}`;
  };

  const formatCompactDateRange = (course) => {
    if (!course) return copy.courseFallback;
    const first = course.dates[0];
    const last = course.dates[course.dates.length - 1];
    const dayAndMonth = (date) => language === "de"
      ? `${date.getUTCDate()}. ${copy.shortMonths[date.getUTCMonth()]}`
      : `${date.getUTCDate()} ${copy.shortMonths[date.getUTCMonth()]}`;
    if (first.getUTCFullYear() === last.getUTCFullYear()) {
      return `${dayAndMonth(first)}–${dayAndMonth(last)} ${last.getUTCFullYear()}`;
    }
    return `${dayAndMonth(first)} ${first.getUTCFullYear()}–${dayAndMonth(last)} ${last.getUTCFullYear()}`;
  };

  const formatSchedule = (course) => {
    if (!course) return language === "de" ? "montags 20:00–22:00 Uhr" : "Mondays, 20:00–22:00";
    const weekday = copy.weekdays[course.dates[0].getUTCDay()];
    const start = course.startTime || config.defaultStartTime || "20:00";
    const end = course.endTime || config.defaultEndTime || "22:00";
    return language === "de" ? `${weekday} ${start}–${end} Uhr` : `${weekday}, ${start}–${end}`;
  };

  const formatCompactSchedule = (course) => {
    if (!course) return language === "de" ? "Mo · 20:00–22:00 Uhr" : "Mon · 20:00–22:00";
    const weekday = copy.shortWeekdays[course.dates[0].getUTCDay()];
    const start = course.startTime || config.defaultStartTime || "20:00";
    const end = course.endTime || config.defaultEndTime || "22:00";
    return language === "de" ? `${weekday} ${start}–${end} Uhr` : `${weekday} ${start}–${end}`;
  };

  const modeCopy = {
    inquiry: { cta: copy.inquiryCta, submitCta: copy.inquiryCta, title: copy.inquiryFormTitle, summary: copy.inquirySummary },
    open: { cta: copy.bindingCta, submitCta: copy.bindingSubmitCta, title: copy.bindingFormTitle, summary: "" },
    waitlist: { cta: copy.waitlistCta, submitCta: copy.waitlistCta, status: copy.waitlistStatus, title: copy.waitlistFormTitle, summary: copy.waitlistSummary }
  };

  const priceFormatter = new Intl.NumberFormat(language === "de" ? "de-DE" : "en-GB", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  });
  const renderPrice = (selector, value) => {
    const price = Number(value);
    if (!Number.isFinite(price) || price < 0) return;
    document.querySelectorAll(selector).forEach((element) => { element.textContent = priceFormatter.format(price); });
  };
  renderPrice("[data-course-price]", config.priceEur);
  renderPrice("[data-friend-price]", config.friendPriceEur);

  const formTabs = Array.from(document.querySelectorAll("[data-form-tab]"));
  const formPanels = Array.from(document.querySelectorAll("[data-form-panel]"));
  const contactHeading = document.querySelector("[data-contact-heading]");
  const contactIntro = document.querySelector("[data-contact-intro]");
  const courseHeadingText = contactHeading?.textContent;
  const courseIntroText = contactIntro?.textContent;
  const contactFacts = document.querySelector(".contact-facts");
  const contactNote = document.querySelector(".contact-note");
  const activateFormPanel = (name, moveFocus = false) => {
    formTabs.forEach((tab) => {
      const selected = tab.dataset.formTab === name;
      tab.setAttribute("aria-selected", String(selected));
      tab.setAttribute("tabindex", selected ? "0" : "-1");
      if (selected && moveFocus) tab.focus();
    });
    formPanels.forEach((panel) => { panel.hidden = panel.dataset.formPanel !== name; });
    const isContact = name === "contact";
    if (contactHeading) contactHeading.textContent = isContact ? contactHeading.dataset.contactHeading : courseHeadingText;
    if (contactIntro) contactIntro.textContent = isContact ? contactIntro.dataset.contactIntro : courseIntroText;
    if (contactFacts) contactFacts.hidden = isContact;
    if (contactNote) contactNote.hidden = isContact;
    document.querySelector(".contact-shell")?.classList.toggle("is-contact", isContact);
  };
  formTabs.forEach((tab) => {
    tab.addEventListener("click", () => activateFormPanel(tab.dataset.formTab));
    tab.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
      event.preventDefault();
      const currentIndex = formTabs.indexOf(tab);
      const direction = event.key === "ArrowRight" ? 1 : -1;
      const next = formTabs[(currentIndex + direction + formTabs.length) % formTabs.length];
      activateFormPanel(next.dataset.formTab, true);
    });
  });

  const courseForm = document.querySelector("[data-course-form]");
  const courseSelect = courseForm ? courseForm.querySelector("[data-course-select]") : null;
  const courseSelectWrap = courseForm ? courseForm.querySelector("[data-course-select-wrap]") : null;
  const bindingFields = courseForm ? courseForm.querySelector("[data-binding-fields]") : null;
  const bindingCheckout = courseForm ? courseForm.querySelector("[data-binding-checkout]") : null;
  const bindingCourseSchedule = courseForm ? courseForm.querySelector("[data-binding-course-schedule]") : null;
  const bindingCourseFormat = courseForm ? courseForm.querySelector("[data-binding-course-format]") : null;
  const bindingCourseFormatRow = bindingCourseFormat ? bindingCourseFormat.closest("[data-binding-course-format-row]") : null;
  const courseFormatElements = Array.from(document.querySelectorAll("[data-course-format]"));
  const earlyStartConsent = courseForm ? courseForm.querySelector("[data-early-start-consent]") : null;
  const modeField = courseForm ? courseForm.querySelector("[name=registration_mode]") : null;
  const courseLabelField = courseForm ? courseForm.querySelector("[name=course_label]") : null;
  const friendPricing = courseForm ? courseForm.querySelector("[data-friend-pricing]") : null;
  const friendRegistration = courseForm ? courseForm.querySelector("[name=friend_registration]") : null;
  const friendNameGroup = courseForm ? courseForm.querySelector("[data-friend-name]") : null;
  const friendName = courseForm ? courseForm.querySelector("[name=friend_name]") : null;
  const bindingPriceField = courseForm ? courseForm.querySelector("[name=price_eur]") : null;

  const setFieldGroupEnabled = (group, enabled) => {
    if (!group) return;
    group.hidden = !enabled;
    group.querySelectorAll("input, select, textarea").forEach((field) => {
      field.disabled = !enabled;
      if (field.dataset.requiredWhenBinding === "true") field.required = enabled;
    });
  };

  const updateRegistrationPrice = () => {
    const friendPriceAvailable = Number.isFinite(config.friendPriceEur) && config.friendPriceEur >= 0 && config.friendPriceEur < config.priceEur;
    const friendOptionEnabled = courseMode === "open" && friendPriceAvailable;
    setFieldGroupEnabled(friendPricing, friendOptionEnabled);
    const withFriend = friendOptionEnabled && friendRegistration?.checked;
    setFieldGroupEnabled(friendNameGroup, withFriend);
    if (friendName) friendName.required = Boolean(withFriend);
    const price = withFriend ? config.friendPriceEur : config.priceEur;
    renderPrice("[data-binding-price]", price);
    if (bindingPriceField) bindingPriceField.value = Number.isFinite(price) ? String(price) : "";
  };
  if (friendRegistration) friendRegistration.addEventListener("change", updateRegistrationPrice);

  const getCourseFormat = (course) => {
    if (!course || typeof course.format !== "string") return "";
    if (course.format === "online") return copy.courseFormatOnline;
    if (course.format === "vor_ort") return copy.courseFormatInPerson;
    return "";
  };

  const setCourseFormatFields = (course) => {
    const formatLabel = getCourseFormat(course);
    courseFormatElements.forEach((element) => {
      const wrapper = element.closest("[data-course-format-wrap]");
      if (wrapper) wrapper.hidden = !formatLabel;
      element.textContent = formatLabel;
    });
    if (bindingCourseFormatRow) bindingCourseFormatRow.hidden = !formatLabel;
    if (bindingCourseFormat) bindingCourseFormat.textContent = formatLabel;
  };

  const setEarlyStartConsentEnabled = (enabled) => {
    if (!earlyStartConsent) return;
    const field = earlyStartConsent.querySelector("input");
    earlyStartConsent.hidden = !enabled;
    if (!field) return;
    field.disabled = !enabled;
    field.required = enabled;
    if (!enabled) field.checked = false;
  };

  const courseStartsWithinWithdrawalPeriod = (course) => {
    if (!course) return false;
    const withdrawalDeadline = new Date(today.getTime());
    withdrawalDeadline.setUTCDate(withdrawalDeadline.getUTCDate() + 14);
    return course.dates[0] <= withdrawalDeadline;
  };

  const applyCourseSelection = (course) => {
    selectedCourse = course || null;
    courseMode = selectedCourse ? selectedCourse.status : "inquiry";
    const selectedCopy = modeCopy[courseMode];
    document.querySelectorAll("[data-course-cta-label]").forEach((element) => { element.textContent = selectedCopy.cta; });
    document.querySelectorAll("[data-course-submit-label]").forEach((element) => { element.textContent = selectedCopy.submitCta; });
    document.querySelectorAll("[data-course-form-title]").forEach((element) => { element.textContent = selectedCopy.title; });
    document.querySelectorAll("[data-course-form-summary]").forEach((element) => {
      element.textContent = selectedCopy.summary;
      element.hidden = !selectedCopy.summary;
    });
    document.querySelectorAll("[data-course-status-detail]").forEach((element) => {
      if (!selectedCourse) {
        element.textContent = copy.courseFallback;
        return;
      }
      if (element.dataset.courseStatusDetailFormat === "compact") {
        element.textContent = `${formatCompactDateRange(selectedCourse)} · ${formatCompactSchedule(selectedCourse)}`;
        return;
      }
      element.textContent = `${formatDateRange(selectedCourse)} · ${formatSchedule(selectedCourse)}`;
    });
    if (modeField) modeField.value = courseMode;
    if (courseLabelField) courseLabelField.value = selectedCourse ? formatDateRange(selectedCourse) : copy.courseFallback;
    if (bindingCourseSchedule && selectedCourse) {
      bindingCourseSchedule.textContent = `${copy.sixDates} · ${formatCompactDateRange(selectedCourse)} · ${formatCompactSchedule(selectedCourse)}`;
    }
    setCourseFormatFields(selectedCourse);
    setFieldGroupEnabled(bindingFields, courseMode === "open");
    setFieldGroupEnabled(bindingCheckout, courseMode === "open");
    updateRegistrationPrice();
    setEarlyStartConsentEnabled(courseMode === "open" && courseStartsWithinWithdrawalPeriod(selectedCourse));
  };

  const visibleCourseOptions = courses;
  if (courseSelect) {
    courseSelect.innerHTML = "";
    if (!visibleCourseOptions.length) {
      const option = document.createElement("option");
      option.value = "on-request";
      option.textContent = copy.courseOptionFallback;
      courseSelect.append(option);
      if (courseSelectWrap) courseSelectWrap.hidden = true;
    } else {
      visibleCourseOptions.forEach((course) => {
        const option = document.createElement("option");
        option.value = course.id;
        const label = language === "de" ? course.labelDe : course.labelEn;
        const statusLabel = course.status === "waitlist" ? modeCopy.waitlist.status : "";
        option.textContent = [label, formatDateRange(course), statusLabel].filter(Boolean).join(" · ");
        courseSelect.append(option);
      });
      if (courseSelectWrap) courseSelectWrap.hidden = visibleCourseOptions.length === 1;
    }
  }

  const syncCourseSelection = () => {
    const selected = visibleCourseOptions.find((course) => course.id === courseSelect?.value);
    applyCourseSelection(selected || featuredCourse);
  };
  applyCourseSelection(featuredCourse);
  if (courseSelect) courseSelect.addEventListener("change", syncCourseSelection);

  const courseList = document.querySelector("[data-course-list]");
  if (courseList) {
    courseList.hidden = !courses.length;
    document.querySelectorAll("[data-course-inquiry]").forEach((element) => { element.hidden = courses.length > 0; });
    courses.forEach((course) => {
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.className = "course-option";
      link.href = language === "de" ? "#anmeldung" : "#contact";
      link.dataset.openForm = "course";
      link.dataset.courseId = course.id;

      const details = document.createElement("span");
      const title = document.createElement("strong");
      title.textContent = formatDateRange(course);
      const schedule = document.createElement("span");
      schedule.textContent = [formatSchedule(course), getCourseFormat(course)].filter(Boolean).join(" · ");
      details.append(title, schedule);

      const action = document.createElement("span");
      action.className = "course-option-action";
      action.textContent = modeCopy[course.status].cta;
      link.append(details, action);
      item.append(link);
      courseList.append(item);
    });
  }

  const bookingDialog = document.querySelector("#booking-dialog");
  const bookingLinks = document.querySelectorAll("[data-booking-trigger], [data-booking-direct]");
  bookingLinks.forEach((link) => {
    if (config.introCallUrl) link.href = config.introCallUrl;
  });
  if (bookingDialog && typeof bookingDialog.showModal === "function" && config.introCallEmbedUrl) {
    const content = bookingDialog.querySelector("[data-booking-content]");
    const closeButton = bookingDialog.querySelector("[data-booking-close]");
    let bookingTrigger;
    let bookingFrame;
    let restoreBookingFocus = true;

    bookingDialog.addEventListener("close", () => {
      document.body.classList.remove("booking-open");
      if (restoreBookingFocus) bookingTrigger?.focus({ preventScroll: true });
    });
    closeButton.addEventListener("click", () => bookingDialog.close());
    bookingDialog.querySelector("[data-open-form]").addEventListener("click", () => {
      // The contact handler below supplies its own scroll and focus destination.
      restoreBookingFocus = false;
      bookingDialog.close();
    });
    document.querySelectorAll("[data-booking-trigger]").forEach((trigger) => {
      trigger.addEventListener("click", (event) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        bookingTrigger = trigger;
        restoreBookingFocus = true;
        if (!bookingFrame) {
          bookingFrame = document.createElement("iframe");
          bookingFrame.title = content.dataset.frameTitle;
          bookingFrame.referrerPolicy = "no-referrer";
          bookingFrame.addEventListener("load", () => {
            // This only signals a loaded frame, never a successful booking.
            bookingDialog.querySelector("[data-booking-loading]").hidden = true;
          });
          bookingFrame.src = config.introCallEmbedUrl;
          content.append(bookingFrame);
        }
        bookingDialog.showModal();
        document.body.classList.add("booking-open");
        closeButton.focus({ preventScroll: true });
      });
    });
  }

  document.querySelectorAll("[data-open-form]").forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      const targetName = trigger.dataset.openForm;
      const panel = formPanels.find((element) => element.dataset.formPanel === targetName);
      if (!panel) return;
      event.preventDefault();
      if (targetName === "course" && trigger.dataset.courseId) {
        courseSelect.value = trigger.dataset.courseId;
        syncCourseSelection();
      }
      activateFormPanel(targetName);
      const contactTopic = trigger.dataset.contactTopic;
      if (contactTopic) {
        const topic = panel.querySelector("select[data-contact-topic]");
        if (topic) topic.value = contactTopic;
      }
      const heading = panel.querySelector("h3");
      heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });
      heading.addEventListener("blur", () => heading.removeAttribute("tabindex"), { once: true });
      panel.closest(".contact-form-wrap").scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
    });
  });

  const endpoint = typeof config.formEndpoint === "string" ? config.formEndpoint.trim() : "";
  const forms = Array.from(document.querySelectorAll("[data-async-form]"));
  forms.forEach((form) => {
    if (endpoint) form.action = endpoint;
    const status = form.querySelector("[data-form-status]");
    const submit = form.querySelector("button[type=submit]");
    const submitLabel = submit ? submit.querySelector("[data-submit-label]") : null;
    let submitting = false;

    const setStatus = (message, type) => {
      if (!status) return;
      status.textContent = message;
      status.classList.remove("is-success", "is-error");
      if (type) status.classList.add(`is-${type}`);
    };

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (submitting || !form.reportValidity()) return;
      const formEndpoint = endpoint;
      if (!formEndpoint) {
        setStatus(copy.preview, "error");
        return;
      }
      submitting = true;
      const idleLabel = submitLabel ? submitLabel.textContent : "";
      form.setAttribute("aria-busy", "true");
      if (submit) submit.disabled = true;
      if (submitLabel) submitLabel.textContent = copy.sending;
      setStatus("", "");

      const controller = new AbortController();
      let didTimeout = false;
      let finalLabel = idleLabel;
      const timeoutId = window.setTimeout(() => {
        didTimeout = true;
        controller.abort();
      }, 15000);

      try {
        const payload = new FormData(form);
        payload.set("page", window.location.origin + window.location.pathname);
        const response = await fetch(formEndpoint, {
          method: "POST",
          body: payload,
          headers: { Accept: "application/json" },
          signal: controller.signal
        });
        const result = await response.json();
        if (!response.ok || result?.code !== 200 || result?.status !== "success") throw new Error("Form submission failed");
        form.reset();
        if (courseForm === form) {
          syncCourseSelection();
          finalLabel = modeCopy[courseMode].submitCta;
        }
        setStatus(copy.success, "success");
      } catch (_) {
        finalLabel = courseForm === form && courseMode === "open" ? copy.bindingSubmitCta : copy.retry;
        setStatus(didTimeout ? copy.timeout : copy.error, "error");
      } finally {
        window.clearTimeout(timeoutId);
        submitting = false;
        form.removeAttribute("aria-busy");
        if (submit) submit.disabled = false;
        if (submitLabel) submitLabel.textContent = finalLabel;
      }
    });
  });
  document.documentElement.classList.add("forms-ready");
})();
