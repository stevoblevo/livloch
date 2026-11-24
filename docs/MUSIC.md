# Music

Livloch's score since 0.21: eight recorded cues in `art/music/`, played by `js/audio.js`. They replace the single
31-step drone that 0.1–0.20 used as "music", which the owner rightly called nonsense nobody wants to listen to.

The music is part of the game's assets, not the MIT-licensed code: see the license notes in the repository root.

## The cues

| File | Cue | When it plays | Source take |
|---|---|---|---|
| `title.mp3` | title | title screen, menus, after a match | title-b |
| `valley-1.mp3`, `valley-2.mp3` | valley | a match, when nothing is pressing; the two takes alternate | valley-a, valley-b |
| `battle-1.mp3`, `battle-2.mp3` | battle | the fight is hot around the player; the takes alternate | battle-a, battle-b |
| `red.mp3` | red | while the rain is red (`W.red > 0`) | red-b |
| `win.mp3` | win (stinger) | the match ends in a win | win-a |
| `lose.mp3` | lose (stinger) | the match ends any other way | lose-b |

Home key A major, tense cues in its relative F sharp minor. The effects in `audio.js` are written in 31 steps to the
octave but rounded to ordinary semitones by default, which puts every chime in A major with the score. Settings has
"Saelion tuning" to hear them in 31 steps again (and brings the old drone back under the effects).

## How it plays

- Two decks crossfade. A cue change fades over about 2.6 s; a cue loops by starting its next take on the other deck
  4 s before the end, so long matches alternate takes instead of repeating one.
- Battle comes in when "heat" stays above 0.55 for a second and leaves after about seven seconds below 0.25. Heat is
  1 if the player was hurt in the last 4 s, otherwise up to 0.8 for a crowd of Hush within about 24 m (a hollow counts
  as four), and a structure falling nearby bumps it to 0.8.
- Red rain overrides battle. The stinger fades the loop out, plays on its own, then the title cue comes back under
  the end screen.
- Pausing ducks the music to 45%.
- Volumes: master × music, master × effects; mute silences everything (round button top right on the title and menus,
  a small speaker in the match HUD, key M). All of it is saved with the other settings.
- Browsers only start audio after a gesture, so the first tap or key anywhere starts the title music.

Check the wiring with `node tools/shots/music.js` (headless: it proves which cue each deck plays, not how it sounds).

## How the cues were made

ElevenLabs Music v2.5 on the owner's account, 23 November 2026, flow "Livloch music 0.21", two takes per cue,
instrumental. Picks were made by measurement, not by ear: loudness over time, brightness, how each take starts and
ends (a stinger has to start at once; a loop is better without a long fade). Then each pick was trimmed of leading
silence, normalised (loops about −16 to −17 LUFS, stingers −15 to −21, true peak −1.5 dBTP) and encoded as 112 kb/s
MP3, 9.9 MB in all. The other takes are still in the ElevenLabs flow if one of these sounds wrong.

Prompts, so anyone can make a matching cue:

- **title** (96 s): Gentle, wistful orchestral folk-fantasy title theme in A major at a slow 70 BPM. A warm wooden flute
  carries a simple, singable lullaby melody over flowing harp arpeggios, soft string pads and a distant wordless choir,
  with celesta sparkles. It opens sparse with harp and flute, swells warmly with strings in the middle, then settles
  back to harp so it can loop. Intimate, hand-made, cozy production with a soft hall reverb; no drums, no vocals.
- **valley** (150 s): Adventurous but relaxed folk-fantasy game background music in A major at 96 BPM. A plucked harp and
  nylon guitar ostinato, light frame drum and shaker groove, warm cello bass, with a tin whistle and fiddle trading a
  hopeful melody. Steady, even energy throughout with gentle lifts every 30 seconds, mixed with space in the mids so
  sound effects sit on top. Organic, acoustic, warm production; no vocals.
- **battle** (120 s): Driving fantasy battle music in F sharp minor at 128 BPM. Taiko and frame drums with a relentless
  pulse, staccato string ostinato, low brass swells and horn calls, a bold fiddle and flute counter-melody, building
  tension without becoming harsh. Consistent high energy across the whole track so it can loop under combat.
  Cinematic but grounded acoustic orchestral production; no vocals.
- **red** (75 s): Eerie, tense dark-ambient fantasy cue in F sharp minor at a slow 60 BPM. Low sustained cellos and
  basses, a slow heartbeat on a muffled bass drum, glassy bowed metal and a detuned music box playing a fragile
  falling motif, distant tolling bells. Quiet but unsettling, slowly building pressure, never loud. Atmospheric
  cinematic production; no vocals.
- **win** (14 s): Short triumphant folk-orchestral victory fanfare in A major: rising harp glissando, bright horns and
  strings stating a warm heroic phrase, a celebratory frame drum roll, ending on a sustained major chord with bells
  ringing out. Joyful and warm, cinematic acoustic production; no vocals.
- **lose** (14 s): Short sorrowful folk-orchestral lament in F sharp minor: a solo cello and wooden flute play a slow
  falling phrase over soft strings, a single low bell, fading into quiet harp. Gentle and melancholic rather than
  harsh, cinematic acoustic production; no vocals.

## Unverified

The owner plays with sound on; nobody else has reported yet. The fit of each take, the crossfade points, the balance
against the effects and the battle thresholds want more ears on more speakers. Report what sounds wrong in an issue labelled
`music`.
