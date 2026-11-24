# Changelog

Every version of Livloch, newest first. Each one from 0.4 on is a `release/X.Y` branch that never moves, and the published ones stay playable at [stevoblevo.github.io/livloch/versions/](https://stevoblevo.github.io/livloch/versions/). The reasons behind each step are in [`docs/PLAN.md`](docs/PLAN.md); where each was published is in [`docs/IMPORT.md`](docs/IMPORT.md).

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
