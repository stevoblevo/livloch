## What this changes

<!-- One topic per pull request. Say what a player would notice, then what changed in the code. Link the issue: "Closes #12". -->

## Evidence

<!-- Use the project's words for claims (AGENTS.md). Keep the four apart; leave a line empty rather than stretch it. -->

- **Tested:** <!-- commands you ran and what they printed, e.g. "node tools/test.js: 28 passed, 0 failed" -->
- **Seen in frame:** <!-- committed or attached screenshots and clips, and which view, mode and device or renderer made them -->
- **Measured:** <!-- numbers from a tool (frame rate, draw calls, bot win rates), and what that tool cannot show -->
- **Unverified:** <!-- everything else: feel, real-device frame rate, how it sounds, how a person plays it -->

## Screenshots or clips

<!-- Anything visual needs a picture. Before and after, from the player camera, is best. Headless captures are fine if you say so. -->

## Checklist

- [ ] `node tools/test.js` passes
- [ ] `for f in js/*.js tools/*.js; do node --check "$f"; done` is quiet
- [ ] The model still never reads the renderer: no `document`, `window`, `LL.gfx`, `LL.ui` or look references in `js/core.js` or `js/sim.js`
- [ ] A new rule in `js/sim.js` comes with a test in `tools/test.js`
- [ ] Views checked (tick what you looked at):
  - [ ] Cobalt Snow
  - [ ] Inkblot Noir
  - [ ] Lantern Night
  - [ ] Knight Night
  - [ ] Origami
  - [ ] Hypermetapunk
  - [ ] Rainwake
  - [ ] Memory
  - [ ] Lighter graphics on
  - [ ] Reduced motion on
- [ ] New pictures, music or sound say where they came from, and follow [`ASSETS.md`](https://github.com/stevoblevo/livloch/blob/main/ASSETS.md)
- [ ] Docs that describe what I changed are updated (`README.md`, `docs/ARCHITECTURE.md`, `art/flats/README.md`, `docs/DORA.md` ...)
- [ ] No secrets, private details or email addresses in the diff

## Made by

<!-- A person, an agent, or both. Agents: name yourself and your model, and the branch (agent/<name>/<topic>). -->
