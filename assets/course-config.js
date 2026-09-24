(function () {
  // New courses are maintained only here. Add the six dates in YYYY-MM-DD format.
  // status: "open" = binding registration, "waitlist" = non-binding waitlist,
  // "closed" = hidden from the public course selection.
  // format: "online" = online course, "vor_ort" = in-person course.
  //
  // Example:
  // {
  //   id: "starter-2026-autumn",
  //   labelDe: "Herbst 2026",
  //   labelEn: "Autumn 2026",
  //   status: "open",
  //   startTime: "20:00",
  //   endTime: "22:30",
  //   dates: ["2026-09-07", "2026-09-14", "2026-09-21", "2026-09-28", "2026-10-05", "2026-10-12"]
  // }
  window.JULIA_SITE_CONFIG = {
    formEndpoint: "https://formcarry.com/s/RzTPxooFeBz",
    timeZone: "Europe/Berlin",
    priceEur: 399,
    friendPriceEur: 349,
    defaultStartTime: "20:00",
    defaultEndTime: "22:30",
    courses: [
      {
        id: "starter-2026-autumn",
        labelDe: "Herbst 2026 · Samstagvormittag",
        labelEn: "Autumn 2026 · Saturday mornings",
        status: "open",
        format: "online",
        startTime: "09:00",
        endTime: "11:00",
        dates: ["2026-10-17", "2026-10-24", "2026-10-31", "2026-11-07", "2026-11-14", "2026-11-21"]
      },
      {
        id: "starter-2027-winter",
        labelDe: "Winter 2027 · Samstagvormittag",
        labelEn: "Winter 2027 · Saturday mornings",
        status: "open",
        format: "online",
        startTime: "09:00",
        endTime: "11:30",
        dates: ["2027-01-16", "2027-01-23", "2027-01-30", "2027-02-06", "2027-02-13", "2027-02-20"]
      },
      {
        id: "starter-2027-february",
        labelDe: "Winter 2027 · Freitagabend",
        labelEn: "Winter 2027 · Friday evenings",
        status: "open",
        format: "online",
        startTime: "20:00",
        endTime: "22:30",
        dates: ["2027-02-12", "2027-02-19", "2027-02-26", "2027-03-05", "2027-03-12", "2027-03-19"]
      }
    ]
  };
})();
