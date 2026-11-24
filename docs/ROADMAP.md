# Roadmap: toward the best-looking and most fun Livloch

Written 18 November 2026 at 0.17, at the owner's request; updated 23 November at 0.21, when the work went public, and 24 November at 0.25 (with 0.26 under way). Phases are in order; each ends at a gate the owner judges. Versions are targets, not promises. Art phases move at the speed the painted sheets arrive.

The two tests for everything here:
- **Fun:** would the owner finish a match and start another?
- **Looks:** does a frame look like the key art (`art/card.jpg`)?

## Open to everyone
Since 0.21 anyone can work on this roadmap, person or agent: steps marked as agent work, and the issues linked below, are open (see `CONTRIBUTING.md`; agents start at `AGENTS.md`). Feel reports from people who are not the owner count as evidence toward every gate. The gates themselves stay the owner's to judge.

## Where it stands (24 November, 0.25; 0.26 under way)
- **The heroes are 3D figures since 0.24.** The last line of "What could change this order" below came true: painted cards bending over the shoulder read as broken in the play camera ("it just looks dumb", the owner, 23 November), so the heroes were rebuilt as skinned 3D figures driven by the same motion rig. "Yes to motion. Much better" (the owner, 0.24). Troopers, hollows and props were already built shapes; painted sheets still serve the cards, the Cabinet and the concept plates.
- **The owner plays it with sound on** and says it is not yet appealing enough for heavy play. Phase 1's gate stands.
- **Five heroes since 0.25:** Dora, Anna, Myra Belle, Skye (the Skein Doll, named 24 November) and Rook Vale, the Wick Aviator (from the Lantern Ford study; copper and rose gold with copper sulfate teal since 0.26).
- **Not yet public as a repository.** The game is public (saelion.co/livloch, GitHub Pages) and everything is written to be open, but `stevoblevo/livloch` itself is still private: repository settings can't be changed by agents from here. The owner flips it in Settings, Danger zone, Change visibility.

## Phase 1. Worth finishing (now)
The owner played and did not want to finish a match. Fix that before anything else.

| Version | What | State |
|---|---|---|
| 0.16 | Goals: one thing to do next, with pay | Done |
| 0.17 | **First Rain:** a six-minute match that ends when the first rain ends and counts five stars. It is where the title now starts | Done |
| 0.18 | Feel: what a shot, a hit and a kill look and sound like; camera kick; the hero's shooting pose once the arm sheets arrive | Done: aim pose (0.18), motion (0.19 to 0.22.2), shot, hit and kill feel (0.23, #38), 3D heroes (0.24). Each gun its own shot and ammo picture: 0.26 |
| 0.19 | Rewards you can see: stars and goals unlock things worn or carried (a scarf colour, a lantern trail), not only numbers | Done: the wardrobe, 17 things (0.23) |
| 0.20 | Tune against the agreed target: Even winnable with two of the five lessons, Cruel only with four | **Open, and next.** The seeded sim it needed came in 0.27 (#27): a soak now prints the same lines every run, so a tuning change can be measured against the one before it on the same seeds. Still read a handful of seeds as a sample, not the truth |

**Gate:** the owner finishes three First Rains in a row by choice, and says which star was most fun to earn.

Anyone can help this phase without code: [feel reports](https://github.com/stevoblevo/livloch/issues/new?template=feel.yml), frame-rate reports from real devices (#25), listening to the 0.21 score (#26), touch controls on a real phone (#37), and the human matches in #7.

## Phase 1b. Moves worth mastering (0.25, 0.26)
The owner asked for this between Phase 1 steps: "jumping and double jump for some, short hanging flight for myrabelle. where rook?" (0.25), then "double jumps should provide some sort of blocking function" (0.26).
| Version | What | State |
|---|---|---|
| 0.25 | Each hero's own air move (Dora one jump, Anna's rock-hop, Skye's somersault, Myra's hanging flight); Rook Vale as the fifth hero with Lantern Lift; the camera rises with a jump | Done |
| 0.26 | Guards on the second jump (Anna's Athena shield, Dora's astral bubble, Skye's aetherial pass-through); thread boosts (a second jump along a thread) that charge Dora's hat throw and give Myra a heal boon; a flip for Rook; each gun's shot and ammo; the Ness as a 3D creature that chomps and floods the field | In progress (three agents) |

**Gate:** the owner reaches for a double jump in a fight because it saves him, not for show.

## Phase 2. Looks like the key art (as sheets arrive)
| Step | What | Waiting on |
|---|---|---|
| A | Lantern houses painted (**done, 0.18**); Hush towers | Sheet B (#35) |
| B | Troopers, hollows, small ones painted, with legs that walk | Sheets C to F (#35) |
| C | The backdrop: a painted far ridge is in (0.19, from the Ford study). The castle and floating islands still need painting G | Painting G |
| D | Heroes: all five are 3D figures (**0.24, 0.25**); the Ness as a 3D creature (0.26); pines, rocks | Nothing for heroes; Sheets K to M for the rest |
| E | Heroes' arms swing and aim (**done, 0.18**; shoulder positions want the owner's eye) | |
| F | Geometry per view: Origami re-cut into facets and folds; Knight Night as paper-theatre flats; ridgelines for the Depthfield views | Nothing; agent work |
| G | The HUD redrawn from the plates: lantern-shaped ability slots, the quest line as on the Skeptic Noir plate | Nothing; agent work |
| H | Ground and water: painted textures instead of flat colour; the loch reflects. The shader loch and ground growth are in (0.20); the ground beside the threads is still plain (#29) | One ground texture sheet |

From the 0.20 review, fixed: the ground beside the threads (#29, 0.25), Reign trooper backs (#31, 0.25), hollows from behind (#32, 0.25), heroes graded per view (#34, 0.24). Still open: the moon (#30), Origami blossoms (#33), the title fading into the live valley (#36), art slots for fruit bushes, strays and cranes (#39). Named weak spots since: faces small at play distance, cloth through a raised arm, Myra's legs hidden in the hover, hollows side-on in Inkblot Noir, Origami flowers at middle distance, Rook's paper fallback has no motion sheet.

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
- If the paper look is rejected once houses and crowds are in, Phase 2 restarts on 3D models (`docs/PLAN.md`, art pipeline). **Happened for the heroes at 0.24**, from the play camera, before houses and crowds were painted.
