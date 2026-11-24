# Assets: what the MIT licence does not cover

Livloch's **code is MIT** (see [`LICENSE`](LICENSE)). Its **art, characters, story, music and names are not**. They belong to the owner ([@stevoblevo](https://github.com/stevoblevo)), all rights reserved.

**What the MIT licence covers.** The licence in [`LICENSE`](LICENSE) applies to the source code of Livloch: the JavaScript in `js/`, the tools in `tools/`, `index.html`, the GitHub workflow and template files in `.github/`, and code snippets in the documentation. It does not cover the art, characters, story, music, sound recordings, concept plates, painted sheets, videos or the names Livloch and Saelion; those stay the owner's, all rights reserved, as listed below.

In plain words: you may read, run, fork, change and reuse the code for anything, including your own games. You may not take the pictures, the music, the characters or the names and use them as your own. If you ship something built from this code, bring your own art and call it something else.

This is a hobby project's honest summary, not advice from a lawyer, and no lawyer has reviewed it yet. If something here is unclear, open an issue and ask.

## Not under MIT (all rights reserved)

| What | Where |
|---|---|
| Painted heroes, motion sheets and cutouts | [`art/heroes/`](art/heroes/), [`art/flats/`](art/flats/) (the pictures; the README in each folder is documentation) |
| Concept plates, key art, title and share card | [`art/concepts/`](art/concepts/), [`art/title.jpg`](art/title.jpg), [`art/card.jpg`](art/card.jpg), [`docs/concepts/`](docs/concepts/) |
| Backdrop and ground pictures | [`art/backdrop-ridge.webp`](art/backdrop-ridge.webp), [`art/ground-detail.webp`](art/ground-detail.webp) |
| Concept videos | [`art/video/`](art/video/) |
| Music and recorded sound | [`art/music/`](art/music/) and any other recording in the repository |
| Source turnaround and motion sheets | [`docs/sheets/`](docs/sheets/) |
| Screenshots, frame strips and clips of the game | the images and videos in [`docs/evidence/`](docs/evidence/) and [`docs/media/`](docs/media/) (the `.txt` logs there are plain records) |
| The names **Livloch** and **Saelion**, and the characters and world | Dora, Anna, Myra Belle, the Skein Doll, Rook Vale, the guardian fox, the Reign, the Hush, the hollows and small ones, the Ness, the valley and its lore |

The text strings inside the code (hero blurbs, menu lines, mood lines) ship under MIT with the code, so a fork can run. That does not hand over the characters or the world they describe.

## Third-party pieces the game loads

| What | Licence | How it arrives |
|---|---|---|
| [Three.js](https://threejs.org) r128 | MIT, © three.js authors | from cdnjs at page load; not copied into this repository |
| Fonts: IM Fell English, IM Fell English SC, Spectral, Zen Maru Gothic, Newsreader, DM Mono | SIL Open Font License | from Google Fonts at page load |
| [Phosphor Icons](https://phosphoricons.com), core 2.1.1 duotone | MIT, © 2023 Phosphor Icons | 43 symbols bundled in [`art/ui/debrief-symbols.svg`](art/ui/debrief-symbols.svg); [source record](art/ui/DEBRIEF-ICONS.md) and [full licence](art/ui/PHOSPHOR-LICENSE.txt). These third-party symbols retain their MIT licence. |

## Where the art and music came from

What is on record: the score was made with ElevenLabs Music from the owner's prompts ([`docs/MUSIC.md`](docs/MUSIC.md) has the prompts and how each take was picked); the turnaround and motion sheets were drawn by ChatGPT from the owner's prompts ([`docs/sheets/README.md`](docs/sheets/README.md)); Rook Vale's turnaround, `art/heroes/wick-aviator.svg`, was drawn as an SVG on the Lantern Ford study branch (`work/lantern-ford-wick-aviator`), whose notes call it an original design and say no generator ([`docs/ROOK.md`](docs/ROOK.md)); the far ridge is described by the study it came from as an original generated backdrop; for the concept plates and key art, no generator or licence is recorded ([`docs/concepts/README.md`](docs/concepts/README.md)). Recording who made each picture, with what and under what terms is an open task on the roadmap ([`docs/ROADMAP.md`](docs/ROADMAP.md), Phase 5) and has to be done before any store release.

## Contributing art, music or sound

Yes, please. The rules are short:

1. **Make it yourself, or have the right to give it.** Originals, or work under a licence that allows this use (CC0, CC BY, and so on). Say which in the pull request.
2. **Say where it came from.** Drawn by hand, painted, made with a tool (name it, and the prompt if there was one), recorded, synthesised. One or two lines is enough. This goes into the record above.
3. **No pictures of real people, and no characters you do not own** (nothing from other games, films, shows or brands).
4. **By opening a pull request that adds art, music or sound, you agree that it may be used in Livloch, and changed to fit, under the project's terms above.** You keep your credit: say how you want to be named and it goes in the credits. If you want different terms, say so in the pull request before it is merged, and the owner will answer.

There is no separate contributor agreement to sign. The [art and audio form](https://github.com/stevoblevo/livloch/issues/new?template=art-audio.yml) is a good place to start, and [`CONTRIBUTING.md`](CONTRIBUTING.md) says where each kind of picture goes.
