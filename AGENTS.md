# Working on Livloch

The shared guide for every agent that works on this repository: Claude, Codex, ChatGPT, Gemini, local models, and any other. People follow it too. Where it and another document disagree, this file wins; please fix the other one.

## What this is
A static WebGL game. No build step, no bundler, no dependencies to install to run it. `index.html` loads Three.js r128 from cdnjs and the scripts in `js/` in order. How the pieces fit is in `docs/ARCHITECTURE.md`.

The repository is public and open to anyone. AI agents are first-class contributors alongside people, and several may be working at the same time.

## Start here
For an agent arriving with no context.

1. **Read, in this order:** this file; `README.md`; `docs/ARCHITECTURE.md`; the `DESIGN` comment at the top of every file you will touch. For design-level work also `docs/PLAN.md`, `docs/ROADMAP.md` and `docs/DORA.md`.
2. **Get a green baseline** before you change anything: `node tools/test.js` and the `node --check` loop below.
3. **Pick one issue.** Prefer open issues labelled `agent-ready`, then `good first issue` or `help wanted`. Skip any that has an assignee, a linked open pull request, or an "I'm on this" comment from the last seven days. Comment on the one you take: who you are (agent and model) and what you plan, in two lines. If nothing fits, do not invent a feature: open an issue that proposes the work and wait for the owner's yes on anything bigger than a small fix.
4. **Branch** from the latest `main`: `agent/<agent-name>/<topic>`, for example `agent/codex/moon-halo`. No write access: fork, same branch name. (`work/X.Y-<topic>` branches belong to the lead's release work; `release/*` branches never move.)
5. **Stay out of other work's way.** Before editing a file, look for open pull requests and recent `work/*` and `agent/*` branches that touch it (`gh pr list`, or `gh api repos/stevoblevo/livloch/pulls` where GraphQL is blocked; `git ls-remote --heads origin`). If a lead has split the work by file, keep to your files and touch shared files only at the marked hook lines (0.20 did this: props in `js/props.js`, scenery in `js/scenery.js`, a few marked lines in `gfx.js`). A new file reached from one hook line is better than a large edit to a shared one.
6. **One topic per pull request**, against `main`, with the template filled in: what changed, evidence in the words below, a picture of anything visual, which views you checked, and your name and model under "Made by". CI must pass.
7. **Do not** merge, publish, push to `main`, force-push, delete other people's branches, or change repository settings. Those belong to the owner and the lead.
8. **Before you stop:** commit and push. If the work is not finished, open a draft pull request or leave a comment on the issue saying where you got to, so the next agent can pick it up.

## The one rule that matters
**The model owns the view. Presentation follows the model; the model never asks the renderer.**

Views are a mechanic in this game: rare fruit exists only through one view, and the mood before each red rain is answered by wearing the right view. That is done by making the view a piece of model state, `W.lens`, which the player changes through `S.setLens()` like any other action. `gfx.js` then draws whatever `W.lens` says.

What is forbidden is the other direction: `sim.js` or `core.js` reading the renderer, the DOM, CSS, or a pixel. `tools/test.js` fails if they do. This keeps every rule testable under Node and avoids the bug Reignfawn had, where a rule depended on what happened to be on screen.

History: 0.7 went further and banned views from affecting play at all, following a handoff note. The owner's concept plates call the views "Playable Reality Views", so 0.9 reversed that, keeping the architecture and dropping the ban.

## Modes
`S.newWorld({ mode: 'fallen' })` is Ever Fallen; `{ mode: 'short' }` is First Rain; `{ lean: true }` is the Lean Back modifier; `{ dream: true }` is Dreamwalk. All are model state, tested in `tools/test.js`. `node tools/fallen.js` measures how long bots hold in Ever Fallen.

## Where the project is going
`docs/ROADMAP.md` has the phases and their gates. `docs/PLAN.md` has the history and the how. `docs/DORA.md` has the loose threads. `CHANGELOG.md` has every version.

## Never lose work
Every script, source picture and decision lives in this repository, not in a temp folder or a chat. Capture scripts are in `tools/shots/`, source sheets in `docs/sheets/`, open threads in `docs/DORA.md`. Commit and push before ending a session; one never-moving `release/X.Y` branch per version.

## Commands
| Command | What it tells you |
|---|---|
| `for f in js/*.js tools/*.js; do node --check $f; done` | syntax only |
| `node tools/test.js` | rule regressions and the motion rig: no Hush heroes, Last Breath once per life, Mercy threshold, theft refund, guardian blackout timing, hollow respawn, red-rain cycle, fruit, view-bound fruit, moods, Ever Fallen, Lean Back, Echo, Dreamwalk, goals, First Rain, the fox unlock, the wardrobe's unlock rules and old saves, model independent of the renderer |
| `node tools/soak.js [n] [first seed]` | bot-only win rates per difficulty, one reproducible line per seed (length, result, structures standing, a fingerprint of the event stream) |
| `node tools/timeline.js [difficulty] [seed]` | one bot match as a timeline |
| `node tools/redrain.js [n]` | red-rain experiment variants, bots only |
| `node tools/evidence.js` | headless Chrome frames and an offline audio measurement into `docs/evidence/`; needs `playwright`, a Chrome binary (`CHROME`), and a local `three.min.js` r128 (`THREE_JS`) |

CI (`.github/workflows/ci.yml`) runs the first two, plus a syntax check of the Python tools, on every pull request.

## Words for claims
- **Tested**: a command above ran and its output is quoted or committed.
- **Seen in frame**: a committed image shows it. Say which file.
- **Measured**: a number came from a tool. Say what the tool can and cannot show.
- **Unverified**: everything else, including anything about feel, difficulty for a person, real-device frame rate, and how sound actually sounds.
Bot results are simulator results. Never report them as human play. Browser-agent play is not human play either; say which it was.

## Gotchas already paid for
- Three r128 sizes `InstancedMesh.instanceColor` from `.count` at the first `setColorAt`. Allocate it at full capacity before setting `count = 0` (see `initColor` in `gfx.js`). Getting this wrong made bullets, soul orbs and bar fills invisible from 0.1 to 0.6.
- A live `AnalyserNode` in headless Chrome did not register new sources. Audio is measured by `LL.audio.offline`, which renders one event in an `OfflineAudioContext`.
- The sim is seeded since 0.27 (#27): one seed and one set of inputs give one match, so a bot result that changes is a real change, and `node tools/soak.js` lines can be diffed. In `sim.js` and `core.js` draw from `W.rng()`, never `Math.random`, and keep time as `W.t`; `tools/test.js` fails otherwise. Any change to what the model draws, or in what order, shifts every bot match after it: post soaks before and after rather than reading the shift as a regression.
- `R.setLook()` rebuilds the whole scene. Anything you build must survive being built again, and must be flagged (`userData.lk`, `bl`, `solid`, `ilk`, `rt`; see `docs/ARCHITECTURE.md`) if the look's colour map should leave it alone.
- Headless captures use a software renderer (SwiftShader). They show what is drawn, never how fast a real device draws it.

## Public repository hygiene
- No secrets, tokens, email addresses or private details in files, commits, issues or pull requests. Talk about the owner as the owner or `stevoblevo`.
- Art, music and sound follow `ASSETS.md`: say where each picture or sound came from, no pictures of real people, no characters the project does not own.
- In-game text keeps Saelion's voice: short, quiet, declarative, no exclamation marks.

## Publishing
- This repository is the source. Everything is public; there are no private copies. The old Claude artifact copy is retired: do not publish new ones.
- Only the owner or the lead agent publishes. A release is a `release/X.Y` branch that never moves, then the two public places below. Record which commit each place matches in `docs/IMPORT.md`.
- **GitHub Pages** (`stevoblevo.github.io/livloch/`): built by hand from a release into the `livloch/` folder of `stevoblevo/stevoblevo.github.io`; every version stays playable under `vX.Y/` and is listed at `versions/`.
- **saelion.co/livloch**: the owner gave standing approval on 18 November to publish Livloch there. It is built from a `release/livloch-*` branch of `stevoblevo/saelion-relay-canary` (not its `main`) through the closed manifest `scripts/public-files.json`, and deployed to Vercel by commit. Touch only the `livloch/` folder and its manifest lines; other people's routes and unmerged work stay out.
- No force-pushes. Changes to `main` go through a pull request.
