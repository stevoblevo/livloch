# Report against handoff issue #3

Source issue: stevoblevo/anewgam-saelion-handoff#3. Provisioning issue: stevoblevo/anewgam-saelion-handoff#4.
Everything here was done by one Claude session. The "Gale" and "Fable" lists were both worked by it; no separate agents were assigned.

## The headline finding
The evidence pass found a rendering bug that every earlier check had missed. From 0.1 to 0.6, **bullets, tower and trooper tracers, soul orbs, ability orbs and the fill of every world health bar were invisible.** Their instance colour buffers had zero length, so they drew black, and black under additive blending draws nothing. Earlier checks only looked for script errors, and there were none. Fixed here and in `hotfix/0.6.1`. The artifact has the fix; GitHub Pages does not yet.

This also means the one human session so far (phone, 0.1) was played without visible bullets or soul orbs.

## Evidence pass ("Gale" list)
| Item | Status | Where |
|---|---|---|
| 1. Each Hush type in frame | **Seen in frame.** Hollow, hush troopers and a thief placed together | `docs/evidence/*-hush-types-snow.jpg`, `*-hush-types-ink.jpg` |
| 1a. Torn-paper material | **Partly.** First capture showed smooth dark cones. Now a jagged lower edge; still a cone, not tissue paper | same |
| 1b. Lilac eyes | **Seen in frame** after enlarging them; one bar, not two eyes | same |
| 1c. Thief-to-gate trail | **Seen in frame**, small. In the Inkblot look the route is drawn as dashes | `*-light-taken.jpg`, `*-light-taken-ink.jpg` |
| 2. Light returned on capture | **Tested and seen.** Model: dark=false, health unchanged | `*-light-returned.jpg`, `tools/test.js` |
| 2. 120 s dark and 25% health | **Tested and seen.** Model: dark timer 120 s, health lost 25% | `*-guardian-dark-120.jpg`, `tools/test.js` |
| 3. Myra Belle and Skein Doll | **Seen in frame**, desktop and phone. Myra reads as round and purple with a spool; her wings are not visible from the front. The Skein Doll's copper braids read; her cardigan reads teal under the violet light | `*-myra-and-skein.jpg` |
| 3. Their abilities | **Seen in frame**, weakly: the heal circle and the knot are small in shot | `*-myra-mending-skein-knot.jpg` |
| 4. Listen to theft, rain warning, blackout | **Not done. Nobody has listened.** Measured instead: each event rendered offline produces signal; an unknown event produces none | `docs/evidence/audio-signal.txt` |
| 4a. Levels | **Measured.** Theft, thief-home and the hollow slam were near-silent next to red rain (0.10, 0.07, 0.03 against 0.62 of full scale). Raised to 0.18, 0.28, 0.27 | same |
| 4b. Mute, error, fallback behaviour | **Unverified** |
| 5. Screenshots, URL, commit, notes | Frames and `capture-log.txt` are committed. No video |

Frames come from headless Chrome with a software renderer. They show what the page draws. They say nothing about frame rate on a real device.

## Balance and interaction proof ("Fable" list)
| Item | Status | Where |
|---|---|---|
| 1. Match timeline log | **Tested.** Logs red-rain phases, structure delta, steals, hollows, player health, Mercy, Last Breath, fold and Greatness | `tools/timeline.js`, `docs/evidence/timeline-even-seed3.txt` |
| 2a. Six bot matches per setting | **Tested, reproduced:** Gentle 6/6, Even 3/6, Cruel 0/6 | `tools/soak.js`, `docs/IMPORT.md` |
| 2b. One human session per difficulty | **Not done.** Needs a person |
| 3. Second red rain | **Tested, bots only, 12 matches per row.** See below | `tools/redrain.js`, `docs/evidence/redrain-experiments.txt` |
| 4. Regression tests | **Tested, 8 of 8 pass** | `tools/test.js` |
| 5. Peachfall experiments | **Evaluated on paper only.** Nothing built | `docs/experiments.md` |

### What the red-rain runs say
| Variant | Even | Cruel |
|---|---|---|
| baseline | 5/12 | 0/12 |
| stagger thieves | 7/12 | 1/12 |
| cap one blackout at a time | 5/12 | 1/12 |
| 20 s recovery window | 8/12 | 0/12 |
| all three | 7/12 | 1/12 |

- None of the thief-side changes moves Cruel. With 12 matches a gap of two or three wins is noise.
- In the timeline, the 10:00 rain opens with six hollows on the field and the Reign loses about two structures per match between 10:00 and 12:00. Lights carried home average about one per match. The collapse looks like hollow and trooper volume, not theft.
- So the thing to test next is the second rain's extra hollows, not the thieves. That is a suggestion from bot data; no default was changed.
- A 15 s warning before each rain was added. It is presentation only and cannot change bot results.
- Bots never died in any of these runs. They retreat at 30% health and always make it. People will not, so every number here flatters the Reign.

## Gen XV: Inkblot Noir
Built as a sixth look, `ink`, with a one-key toggle (I, or the Ink button) that returns to the previous look.
- Violet for threat, amber for protected light, copper for a recoverable connection.
- Cues drawn from model state: a dashed route from each thief to what it is after (violet) or to the gate once it is carrying (copper); a ring under each Reign structure, amber when lit and pulsing violet when dark; a copper ring under each Hush structure that can currently be damaged.
- Reduced motion: with the system setting on, rain, snow, camera shake and the pulsing are off.
- **Gameplay-neutral: tested.** The look lives only in `gfx.js`, `ui.js`, `main.js` and CSS. `tools/test.js` checks that the model has no reference to it.
- **Not built:** the ghost of the recent state. Jazz-rhythm arcs. Indigo rain is plain streaks.
- **Unverified:** phone contrast and text legibility were looked at in two frames only. Whether the cues help a person has not been tried.

## Still open against the issue's acceptance list
- Human difficulty evaluation: none.
- Audible sound tested: none.
- Real phone and desktop pass by a person: none since 0.1.
- saelion.co: untouched, as required.
