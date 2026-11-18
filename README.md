# Livloch

Canonical private repository for Livloch. No production deployment from this repo. Read `AGENTS.md` before changing anything.

A third-person lane game in the Saelion valley. The Reign keeps the lanterns lit, the Hush puts them out, and their paper troopers cancel each other on three threads until something asymmetrical happens. Solo against the Hush. WebGL (Three.js r128 from cdnjs), no build step.

## Where it is published

| Place | State |
|---|---|
| Claude artifact "Livloch" | current, 0.11 |
| https://stevoblevo.github.io/livloch/ | 0.6 live; 0.9 with every version waits on stevoblevo.github.io pull request 23 |
| saelion.co | not published |

## Run

Serve the folder with any static server and open `index.html`. Fonts and Three.js load from Google Fonts and cdnjs.

`node tools/test.js` runs the rule regressions. `node tools/soak.js` plays whole matches headless with all three Reign heroes on autopilot and prints win rates per difficulty. At 0.5 it gave roughly Gentle 6/6, Even 3/6, Cruel 0/6.

## Files

| File | What it holds |
|---|---|
| `js/core.js` | constants, lanes, heroes, items |
| `js/sim.js` | the whole match, headless: heroes, troopers, the Hush (hollows, thieves, red rain), souls, the Ness, creases and the fold, fruit |
| `js/gfx.js` | the WebGL scene, the six looks, bloom, the Inkblot cues |
| `js/audio.js` | synthesised sound in 31 equal steps |
| `js/input.js` | mouse and keyboard, touch, gamepad |
| `js/ui.js`, `js/main.js` | HUD, menus, the loop |
| `art/title.jpg` | the concept plate, cropped, used as the title screen |

## Versions

- 0.1 one-shot lane shooter, mirror teams
- 0.2 the loch, the Ness, the Greatness
- 0.3 four looks from the Saelion kits
- 0.4 renamed Livloch; the fold
- 0.5 the Hush as its own side; hero lore corrected
- 0.6 Cobalt Snow look from the concept plate; lantern houses; thread on the ground; bloom
- 0.6.1 fix: bullets, soul orbs and health-bar fills were invisible since 0.1
- 0.7 Inkblot Noir look with model-driven cues; red-rain warning; regression tests; evidence pass
- 0.8 fruit power-ups: lemon, rose hips, Verde Limón little and big; design comments in every source file; `docs/PLAN.md`
- 0.9 views become a mechanic: view-bound rare fruit and moods before the red rain; concept plates filed in `docs/concepts/`
- 0.10 Ever Fallen mode, Lean Back modifier, Rainwake and Memory views, the Cabinet (easter eggs, Snuff, concept plate gallery)
- 0.11 paper heroes: Dora is a painted cutout made from a turnaround sheet (`tools/sheet.py`)

## Known gaps

- No human has played a full match on desktop or with a controller. Phone only, once, at 0.1.
- Sound has never been heard by anyone. It has been measured (`docs/evidence/audio-signal.txt`), which is not the same.
- Real-device frame rate with bloom is unmeasured.
- Balance is tuned against bots only. Losses cluster after the second red rain.
- The Hush does not use the fold. Thread tuning, the Delve and look-bound secrets are designed, not built.
- Art is primitives. No licence or generator is recorded for the concept plate.

## Records

- `docs/PLAN.md`: **start here.** Where the game is, what is next, who can do it
- `docs/IMPORT.md`: where each version came from, and rollback steps
- `docs/ISSUE-3-REPORT.md`: what was tested, seen, measured, and what is still unverified
- `docs/experiments.md`: four Peachfall ideas sized as separate experiments
