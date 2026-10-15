import { berlinFields, berlinInstant, newCourse, sessionTime, validateCourses, mergeCourses, courseLabels, courseEnded } from "/assets/course-model.mjs";

const repository = "/repos/juliasutter/juliasutter.github.io";
const workflow = "site-quality.yml";
const draftKey = "julia-course-draft-v1";
const $ = (id) => document.getElementById(id);
let token = "";
let config;
let courses = [];
let baseCourses = [];
let baseSha = "";
let editing;
let editorInitial = "";
let publishing = false;
let session = 0;
let activeRun = null;
let seatChanges = {};
let seatTimer;
let seatError = "";
let automaticPublication = false;
const hasSeatChanges = () => Object.keys(seatChanges).length > 0;
const changed = () => JSON.stringify(courses) !== JSON.stringify(baseCourses);
const clone = (value) => JSON.parse(JSON.stringify(value));
const status = (message) => { $("status").textContent = message; };
const field = (name) => $("editor-form").elements.namedItem(name);
const local = ["127.0.0.1", "localhost", "[::1]"].includes(window.location.hostname);

function element(tag, text, className) {
  const result = document.createElement(tag);
  if (text !== undefined) result.textContent = text;
  if (className) result.className = className;
  return result;
}
function button(label, callback, className = "quiet") {
  const result = element("button", label, className);
  result.type = "button";
  result.addEventListener("click", callback);
  return result;
}
async function api(path, { authenticated = true, method = "GET", body } = {}) {
  const headers = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2026-03-10" };
  if (authenticated) {
    if (!token) throw new Error("Bitte zuerst mit deinem Zugangsschlüssel anmelden.");
    headers.Authorization = `Bearer ${token}`;
  }
  if (body) headers["Content-Type"] = "application/json";
  const response = await fetch(`https://api.github.com${path}`, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
    cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer", signal: AbortSignal.timeout(20000)
  });
  const rejected = (message) => Object.assign(new Error(message), { rejected: response.status >= 400 && response.status < 500 });
  if (response.status === 401) throw rejected("Der Zugangsschlüssel ist ungültig oder abgelaufen. Bitte in Apple Passwörter ersetzen und erneut anmelden.");
  if (response.status === 403) throw rejected("GitHub hat den Zugriff abgelehnt. Bitte Actions-Schreibrechte, Repository-Auswahl und das GitHub-Anfragelimit prüfen.");
  if (!response.ok) throw rejected(response.status === 404 ? "Die Verwaltung ist auf GitHub noch nicht eingerichtet oder der Schlüssel hat keinen Zugriff auf dieses Repository." : `GitHub konnte die Anfrage nicht ausführen (${response.status}). Bitte erneut versuchen.`);
  return response.status === 204 ? null : response.json();
}
async function loadRemote() {
  const ref = await api(`${repository}/git/ref/heads/main`, { authenticated: false });
  const sha = ref.object?.sha;
  if (!/^[a-f0-9]{40}$/.test(sha || "")) throw new Error("GitHub hat keinen gültigen main-Stand geliefert.");
  const file = await api(`${repository}/contents/assets/course-config.json?ref=${sha}`, { authenticated: false });
  if (file.encoding !== "base64" || typeof file.content !== "string") throw new Error("Die Kursdaten konnten nicht geladen werden.");
  const data = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(file.content.replace(/\s/g, "")), (character) => character.charCodeAt(0))));
  validateCourses(data.courses, data);
  return { sha, data };
}
function saveDraft() {
  try {
    if (changed() || hasSeatChanges() || activeRun) localStorage.setItem(draftKey, JSON.stringify({ baseSha, baseCourses, courses, activeRun, seatChanges }));
    else localStorage.removeItem(draftKey);
    $("draft-status").textContent = changed() ? "Entwurf in diesem Browser gespeichert" : "Alles auf dem aktuellen Stand";
  } catch (_) {
    $("draft-status").textContent = "Dieser Browser kann den Entwurf nicht speichern. Bitte vor dem Schließen veröffentlichen oder die Daten sichern.";
  }
  $("draft-toolbar").hidden = !changed() && !hasSeatChanges() && !activeRun;
  $("review").disabled = (!changed() && !activeRun) || publishing || hasSeatChanges();
  $("discard").disabled = (!changed() && !hasSeatChanges()) || publishing || Boolean(activeRun);
}
function restoreDraft() {
  try {
    const draft = JSON.parse(localStorage.getItem(draftKey) || "null");
    if (!draft) return;
    validateCourses(draft.courses, config);
    validateCourses(draft.baseCourses, config);
    if (typeof draft.baseSha !== "string") throw new Error("Invalid draft");
    courses = draft.courses;
    baseCourses = draft.baseCourses;
    baseSha = draft.baseSha;
    seatChanges = {};
    for (const [id, change] of Object.entries(draft.seatChanges || {})) {
      const course = courses.find((entry) => entry.id === id);
      if (course && baseCourses.some((entry) => entry.id === id) && Number.isInteger(change.from) && change.from >= 0 && change.from <= 999 && change.value === course.remainingPlaces) seatChanges[id] = change;
    }
    activeRun = draft.activeRun && (Number.isSafeInteger(draft.activeRun.id) || /^[a-f0-9-]{36}$/.test(draft.activeRun.requestId || "")) && /^[a-f0-9]{64}$/.test(draft.activeRun.version || "") ? draft.activeRun : null;
    if (activeRun) {
      validateCourses(activeRun.courses, config);
    }
    if (activeRun?.kind === "seats") {
      if (!activeRun.seats || Object.entries(activeRun.seats).some(([id, change]) => !Number.isInteger(change.from) || change.from < 0 || change.from > 999 || change.value !== activeRun.courses.find((course) => course.id === id)?.remainingPlaces)) activeRun = null;
    }
    status("Dein lokaler Entwurf wurde wiederhergestellt. Vor dem Veröffentlichen wird der Stand auf GitHub abgeglichen.");
  } catch (_) { status("Ein gespeicherter Entwurf konnte nicht wiederhergestellt werden. Die veröffentlichten Kurse wurden geladen."); }
}
function courseStarted(course) {
  return new Date(berlinInstant(course.dates[0], sessionTime(course, course.dates[0], config).startTime)) <= new Date();
}
function availability(course, language = "de") {
  if (course.archived) return language === "de" ? "Archiviert" : "Archived";
  if (course.status === "closed") return language === "de" ? "Ausgeblendet" : "Hidden";
  if (courseEnded(course, config)) return language === "de" ? "Abgeschlossen" : "Completed";
  if (courseStarted(course)) return language === "de" ? "Läuft gerade" : "In progress";
  if (course.registrationDeadline && new Date(course.registrationDeadline) <= new Date()) return language === "de" ? "Anmeldung geschlossen" : "Registration closed";
  if (course.remainingPlaces === 0) return language === "de" ? "Ausgebucht" : "Fully booked";
  if (course.status === "waitlist") return language === "de" ? "Warteliste" : "Waitlist";
  if (course.remainingPlaces > 3) return language === "de" ? "Freie Plätze" : "Places available";
  return language === "de" ? `Noch ${course.remainingPlaces} ${course.remainingPlaces === 1 ? "Platz" : "Plätze"} frei` : `${course.remainingPlaces} ${course.remainingPlaces === 1 ? "place" : "places"} left`;
}
function dateLabel(date, language = "de") {
  return new Intl.DateTimeFormat(language === "de" ? "de-DE" : "en-GB", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}
function card(course, controls = true, language = "de") {
  const item = element("article", undefined, "card course-card");
  const state = availability(course, language);
  item.append(element("span", state, `badge${course.remainingPlaces === 0 ? " warn" : ""}`), element("h3", language === "de" ? course.labelDe : course.labelEn));
  item.append(element("p", `${dateLabel(course.dates[0], language)} – ${dateLabel(course.dates[5], language)}`));
  item.append(element("p", [course.format === "vor_ort" ? (language === "de" ? "Vor Ort" : "In person") : "Online", course.location].filter(Boolean).join(" · ")));
  const details = element("details");
  details.append(element("summary", controls ? "Termine und Kursdetails" : language === "de" ? "Alle Termine und Uhrzeiten" : "All dates and times"));
  const list = element("ol");
  for (const date of course.dates) {
    const time = sessionTime(course, date, config);
    list.append(element("li", `${dateLabel(date, language)} · ${time.startTime}–${time.endTime}`));
  }
  details.append(list);
  item.append(details);
  const price = course.priceEur ?? config.priceEur;
  const friend = course.friendPriceEur === null ? null : course.friendPriceEur ?? config.friendPriceEur;
  const info = controls ? details : item;
  info.append(element("p", `${price} €${friend !== null && friend < price ? ` · ${language === "de" ? "Freund:innen" : "Friends"}: ${friend} €` : ""}`));
  if (course.registrationDeadline) {
    const deadline = berlinFields(course.registrationDeadline);
    info.append(element("p", `${language === "de" ? "Anmeldung bis" : "Register by"} ${dateLabel(deadline.date, language)}, ${deadline.time} (${language === "de" ? "Deutsche Zeit" : "Berlin time"})`));
  }
  if (controls) {
    item.dataset.courseId = course.id;
    if (!courseEnded(course, config) && !course.archived) {
      const stepper = element("div", undefined, "seat-stepper");
      const count = element("div");
      count.append(element("strong", String(course.remainingPlaces)), element("span", course.capacity ? ` von ${course.capacity} Plätzen frei` : " Plätze frei"));
      const minus = button("−", () => adjustSeats(course.id, -1));
      const plus = button("+", () => adjustSeats(course.id, 1));
      for (const [control, direction, label] of [[minus, -1, "Einen Platz weniger"], [plus, 1, "Einen Platz mehr"]]) {
        control.setAttribute("aria-label", `${label} · ${course.labelDe}`);
        control.dataset.seatDirection = direction;
        control.disabled = (publishing && !automaticPublication) || (direction < 0 ? course.remainingPlaces === 0 : course.remainingPlaces >= (course.capacity ?? 999));
      }
      stepper.append(minus, count, plus);
      item.append(stepper);
    }
    const actions = element("div", undefined, "actions");
    const edit = button("Bearbeiten", () => openEditor(course));
    edit.disabled = publishing && !automaticPublication;
    actions.append(edit);
    item.append(actions);
  }
  return item;
}
function render() {
  const focused = document.activeElement;
  const focusId = focused.closest("[data-course-id]")?.dataset.courseId;
  const direction = focused.dataset.seatDirection;
  $("course-list").replaceChildren();
  $("past-list").replaceChildren();
  for (const course of [...courses].sort((a, b) => a.dates[0].localeCompare(b.dates[0]))) {
    $(course.archived || courseEnded(course, config) ? "past-list" : "course-list").append(card(course));
  }
  if (!$("course-list").children.length) $("course-list").append(element("p", "Hier ist Platz für deinen nächsten Kurs."));
  $("past-section").hidden = !$("past-list").children.length;
  $("archive-title").textContent = `Abgeschlossene Kurse (${ $("past-list").children.length })`;
  saveDraft();
  if (focusId && direction) Array.from($("workspace").querySelectorAll("[data-course-id]")).find((item) => item.dataset.courseId === focusId)?.querySelector(`[data-seat-direction="${direction}"]`)?.focus({ preventScroll: true });
}
function editorSnapshot() { return JSON.stringify(Array.from(new FormData($("editor-form")).entries())); }
function updateEditorHints() {
  const date = field("date-0").value;
  const time = field("startTime").value;
  if (date && time) {
    const names = courseLabels(date, time);
    for (const name of ["labelDe", "labelEn"]) field(name).placeholder = names[name];
  }
  $("schedule-summary").textContent = `6 Termine bis ${dateLabel(field("date-5").value)}${editing.customDates ? " · mit individuellen Terminen" : " · jede Woche"}`;
  $("defaults-summary").textContent = `Anmeldung bis ${dateLabel(field("deadlineDate").value)}, ${field("deadlineTime").value} Uhr · ${field("priceEur").value} €${field("friendPriceEur").value ? ` / ${field("friendPriceEur").value} € mit Freund:in` : ""}`;
}
function updateFormat() {
  const inPerson = field("format").value === "vor_ort";
  $("location-field").hidden = !inPerson;
  field("location").required = inPerson;
  field("location").disabled = !inPerson;
}
function openEditor(course, isNew = false) {
  if (publishing && !automaticPublication) return;
  const generated = newCourse(course.dates[0], config);
  editing = { course: clone(course), isNew, customDates: course.dates.some((date, index) => date !== generated.dates[index]), customDeadline: Boolean(course.registrationDeadline) && new Date(course.registrationDeadline).getTime() !== new Date(generated.registrationDeadline).getTime() };
  editing.customTime = !isNew;
  const form = $("editor-form");
  form.reset();
  $("extra-settings").open = false;
  $("session-settings").open = false;
  $("editor-error").textContent = "";
  $("editor-title").textContent = isNew ? "Neuer Kurs" : "Kurs bearbeiten";
  for (const name of ["labelDe", "labelEn", "status", "format", "location", "remainingPlaces"]) field(name).value = course[name] ?? config[name] ?? "";
  for (const name of ["startTime", "endTime"]) field(name).value = sessionTime({ ...course, sessionTimes: undefined }, course.dates[0], config)[name];
  field("capacity").value = course.capacity ?? Math.max(7, course.remainingPlaces);
  field("remainingPlaces").max = field("capacity").value;
  field("remainingPlaces").disabled = Boolean(seatChanges[course.id] || activeRun?.kind === "seats" && activeRun.seats[course.id]);
  if (isNew) { field("labelDe").value = ""; field("labelEn").value = ""; }
  field("priceEur").value = course.priceEur ?? config.priceEur;
  field("friendPriceEur").value = course.friendPriceEur === null ? "" : course.friendPriceEur ?? config.friendPriceEur;
  const deadline = berlinFields(course.registrationDeadline || generated.registrationDeadline);
  field("deadlineDate").value = deadline.date;
  field("deadlineTime").value = deadline.time;
  field("date-0").value = course.dates[0];
  $("dates").replaceChildren();
  course.dates.forEach((date, index) => {
    const row = element("div", undefined, "date-row");
    if (index === 0) row.append(element("p", "Termin 1 · Uhrzeit anpassen"));
    else {
      const input = element("input"); input.name = `date-${index}`; input.id = input.name; input.type = "date"; input.value = date; input.required = true;
      const label = element("label", `Termin ${index + 1}`); label.htmlFor = input.id;
      const group = element("div"); group.append(label, input); row.append(group);
      input.addEventListener("input", () => { editing.customDates = true; if (input.value) updateEditorHints(); });
    }
    const times = element("details"); times.open = Boolean(course.sessionTimes?.[date]);
    times.append(element("summary", "Andere Uhrzeit"));
    const fields = element("div", undefined, "fields");
    for (const [kind, label] of [["start", "Beginn (optional)"], ["end", "Ende (optional)"]]) {
      const group = element("div");
      const input = element("input"); input.name = `${kind}-${index}`; input.id = input.name; input.type = "time"; input.value = course.sessionTimes?.[date]?.[`${kind}Time`] || "";
      const caption = element("label", label); caption.htmlFor = input.id;
      group.append(caption, input); fields.append(group);
    }
    times.append(fields); row.append(times); $("dates").append(row);
  });
  updateFormat(); updateEditorHints();
  editorInitial = editorSnapshot();
  $("editor").showModal();
  field("date-0").focus();
}
field("format").addEventListener("change", updateFormat);
field("date-0").addEventListener("input", () => {
  if (!field("date-0").value) return;
  const generated = newCourse(field("date-0").value, config);
  if (!editing.customTime) {
    field("startTime").value = generated.startTime;
    field("endTime").value = generated.endTime;
  }
  if (!editing.customDates) generated.dates.slice(1).forEach((value, index) => { field(`date-${index + 1}`).value = value; });
  if (!editing.customDeadline) {
    const deadline = berlinFields(generated.registrationDeadline);
    field("deadlineDate").value = deadline.date; field("deadlineTime").value = deadline.time;
  }
  updateEditorHints();
});
for (const name of ["deadlineDate", "deadlineTime", "priceEur", "friendPriceEur", "startTime", "endTime"]) field(name).addEventListener("input", () => {
  if (name === "startTime" || name === "endTime") editing.customTime = true;
  if (name.startsWith("deadline")) editing.customDeadline = true;
  if (field("deadlineDate").value) updateEditorHints();
});
field("capacity").addEventListener("input", () => {
  const before = field("remainingPlaces").max;
  if (editing.isNew && field("remainingPlaces").value === before) field("remainingPlaces").value = field("capacity").value;
  field("remainingPlaces").max = field("capacity").value;
});
// Reveal invalid optional settings before native validation focuses the field.
$("editor-form").addEventListener("invalid", (event) => {
  let parent = event.target.parentElement;
  while (parent) { if (parent.tagName === "DETAILS") parent.open = true; parent = parent.parentElement; }
}, true);
function closeEditor() {
  if (editorSnapshot() !== editorInitial && !window.confirm("Die Änderungen in diesem Fenster verwerfen?")) return;
  $("editor").close();
}
$("editor").addEventListener("cancel", (event) => { event.preventDefault(); closeEditor(); });
$("editor-form").addEventListener("submit", (event) => {
  event.preventDefault();
  try {
    const value = { ...editing.course };
    for (const name of ["status", "format", "startTime", "endTime"]) value[name] = field(name).value.trim();
    const names = courseLabels(field("date-0").value, value.startTime);
    for (const name of ["labelDe", "labelEn"]) value[name] = field(name).value.trim() || names[name];
    value.remainingPlaces = Number(field("remainingPlaces").value);
    value.priceEur = Number(field("priceEur").value);
    value.friendPriceEur = field("friendPriceEur").value === "" ? null : Number(field("friendPriceEur").value);
    value.capacity = Number(field("capacity").value);
    if (value.format === "vor_ort" && field("location").value.trim()) value.location = field("location").value.trim(); else delete value.location;
    value.registrationDeadline = berlinInstant(field("deadlineDate").value, field("deadlineTime").value);
    value.dates = [];
    value.sessionTimes = {};
    for (let index = 0; index < 6; index += 1) {
      const date = field(`date-${index}`).value;
      value.dates.push(date);
      const startTime = field(`start-${index}`).value;
      const endTime = field(`end-${index}`).value;
      if (startTime || endTime) value.sessionTimes[date] = { startTime: startTime || value.startTime, endTime: endTime || value.endTime };
    }
    value.dates.sort();
    if (!Object.keys(value.sessionTimes).length) delete value.sessionTimes;
    const next = editing.isNew ? [...courses, value] : courses.map((course) => course.id === value.id ? value : course);
    validateCourses(next, config);
    // A place update already in flight must retain the latest count from the overview.
    if (field("remainingPlaces").disabled) value.remainingPlaces = courses.find((course) => course.id === value.id).remainingPlaces;
    validateCourses(next, config);
    courses = next;
    $("editor").close();
    render();
    status("Der Kurs ist im lokalen Entwurf gespeichert.");
  } catch (error) { $("editor-error").textContent = error.message; }
});
$("weekly").addEventListener("click", () => {
  const date = field("date-0").value;
  const hasOverrides = Array.from({ length: 6 }, (_, index) => field(`start-${index}`).value || field(`end-${index}`).value).some(Boolean);
  if (!date || ((editing.customDates || hasOverrides) && !window.confirm("Die Termine 2 bis 6 wöchentlich neu setzen und ihre abweichenden Uhrzeiten leeren?"))) return;
  const generated = newCourse(date, config);
  generated.dates.forEach((value, index) => { field(`date-${index}`).value = value; field(`start-${index}`).value = ""; field(`end-${index}`).value = ""; });
  editing.customDates = false;
  updateEditorHints();
});
function preview() {
  const language = $("preview-language").value;
  const visible = courses.filter((course) => !course.archived && course.status !== "closed" && !courseStarted(course));
  $("public-preview").replaceChildren(...visible.map((course) => card(course, false, language)));
  if (!visible.length) $("public-preview").append(element("p", language === "de" ? "Keine zukünftigen Kurse sichtbar. Die Website zeigt eine unverbindliche Kursanfrage." : "No upcoming courses. Visitors can request a course place."));
}
function changeSummary() {
  const list = element("ul");
  for (const course of courses) {
    const previous = baseCourses.find((entry) => entry.id === course.id);
    if (JSON.stringify(previous) !== JSON.stringify(course)) list.append(element("li", `${previous ? "Geändert" : "Neu"}: ${course.labelDe}${previous ? ` · Plätze ${previous.remainingPlaces} → ${course.remainingPlaces}` : ""}`));
  }
  for (const course of baseCourses.filter((entry) => !courses.some((value) => value.id === entry.id))) list.append(element("li", `Gelöscht: ${course.labelDe}`));
  $("change-summary").replaceChildren(list);
}
$("review").addEventListener("click", () => {
  changeSummary();
  preview();
  $("publish-status").textContent = token ? "" : "Lokale Vorschau: Zum Veröffentlichen bitte mit dem GitHub-Schlüssel anmelden.";
  $("publish").disabled = !token || publishing;
  $("review-dialog").showModal();
});
$("preview-language").addEventListener("change", preview);

async function versionOf(data) {
  const bytes = new TextEncoder().encode(JSON.stringify(data));
  return Array.from(new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", bytes)), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
function seatStatus(message) {
  $("seat-status").textContent = message;
  $("retry-seats").hidden = !seatError || !token;
}
function publicationStatus(message) {
  $("publish-status").textContent = message;
  if (automaticPublication) seatStatus(message);
}
function scheduleSeats() {
  window.clearTimeout(seatTimer);
  if (token && !publishing && !seatError && (hasSeatChanges() || activeRun?.kind === "seats")) seatTimer = window.setTimeout(() => publishChanges(true), 800);
}
function adjustSeats(id, delta) {
  if (publishing && !automaticPublication) return;
  const course = courses.find((entry) => entry.id === id);
  const value = course.remainingPlaces + delta;
  if (value < 0 || value > (course.capacity ?? 999)) return;
  course.remainingPlaces = value;
  const base = baseCourses.find((entry) => entry.id === id);
  if (token && base) {
    seatChanges[id] = { from: seatChanges[id]?.from ?? base.remainingPlaces, value };
    if (!publishing && !activeRun && value === base.remainingPlaces) delete seatChanges[id];
    seatError = "";
    seatStatus(hasSeatChanges() ? (publishing ? "Gespeichert · folgt nach der laufenden Veröffentlichung …" : "Gespeichert · wird automatisch veröffentlicht …") : "Alles auf dem aktuellen Stand");
    scheduleSeats();
  } else {
    seatStatus(token ? "Im Kursentwurf gespeichert · gemeinsam mit dem neuen Kurs veröffentlichen." : "Lokal gespeichert · in dieser Vorschau wird nichts veröffentlicht.");
  }
  render();
}
$("retry-seats").addEventListener("click", () => { seatError = ""; seatStatus("Die Platzänderungen werden erneut abgeglichen …"); scheduleSeats(); });
function lockPublishing(locked, automatic = false) {
  publishing = locked;
  automaticPublication = locked && automatic;
  $("publish").disabled = locked || !token;
  $("add-course").disabled = locked && !automatic;
  render();
}
async function monitorRun(run, ownSession) {
  while (ownSession === session && token) {
    const current = await api(`${repository}/actions/runs/${run.id}`);
    if (ownSession !== session) return false;
    if (current.status === "completed") {
      if (current.conclusion !== "success") {
        activeRun = null;
        throw new Error("Prüfung oder Veröffentlichung fehlgeschlagen. Deine Änderungen bleiben gespeichert. Bitte den GitHub-Status prüfen und erneut versuchen.");
      }
      publicationStatus("Deployment erfolgreich. Die ausgelieferte Kursversion wird geprüft …");
      const publicVersion = await fetch(`/assets/course-version.json?v=${run.version}`, { cache: "no-store", signal: AbortSignal.timeout(10000) }).then((response) => response.ok ? response.json() : null);
      if (ownSession !== session) return false;
      if (publicVersion?.version !== run.version) throw new Error("GitHub hat veröffentlicht; die erwartete Kursversion ist hier noch nicht bestätigt. Deine Änderungen bleiben erhalten. Bitte später den Status erneut prüfen.");
      return true;
    }
    publicationStatus(current.status === "queued" ? "Veröffentlichung wartet auf GitHub …" : "Gespeichert · Prüfung und Veröffentlichung laufen im Hintergrund. Das dauert einige Minuten.");
    await new Promise((resolve) => window.setTimeout(resolve, 5000));
  }
  return false;
}
async function findRun(run, ownSession) {
  for (let attempt = 0; !run.id && attempt < 12 && ownSession === session; attempt += 1) {
    const result = await api(`${repository}/actions/workflows/${workflow}/runs?event=workflow_dispatch&per_page=30`);
    run.id = result.workflow_runs?.find((entry) => entry.display_title === `Kurse · ${run.requestId}`)?.id;
    if (!run.id) await new Promise((resolve) => window.setTimeout(resolve, 2500));
  }
  if (!Number.isSafeInteger(run.id)) throw new Error("Der Auftrag wurde an GitHub übergeben, sein Status ist noch unklar. Bitte den Status erneut prüfen; es wird kein zweiter Auftrag gestartet.");
}
async function publishChanges(automatic = false) {
  if (publishing || !token || (automatic ? !hasSeatChanges() && activeRun?.kind !== "seats" : !changed() && !activeRun)) return;
  const ownSession = session;
  lockPublishing(true, automatic);
  try {
    let run = activeRun;
    if (!run) {
      publicationStatus("Gespeichert · der aktuelle Stand wird abgeglichen …");
      const seats = automatic ? clone(seatChanges) : null;
      const before = clone(baseCourses);
      const draft = automatic ? before.map((course) => seats[course.id] ? { ...course, remainingPlaces: seats[course.id].value } : course) : clone(courses);
      const remote = await loadRemote();
      if (ownSession !== session) return;
      const merged = mergeCourses(before, draft, remote.data.courses);
      validateCourses(merged, remote.data);
      const version = await versionOf({ ...remote.data, courses: merged });
      if (ownSession !== session) return;
      if (!automatic) {
        courses = clone(merged);
        baseCourses = clone(remote.data.courses);
        config = remote.data;
        baseSha = remote.sha;
      }
      if (new TextEncoder().encode(JSON.stringify(merged)).byteLength > 60000) throw new Error("Die Kursliste ist zu groß für eine Veröffentlichung. Bitte Unterstützung bei der Einrichtung anfragen.");
      run = { kind: automatic ? "seats" : "draft", version, requestId: globalThis.crypto.randomUUID(), courses: merged, seats };
      // Persist the request identity before dispatch: an uncertain response must never cause a duplicate dispatch.
      activeRun = run;
      saveDraft();
      try {
        const response = await api(`${repository}/actions/workflows/${workflow}/dispatches`, {
          method: "POST", body: { ref: "main", inputs: { courses: JSON.stringify(merged), expected_head: remote.sha, request_id: run.requestId } }
        });
        if (ownSession !== session) return;
        run.id = response?.workflow_run_id;
      } catch (error) {
        // Definite rejections did not create a run; ambiguous network errors retain its request identity.
        if (error.rejected) activeRun = null;
        throw error;
      }
    }
    if (!run.id) await findRun(run, ownSession);
    if (ownSession !== session) return;
    saveDraft();
    $("workflow-link").href = `https://github.com/juliasutter/juliasutter.github.io/actions/runs/${run.id}`;
    $("workflow-link").hidden = false;
    $("seat-workflow-link").href = $("workflow-link").href;
    $("seat-workflow-link").hidden = !automatic;
    if (!await monitorRun(run, ownSession)) return;
    if (run.kind === "seats") {
      // Only acknowledge the published seat snapshot. Later clicks and other drafts stay untouched.
      for (const [id, change] of Object.entries(run.seats)) {
        const base = baseCourses.find((course) => course.id === id);
        if (base) base.remainingPlaces = change.value;
        if (seatChanges[id]?.value === change.value) delete seatChanges[id];
        else if (seatChanges[id]) seatChanges[id].from = change.value;
      }
      seatStatus(hasSeatChanges() ? "Plätze veröffentlicht · weitere Änderungen folgen …" : "Plätze veröffentlicht · auf der Website bestätigt.");
    } else {
      // A resumed run acknowledges only its snapshot; edits made since dispatch stay local.
      baseCourses = clone(run.courses);
      publicationStatus("Veröffentlicht. Die neuen Kursdaten sind auf der Website bestätigt.");
      status("Deine Kursänderungen sind veröffentlicht.");
    }
    activeRun = null;
  } catch (error) {
    if (ownSession === session) {
      if (automatic) { seatError = error.message; seatStatus(`Noch nicht veröffentlicht: ${error.message}`); }
      else publicationStatus(error.message);
    }
  } finally {
    if (ownSession === session) {
      lockPublishing(false);
      $("publish").disabled = !token || (!changed() && !activeRun);
      scheduleSeats();
    }
  }
}
$("publish").addEventListener("click", () => publishChanges());
async function enter(data, sha) {
  config = data;
  courses = clone(data.courses);
  baseCourses = clone(courses);
  baseSha = sha;
  restoreDraft();
  $("login-panel").hidden = true;
  $("workspace").hidden = false;
  $("logout").hidden = false;
  seatError = "";
  $("seats-hint").textContent = token ? "Platzänderungen werden automatisch veröffentlicht. Neue Kurse und weitere Änderungen prüfst du vorher in der Vorschau." : "Lokale Vorschau: Platzänderungen werden sofort im Browser gespeichert. Hier wird nichts veröffentlicht.";
  render();
  scheduleSeats();
  window.scrollTo({ top: 0, behavior: "instant" });
}
$("login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const control = $("login-form").querySelector("button");
  control.disabled = true;
  const ownSession = ++session;
  token = $("token").value.trim();
  try {
    status("Zugang und Kursdaten werden geprüft …");
    const user = await api("/user");
    if (user.login?.toLowerCase() !== $("username").value.trim().toLowerCase()) throw new Error("Benutzername und Zugangsschlüssel gehören nicht zum selben GitHub-Konto.");
    await api(`${repository}/actions/workflows/${workflow}`);
    const remote = await loadRemote();
    if (ownSession !== session) return;
    $("token").value = "";
    status("");
    await enter(remote.data, remote.sha);
  } catch (error) { token = ""; $("token").value = ""; status(error.message); }
  finally { control.disabled = false; }
});
$("logout").addEventListener("click", () => {
  session += 1;
  window.clearTimeout(seatTimer);
  token = "";
  publishing = false;
  for (const dialog of document.querySelectorAll("dialog[open]")) dialog.close();
  $("workspace").hidden = true;
  $("login-panel").hidden = false;
  $("logout").hidden = true;
  $("token").value = "";
  status("Abgemeldet. Dein lokaler Entwurf bleibt in diesem Browser gespeichert.");
});
$("discard").addEventListener("click", async () => {
  if (publishing || activeRun) return;
  if (!window.confirm("Den gesamten lokalen Entwurf verwerfen und die aktuellen Kurse neu laden?")) return;
  window.clearTimeout(seatTimer);
  const ownSession = session;
  lockPublishing(true);
  try {
    const remote = token ? await loadRemote() : { data: await fetch("/assets/course-config.json").then((response) => response.json()), sha: "local" };
    if (ownSession !== session) return;
    config = remote.data;
    validateCourses(config.courses, config);
    courses = clone(config.courses);
    baseCourses = clone(courses);
    baseSha = remote.sha;
    activeRun = null;
    seatChanges = {}; seatError = ""; window.clearTimeout(seatTimer); seatStatus("");
    render();
    status("Der Entwurf wurde verworfen. Die aktuellen Kursdaten sind geladen.");
  } catch (error) { if (ownSession === session) status(error.message); }
  finally { if (ownSession === session) { lockPublishing(false); scheduleSeats(); } }
});
$("add-course").addEventListener("click", () => {
  const date = new Date(); date.setDate(date.getDate() + 7);
  openEditor(newCourse(berlinFields(date).date, config), true);
});
for (const control of document.querySelectorAll("[data-close]")) control.addEventListener("click", () => {
  if (control.dataset.close === "editor") closeEditor(); else $(control.dataset.close).close();
});
window.addEventListener("beforeunload", (event) => {
  if ($("editor").open && editorSnapshot() !== editorInitial) { event.preventDefault(); event.returnValue = ""; }
});
window.addEventListener("pagehide", () => { session += 1; window.clearTimeout(seatTimer); token = ""; $("token").value = ""; });
window.setInterval(() => { if (config && !$("workspace").hidden && !$("editor").open) render(); }, 60000);
if (local) {
  $("local-preview").hidden = false;
  $("local-preview").addEventListener("click", async () => {
    try {
      const data = await fetch("/assets/course-config.json", { cache: "no-store" }).then((response) => response.json());
      validateCourses(data.courses, data);
      status("Lokale Vorschau: Änderungen bleiben als Entwurf in diesem Browser.");
      await enter(data, "local");
    } catch (error) { status(error.message); }
  });
}
