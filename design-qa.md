# Design QA

## Comparison target

- Source visual truth: `/var/folders/vd/wvmwq3gj7mz8ncm_n1wrqjth0000gn/T/codex-clipboard-1e1dfb82-aba6-4bf7-af41-031157d2da49.png`.
- Implementation route: `http://127.0.0.1:4173/#ueber-julia`.
- Desktop implementation screenshot: `/private/tmp/juliasutter-about-redesign/02-about-desktop-after.png` at 1440 × 900.
- Mobile implementation screenshot: `/private/tmp/juliasutter-about-redesign/05-about-mobile-final-verified.png` at 390 × 844.
- State: German landing page, About Julia section, default collapsed biography details.

## Findings

No actionable P0, P1 or P2 differences remain.

- The portrait-and-quote composition, oval crop, handwritten quote, and compact identity block reproduce the reference hierarchy.
- The larger section title, eyebrow label, cream background, and wider desktop scale are intentional adaptations to the existing site system rather than fidelity defects.
- `Dreifach-Mama` intentionally keeps the current site fact instead of the older reference's `Zweifach-Mama`.

## Required fidelity surfaces

- Fonts and typography: the existing Cormorant Garamond display face and Caveat handwriting face preserve the site's typography while matching the reference's serif heading and handwritten quote. Mobile quote sizing was reduced so its wrap and visual weight stay close to the portrait.
- Spacing and layout rhythm: desktop and mobile both use portrait-left, quote-right composition. Mobile keeps the two-column reference idea at 390 px; the biography moves below at full width. No horizontal overflow is present.
- Colors and visual tokens: forest-green quote text and the site's cream background retain the source's calm natural palette while staying consistent with the existing tokens.
- Image quality and asset fidelity: the implementation uses the same high-resolution Julia portrait already present in the repository, with a real oval crop and no generated or placeholder asset.
- Copy and content: the supplied Julia quote replaces the previous `Kinder sind gut` quote in German; an equivalent English version is present. Name and qualification remain directly attached to the quote.

## Comparison evidence

- Full-view comparison: the source image and desktop implementation were opened together; overall hierarchy, image/quote balance, typography, palette, and identity placement were checked.
- Focused-region comparison: the source image and mobile implementation were opened together; portrait size, quote wrapping, attribution height, and responsive reading order were checked at 390 × 844.
- Browser geometry confirms a 2:3 portrait ratio, separate image and quote columns, biography below the quote, and no viewport overflow.

## Comparison history

### Pass 1 — blocked

- P2 · The first mobile implementation set the handwritten quote too large. It wrapped into six prominent lines and pushed the identity block well below the portrait, unlike the compact reference composition.

### Fix applied

- Reduced the mobile quote scale and line height, tightened the identity spacing, and shortened the gap before the biography.

### Pass 2 — passed

- Post-fix mobile evidence: `/private/tmp/juliasutter-about-redesign/05-about-mobile-final-verified.png`.
- The quote and identity now stay close to the portrait height, retain legibility, and match the source hierarchy without overflow.

## Verification

- `npm run test:ci` passed.
- 52/52 end-to-end checks passed across desktop and mobile.
- HTML validation, ESLint, site invariants, unit tests, and Lighthouse assertions passed.
- Browser console errors: none.
- Existing navigation, mobile menu, FAQ, forms, course state, language preference, and legal-page counterparts remain covered by the full gate.

## Follow-up polish

- P3 · The reference uses a plain white field and smaller title. The implementation keeps the site's cream section and larger heading intentionally for continuity.

final result: passed

---

# Design QA — Official logo integration

## Comparison target

- Source visual truth: `assets/brand/julia-logo.svg`.
- Desktop implementation screenshot: `/private/tmp/juliasutter-logo-qa/01-desktop-header.png` at 1280 × 720.
- Footer implementation screenshot: `/private/tmp/juliasutter-logo-qa/02-desktop-footer.png` at 1280 × 720.
- Legal implementation screenshot: `/private/tmp/juliasutter-logo-qa/03-legal-header.png` at 1280 × 720.
- Mobile implementation screenshots: `/private/tmp/juliasutter-logo-qa/04-mobile-header.png` and `/private/tmp/juliasutter-logo-qa/05-mobile-menu.png` at 390 × 844.
- State: German landing page at the top, desktop footer, German legal header, and mobile navigation open.

## Findings

No actionable P0, P1 or P2 differences remain.

- The supplied logo silhouette is preserved exactly and remains legible in the header, footer, legal header, favicon, and Apple touch icon.
- The cream site treatment and cream-on-clay favicon are intentional palette adaptations of the supplied orange source, not shape changes.
- Header and footer wordmarks retain their existing hierarchy, while removing the generic leaf-in-circle treatment makes the official mark the sole brand identifier.
- The mobile menu keeps the header brand visible and contains no duplicate logo among its navigation links.

## Required fidelity surfaces

- Fonts and typography: unchanged; the existing Manrope wordmark remains aligned with the new signet on desktop and mobile.
- Spacing and layout rhythm: the signet fits the established brand slot without navigation wrapping or horizontal overflow. Mobile verification at 390 × 844 reported no overflow.
- Colors and visual tokens: the site mark uses cream on the existing photographic and forest backgrounds; the favicon uses the existing clay `#bf684f` with a cream mark.
- Image quality and asset fidelity: the website references the supplied vector asset directly. The favicon and touch icon are generated derivatives of the same path, with no redrawing or placeholder geometry.
- Copy and content: all wording is unchanged, the decorative logo keeps an empty alt attribute, and the surrounding brand link retains the accessible name “Julia Sutter Hand in Hand Parenting”.

## Comparison evidence

- Full-view comparison: `/private/tmp/juliasutter-logo-qa/06-full-comparison.png` places the source logo beside the rendered desktop hero and header.
- Focused comparison: `/private/tmp/juliasutter-logo-qa/07-focused-comparison.png` places the source logo beside focused header, footer, and legal-brand crops.
- Browser diagnostics confirmed the 1024 × 1024 SVG loads in both landing-page brand links, all three icon declarations are present, and the browser console has no warnings or errors.

## Comparison history

### Pass 1 — passed

- No P0/P1/P2 mismatch was found, so no visual correction loop was required.

## Verification

- Browser-rendered desktop header, footer, legal header, mobile header, and open mobile menu inspected.
- Mobile navigation interaction tested by opening the menu.
- Browser console errors and warnings: none.
- `npm run test:ci` passed, including lint, HTML validation, route and asset checks, unit tests, 56 Playwright checks across desktop and mobile, and six Lighthouse runs.

## Follow-up polish

- None required for this integration.

final result: passed

---

# Design QA — Über Julia editorial layout and shared biography (2026-09-26)

This review supersedes the earlier oval-portrait About review above.

## Reference and evidence

- Approved reference: `/Users/maxsutter/.codex/generated_images/01a0dd7e-f035-7290-8380-b2a1060abad9/exec-a8fcc7eb-b47b-44d8-9297-8ddcaba2d698.png`.
- Side-by-side comparison: `/Users/maxsutter/.codex/visualizations/2026/09/26/01a0dd7e-f035-7290-8380-b2a1060abad9/about-comparison.png`.
- Desktop, mobile and mobile-dialog screenshots in the same folder: `about-desktop.png`, `about-mobile.png`, `about-dialog-mobile.png`.
- Local routes: `http://127.0.0.1:4173/#ueber-julia` and `http://127.0.0.1:4173/en/#about-julia`.

## Visual result

The reference and rendered desktop were compared together at equal image scale. The rectangular portrait, cream field, serif introduction, understated qualification and links, and handwritten quote follow the approved composition. The original portrait asset is unchanged. Its original face and framing take precedence over any image-generation differences in the mockup.

The final approved text is longer than the initial mockup and adds a reading link. Its additional vertical space is intentional; the text is not compressed to reproduce the earlier draft's height. Initial desktop sizing was refined to align the portrait and right column more closely with the reference.

Inspected responsive states at 360, 390, 720, 1024 and 1440 pixels; automated geometry checks cover all five widths in both languages. Mobile order is heading/qualification, portrait, copy, story link, quote and booking link. No horizontal overflow was found. The portrait retains natural proportions via object-fit; its mobile crop is intentional. Both languages retain all three introduction paragraphs and all thirteen biography paragraphs.

The existing anecdote dialog also hosts the biography: cream surface, 800px desktop limit, fullscreen through 720px, no tool illustration or booking action for the biography. Desktop and mobile dialog states were visually inspected. Native details remain the no-JavaScript/no-dialog fallback.

No actionable P0, P1 or P2 visual findings remain.

final result: passed

## Verification boundary

Dependency commit `65b5b7d` was merged into this detached worktree without conflicts; no integration into main. The shared dialog's controller was extended rather than duplicated. Checks and remaining baseline failures are recorded below; the visual result above is not a claim that every repository check passes.

- ESLint, HTML validation, site checks (12 routes) and both unit tests passed.
- About suite: 22 passed, 2 intentional duplicate-project skips. Includes both languages, five responsive widths, complete article transfer, fallback, keyboard, focus/page restoration, reopening, booking and switching back to anecdotes.
- Full browser run: 164 passed, 4 skipped, 6 failed initially. Four failures were the old two-booking-entry expectation; the new About entry makes three. One anecdote test allowed Playwright's second click to auto-scroll by one pixel; it now verifies focus/position after each close and reopens using Enter. These five failures were addressed and affected checks rerun: booking/anecdote run 45 passed with only the scroll test remaining, followed by all four scroll cases passing. The anecdote longest-story selection is scoped to tool cards; biography coverage is separate.
- Remaining failure: `tests/site.spec.js` course-height assertion at desktop expects <=810px but measures 834.5625px. Reproduced identically in a clean archive of pre-change HEAD `4fd3999`, so the unrelated assertion and course layout were left unchanged. Consequently the complete CI gate is not green.
- Lighthouse: all assertions passed across six runs; performance 94–95, accessibility/best-practices/SEO 100 on both routes.
- Local preview reloaded successfully after checks and remains running for acceptance.
