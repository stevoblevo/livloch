# Rook Vale, the Wick Aviator

The fifth hero, in normal matches since 0.25. A loch courier with a glazed lantern-kite on his back: for about a second he flies, then he glides down.

## Where he comes from

Rook was designed on the Lantern Ford study branch, `work/lantern-ford-wick-aviator` (its `WICK-AVIATOR.md`, `LL.FORD_FLYER` in its `js/core.js`, and the turnaround `art/heroes/wick-aviator.svg`). That study made him an unlockable bonus pilot for a separate chase. The owner asked "where rook?", so 0.25 brings Rook himself into the roster.

| Kept from the study | Not ported, and why |
|---|---|
| The name, title, colour and blurb | The Lantern Ford chase and Wind School: a separate mode, still a study |
| The three ability names and keys | The pickups and the shop shelf: one pickup has a brand-like name that the study itself flags for clearance |
| The lift's shape: a short steerable rise, then down; a thread catches him once | The unlock rule: he is on the picker from the start |
| The altitude cap and "the cooldown prevents continuous flight" | **Pack integrity** (see below) |
| The turnaround, as his painted-paper picture | |

**Why pack integrity was dropped.** In the study the pack was a second meter (72 points, 26 a lift, worn by damage, no lift below 17) refilled by pickups and the shop. Without those there is nothing to refill it, so it would only run down. A regenerating version would be a second cooldown on the same button, with a HUD element to read, and it would punish the one thing that makes him fun to play. The cooldown, the altitude cap and the spent jump already stop continuous flight (a test holds the key down for 30 seconds and counts). If the chase is ever merged, the meter belongs to that mode.

## The kit

Numbers are in `LL.HEROES` in `js/core.js`; change them there.

| | | |
|---|---|---|
| Body | 610 health, speed 7.1 | between the Skein Doll (580, 7.6) and Dora (660, 7.2) |
| Gun | **Wick sparks**: 15.5 damage, 5 a second, 18 in the magazine, 1.35 s reload, range 44, spread 0.011 | 77.5 damage a second, inside the other four (75 to 78.75). Accurate single sparks: he is meant to shoot from the air |
| Q | **Wick Skip** (`line`): 85 damage, 6.5 s cooldown, range 29, speed 65, radius 0.72 | a slow stitch along the sightline; it passes through |
| E | **Lantern Lift** (`lift`): 9 s cooldown | below |
| F | **Landing Bell** (`zone`, the ult, from level 3): 300 damage in 7.5 m with a shove, 0.9 s after he rings it, wherever he is by then; 60 s cooldown | ring it in the air, land in the middle of them. Smaller and quicker than Myra's Pull the Thread (430 in 13 m after 1.3 s, 80 s) |

### Lantern Lift

- **The rise.** 1.0 s. He leaves the ground at 6.5 m/s and climbs toward 4.2 m, easing off as he nears it. He steers at 1.35 times his speed (in practice about 1.2 times: the ordinary air steering still pulls toward his walking speed).
- **The glide.** Gravity at 0.3 of normal, sinking no faster than 3.4 m/s, until he lands. From the cap that is about 1.5 s.
- **Aloft** he aims and fires as on the ground, and can dash. He cannot jump again and nothing takes him above 4.2 m.
- **The thread.** Once per lift, if he is within 2.2 m of a thread, more than half a metre up, and moving along it (within about 45 degrees) faster than 3 m/s, the thread catches him: 0.35 s more rise. Caught in the glide, it lifts him again for that long. Crossing a thread, or hovering over one, is not following it.
- **Measured** (`node tools/test.js`, and a 60 Hz run of the sim): off a thread 2.48 s in the air, top 4.19 m, 21.5 m covered holding forward; along the Middle thread 2.80 s and 24.3 m. With the key held for 30 s he lifts three or four times and is on the ground most of that time.
- **Bots** (`botLift` in `sim.js`) lift to get away when retreating with an enemy hero within 18 m; half the time when a hero or hollow they are shooting is under 30% and more than 12 m off; and when the place they want to stand is more than 26 m away and they are running along their own thread, which is the lift the thread catches.

Rules live in `sim.js` (`liftCast`, `liftStep`, `botLift`). The model emits `lift`, `liftthread`, `glide`, `liftland`; the renderer and the sound answer them. Nothing in the model reads the renderer.

## The figure

`HERO.rook` in `js/heroes3d.js`, built after the turnaround: a cobalt wool coat to the knee with pale stitching and tan straps; a pale ceramic hood with a mint visor pushed up on the brow; a mint scarf whose tail is a kite's tail (bows along it, a verlet chain); and the **lantern-kite** on his back: an eight-sided wood frame with a slate panel, two swept kite fins hinged at its sides, and a faceted mint lantern held between them on two wooden arms. His gun is a brass wick-striker with a lit tip.

The back is the silhouette, because the play camera sits behind him: the frame, the fins rising past the shoulders, the lantern glowing in the middle, the scarf tail beside it.

4,512 triangles, 32 bones, one draw call (measured by `tools/shots/heroes3d.js`, which prints `H3._dbg`).

His own pose layer (`HERO.rook.pose`, one hook in `H3.pose`):

- **On the ground** the fins fold back, further at a run, and tick with the stride; the pack rocks a little.
- **In a lift** the body tips into the flight and banks with a turn (upright while it climbs, flatter in the glide), the legs trail with toes pointed and a slow scissor, the free arm goes out, the fins spread flat with a little dihedral and shiver, and the lantern burns brighter while it is lifting him. The gun arm still comes up to the aim, because the aim is solved after this layer.
- **Reduced motion:** no shiver, flicker or scissor; the pose itself still changes, since it says what state he is in.

Original design. The study's notes name a 1991 film as a reference for "period silhouette"; nothing from it is used: no likeness, logo, costume, or finned helmet. The hood is a plain glazed dome.

**Painted paper** (Settings, "Heroes as 3D figures" off): the turnaround SVG, four views, as the other heroes' sheets. He has no motion sheet, so in paper mode he has no separate arms and no aiming picture. That is the weak side of him; see below.

## Sound and feel

All in `js/audio.js` through `tone`, `noise`, `bell` and `edo()`, so the pitches round to semitones unless Saelion tuning is on.

| Event | Sound |
|---|---|
| A shot | a short bright crack and a triangle chirp that climbs (steps 75 to 88), a high tick after |
| Lift | a band of noise sweeping up, a triangle rising an octave (31 to 62), a high sine after |
| Glide begins | a long soft band of air, a sine sagging a little |
| The thread catches | three plucked notes going up (49, 67, 80) |
| Landing | a soft low thud |
| Landing Bell rung | a small high bell (80, with 93 over it) and a high sine after |
| Landing Bell tolls | the shared toll, with a brighter bell (49, 80) over it |

Camera kick for his gun: 0.85 (Dora 0.7, Myra 1.0, Anna 1.25, the Skein Doll 0.45). The lift itself kicks the camera 0.5. Sparks and a ring at lift-off, sparks off the lantern while it lifts him, a gold ring and sparks at the thread catch, dust and a small ring where he lands.

## What is checked, and how

- **Tested** (`node tools/test.js`, seven tests named for Rook and Lantern Lift): the roster order; his numbers within the others'; the rise, the cap, the glide's sink rate, landing; firing and steering aloft and the jump adding nothing; the cooldown; the thread catch (once, only along a thread, from the glide too, not when crossing or standing); the Landing Bell follows him and waits for level 3; bots with Rook in all three modes and as an ally; a pilot who dies mid-lift.
- **Seen in frame**, all headless Chrome with a software renderer, in `docs/evidence/`:
  - `rook-0.25-play.mp4` and `rook-0.25-play.jpg`: the play camera, the real sim (`tools/shots/rook.js`): run, strafes firing, a lift along the Middle thread with the catch, firing in the glide, landing, a second lift banking off the thread (its cooldown zeroed for the picture).
  - `rook-0.25-playcam.jpg`: scripted segments from the play camera behind him: idle, run, both strafes firing, back-pedal, aim, side-on, toward the camera, the fall, and three lifts (straight, firing, banking).
  - `rook-0.25-close.jpg`, `rook-0.25-lift-close.jpg`: the same closer, and the lift from behind, firing, and from the side.
  - `rook-0.25-turntable.mp4` and `.jpg`: all five heroes in a row, the camera circling, then each running a small circle. Rook stands at the end of the row and leaves the frame at some angles.
  - `rook-0.25-looks.jpg`: Rook between two others in all eight views, from behind and in front.
  - `rook-0.25-paper.jpg`: painted-paper mode.
  - `rook-0.25-picker-desktop.jpg` (1440, 1280, 900 and 844 px wide), `rook-0.25-picker-phone.jpg` (390 and 360 px wide): the picker with five cards. `tools/shots/picker.js` also reports no clipped text at any of the six sizes.
- **Measured** in `docs/evidence/rook-0.25-measured.txt`: the test names, the flight numbers (`node tools/rookfly.js`), a bot soak, and each sound's level and length rendered offline (`tools/shots/rook-audio.js`).
- Also measured: triangle, bone and draw counts. Bot win rates with five heroes are simulator results and noisy.
- **Unverified:** how the lift feels in the hand; whether 9 s is the right cooldown for a person; how any of the sounds sound (they are rendered, not listened to); frame rate on a real device; touch and gamepad play of the lift (it is on the ordinary E / second ability button, so no new input was added).

## Still weak

- **Paper mode.** One turnaround, no motion sheet: no arms, no aim pose, no lift picture. A motion sheet for him is the fix.
- **No touchdown control.** He lands where the glide ends. A way to cut the glide short (drop) would make the Landing Bell more deliberate; it was left out to keep the jump code, which another change owns in 0.25, untouched.
- **The lantern's mint** washes toward white under bloom in the brightest views.
- **The coat's skirt** flares hard in the lift seen from the side, and its front panels swing wide in a side-on run.
- **The scarf tail** is small from the play camera, and it stands up when he has fallen on his face.
- **The lift is on a button only.** There is no height or lift meter on the HUD beyond the ability's ordinary cooldown.
- **Balance** is by numbers, not play. Bots use the lift mostly to travel.
