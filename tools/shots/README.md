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
| `music.js` | 0.21 music and mute wiring: clicks once, then reports which cue each deck plays on the title, in a match, in a fight, in red rain, paused and at a win; screenshots of both mute buttons. Proves wiring, not sound. `PORT`, `OUT` |
