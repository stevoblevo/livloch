# Headless capture scripts

The scripts that produced every "seen in a headless frame" claim in this project. They were living in a temp folder; they are kept here so the evidence can be reproduced.

They are working tools, not polished ones. Each starts a small file server on port 8765 for the folder named by `LL_ROOT`, opens the game in headless Chrome through Playwright, drives it, and writes PNGs. The paths at the top (`/opt/npm-tools/node_modules/playwright`, `/usr/bin/google-chrome`, a local copy of three.js, output under `/tmp/t`) are from the machine they were written on; change them for yours.

| Script | What it shows |
|---|---|
| `run.js MODE` | `desk`, `phone`, `looks` (all eight views at one spot), `fold`, `fruit`, `views`, `title` |
| `modes.js` | Ever Fallen with Lean Back on a phone, start to fall, then the Cabinet, Snuff and the gallery |
| `paper.js` | A paper hero from six angles (`HERO=0` Dora, `HERO=1` Anna) |
| `dreamlook.js` | Dreamwalk shows the director's view; the saved look returns after (issue #7) |
| `walk.js` | Four moments of a painted hero's stride from behind, the side and the front |
| `house.js` | A frame facing the Reign's painted houses |
| `short.js` | A First Rain played to its end, with the mood answered, and the star count |
| `pull.js` | Goals, the links on the title, and the frame-rate report |
| `slots.js [standin]` | Every painted-art slot filled with stand-in pictures, or the plain game |
| `dream.js` | A whole Dreamwalk: which hidden things it named, and the calls list at the end |
| `sae.js` | The saelion.co copy served at `/livloch` with the site's route rule |
| `props.js` | 0.20 props: a fight, a crowd of both sides from behind and in front, rocks, and the Hush towers close (the last clears the troopers away); prints draw calls per frame. `LOOK`, `SHOTS`, `OUT`, `STANDIN=1` for the painted-cutout paths. Uses ports 8795 to 8799 |

Example: `LL_ROOT=$PWD node tools/shots/dream.js`
| `scenery.js` | 0.20 scenery: fixed poses (`fight`, `lane`, `loch`, `west`, `edge`, `base`, `high`) in several views in one run; prints scene draw calls with post off; `EVAL` runs code first |
| `fight.js` | A wide frame mid-fight, for judging the look against the key art. `LOOK`, `T` (seconds simulated), `W`, `H`, `PORT`, `OUT` |
| `motion.js` | Scripted motion: walk away, turn side-on, jump, fire, camera circles. `HERO`, `DASH=1` (a dash early on), `ZOOM`, `FOX`, `N`, `PORT`, `OUT`; encode the frames with ffmpeg |
| `wardrobe.js` | 0.23 wardrobe: the title button, the wardrobe screen (full, a locked card, scrolled, a phone in Origami), the mid-match feed line and the end screen for a first match, then four sets worn in each look in `LOOKS` (default snow, lantern, origami), driven frame by frame with a run, a dash and a jump; and a clip (Cobalt Snow, then Lantern Night). Prints what was worn and pool counts. `OUT`, `PORT` (8810), `LOOKS`, `SETS`, `HERO`, `CLIP=0`. Then `wardrobe-sheet.py OUT sheet.jpg` for the contact sheet; evidence `docs/evidence/wardrobe-0.23.*` |
| `wardrobe-checks.js` | 0.23 wardrobe behaviour with reduced motion on: credit for an old save, keyboard and controller-style navigation of the screen, wearing and saving, a locked card, Escape, a Dreamwalk earning nothing. Prints JSON. `PORT` (8812) |
| `music.js` | 0.21 music and mute wiring: clicks once, then reports which cue each deck plays on the title, in a match, in a fight, in red rain, paused and at a win; screenshots of both mute buttons. Proves wiring, not sound. `PORT`, `OUT` |
| `anna.js` | 0.21 motion: idle, walk away, strafe both ways, stop and settle, a held trigger from behind (thrown shots with their wind-up), turn, side-on run and stop, side throws, Q and E cast through `LL.gfx.fx`, the camera round to the front, a walk toward it and a stomp. `HERO` (default 1, Anna), `ZOOM`, `N`, `KEEP=a-b,c-d` (write only those frames; the rest still play), `PORT`, `OUT`; also writes `pos.json`, the hero on screen per frame, for cropping. Evidence: `docs/evidence/motion-0.21-anna-*` |
| `crop.py` | A contact sheet of `anna.js` frames cropped round the hero: `python3 tools/shots/crop.py OUT sheet.jpg 0,10,20 [cols] [w] [h] [scale]` |
| `braid-outline.py` | Not a capture: measures the braid outline in each of Anna's motion cells from the hair colours and prints the `PAPER.anna.braid` lines (0.21). `python3 tools/shots/braid-outline.py art/heroes/anna-motion.png [debug.png]` |
| `play.js` | 0.22.2 play-like motion: camera behind, the hero facing where it looks, running, strafing both ways, back-pedalling, stopping, running while the camera turns. Point `LL_ROOT` at a version folder (for example the Pages clone's `livloch/v0.19`) to compare versions frame for frame. `HERO`, `OUT`, `N`, `PORT`; 0.24: `PAPER=1` draws the painted cards, `LOOK` a view |
| `heroes3d.js` | 0.24 3D heroes: scripted close-ups of one hero by segment (idle, run, strafes firing, back-pedal, stop, aim, jump, dash, side-on, toward the camera, the Echo, the fall), writing `seg.json`; `LOOKS=a,b` the heroes side by side in each view; `TURN=1` a turntable of all four, idle then running. Prints triangles, bones and draw calls. `HERO`, `OUT`, `W`, `H`, `ZOOM`, `STEP`, `SEGS`, `PAPER=1`, `LOOK`, `PORT` (8850 to 8859). Evidence `docs/evidence/heroes3d-0.24*` |
| `feel.js` | 0.23 shot, hit and kill feel: the bot fights for `T` seconds, then `N` frames are recorded with every event passed to the renderer and HUD as main.js does. `LOOK`, `HERO`, `PORT`, `OUT` |
| `rook.js` | 0.25 Rook Vale from the play camera, driven by the real sim (controls set per frame, `LL.sim.step`, events to the renderer): run, strafes firing, Lantern Lift along the Middle thread with the catch, firing in the glide, landing, a second lift banking off the thread. Writes frames and `log.json` (height, lift state and events per frame). `OUT`, `PORT` (8873), `LOOK`, `PAPER=1`, `HUD=1`, `ZOOM`, `W`, `H`. Evidence: `docs/evidence/rook-0.25-*` |
| `picker.js` | 0.25 the title's hero picker at six window sizes (desktop, laptop, tablet, two phones, a phone on its side); prints each card's box and whether any text is clipped. `OUT`, `PORT` (8872), `SIZES`, `PICK` |
| `rook-audio.js` | 0.25 Rook Vale's sounds rendered one at a time offline (`LL.audio.offline`): peak, RMS, length, with Dora's shot and the shared toll for scale. Measures; does not listen. `PORT` (8874) |
| `rook-sheet.py` | A captioned contact sheet: `python3 tools/shots/rook-sheet.py out.jpg COLS "frame.png=caption" ... [--crop x0,y0,x1,y1] [--scale s]` |

