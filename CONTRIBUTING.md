# Contributing to Livloch

Welcome. Livloch is made in the open by its owner, a handful of AI agents, and anyone else who wants to help: people with or without a GitHub history, and agents of any make (Claude, Codex, ChatGPT, Gemini, local models). You do not need permission to start. Pick something below, say in the issue that you are on it, and go.

If you only have five minutes: [play a First Rain](https://saelion.co/livloch) and [tell us how it felt](https://github.com/stevoblevo/livloch/issues/new?template=feel.yml). That is the most useful thing anyone can do for this game right now.

## Ways to help

| You like ... | Do this | Start at |
|---|---|---|
| Playing | Play a match and write a feel report: where it was fun, where you stopped | [Feel report](https://github.com/stevoblevo/livloch/issues/new?template=feel.yml) |
| Your hardware | Send a frame-rate report from your phone, laptop or desktop (pause screen, "Copy the report") | [`performance` issues](https://github.com/stevoblevo/livloch/labels/performance) |
| Listening | Play with sound on and tell us what you heard. Almost nobody has | [`sound` issues](https://github.com/stevoblevo/livloch/labels/sound) |
| Fixing things | Take a bug, reproduce it, fix it with a test where the rule lives in the model | [`bug`](https://github.com/stevoblevo/livloch/labels/bug), [`good first issue`](https://github.com/stevoblevo/livloch/labels/good%20first%20issue) |
| Motion and feel | How the paper heroes run, turn, land and shoot; hit reactions; camera | [`motion`](https://github.com/stevoblevo/livloch/labels/motion), [`feel`](https://github.com/stevoblevo/livloch/labels/feel) |
| Drawing and painting | Painted sheets for towers, troopers, hollows, the Ness, trees; textures | [`art`](https://github.com/stevoblevo/livloch/labels/art), [`art/flats/README.md`](art/flats/README.md) |
| Music and sound | Listen and report first; then cues for the score, or effects for the synthesiser. [`docs/MUSIC.md`](docs/MUSIC.md) has the cues, the key and how they play | [`music`](https://github.com/stevoblevo/livloch/labels/music), [`sound`](https://github.com/stevoblevo/livloch/labels/sound) |
| Game design | New ways to break the stalemate, balance, levels | [`gameplay`](https://github.com/stevoblevo/livloch/labels/gameplay), [`balance`](https://github.com/stevoblevo/livloch/labels/balance), [Idea](https://github.com/stevoblevo/livloch/issues/new?template=idea.yml) |
| Writing | Docs, comments, clearer in-game lines | [`docs`](https://github.com/stevoblevo/livloch/labels/docs) |
| Languages | Translations, later: the game's text is not set up for them yet. Say hello in Discussions if you want to help set it up | |

Issues labelled [`agent-ready`](https://github.com/stevoblevo/livloch/labels/agent-ready) are written so a coding agent can do them alone: context, where in the code, what done looks like, how to check it. They are just as good for people.

## Before you start

1. Read [`README.md`](README.md), then [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) (how the code fits together) and [`AGENTS.md`](AGENTS.md) (the working rules; written for agents, binding for everyone).
2. Pick an issue, or open one for what you want to do. Comment "I'm on this" so two people do not build the same thing. If it has gone quiet for a week, it is free again.
3. For anything big (a new mode, a new dependency, a change to how a rule works), open an issue or a Discussion first and wait for a yes from the owner.

## Run it

```sh
git clone https://github.com/stevoblevo/livloch.git
cd livloch
python3 -m http.server 8000
```

Open <http://localhost:8000>. Any static file server works. The page loads Three.js from cdnjs and fonts from Google Fonts, so it needs a network connection. There is nothing to install and nothing to build.

## Test it

You need Node 20 or newer (CI uses 20).

| Command | What it tells you |
|---|---|
| `for f in js/*.js tools/*.js; do node --check "$f"; done` | syntax only |
| `node tools/test.js` | the rule regressions and the motion rig, about 20 seconds. Must pass |
| `node tools/soak.js [n]` | bot-only win rates per difficulty |
| `node tools/timeline.js [difficulty] [seed]` | one bot match as a timeline |
| `node tools/fallen.js [n]` | how long bots hold in Ever Fallen |

Bot results are simulator results. Never report them as how a person plays.

## Capture frames

Anything you change on screen needs a picture in the pull request. A screenshot from your own browser is fine; say which view, mode and device.

For repeatable captures, the scripts in [`tools/shots/`](tools/shots/) drive the game in headless Chrome through Playwright and write PNGs: walk cycles, fights, every view at one spot, scenery poses, draw-call counts. They need `playwright`, a Chrome binary and a local copy of three.js r128; the paths at the top of each script are from the machine they were written on. See [`tools/shots/README.md`](tools/shots/README.md). Headless frames use a software renderer: they show what is drawn, never how fast a real device draws it.

## The one rule: the model owns the view

`js/core.js` and `js/sim.js` are the game. They never read the renderer, the DOM, CSS or a pixel. Everything else reads them and draws, plays or shows what they say. The view the player wears is itself model state (`W.lens`), set through `S.setLens()` like any other action.

```js
// main.js: the player changes the view. The model is told; the renderer follows.
R.setLook('origami'); S.setLens('origami');

// sim.js: the rule reads the model only.
if (f.lens && f.lens !== W.lens) continue; // rare fruit exists for you only in its own view

// Never, in sim.js or core.js:
if (document.body.dataset.look === 'origami') { ... } // tools/test.js fails on this
```

Why: every rule can then be played to the end under Node and tested, and nothing depends on what happens to be on screen. More in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Say what you know, and how

Pull requests and reports use four words for claims, from [`AGENTS.md`](AGENTS.md):

- **Tested**: a command ran and its output is quoted or committed.
- **Seen in frame**: a committed or attached image shows it. Say which.
- **Measured**: a number came from a tool. Say what the tool can and cannot show.
- **Unverified**: everything else, including feel, real-device frame rate and how anything sounds.

"Looks better" with a before-and-after picture is a fine claim. "Feels better" is unverified until a person who played it says so.

## Workflow for people

1. Fork the repository and make a branch: `fix/moon-halo`, `art/hush-towers`, `feel/hit-flash`.
2. Make one change. Keep the pull request small enough to review in one sitting.
3. Run the tests. Take a picture of anything visual.
4. Open a pull request against `main` and fill in the template. CI runs the syntax checks and `node tools/test.js`.
5. Someone reviews it. Expect questions; they are not a no.

## Workflow for agents

Agents follow the same flow, plus a few rules that keep several of them from colliding. The full list is in [`AGENTS.md`](AGENTS.md#start-here).

- **Branch name:** `agent/<agent-name>/<topic>`, for example `agent/codex/moon-halo` or `agent/claude/trooper-backs`. Agents without write access fork and use the same name in their fork.
- **One topic per pull request**, linked to its issue. Do not bundle "while I was here" changes.
- **Evidence in the pull request:** the test output, frames for anything visual, and the four words above. Name yourself and your model under "Made by".
- **Check for parallel work** before editing a file: open pull requests and branches touching the same file. If one exists, pick something else or say in the issue how you will avoid it.
- **Never** push to `main`, force-push, or merge your own pull request. Never publish to saelion.co or GitHub Pages.

## What gets merged

- Small, focused changes that do what their issue says.
- `node tools/test.js` and the syntax checks pass. A new rule comes with a test.
- Nothing breaks another view. Look at Cobalt Snow and at least one other view (Origami and Hypermetapunk catch the most), and with Lighter graphics on if you touched the renderer.
- No build step, bundler or new runtime dependency without an agreed issue first. The game stays one folder you can serve as is.
- In-game text keeps Saelion's voice: short, quiet, declarative, no exclamation marks. It says what happened and what it costs.
- The lore notes at the top of `js/core.js` stay true (for example: Myra Belle is the round purple thread-keeper, not a bell; the Hush has no heroes).
- Frame rate matters: say what your change costs (draw calls, triangles, per-frame work) if it adds anything to the scene.

## How releases happen

The owner or the lead agent cuts a release: a `release/X.Y` branch that never moves afterwards, the version number on the title screen bumped, then publishing to [GitHub Pages](https://stevoblevo.github.io/livloch/) (every version stays playable under [`/versions/`](https://stevoblevo.github.io/livloch/versions/)) and to [saelion.co/livloch](https://saelion.co/livloch). Contributors never publish. What changed in each version is in [`CHANGELOG.md`](CHANGELOG.md).

## Art, music and sound

Contributions are welcome. In short (the full terms are in [`ASSETS.md`](ASSETS.md)):

- Only your own work, or work under a licence that allows this use. Say which.
- Say where it came from: by hand, with a tool (name it, and the prompt if there was one), recorded, synthesised.
- No pictures of real people. No characters you do not own.
- By opening a pull request that adds art or audio, you agree it may be used in Livloch under the project's terms. You keep your credit.

Where things go: hero sheets in [`docs/sheets/`](docs/sheets/) and their cut versions in [`art/heroes/`](art/heroes/); painted structures and crowds in [`art/flats/`](art/flats/) (slots and file names in its README); music in `art/music/`, with a row in [`docs/MUSIC.md`](docs/MUSIC.md). The pipeline from a sheet to a walking cutout is in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md#paper-heroes-from-sheet-to-screen).

## Licence

Code you contribute is under the [MIT licence](LICENSE), like the rest of the code. Art, characters, story, music and the names are covered by [`ASSETS.md`](ASSETS.md).

## Be kind

Everyone here follows the [Code of Conduct](CODE_OF_CONDUCT.md). Security problems go privately through the [Security tab](https://github.com/stevoblevo/livloch/security), as [`SECURITY.md`](SECURITY.md) explains. Questions and open chat: [Discussions](https://github.com/stevoblevo/livloch/discussions).
