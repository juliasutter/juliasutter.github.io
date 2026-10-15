import { berlinFields, berlinInstant, newCourse, sessionTime, validateCourses, mergeCourses, courseLabels, courseEnded } from "/assets/course-model.mjs";

const repository = "/repos/juliasutter/juliasutter.github.io";
const workflow = "site-quality.yml";
const runKey = "julia-course-publication-v1";
const $ = (id) => document.getElementById(id);
let token = "";
let config;
let courses = [];
let baseCourses = [];
let editing;
let editorInitial = "";
let publishing = false;
let preparing = false;
let resuming = false;
let session = 0;
let activeRun = null;
let saveTimer;
let saveError = "";
const expandedSchedules = new Set();
const changed = () => JSON.stringify(courses) !== JSON.stringify(baseCourses);
const locked = () => preparing || resuming;
const hasUnsentChanges = () => token && JSON.stringify(courses) !== JSON.stringify(activeRun?.courses || baseCourses);
const clone = (value) => JSON.parse(JSON.stringify(value));
const courseCapacity = (course) => course.capacity ?? Math.max(7, course.remainingPlaces);
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
function card(course) {
  const item = element("article", undefined, "card course-card");
  item.append(element("span", availability(course), `badge${course.remainingPlaces === 0 ? " warn" : ""}`), element("h3", course.labelDe));
  const dates = course.dates;
  const times = dates.map((date) => sessionTime(course, date, config));
  const weekly = dates.every((date, index) => index === 0 || new Date(`${date}T12:00:00Z`) - new Date(`${dates[index - 1]}T12:00:00Z`) === 7 * 86400000);
  const sameTimes = times.every((time) => time.startTime === times[0].startTime && time.endTime === times[0].endTime);
  const dateLine = element("div", undefined, "course-schedule-line");
  dateLine.append(element("span", `${dateLabel(dates[0])} – ${dateLabel(dates.at(-1))}`));
  item.append(dateLine);
  if (weekly && sameTimes) {
    const weekday = new Intl.DateTimeFormat("de-DE", { weekday: "long", timeZone: "UTC" }).format(new Date(`${dates[0]}T12:00:00Z`)).toLocaleLowerCase("de-DE");
    item.append(element("p", `${weekday}s ${times[0].startTime}–${times[0].endTime} Uhr`));
  } else {
    const list = element("ol", undefined, "individual-schedule");
    list.id = `schedule-${course.id}`;
    list.hidden = !expandedSchedules.has(course.id);
    for (const [index, date] of dates.entries()) list.append(element("li", `${dateLabel(date)} · ${times[index].startTime}–${times[index].endTime} Uhr`));
    const toggle = button("Individuelle Termine anzeigen", () => {
      list.hidden = !list.hidden;
      if (list.hidden) expandedSchedules.delete(course.id); else expandedSchedules.add(course.id);
      toggle.textContent = list.hidden ? "Individuelle Termine anzeigen" : "Individuelle Termine ausblenden";
      toggle.setAttribute("aria-expanded", String(!list.hidden));
    }, "text-button");
    if (!list.hidden) toggle.textContent = "Individuelle Termine ausblenden";
    toggle.setAttribute("aria-expanded", String(!list.hidden));
    toggle.setAttribute("aria-controls", list.id);
    dateLine.append(toggle);
    item.append(list);
  }
  item.append(element("p", [course.format === "vor_ort" ? "Vor Ort" : "Online", course.location].filter(Boolean).join(" · ")));
  item.dataset.courseId = course.id;
  if (!courseEnded(course, config) && !course.archived) {
    const stepper = element("div", undefined, "seat-stepper");
    const count = element("div");
    count.append(element("strong", String(course.remainingPlaces)), element("span", ` von ${courseCapacity(course)} Plätzen frei`));
    const minus = button("−", () => adjustSeats(course.id, -1));
    const plus = button("+", () => adjustSeats(course.id, 1));
    for (const [control, direction, label] of [[minus, -1, "Einen Platz weniger"], [plus, 1, "Einen Platz mehr"]]) {
      control.setAttribute("aria-label", `${label} · ${course.labelDe}`);
      control.dataset.seatDirection = direction;
      control.disabled = locked() || (direction < 0 ? course.remainingPlaces === 0 : course.remainingPlaces >= courseCapacity(course));
    }
    stepper.append(minus, count, plus);
    item.append(stepper);
  }
  const edit = button("Bearbeiten", () => openEditor(course), "quiet course-edit");
  edit.disabled = locked();
  item.append(edit);
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
  $("add-course").disabled = locked();
  $("save-course").disabled = locked();
  if (focusId && direction) Array.from($("workspace").querySelectorAll("[data-course-id]")).find((item) => item.dataset.courseId === focusId)?.querySelector(`[data-seat-direction="${direction}"]`)?.focus({ preventScroll: true });
}
function editorSnapshot() { return JSON.stringify(Array.from(new FormData($("editor-form")).entries())); }
function setSection(id, visible) {
  $(id).hidden = !visible;
  const control = $(id === "session-settings" ? "edit-sessions" : "edit-settings");
  control.setAttribute("aria-expanded", String(visible));
}
function showEnglishName() {
  $("english-name-field").hidden = editing.autoName;
}
function updateEditorHints() {
  const dates = Array.from({ length: 6 }, (_, index) => field(`date-${index}`).value);
  const start = field("startTime").value;
  const end = field("endTime").value;
  if (dates[0] && start && editing.autoName) {
    const names = courseLabels(dates[0], start);
    field("labelDe").value = names.labelDe;
    if (editing.autoEnglishName) field("labelEn").value = names.labelEn;
  }
  if (dates.every(Boolean)) {
    const weekdays = dates.map((date) => new Date(`${date}T12:00:00Z`).getUTCDay());
    const days = new Set(weekdays).size === 1 ? ["Sonntage", "Montage", "Dienstage", "Mittwoche", "Donnerstage", "Freitage", "Samstage"][weekdays[0]] : "Termine";
    const times = dates.map((_, index) => `${field(`start-${index}`).value || start}–${field(`end-${index}`).value || end}`);
    const time = new Set(times).size === 1 ? `jeweils ${times[0]} Uhr` : "mit unterschiedlichen Uhrzeiten";
    $("schedule-summary").textContent = `6 ${days} vom ${dateLabel(dates[0])} bis ${dateLabel(dates[5])}, ${time}`;
  } else $("schedule-summary").textContent = "Bitte alle sechs Termine vollständig angeben.";
  $("defaults-summary").textContent = field("deadlineDate").value ? `Anmeldung bis ${dateLabel(field("deadlineDate").value)}, ${field("deadlineTime").value} Uhr · ${field("priceEur").value} €${field("friendPriceEur").value ? ` / ${field("friendPriceEur").value} € mit Freund:in` : ""}` : "Anmeldeschluss bitte ergänzen.";
}
for (const [buttonId, sectionId] of [["edit-sessions", "session-settings"], ["edit-settings", "extra-settings"]]) $(buttonId).addEventListener("click", () => setSection(sectionId, $(sectionId).hidden));
field("labelDe").addEventListener("input", () => {
  const date = field("date-0").value;
  const time = field("startTime").value;
  editing.autoName = Boolean(date && time && field("labelDe").value === courseLabels(date, time).labelDe);
  showEnglishName();
  if (editing.autoName) updateEditorHints();
});
field("labelEn").addEventListener("input", () => { editing.autoEnglishName = false; });
function attachDatePicker(input) {
  input.addEventListener("click", () => {
    try { input.showPicker?.(); }
    catch (error) {
      // Native keyboard entry remains available if the browser cannot open its picker here.
      if (!["NotAllowedError", "InvalidStateError", "SecurityError"].includes(error.name)) throw error;
    }
  });
}
for (const input of document.querySelectorAll('input[type="date"]')) attachDatePicker(input);
function updateFormat() {
  const inPerson = field("format").value === "vor_ort";
  $("location-field").hidden = !inPerson;
  field("location").required = inPerson;
  field("location").disabled = !inPerson;
}
function openEditor(course, isNew = false) {
  if (locked()) return;
  const generated = newCourse(course.dates[0], config);
  editing = { course: clone(course), isNew, customDates: course.dates.some((date, index) => date !== generated.dates[index]), customDeadline: Boolean(course.registrationDeadline) && new Date(course.registrationDeadline).getTime() !== new Date(generated.registrationDeadline).getTime() };
  editing.customTime = !isNew;
  const form = $("editor-form");
  form.reset();
  setSection("extra-settings", false);
  setSection("session-settings", false);
  $("editor-error").textContent = "";
  $("editor-title").textContent = isNew ? "Neuer Kurs" : "Kurs bearbeiten";
  for (const name of ["labelDe", "labelEn", "status", "format", "location", "remainingPlaces"]) field(name).value = course[name] ?? config[name] ?? "";
  for (const name of ["startTime", "endTime"]) field(name).value = sessionTime({ ...course, sessionTimes: undefined }, course.dates[0], config)[name];
  field("capacity").value = courseCapacity(course);
  field("remainingPlaces").max = field("capacity").value;
  editing.autoName = isNew || course.labelDe === courseLabels(course.dates[0], field("startTime").value).labelDe;
  editing.autoEnglishName = isNew || course.labelEn === courseLabels(course.dates[0], field("startTime").value).labelEn;
  showEnglishName();
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
      attachDatePicker(input);
      input.addEventListener("input", () => { editing.customDates = true; updateEditorHints(); });
    }
    const times = element("div");
    const fields = element("div", undefined, "fields");
    for (const [kind, label] of [["start", "Beginn (optional)"], ["end", "Ende (optional)"]]) {
      const group = element("div");
      const input = element("input"); input.name = `${kind}-${index}`; input.id = input.name; input.type = "time"; input.value = course.sessionTimes?.[date]?.[`${kind}Time`] || "";
      const caption = element("label", label); caption.htmlFor = input.id;
      input.addEventListener("input", updateEditorHints);
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
  while (parent) { if (["session-settings", "extra-settings"].includes(parent.id)) setSection(parent.id, true); parent = parent.parentElement; }
  if (event.target.id === "label-en") $("english-name-field").hidden = false;
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
    if (locked()) return;
    for (const name of ["labelDe", "labelEn"]) value[name] = field(name).value.trim();
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
    if (!Object.keys(value.sessionTimes).length) delete value.sessionTimes;
    const next = editing.isNew ? [...courses, value] : courses.map((course) => course.id === value.id ? value : course);
    validateCourses(next, config);
    if (!editing.isNew && JSON.stringify(courses.find((course) => course.id === value.id)) !== JSON.stringify(editing.course)) throw new Error("Dieser Kurs wurde inzwischen aktualisiert. Bitte das Fenster schließen und die aktuellen Angaben erneut öffnen.");
    courses = next;
    $("editor").close();
    render();
    requestSave();
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
async function versionOf(data) {
  const bytes = new TextEncoder().encode(JSON.stringify(data));
  return Array.from(new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", bytes)), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
function saveStatus(message) {
  $("save-status").textContent = message;
  $("retry-save").hidden = !saveError || !token;
  $("retry-save").textContent = activeRun ? "Status erneut prüfen" : "Erneut versuchen";
}
// Only the identity of an already submitted request survives a reload, never course drafts or tokens.
function rememberRun(run) {
  if (run) localStorage.setItem(runKey, JSON.stringify({ id: run.id, requestId: run.requestId, version: run.version }));
  else localStorage.removeItem(runKey);
}
function readRun() {
  const value = JSON.parse(localStorage.getItem(runKey) || "null");
  if (!value) return null;
  if (!/^[a-f0-9-]{36}$/.test(value.requestId || "") || !/^[a-f0-9]{64}$/.test(value.version || "") || (value.id !== undefined && !Number.isSafeInteger(value.id))) throw new Error("Der gespeicherte Auftragsstatus ist ungültig. Bitte den letzten Auftrag auf GitHub prüfen.");
  return { id: value.id, requestId: value.requestId, version: value.version };
}
function scheduleSave(delay = 800) {
  window.clearTimeout(saveTimer);
  if (token && !publishing && !saveError && (changed() || activeRun)) saveTimer = window.setTimeout(() => publishChanges(), delay);
}
function requestSave(delay = 0) {
  if (!token) {
    baseCourses = clone(courses);
    saveStatus("In der Testvorschau übernommen. Beim Neuladen werden die ursprünglichen Kurse geladen.");
    return;
  }
  saveError = "";
  saveStatus(publishing ? "Änderung vorgemerkt · wird nach dem laufenden Speichern übertragen …" : "Wird gespeichert …");
  scheduleSave(delay);
}
function adjustSeats(id, delta) {
  if (locked()) return;
  const course = courses.find((entry) => entry.id === id);
  const capacity = courseCapacity(course);
  const value = course.remainingPlaces + delta;
  if (value < 0 || value > capacity) return;
  course.capacity = capacity;
  course.remainingPlaces = value;
  render();
  requestSave(800);
}
$("retry-save").addEventListener("click", () => { saveError = ""; saveStatus("Der Speicherstatus wird geprüft …"); publishChanges(true); });
async function findRun(run, ownSession) {
  for (let attempt = 0; !run.id && attempt < 12 && ownSession === session; attempt += 1) {
    const result = await api(`${repository}/actions/workflows/${workflow}/runs?event=workflow_dispatch&per_page=30`);
    if (ownSession !== session) return;
    run.id = result.workflow_runs?.find((entry) => entry.display_title === `Kurse · ${run.requestId}`)?.id;
    if (!run.id) await new Promise((resolve) => window.setTimeout(resolve, 2500));
  }
  if (!Number.isSafeInteger(run.id)) throw new Error("Der Auftragsstatus ist noch unklar. Bitte auf GitHub nachsehen und den Status erneut prüfen; es wird kein zweiter Auftrag gestartet.");
}
async function monitorRun(run, ownSession) {
  while (ownSession === session && token) {
    const current = await api(`${repository}/actions/runs/${run.id}`);
    if (ownSession !== session) return false;
    if (current.status === "completed") {
      if (current.conclusion !== "success") {
        rememberRun(null);
        activeRun = null;
        resuming = false;
        throw new Error("Prüfung oder Veröffentlichung fehlgeschlagen. Bitte den GitHub-Status prüfen und erneut versuchen. Deine Eingaben bleiben in diesem geöffneten Fenster erhalten.");
      }
      saveStatus("Übertragung abgeschlossen · die Website wird geprüft …");
      const publicVersion = await fetch(`/assets/course-version.json?v=${run.version}`, { cache: "no-store", signal: AbortSignal.timeout(10000) }).then((response) => response.ok ? response.json() : null);
      if (ownSession !== session) return false;
      if (publicVersion?.version === run.version) return { confirmed: true };
      if (resuming) {
        // A successful request can have been superseded while this browser was closed.
        // Resume only from a current GitHub snapshot that is also confirmed on the website.
        const remote = await loadRemote();
        const version = await versionOf(remote.data);
        if (ownSession !== session) return false;
        if (publicVersion?.version === version) return { currentData: remote.data };
      }
      throw new Error("Die gespeicherte Kursversion ist auf der Website noch nicht bestätigt. Bitte später den Status erneut prüfen.");
    }
    saveStatus(current.status === "queued" ? "Speichern wartet auf GitHub …" : "Speichern läuft im Hintergrund. Die Website wird nach der Prüfung aktualisiert.");
    await new Promise((resolve) => window.setTimeout(resolve, 5000));
  }
  return false;
}
async function publishChanges(retry = false) {
  if (publishing || !token || (!changed() && !activeRun && !retry)) return;
  const ownSession = session;
  publishing = true;
  preparing = !activeRun;
  render();
  try {
    let run = activeRun;
    if (!run) {
      saveStatus("Wird gespeichert · der aktuelle Stand wird abgeglichen …");
      const remote = await loadRemote();
      if (ownSession !== session) return;
      const merged = mergeCourses(baseCourses, courses, remote.data.courses);
      validateCourses(merged, remote.data);
      if (new TextEncoder().encode(JSON.stringify(merged)).byteLength > 60000) throw new Error("Die Kursliste ist zu groß für eine Übertragung. Bitte Unterstützung bei der Einrichtung anfragen.");
      const version = await versionOf({ ...remote.data, courses: merged });
      if (ownSession !== session) return;
      courses = clone(merged);
      baseCourses = clone(remote.data.courses);
      config = remote.data;
      run = { version, requestId: globalThis.crypto.randomUUID(), courses: clone(merged) };
      // Persist before dispatch, so a lost response cannot cause a duplicate request after reload.
      rememberRun(run);
      activeRun = run;
      try {
        const response = await api(`${repository}/actions/workflows/${workflow}/dispatches`, {
          method: "POST", body: { ref: "main", inputs: { courses: JSON.stringify(merged), expected_head: remote.sha, request_id: run.requestId } }
        });
        if (ownSession !== session) return;
        run.id = response?.workflow_run_id;
      } catch (error) {
        if (ownSession !== session) return;
        if (error.rejected) { rememberRun(null); activeRun = null; }
        throw error;
      }
    }
    if (!run.id) await findRun(run, ownSession);
    if (ownSession !== session) return;
    rememberRun(run);
    preparing = false;
    render();
    $("workflow-link").href = `https://github.com/juliasutter/juliasutter.github.io/actions/runs/${run.id}`;
    $("workflow-link").hidden = false;
    const result = await monitorRun(run, ownSession);
    if (!result) return;
    if (run.courses) {
      // Acknowledge exactly the sent snapshot; later Save clicks remain queued in courses.
      baseCourses = clone(run.courses);
    } else {
      const data = result.currentData || (await loadRemote()).data;
      if (ownSession !== session) return;
      config = data;
      courses = clone(data.courses);
      baseCourses = clone(courses);
    }
    rememberRun(null);
    activeRun = null;
    resuming = false;
    saveStatus(changed() ? "Gespeichert · weitere Änderungen werden als Nächstes übertragen …" : result.currentData ? "Speichern abgeschlossen · aktueller Website-Stand geladen." : "Gespeichert · auf der Website bestätigt.");
  } catch (error) {
    if (ownSession === session) { saveError = error.message; saveStatus(`Noch nicht abgeschlossen: ${error.message}`); }
  } finally {
    if (ownSession === session) {
      publishing = false;
      preparing = false;
      render();
      scheduleSave();
    }
  }
}
async function enter(data) {
  // The pre-release preview stored course drafts; discard these obsolete snapshots.
  try { localStorage.removeItem("julia-course-draft-v1"); }
  catch (error) { if (error.name !== "SecurityError") throw error; }
  config = data;
  courses = clone(data.courses);
  baseCourses = clone(courses);
  activeRun = token ? readRun() : null;
  resuming = Boolean(activeRun);
  publishing = false;
  preparing = false;
  saveError = "";
  saveStatus(activeRun ? "Der letzte Speicherauftrag wird geprüft …" : "");
  $("workflow-link").hidden = true;
  $("login-panel").hidden = true;
  $("workspace").hidden = false;
  $("logout").hidden = false;
  $("seats-hint").textContent = token ? "Plätze direkt mit −/+ ändern. Weitere Änderungen im Kurs mit „Speichern“ übernehmen." : "Testvorschau ohne Veröffentlichung. Änderungen werden beim Neuladen zurückgesetzt.";
  render();
  scheduleSave(0);
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
    await enter(remote.data);
    status("");
  } catch (error) { if (ownSession === session) { token = ""; $("token").value = ""; status(error.message); } }
  finally { control.disabled = false; }
});
$("logout").addEventListener("click", () => {
  if (hasUnsentChanges() && !window.confirm("Es warten noch Änderungen auf die Übertragung. Trotzdem abmelden und diese Änderungen verwerfen?")) return;
  session += 1;
  window.clearTimeout(saveTimer);
  token = "";
  publishing = false;
  for (const dialog of document.querySelectorAll("dialog[open]")) dialog.close();
  $("workspace").hidden = true;
  $("login-panel").hidden = false;
  $("logout").hidden = true;
  $("token").value = "";
  status("Abgemeldet.");
});
$("add-course").addEventListener("click", () => {
  const date = new Date(); date.setDate(date.getDate() + 7);
  openEditor(newCourse(berlinFields(date).date, config), true);
});
for (const control of document.querySelectorAll("[data-close]")) control.addEventListener("click", closeEditor);
window.addEventListener("beforeunload", (event) => {
  if (hasUnsentChanges() || ($("editor").open && editorSnapshot() !== editorInitial)) { event.preventDefault(); event.returnValue = ""; }
});
window.addEventListener("pagehide", () => { session += 1; window.clearTimeout(saveTimer); token = ""; $("token").value = ""; });
window.setInterval(() => { if (config && !$("workspace").hidden && !$("editor").open) render(); }, 60000);
if (local) {
  $("local-preview").hidden = false;
  $("local-preview").addEventListener("click", async () => {
    try {
      const data = await fetch("/assets/course-config.json", { cache: "no-store" }).then((response) => response.json());
      validateCourses(data.courses, data);
      await enter(data);
      status("");
    } catch (error) { status(error.message); }
  });
}
