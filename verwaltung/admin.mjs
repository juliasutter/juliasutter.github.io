import { berlinFields, berlinInstant, newCourse, sessionTime, validateCourses, mergeCourses } from "/assets/course-model.mjs";

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
  if (response.status === 401) throw new Error("Der Zugangsschlüssel ist ungültig oder abgelaufen. Bitte in Apple Passwörter ersetzen und erneut anmelden.");
  if (response.status === 403) throw new Error("GitHub hat den Zugriff abgelehnt. Bitte Actions-Schreibrechte, Repository-Auswahl und das GitHub-Anfragelimit prüfen.");
  if (!response.ok) throw new Error(response.status === 404 ? "Die Verwaltung ist auf GitHub noch nicht eingerichtet oder der Schlüssel hat keinen Zugriff auf dieses Repository." : `GitHub konnte die Anfrage nicht ausführen (${response.status}). Bitte erneut versuchen.`);
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
    if (changed()) localStorage.setItem(draftKey, JSON.stringify({ baseSha, baseCourses, courses, activeRun }));
    else localStorage.removeItem(draftKey);
    $("draft-status").textContent = changed() ? "Entwurf in diesem Browser gespeichert" : "Alles auf dem aktuellen Stand";
  } catch (_) {
    $("draft-status").textContent = "Dieser Browser kann den Entwurf nicht speichern. Bitte vor dem Schließen veröffentlichen oder die Daten sichern.";
  }
  $("review").disabled = !changed() || publishing;
  $("discard").disabled = !changed() || publishing;
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
    activeRun = draft.activeRun && Number.isSafeInteger(draft.activeRun.id) && /^[a-f0-9]{64}$/.test(draft.activeRun.version || "") ? draft.activeRun : null;
    status("Dein lokaler Entwurf wurde wiederhergestellt. Vor dem Veröffentlichen wird der Stand auf GitHub abgeglichen.");
  } catch (_) { status("Ein gespeicherter Entwurf konnte nicht wiederhergestellt werden. Die veröffentlichten Kurse wurden geladen."); }
}
function courseStarted(course) {
  return new Date(berlinInstant(course.dates[0], sessionTime(course, course.dates[0], config).startTime)) <= new Date();
}
function availability(course, language = "de") {
  if (course.archived) return language === "de" ? "Archiviert" : "Archived";
  if (course.status === "closed") return language === "de" ? "Ausgeblendet" : "Hidden";
  if (courseStarted(course)) return language === "de" ? "Vergangen" : "Past";
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
  details.append(element("summary", language === "de" ? "Alle Termine und Uhrzeiten" : "All dates and times"));
  const list = element("ol");
  for (const date of course.dates) {
    const time = sessionTime(course, date, config);
    list.append(element("li", `${dateLabel(date, language)} · ${time.startTime}–${time.endTime}`));
  }
  details.append(list);
  item.append(details);
  const price = course.priceEur ?? config.priceEur;
  const friend = course.friendPriceEur === null ? null : course.friendPriceEur ?? config.friendPriceEur;
  item.append(element("p", `${price} €${friend !== null && friend < price ? ` · ${language === "de" ? "Freund:innen" : "Friends"}: ${friend} €` : ""}`));
  if (course.registrationDeadline) {
    const deadline = berlinFields(course.registrationDeadline);
    item.append(element("p", `${language === "de" ? "Anmeldung bis" : "Register by"} ${dateLabel(deadline.date, language)}, ${deadline.time} (${language === "de" ? "Berliner Zeit" : "Berlin time"})`));
  }
  if (controls) {
    item.append(element("p", `${course.remainingPlaces}${course.capacity ? ` / ${course.capacity}` : ""} freie Plätze`));
    const actions = element("div", undefined, "actions");
    actions.append(button("Bearbeiten", () => openEditor(course)), button("Duplizieren", () => {
      const copy = { ...clone(course), id: `starter-${globalThis.crypto.randomUUID()}`, labelDe: `${course.labelDe} · Kopie`.slice(0, 120), labelEn: `${course.labelEn} · Copy`.slice(0, 120), archived: false };
      openEditor(copy, true);
    }));
    actions.append(button(course.archived ? "Wiederherstellen" : "Archivieren", () => {
      course.archived = !course.archived;
      render();
    }));
    actions.append(button("Löschen", () => {
      if (!window.confirm(`„${course.labelDe}“ dauerhaft aus diesem Entwurf löschen? Wirksam wird das erst nach dem Veröffentlichen.`)) return;
      courses = courses.filter((entry) => entry.id !== course.id);
      render();
    }, "quiet delete"));
    item.append(actions);
  }
  return item;
}
function render() {
  $("course-list").replaceChildren();
  $("past-list").replaceChildren();
  for (const course of [...courses].sort((a, b) => a.dates[0].localeCompare(b.dates[0]))) {
    $(course.archived || courseStarted(course) ? "past-list" : "course-list").append(card(course));
  }
  if (!$("course-list").children.length) $("course-list").append(element("p", "Hier ist Platz für deinen nächsten Kurs."));
  $("past-section").hidden = !$("past-list").children.length;
  saveDraft();
}
function editorSnapshot() { return JSON.stringify(Array.from(new FormData($("editor-form")).entries())); }
function openEditor(course, isNew = false) {
  if (publishing) return;
  editing = { course: clone(course), isNew };
  const form = $("editor-form");
  form.reset();
  $("editor-error").textContent = "";
  $("editor-title").textContent = isNew ? "Neuen Kurs vorbereiten" : "Kurs bearbeiten";
  for (const name of ["labelDe", "labelEn", "status", "format", "location", "startTime", "endTime", "remainingPlaces", "capacity"]) field(name).value = course[name] ?? config[name] ?? "";
  field("priceEur").value = course.priceEur ?? config.priceEur;
  field("friendPriceEur").value = course.friendPriceEur === null ? "" : course.friendPriceEur ?? config.friendPriceEur;
  const deadline = berlinFields(course.registrationDeadline || berlinInstant(course.dates[0], sessionTime(course, course.dates[0], config).startTime));
  field("deadlineDate").value = deadline.date;
  field("deadlineTime").value = deadline.time;
  $("dates").replaceChildren();
  course.dates.forEach((date, index) => {
    const row = element("div", undefined, "date-row");
    for (const [kind, label, type, value] of [
      ["date", `Termin ${index + 1}`, "date", date],
      ["start", "Beginn (optional)", "time", course.sessionTimes?.[date]?.startTime || ""],
      ["end", "Ende (optional)", "time", course.sessionTimes?.[date]?.endTime || ""]
    ]) {
      const group = element("div");
      const input = element("input");
      input.id = `${kind}-${index}`;
      input.name = `${kind}-${index}`;
      input.type = type;
      input.value = value;
      input.required = kind === "date";
      const caption = element("label", label);
      caption.htmlFor = input.id;
      group.append(caption, input);
      row.append(group);
    }
    $("dates").append(row);
  });
  editorInitial = editorSnapshot();
  $("editor").showModal();
  field("labelDe").focus();
}
function closeEditor() {
  if (editorSnapshot() !== editorInitial && !window.confirm("Die Änderungen in diesem Fenster verwerfen?")) return;
  $("editor").close();
}
$("editor").addEventListener("cancel", (event) => { event.preventDefault(); closeEditor(); });
$("editor-form").addEventListener("submit", (event) => {
  event.preventDefault();
  try {
    const value = { ...editing.course };
    for (const name of ["labelDe", "labelEn", "status", "format", "startTime", "endTime"]) value[name] = field(name).value.trim();
    value.remainingPlaces = Number(field("remainingPlaces").value);
    value.priceEur = Number(field("priceEur").value);
    value.friendPriceEur = field("friendPriceEur").value === "" ? null : Number(field("friendPriceEur").value);
    if (field("capacity").value) value.capacity = Number(field("capacity").value); else delete value.capacity;
    if (field("location").value.trim()) value.location = field("location").value.trim(); else delete value.location;
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
    courses = next;
    $("editor").close();
    render();
    status("Der Kurs ist im lokalen Entwurf gespeichert.");
  } catch (error) { $("editor-error").textContent = error.message; }
});
$("weekly").addEventListener("click", () => {
  const date = field("date-0").value;
  if (!date || !window.confirm("Die Termine 2 bis 6 wöchentlich neu setzen und ihre abweichenden Uhrzeiten leeren?")) return;
  const generated = newCourse(date, config);
  generated.dates.forEach((value, index) => { field(`date-${index}`).value = value; field(`start-${index}`).value = ""; field(`end-${index}`).value = ""; });
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
function lockPublishing(locked) {
  publishing = locked;
  $("publish").disabled = locked;
  $("add-course").disabled = locked;
  $("workspace").querySelectorAll(".course-card button").forEach((control) => { control.disabled = locked; });
  saveDraft();
}
async function monitorRun(run, ownSession) {
  while (ownSession === session && token) {
    const current = await api(`${repository}/actions/runs/${run.id}`);
    if (ownSession !== session) return;
    if (current.status === "completed") {
      if (current.conclusion !== "success") throw new Error("Prüfung oder Veröffentlichung fehlgeschlagen. Dein Entwurf bleibt gespeichert. Die Details stehen im GitHub-Status. Falls der Commit bereits gespeichert wurde, kann der Workflow dort erneut gestartet werden.");
      $("publish-status").textContent = "Deployment erfolgreich. Die ausgelieferte Kursversion wird geprüft …";
      const publicVersion = await fetch(`/assets/course-version.json?v=${run.version}`, { cache: "no-store", signal: AbortSignal.timeout(10000) }).then((response) => response.ok ? response.json() : null);
      if (publicVersion?.version !== run.version) throw new Error("GitHub hat veröffentlicht; die erwartete Kursversion ist hier noch nicht bestätigt. Dein Entwurf bleibt erhalten. Bitte später den Status erneut prüfen.");
      baseCourses = clone(courses);
      config = { ...config, courses: clone(courses) };
      activeRun = null;
      $("publish-status").textContent = "Veröffentlicht. Die neuen Kursdaten sind auf der Website bestätigt.";
      status("Deine Kursänderungen sind veröffentlicht.");
      return;
    }
    $("publish-status").textContent = current.status === "queued" ? "Veröffentlichung wartet auf GitHub …" : "Die Änderungen werden geprüft und veröffentlicht. Du kannst dieses Fenster offen lassen; das dauert einige Minuten.";
    await new Promise((resolve) => window.setTimeout(resolve, 5000));
  }
}
$("publish").addEventListener("click", async () => {
  if (publishing || !token || !changed()) return;
  const ownSession = session;
  lockPublishing(true);
  try {
    $("publish-status").textContent = "Der aktuelle Stand wird abgeglichen …";
    const remote = await loadRemote();
    if (ownSession !== session) return;
    const merged = mergeCourses(baseCourses, courses, remote.data.courses);
    validateCourses(merged, remote.data);
    courses = merged;
    baseCourses = clone(remote.data.courses);
    config = remote.data;
    baseSha = remote.sha;
    render();
    const version = await versionOf({ ...config, courses });
    if (activeRun?.version === version) {
      await monitorRun(activeRun, ownSession);
      return;
    }
    if (new TextEncoder().encode(JSON.stringify(courses)).byteLength > 60000) throw new Error("Die Kursliste ist zu groß für eine Veröffentlichung. Bitte nicht mehr benötigte Kurse nach einer Sicherung entfernen.");
    const requestId = globalThis.crypto.randomUUID();
    const response = await api(`${repository}/actions/workflows/${workflow}/dispatches`, {
      method: "POST", body: { ref: "main", inputs: { courses: JSON.stringify(courses), expected_head: baseSha, request_id: requestId } }
    });
    // Older API versions return 204: identify this exact run by its unguessable request name.
    let runId = response?.workflow_run_id;
    for (let attempt = 0; !runId && attempt < 12 && ownSession === session; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 2500));
      const result = await api(`${repository}/actions/workflows/${workflow}/runs?event=workflow_dispatch&per_page=30`);
      runId = result.workflow_runs?.find((run) => run.display_title === `Kurse · ${requestId}`)?.id;
    }
    if (!Number.isSafeInteger(runId)) throw new Error("Der Auftrag wurde an GitHub übergeben, sein Status konnte noch nicht zugeordnet werden. Bitte zuerst auf GitHub prüfen, bevor du erneut veröffentlichst.");
    activeRun = { id: runId, version };
    saveDraft();
    $("workflow-link").href = `https://github.com/juliasutter/juliasutter.github.io/actions/runs/${runId}`;
    $("workflow-link").hidden = false;
    await monitorRun(activeRun, ownSession);
  } catch (error) { if (ownSession === session) $("publish-status").textContent = error.message; }
  finally { if (ownSession === session) { lockPublishing(false); $("publish").disabled = !changed(); } }
});
async function enter(data, sha) {
  config = data;
  courses = clone(data.courses);
  baseCourses = clone(courses);
  baseSha = sha;
  restoreDraft();
  $("login-panel").hidden = true;
  $("workspace").hidden = false;
  $("logout").hidden = false;
  render();
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
  if (!window.confirm("Den gesamten lokalen Entwurf verwerfen und die aktuellen Kurse neu laden?")) return;
  try {
    const remote = token ? await loadRemote() : { data: await fetch("/assets/course-config.json").then((response) => response.json()), sha: "local" };
    config = remote.data;
    validateCourses(config.courses, config);
    courses = clone(config.courses);
    baseCourses = clone(courses);
    baseSha = remote.sha;
    activeRun = null;
    render();
    status("Der Entwurf wurde verworfen. Die aktuellen Kursdaten sind geladen.");
  } catch (error) { status(error.message); }
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
window.addEventListener("pagehide", () => { token = ""; $("token").value = ""; });
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
