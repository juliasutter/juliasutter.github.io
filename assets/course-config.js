(function () {
  // New courses are maintained only here. Add the six dates in YYYY-MM-DD format.
  // status: "open" = binding registration, "waitlist" = non-binding waitlist,
  // "closed" = hidden from the public course selection.
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
    courses: []
  };
})();
