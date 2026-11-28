# Painted cutouts

Drop a picture here, add one line to `FLATS` in `js/gfx.js`, and it replaces the built shapes. Missing or failed pictures leave the built shapes in place. Make each picture with `python3 tools/sheet.py SHEET.png art/flats/NAME.png`.

Every sheet: figures in one row on a flat mid-grey background, feet on one baseline, same paint style and proportions as `art/heroes/dora.png`.

| File | Figures, left to right | Replaces | Line to add |
|---|---|---|---|
| `house.png` | small, medium, large lantern house | Reign guardian, warden, patron | `FLATS.house = { src: 'art/flats/house.png', cells: 3 };` |
| `tower.png` | small, medium, large Hush tower | Hush guardian, warden, patron | `FLATS.tower = { src: 'art/flats/tower.png', cells: 3 };` |
| `trooper.png` | front, back | Reign trooper | `FLATS.trooper = { src: 'art/flats/trooper.png', cells: 2 };` |
| `hush.png` | front, back | Hush trooper | `FLATS.hush = { src: 'art/flats/hush.png', cells: 2 };` |
| `hollow.png` | front, back | the big ones | `FLATS.hollow = { src: 'art/flats/hollow.png', cells: 2 };` |
| `thief.png` | front, back | the small ones | `FLATS.thief = { src: 'art/flats/thief.png', cells: 2 };` |
| `ness.png` | one side view, facing left | the Ness | `FLATS.ness = { src: 'art/flats/ness.png', cells: 1 };` |
| `pines.png` | three different trees | all trees | `FLATS.pines = { src: 'art/flats/pines.png', cells: 3 };` |
| `rocks.png` | three different rocks | all rocks | `FLATS.rocks = { src: 'art/flats/rocks.png', cells: 3 };` |
| `fruit.png` | lemon, rose hips, Verde Limón, big lemon, big rose hips, big Verde Limón (the bush only, no fruit) | the leaves and stem of each fruit bush; the fruit and its glow stay built, in the fruit's own colour | `FLATS.fruit = { src: 'art/flats/fruit.png', cells: 6, paper: true };` |
| `stray.png` | front, back | the strays | `FLATS.stray = { src: 'art/flats/stray.png', cells: 2, paper: true };` |
| `crane.png` | wings up, wings down (side view) | the fold crane; the two cells alternate as the wings flap | `FLATS.crane = { src: 'art/flats/crane.png', cells: 2, paper: true };` |
| `../backdrop.jpg` | one wide painting, no cutting needed | the far view; the valley walls drop to foothills | `FLATS.backdrop = { src: 'art/backdrop.jpg', cells: 1 };` |

`paper: true` (the three rows above) puts the picture in only for Origami, Knight Night and Lighter graphics; the 3D props stay for the full views. Add `always: true` to use it in every look. The files here are stand-ins drawn by `python3 tools/flats-standins.py`; replace them with real paintings.

Heroes go in `art/heroes/` with four figures (front, left side, back, three-quarter) and a line in `PAPER`.

Backdrop notes: it wraps all the way round and is mirrored once, so the left and right edges need not match. Put the horizon about a tenth of the way up from the bottom; the strip below it is hidden. No characters, no text.

Tested with stand-in pictures in every slot (0.13). `house.png` is real and switched on since 0.18; the sheet draws the three sizes to scale, so each cell is given the same height in the game.
