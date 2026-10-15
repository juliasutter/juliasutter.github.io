export const courseKeys = new Set([
  "id", "labelDe", "labelEn", "status", "archived", "dates", "startTime", "endTime",
  "sessionTimes", "remainingPlaces", "capacity", "registrationDeadline", "format", "location", "priceEur", "friendPriceEur"
]);

export function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

const validTime = (value) => typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
const text = (value, max) => typeof value === "string" && value.trim().length > 0 && value.length <= max && !/[\u0000-\u001f]/.test(value);

// Convert a Berlin wall-clock time without manually choosing a summer/winter offset.
// Ambiguous and nonexistent times are rejected instead of being silently shifted.
export function berlinInstant(date, time) {
  if (!validDate(date) || !validTime(time)) throw new Error("Bitte Datum und Uhrzeit vollständig eintragen.");
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  });
  const wall = `${date} ${time}`;
  const matches = ["+01:00", "+02:00"].map((offset) => new Date(`${date}T${time}:00${offset}`))
    .filter((instant) => formatter.format(instant) === wall);
  if (matches.length !== 1) throw new Error("Diese Uhrzeit ist wegen der Zeitumstellung nicht eindeutig. Bitte eine andere Uhrzeit wählen.");
  return matches[0].toISOString();
}

export function berlinFields(instant) {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  }).formatToParts(new Date(instant));
  const part = (type) => parts.find((entry) => entry.type === type).value;
  return { date: `${part("year")}-${part("month")}-${part("day")}`, time: `${part("hour")}:${part("minute")}` };
}

export function sessionTime(course, date, defaults = {}) {
  return course.sessionTimes?.[date] || {
    startTime: course.startTime || defaults.defaultStartTime || "20:00",
    endTime: course.endTime || defaults.defaultEndTime || "22:00"
  };
}

export function validateCourses(courses, defaults = {}) {
  if (!Array.isArray(courses) || courses.length > 100) throw new Error("Die Kursliste ist ungültig (höchstens 100 Kurse).");
  const ids = new Set();
  for (const course of courses) {
    if (!course || typeof course !== "object" || Array.isArray(course) || Object.keys(course).some((key) => !courseKeys.has(key))) throw new Error("Ein Kurs enthält unbekannte Felder.");
    const fail = (message) => { throw new Error(`${course.labelDe || "Kurs"}: ${message}`); };
    if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(course.id || "") || ids.has(course.id)) fail("Die Kurskennung ist ungültig oder doppelt.");
    ids.add(course.id);
    if (!text(course.labelDe, 120) || !text(course.labelEn, 120)) fail("Bitte eine deutsche und englische Bezeichnung angeben (max. 120 Zeichen).");
    if (!["open", "waitlist", "closed"].includes(course.status)) fail("Der Kursstatus ist ungültig.");
    if (course.archived !== undefined && typeof course.archived !== "boolean") fail("Der Archivstatus ist ungültig.");
    if (!Array.isArray(course.dates) || course.dates.length !== 6 || course.dates.some((date) => !validDate(date)) || new Set(course.dates).size !== 6 || course.dates.some((date, index) => index > 0 && date <= course.dates[index - 1])) fail("Bitte sechs unterschiedliche Termine in zeitlicher Reihenfolge angeben.");
    if (!validTime(course.startTime || defaults.defaultStartTime) || !validTime(course.endTime || defaults.defaultEndTime)) fail("Bitte gültige Anfangs- und Endzeiten angeben.");
    if (course.sessionTimes !== undefined && (!course.sessionTimes || typeof course.sessionTimes !== "object" || Array.isArray(course.sessionTimes))) fail("Die abweichenden Uhrzeiten sind ungültig.");
    for (const [date, times] of Object.entries(course.sessionTimes || {})) {
      if (!course.dates.includes(date) || !times || typeof times !== "object" || Object.keys(times).some((key) => !["startTime", "endTime"].includes(key)) || !validTime(times.startTime) || !validTime(times.endTime)) fail("Eine Terminabweichung ist ungültig.");
    }
    for (const date of course.dates) {
      const times = sessionTime(course, date, defaults);
      if (times.endTime <= times.startTime) fail("Jeder Termin muss am selben Tag nach seinem Beginn enden.");
      berlinInstant(date, times.startTime);
      berlinInstant(date, times.endTime);
    }
    if (!Number.isInteger(course.remainingPlaces) || course.remainingPlaces < 0 || course.remainingPlaces > 999) fail("Freie Plätze müssen eine ganze Zahl zwischen 0 und 999 sein.");
    if (course.capacity !== undefined && (!Number.isInteger(course.capacity) || course.capacity < 1 || course.capacity > 999 || course.remainingPlaces > course.capacity)) fail("Die Gesamtkapazität muss mindestens den freien Plätzen entsprechen.");
    if (course.registrationDeadline !== undefined) {
      if (typeof course.registrationDeadline !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/.test(course.registrationDeadline) || !validDate(course.registrationDeadline.slice(0, 10)) || !validTime(course.registrationDeadline.slice(11, 16)) || !Number.isFinite(new Date(course.registrationDeadline).getTime())) fail("Der Anmeldeschluss ist ungültig.");
      const first = sessionTime(course, course.dates[0], defaults);
      if (new Date(course.registrationDeadline) > new Date(berlinInstant(course.dates[0], first.startTime))) fail("Der Anmeldeschluss darf nicht nach dem Kursbeginn liegen.");
    }
    if (course.format !== undefined && !["online", "vor_ort"].includes(course.format)) fail("Das Kursformat ist ungültig.");
    if (course.location !== undefined && !text(course.location, 200)) fail("Der Veranstaltungsort ist ungültig (max. 200 Zeichen).");
    if (course.format === "vor_ort" && !text(course.location, 200)) fail("Bitte den öffentlichen Veranstaltungsort angeben.");
    for (const key of ["priceEur", "friendPriceEur"]) {
      if (key === "friendPriceEur" && course[key] === null) continue;
      if (course[key] !== undefined && (!Number.isFinite(course[key]) || course[key] < 0 || course[key] > 99999 || Math.abs(Math.round(course[key] * 100) - course[key] * 100) > 0.000001)) fail("Preise müssen gültige Eurobeträge mit höchstens zwei Nachkommastellen sein.");
    }
    const price = course.priceEur ?? defaults.priceEur;
    const friend = course.friendPriceEur === null ? null : course.friendPriceEur ?? defaults.friendPriceEur;
    if (friend !== null && friend !== undefined && friend > price) fail("Der Freund:innenpreis darf nicht höher als der Standardpreis sein.");
  }
  return courses;
}

export function courseLabels(date, time) {
  if (!validDate(date) || !validTime(time)) throw new Error("Bitte Datum und Uhrzeit vollständig eintragen.");
  const month = Number(date.slice(5, 7));
  const season = Math.floor(month % 12 / 3);
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  const hour = Number(time.slice(0, 2));
  const period = hour < 5 ? 0 : hour < 12 ? 1 : hour < 14 ? 2 : hour < 18 ? 3 : 4;
  const deDay = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"][weekday];
  const enDay = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][weekday];
  return {
    labelDe: `${["Winter", "Frühling", "Sommer", "Herbst"][season]} ${date.slice(0, 4)} · ${deDay}${["nacht", "vormittag", "mittag", "nachmittag", "abend"][period]}`,
    labelEn: `${["Winter", "Spring", "Summer", "Autumn"][season]} ${date.slice(0, 4)} · ${enDay} ${["night", "morning", "midday", "afternoon", "evening"][period]}`
  };
}

export function courseEnded(course, defaults = {}, now = new Date()) {
  const last = course.dates.at(-1);
  return new Date(berlinInstant(last, sessionTime(course, last, defaults).endTime)) <= now;
}

export function newCourse(startDate, defaults = {}) {
  const weekday = new Date(`${startDate}T12:00:00Z`).getUTCDay();
  const weekend = weekday === 0 || weekday === 6;
  const startTime = weekend ? "09:00" : defaults.defaultStartTime || "20:00";
  const endTime = weekend ? "11:00" : defaults.defaultEndTime || "22:00";
  const dates = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(`${startDate}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + index * 7);
    return date.toISOString().slice(0, 10);
  });
  const before = new Date(`${startDate}T12:00:00Z`);
  before.setUTCDate(before.getUTCDate() - 1);
  return {
    id: `starter-${globalThis.crypto.randomUUID()}`, ...courseLabels(startDate, startTime), status: "open",
    dates, startTime, endTime,
    format: "online", capacity: 7, remainingPlaces: 7, registrationDeadline: berlinInstant(before.toISOString().slice(0, 10), "21:00"),
    priceEur: defaults.priceEur ?? 399, friendPriceEur: defaults.friendPriceEur ?? 349
  };
}

// Three-way comparison retains independent remote edits; a conflicting course is never overwritten.
export function mergeCourses(base, draft, remote) {
  const result = JSON.parse(JSON.stringify(remote));
  for (const id of new Set([...base, ...draft].map((course) => course.id))) {
    const before = base.find((course) => course.id === id);
    const after = draft.find((course) => course.id === id);
    if (JSON.stringify(before) === JSON.stringify(after)) continue;
    const current = remote.find((course) => course.id === id);
    if (JSON.stringify(current) !== JSON.stringify(before) && JSON.stringify(current) !== JSON.stringify(after)) throw new Error(`„${after?.labelDe || before.labelDe}“ wurde auch auf GitHub geändert. Dein Entwurf bleibt erhalten. Bitte die aktuellen Kursdaten mit deinem Entwurf vergleichen, bevor du ihn erneut überträgst.`);
    const index = result.findIndex((course) => course.id === id);
    if (index >= 0 && after) result[index] = after;
    else if (index >= 0) result.splice(index, 1);
    else if (after) result.push(after);
  }
  return result;
}
