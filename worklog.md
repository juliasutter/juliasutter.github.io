# Current goal

Create a from-scratch mobile-first WhatsApp Status campaign for the Autumn 2026 Starter Class that converts parents unfamiliar with Hand in Hand Parenting into course registrations.

# Active user steering

- WhatsApp Status on a phone is the primary medium; no print use.
- Do not merely resize or tweak the previous flyer.
- Use large, immediately readable copy and an emotionally compelling problem-to-outcome positioning.
- Assume the audience has never heard of Hand in Hand Parenting.
- The goal is course conversion, not explaining the methodology.
- Ask substantive positioning and offer questions before designing.
- Current course dates from `assets/course-config.js`: 17.10., 24.10., 31.10., 07.11., 14.11., 21.11.2026, 09:00-11:00, online.
- Primary audience: mothers with children aged 2-10, typically seeing Julia through second-degree WhatsApp networks.
- Dominant pain: acute helplessness during escalations ("What do I do now?").
- Desired transformation: feel secure and connected in difficult moments.
- Main objection: uncertainty whether the approach changes real family life.
- Use an authentic parent testimonial as proof and show Julia prominently.
- Deliver a 3-slide status sequence plus one standalone share card, all 1080x1920.
- Tone: warm and clear. Price belongs on slide 3. Honest scarcity: maximum 7 parents.
- CTA: "Infos & Platz sichern" via a memorable `/starterclass/` route; QR is secondary at most.
- Replace the word "eskaliert" with a more natural, less harsh description of difficult family moments.
- Refine spacing from first principles: slide 2 should use the unused space inside the quote area; slide 3 and the standalone card need more breathing room and stronger visual grouping.
- Bottom whitespace is allowed only where it functions as WhatsApp UI safety space; it should not make the composition feel cramped above it.
- Visual design and aesthetic judgment should be handled by Sol rather than Luna.
- The offer must be unmistakable within seconds: Hand in Hand Parenting Starter Class, for parents of children aged 2-10, which recurring family problems it addresses, what participants learn/do, how the six-week online format works, and what outcome they are buying.
- Use Ash Maurya's Mafia Offer principles as a positioning lens: specificity, reduced perceived risk, and confidence. Do not invent a guarantee; use concrete curriculum, small-group format, personal support, certification, and exact testimonial as legitimate risk reducers.
- Brighten the campaign substantially and make it feel more connected to childhood: light cream, warm orange/coral, yellow, aqua, and restrained green rather than large dark-green fields.
- Reduce the number of Julia-only portraits. Use the existing `assets/images/coaching.jpg` parent-child interaction and relevant colorful Hand in Hand tool illustrations.
- Add the existing official `assets/images/certified-instructor.png` Hand in Hand Certified Instructor badge as trust proof.
- Remove "besonders Mamas" everywhere; address all parents neutrally. Fathers are equally welcome.
- Keep slide 3 visually unchanged; the user explicitly likes it.
- Slide 2 must show all five tools, including Wunschzeit, and the headline must say what participants "lernen" rather than what they "können".
- Rebalance spacing on slides 1, 2, and the standalone card so text groups are neither cramped nor separated by arbitrary gaps.
- Current WhatsApp research: the app overlays progress/name controls at the top and a reply/reaction field at the bottom, but WhatsApp publishes no fixed numeric safe zone and UI varies. Keep critical text protected with a moderate bottom band; extend noncritical backgrounds, color fields, and imagery to the canvas edge so safety does not look like an empty white placeholder.
- Do not sell the first tool under its method name "Wunschzeit". Sell its value as "Verbindung bewusst stärken", supported by the concrete explanation "5–20 Minuten, in denen dein Kind führt".
- Give the first tool the same visual treatment and hierarchy as the other four; the prior featured card created an unjustified stylistic break.
- Apply the same value-first principle consistently to the fifth tool: "Eigene Kraft zurückgewinnen" should be the title, not "Listening Partnership".
- Preserve slide 1 and slide 3 unchanged; revise only slide 2 and the standalone card.

# Progress

- Inspected current course configuration, website positioning, testimonials, offer details, and existing campaign artifacts.
- Identified same-device CTA friction as a key WhatsApp-specific decision.
- Completed three rounds of audience, message, proof, structure, CTA, price, scarcity, and tone decisions.
- First 4-image mobile campaign rendered and reviewed at 390x693 phone scale.
- Independent review confirmed: WhatsApp safe-zone collisions, undersized standalone details, missing exact standalone dates, duplicate slide-3 time, and need for an actually tappable link workflow.
- Official WhatsApp guidance confirms link statuses receive a tappable visual preview; final posting workflow will pair the designed image sequence with a native link status.
- User requested Sol for visual design; the Luna correction pass was interrupted and a Sol High worker completed the final visual refinement.
- Final 3-slide sequence and standalone share card rendered at 1080x1920 with 390x693 review copies.
- All essential text is inside y=180..1700; slide 3 time is no longer duplicated; standalone lists all six dates and uses larger proof/facts/action copy.
- Added `/starterclass/` redirect to `/#starter-class`, posting guide, and copy-ready native status link.
- Independent visual review findings were adjudicated and corrected; parent visually approved the full-size and phone-scale series.
- Passed lint, HTML validation, site check, unit tests, artifact dimension/hash/date/safe-band checks, and four focused mobile/desktop Playwright checks for `/starterclass/`.
- Final files were attached to the existing Creative Production board.
- Sol High completed the user-requested spacing and copy refinement across all four assets.
- Replaced every campaign occurrence of "eskaliert" with the warmer line "Wenn plötzlich alles zu viel wird …" while retaining the concrete question "Was mache ich jetzt?".
- Slide 2's quote card was tightened and rebalanced; slide 3 now separates schedule, inclusions, pricing, and CTA more clearly; the standalone card was substantially recomposed with a calmer proof/facts/offer rhythm and intentional bottom safe space.
- Main agent inspected all four regenerated 390x693 previews and accepted the revised visual hierarchy.
- Final rerender passed the generator's exact-content, overlap, and y=180..1700 safe-band audits; lint and source syntax pass; all four outputs remain 1080x1920 and hashes match the worker's deterministic render.
- Refined exports were added to the same Creative Production board as revision-2 items; superseded transient placeholders were removed.
- Researched Ash Maurya's Mafia Offer framing and translated it into specific, source-backed risk reducers rather than inventing a guarantee.
- Sol High rebuilt the complete campaign around immediate offer comprehension: slide 1 now names the product, audience, concrete pain, practical promise, duration, entry level, and trust; slide 2 explains what parents learn and how the group works; slide 3 presents the full logistics/value stack; the standalone card carries the complete offer independently.
- Replaced the dark visual system with a bright cream, peach, yellow, mint, aqua, coral, and plum palette; forest green remains primarily as readable text.
- Removed all Julia-only portraits. The set now uses `coaching.jpg` (Julia with a child), four colorful tool illustrations, `course-group.jpg`, and `hero-mobile.webp` (Julia with her children), with no photo reused.
- Added the official Hand in Hand Certified Instructor badge as trust proof.
- Main agent visually inspected all four 390x693 previews and accepted the new offer hierarchy, lighter palette, and child-connected imagery.
- Fixed a lint regression in the rebuilt generator's browser-context globals; syntax and lint now pass.
- Final audits confirm all four full exports are 1080x1920, all four previews are 390x693, exact dates/prices/testimonial/CTA/URL are preserved, the prohibited wording remains absent, and text stays within y=180..1700.
- New offer-led exports were completed on the existing Creative Production board at revisions 23-26.
- Verified current WhatsApp Status behavior and design guidance: top and bottom UI overlays are real, but there is no official fixed pixel specification; the design now protects only critical copy while allowing noncritical color and imagery to continue through the edge areas.
- Removed "besonders Mamas" throughout and now uses the neutral audience line "Für Eltern mit Kindern von 2–10 Jahren".
- Preserved slide 3 byte-for-byte because the user explicitly approved it.
- Slide 2 now says "Was du in 6 Wochen konkret lernst" and shows all five tools, with Wunschzeit featured and the other four tools clearly explained.
- Rebalanced slides 1, 2, and standalone: slide 1's parent-child image fills the former dead gap; slide 2 uses a 1+4 tool hierarchy; standalone includes all five tools and continues the peach field beneath the bottom UI-risk band rather than showing a blank white placeholder.
- Main agent inspected all four 390x693 previews and accepted the final rhythm and legibility; syntax, lint, exact-copy, dimension, safe-band, and deterministic-render checks pass.
- Refined slide 1, slide 2, and standalone were added to the existing Creative Production board at revisions 28-30.
- Corrected the user's identified offer inconsistency: the first tool is now sold as "Verbindung bewusst stärken" rather than under the method name "Wunschzeit"; the fifth likewise uses "Eigene Kraft zurückgewinnen" rather than "Listening Partnership".
- Slide 2 now presents all five value outcomes as equal full-width rows with matching typography, spacing, card treatment, and illustration scale; no tool is visually singled out.
- Standalone presents the same five value outcomes as a balanced, equal-treatment 3+2 grid.
- Slide 1 and slide 3 were preserved byte-for-byte; main agent visually verified slide 2 and standalone at 390x693 and accepted the corrected parity.
- Syntax, lint, exact-content/forbidden-visible-text, safe-band, dimensions, and deterministic-render checks pass; the corrected items were added to the existing Creative Production board at revisions 32-33.

# Next steps

- Await user feedback on the corrected value-first, equal-treatment slide 2 and standalone card.
- If approved, optionally commit/publish only when explicitly requested.
