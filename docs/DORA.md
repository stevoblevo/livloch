# Dora pass, 18 November 2026 (updated 23 November)

"Dora" is the owner's word for: go back through the whole conversation and list what was missed, dropped or left half done. This list was started at Livloch 0.14 and last updated at 0.21. Update it rather than starting a new one; where an item now has an issue, the number is given.

## Work by others since 18 November (checked 23 November)
All authored as the owner's account; at least one is signed "Muse".
| Where | What | What 0.19 did with it |
|---|---|---|
| PR #6, `feature/guardian-fox-v011` | Guardian fox: unlock by rescuing stolen light, Settings toggle, thread to laden thieves; two unlock tests | Taken into 0.19 with its rules, shapes and tests; given a trot, spring follow, sitting, a shadow; moved to the hero's right so it never blocks the camera. The PR itself is left for its author to close |
| Issue #7 | QA lane; Dreamwalk did not show the director's view | Dreamwalk fixed in 0.19 and checked with `tools/shots/dreamlook.js`. Real-device and human-play items still open |
| Issue #8 | Trailer plan with truth gates | Not started here |
| `work/lantern-ford-foldlight`, `work/lantern-ford-wick-aviator` | A single-lane "Lantern Ford" study: a canvas renderer, the real Storeybrook pen, Depthfield tokens and Hypermetapunk materials vendored, a shared motion rig, a painted ridge and snow texture, Rook the Wick Aviator and Wind School | Its author asked that production stay unchanged, so the branches are not merged. 0.19 took the motion rig (`js/motion.js`), the ridge (`art/backdrop-ridge.webp`) and a grain made from the snow texture (`art/ground-detail.webp`), with credit in the code. The vendored toolkits have no licence file upstream; that needs the owner's word before they ship |

## Opened to everyone (0.21, 23 November)
The owner: "We're doing everything public. Make this fully collaborative on GitHub so that any and all of our other agents can also collaborate and develop this game with us; we would love even anonymous strangers developing it with us." Done in the repository: `LICENSE` (MIT for the code), `ASSETS.md` (art, characters, story, music and names stay the owner's), `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, issue forms, a pull request checklist, CI, `docs/ARCHITECTURE.md`, a "Start here" in `AGENTS.md`, labels, and fifteen seed issues (#25 to #39). Left for the owner or lead: making the repository public, turning on Discussions and private vulnerability reporting, and protecting `main`.

## Dreamwalk field notes (issue #23)
The owner asked ChatGPT to make the end page clear through semiotics, in collaboration with Claude. The proposed implementation uses labeled diagrams for all 24 existing discoveries, five navigation groups, explicit durations and conditions, saved Keep / Change / Cut calls, optional notes and a complete text export. [The handoff](DEBRIEF-SEMIOTICS.md) records source corrections; [design QA](../design-qa.md) records the 28 game / 9 debrief test passes and desktop/390-pixel presentation captures. The cloud browser could not render WebGL, so a completed live Dreamwalk and real-device checks remain for integration. The owner's actual verdicts remain undecided; the QA choices were cleared.

## Never done
| Thread | Asked | State |
|---|---|---|
| A person finishes a match | Every release since 0.1 | **Corrected 18 November:** the owner has played, repeatedly, and said it is "not enticing enough to complete a whole match yet". Earlier notes in this repository saying nobody had played were wrong. No full match has been finished. 0.16 adds goals as the first answer |
| Tidy the catalogue of `stevoblevo` repositories | First message, 15 November | Never scoped, never started. Needs the owner to say which repositories and what "optimising" means |
| Real-device frame rate | Raised at 0.6 | The owner saw no lag or dropped frames. Not measured yet; 0.16 adds a report in the pause screen with a copy button. Reports wanted: #25 |
| How anything sounds | Raised at 0.6 | 0.21 replaced the drone with a recorded score (`docs/MUSIC.md`). Levels were measured; the owner plays with sound on, other ears wanted. Reports wanted: #26 |

## Open decisions for the owner
- **Anna's look.** The sheet in the game (crown, goggles, braid, green coat) is not the Save Anna art (loose curls, mint sweater). Kept for now.
- **Anna's crown.** `saelion.co/kk` says "do not take the crown". Thread or accident?
- **The fox:** answered by the 18 November key art and poster; it is Livloch's. Built in 0.19 from PR #6 as a low-poly fox; a painted fox sheet would replace it.
- **Pictures of real people** sent alongside the concept art on 18 November were not used and are not in the repository. The game uses painted characters only.
- **Fruit:** eaten by walking through it (built) or shot down first?
- **Co-op:** same screen, or online later?
- **Dreamwalk verdicts:** keep, change or cut for each hidden system. Nothing has been judged yet.

## Built but thin
- **Views are drawn differently (0.12) but the shapes under them are the same.** Next: geometry per view, Origami first.
- **Painted heroes ignore the views' colouring.** A tint per view would fix it (#34).
- **Cutouts animate, but only so far.** They walk (0.15), swing their arms and aim (0.18), and bend with follow-through (0.20). There is no hit or death pose beyond a spring knock and the card-like fall.
- **Ever Fallen is this game's own reading of the name.** No canon was found to follow.
- **Balance has no target met.** The agreed target (Even with two lessons, Cruel with four) is written in `docs/PLAN.md`; no number has been tuned against it. Bots never die and never change view, so bot win rates mislead in both directions.
- **Echo (0.14) has only been tested for correctness**, not for whether it is fun or findable.
- **No art slot yet** for fruit bushes, the strays or the fold cranes (#39).
- **0.20's known soft spots:** the ground beside the threads (#29), the moon (#30), Reign trooper backs at distance (#31), hollows from behind (#32), Origami blossoms too grey (#33). The cinematic title camera is built but hidden behind the painting (#36).
- **The sim is not deterministic for a seed** (`Math.random` in a few timers), so bot results are noisy and replays cannot be built (#27).

## Waiting on pictures
Towers, both troopers, hollows, small ones, the castle and floating islands for the backdrop, the Ness, pines, rocks (houses, the far ridge and all four heroes are done). The prompt is with ChatGPT; slots are in `art/flats/README.md`. Anyone may offer sheets: #35.

## Not built, from earlier plans
The loop (paint on the 24-second beat), Depthfield as a time view, cross-view paths, the radial view toggle, the fifteenth mode, the Hush folding back, a second valley, the four Peachfall experiments in `docs/experiments.md`, and the plate items: far castle (now possible through the backdrop slot), reflections.

## Publishing facts worth not relearning
- `saelion.co` is **not** built from `main` of `saelion-relay-canary`. It is built from a separate release line through a closed manifest (`scripts/public-files.json`) and deployed to Vercel by commit. Livloch's line is `release/livloch-*`. Two unpromoted previews by others (`/cc`, AND SO first steps) were left out on purpose.
- Rollback for saelion.co: promote the previous production deployment in Vercel.
- GitHub Pages keeps every version at `stevoblevo.github.io/livloch/vX.Y/`.
- Everything is public since 0.21. The Claude artifact copy stopped at 0.20 and is not updated any more; the public places are saelion.co/livloch and GitHub Pages.
- The session's permission check sometimes refuses merges and pushes to default branches. When it does, leave a pull request and say so.
