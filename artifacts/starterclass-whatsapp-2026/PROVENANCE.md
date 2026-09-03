# Starter Class WhatsApp Status 2026

These four 1080 × 1920 PNGs are deterministic exports from `tools/build-starterclass-whatsapp.mjs`. Each source HTML file is kept in `source/` and a matching 390 × 693 phone-scale review copy is kept in `previews/`. The build audits every visible text line inside the conservative WhatsApp safe band from y=180 through y=1700.

The campaign uses the existing Julia Sutter visual system: the repository's Manrope, Cormorant Garamond, and Caveat fonts; `assets/brand/julia-logo.svg`; the official `assets/images/certified-instructor.png` badge; the authentic parent-child, group, and family photos `assets/images/coaching.jpg`, `assets/images/course-group.jpg`, and `assets/images/hero-mobile.webp`; and five existing Hand in Hand tool illustrations. No Julia-only portrait is used.

Copy, dates, prices, testimonial, CTA, and URL are authored in HTML/CSS so they remain exact and searchable. No image generator was used for typography or factual content. The visible short route is `juliasutter.de/starterclass`. QR is intentionally omitted; `POSTING-GUIDE.md` and `status-link.txt` describe the native WhatsApp link step that follows the image statuses.

Rebuild with:

```sh
node tools/build-starterclass-whatsapp.mjs
```
