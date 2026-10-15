import assert from "node:assert/strict";
import test from "node:test";
import { berlinFields, berlinInstant, mergeCourses, newCourse, validateCourses, courseLabels, courseEnded } from "../assets/course-model.mjs";
import { applyCandidate } from "../tools/course-publication.mjs";
import { fixtureConfig } from "./course-fixtures.js";

const copy = () => structuredClone(fixtureConfig.courses);
const sha = "a".repeat(40);
const requestId = "a1234567-1234-1234-1234-123456789012";

test("Berlin deadlines use the correct winter and summer offsets", () => {
  assert.equal(berlinInstant("2026-10-16", "21:00"), "2026-10-16T19:00:00.000Z");
  assert.equal(berlinInstant("2027-01-12", "21:00"), "2027-01-12T20:00:00.000Z");
  assert.deepEqual(berlinFields("2027-01-12T20:00:00Z"), { date: "2027-01-12", time: "21:00" });
  assert.throws(() => berlinInstant("2026-03-29", "02:30"), /Zeitumstellung/);
  assert.throws(() => berlinInstant("2026-10-25", "02:30"), /Zeitumstellung/);
  assert.throws(() => berlinInstant("2026-02-30", "21:00"));
});
test("new courses generate six weekly sessions and a Berlin deadline", () => {
  const course = newCourse("2027-01-13", fixtureConfig);
  assert.equal(course.dates.length, 6);
  assert.equal(course.dates[5], "2027-02-17");
  assert.equal(course.registrationDeadline, "2027-01-12T20:00:00.000Z");
  assert.equal(course.remainingPlaces, 7);
  assert.equal(course.capacity, 7);
  assert.equal(course.labelDe, "Winter 2027 · Mittwochabend");
  validateCourses([course], fixtureConfig);
});
for (const [label, change] of [
  ["negative places", (course) => { course.remainingPlaces = -1; }],
  ["fractional places", (course) => { course.remainingPlaces = 1.5; }],
  ["insufficient capacity", (course) => { course.capacity = 1; }],
  ["duplicate dates", (course) => { course.dates[1] = course.dates[0]; }],
  ["invalid date", (course) => { course.dates[0] = "2026-02-30"; }],
  ["invalid shared time", (course) => { course.startTime = "28:30"; }],
  ["invalid override", (course) => { course.sessionTimes = { [course.dates[0]]: { startTime: "10:00", endTime: "09:00" } }; }],
  ["late deadline", (course) => { course.registrationDeadline = "2026-12-01T21:00:00+01:00"; }],
  ["missing in-person location", (course) => { course.format = "vor_ort"; }],
  ["unknown executable field", (course) => { course.script = "alert(1)"; }],
  ["unusable price", (course) => { course.priceEur = 1.333; }],
  ["invalid friend price", (course) => { course.friendPriceEur = 999; }]
]) test(`course boundary rejects ${label}`, () => {
  const courses = copy(); change(courses[0]);
  assert.throws(() => validateCourses(courses, fixtureConfig));
});
test("valid per-session changes, cent prices and a disabled friend tariff are accepted", () => {
  const courses = copy();
  courses[0].sessionTimes = { [courses[0].dates[1]]: { startTime: "10:00", endTime: "12:30" } };
  courses[0].friendPriceEur = null;
  courses[0].priceEur = 399.99;
  validateCourses(courses, fixtureConfig);
});
test("publication only replaces courses and requires the expected main commit", () => {
  const courses = copy(); courses[0].remainingPlaces = 0;
  const result = applyCandidate(fixtureConfig, JSON.stringify(courses), sha, sha, requestId);
  assert.equal(result.formEndpoint, fixtureConfig.formEndpoint);
  assert.equal(result.courses[0].remainingPlaces, 0);
  assert.throws(() => applyCandidate(fixtureConfig, JSON.stringify(courses), sha, "b".repeat(40), requestId), /Main/);
  assert.throws(() => applyCandidate(fixtureConfig, JSON.stringify({ courses, formEndpoint: "https://evil.test" }), sha, sha, requestId));
  assert.throws(() => applyCandidate(fixtureConfig, "x".repeat(60001), sha, sha, requestId), /groß/);
});
test("three-way comparison keeps independent edits and refuses conflicting edits", () => {
  const base = copy(); const draft = copy(); const remote = copy();
  draft[0].remainingPlaces = 1; remote[1].remainingPlaces = 4;
  const merged = mergeCourses(base, draft, remote);
  assert.equal(merged.find((course) => course.id === base[0].id).remainingPlaces, 1);
  assert.equal(merged.find((course) => course.id === base[1].id).remainingPlaces, 4);
  remote[0].remainingPlaces = 0;
  assert.throws(() => mergeCourses(base, draft, remote), /GitHub geändert/);
});

test("names follow season, weekday and time; archive starts at the final session end", () => {
  assert.deepEqual(courseLabels("2026-10-17", "10:00"), { labelDe: "Herbst 2026 · Samstagvormittag", labelEn: "Autumn 2026 · Saturday morning" });
  assert.equal(courseLabels("2027-03-01", "18:00").labelDe, "Frühling 2027 · Montagabend");
  const course = newCourse("2026-10-17", fixtureConfig);
  course.sessionTimes = { "2026-11-21": { startTime: "10:00", endTime: "12:30" } };
  assert.equal(courseEnded(course, fixtureConfig, new Date("2026-11-21T11:29:59Z")), false);
  assert.equal(courseEnded(course, fixtureConfig, new Date("2026-11-21T11:30:00Z")), true);
});

test("new course time defaults distinguish weekdays and weekends, with matching names and prices", () => {
  for (const [date, start, end, name] of [
    ["2027-03-05", "20:00", "22:00", "Frühling 2027 · Freitagabend"],
    ["2027-03-06", "09:00", "11:00", "Frühling 2027 · Samstagvormittag"],
    ["2027-03-07", "09:00", "11:00", "Frühling 2027 · Sonntagvormittag"],
    ["2027-03-08", "20:00", "22:00", "Frühling 2027 · Montagabend"]
  ]) {
    const course = newCourse(date, fixtureConfig);
    assert.equal(course.startTime, start);
    assert.equal(course.endTime, end);
    assert.equal(course.labelDe, name);
    assert.equal(course.priceEur, 399);
    assert.equal(course.friendPriceEur, 349);
    validateCourses([course], fixtureConfig);
  }
});
