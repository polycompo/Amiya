# Interactive Career Map Presentation Opening

## Context
- Build only the opening of a 10-minute reveal.js presentation for a mostly non-technical audience.
- Replace the title slide with a loading/start screen and an SVG map showing only Seoul and Bundang-gu in Gyeonggi.
- Career history: Exntu in Pangyo (2016.11–2019.07), KINX in Gangnam-gu (2019.08–2020.05), freelance mainly in Bundang (2020.05–present).
- The user wants interchangeable screen clicks and arrow keys. Pangyo and Gangnam use GPS pins; Bundang uses an area color change rather than another pin.
- Existing repository files are standalone examples; add an independent application under `presentation/`.

## Problem
- Chronology, pins, route, region highlight, and displayed details must stay synchronized when mixing forward/backward input.
- Pangyo and Bundang are close geographically. A point and a district fill must remain visually distinct, including when Pangyo lies inside the highlighted district.
- Presentation must run with local assets and no external network access after installation/build.
- PDF must contain the complete history on one page, with no loading screen or partial fragment states.

## Solution
- Use Vite, TypeScript, reveal.js, CSS, and inline SVG. Keep React and external map/animation services out of this small opening.
- Record map boundary provenance and license, derive a local SVG asset, and treat markers as representative work areas rather than exact office addresses.
- Display a minimal readiness/start overlay outside the slide deck. Start reveals the map before the first career event.
- Latest visual refinement: omit the overview/inset map and show only Seoul and Bundang-gu boundaries; hide all other districts while preserving geographic positions.
- Use reveal.js fragment order as the source of truth. Map click, next/previous buttons, Right/Space, and Left route through the same reveal API; reset clears the fragments.
- Animate two GPS pins and a connecting route, then highlight the actual Bundang boundary. Show all three career entries along the bottom, progressively revealing them and emphasizing the current entry.
- Provide keyboard focus, reduced-motion support, reversible navigation, and click isolation for controls.
- In print-pdf and browser printing, show all career entries, both pins, route, and Bundang fill without readiness or navigation controls.
- Include local run/build/print instructions and a verified one-page PDF output.

## Risks
- Historical public boundary data is for presentation context, not navigation or current legal boundaries; document its source date.
- Keep the Pangyo point legible inside Bundang's area fill and retain geographic spacing after hiding surrounding districts.
- Browser print layout and fragment transforms can differ from live presentation; inspect the exported PDF visually.

## Validation
- Run TypeScript checking, production build, and repository-rule review.
- Exercise mixed click/keyboard input, reverse traversal, reset, start isolation, and fast input in a real browser.
- Verify the third step highlights Bundang with exactly two GPS pins and preserves the Pangyo marker.
- Verify no external requests are needed on production reload with external network blocked.
- Export print-pdf to one page, extract all three periods and employers, and inspect a rendered image for clipping or overlap.

## Result
- Implemented in `presentation/` using reveal.js 5.2.1, Vite 7.3.1, and TypeScript 5.9.3.
- Derived a local SVG containing only Seoul's 25 districts and Bundang-gu from SGIS 2018 boundaries (공공누리 1유형); documented sources and included the local Pretendard font license.
- TypeScript checking and production build pass.
- Browser scenarios pass for mixed pointer/keyboard input, start isolation, backward navigation, reset, held-key suppression, two pins plus Bundang fill, hidden surrounding districts, external-network isolation, reduced motion, speaker preview readiness, and preserved SVG pin positions in print.
- Exported `presentation/output/pdf/career-history.pdf`: one page; all periods, employers, and both pin labels extracted; no loading or navigation text.
- Inspected the live final state and rendered PDF. A print-only SVG transform regression found during visual review was fixed and covered by a browser assertion.
- Remaining scope: this delivery is the opening only. Later slides and venue/projector rehearsal are not yet implemented or performed.

---

# Career Map Current-Step Emphasis

## Context
- The user wants the first-to-second connecting line removed, each pin visible only during its own stage, and non-selected history entries dimmed.
- Preserve mixed click/keyboard navigation and the one-page complete-history PDF.

## Problem
- Map events currently accumulate, and future history entries remain hidden rather than dimmed.
- Live presentation emphasis must not hide information in the PDF summary.

## Solution
- Remove the route from the SVG generator and generated asset, and delete its unused styles.
- Show only the current map event in live mode: Pangyo pin, Gangnam pin, then Bundang area. In print mode show both pins and the area together.
- From stage one onward show all three bottom entries. Give the active entry full opacity and all other entries a shared dim opacity. Preserve the empty initial map and its introduction hint.
- Retain reveal.js Fragment state as the progression source, with CSS controlling dimmed future entries and matching accessibility visibility.
- Update the existing browser scenarios and usage documentation, and regenerate the PDF.

## Risks
- CSS must override hidden future fragments without changing reveal.js navigation state.
- Returning from print to the live presentation must restore exactly one current map event and the corresponding history emphasis.

## Validation
- Check active-only pins, absent route, dimmed past/future entries, reverse/reset, and print restoration in the existing mixed-input browser scenarios.
- Run TypeScript checking, production build, and source review.
- Inspect the second and third stages and the refreshed one-page PDF with all history entries fully visible.

## Result
- Removed the route from the generator, SVG, and styles. Live stages now show only their own map event; PDF retains both pins and the Bundang area.
- All history entries appear from stage one, with inactive entries at 32% opacity and the current entry at full opacity. The initial map still shows the introductory hint.
- TypeScript/build and the updated mixed-input browser scenarios pass, including reverse/reset, dimmed future entries, and print-to-live restoration.
- Visually checked stages two and three and the regenerated PDF. PDF remains one page with all dates, employer names, and both pin labels present; all history entries print at full opacity.

---

# Wanted Sans Presentation Font

## Context
- The user selected Wanted Sans from the font comparison and requested applying it to the presentation.

## Problem
- The presentation and font-readiness check currently use locally bundled Pretendard.

## Solution
- Replace the bundled font and license with the exact Wanted Sans revision shown in the comparison.
- Update the font family, readiness check, existing font assertion, and source record. Preserve current sizes, weights, spacing, and interactions.
- Rebuild the presentation and refresh the existing PDF.

## Risks
- Different glyph widths may affect live and printed labels. Keep local loading so presentation use requires no external connection.

## Validation
- Run TypeScript/build and the existing browser checks with external requests blocked.
- Inspect the live slide and regenerated one-page PDF, including font embedding and text layout.

## Result
- Bundled Wanted Sans Variable (400–1000), replaced the previous font asset/license, and updated the readiness check and existing font assertion.
- TypeScript/build and all existing browser checks pass, including production loading with external requests blocked.
- Inspected live and PDF layouts. PDF remains one page with all career details and embedded glyph programs.
- Loading-screen alternatives are separate conversation previews; the production opening behavior is unchanged pending the user's choice.

---

# Green Battery Readiness Screen

## Context
- The user selected the battery charging concept, requested iPhone-like green, removed the completion message and start button, and requested a black or white completed battery.
- The presentation uses a light background and supports screen clicks and arrow keys.

## Problem
- The current spinner and explicit start button do not match the selected opening.
- Starting on a click or key must wait for readiness and must not also advance the first history fragment.

## Solution
- Replace the spinner/button with seven charging cells and a percentage. Use green while charging and near-black once ready, with no visible completion sentence.
- Animate the opening briefly up to 90 percent while preparing the local font and reveal.js, then complete only when both preparation and the animation finish.
- Allow a screen click, Right, Space, or Enter to open the initial empty map. Ignore premature and held-key input.
- Skip charging motion for reduced-motion users, print mode, and speaker receivers. Keep the PDF content unchanged.
- Update the existing browser scenarios and operating instructions.

## Risks
- The key that opens the presentation must be consumed before reveal.js can advance a fragment.
- Slow or failed resources must not leave a falsely ready battery. A load error must remain readable.

## Validation
- Run build and existing browser scenarios; verify delayed-font readiness, green-to-black completion, button/message removal, click and keyboard entry, and no double advance.
- Inspect charging and completed screens at desktop and narrow widths; verify reduced motion and print/speaker bypass.

## Result
- Replaced the spinner and start button with the green segmented battery and percentage; completion changes the battery to near-black without a visible status sentence.
- Screen click, Right, Space, and Enter open the initial map. Premature input and held keys are ignored, and the opening event cannot advance a career fragment.
- TypeScript/build and browser scenarios pass, including delayed local font loading, offline requests, reduced motion, mobile sizing, speaker receivers, and complete-history print mode.
- Visually inspected charging and completed states on desktop and the completed state at 390px width. The existing PDF content is unaffected.

---

# Rising Map Entrance and Borderless History

## Context
- The user approves the battery opening and wants the career map to rise from the ground when it appears.
- Remove the divider lines above the bottom history entries.

## Problem
- The map currently appears immediately without depth, and the empty history strip already draws a horizontal rule.

## Solution
- Trigger a brief perspective/lift entrance from the existing presentation-start class, then settle the map into its original readable position.
- Give the geographic surface a restrained raised edge and soft shadow, keeping text and pins outside the shadow filter.
- Remove history-strip and entry borders in live and print modes; retain active-entry opacity emphasis and existing spacing.
- Honor reduced motion and print a flat, fully visible map. Regenerate the map asset and existing PDF.

## Risks
- Transforms must target only the outer map SVG so pin coordinates and click navigation remain intact.
- The animation must start after the battery screen is dismissed, without replaying for every career step.

## Validation
- Build and run the existing browser scenarios, checking entrance timing, final position, reduced motion, border removal, and print visibility.
- Inspect an intermediate animation frame, settled map, and refreshed one-page PDF.

## Result
- Added a 1.1-second perspective/lift entrance on presentation start and a subtle raised edge/shadow on the map surface only. The map settles at its original coordinates and does not replay during career navigation or reset.
- Removed the gray history divider and active blue entry rule in both live and print layouts, preserving text placement and opacity emphasis.
- Build and browser scenarios pass, including animation timing/settling, mixed input, reduced motion, and flat borderless print output.
- Inspected the intermediate entrance frame, settled map, active career step, and regenerated one-page PDF with all career entries present.

---

# Emerging Pins and Raised Area Color

## Context
- Remove the redundant Bundang label and freelance-area explanation beside the map.
- Pin and region appearances should emerge from the map. The user clarified that pins should rise from their anchor point and the colored region should pop up as a whole.

## Problem
- The parent map-event opacity transition hides most of the existing short pin movement, and the region fill simply fades in.

## Solution
- Remove the Bundang side labels (including the idle label) and their leader line from the SVG generator and generated map.
- Show the active map event immediately, then expand the pin upward from its fixed tip with a restrained overshoot, growing ground shadow, and delayed label reveal.
- Lift the complete Bundang fill with a short scale/vertical spring and a subtle raised edge, preserving the actual geographic outline and the two-pin limit.
- Use declarative animations so reverse/reset/fast input cancels and restarts the correct current event. Keep static final states for reduced motion and print.
- Update existing browser scenarios and README, and refresh the existing one-page PDF.

## Risks
- SVG transforms must keep the pin tip at its original representative coordinates while expanding and once settled.
- Reduced-motion and print output must show complete pins and the full colored region without transient transforms.

## Validation
- Verify the pin's fixed anchor and growing body, the whole-area lift, replay after navigation, label removal, and print/reduced-motion final states.
- Run build and browser scenarios; inspect intermediate and final screenshots and the refreshed PDF.

## Result
- Removed the map-side Bundang labels and leader line. Pins now emerge upward from a fixed map anchor with a short spring and growing shadow; the complete Bundang region lifts and settles with a subtle raised edge.
- Build and browser scenarios pass, including fixed pin coordinates during animation, whole-region motion, replay after reverse navigation, reduced motion, current-only markers, and complete print states.
- Visually inspected the intermediate pin/region frames and final map. Regenerated and inspected the one-page PDF with both pins and all career entries visible.

---

# Career Details Beside the Map

## Context
- The user wants to remove the bottom career strip and display each career entry on the right as its location appears on the map.
- Preserve the approved map/pin entrance, click and keyboard navigation, and full-history one-page PDF.

## Problem
- The existing layout reserves the bottom of the slide for three entries and dims inactive entries instead of showing only the current career detail.

## Solution
- Enlarge the map within the left side of the slide and move the existing career fragments into an unboxed right-side panel.
- Show only the current company's name, dates, and region beside the matching map marker. Hide all details in the initial/reset state and synchronize accessibility visibility.
- In print, arrange all three entries vertically on the right and retain both pins and the highlighted Bundang region.
- Update operating notes and existing browser checks, then regenerate the PDF.

## Risks
- Preserve the reveal.js fragment sequence while hiding earlier entries; reverse navigation and reset must remain synchronized.
- The SVG viewport must fit the larger left column without altering coordinates, clipping markers, or overlapping the details.
- Print rules must undo the overlapping live panel layout and place all entries on one page.

## Validation
- Run the build and existing browser scenarios, checking current-only details, marker synchronization, hidden inactive accessibility state, reset/reverse navigation, and print positions.
- Inspect the initial state and all three live stages, plus the regenerated one-page PDF for typography, spacing, overlap, and clipping.

## Result
- Replaced the bottom strip with a right-side detail panel that shows only the current career entry. Enlarged the left map and retained its existing pin/region animations and navigation.
- Build and browser checks pass, including hidden inactive entries, accessibility visibility, right-side positioning, reverse/reset behavior, and non-overlapping printed entries.
- Inspected the empty map, all three career stages, and the regenerated one-page PDF. The PDF shows the full map and three vertically arranged career entries on the right.

---

# Simplified Career Copy and Bundang Map Label

## Context
- The speaker will explain the locations verbally and wants the location lines below each company removed.
- The map should identify Bundang as "성남시 분당구", using the same restrained style as the Seoul label.

## Problem
- The right panel repeats location details, while the Bundang map shape has no permanent geographic label.

## Solution
- Remove the three location paragraphs from the career entries and their unused styles.
- Add a persistent Bundang geographic label to the SVG generator and regenerate the map, positioned clear of the Pangyo marker.
- Update the existing content assertion and operating notes, and refresh the one-page PDF.

## Risks
- The longer geographic label must remain readable without overlapping the Pangyo pin in the live presentation or PDF.

## Validation
- Run build and existing browser checks. Inspect the live map and complete one-page PDF for label placement and removed location copy.

## Result
- Removed the three location paragraphs and their unused styles. Added a permanent "성남시 분당구" label beneath the Bundang outline using the Seoul label style, clear of the Pangyo marker.
- Build and existing browser checks pass. Inspected live states and the regenerated one-page PDF; all career entries remain present without location descriptions or overlapping map labels.

---

# Walking Pixel Character Interlude

## Context
- Add a centered walking pixel character between the battery readiness screen and the existing career map.
- Use no caption or button; the speaker introduces the career history verbally.

## Solution
- Add a local eight-frame SVG sprite showing a right-facing suited character with a briefcase, looped with CSS steps.
- Consume one click or Right/Space/Enter to enter the walking screen and a second input to open the career map. Ignore Left and held-key repeats.
- Omit the interlude in print and speaker receiver views, and show a static pose under reduced motion.

## Validation
- Verify opening phase boundaries, repeated walking without auto-navigation, map entrance timing, reduced motion, mobile sizing, print output, and offline browser tests.
