# How Livloch is built

A map for anyone about to change the code, person or agent. It describes the code as of 0.20; when a file's header comment and this page disagree, the header wins, and please fix this page.

Livloch is one static page. `index.html` holds the markup and shared CSS, loads the Dreamwalk field-note stylesheet from `css/debrief.css`, loads Three.js r128 from cdnjs, then the plain scripts from `js/` in a fixed order. There is no build step, no bundler and no package to install. Every script is a self-contained function that hangs its part on one global, `LL`.

## The one rule

**The model owns the view. Presentation follows the model; the model never asks the renderer.**

```
  input.js ──> main.js ──> hero.ctl, S.setLens(), S.echo(), S.call() ...
                               │
                               v
                  sim.js  (the whole match, in W)
                               │  W.fx: plain event objects
                               v
             gfx.js · audio.js · ui.js   (read W, draw, play, show)
```

`core.js` and `sim.js` never touch `document`, `window`, the renderer, CSS or a pixel. That is why `node tools/test.js` can play whole matches under Node. The last test in that file reads the two files' source and fails if they mention presentation.

Views are part of the game, and that is fine, because the view is model state: `W.lens`.

```js
// Right: main.js tells the model; the model decides what it means; gfx draws what the model says.
function setLook(id) { /* ... */ R.setLook(id); S.setLens(id); }
// in sim.js: rare fruit can be eaten only when W.lens matches; a mood is answered by the right W.lens.

// Wrong: the model asking what is on screen.
if (LL.gfx.look.name === 'Origami') { /* ... */ }      // tools/test.js fails on this
if (document.body.dataset.look === 'origami') { /* */ } // and on this
```

## Scripts, in load order

| # | File | Global | What it is | Reads | Writes |
|---|---|---|---|---|---|
| 0 | three.min.js (cdnjs) | `THREE` | Three.js r128 | | |
| 1 | [`js/core.js`](../js/core.js) | `LL`, `LL.C`, `LL.U` | Constants, the three threads (`LL.lanes`, `lanePoint`, `laneNearest`), heroes, items, fruit, views (`C.LENSES`), moods, the difficulty table (`C.DIFF`, since 0.27), goals, stars, the Cabinet, the concept plates. Data, not rules | nothing | nothing after load |
| 2 | [`js/sim.js`](../js/sim.js) | `LL.sim` (`S`) | The whole match, headless: heroes, troopers, structures, the Hush (hollows, thieves, red rain), souls and orbs, the Ness, creases and the fold, fruit, moods, Echo, Dreamwalk, goals, stars. Bots and the player drive heroes through the same `hero.ctl` | `LL` | `W` |
| 3 | [`js/motion.js`](../js/motion.js) | `LL.paperMotion` | How a painted body moves: stride by distance walked, aim, landing squash, lean, four damped springs for follow-through. Also a Node module, so tests can load it | a unit | its own rig object |
| 4 | [`js/props.js`](../js/props.js) | `LL.props` | Hush towers, troopers on both sides, hollows, the light a thief carries, rocks. Built in code, instanced | the unit it is handed | Three.js objects |
| 5 | [`js/scenery.js`](../js/scenery.js) | `LL.scenery` | Trees, the shader loch, pools of light, ground growth, moon, mist, stars, fireflies, petals. Optional: without it gfx falls back to cone trees and a flat loch | `W` | Three.js objects |
| 5a | [`js/heroes3d.js`](../js/heroes3d.js) | `LL.heroes3d` | 0.24: the heroes as small 3D figures with a skeleton (and the Echo); 0.25 adds Rook Vale, posed every frame from the motion rig. Presentation only | the unit and its pose | its own Three.js objects |
| 5a2 | [`js/ness.js`](../js/ness.js) | `LL.ness` | 0.26: the Ness as a 3D creature posed on the CPU, the mark of its bite, and the flood's water and thread ribbons. Presentation only | `W.ness`, `W.flood`, the heroes | its own Three.js objects |
| 5b | [`js/wardrobe.js`](../js/wardrobe.js) | `LL.wardrobe` (`WD`) | 0.23: things the player's hero wears or carries (trail, footfall, ring, light, dash), their unlock rules, the wardrobe screen and the end-screen box. Rules are pure and load under Node | `LL.cfg`, the player's hero model, events | its own Three.js objects, the DOM, `cfg.wear` and its counters |
| 5c | [`js/shots.js`](../js/shots.js) | `LL.shots` | 0.26: a look per gun in flight and at the muzzle (lantern orb, tumbling hammer, spool and thread, needle, copper/teal spark, quiet team darts for troopers and towers). Presentation only | the projectiles (`p.owner.def.id`, `p.team`, `p.cos`, `p.gun`, `p.echo`) | its own instanced meshes |
| 6 | [`js/gfx.js`](../js/gfx.js) | `LL.gfx` (`R`) | The scene: sky, ground, threads, structures, crowds, paper heroes, painted flats, the fox, cues, particles, camera, bloom and the per-view drawing pass | `W` | the canvas |
| 7 | [`js/audio.js`](../js/audio.js) | `LL.audio` (`A`) | The score: eight recorded cues in `art/music/` on two crossfading decks that follow the match (see [`docs/MUSIC.md`](MUSIC.md)). The effects: a small WebAudio synth with no samples, written in 31 equal steps (`edo(n)`) and rounded to semitones unless "Saelion tuning" is on. Master, music and effects volumes and one mute | `W`, events | speakers |
| 8 | [`js/input.js`](../js/input.js) | `LL.input` (`I`) | Keyboard and mouse, touch, gamepad, all feeding one small state; the last device touched sets a body class | devices | `I` |
| 9 | [`js/debrief-data.js`](../js/debrief-data.js) | `LL.debriefData` | All 24 discovery descriptions, mode-aware quantities and labeled diagram data | `LL.C`, `W` | nothing after load |
| 10 | [`js/debrief.js`](../js/debrief.js) | `LL.debrief` | Dreamwalk field notes, category filters, verdicts, notes and text export | discovered IDs, `W`, `LL.cfg` | the DOM, `cfg.calls`, `cfg.callNotes` |
| 11 | [`js/ui.js`](../js/ui.js) | `LL.ui` (`UI`) | HUD, minimap, shop, title, pause, end screen, the Cabinet and Snuff | `W`, `LL.cfg` | the DOM |
| 12 | [`js/main.js`](../js/main.js) | `LL.cfg` | States (title, play, pause, over), the loop, the player's hands on the hero, settings saved to `localStorage`, Cabinet feats | everything | `hero.ctl`, the model's few public actions |

Each file starts with a `DESIGN` comment that says what it may and may not do. Read the header of any file before changing it.

The end screen mounts `LL.debrief` from the existing `dreamSeen` IDs. It only describes discoveries and stores the player's design feedback; it never writes match state. The icon sprite is bundled at `art/ui/debrief-symbols.svg`. [The debrief handoff](DEBRIEF-SEMIOTICS.md) documents its data contract and standalone presentation fixture.

## The model: `W`

`S.newWorld(options)` builds one world and keeps it as the current one (also `S.W`). Options: `heroPick`, `difficulty` (0 Gentle, 1 Even, 2 Cruel), `seed`, `auto` (bots drive the player's hero), `lens` (starting view), `mode` (`'short'` First Rain, `'match'` the long match, `'fallen'` Ever Fallen), `lean` (Lean Back), `dream` (Dreamwalk).

`S.step(dt)` advances it. What the world holds, briefly: `W.t`, `W.units` (everything that can be hit), `W.heroes`, `W.troopers`, `W.structs`, `W.thieves`, `W.strays`, `W.ness`, `W.fruit`, `W.creases`, `W.lens`, `W.mood`, `W.player`, `W.over`, `W.winner`, and `W.fx`.

**Actions** the outside may call: `S.setLens(id)`, `S.fold(hero, crease)`, `S.echo()`, `S.call(lane)` and `S.leanFold()` (Lean Back), `S.buy(hero, item)`, `S.setAuto(on)`, `S.aimPoint(...)` (the crosshair ray). Everything else reaches the model only through `hero.ctl` (move, aim, fire, jump and, since 0.25, jump held, dash, abilities).

**Events.** The model talks to the outside only through `W.fx`, a list of plain objects like `{ k: 'red' }` or `{ k: 'thiefdown', p: true, carry: house }`. `main.js` hands each one to `R.fx`, `A.fx` and `UI.fx`, then empties the list every frame. To find every kind: `grep -o "fx({ k: '[a-z]*'" js/sim.js | sort -u`.

**Test hooks.** `S._t` exposes `give`, `eat`, `damage`, `kill`, `spawnThief`, `spawnHollow`, `thiefStep` for `tools/test.js`. Nothing in the game calls them.

**Deterministic per seed (0.27, #27).** What is seeded: every random draw the model makes, through `W.rng` (`LL.rng` in `core.js`, mulberry32, keyed by `newWorld({ seed })`; seed 0 or none means 7). The valley's rocks and trees come from their own fixed `LL.rng(9917)`, the same in every match. So one seed and one sequence of inputs (`hero.ctl` and the actions above, on the same frames, with the same `dt`) give the same match, event for event; `tools/test.js` checks that for a scripted player, Dreamwalk, Ever Fallen and two whole bot matches, with another world run in between.

What is not seeded: the view. `gfx.js`, `props.js`, `scenery.js`, `shots.js`, `heroes3d.js`, `ness.js`, `wardrobe.js`, `ui.js` and `audio.js` use `Math.random` for sparks, dust, shake and sound grain, and none of it can reach `W`. The game's own seed comes from the clock in `main.js`, so two people's matches differ; a replay would store that seed.

The rule for new code in `sim.js` and `core.js`: draw from `W.rng()`, never `Math.random`; keep time as `W.t`, never `Date.now` or `performance.now` (the test fails on either). A new draw, or one moved, shifts every draw after it, so bot win rates move with any such change: post `node tools/soak.js 6` before and after and read the shift as a new sample, not a regression.

## One frame

`main.js`, `frame(now)`:

1. Clamp `dt` to 0.1 s and record the frame time (the pause screen's frame-rate report reads the last 900).
2. `I.poll(dt, sens)` reads the devices.
3. One-shot keys: pause, shop, the Inkblot toggle, next view, Echo.
4. In play: `playerControl(dt)` turns input into `hero.ctl`, with aim help for touch and pads. Then `S.step` runs in slices of at most 1/45 s (Dreamwalk may run 2 to 4 times faster).
5. Drain `W.fx`: `R.fx`, `A.fx`, `UI.fx`, Cabinet feats, and in Dreamwalk the renderer follows the director's view (issue #7).
6. `R.frame(dt, view)` draws, except on the title screen (the title shows the painting `art/title.jpg`). Paused, it draws with `dt = 0`.
7. `UI.frame` and `A.frame`.
8. Clear the one-shot edges. If frames keep coming slower than about 26 fps for several seconds, switch to Lighter graphics once.

`R.frame` in order: heroes (the 3D figure's pose or the paper pose and bends, dust, afterimages, falls) and the fox, troopers and thieves through the props hooks, structures, projectiles, soul orbs, zones, the camera (`R.camPose`, or the cinematic `SHOTS` when there is no player), health bars, cues, scenery's `frame`, then `draw()` (scene, bloom and the view's drawing pass).

## Views (looks)

The model knows eight view ids, in `C.LENSES`: `snow`, `ink`, `lantern`, `knight`, `origami`, `glow`, `rain`, `memory`. The renderer has one entry per id in `R.LOOKS`, in `gfx.js`:

| id | Name | Drawing pass (`post`) | What it is for |
|---|---|---|---|
| `snow` | Cobalt Snow | 0, painted, with a film grade | home view |
| `ink` | Inkblot Noir | 1, three tones and hatching | draws thief routes and which structures can be hurt (cues in `gfx.js`); answers one mood |
| `origami` | Origami | 2, flat posterised paper | Big Lemon exists here; answers one mood |
| `knight` | Knight Night | 3 | Big Rose hips exist here; answers one mood |
| `glow` | Hypermetapunk | 4, zine neon, wireframe | Big Verde Limón exists here; answers one mood |
| `lantern` | Lantern Night | 5, lantern pools | answers one mood |
| `memory` | Memory | 6, sepia ledger | trails behind the Hush; lights hold twice as long, souls are worth half, Echo runs longer; answers one mood |
| `rain` | Rainwake | 7, wet glass | souls worth half again while the rain is red; answers one mood |

**How a look is applied.** `R.setLook(id)` rebuilds the whole scene (`construct()`, then `R.build(W)`). Everything is built once in the Lantern colours. `applyLook()` then walks the scene and passes each colour through the look's `map(color)` (a hue-bucket remap), turns additive blending to normal for looks that need it, and wireframes Lambert materials in Hypermetapunk. Big surfaces (sky, ground, fog, lights) take the look's own colours directly. `body[data-look]` in `index.html` restyles the HUD per look. The final pass (`mComp`, uniform `m`, chosen by `LOOKS[id].post`) draws each view its own way; Lighter graphics turns it off.

**Flags that tell `applyLook()` to leave something alone.** Set them when you build an object whose colour is its meaning, or that you colour yourself:

| Flag | On | Means |
|---|---|---|
| `material.userData.lk` | material | colour and emissive are final; do not remap |
| `material.userData.bl` | material | blending, wireframe and emissive tweaks already done or not wanted |
| `material.userData.solid` | material | never wireframe this in Hypermetapunk |
| `geometry.userData.lk` | geometry | vertex colours are final |
| `object.userData.ilk` | instanced mesh | instance colours are final |
| `object.userData.rt` | object | colours are set every frame (crowds, bars, projectiles, orbs, cues); skip geometry and instance remapping |

Helpers: `own(o)` and `own2(m)` in `gfx.js` and `props.js`, `mine(o)` and `shared(m)` in `scenery.js`. Colours that must read the same in every look (fruit) are in `FIXED`. Scenery does not use the map at all: it has a palette per look id in `PAL` in `scenery.js`.

**To add a view:** add its id to `C.LENSES` in `core.js` (and a line in `C.MOODS` if it should answer a mood; the mood tests loop over every id), an entry in `LOOKS` with a `post` index in `gfx.js` (the look chips are made from `LOOKS`), a branch for that index in `mComp`'s shader, a palette in `PAL` in `scenery.js`, and CSS for `body[data-look="id"]` in `index.html`. If the view should do something, that rule goes in `sim.js` with a test.

## 3D heroes (0.24)

The owner, playing over the shoulder, found the painted cards wandering and sliding ("it just looks dumb"), so since 0.24 the heroes are small 3D figures, and painted paper is a setting (`cfg.heroes3d`, "Heroes as 3D figures", on by default). `js/heroes3d.js` builds each hero from Three.js primitives as one skinned mesh (Myra's wings are a second): vertex colours, one canvas atlas for faces, Dora's stag and the trims, Phong shading with a lift, a key light from the camera's side so a back seen from behind has form, the view's light as a rim, darker feet. Each view sets lift, saturation, tint and rim (`LOOKP`).

The skeleton: hips, spine, chest, neck, head; arms (shoulder, elbow, hand); legs (hip, knee, foot); plus cloth panels round the body (Dora's cloak on the chest, Anna's coat and the smocks on the hips), chains (Anna's braid, Dora's scarf tails) and pendulums (Dora's lantern and hat, the Skein Doll's yarn, Myra's spools and curl, Myra's wings). Every frame `H3.pose(fig, st, unit, o)` takes `LL.paperMotion.pose()`'s output and the unit:

- **Legs.** Each foot follows a planted-then-swing path along the direction the unit is actually moving (relative to its facing), and two-bone IK bends the knee. The rig's phase is distance walked; a foot stays planted as long as the leg can reach, and `H3.cyc` passes back a stride multiplier for the speed (`sc.cyc` in `motion.js`), so slow is a walk, fast a run with flight, and a planted foot does not skate. Left touches down at phase pi/2, right at 3pi/2, the moments the rig reports a contact, so the dust (`heroDust`, now under the real foot) and footsteps land with the foot.
- **Hips and chest.** The hips turn toward the way the legs run (a strafe is a sideways run, a back-pedal runs backward), the spine and chest turn back to the aim; the stride twists the pelvis and counter-twists the shoulders; the body bobs, leans into the run and into a strafe.
- **Arms.** They pump against the legs; while aiming (the rig's `aim`) the gun arm comes up by IK along the hero's `pitch`, two-handed for Dora and Myra; Anna's thrown hammer winds up over the shoulder and follows through (`throw`); a stomp throws the arms out.
- **Events from the rig.** Landing squash, the jump (one knee up), a dash, riding a thread (one arm up), a braced shot (a shove back), recoil, idle weight shift and glances, breathing. The fall (`H3.fall`): knees give, the figure tips onto its face.
- **Secondary.** Cloth panels trail on two springs and swing past when you stop, and each is swung out just far enough to clear the knees and shins near it. Chains are verlet in the world, kept off the back. Pendulums hang along gravity minus how their anchor accelerates.

Afterimages are frozen copies of the skinned figure (`H3.ghost`, faded by `H3.step`); the wardrobe colours them as before. The Echo is the same figure, pale, running its own rig. Captures: `tools/shots/heroes3d.js` (close-ups by segment, every view, a turntable), `play.js` with `PAPER=1` for the cards.

## Rook Vale and Lantern Lift (0.25)

The fifth hero, from the Lantern Ford study branch (`work/lantern-ford-wick-aviator`); the full note is [`docs/ROOK.md`](ROOK.md). What a maintainer needs:

- **Data.** The last row of `LL.HEROES` in `core.js`. He is appended, never inserted: saves store the hero as an index (`cfg.hero`), and a test pins the order.
- **The ability kind `lift`.** `sim.js`: `liftCast` (from the ability switch in `cast`), `liftStep` (one hook line in `heroStep`, before the thread ride and the ordinary movement), `botLift` (from the switch in `botAbilities`). State on every hero: `liftT` (seconds of rise left), `glide`, `liftCaught`, `liftA` (the ability row in use). `liftStep` runs before `heroStep`'s own gravity, so it adds `C.GRAV * dt` back and applies its own vertical rule; it never lets him above the ability's `cap`. Events: `lift`, `liftthread`, `glide`, `liftland`. Any hero could be given a `lift` row; nothing in it names Rook.
- **The figure.** `HERO.rook` in `heroes3d.js`. Two general additions came with it, both marked `0.25 rook`: `D.pose(fig, st, h, c)`, a hero's own layer called once in `H3.pose` after the shared legs and arms and before the aim IK (his lift pose, fins and lantern live there); and `material.userData.U`, the figure's shader uniforms, so a figure can turn its own glow up.
- **Everything else** is a marked line or two: `RIGS.rook` and `GAITS.rook` in `motion.js`; `PAPER.rook`, the built shapes in `heroModel`, `KICK.rook`, four event cases and a spark line in `gfx.js`; his shot, the lift sounds and the two bells in `audio.js`; the picker's grid in `index.html`; the wardrobe preview's picture path.
- **Captures.** `tools/shots/rook.js` (the real sim from the play camera), `tools/shots/heroes3d.js` with `HERO=4` (segments `lift`, `liftAim`, `liftBank`, `liftSide`), `tools/shots/picker.js`, `tools/shots/rook-audio.js` (his sounds, measured offline), `node tools/rookfly.js` (one lift's numbers).

## Air (0.25)

Each hero moves through the air its own way. The owner, after the 3D heroes: "jumping and double jump for some, short hanging flight for myrabelle". It runs through the usual layers, each joined at lines marked `0.25 air`.

- **Data** (`core.js`): `air` on a hero's row in `LL.HEROES`. `jumps` is how many jumps one airtime allows (the second costs `cost` stamina, default 1). `hover` is a short hanging flight in place of a second jump: `{ t, sink, lift, grip, cost }`. Dora `{ jumps: 1 }`; Anna and the Skein Doll `{ jumps: 2 }`; Myra Belle `{ jumps: 1, hover: { t: 1.2, sink: 1.2, lift: 1.6, grip: 5, cost: 1 } }`. A row without `air` keeps the jump of 0.24 and before exactly (a jump at 9.6 m/s, then a second at 9.2 m/s for one stamina); `tools/test.js` checks that.
- **Rules** (`sim.js`, at `heroJump`): `heroJump` (a press: the ground jump, a second jump, or the hover), `heroAir` (gravity, or the hover's hang: vertical speed eased toward `-sink` at `grip` per second), `heroLand`. The hover starts on a second press in the air, or when jump is held through the top of the jump; it lasts while `ctl.jumpHeld` is true, at most `t` seconds, once per airtime, and ends on release, when spent, on landing or on taking a thread. Hero state: `jumps`, `hoverT` (seconds left, > 0 while hanging), `hoverAge`, `hovered`, `holdJ`, and `vyLand` (the speed of the last landing, which the rig's landing squash reads). Events: `jump` (`dbl: true` and `n` on a second jump), `hover`, `hoverend` (`why`: `release`, `spent`, `land`, `zip`).
- **Input**: jump stays a one-shot (`I.e.jump`, `ctl.jump`), and is now also a level, `I.jumpHeld` (Space, pad A, or a finger on the touch Jump button), which `main.js` copies to `ctl.jumpHeld` (false while a menu is open).
- **Bots** (`botJump`, `botAirPlan`, `botAir`): a hurt bot jumps or dashes as before; a bot whose hero has `air` also jumps now and then while an enemy hero (or a hollow) is in range, and plans the airtime at take-off: a second jump near the top, or jump held through the top for most of a hover. Both keep two stamina for a dash.
- **Rig** (`motion.js`, `airStep`, `pose().airs`): where the body is in its airtime, read from the unit: `tko` (the take-off), `rise`, `apex`, `fall`, `dbl` and `dblP` (the second jump's envelope and progress over 0.55 s), `hov` (the hover blended in and out), the clocks `tk` and `db`, and a count `n` of second jumps.
- **Poses** (`heroes3d.js`, the `0.25 air` section): `airFoot` and `airArm` give the legs and arms their air targets (take-off, rise, top, fall; Anna's rock-hop, the Skein Doll's tuck, Myra's dangling kick) and the landing; `airRoot` turns the whole figure about its middle (the somersault, the hop's lean, the hover's tilt toward the drift and bob with each beat) and drives a cloth flare spring that `cloth()` adds to every panel; `airAfter` does Dora's hat, the Skein Doll's yarn, Myra's curl and her wings (open wider and beat at about 5 a second while hovering). In the air the braid falls nearer the body's rate, so it no longer rises off the head. Reduced motion: still shapes, no somersault, no beat. Painted paper ignores the new values.
- **Camera** (`gfx.js`, `R.frame`): in the air the follow height eases at 2.2 per second up and 4 down (9 and 13 on the ground and on a thread), so a jump rises on the screen and a hover hangs above the line. Aim stays exact: the aim ray starts from the same smoothed pivot.
- **Effects and sound**: `airFx` and `airDust` in `gfx.js` (a little dust at any take-off; Dora's lantern motes and ring; Anna's grit, puff and ring under her boots; the Skein Doll's yarn; Myra's wing shimmer and its trail), from the existing particle, puff and ring pools, with dark colours because the particles are additive and bloom. `airSound` in `audio.js`, in the score's key through `edo()`: a lantern clink for Dora, a stone knock with a hiss of grit for Anna, a rising yarn whip and a plucked C sharp for the Skein Doll, a beaten flutter held while Myra hangs over a soft A and C sharp, ending on a falling third.
- **Captures**: `AIR=1` (and `SIDE=1`) in `tools/shots/heroes3d.js` plays the move through the model (`S._t.heroStep`) with the play camera; `tools/shots/air-sheet.py` makes contact sheets. Evidence: `docs/evidence/air-0.25-*`.

A new hero gets an air move by its row: `air: { jumps: 1 }` (Rook, 0.25, whose flight is an ability) or one of the shapes above. A second jump looks like Anna's hop unless the hero is named in `AIR2` in `heroes3d.js`.

## Shots (0.26)

Before 0.26 every projectile was one stretched additive white box, so every gun read as the same tracer. `js/shots.js` (loaded before `gfx.js`) draws gun shots and trooper, tower and hollow shots instead; `gfx.js` still draws ability projectiles (kind `line` and `orb`) as before. The sim is untouched: damage, speed, size and counts are the model's.

- **Looks per gun**, chosen by `p.owner.def.id`: Dora a warm lantern orb with a short soft halo (your own get a faint thin streak); Anna a stone-headed hammer tumbling end over end, solid, no tracer; Myra a spinning spool, about one pellet in three trailing a thin thread; Skye a thin silver needle with an occasional glint, one in four with a faint streak; Rook a copper chip that flickers copper and teal (copper sulfate) with a small halo. Non-hero shots (`p.cos`) are a short dart, Reign warm, Hush cold, anything else violet, dimmer than any hero shot. Echo shots wear their owner's shape in pale blue.
- **Cost**: one InstancedMesh per shape (lamp, ember, hammer, spool, needle, dart) plus one each for halos, streaks and muzzle sparks. A mesh with no instances this frame is hidden and costs no draw call. No per-shot objects, no lights. Per-shot state (an id and an age, for tumble phase and streak choice) lives in a WeakMap keyed by the projectile object, so nothing is written onto the model.
- **Hooks in `gfx.js`**, all marked `0.26 shots`: `SH.build` at the end of `buildInstanced`; `SH.begin`, `SH.put` (returns true when it drew the shot, else the old box is used) and `SH.end` around the projectile loop; `SH.step` at the top of `stepFeel`; `SH.muzzle` in the `shot` event, which returns true when the gun has its own muzzle so the generic flash is skipped.
- **Muzzles**: a lantern puff; for the hammer no flash, only a few pale air lines and a puff of dust; a thread snap (three thin lines); a needle glint (a small cross turned to the camera); a copper spark burst (short lines under gravity, one in three teal).
- **Looks and quality**: solid shapes are coloured through the look's map once when the scene is built (`R.setLook` builds again). Additive parts follow the existing rule (normal blended in the light looks). Lighter graphics keeps the shapes and drops halos, streaks, threads and spark lines. Reduced motion halves the sparks.
- **Ammo HUD**: `ui.js` (`ammoBuild`, `ammoRow`) draws a row of inline SVG icons in the gun's shape under the number, at most 14 (a big magazine shares icons, a part-full icon is half-lit); full ones in the hero's colour, spent ones faint, filling from the left while reloading. CSS is `#ammoI` in `index.html`, with a smaller set for `body.touch`.
- Captured by `tools/shots/shots-0.26.js` (see its header; `AIM=quiet` clears the field, `EXTRA=n` adds harmless extra shots for a legible gallery).

## The Ness (0.26)

The owner: "Nessy needs to be able to just chomp someone and also flood the whole field to move more during interactions." The loch boss kept its spit, its slam and the Greatness, and gained a bite, a flood and a body. Every edit to a shared file is marked `0.26 ness`.

- **Rules** (`sim.js`, the section headed "the Ness"; every number is in `NESS`, also `S.NESS`). State on `W.ness`: `chomp` (`{ ph: 'tell' | 'hold', t, tgt, tx, tz, locked }`), `chompT` (cooldown), `openT` (lying open after a miss), `out` (swimming the flood), `hx`, `hz` (home), `prey`, `floodAt`, `floodHp`. State on the world: `W.flood` (`{ ph: 'swell' | 'rise' | 'high' | 'drain', t, reach }`, or null) and `W.floodN`. A held hero has `held` (the Ness) and afterwards `safeT`.
  - *The chomp.* Anything not the Ness's within `REACH` (14 m) of the middle of the loch, or `ROAM_REACH` (7.5 m) of its body in a flood, can be picked: whoever hurt it first, then heroes, then troopers. It rears for `TELL` (0.9 s) and marks a spot that follows the prey until `LOCK` (0.35 s) before the bite. A hero within `BITE_R` (2.6 m) of the spot and lower than `JUMP_Y` (1.2 m) is caught: a timed jump, a second jump, a dash off the ring or riding a thread all dodge. The bite is `BITE` (120, +8 a minute) through `damage()`, so resistance, shields, Last Breath and any guard added to that path apply. The hero is then held `HOLD` (1.1 s): `heroStep` returns at its first marked line, so nothing works but mashing (each jump or dash press takes `MASH`, 0.25 s, off), and the Ness lets go early if it loses `LETGO` (5%) of its health. Then it throws the hero clear (`FLING` 15 m/s) and cannot pick them for `SAFE` (2.5 s). Why held and thrown, not swallowed: a second is long enough to read and to be rescued, short enough not to take the game away, and the throw puts the hero back outside its reach. Small troopers on the spot are eaten (up to three); a hollow takes `BITE_BIG`. A miss leaves it open for `OPEN` (1.6 s): it does nothing and takes `OPEN_MUL` (1.5) times the damage, so dodging is rewarded. Cooldown `CD` 7 s in the loch, `ROAM_CD` 4.5 s in a flood. The chomp and the slam never overlap.
  - *The flood.* Once each rising: when the Ness falls under `FLOOD_HP` (60%) of its health (provoked), or, left alone, `FLOOD_FIRST` (70 s) after it surfaces; if it lives on, again `FLOOD_EVERY` (240 s) after the last one. A flood by the clock never starts during a red rain or within 25 s of one. So a match sees about one every four minutes, the Ness fight always has one, and First Rain has one before its rain. `swell` is `SWELL` (3.5 s) of warning; `rise` runs a front out from the loch at `FRONT` (62 m/s, about 3 s to the far corner); `high` holds `HIGH` (12 s); `drain` runs the front back. About 18 to 21 s from the warning to dry ground, and it cannot stall: every phase is a timer, and the Ness dying starts the drain. `S.waterAt(x, z)` is the depth at a place, 0 to 1, and is the only thing movement reads.
  - *Movement in the water.* Two marked lines: `floodHero` in `heroStep` (a factor `fl` on the hero's own speed) and `floodTrooper` in `trooperStep`. Wading is `WADE` (65%) of walking; in the air a hero moves at `AIR` (125%); a dash lasts `SKIM` (40%) longer, about 6.5 m in place of 4.8; a current of `CUR` (2.2 m/s) carries anyone wading within 7 m of a thread along it, out from the middle while the water is up and back in (half again as fast) while it drains. Small troopers float at `FLOAT` (60%) and drift at `DRIFT` (1.5 m/s); a hollow only slows a little. A thread is above the water: the ride is untouched and out of the jaws.
  - *The Ness in a flood.* `nessRoam`: it swims at `SWIM` (10.5 m/s, turning at 2.4 rad/s) after whoever hurt it, else the nearest hero standing in the water, else troopers; chomps; wanders to a waypoint for 2.5 s; spits only at what it cannot bite (on a thread, in the air, far off). `HOMING` (2.5 s) before the drain it turns home; if the water leaves it first it dives (`nessdive`) and comes up in the loch (`nesshome`).
  - *Events.* `nesstell`, `nesslock`, `nesschomp` (`hit`, `u`, `held`, `eaten`), `nessrelease` (`why`: `time`, `mash`, `shot`, `dead`), `floodwarn` (`why`: `hurt`, `time`), `flood`, `flooddrain`, `floodend`, `nessdive`, `nesshome`. Test hooks: `S._t.flood`, `S._t.nessTell`, `S._t.nessStep`.
  - *Bots.* `botNess` (from `aiHero`): held, they mash; on a tell aimed at them they jump over the bite (45%) or dash off the ring (25%) once the spot has locked, and three times in ten are caught; otherwise they keep out of reach of a risen Ness. The fishing spot moved from 15 m to 17.5 m, outside the jaws. `botFlood` (from `think`): in the water they take the nearest thread and stay on it.
- **The creature** (`js/ness.js`, loaded before `gfx.js`). One mesh, 592 triangles, one draw call, plus one draw of four points for its light (eyes, lantern, a glow where it lies). It is not skinned: a tube of 34 rings along a spine (the neck is a curve from the body to wherever the head is; the body is a chain that trails where it swam, eased into a coil while it is in the loch) plus rigid pieces set by a matrix each (head, jaw, lantern, four flippers), all written to the position buffer every frame. Flat shading comes from screen derivatives, so no normals are written. The gold leading is drawn in the fragment shader from a barycentric attribute; only the diagonals of the tube's quads are leaded, which makes the diamond panels of the concept plates. Jade is still its colour; the pale belly, the cold eye and the small lantern on a stalk over its brow are new. The head goes where the model says: to the marked spot at the bite, to the held hero while it holds one, to the ground at `biteX`, `biteZ` while `openT` runs. Painted paper (heroes as 3D figures off) uses the same creature; the card of 0.25 (`nessModel`, `FLATS.ness`) is now only the fallback when `ness.js` is not loaded.
- **The mark.** A ring at the spot (`chomp.tx`, `tz`) with a disc that fills as the bite comes; jade while it follows, gold once it has locked.
- **The water.** One mesh of rings round the loch (2,552 triangles; 720 under Lighter graphics), so the front is a true slope: the vertex shader lifts each ring by the same line as `S.waterAt`, to `DEPTH` (0.75 m). The fragment shader does ripples, the sky, foam on the front and the warm light of the threads (from a small canvas mask); Lighter graphics gets flat colour and foam only. During the warning the loch itself stands up. A ribbon of the threads' own light lies at 0.93 m, where riders ride, so the dry way reads. `LL.ness.waterY(x, z)` is the drawn surface; `LL.ness.bob` lifts floating troopers.
- **Hooks in `gfx.js`:** `nsx()` (what `ness.js` is handed: the particle, ring and puff pools, the shake, the glow texture), `LL.ness.build` in `R.build`, `LL.ness.fx` at the top of `R.fx`, `LL.ness.frame` where the card was posed, `LL.ness.bob` in the trooper loop. `ui.js`: two banners, feed lines, the minimap dot follows the Ness, two discovery ids. `audio.js`: the tell's growl and lock tick, the snap, the gasp, the horn call on A and E with the swell, the rush, the drain, all through `edo()`.
- **Debrief.** `nesschomp` and `flood` in `debrief-data.js` read their numbers from `S.NESS`; 26 discoveries now.
- **Captures.** `tools/shots/ness.js` (`SCENE=surface | chomp | dodge | flood | still`; `LOOK`, `LOW=1`, `REDUCED=1`, `PAPER=1`): the real sim from the play camera. Evidence: `docs/evidence/ness-0.26-*`.

## Guards and thread boosts (0.26)

The owner, after 0.25: "double jumps should provide some sort of blocking function. anna gets a Athena shield. dora gets an astral glow bubble absorber. skein goes aetherial passthru ... someone can do flips. myra on double jumps with float onto thread boosts gets a boon for add heal perhaps... Dora can throw her hat after a few successful double jump thread boosts". Every piece is joined at lines marked `0.26 guard`.

- **Data** (`core.js`): `air.guard` on a hero's row: Anna `{ kind: 'aegis', t: 0.9, arc: 60, knock: 1.6 }`, Dora `{ kind: 'bubble', t: 1.2, hp: 200 }` (and Dora now has `jumps: 2`), Skye `{ kind: 'fray', t: 0.6 }`. `air.hat` (Dora: `{ need: 3, dmg: 100, out: 15, speed: 24, back: 28, r: 1.1 }`), `air.boon` (Myra Belle: `{ heal: 50, r: 8 }`), `C.TBOOST` (`{ r: 2.4, align: 0.7, minSp: 3, vy: 2.2, sp: 1.6, t: 0.7, sinkK: 0.4 }`), and on Lantern Lift's row `roll: 0.45, rollNear: 4`.
- **Guards** (`sim.js`, the `0.26 guard` section after `heroLand`). The second jump calls `guardStart`; the window counts down in `heroStep` and `guardEnd` closes it (`why`: `time`, or `full` when the bubble is spent). The one door for harm, `damage()`, calls `guardHit` for every hero hit after resistance and before the dash shield: the aegis returns 0 for a hit whose source is within `arc` degrees of the hero's aim (and shoves a melee attacker within 4.5 m by `knock`, half for a hollow, with a 40% slow for 0.8 s); the bubble soaks up to its `hp` and passes the rest; the fray returns 0. Bleeding and the enemy fountain (`'dot'`) are never guarded, and a hit with no source has no direction for the aegis. Projectiles (`stepProjs`): `guardPass` lets a shot fly through the fray (and past a roll), said once per projectile; `guardStop` kills a shot from the front on the aegis before it can burst. The shooters' cosmetic tracers (spawned just before `damage()` in `trooperStep`, `structStep`, `strayStep`, `knotStep`) are shortened to stop at a block or a soak, or lengthened to fly on through a pass (`guardTracer`); that is model state, so it is set there.
- **Why it is not invulnerability.** Each guard is one second or less, needs a second jump and so costs one stamina (three banked, one back every 2.6 s, shared with the dash). Jumping a whole minute, the ceilings are about 35% of the time for the aegis (front only), 46% for the bubble but at most 200 a bubble (about 77 damage a second), 23% for the fray (`tools/test.js` checks guards per minute and time guarded).
- **Thread boosts** (`threadBoost`): a second jump, or a hover begun, within `r` m of a thread while moving along it (|cos| at least `align`, at least `minSp` m/s) gets `vy` m/s more lift and is thrown along the thread at `sp` times the run speed (never slower: off a thread ride it adds only lift); for `t` s, or until it lands (`tbT`), the air steers toward `sp` times the speed, so the stick held along the thread keeps it. A boosted second jump from the top of a jump climbs about 0.9 m higher. Counted per life (`tbN`, reset in `kill()` by `guardReset`).
- **Dora's hat** (`hatThrow`, `hatStep`, from `ctl.hat`): `need` boosts charge it (`hatN`, event `hatready`). Thrown, it flies level at chest height along the aim for `out` m (or until a tree or rock), turns (`hatturn`), and homes to her head; every enemy it passes (not structures) is cut once out and once back for `dmg` times her ability power (`hatcut`), and it lands home (`hatback`). The charge resets on the throw and on a fall. Model state: `h.hat` `{ x, y, z, vx, vy, vz, back, hitO, hitB, cuts }`.
- **Myra Belle's boon** (`boonCheck`, from `hoverEnd`): a hover that a thread boosted (`boonHov`; it also sinks at `sinkK` of the usual rate) and that ends with her still within 1.5 `r` of a thread, or onto it, mends her and every hero of her side within `boon.r` by `heal` times her ability power (event `boon` with `who`).
- **Rook's barrel roll** (`rollStart`, from the dash in `heroStep`): a dash while the lift or glide lasts goes sideways (the stick's side; otherwise away from the last roll) keeping his forward way, and for `roll` s shots from farther than `rollNear` m miss (`guardHit`, `guardPass`). Skye already somersaults on her second jump; Rook's roll is the one flip added.
- **Bots** (`botGuard`, `botThread`, `botHat`, called from `think`): under fire (a hit aimed at it in the last 0.45 s, landed or not: `shotAtT`) a bot with a guard opens it (30% a think on the ground, then the second jump 0.1 to 0.2 s after take-off; 60% in the air), Anna only when the shooter is in front, Rook rolls (40%); along its own thread, fast and far from where it wants to stand, a bot jumps and boosts (5% a think; Dora while her hat is not charged anywhere along the thread, 15%), and one that has just let go of a thread ride jumps again over it (50%); Dora throws a charged hat at a target within reach (50%).
- **Input**: `hat` is G, pad R3 (button 11), and a touch Hat button (`#tHat`, made by `ui.js`) shown only while the hat is charged. `main.js` copies it to `ctl.hat`.
- **The view** (`heroes3d.js`, the `0.26 guard` section; `guardPrep` after `airPrep`, `guardPose` after `airAfter`; `H3.guardEvent` gets the events from `gfx.js`): Anna's bronze shield (an owl over an olive sprig in a key band, an original canvas drawing) on her left arm, turned out so its rim shows from behind, and a faint golden 120 degree arc round her front (what the play camera behind her sees); Dora's bubble (a shader: bright rim, stars that twinkle, dimmer as it fills, a flare where a hit lands, a pop); Skye's body in bands of thread (`uFray` in the hero shader; the program key is now `hero3d2`) with seven loose strands of points; Dora's hat bone scaled away while a spinning copy flies, and a glow on her head while it is charged; Rook's roll as `K.groll` in `airRoot`. `gfx.js` (`guardFx`, `guardTrail`): sparks, soaks, passes, the pop, the thread boost's arc of light from the thread up into the hero and on along it, the hat's light and cuts, the boon's rings and rising motes. Painted paper shows the bubble as the old shield sphere and the hat as its light; the rest is the figures'. Reduced motion: still shapes, no roll (a lean), rings and few motes. Lighter graphics: no fray strands, fewer motes.
- **HUD** (`ui.js`, `css/guard.css`): a small hat with three pips that fill with boosts; charged it glows and shows its key; dim while it flies; hidden for heroes without a hat and in Lean Back. The boon shows what it mended over each hero (`+50`).
- **Sound** (`audio.js`, `guardSound`): a bronze shing and a clang (heavier for a melee block), a glass chime, a tink and a soft pop, a thread whisper and a pluck, the thread plucked and pulled for a boost, a hat whirr, cut, catch and three-note charge, an A major bell chord for the boon, a whoosh for the roll; all through `edo()`. Levels: `tools/shots/guard-audio.js`.
- **Captures**: `tools/shots/guard.js` (`HERO`, `SEGS` guard, boost, hat, boon, roll; `CAM`, `HUD`, `REDUCED`, `LOW`, `PAPER`) drives the real sim from the play camera, with Hush small ones made from a hollow firing through `trooperStep` on cue. Evidence: `docs/evidence/guard-0.26-*`.

## Lessons 4 and 5: arrival, the fold's catch, a light from home, the slack thread (0.28)
Four rules in `sim.js` under "0.28 play", numbers in `C.ARRIVE`, `C.FOLD_CATCH`, `C.FOLD_CRUSH`, `C.EMBER`, `C.SLACK` and `slackHollows` in `C.DIFF`. Why they exist and what they measured: `docs/evidence/play-0.28-notes.txt`.
- **Arrival.** `arrive(h)` runs wherever a ride ends by letting go or reaching the end. A ride of `C.ARRIVE.min` metres toward the front strikes and slows the Hush around the landing and `reach` metres ahead on that thread. Event `arrive` (`u`, `x`, `z`, `r`, `reach`, `lane`, `n` struck, `p`). `h.zip.s0` is where the ride began.
- **The fold catches.** While a crease holds, the thread folded away is shut to the other side: a small trooper in the crease band gets `u.caught` (seconds left; event `caught` with `u`, `i`), stands still, then dies with `death` carrying `creased: true`; a hollow gets `u.pinned` (events `pinned`, `unpinned`), cannot walk or strike, and loses `C.FOLD_CRUSH` of its health a second.
- **A light from home.** `emberStep` from `heroStep`. `h.ember` is true while a hero carries a light (`h.mendAcc` counts the fountain's mending this visit). Events `ember` (`u`, `p`) and `mended` (`u`, `s` the house, `amt`, `relit`, `p`). The house has `s.brightT` seconds of firing `C.EMBER.fire` times as fast; `brightend` when it stops. Not in Ever Fallen.
- **The slack thread.** `W.slack = { lane, t, next, warned, n }`; `S.slack(structure)` is true for a house on the slack thread while `t > 0`. Events `slackwarn` (`lane`, `in`), `slack` (`lane`, `t`, `n`), `slackend` (`lane`; `fell`: the side whose house fell and ended it; `broke`: leaning hollows that crumpled). The leaning hollow has `u.lean`. `S.zipEnd` is longer on the slack thread. Long match only.
- **View hooks waiting for an artist.** `ui.js` says each of these in a banner or the feed (lines marked `0.28 play`). Nothing is drawn for them yet: a carried light on the hero (`h.ember`), a bright house (`s.brightT`), a slack thread and its dark houses (`W.slack`, `S.slack`), a caught trooper crumpling (`u.caught`), a pinned hollow (`u.pinned`), the arrival's ring and its run along the thread (`arrive`). No sounds either.
- **Seen and heard (0.29 feel).** `js/rulefx.js` draws all four from the play camera, in every look, joined to `gfx.js` at lines marked `0.29 feel` (`RF.thread`, `RF.build`, `RF.fx`, `RF.troop`, `RF.frame`, `RF.dip`; its `DESIGN` header says what each rule looks like). The thread gets its own shader (tremble, sag, drained colour, the arrival's run, the snap), and a veil under each thread carries the slack path's darkness, its ride chevrons and the arrival's run; at most six draws are added, and none while no rule is in play. Thread state is read from `W.t`, not eased per frame. Sounds are `ruleSound` in `audio.js`. The HUD lanterns show a drawn sign per ability (`js/glyphs.js`, `ui.js` line marked `0.29 feel`, `css/hud.css`). Captures: `tools/shots/feel29.js`, levels: `tools/shots/feel29-audio.js`, evidence `docs/evidence/feel-0.29-*`.
- **Debrief.** `arrive`, `ember`, `slack` are new discoveries (29 now); `fold` says what it shuts.

## A light to place, and the tides (0.29)
Rules in `sim.js` marked `0.29 play`, numbers in `C.EMBER`, `C.SLACK`, `C.PATRON_DIM` and `C.ARRIVE.among`. Why, what was tried and dropped, and what they measured: `docs/evidence/play-0.29-notes.txt`.
- **Three ways to a light.** `emberStep(h, inFount, mended, dt)`: besides the fountain's mending (0.28), a hero who stands `C.EMBER.wait` seconds in its fountain in one visit (`h.homeT`) leaves with a light, hurt or not; and the hero credited with a thief's death is given one (`kill`, `C.EMBER.thief`). Event `ember` (`u`, `p`) gains `waited: true` or `thief: true`. `C.EMBER.under` is 1: any standing house of the carrier's side takes the light, whole or hurt (`mended.amt` is then 0).
- **A kept house.** The house that takes a light is kept for `C.EMBER.bright` seconds (`s.brightT`, as in 0.28): besides firing `fire` times as fast it takes `guard` of all harm, `S.slack(s)` is false for it even on a slack thread (it fires and keeps its protection), and no thief picks it (`pickMark`). Events as before: `mended`, `brightend`.
- **The tides.** `tideAfter(t)` (`S.tideAfter`) gives the next one: `C.SLACK.first`, then for each rain one that starts `pre` seconds before it and one as it ends; `every` is gone. The leaning hollow sets out `C.SLACK.lead` seconds before the thread goes slack (`W.slack.leaned`; it carries `u.lean === W.slack.n + 1` until the tide begins). No new event: `slackwarn`, then `hollow` with `extra`, then `slack`.
- **The Hush patron lives on its houses.** In `kill`, each Hush guardian or warden that falls takes `C.PATRON_DIM` of the patron's full health from it (never its last point). Event `patrondim` (`u` the patron, `by` the house, `n` houses gone, `amt`). `patron.dims` counts them. Not in Ever Fallen or First Rain. The Reign's patron is unchanged.
- **An arrival needs company.** `arrive(h)` strikes only if a Hush trooper is within `C.ARRIVE.r` of the landing (`C.ARRIVE.among`); a rider who lets go behind its own line lands quietly and no `arrive` event is sent. This is what took the bots' arrivals out of a match they were winning for a player who knew nothing.
- **View hooks waiting for an artist.** Nothing new is drawn. Wanted: a kept house against a merely lit one (`s.brightT`: it shrugs off harm and ignores the slack thread), a hero waiting for a light in the fountain (`h.homeT` rising to `C.EMBER.wait`), the light passing from a caught thief to its catcher (`ember` with `thief`), the hollow walking down a thread that has been warned (`u.lean === W.slack.n + 1` while `W.slack.warned`), the Hush patron dimmer for each house gone (`patron.dims`, 0 to 6; event `patrondim`). No sounds either. `ui.js` lines marked `0.29 play` carry the words.
- **Debrief.** The `ember` and `slack` cards say the new rules. No new discovery id.

## Paper heroes: from sheet to screen

The painted cards, the look until 0.23 and still one setting away: flat painted cutouts that always face the camera.

1. **Sheets.** A turnaround sheet has four figures in a row on flat mid-grey, feet on one baseline: front, left side, back, three-quarter. A motion sheet has seven: front, side and back with the arms removed, one arm from the side, one from the front, and the aiming pose from behind and from the side. Originals live in [`docs/sheets/`](sheets/).
2. **Cut.** `python3 tools/sheet.py SHEET.png art/heroes/NAME.png` makes four equal cells with a transparent background. `python3 tools/motion.py SHEET.png art/heroes/NAME-motion.png` makes seven and prints the arm length. Both need Pillow and numpy.
3. **List.** One line in `PAPER` in `gfx.js`: `NAME: { src, h (height in metres), hem (where the legs start, 0 to 1), motion, arms: { y, x, len } }`. If a picture is missing or fails to load, the built shapes in `heroModel` are used instead.
4. **Build.** `paperFor(g, id)` cuts the picture into a puppet: a body grid (6 by 14 quads) above the hem, legs below it hinged at the hem, and from the motion sheet two arms that hang from the shoulders. Each grid remembers its rest shape.
5. **Every frame.** `R.frame` picks the painted view from the angle between the hero's facing and the camera, mirrored for the other side. A change of view turns like a card (0.15 s; 0.09 s for raising the aim). `LL.paperMotion.pose(rig, unit, dt, t, reduced, screen)` gives stride, aim, squash, lean and spring values; `bendBody` and `bendJoint` move the grid's vertices (body curve, cloak trail, hem flare, head lag, knees and elbows). `heroize` adds a shader that darkens the feet and puts a thin rim of the view's light on the cut edge.

Stride length and hem height per hero are in `RIGS` in `motion.js`.

**Painted flats** work the same way for everything else: `FLATS` in `gfx.js` lists painted rows of cells (houses, towers, troopers, hollows, thieves, the Ness, trees, rocks, the backdrop). `standFlat` replaces one built model with a cutout; `Boards` draws a crowd of cutouts as instanced quads. Which slots exist, their cell order and the line to add: [`art/flats/README.md`](../art/flats/README.md).

## Props and scenery hooks

`props.js` and `scenery.js` were written in parallel with `gfx.js` by separate agents, so each joins it at a few marked lines (search `gfx.js` for `LL.props.` and `SCN.`):

- Props: `LL.props.troopers` (in `buildInstanced`), `hushTower`, `hushWard`, `hushRuin` (in `structModel`), `rocks` (in `buildDecor`), and per frame `begin`, `lantern`, `hollow`, `stolen`, `end`.
- Scenery: `SCN.begin` and `SCN.groundTint` (before the ground is coloured), `SCN.build` (loch, moon, mist, stars), `SCN.trees` and `SCN.world` (once the match exists), `SCN.frame`.

Both are presentation only: they read the unit or `W` they are handed and never write to the model. Both keep per-frame work on the GPU and draw with a handful of instanced or baked meshes. Scenery thins itself under Lighter graphics (`R.low`); both go still under reduced motion (`R.reduced`).

**What the play camera sees (0.25).** The owner judges the game from the play camera, low behind the hero, so 0.25 worked on three things that fill that frame. None of them added a hook line in `gfx.js`.

- *Reign backs* (`reignCape` in `props.js`, issue #31). From behind, a Reign trooper now wears a cape in the exact team colour (`REIGN.team`, so each look's `team[0]` replaces it), from under the capelet to below the knee, pleated, with a gold band on its torn hem and a raised gold lantern diamond high on the back; the cloak's hem is gold and the scarf tails are broader. It is self-lit through `glw` because a trooper walking toward the Hush has its back to the moon. 364 to 428 triangles per trooper; still one instanced draw for the crowd.
- *Hollow backs* (`hushGeo(LK, true)`, `hollowLightGeo`, `P.hollow` in `props.js`, issue #32). The back tatters part at the spine; a torn rift of cold light (pale core, lilac rim, dark fringe) runs down it, with a crest of shards either side and two tears of light on each flank. The rift and tears are unlit and unfogged in the same mesh as the hollow's eyes, so they cost no draw; `P.hollow` puts one more point in the shared glow layer at the rift. `HOLLOW_BACK` is where the back is, for anything else that must sit on it. Small Hush troopers and thieves are built by the other branch of `hushGeo` and do not change. Hollow 368 to 457 triangles, its lights 8 to 96.
- *The verge* (`vergeMesh`, `VERGE_F`, `PAL.<look>.verge` in `scenery.js`, issue #29). One ribbon per thread, 4.4 m either side of the thread's own wander (the `sin(s * 0.11 + l * 2) * 1.1` that `buildThreads` uses), painted in the fragment shader: a worn path that the thread's warm light lies on, its edge (a soft shade at night, a broken drawn line in Origami, a dashed lit line in Hypermetapunk), drifts against the thread, dabs of shadowed and lit grass, and flowers in patches that stay round on screen. It blends as `ground x m + add` (`One, OneMinusSrcAlpha`), so it follows each look's own ground and light; `PAL.verge` only says how much. It is flat, so it never hides a trooper's feet or a soul orb, and it stays well below the thread's brightness. Plants with height still keep out of the band where troopers march (3.1 m either side of the lane line plus a body; `clearSpot` now takes that limit), but a new line of low flowers and tufts steps in to 3.65 m. Cost (`tools/scenerytris.js`): one draw call and 6,776 triangles for the verge, and 7,791 more triangles in the existing plant mesh (39,544 to 47,335; no new draw). Under Lighter graphics neither is built: no draw added, the plant mesh stays 18,537.

Captures for all three: `tools/shots/world.js` (staged player-camera shots, scene draw calls and triangles).

## The wardrobe (0.23)

Rewards you can see (roadmap phase 1). `js/wardrobe.js` holds a catalogue of seventeen things in five slots (trail, footfall, ring, light, dash), in the order a player meets them, each with a rule that reads only saved settings: First Rains finished (`cfg.rains`), First Rain stars all told (`cfg.starsTotal`), goals ever done (`cfg.goalsEver`), Cabinet secrets (`cfg.unl`), lights brought back in Ever Fallen (`cfg.lightsTotal`), livelock wins per difficulty (`cfg.winsBy`), best stars. What is worn is `cfg.wear`. It changes no rule and nothing in `W`; only a person earns things, as with the Cabinet.

It joins the rest at lines marked `0.23 wardrobe`: `main.js` calls `WD.adopt` after loading settings (defaults and repair for old saves) and `WD.fx` after each event; `gfx.js` calls `WD.build` in `R.build`, `WD.hero` at the top of the hero loop for the player only, and `WD.ghost` at the end of `ghost()` (and reads `userData.op` in `stepGhosts`); `ui.js` exposes `UI.feed` and `UI.show`; `index.html` has the title button, the `#ward` screen, `css/wardrobe.css` and the script, before `gfx.js`. In the valley it draws with its own three instanced quad systems, a ring decal and a light on a spring, flagged so the looks leave its colours alone; colours per look are in `WD.PAL`. To add a thing: an entry in `WD.ITEMS` (where it sits is where it comes on the ladder), its colours in `PAL`, and for a trail or footfall its motion in `FX`; `tools/test.js` checks the ladder still gives something every match or two. Captures: `tools/shots/wardrobe.js`.

## How to add ...

**A hero.** A row appended to `LL.HEROES` in `core.js` (appended: saves store the hero as an index): stats, a gun, three abilities described by `kind` (`orb`, `line`, `nova`, `dash`, `blink`, `zone`, `turret`, `lift`) plus numbers, so most heroes need no new code. A rig in `RIGS` in `motion.js`. A `HERO.<id>` block in `heroes3d.js` for the figure. Sheets and a `PAPER` line for the picture. A `KICK` value in `gfx.js` and a shot sound in `audio.js`. Rook Vale (0.25) is the worked example; search for `0.25 rook`. Keep the lore notes at the top of `core.js` intact.

**A rule.** In `sim.js`, as a function called from `S.step` or from an action. Emit an event with `fx({ k: 'name', ... })` if anything should be seen or heard, and answer it in `R.fx`, `A.fx` or `UI.fx`. Add a test to `tools/test.js` that drives the real sim and checks the rule. Say in the file's `DESIGN` header what the rule is for.

**A prop or a piece of scenery.** In `props.js` or `scenery.js`, reached from one marked hook line in `gfx.js`. Instanced or baked, no allocation per frame, flagged so `applyLook()` treats it right, and a capture in at least Cobalt Snow plus one other view.

**A painted picture.** See [`art/flats/README.md`](../art/flats/README.md) and the rules in [`ASSETS.md`](../ASSETS.md).

## Tests, tools and captures

| Where | What |
|---|---|
| [`tools/test.js`](../tools/test.js) | Rule regressions and the motion rig, under Node. Runs in CI on every pull request |
| [`tools/test-debrief.js`](../tools/test-debrief.js) | Dreamwalk description, export and integration contracts, under Node. Runs in CI on every pull request |
| [`tools/soak.js`](../tools/soak.js), [`fallen.js`](../tools/fallen.js), [`timeline.js`](../tools/timeline.js), [`redrain.js`](../tools/redrain.js) | Bot-only matches: win rates, Ever Fallen hold times, one match as a timeline, red-rain variants. Simulator results, never human results |
| [`tools/propstris.js`](../tools/propstris.js) | Triangle counts of the props, under Node (needs a local three.js r128 in `THREE_JS`) |
| [`tools/scenerytris.js`](../tools/scenerytris.js) | Triangles in scenery's plant mesh and the verge (0.25), normal and Lighter graphics, under Node; `ROOT` argument to compare another checkout |
| [`tools/evidence.js`](../tools/evidence.js), [`tools/shots/`](../tools/shots/) | Headless Chrome captures through Playwright: frames, motion strips, draw calls, offline audio levels. See [`tools/shots/README.md`](../tools/shots/README.md); `world.js` stages the play camera's frame (0.25) |
| [`docs/evidence/`](evidence/) | Committed frames, clips and logs that back the "seen in frame" and "measured" claims |

Debug handles the tools use (the game never does): `LL.dbg.view`, `R._heroes`, `R._phase`, `R._flats`, `R._cue`, `R._calls`, `LL.scenery._dbg`, `LL.audio.offline`. `R.info()` feeds both the tools and the pause screen's frame-rate report.
