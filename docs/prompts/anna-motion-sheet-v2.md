# Anna motion sheet, version 2: prompts for painted frames

0.21 makes Anna move with what we have: the braid is cut out of `art/heroes/anna-motion.png` by an outline a script measured from the hair colours, and the coat behind it is filled in by mirroring the cloth beside it. That works (see `docs/evidence/motion-0.21-anna-after.mp4`), but a painted layer would be better: the fill is a guess, the coat cannot open at its slit, the legs are one stiff strip each, and the hammer throw borrows the "aim" pose, which has no hammer in it.

These are the pictures that would fix that. Each is one image for ChatGPT's image model (or any painter), made the same way as the sheets in `docs/sheets/`: figures in one row, on one flat background, feet on one baseline, cut into cells by a script.

## How to ask

Attach `docs/sheets/anna-sheet.png` and `docs/sheets/anna-motion-sheet.png` to the chat as the reference for the character and the paint. Then paste one prompt at a time. Ask for the widest image the model offers (landscape). If a figure comes out at a different size from the others, ask for that sheet again rather than fixing it by hand: the cutting script scales every figure in a sheet by the same amount.

Every prompt below starts with this paragraph. Paste it each time.

> Same character and the same painting style as the attached reference sheets: Anna, a young field geologist, painted storybook style with soft brush texture. Gold crown with turquoise goggles strapped round it, a long red braid down her back tied near its end with a turquoise band, a knee-length dark green coat with a short shoulder cape, gold piping, gold wave embroidery along the hem and a centre slit at the front and back from the hem to just below the belt, a brown belt with a gold buckle, dark trousers, tall tan-brown boots. Flat orthographic views, no perspective. The figures stand in one row, evenly spaced, not touching, all at exactly the same scale, with their feet on one straight baseline. Plain flat light grey background (#DCDCDC), no gradient, no floor, no cast shadows, no text, no labels, no grid, no frames.

## Sheet A: the braid as its own piece (most wanted)

Saved as `docs/sheets/anna-layers-sheet.png`.

> Six figures, left to right:
> 1. Anna seen from directly behind, arms removed at the shoulders (the shoulders end cleanly under the cape), and the braid removed: show the back of her head with the hair gathered into a short knot at the nape, and the whole back of the coat, cape, belt and the back slit, unbroken, where the braid used to hang.
> 2. Anna seen from her left side, facing left, arms removed, braid removed the same way: the hair ends in the knot at the nape, and the back of the coat is fully visible.
> 3. The braid alone, seen from behind: from the knot at the nape down to the tip, hanging perfectly straight down, the same length and thickness as in figure 1 of the reference, with the turquoise band. Place its top at the same height as the nape in figure 1.
> 4. The braid alone, seen from the side, hanging straight down, same scale, top at the same height as the nape in figure 2.
> 5. Anna seen from the front, arms removed, exactly as in the reference's first motion figure (the braid is not visible from the front).
> 6. The lower half of the coat alone, seen from behind, from the belt down to the hem, split at the slit into two separate halves with a small gap between them, the trousers not shown.

What the code would do with it: figures 1, 2 and 5 replace motion cells 2, 1 and 0 (no fill needed); 3 and 4 become the braid strips, hung from their top centre (the cutting script moves a piece's top to the top centre of its cell, as `tools/motion.py` does for the arms); PAPER's `braid.cells` polygons go away. Figure 6 lets the coat halves part at the slit, which the shared-vertex flap in `bodyAt` cannot.

## Sheet B: legs that bend at the knee

Saved as `docs/sheets/anna-legs-sheet.png`.

> Eight pieces, left to right, each standing upright with its top at the same height:
> 1. Left thigh from the front, in the dark trousers, from the hip (just under the coat hem) to the knee.
> 2. Left lower leg and boot from the front, from the knee to the sole.
> 3. Right thigh from the front. 4. Right lower leg and boot from the front.
> 5. Thigh from the left side. 6. Lower leg and boot from the left side, toes pointing left.
> 7. Thigh from behind. 8. Lower leg and boot from behind.
> The knee ends of each thigh and lower leg should be rounded so they overlap cleanly when bent.

What the code would do: each leg becomes two hinged strips (`part()` twice, the shin a child of the thigh), so the knee folds without bending the boot, and the stance foot can stay flat on the ground.

## Sheet C: a side-view walk, six frames

Saved as `docs/sheets/anna-walk-sheet.png`.

> Six figures of Anna walking to the left, seen from her left side, arms removed, braid removed (as in Sheet A figure 2): a heavy, deliberate stride, slightly leaning forward.
> 1. Contact: left heel just touching down far in front, right leg straight behind, toes on the ground.
> 2. Down: weight landing on the left foot, left knee bent, body at its lowest, right foot lifting.
> 3. Passing: left leg straight under the body, right knee bent and the right foot passing beside it, body rising.
> 4. Contact: right heel touching down in front, left leg behind.
> 5. Down: weight on the right foot, body lowest.
> 6. Passing: right leg straight under the body, left foot passing.
> The coat hem swings a little with each step and lifts at the slit over the forward knee.

What the code would do: in the side view, pick the frame from the stride phase (`st.phase`, six frames per cycle) instead of scissoring one leg strip; feet would stop sliding.

## Sheet D: the hammer throw and the stomp

Saved as `docs/sheets/anna-throw-sheet.png`.

> Eight figures, with her rock hammer (a short wooden handle, a grey stone head the size of her fist):
> 1. From her left side, facing left, wind-up: hammer raised behind her head in her right hand, elbow high, weight on the back foot, body leaning back.
> 2. From her left side, throw: right arm whipping forward at shoulder height, hammer leaving the hand, weight onto the front foot, leaning forward.
> 3. From her left side, follow-through: right arm down and across in front of the body, both feet planted, still leaning forward, braid swinging forward over her shoulder.
> 4. From behind, wind-up: right arm raised, hammer behind her head.
> 5. From behind, throw: right arm reaching forward and up past her head.
> 6. From behind, follow-through: right arm across the body, low.
> 7. From the front, the Tumble stomp coming: right knee raised high, arms lifted out to the sides for balance.
> 8. From the front, the stomp landing: both feet planted wide, knees bent, arms flung out and down, coat flaring.

What the code would do: the throw cycle in `pose()` (`throw`: minus is wound up, plus is thrown) picks 1, 2, 3 (side) or 4, 5, 6 (back) instead of the arm-raised piece and the "aim" cell; `stomp` picks 7 for the first tenth of a second and 8 after.

## Cell layout the code expects

After cutting (`tools/motion.py`-style: equal cells, 640 px tall, transparent ground):

| File | Cells, in order | Notes |
|---|---|---|
| `art/heroes/anna-layers.png` | back no-braid, side no-braid, braid back, braid side, front, coat halves | braid cells: top of the braid at the top centre of the cell; record its length as a fraction of her height, as `arms.len` is |
| `art/heroes/anna-legs.png` | L thigh front, L shin front, R thigh front, R shin front, thigh side, shin side, thigh back, shin back | joint ends at the top centre |
| `art/heroes/anna-walk.png` | six side frames | feet on the bottom edge |
| `art/heroes/anna-throw.png` | side wind-up, throw, follow-through; back wind-up, throw, follow-through; stomp coming, stomp landing | feet on the bottom edge |

Keep `art/heroes/anna.png` and `anna-motion.png` as they are: every hero without the new sheets, and Anna in the three-quarter view, still use them.
