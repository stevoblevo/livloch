# Dreamwalk semiotic debrief — design QA

Date: 23 November 2026. Owner-requested work tracked in [issue #23](https://github.com/stevoblevo/livloch/issues/23).

## Result and scope

The dense list in the owner's screenshot is implemented as labeled visual field notes in the real end-screen code. Five groups separate the front, fighting, house light, the loch and rain. Arrows show a consequence; parallel arrangements show simultaneous effects; labeled branches distinguish alternative outcomes. Quantities and conditions remain written beside the symbols. Each card keeps its original title, a brief summary, an expandable full rule and Keep / Change / Cut.

This is an intentional redesign, not a pixel reproduction. All 20 discoveries in the screenshot are represented; all 24 existing discovery IDs are supported. Production still shows only the discoveries from that walk. No gameplay or simulation file was changed. [The handoff](docs/DEBRIEF-SEMIOTICS.md) contains the mapping and source-correct rules.

## Seen in frame

The screenshots below are browser captures of `tools/debrief-preview.html`, served over HTTP with the production stylesheet, JavaScript, external SVG sprite and Google Fonts. The fixed background is the existing title art. The sample 10:47 result and discovered IDs are fixture data, not evidence of a played match.

- [Desktop, all groups](docs/evidence/debrief-desktop.jpg): 1363 × 936 browser viewport; shared game typography, symbol key, review progress, two-column cards and explicit controls.
- [Desktop, light group](docs/evidence/debrief-light.jpg): thief targets and catch/escape outcomes; mode, health penalty and blackout duration stay visible.
- [Phone-width cards](docs/evidence/debrief-phone.jpg): capture of a 390 CSS-pixel iframe viewport; source events precede clearly separated outcomes. This is responsive browser evidence, not a physical-phone test.

All screenshots show zero verdicts selected. Temporary QA choices and notes were cleared before capture.

## Tested

The command output is committed in [debrief-checks.txt](docs/evidence/debrief-checks.txt).

- `node tools/test.js`: **28 passed, 0 failed**. The existing rule suite includes the model/presentation boundary.
- `node tools/test-debrief.js`: **9 passed, 0 failed**. Covers all 24 mappings and referenced symbols, mode quantities, discovery-only ordered exports, invalid verdicts, bounded notes, persistence round trips, actual Last breath behavior, script order and editable-field keyboard handling.
- JavaScript syntax checks and `git diff --check` pass. The PR also adds the debrief contracts to the existing CI workflow.
- In the browser fixture, Keep and Change selections updated the tally, Change exposed a note, ArrowLeft moved the note's caret without moving focus, and a reload retained the choices and note.
- Filtering to Rain left the copied export complete: all 20 discoveries in original order, including the two selected calls and their note. Unreviewed entries remained explicitly `UNREVIEWED`.
- The fixture's All 24 control rendered 24 cards. Ever Fallen changed the rain interval to 2 min 30 s and used the correct recovered-light rule.
- Clipboard writes completed successfully and the returned clipboard text matched the displayed review state. Clearing the QA entries restored 0 / 20 called and no notes.

## Measured

At the final narrow layout, the iframe's actual viewport width and document scroll width were both **390 CSS pixels**: no horizontal overflow. The soul card was 325 CSS pixels wide, with 134-pixel leading steps. Main filters, copy control and verdict controls were 44 pixels high. These are DOM layout measurements; they do not measure touch accuracy or real-device performance.

The sprite has **43 unique symbols**, with pinned upstream source and hashes in [the icon record](art/ui/DEBRIEF-ICONS.md).

## Findings fixed during review

1. The initial branch layout compressed two leading events into a narrow side column on phones. Leads now occupy a full-width causal row; outcomes sit below it and stack on narrow screens.
2. Narrow filters originally wrapped as five items plus a lonely sixth. The phone layout now uses a consistent three-column grid.
3. Rebuilding a card after selecting a verdict would lose focus. Verdict changes now update existing controls.
4. The game's keyboard handler used arrow keys even in editable fields. Native input, textarea, select and content-editable handling now takes precedence.
5. Optional notes needed a configuration default to survive the game's existing save loader. `callNotes` is now part of that schema.
6. The old explanations overstated Last breath and structure protection. The new descriptions follow the current simulation; source differences are recorded in the handoff.

## Unverified and limits

- The cloud browser could not create WebGL. A live end screen reached by completing a real Dreamwalk, all eight rendered game Views, real-device touch/controller behavior, frame rate, audio and human play remain unverified. The fixture does not substitute for those checks.
- The manual-copy fallback is implemented but its rejected-clipboard path was not reproduced in this browser. An attempted iframe clipboard restriction still allowed a successful write; no failure-path pass is claimed.
- Reduced-motion and forced-colors CSS are included; operating-system preference changes and assistive-technology operation were not exercised. Diagram readings and native radio labels were checked structurally, not through a screen-reader session.
- After the screenshots and functional checks were captured, the browser's URL policy refused the final return-to-preview/copy action and subsequent observation. Browser work stopped at that refusal. The saved captures are the review evidence; no persistent live-preview handoff is claimed.

## Coordination and integration

The initial source baseline was `4cc4fbb`; before publishing the branch, main was checked at `c398b2b44a7b61601174f8b5fb74293e40e3b0d6`. Its six relevant application files were byte-for-byte unchanged. The branch uses the newer main as its parent and preserves the newer collaboration, licensing and CI files.

Claude's `work/0.22-public` also replaces the old copy-success wording. This implementation removes that old handler and preserves its GitHub issue/Discussion destination inside `js/debrief.js`. The sibling branch's footer, performance-report text and DESIGN-comment changes should be retained when the lead integrates both branches. No merge, release or production publication is part of this PR.
