# Livloch: plan and timeline

Read this first. It says where the game is, what is next, and who can do each thing. Rules for working are in `AGENTS.md`. Proof for anything marked done is in `docs/ISSUE-3-REPORT.md` and `docs/evidence/`.

## What we are making
A solo (later co-op) lane game where **the stalemate is the puzzle**. Paper troopers cancel out on three threads. The player breaks the tie with clever, mostly unexplained means: folding the valley, fruit, the loch, and more to come. Not a competitor to Deadlock; no PvP is planned.

Art target: `art/title.jpg`. Folded paper lit by lanterns on a snow night.

## Timeline so far
All of this happened 15 to 17 November 2026.

| Version | What changed | Where it lives |
|---|---|---|
| 0.1 | One-shot lane shooter with mirror teams | artifact history only |
| 0.2 | The loch, the Ness, the Greatness; 20-minute hard end | artifact history only |
| 0.3 | Four looks from the Saelion kits | artifact history only |
| 0.4 | Renamed Livloch; the fold | `release/0.4` |
| 0.5 | The Hush as its own side; hero lore corrected | `release/0.5` |
| 0.6 | Cobalt Snow look from the concept plate; lantern houses; thread on the ground; bloom | `release/0.6` |
| 0.6.1 | Fix: bullets, soul orbs and bar fills had never drawn | `release/0.6.1` |
| 0.7 | Inkblot Noir look with cues; red-rain warning; rule tests; evidence pass | `release/0.7` |
| 0.8 | Fruit: lemon, rose hips, Verde Limón little and big; design comments; this plan | `release/0.8` |

## Where it stands
| Thing | State |
|---|---|
| Rules | 10 regression tests pass (`node tools/test.js`) |
| Bots | Gentle about 5 of 6, Even about 4 of 6, Cruel 0 of 6 Reign wins. Bots never die, so these flatter the Reign |
| Human play | **One phone session, at 0.1, with invisible bullets.** Nothing since |
| Sound | Measured, never heard |
| Real devices | No frame-rate data |
| Published | Claude artifact is current. GitHub Pages and `main` wait on pull requests. saelion.co untouched |

## The gate before anything else
**A person plays one full match on desktop and one on a phone, with sound, and writes down what happened.** Every item below is a guess until then. Only the owner can do this.

What to write down: was it clear what to shoot; did movement and firing feel good; when did it get boring or unfair; did you find the fold, a fruit, the Ness without being told; how did it sound.

## Next, in order
Each step is one version. "Agent" means a coding agent can do it alone. "Person" means it needs the owner.

| # | Version | Work | Who | Done when |
|---|---|---|---|---|
| 1 | n/a | Play test above | Person | Notes exist |
| 2 | 0.9 | Fix what the play test finds. Expect shooting feel first: hit reactions, recoil, camera kick, clearer hits | Agent, from the notes | The same person says it is better |
| 3 | 0.10 | Second red rain: test fewer extra hollows at 10:00 (bot data points there, not at thieves). Change one number, compare 24 bot matches each way, then a person plays Cruel | Agent, then Person | Cruel is winnable by a person who uses the fold or the Greatness, and not by bots |
| 4 | 0.11 | Thread tuning: each thread has a pitch in 31 steps; ringing a consonant interval on it strengthens your troopers there. Model rule plus test first, then sound, then a hint | Agent | Test passes; a person finds it within three matches or the hint is wrong |
| 5 | 0.12 | The Hush folds on Cruel, and thieves can be bribed with a fruit ("meet, don't take", see `docs/experiments.md`) | Agent | Tests; person confirms it reads as a rule and not a bug |
| 6 | 0.13 | Look-bound secrets, the Reignfawn way, but look-neutral in the model: the secret exists in every look and one look makes it visible | Agent | Test proves the model ignores the look |
| 7 | 1.0 candidate | Second valley (Peach Dusk or Red Rain), a between-valleys screen, save of valleys kept | Agent | Two valleys playable start to end |
| 8 | n/a | Decide engine and art pipeline for anything beyond a browser prototype. Needs real art; code cannot paint the plate | Person | A written decision |

Do not start 4 to 7 before 1 and 2. They add secrets to a game nobody has yet confirmed is fun to move and shoot in.

## Standing rules
- The model never reads the look. Tests enforce it.
- One version, one branch `release/X.Y`, never moved. `main` changes only by pull request.
- Bot results are never reported as human results.
- Nothing is deployed to saelion.co from this repo.

## Open questions for the owner
1. Is "Big little Verde Limón" two fruits (built that way) or one name?
2. Should fruit be eaten by walking through it (built that way), or shot down first?
3. Co-op: same screen, or online later?
