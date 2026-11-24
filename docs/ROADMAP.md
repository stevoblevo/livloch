# Roadmap: toward the best-looking and most fun Livloch

Written 18 November 2026 at 0.17, at the owner's request; updated 23 November at 0.21, when the repository went public. Phases are in order; each ends at a gate the owner judges. Versions are targets, not promises. Art phases move at the speed the painted sheets arrive.

The two tests for everything here:
- **Fun:** would the owner finish a match and start another?
- **Looks:** does a frame look like the key art (`art/card.jpg`)?

## Open to everyone
Since 0.21 anyone can work on this roadmap, person or agent: steps marked as agent work, and the issues linked below, are open (see `CONTRIBUTING.md`; agents start at `AGENTS.md`). Feel reports from people who are not the owner count as evidence toward every gate. The gates themselves stay the owner's to judge.

## Phase 1. Worth finishing (now)
The owner played and did not want to finish a match. Fix that before anything else.

| Version | What | State |
|---|---|---|
| 0.16 | Goals: one thing to do next, with pay | Done |
| 0.17 | **First Rain:** a six-minute match that ends when the first rain ends and counts five stars. It is where the title now starts | Done |
| 0.18 | Feel: what a shot, a hit and a kill look and sound like; camera kick; the hero's shooting pose once the arm sheets arrive | Aim pose done (0.18); motion pass done (0.19, 0.20); shot, hit and kill feel next (#38) |
| 0.19 | Rewards you can see: stars and goals unlock things worn or carried (a scarf colour, a lantern trail), not only numbers | |
| 0.20 | Tune against the agreed target: Even winnable with two of the five lessons, Cruel only with four | |

**Gate:** the owner finishes three First Rains in a row by choice, and says which star was most fun to earn.

Anyone can help this phase without code: [feel reports](https://github.com/stevoblevo/livloch/issues/new?template=feel.yml), frame-rate reports from real devices (#25), listening to the 0.21 score (#26), touch controls on a real phone (#37), and the human matches in #7.

## Phase 2. Looks like the key art (as sheets arrive)
| Step | What | Waiting on |
|---|---|---|
| A | Lantern houses painted (**done, 0.18**); Hush towers | Sheet B (#35) |
| B | Troopers, hollows, small ones painted, with legs that walk | Sheets C to F (#35) |
| C | The backdrop: a painted far ridge is in (0.19, from the Ford study). The castle and floating islands still need painting G | Painting G |
| D | Myra Belle, Skein Doll (**done, 0.18**); the Ness, pines, rocks | Sheets K to M |
| E | Heroes' arms swing and aim (**done, 0.18**; shoulder positions want the owner's eye) | |
| F | Geometry per view: Origami re-cut into facets and folds; Knight Night as paper-theatre flats; ridgelines for the Depthfield views | Nothing; agent work |
| G | The HUD redrawn from the plates: lantern-shaped ability slots, the quest line as on the Skeptic Noir plate | Nothing; agent work |
| H | Ground and water: painted textures instead of flat colour; the loch reflects. The shader loch and ground growth are in (0.20); the ground beside the threads is still plain (#29) | One ground texture sheet |

Open issues from the 0.20 review: the ground beside the threads (#29), the moon (#30), Reign trooper backs (#31), hollows from behind (#32), Origami blossoms (#33), heroes graded per view (#34), the title fading into the live valley (#36), art slots for fruit bushes, strays and cranes (#39).

**Gate:** three screenshots (a fight, the loch, a house under attack) that the owner would post without apology.

## Phase 3. Paint with time
| Step | What |
|---|---|
| A | Echo is built (0.14). Tune it after Phase 1's gate |
| B | The loop: what is placed on a beat of the 24-second wave recurs on that beat until painted over |
| C | Depthfield as a view: depth on screen is time; the next 30 seconds drawn as ridges |
| D | Paths painted in one view are real in another (the fifteenth mode) |

**Gate:** the owner can explain the loop to someone else in one sentence after playing it.

## Phase 4. Depth
The guardian fox from PR #6 is in since 0.19 as a built low-poly fox with a trot; a painted fox sheet would replace it.
The fox is in every piece of key art sent on 18 November and the poster names it ("Guardian Flow: pets, helpers and more"), so it belongs to Livloch and comes first here. Then: the Hush folding back, a second valley, the radial view toggle, and the co-op decision. Order to be set after Phase 1's gate; some of these may belong to Reignfawn.

## Phase 5. Ready for strangers, then Steam
1. Five people who are not the owner play First Rain without help; write down where each got lost. The feel report form collects exactly this.
2. A desktop build (a web wrapper), full controller support, a settings screen, saved progress.
3. A trailer cut from Dreamwalk footage, a store page, the key art as capsule art.
4. Legal and attribution check on every picture and sound: who made it, with what, under what terms. Since 0.21 `ASSETS.md` sets the terms (code MIT; art, music and names reserved) and lists what is on record; for the concept plates and key art the generator and terms are still unrecorded (`docs/concepts/README.md`).

**Gate:** three of the five strangers start a second match unprompted.

## What could change this order
- If First Rain does not hold the owner either, Phase 1 repeats with a different idea before any art lands.
- If painted crowds cost too much frame rate on a phone, Phase 2B falls back to painted houses and heroes only.
- If the paper look is rejected once houses and crowds are in, Phase 2 restarts on 3D models (`docs/PLAN.md`, art pipeline).
