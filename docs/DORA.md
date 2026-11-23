# Dora pass, 18 November 2026 (updated 23 November)

"Dora" is the owner's word for: go back through the whole conversation and list what was missed, dropped or left half done. This is that list as of Livloch 0.14. Update it rather than starting a new one.

## Work by others since 18 November (checked 23 November)
All authored as the owner's account; at least one is signed "Muse".
| Where | What | What 0.19 did with it |
|---|---|---|
| PR #6, `feature/guardian-fox-v011` | Guardian fox: unlock by rescuing stolen light, Settings toggle, thread to laden thieves; two unlock tests | Taken into 0.19 with its rules, shapes and tests; given a trot, spring follow, sitting, a shadow; moved to the hero's right so it never blocks the camera. The PR itself is left for its author to close |
| Issue #7 | QA lane; Dreamwalk did not show the director's view | Dreamwalk fixed in 0.19 and checked with `tools/shots/dreamlook.js`. Real-device and human-play items still open |
| Issue #8 | Trailer plan with truth gates | Not started here |
| `work/lantern-ford-foldlight`, `work/lantern-ford-wick-aviator` | A single-lane "Lantern Ford" study: a canvas renderer, the real Storeybrook pen, Depthfield tokens and Hypermetapunk materials vendored, a shared motion rig, a painted ridge and snow texture, Rook the Wick Aviator and Wind School | Its author asked that production stay unchanged, so the branches are not merged. 0.19 took the motion rig (`js/motion.js`), the ridge (`art/backdrop-ridge.webp`) and a grain made from the snow texture (`art/ground-detail.webp`), with credit in the code. The vendored toolkits have no licence file upstream; that needs the owner's word before they ship |

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
- **The fox:** answered by the 18 November key art and poster; it is Livloch's. Not built.
- **Pictures of real people** sent alongside the concept art on 18 November were not used and are not in the repository. The game uses painted characters only.
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
