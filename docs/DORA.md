# Dora pass, 18 November 2026

"Dora" is the owner's word for: go back through the whole conversation and list what was missed, dropped or left half done. This is that list as of Livloch 0.14. Update it rather than starting a new one.

## Never done
| Thread | Asked | State |
|---|---|---|
| A person finishes a match | Every release since 0.1 | **Corrected 18 November:** the owner has played, repeatedly, and said it is "not enticing enough to complete a whole match yet". Earlier notes in this repository saying nobody had played were wrong. No full match has been finished. 0.16 adds goals as the first answer |
| Tidy the catalogue of `stevoblevo` repositories | First message, 15 November | Never scoped, never started. Needs the owner to say which repositories and what "optimising" means |
| Real-device frame rate | Raised at 0.6 | The owner saw no lag or dropped frames. Not measured yet; 0.16 adds a report in the pause screen with a copy button |
| How anything sounds | Raised at 0.6 | Levels were measured offline; nobody has listened |

## Open decisions for the owner
- **Anna's look.** The sheet in the game (crown, goggles, braid, green coat) is not the Save Anna art (loose curls, mint sweater). Kept for now.
- **Anna's crown.** `saelion.co/kk` says "do not take the crown". Thread or accident?
- **The fox** ("Guardian Flow" on the key art), the quest tracker and the Pets and Craft buttons: in Livloch, or Reignfawn's?
- **Fruit:** eaten by walking through it (built) or shot down first?
- **Co-op:** same screen, or online later?
- **Dreamwalk verdicts:** keep, change or cut for each hidden system. Nothing has been judged yet.

## Built but thin
- **Views are drawn differently (0.12) but the shapes under them are the same.** Next: geometry per view, Origami first.
- **Painted heroes ignore the views' colouring.** A tint per view would fix it.
- **Cutouts do not animate.** They waddle and lean.
- **Ever Fallen is this game's own reading of the name.** No canon was found to follow.
- **Balance has no target met.** The agreed target (Even with two lessons, Cruel with four) is written in `docs/PLAN.md`; no number has been tuned against it. Bots never die and never change view, so bot win rates mislead in both directions.
- **Echo (0.14) has only been tested for correctness**, not for whether it is fun or findable.
- **No art slot yet** for fruit bushes, the strays or the fold cranes.

## Waiting on pictures
Houses, towers, both troopers, hollows, small ones, the backdrop, Myra Belle, Skein Doll, the Ness, pines, rocks. The prompt is with ChatGPT; slots are in `art/flats/README.md`.

## Not built, from earlier plans
The loop (paint on the 24-second beat), Depthfield as a time view, cross-view paths, the radial view toggle, the fifteenth mode, the Hush folding back, a second valley, the four Peachfall experiments in `docs/experiments.md`, and the plate items: far castle (now possible through the backdrop slot), reflections.

## Publishing facts worth not relearning
- `saelion.co` is **not** built from `main` of `saelion-relay-canary`. It is built from a separate release line through a closed manifest (`scripts/public-files.json`) and deployed to Vercel by commit. Livloch's line is `release/livloch-*`. Two unpromoted previews by others (`/cc`, AND SO first steps) were left out on purpose.
- Rollback for saelion.co: promote the previous production deployment in Vercel.
- GitHub Pages keeps every version at `stevoblevo.github.io/livloch/vX.Y/`.
- The session's permission check sometimes refuses merges and pushes to default branches. When it does, leave a pull request and say so.
