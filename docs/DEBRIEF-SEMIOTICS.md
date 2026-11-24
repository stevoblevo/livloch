# Dreamwalk debrief: signs, rules and the player's calls

## Purpose

The end-of-walk page now explains each discovered mechanic as a short visual relationship. It retains LIVLOCH's names and atmosphere while making the trigger, consequence, duration and player intervention readable at a glance. Keep / Change / Cut remains design feedback about the mechanic.

This is a presentation change for collaboration with Claude. It does not change the simulation, the discovery conditions, the game balance, or the meaning of a saved verdict. The original page's inaccurate descriptions have been corrected against [the simulation](../js/sim.js) and [its constants](../js/core.js).

## Visual language

Five navigation domains organize the field notes:

| Domain | Navigation label | What belongs here |
| --- | --- | --- |
| Move the front | Front | Threads, waves, structure pressure and late-match escalation |
| Stay in the fight | Fight | Fruit, souls, Echo and Last breath |
| Protect the light | Light | Thieves, stolen light, Memory and recovered houses |
| Read the loch | Loch | The Ness, rare fruit, regrouping and the Greatness |
| Answer the rain | Rain | Moods, View choices, red rain and Rainwake |

Every important symbol has a short visible label. Timers and multipliers remain explicit numbers; color supports the reading rather than carrying the rule by itself. The original mechanic title, a one-line summary and an expandable **Full rule** sit beside the diagram. The symbol key introduces threads, house light, souls, Views, Hush and the causal arrow.

The diagrams use three forms:

- **Chain:** one event leads to another, such as a guard falling, activating the crease, and troops crossing threads. Arrows mean “leads to.”
- **Parallel:** independent effects or alternatives share a stated condition. Fruit types and Memory's simultaneous benefits and cost must not look like a sequence.
- **Branches:** a shared situation has different outcomes. Catching a light-carrying thief and letting it escape are separate routes; securing and denying an orb are separate choices. A full-width causal lead sits above a downward arrow and the outcomes. Outcomes sit side by side on wider screens and stack at a 390-pixel viewport.

Each diagram also has a complete plain-language `reading`. The renderer exposes that reading as the accessible description and hides the duplicated visual substructure from assistive technology. Decorative SVGs are not focusable. See [the renderer](../js/debrief.js) and [the responsive styles](../css/debrief.css).

The icon sprite is bundled locally. Its provenance and license are recorded in [DEBRIEF-ICONS.md](../art/ui/DEBRIEF-ICONS.md) and [PHOSPHOR-LICENSE.txt](../art/ui/PHOSPHOR-LICENSE.txt). Additions should reuse this vocabulary and keep their visible labels; do not replace the explanations with an unlabeled icon puzzle.

## Integration and ownership

| File | Responsibility |
| --- | --- |
| [js/debrief-data.js](../js/debrief-data.js) | Five domains, all 24 stable IDs, corrected narration, mode-aware rules and diagram descriptions |
| [js/debrief.js](../js/debrief.js) | DOM rendering, navigation, feedback controls, notes, progress, accessible descriptions and text export |
| [css/debrief.css](../css/debrief.css) | Card layout, diagram arrangements, narrow-screen behavior, focus styles and reduced-motion treatment |
| [art/ui/debrief-symbols.svg](../art/ui/debrief-symbols.svg) | Shared local SVG symbols |
| [js/ui.js](../js/ui.js) | Existing Dreamwalk discovery flow; mounts the debrief and uses the concise summary for in-game narration |
| [js/main.js](../js/main.js) | Existing configuration/save flow, now also carrying `callNotes` |
| [js/input.js](../js/input.js) | Leaves keyboard events in editable fields to those fields, so notes and radio controls can be used normally |
| [index.html](../index.html) | Loads the stylesheet and supplies data and renderer before `ui.js` |
| [tools/debrief-preview.html](../tools/debrief-preview.html) | Presentation fixture using the real debrief components and sample discoveries |
| [tools/build-debrief-preview.js](../tools/build-debrief-preview.js) | Optional portable HTML builder for the same presentation fixture |
| [tools/test-debrief.js](../tools/test-debrief.js) | Data, export, model-alignment and integration contracts |

The existing architectural rule remains intact: the model owns the View. `debrief-data.js` reads model state and constants; neither it nor the renderer writes simulation state. `core.js` and `sim.js` remain the gameplay source of truth.

### Data contract

`window.LL.debriefData` exports:

- `groups`: ordered `{ id, short, title, icon }` entries.
- `systems`: the original ID-to-`[title, rule]` mapping, with corrected descriptions.
- `get(id, world)`: a fresh card descriptor containing `id`, `title`, `group`, `summary`, `rule`, `badge` and `diagram`. Unknown IDs return `null`.

The diagram includes `kind`, `reading`, `steps`, an optional `condition`, and optional labeled `branches`. Each step carries an icon, visible label, optional detail and optional tone. `get()` performs no DOM work and does not mutate `world`. It reads `LL.C` where a model constant exists and has standalone defaults for fixtures. An omitted world means the normal match context.

`LL.debrief.mount(container, options)` receives `seen`, `cfg`, `world`, `save` and `version`. `LL.debrief.text(seen, cfg, version, world)` produces the feedback export without rendering a page. Their actual integration is in [js/ui.js](../js/ui.js).

### Discovery scope

Production mounts from the existing `dreamSeen` collection. Only systems discovered during that walk appear, and empty domains are omitted. Unknown and duplicate IDs are filtered. Domain navigation rearranges the presentation; the export retains the original discovery order.

The preview's **All 24 systems** control is a development fixture. It does not unlock or reveal undiscovered systems in the game. Saved choices about other systems are retained in configuration but excluded from the current walk's export.

## All 24 mapped systems

Stable IDs are the integration keys. Keep them unchanged so discoveries, saved choices, notes and exports continue to match.

| ID | Original title | Domain | Diagram form |
| --- | --- | --- | --- |
| `wave` | The livelock | Front | Chain |
| `zip` | Threads | Front | Chain |
| `fold` | The fold | Front | Chain |
| `structdown` | A house falls | Front | Chain |
| `mercy` | Mercy | Front | Parallel |
| `fray` | The fray | Front | Chain |
| `gutter` | The gutter | Front | Chain |
| `fruit` | Fruit | Fight | Parallel |
| `soul` | Souls and orbs | Fight | Branches |
| `echo` | Echo | Fight | Chain |
| `lastbreath` | Last breath | Fight | Chain |
| `thief` | The small ones | Light | Parallel |
| `snuff` | A stolen light | Light | Branches |
| `memory` | Memory | Light | Parallel |
| `relit` | A light recovered | Light | Chain |
| `nessup` | The Ness | Loch | Chain |
| `bigfruit` | Big fruit | Loch | Parallel |
| `fishing` | Fishing | Loch | Chain |
| `nessdown` | The Greatness | Loch | Chain |
| `redwarn` | A mood | Rain | Chain |
| `moodmiss` | Wrong view | Rain | Chain |
| `moodsolved` | The answer | Rain | Chain |
| `red` | Red rain | Rain | Chain |
| `rainwake` | Rainwake | Rain | Chain |

The owner's screenshot showed 20 of these. Mercy, The fray, The gutter and A light recovered also receive mappings so the same renderer handles every existing discovery.

## Corrections against the simulation

These are corrections to the explanation, not new mechanics. The relevant functions are in [js/sim.js](../js/sim.js); shared quantities are in [js/core.js](../js/core.js).

| Mechanic | Source-correct explanation |
| --- | --- |
| Last breath | A hit must leave the hero alive at 30% health or less. Once per life, it raises the remaining shield to at least 170 for 3.5 seconds and pushes and slows nearby enemy troopers. It does not prevent a lethal hit. Source: `damage()` and `lastBreath()`. |
| A house falls | Before the fray, a vulnerable structure takes 30% damage without nearby attacking troopers and full damage with them nearby. Structure progression locks are separate and still apply. Source: `damage()`, `structStep()` and `S.vuln()`. |
| The fold | A dead guard makes the crease available. A hero must activate the cleared crease nearby; troop redirection then lasts `C.FOLD_T`, currently 45 seconds. Source: `S.creaseFor()`, `S.fold()` and `foldTrooper()`. |
| Red rain | Match uses `C.RED_EVERY`, currently 300 seconds; Ever Fallen uses `C.FALLEN_RED_EVERY`, currently 150 seconds. Each rain lasts `C.RED_T`, currently 60 seconds. The card reads the current world's interval. Source: `S.newWorld()` and `hushStep()`. |
| The answer | Answering the mood removes extra rain hollows and wave troopers and reduces the thief surge. It does not stop thief acceleration: under default tuning, the thief timer advances at ×2 during thin rain versus ×3.5 during unanswered rain. Source: `S.setLens()`, `spawnWave()` and `hushStep()`. |
| Memory | Positive Reign blackout timers run twice as fast. Recovered-light timers run at half speed in Ever Fallen, doubling their duration. A dark house whose timer is zero still needs light recovery. Soul rewards are halved while Memory is worn. Source: `give()` and `structStep()`. |
| A stolen light | Catching the thief restores its carried light. Escape removes 25% of the house's maximum HP, with that penalty leaving at least 1 HP. Match then uses a 120-second blackout, accelerated by Memory; Ever Fallen keeps the house dark until recovery. Source: the thief branch of `kill()` and `thiefStep()`. |
| Souls and orbs | The split is half of a variable kill reward, not literally half of one soul. An enemy orb can be denied while giving the shooter 30% of that orb's value. Source: the trooper branch of `kill()` and `claimOrb()`. |
| The livelock | Waves recur every 24 seconds, but opposing numbers are not always equal. Difficulty, rain and Mercy change Hush wave sizes. Source: `spawnWave()` and `S.step()`. |
| Big fruit | The visible selector names are **Hypermetapunk**, **Origami** and **Knight Night**, mapped respectively to Big Verde Limón, Big Lemon and Big Rose hips. The underlying View IDs remain `glow`, `origami` and `knight`. Sources: `C.FRUIT`, `fruitStep()` and [gfx.js `LOOKS`](../js/gfx.js). |
| The fray and The gutter | After 15 minutes, vulnerable structures lose the missing-trooper reduction and take ×1.4 damage; progression locks remain. After 20 minutes in Match, both patrons lose 25 HP per second. The gutter does not run in Ever Fallen. Source: `damage()` and `S.step()`. |
| A light recovered | In Ever Fallen, a thief defeated by Reign relights the nearest living dark Reign house other than the patron for `C.LIT_T`, currently 80 seconds. Memory doubles that duration while worn. Source: `relight()` and `structStep()`. |

Avoid copying old `SYS` prose back over the corrected rules. When behavior changes, update the model first, then update the diagrams, visible captions, accessible readings and contracts together.

## Choices, notes and export

Each card uses a labeled radio group for **Keep**, **Change** and **Cut**. A mechanic with no valid saved verdict remains **unreviewed**. Existing saved verdicts are restored, and a **Clear** control removes a verdict without silently deleting its note. Progress counts only valid explicit choices for the discovered systems.

Selecting **Change** reveals an optional note. Notes are limited to 280 characters and stored separately in `cfg.callNotes`, keyed by the same stable mechanic IDs. A note remains visible if a player changes or clears the verdict, so their writing is preserved. The save callback uses the game's existing device-local configuration persistence; the fixture has its own storage key.

**Copy my calls** exports the version, mode, reviewed count, discovered mechanics in discovery order, explicit verdicts or `UNREVIEWED`, and any notes. Note line breaks are flattened so a note cannot masquerade as another verdict. Hidden or undiscovered saved choices are excluded. Nothing is sent to Claude automatically.

Clipboard success is reported only after the browser's write completes. If clipboard access is unavailable or rejected, the page exposes a selected, read-only text area for manual copying. See [LL.debrief.text and LL.debrief.mount](../js/debrief.js).

## Run the presentation preview

From the repository root, serve the static files over HTTP:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open [the local debrief preview](http://127.0.0.1:8000/tools/debrief-preview.html).

The fixture uses the actual data, renderer, symbol sprite and styles. It fetches the production page's shared styles, so the source fixture should be served over HTTP. Its controls offer:

- The 20 discoveries from the screenshot or all 24 supported systems.
- Match and Ever Fallen descriptions.
- A 390-pixel viewport for layout inspection.
- The production feedback controls and export behavior.

The displayed 10:47 result and discoveries are fixture data. This page does not run a match. Its feedback is saved under `livloch.debrief.preview`, separately from the game's save.

### Optional portable preview

Build a single HTML presentation fixture with:

```sh
node tools/build-debrief-preview.js /tmp/livloch-debrief-preview.html
```

The builder embeds the relevant styles, scripts, SVG sprite and title background, removes the external font link and production-page fetch, and excludes the full game. It is useful for reviewing the same debrief presentation outside a running repository server. Rebuild it after changing any source component; the generated HTML is a snapshot, not the canonical implementation.

## Verification scope

The recorded automated checkpoint is **9 debrief contract tests passed** and **28 game tests passed**. Run them from the repository root with:

```sh
node tools/test-debrief.js
node tools/test.js
```

The debrief contracts cover all 24 IDs, accessible readings, real symbol references, mode-dependent quantities, discovery-only exports, unreviewed values, bounded notes, saved-state round trips, Last breath's actual behavior, script order and keyboard handling in editable fields. The game tests exercise the existing simulation rules.

These are automated checks. Browser layout, clipboard permissions, focus behavior and actual play observations are recorded in [design-qa.md](../design-qa.md). This document makes no claim of a completed human-played match or measured real-device performance.
