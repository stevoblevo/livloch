# Import record

## Sources
| Thing | Where |
|---|---|
| Claude artifact | https://claude.ai/artifact/RsLajwf9vQBuHcSYegmVRY |
| GitHub Pages | https://stevoblevo.github.io/livloch/ (repo `stevoblevo/stevoblevo.github.io`, path `livloch/`, branch `master`) |
| Working copy | a Claude sandbox directory; not durable, which is why this repo exists |

## Revisions
| Version | Artifact version id | Pages commit | This repo |
|---|---|---|---|
| 0.1 | 1794788631-1611 | none | not recoverable as files |
| 0.2 | 1794816144-a8d6 | none | not recoverable as files |
| 0.3 | 1794880566-4a63 | none | not recoverable as files |
| 0.4 | 1794951618-8804 | 67db8a94be5451376fbdb02d4d6dd52e4229bd24 | `import/livloch-0.5` b47fd7d902986b0a7322a3da298e0a6f73865fef |
| 0.5 | 1794952517-d35f | 0655506b2ee008e2b3886fbe5e280cf630aee850 | `import/livloch-0.5` 19d64c5d18ebc8247cb1537ec5b7e00778b0eebc |
| 0.6 | 1794959557-cd09 | 797721288747cbb93df0bff314a09aa902716cb8 | `main` 985e63ec5991c12969e3ec4346f2b42a5a1b44d2 |
| 0.6.1 | 1794961205-6969 | pending a pull request on the Pages repo | `hotfix/0.6.1` d4f4c51e14f979fc48c84692c8cf5a67e0178edb |
| 0.7 | published after this commit; see README | pending a pull request on the Pages repo | `work/issue-3-proof-and-ink`, PR #1 |

## Versioning
This session cannot push tags or create releases (the GitHub proxy refuses both), so each version is a branch: `release/0.4`, `release/0.5`, `release/0.6`, `release/0.6.1`, `release/0.7`. They never move. Turn them into tags from a normal clone with `git tag v0.7 origin/release/0.7 && git push --tags` if tags are wanted.

On GitHub Pages every version stays playable under `livloch/vX.Y/`, listed at `livloch/versions/`, the way Knight Side keeps `v1` to `v11`.

0.1 to 0.3 exist only as artifact versions. The artifact tools read the current version, so those three were not imported.

## How the import was done
`import/livloch-0.5` starts from the initial commit `62a3a86` and adds two commits, 0.4 and 0.5. Each is the `livloch/` tree of the Pages commit named above, extracted with `git archive`, with the original commit date and subject. Each tree was compared against the Pages tree with `diff -r` and matched. Nothing was retyped or regenerated.

`main` holds 0.6. It got there by a direct push (`985e63e`) from a command that was interrupted mid-run, before the instruction to import through a branch arrived. It was left in place rather than reverted; no force-push was used anywhere.

## Checks run on the 0.5 tree (`19d64c5`)
| Check | Result |
|---|---|
| `node --check` on every script | pass |
| bot soak, 6 matches per difficulty | Gentle 6/6, Even 3/6, Cruel 0/6 Reign wins. Matches the reported baseline |
| headless Chrome, phone viewport, start a match and step it | no script errors |
| headless Chrome, desktop viewport, play to the end on autopilot | no script errors; match ended at 12:18, Hush won |

Not checked on 0.5: anything by a person, anything by ear, any real device.

## Rollback
- Repo: `main` can be returned to any earlier state with `git revert`; the import branch is additive and can simply be deleted.
- Pages: `git revert` the Livloch commits on `stevoblevo.github.io` `master`, newest first: `7977212`, `0655506`, `67db8a9`. Each touches only `livloch/`, except `67db8a9`, which also adds one link line to `index.html` and one entry to `saelion-atlas/worlds.json`.
- Artifact: republish an earlier version's files. Version ids are in the table above.
- saelion.co: nothing was deployed there, so there is nothing to roll back.
