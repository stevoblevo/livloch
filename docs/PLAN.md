# Livloch: plan and timeline

Read this first. It says where the game is, what is next, and who can do each thing. Rules for working are in `AGENTS.md`. Proof for anything marked done is in `docs/ISSUE-3-REPORT.md` and `docs/evidence/`.

## What we are making
A solo (later co-op) lane game where **the stalemate is the puzzle**. Paper troopers cancel out on three threads. The player breaks the tie with clever, mostly unexplained means: folding the valley, fruit, the loch, and more to come. Not a competitor to Deadlock; no PvP is planned.

Art target: `art/title.jpg`. Folded paper lit by lanterns on a snow night.

## Timeline so far
All of this happened 15 to 17 November 2026.

| Version | What changed | Where it lives |
|---|---|---|
| 0.1 | One-shot lane shooter with mirror teams | artifact history only |
| 0.2 | The loch, the Ness, the Greatness; 20-minute hard end | artifact history only |
| 0.3 | Four looks from the Saelion kits | artifact history only |
| 0.4 | Renamed Livloch; the fold | `release/0.4` |
| 0.5 | The Hush as its own side; hero lore corrected | `release/0.5` |
| 0.6 | Cobalt Snow look from the concept plate; lantern houses; thread on the ground; bloom | `release/0.6` |
| 0.6.1 | Fix: bullets, soul orbs and bar fills had never drawn | `release/0.6.1` |
| 0.7 | Inkblot Noir look with cues; red-rain warning; rule tests; evidence pass | `release/0.7` |
| 0.8 | Fruit: lemon, rose hips, Verde Limón little and big; design comments; this plan | `release/0.8` |
| 0.9 | **Views become a mechanic.** The view is model state. Big fruit is the rare tier and each exists only through one view. A mood before each red rain is answered by wearing the right view, which thins the rain | `release/0.9` |
| 0.10 | **Two ways to play, and a cabinet.** Ever Fallen mode (already lost; recover lights; survive). Lean Back modifier (hero plays itself; you keep the view, the thread, the fold). Two views with a price: Rainwake and Memory. The Cabinet: ten easter eggs opened by feats, with doors to other Saelion worlds, a mini game (Snuff) and the concept plates. Fixes a 0.9 crash when a mood landed on the view already worn | `release/0.10` |
| 0.10.1 | Keys shown on screen for keyboard play (the captured mouse made the buttons unclickable) | `main` |
| 0.11 | **Paper heroes.** A hero can be a painted cutout made from a turnaround sheet; Dora is the first. `tools/sheet.py` turns a sheet into a sprite. Key art added to the gallery and used as the share card | `release/0.11` |

## Where it stands
| Thing | State |
|---|---|
| Rules | 19 regression tests pass (`node tools/test.js`) |
| Ever Fallen | Bots hold about 14:00 on Gentle, 11:50 on Even, 9:40 on Cruel, recovering 7 to 23 lights (`node tools/fallen.js`). No person has played it |
| Bots | Gentle 6 of 6, Even 4 of 6, Cruel 0 of 6 Reign wins. Bots never die, which flatters the Reign. Bots never change the view, so they never get rare fruit or a thin rain, which flatters the Hush |
| Human play | **One phone session, at 0.1, with invisible bullets.** Nothing since |
| Sound | Measured, never heard |
| Real devices | No frame-rate data |
| Published | Claude artifact is current. GitHub Pages and `main` wait on pull requests. saelion.co untouched |

## The gate before anything else
**A person plays one full match on desktop and one on a phone, with sound, and writes down what happened.** Every item below is a guess until then. Only the owner can do this.

What to write down: did you change the view, and did the mood line tell you which one; was it clear what to shoot; did movement and firing feel good; when did it get boring or unfair; did you find the fold, a fruit, the Ness without being told; how did it sound.

## Next, in order
Each step is one version. "Agent" means a coding agent can do it alone. "Person" means it needs the owner.

| # | Version | Work | Who | Done when |
|---|---|---|---|---|
| 1 | n/a | Play test above | Person | Notes exist |
| 2 | 0.9 | Fix what the play test finds. Expect shooting feel first: hit reactions, recoil, camera kick, clearer hits | Agent, from the notes | The same person says it is better |
| 3 | 0.10 | Second red rain. The mood now removes the extra hollows for a player who answers it, which is where bot data said the collapse comes from. Check that a person who solves the mood can hold at 10:00 on Cruel; only then touch numbers | Person, then Agent | Cruel is winnable by a person who answers moods and uses the fold or the Greatness, and not by bots |
| 4 | 0.11 | Thread tuning: each thread has a pitch in 31 steps; ringing a consonant interval on it strengthens your troopers there. Model rule plus test first, then sound, then a hint | Agent | Test passes; a person finds it within three matches or the hint is wrong |
| 5 | 0.12 | The Hush folds on Cruel, and thieves can be bribed with a fruit ("meet, don't take", see `docs/experiments.md`) | Agent | Tests; person confirms it reads as a rule and not a bug |
| 6 | 0.13 | Give every view one purpose, from the mode table below. Then a radial toggle instead of cycling | Agent | One test per view; a person can say what each view is for |
| 7 | 1.0 candidate | Second valley (Peach Dusk or Red Rain), a between-valleys screen, save of valleys kept | Agent | Two valleys playable start to end |
| 8 | n/a | Decide engine and art pipeline for anything beyond a browser prototype. Needs real art; code cannot paint the plate | Person | A written decision |

Do not start 4 to 7 before 1 and 2. They add secrets to a game nobody has yet confirmed is fun to move and shoot in.

## The fifteen modes
From the concept plates (`docs/concepts/`). The plates name each mode and hint at its purpose. Six exist as views. "Purpose built" means a rule in `sim.js`, not just a palette.

| Plate name | Hint on the plate | In the game as | Purpose built |
|---|---|---|---|
| Storybook (Classic) / Dawnvale | Warm, story default | Cobalt Snow (default) | Home view; nothing special |
| Moonlit | Cool, clarity | Knight Night | Big Rose hips exist here. Answers one mood |
| Whiteout (Paper) / Snowbound | Quiet, high contrast | Origami | Big Lemon exists here. Creases are plain. Answers one mood |
| Threadspace (Wire) / Threadline | Wireframe, hidden structure | Hypermetapunk | Big Verde Limón exists here. Answers one mood |
| Inkblot | Negative space, doubt | Inkblot Noir | Shows thief routes and which structures can be hurt. Answers one mood |
| Rainwake (Red Rain) | the red rain | Rainwake | Souls worth half again while the rain is red. Shows the time to the next rain. Answers one mood |
| Memory | Echo overlays | Memory | Ten-second trails behind small ones and hollows. Lights hold twice as long, dark passes twice as fast, souls worth half. Answers one mood |
| Emberdusk | Cinematic, ominous | Lantern Night, roughly | Answers one mood |
| Watercolor, Prism, Depthfield 5D, Retrovision (Comix), Dreamwalk, Hush (Counter), Silentworld (Muted), Negative, Starlit | various | not built | none |
| Ætherweave, the Fifteenth Mode | Paint paths, weave time layers, reveal hidden relations, seed a new valley | not built | none |

Good next purposes, straight from the hints: **Memory** shows where things were ten seconds ago (the "ghost of the recent state"); **Hush (Counter)** shows the world as the Hush sees it, what it will take next; **Rainwake** is the only view in which the red rain can be read ahead of time.

## Modes and the cabinet (0.10)
- **Ever Fallen** is this game's reading of the name. The Everfallen pages on saelion.co and GitHub Pages hold no rules to follow, so nothing here claims to be canon. Rules live in the DESIGN header of `js/sim.js`.
- **Lean Back** borrows its line from `saelion.co/kk`: "a watch, not a wall". It is the one-thumb way to play on a phone.
- **The Cabinet** is data in `js/core.js` (`LL.CABINET`, `LL.PLATES`); feats are awarded in `js/main.js` (`feats`), and only to a person, never while the valley is just being watched. Five taps on the word Settings in the pause screen reveals a switch that opens everything.

## Art pipeline: paper first
The valley is paper, so its people can be paper. Since 0.11 a hero can be a flat painted cutout that always faces the camera and shows the view that matches where the camera stands (`PAPER` in `js/gfx.js`). This needs no 3D modelling at all.

**To add a painted character**
1. Get a turnaround sheet: four views in a row on a flat mid-grey background (front, left side, back, three-quarter), feet on one baseline. The prompt that produced Dora's is in the project chat; the owner has ChatGPT drawing the other twelve.
2. `python3 tools/sheet.py SHEET.png art/heroes/NAME.png`
3. Add `NAME: { src: 'art/heroes/NAME.png', h: HEIGHT }` to `PAPER`. If the file is missing or fails to load, the built shapes are used.

**Done:** Dora. **Waiting on sheets:** Anna, Myra Belle, Skein Doll. **Then, same method extended to non-heroes** (needs a small renderer change each): troopers and hollows as instanced cutouts, the Ness, lantern houses and Hush towers as standing flats, trees, rocks and bushes.

**Limits to be honest about:** cutouts have no limbs to animate (they waddle and lean), they look flat from directly above, and they ignore the views' recolouring, so Dora looks the same in every view. If that last one matters, the fix is a tint per view.

**3D later, if wanted:** glTF models through `GLTFLoader` with the cutouts as fallback. Only worth it if the paper style is rejected after play.

## Standing rules
- The model owns the view; the model never reads the renderer. Tests enforce it. See `AGENTS.md`.
- One version, one branch `release/X.Y`, never moved. `main` changes only by pull request.
- Bot results are never reported as human results.
- Nothing is deployed to saelion.co from this repo.

## Open questions for the owner
1. Answered: big and little are tiers of strength and rarity. Built as little fruit (common, one hero) and big fruit (rare, whole side, one view each).
2. Should fruit be eaten by walking through it (built that way), or shot down first?
3. Co-op: same screen, or online later?
4. The plates show a fox companion, a quest tracker and Map, Hush, Pets, Craft, Mode buttons. Which of those belong in Livloch and which in Reignfawn?
