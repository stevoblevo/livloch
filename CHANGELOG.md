# Changelog

Every version of Livloch, newest first. Each one from 0.4 on is a `release/X.Y` branch that never moves, and the published ones stay playable at [stevoblevo.github.io/livloch/versions/](https://stevoblevo.github.io/livloch/versions/). The reasons behind each step are in [`docs/PLAN.md`](docs/PLAN.md); where each was published is in [`docs/IMPORT.md`](docs/IMPORT.md).

## 0.28
**The painting opens into the valley, lessons 4 and 5 pay, and the HUD looks like the game.**

- **Title:** the title painting dissolves into the live valley. Walk in swings the camera down behind your hero and the HUD fades in, with the music carried through. The painting stays under reduced motion, Lighter graphics or a slow machine (#36).
- **HUD redrawn from the plates:** lantern ability slots lit in the hero's colour, a gold-framed map, a level medallion, the view's name, tints per look, and a new layout for phones on their side. The phone mute button no longer covers the hero cards.
- **New rules:**
  - **Arrival:** a long ride toward the front lands as a blow.
  - **The fold catches:** a folded thread is shut to the Hush, crumples small ones and pins a hollow.
  - **A light from home:** a hero mended at the fountain carries a light that relights and speeds a hurt house.
  - **The slack thread:** three times a match, the most worn thread goes slack, its houses stop firing and a rider can take the far house.
- **Balance:** knowing to ride and fold the threads (lesson 4) is now worth a win on Cruel (52% to 69%). Quiet stretches are about a minute shorter. Gentle buildings are a little tougher.
- **Readability:** bigger, clearer faces at play distance; the owl now reads on the back of Anna's shield; the Ness's hold swings the camera out so you see the hero between the teeth; the camera follows high boosts and lifts smoothly.
- **World:** the moon sits in the air with a soft limb, halo and mist (#30); Origami blossoms are pink paper, not grey (#33); fruit bushes, strays and fold cranes are built 3D props (#39), using fewer draw calls; Ink hollows read as hatched tones, not black cut-outs.

## 0.27
**Tuned, and the same seed plays the same match.**

- **One seed, one match:** the sim draws all its randomness from the match's seed, so a match can be replayed and balance measured.
- **Balance:** the long match is tuned against Phase 1's target, measured with a scripted player that knows a chosen number of the five lessons over 24 seeds:
  - **Even:** about a third of matches won knowing nothing, about 70% with two lessons, all of them once you answer the red rain's mood.
  - **Cruel:** rarely won without the mood, 40-50% with it.
  - **Gentle:** unchanged.
- **Thin rain:** a thin red rain (the mood answered) still brings something on Even and Cruel, so answering it helps without ending the danger.
- **First Rain:** keeps its old hollows and thieves, and a thin rain brings nothing in it. Houses stand in nearly every Even First Rain.
- **Tools:** `tools/tune.js`, the scripted player, and `C.DIFF`, every difficulty number in one table.

## 0.26
**Guards, the Ness, and every gun its own.**

- **Guards on the second jump:** Anna raises Athena's shield (it blocks shots and hits from the front and shoves back what swings at her). Dora gets a second jump that wraps her in an astral bubble, which soaks up to 200 damage. Skye frays into thread for a moment and shots pass straight through her. A double jump in a fight is a way out now.
- **Thread boosts:** a second jump made along a thread throws you higher and faster down it.
  - Three boosts charge Dora's hat. Press G (or R3, or the touch button) and it flies out like a boomerang, cutting through the Hush there and back, then lands on her head again.
  - When Myra's hover ends on a thread, she heals herself and the friends around her.
  - Rook's dash while he glides is a barrel roll that long shots miss.
- **The Ness** is a jade creature now, not a painted card. It warns before it bites: a ring marks the spot, jade while it follows you and gold once it has locked. If it catches you it holds you in its jaws for a second, and you can mash, or a friend can hit it, to get free. About once each time it surfaces, it floods the whole valley and swims out among the threads after whoever hurt it. In the flood you wade slower, jump and dash farther, and are carried by the current, but the threads stay dry paths.
- **Shots:** every gun has its own shot: lantern orbs, a tumbling hammer, spools that trail thread, silver needles and copper embers. Only a few shots leave a streak. The ammo counter shows a row of icons in the gun's shape.
- **Rook and Skye:** Rook is copper and rose gold with copper sulfate teal. The Skein Doll's name is Skye.
- **Tests:** a browser test now runs on every pull request.

## 0.25
**Rook, the air, and the world from behind.** Rook Vale, the Wick Aviator, joins as the fifth hero (from the Lantern Ford study): a cobalt courier with a lantern-kite on his back, Wick Skip, Lantern Lift (about a second of steerable rise to 4.2 m, then a glide you can aim and fire from; a thread you lift along catches you once and carries you further) and Landing Bell as his ultimate. Every hero moves through the air their own way: Dora one clean jump, Anna a rock-hop off thin air, the Skein Doll a loose somersault, Myra Belle a short hanging flight (hold jump: her wings beat and she hangs for up to 1.2 s, drifting and shooting). The camera follows height more slowly in the air, so a jump or a lift rises on screen. Your troopers wear warm team-colour capes you can see from behind, a hollow shows a cold rift of light down its spine when you chase it, and the ground along every thread is a worn, flowered path. The Dreamwalk end page explains each discovery as a labelled diagram (ChatGPT's PR #43).

## 0.24.1
Myra's hair, after her turnaround: a tousled wavy bob with a swept fringe and locks that flip out at the jaw, shaded light on top and dark underneath. It read as a helmet with earmuffs from the front and a raspberry from behind.

## 0.24
**Heroes in 3D.** The painted paper cutouts are replaced by 3D figures with a real skeleton, because over the shoulder a flat card turning and bending read as broken. All four heroes are rebuilt from their key art: Dora (straw hat, red riding cloak with the gold stag, vented at the back so the stride shows, lantern), Anna (green coat, braid, crown over goggles, rock hammer), Myra (plum, wings, spools), the Skein Doll (burlap, yarn mop, needle). The same motion rig now poses joints: feet plant where the rig says they land and stay planted, knees bend by IK, the hips turn toward where the legs run while the chest stays on your aim, arms pump and come up to aim, cloth and braid trail on springs and clear the legs. Bots, the Echo and dash afterimages use the same figures; the wardrobe attaches to them. Painted paper is still there: Settings, "Heroes as 3D figures".

## 0.23
**Feel and the wardrobe.** Your shots flash at the muzzle and kick the camera back along its own line of sight (aim never moves); hits throw paper bits that flutter down, Hush tissue drifts up like ash, structures chip, a ward shimmers when a hit can't land yet; Reign troopers crumple into paper, Hush tear into tissue, hollows come apart in a cloud; your kills tick the crosshair. The wardrobe: 17 things you wear or carry (trails, footfalls, rings, a light at your shoulder, dash doubles), earned by stars, First Rains, goals and secrets, with a Wardrobe screen on the title, a line when something opens mid-match and the next one shown at the end of every match.

## 0.22.2
Calmer motion in play: strafing no longer shears the cloak or flings Anna's braid; raising or lowering the aim is a cut, not a card turning edge-on.

## 0.22

Anna moves like herself: a heavier gait with more weight transfer and grit at each footfall, her braid cut out of the sheet and swinging on its own pendulum, coat halves that lift with each knee, arms that follow the body and bend at the elbow, a wind-up and release for the hammer, reactions to Core Sample, Tumble and Fawn Charge, a living idle. Every hero gets a gait table and small cast reactions; leg strips are cut below the coat hem. The game points people to GitHub issues instead of a chat, and the footer links the repository.

- The repository opens to everyone: an MIT licence for the code, [`ASSETS.md`](ASSETS.md) for the art and names, [`CONTRIBUTING.md`](CONTRIBUTING.md), a code of conduct, a security policy, issue forms (bug, feel report, idea, art and audio), a pull request checklist, CI on every pull request, and [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). [`AGENTS.md`](AGENTS.md) gains a "Start here" for any agent. The version history moves here from the README.

## 0.21
A recorded score: eight cues in `art/music/` (title, calm valley and battle music in two alternating takes each, red rain, win and lose stingers) that follow the match and crossfade, made with ElevenLabs Music ([`docs/MUSIC.md`](docs/MUSIC.md)). A mute button on every screen and key M; master, music and effects volumes. Effects are rounded into the score's key by default; "Saelion tuning" in Settings brings back the 31 steps.

## 0.20
Bending paper heroes with follow-through, dust and afterimages; trooper gaits; Hush tissue spires, lantern-bearer troopers, tissue wraiths, faceted rocks (`js/props.js`); blossom and pine trees, a shader loch, pools of lantern light, ground growth, a ringed moon, petals and fireflies (`js/scenery.js`); a film grade for Cobalt Snow.

## 0.19
Motion: a distance-driven rig, paper-card turns, squash and stretch, lean, contact shadows, a smoother camera; the guardian fox; a painted far ridge; Dreamwalk shows the director's view (issue #7).

## 0.18
All four heroes and the Reign houses are painted; arms swing and aim; concept videos in the Cabinet.

## 0.17
First Rain: a six-minute match scored in five stars, now where the title starts. The roadmap in [`docs/ROADMAP.md`](docs/ROADMAP.md).

## 0.16
Goals (one thing to do next, with pay), links to the other worlds, a frame-rate report in the pause screen.

## 0.15
Painted heroes walk.

## 0.14
Echo (replay your last seconds beside you) and Dreamwalk (a self-playing tour that names every hidden system and collects verdicts).

## 0.13
Slots for painted art: structures, crowds, the Ness, scenery and a backdrop each take a cutout ([`art/flats/README.md`](art/flats/README.md)).

## 0.12
Each view is drawn its own way: ink, origami, bedtime book, zine neon, lantern, ledger, wet glass, after the style kits.

## 0.11
Paper heroes: Dora is a painted cutout made from a turnaround sheet (`tools/sheet.py`).

## 0.10.1
Keys shown on screen for keyboard play (the captured mouse made the buttons unclickable).

## 0.10
Ever Fallen mode, the Lean Back modifier, the Rainwake and Memory views, the Cabinet (easter eggs, Snuff, the concept plate gallery).

## 0.9
Views become a mechanic: view-bound rare fruit, and moods before the red rain. Concept plates filed in `docs/concepts/`.

## 0.8
Fruit power-ups: lemon, rose hips, Verde Limón little and big; design comments in every source file; `docs/PLAN.md`.

## 0.7
Inkblot Noir look with model-driven cues; red-rain warning; regression tests; evidence pass.

## 0.6.1
Fix: bullets, soul orbs and health-bar fills had been invisible since 0.1.

## 0.6
Cobalt Snow look from the concept plate; lantern houses; the thread on the ground; bloom.

## 0.5
The Hush as its own side; hero lore corrected.

## 0.4
Renamed Livloch (it was Livelock); the fold.

## 0.3
Four looks from the Saelion style kits.

## 0.2
The loch, the Ness, the Greatness.

## 0.1
A one-shot lane shooter with mirror teams.
