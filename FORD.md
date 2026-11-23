# The Lantern Ford | art branch
Independent playable study based on Livloch 0.18, canonical private GitHub revision
48bbac6838e2badfc46a6ace168d0c77c89ac6d6. No writes to canonical main, GitHub Pages,
the Claude artifact, or saelion.co. The study has its own localStorage namespace.
Canonical 0.18 scripts came from the exact pinned revision; existing public character and
shrine sheets came from the corresponding released build. Three.js is locally vendored,
r128, MIT, see vendor/Three-LICENSE.txt. The Ford plate was authored for the preceding
First Rain study, and the ridge is an original generated backdrop for this study.
The snow is procedural. No new third-party art, music, SDK or game service.

## Play
Enter the Ford. Move with WASD and aim with mouse. Hold click for the gun.
Press X to toggle optional target tracking. It only helps aim and never shoots.
If the thief steals the light, follow the gold and flank the shrine. The light comes
back if you catch the thief. Nothing carries over from a replay.
The hunt uses the original third-person collision camera and real aim, projectiles,
guardian snuff, chase, refund-on-capture and gate consequence. Only the scenario
staging and its thief's initial stats are specific to the study.
WebGL runs the native renderer. If no context is available, the Ford uses a CPU
paper renderer that perspective-projects the same world and camera. Full matches
still need WebGL and are not part of the art trial.

## Reproduce
Run `sh tools/build-ford.sh` then serve `dist` as static files.
`node --test tools/ford-test.js` covers real theft and escape, real projectile
recovery, restart, and no trial state in a normal match. `node tools/test.js`
is the canonical rules suite. Native GPU composition, real controller and touch,
audio listening, performance on Steam Deck, and real human input remain unverified.

## Decision gate
The core is a darkened landmark rather than a UI alert: locate the lost light, pick
a line past physical cover, catch it before the gate. For the first identically
framed hardware comparison, use Dora at the shrine, pan through the dark moment,
then flank and record a rescue without debug assists. Keep the third-person lane
only if fresh players can track that switch without instructions. If they cannot,
test a deliberate camera pivot rather than adding another view skin.

## Foldlight motion and views pass

Use `L` or the art chip to cycle **Foldlight**, **Rainprint**, and **Original**.
These are appearance treatments, not the full game's mechanical lenses. Foldlight
uses three paced Depthfield planes and Storeybrook cut-paper folds. Rainprint
changes the matte treatment, rain strokes, ground stock and wake linework.
Both share the same fight and the new distance-driven paper motion. Four existing
actors use their actual directional motion atlases, articulated leg strips and
aim transitions in the paper renderer. The native renderer uses the same motion
sampling and applies the atlas textures, but still needs a hardware visual pass.

Reusable style code: `vendor/play-stage/`; upstream bytes and hashes:
`vendor/style-upstream.json`. No changes to the Storeybrook, Hypermetapunk or
Depthfield published releases. Test with `node --test tools/ford-test.js tools/style-test.mjs`.
