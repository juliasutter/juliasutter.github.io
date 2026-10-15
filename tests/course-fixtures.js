export const fixtureConfig = {
  "introCallUrl": "https://calendar.app.google/B3vTLDTfrUF47nM58",
  "introCallEmbedUrl": "https://calendar.google.com/calendar/appointments/schedules/AcZssZ0BujbeeHh7PjShTgs1trg18VaDbZoE7h26y8n-Cj27nWhG7GxY6TcpBGLL2ZfS7Ta0hlERijcc?gv=true",
  "formEndpoint": "https://formcarry.com/s/RzTPxooFeBz",
  "timeZone": "Europe/Berlin",
  "priceEur": 399,
  "friendPriceEur": 349,
  "defaultStartTime": "20:00",
  "defaultEndTime": "22:00",
  "courses": [
    {
      "id": "starter-2026-autumn",
      "labelDe": "Herbst 2026 · Samstagvormittag",
      "labelEn": "Autumn 2026 · Saturday mornings",
      "status": "open",
      "remainingPlaces": 2,
      "registrationDeadline": "2026-10-16T21:00:00+02:00",
      "format": "online",
      "startTime": "09:00",
      "endTime": "11:00",
      "dates": [
        "2026-10-17",
        "2026-10-24",
        "2026-10-31",
        "2026-11-07",
        "2026-11-14",
        "2026-11-21"
      ]
    },
    {
      "id": "starter-2027-winter",
      "labelDe": "Winter 2027 · Mittwochabend",
      "labelEn": "Winter 2027 · Wednesday evenings",
      "status": "open",
      "remainingPlaces": 7,
      "registrationDeadline": "2027-01-12T21:00:00+01:00",
      "format": "online",
      "startTime": "20:00",
      "endTime": "22:00",
      "dates": [
        "2027-01-13",
        "2027-01-20",
        "2027-01-27",
        "2027-02-03",
        "2027-02-10",
        "2027-02-17"
      ]
    },
    {
      "id": "starter-2027-february",
      "labelDe": "Winter 2027 · Samstagvormittag",
      "labelEn": "Winter 2027 · Saturday mornings",
      "status": "open",
      "remainingPlaces": 7,
      "registrationDeadline": "2027-02-19T21:00:00+01:00",
      "format": "online",
      "startTime": "09:00",
      "endTime": "11:00",
      "dates": [
        "2027-02-20",
        "2027-02-27",
        "2027-03-06",
        "2027-03-13",
        "2027-03-20",
        "2027-03-27"
      ]
    }
  ]
};

export const installCourseFixture = (page) => page.route("**/assets/course-config.js", (route) => route.fulfill({
  contentType: "application/javascript", body: `window.JULIA_SITE_CONFIG=${JSON.stringify(fixtureConfig)};`
}));
