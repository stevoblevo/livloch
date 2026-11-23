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
| 0.12 | **Views are drawn differently, not just coloured differently.** The final render pass gives each view its own hand, taken from the three style kits: ink hatching (Skeptic Noir), flat origami with drawn folds and a watercolour bedtime page (Storeybrook), zine neon (Hypermetapunk), lantern pools (Depthfield night), a sepia ledger, wet glass | `release/0.12` |
| 0.13 | **Slots for painted art.** Structures, troopers, hollows, small ones, the Ness, trees, rocks and a far backdrop can each be replaced by a painted cutout by adding one line. Nothing looks different until the pictures arrive | `release/0.13` |
| 0.14 | **Echo and Dreamwalk.** Echo replays your last seconds beside you (C, or the Echo button). Dreamwalk is Lean Back with the hands played too: it names each hidden thing the first time it happens and asks at the end what to keep, change or cut. Anna painted. Source sheets and capture scripts moved into the repo | `release/0.14` |
| 0.15 | **Painted heroes walk.** Each cutout is split at the hem into a body and hinged legs: legs scissor in the side view and lift in turn from front and back; the body rides the step | `release/0.15` |
| 0.16 | **A reason to keep playing.** The owner played and did not want to finish a match. Goals: one small thing to do next is always on screen, each pays souls, and the list walks through the hidden systems. Always-open links to Everfallen, AND SO, Reignfawn, kk and the Peachfall on the title. A frame-rate report in the pause screen | `release/0.16` |
| 0.17 | **First Rain.** A six-minute match scored in five stars, now the default on the title. The roadmap is in `docs/ROADMAP.md` | `release/0.17` |
| 0.18 | **The valley is painted.** All four heroes are painted cutouts. Motion sheets give them armless bodies, arms that swing and an aiming pose. The Reign's three houses are painted. New key art in the gallery, the two concept videos in the Cabinet, the animatic's line on the title | `release/0.18` |
| 0.19 | **Motion.** A shared motion rig (`js/motion.js`, started from the Lantern Ford study's) drives every painted hero and the fox by distance walked. A change of view is a paper card turning over, not a pop; views have hysteresis; heroes squash on landing, stretch going up, lean across the screen into their movement and shift weight foot to foot. Soft contact shadows under heroes, troopers, thieves and houses. The camera's follow height and wall pull-in ease. Troopers squash at each hop. The guardian fox from PR #6, with a trot. The painted far ridge and a snow grain from the Ford study; night pines in Cobalt Snow. Dreamwalk now shows the view its director picks (issue #7) | `release/0.19` |

## Where it stands
| Thing | State |
|---|---|
| Rules | 22 regression tests pass (`node tools/test.js`) |
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

**Done:** Dora, Anna, Myra Belle, Skein Doll (turnaround and motion sheets, `tools/motion.py`), and the Reign lantern houses. **Slots built and tested with stand-ins (0.13), waiting on pictures:** lantern houses, Hush towers, both troopers, hollows, small ones, the Ness, pines, rocks, the far backdrop. File names, cell order and the one line to add are in `art/flats/README.md`. **Heroes:** all four done. **No slot yet:** fruit bushes, the strays, the fold cranes.

**Order the owner is having them painted** (by screen area): houses and towers, the four crowd figures, the backdrop, the other heroes, the Ness, scenery.

**Walking (0.15):** the renderer cuts each hero picture at `hem` (set per hero in `PAPER`) into a body and legs and swings the legs. No extra art needed. Arms are still fixed in the A-pose; moving them needs an arms-off sheet (see the prompt in the project chat). `tools/shots/walk.js` captures the stride.

**Limits to be honest about:** arms do not move, there is no shooting or hit pose, they look flat from directly above, and they ignore the views' recolouring, so Dora looks the same in every view. If that last one matters, the fix is a tint per view.

**3D later, if wanted:** glTF models through `GLTFLoader` with the cutouts as fallback. Only worth it if the paper style is rejected after play.

## Motion (0.19)
Owner, 23 November: "motion is currently subpar". What changed and where:
- `js/motion.js`: one rig, `create()` and `pose(rig, unit, dt, t, reduced)`. Stride phase is distance over a per-hero stride length, so feet do not slide. Aim rises in a frame and lets go over about a third of a second. Landing gives a squash value that decays; vertical speed gives stretch; turning gives roll. Tested in `tools/test.js`.
- Paper turn: in `R.frame`, a change of painted cell narrows the cutout to an edge, swaps the picture at the midpoint and opens again (0.15 s; 0.09 s for the aim pose). Reduced motion swaps instantly.
- Shadows: `shadowBlob` per hero and fox; one instanced mesh (`shadowI`) for troopers, thieves and structures.
- Camera: only the follow height and the wall pull-in are smoothed. Yaw and pitch are never smoothed, so aim stays exact.
- `tools/shots/motion.js` records a scripted walk, turn, jump, burst and camera orbit frame by frame; that is how motion is checked here.
Not done: cutouts still have no knees or elbows; troopers are still built shapes until their sheets arrive.

## Views and the style kits
The owner's note on 0.11: "every view is the same, just a different colour scheme". True then. Since 0.12 the last render pass (`mComp` in `js/gfx.js`, uniform `m`) draws each view its own way. The kits are on `saelion.co/toolkit`: **Storeybrook** (paper, watercolour, pages, origami, comic, stickers), **Depthfield** (layered ridges, glass, weather, a ledger in the dark), **Hypermetapunk** (dusk, chrome and neon, tape, stamps, zine).

Still the same under every view: the shapes. The next step is geometry per view, in this order: Origami re-cuts the world into flat facets and visible folds; Knight Night stands everything up as paper-theatre flats with footlights; Depthfield views get layered ridgelines behind the valley; Hypermetapunk gets tape, stamps and sticker labels on the HUD. Lighter graphics turns the drawing pass off, so the views fall back to palettes there.

## Why a match was not worth finishing (owner, 18 November)
The owner's words: "not enticing enough to complete a whole match yet". Working theory, to be tested by asking where he stopped: nothing on screen said what to do next or what he would get for it, a match is 15 to 20 minutes with no ending in sight, and the interesting systems were hidden too well. Answers so far: goals (0.16). Candidates next: a short match that ends at the first rain with a score; a visible sense of the patron's danger; rewards that change how the hero looks or plays, not just numbers.

## What the player should learn without being told
Agreed with the owner on 18 November. In the order they should be found; each makes the one before it cheaper.
1. Equal force cancels. Progress comes only from breaking symmetry.
2. The world keeps time: 24-second waves, five-minute rain, fruit regrowing. Arriving at the right moment beats arriving with more.
3. Looking is an action: change the view and different things exist.
4. Distance is not fixed: threads carry you, the fold moves a lane.
5. You cannot keep everything lit.

**Balance target that follows:** winnable on Even with two of these, on Cruel only with four. Nothing has been tuned against it yet.

## Painting with time
The five coordinates already in the game are where (two), height, when, and which view. Steps, cheapest first: **Echo** (built, 0.14); **the loop**, where whatever is placed on a beat of the 24-second wave recurs on that beat until painted over; **Depthfield as a view**, where depth on screen is time and the next 30 seconds are drawn as ridges; **cross-view paths**, painted in one view and real in another (the fifteenth mode on the plates).

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
