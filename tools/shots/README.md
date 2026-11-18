# Headless capture scripts

The scripts that produced every "seen in a headless frame" claim in this project. They were living in a temp folder; they are kept here so the evidence can be reproduced.

They are working tools, not polished ones. Each starts a small file server on port 8765 for the folder named by `LL_ROOT`, opens the game in headless Chrome through Playwright, drives it, and writes PNGs. The paths at the top (`/opt/npm-tools/node_modules/playwright`, `/usr/bin/google-chrome`, a local copy of three.js, output under `/tmp/t`) are from the machine they were written on; change them for yours.

| Script | What it shows |
|---|---|
| `run.js MODE` | `desk`, `phone`, `looks` (all eight views at one spot), `fold`, `fruit`, `views`, `title` |
| `modes.js` | Ever Fallen with Lean Back on a phone, start to fall, then the Cabinet, Snuff and the gallery |
| `paper.js` | A paper hero from six angles (`HERO=0` Dora, `HERO=1` Anna) |
| `walk.js` | Four moments of a painted hero's stride from behind, the side and the front |
| `house.js` | A frame facing the Reign's painted houses |
| `short.js` | A First Rain played to its end, with the mood answered, and the star count |
| `pull.js` | Goals, the links on the title, and the frame-rate report |
| `slots.js [standin]` | Every painted-art slot filled with stand-in pictures, or the plain game |
| `dream.js` | A whole Dreamwalk: which hidden things it named, and the calls list at the end |
| `sae.js` | The saelion.co copy served at `/livloch` with the site's route rule |

Example: `LL_ROOT=$PWD node tools/shots/dream.js`
