# Working on Livloch

## What this is
A static WebGL game. No build step, no bundler, no dependencies to install to run it. `index.html` loads Three.js r128 from cdnjs and the scripts in `js/` in order.

## The one rule that matters
**The model owns the view. Presentation follows the model; the model never asks the renderer.**

Views are a mechanic in this game: rare fruit exists only through one view, and the mood before each red rain is answered by wearing the right view. That is done by making the view a piece of model state, `W.lens`, which the player changes through `S.setLens()` like any other action. `gfx.js` then draws whatever `W.lens` says.

What is forbidden is the other direction: `sim.js` or `core.js` reading the renderer, the DOM, CSS, or a pixel. `tools/test.js` fails if they do. This keeps every rule testable under Node and avoids the bug Reignfawn had, where a rule depended on what happened to be on screen.

History: 0.7 went further and banned views from affecting play at all, following a handoff note. The owner's concept plates call the views "Playable Reality Views", so 0.9 reversed that, keeping the architecture and dropping the ban.

## Commands
| Command | What it tells you |
|---|---|
| `for f in js/*.js tools/*.js; do node --check $f; done` | syntax only |
| `node tools/test.js` | rule regressions: no Hush heroes, Last Breath once per life, Mercy threshold, theft refund, guardian blackout timing, hollow respawn, red-rain cycle, fruit, view-bound fruit, moods, model independent of the renderer |
| `node tools/soak.js [n]` | bot-only win rates per difficulty |
| `node tools/timeline.js [difficulty] [seed]` | one bot match as a timeline |
| `node tools/redrain.js [n]` | red-rain experiment variants, bots only |
| `node tools/evidence.js` | headless Chrome frames and an offline audio measurement into `docs/evidence/`; needs `playwright`, a Chrome binary (`CHROME`), and a local `three.min.js` r128 (`THREE_JS`) |

## Words for claims
- **Tested**: a command above ran and its output is quoted or committed.
- **Seen in frame**: a committed image shows it. Say which file.
- **Measured**: a number came from a tool. Say what the tool can and cannot show.
- **Unverified**: everything else, including anything about feel, difficulty for a person, real-device frame rate, and how sound actually sounds.
Bot results are simulator results. Never report them as human play.

## Gotchas already paid for
- Three r128 sizes `InstancedMesh.instanceColor` from `.count` at the first `setColorAt`. Allocate it at full capacity before setting `count = 0` (see `initColor` in `gfx.js`). Getting this wrong made bullets, soul orbs and bar fills invisible from 0.1 to 0.6.
- A live `AnalyserNode` in headless Chrome did not register new sources. Audio is measured by `LL.audio.offline`, which renders one event in an `OfflineAudioContext`.
- The sim uses `Math.random` in a few places, so it is not deterministic for a given seed. Treat small differences between runs as noise.

## Publishing
- This repo is the source. The Claude artifact and `stevoblevo.github.io/livloch/` are hand copies of a tagged state; record which commit each one matches in `README.md`.
- Do not deploy to saelion.co or change its routing from here. That needs separate publisher authorisation through `stevoblevo/saelion-relay-canary`, as a candidate branch and pull request.
- No force-pushes. Changes to `main` go through a pull request.
