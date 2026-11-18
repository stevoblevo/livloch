# Four Peachfall ideas, as separate small experiments

None of these is built. Each is sized to be tried alone, behind an option, and judged by a person. Bots cannot judge any of them.

| Idea | Smallest version in Livloch | What would count as working | Risk |
|---|---|---|---|
| **Meet, don't take** | One soul orb in ten is a "shy" orb. Shooting it denies it for both sides. Standing still within 3 m for 2 s secures it for double | Players notice without being told, and choose to stand still under fire at least sometimes | Standing still in a shooter is usually death. Needs the Hush to be thin where shy orbs appear |
| **Rule-flip** | One guardian per match silently changes what hurts it at half health: from gunfire to troopers only | A player says "it stopped working" and then finds out why within a minute | Reads as a bug unless the guardian visibly changes |
| **Out-of-phase lanterns** | Two Reign guardians on one thread alternate: each fires 2.4 s in every 6 s, never together. Killing a hush in one's light "paints" it lit for 20 s | Players time their fights to the lit one | Halves tower defence by default; needs retuning before it can be judged |
| **The Fold room** | A fourth crease that, instead of folding lanes, opens a 3×3 pocket: carry a light from one cell to another past one hazard, 30 s limit, reward is one free fold | Players go back for it a second time | Takes the player off the map while the Hush keeps pushing; reward must be worth the absence |

Order suggested: out-of-phase lanterns last, because it changes balance most. Meet, don't take first, because it is ten lines in `stepOrbs` and reuses everything.

All four must live in `sim.js` as rules that hold in every look.
