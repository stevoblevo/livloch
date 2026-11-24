#!/bin/bash
# 0.25 air: the committed evidence from AIR=1 captures (tools/shots/heroes3d.js). Expects, under $SRC (default /tmp/air):
#   F-<hero>-b (behind), F-<hero>-s (SIDE=1) for dora anna myra skein, F-skein-red (REDUCED=1), and optionally paper-myra
#   (PAPER=1) and audio.log (tools/shots/air-audio.js). Writes docs/evidence/air-0.25-*: a contact sheet per hero from
#   behind and from the side, Myra's wing beat frame by frame, the reduced-motion and painted-paper checks, and one mp4
#   per hero (behind, then side-on; real time, 30 fps). Run from the repository root. Needs Pillow and ffmpeg.
set -e
SRC=${SRC:-/tmp/air}; DST=docs/evidence; S=tools/shots/air-sheet.py; FONT=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf
sheet() { python3 $S "$SRC/$1" "$DST/air-0.25-$2.jpg" "$3" "${4:-8}" "${5:-230}" "${6:-300}" "$7"; }
sheet F-dora-b dora-behind 8,9,10,12,15,18,21,24,27,29,31,33,46,50,55,60 8 230 300 "Dora, play camera behind: one jump (take-off, top, fall, landing), then a jump while firing"
sheet F-anna-b anna-behind 8,9,10,12,17,18,20,22,24,26,28,31,35,40,42,44 8 230 300 "Anna, play camera behind: jump, then the rock-hop at frame 17 (kick off nothing, grit, braid whip), fall, landing"
sheet F-skein-b skein-behind 8,9,10,12,17,18,19,20,21,22,23,24,26,28,31,42 8 230 300 "Skein Doll, play camera behind: jump, then the spinning tuck at frame 17 (a loose forward somersault), landing"
sheet F-myra-b myra-behind 9,14,19,23,27,31,35,39,43,47,51,55,58,61,63,66 8 230 300 "Myra Belle, play camera behind: jump held through the top, hover 1.2 s (drifting right, then left, firing), spent, drop, landing"
sheet F-myra-b myra-beat 28,29,30,31,32,33,34,35 8 200 240 "Myra Belle's wings while hovering, eight frames in a row (1/30 s apart)"
sheet F-myra-b myra-release 76,80,84,88,92,96,100,104,106,108,110,113 6 230 300 "Myra Belle: a jump, a second press at the top (frame 88), let go at frame 106: she drops at once"
sheet F-dora-s dora-side 10,11,13,16,19,22,25,28,31,33,36,40 6 240 300 "Dora, side-on"
sheet F-anna-s anna-side 10,12,15,19,21,23,26,29,32,36,40,44 6 240 300 "Anna, side-on: the rock-hop from frame 20"
sheet F-skein-s skein-side 10,13,19,21,23,25,27,29,31,34,40,45 6 240 300 "Skein Doll, side-on: the tuck from frame 20"
sheet F-myra-s myra-side 11,16,21,25,29,33,37,45,53,57,60,64 6 240 300 "Myra Belle, side-on: the hover from frame 21"
sheet F-skein-red reduced-skein 9,12,17,19,21,23,26,31,42 9 200 280 "Reduced motion (Skein Doll): a tuck held still, no somersault, no beat, no particles but the old puff"
[ -d "$SRC/paper-myra" ] && sheet paper-myra paper-myra 4,12,22,30,44,62 6 220 280 "Painted paper (Heroes as 3D figures off): Myra's hover works; no new art"
[ -f "$SRC/audio.log" ] && sed -n '/^{/,/^}/p' "$SRC/audio.log" > "$DST/air-0.25-audio.json"
for h in dora anna myra skein; do
  case $h in dora) T="Dora: one jump";; anna) T="Anna: the rock-hop";; myra) T="Myra Belle: the hover";; skein) T="Skein Doll: the spinning tuck";; esac
  ffmpeg -y -loglevel error -framerate 30 -i "$SRC/F-$h-b/a%03d.png" -framerate 30 -i "$SRC/F-$h-s/a%03d.png" -filter_complex \
    "[0:v]drawtext=fontfile=$FONT:text='$T - play camera behind':x=12:y=12:fontsize=18:fontcolor=white:box=1:boxcolor=0x10101c@0.6[a];[1:v]drawtext=fontfile=$FONT:text='$T - side-on':x=12:y=12:fontsize=18:fontcolor=white:box=1:boxcolor=0x10101c@0.6[b];[a][b]concat=n=2:v=1[v]" \
    -map "[v]" -c:v libx264 -preset veryfast -crf 27 -pix_fmt yuv420p "$DST/air-0.25-$h.mp4"
done
ls -la $DST/air-0.25-*
