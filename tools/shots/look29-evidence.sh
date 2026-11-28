#!/bin/bash
# 0.29 look: the committed evidence from tools/shots/look29.js captures. Expects, under $SRC (default /tmp/look29):
#   b-<hero> / a-<hero>    SCENE=act, before (LL_ROOT at origin/work/0.29) and after, play camera behind (after: every frame
#                          for dora, anna, myra; the rest EVERY=5)
#   bs-<hero> / as-<hero>  the same with SIDE=1 (dora, anna, myra; EVERY=5)
#   fb-<look> / fa-<look>  SCENE=faces HERO=4 LOOK=<look> for the eight views; fb-snow0 / fa-snow0 with HERO=0 (Rook's face)
#   bp-rook / ap-rook      SCENE=walk PAPER=1 HERO=4 (after: every frame); apl-rook with LOW=1; ap-myra (PAPER=1 HERO=2)
#   ai-<0..4>, bi-<0..2>   SCENE=idle EVERY=4, after and before
# Writes docs/evidence/look-0.29-*. Run from the repository root. Needs Pillow and ffmpeg.
set -e
SRC=${SRC:-/tmp/look29}; D=docs/evidence; S=tools/shots/look29-sheet.py; FONT=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf
python3 $S $D/look-0.29-cloth-behind.jpg "Cloth and a raised arm, play camera behind (1280x720, crop x1.6): before, after. The mantle and capelet now lie over the arm" act 55,75,165 240 300 1.6 "Dora before=$SRC/b-dora" "Dora after=$SRC/a-dora" "Anna before=$SRC/b-anna" "Anna after=$SRC/a-anna"
python3 $S $D/look-0.29-cloth-side.jpg "Cloth and a raised arm, side-on (crop x1.3): before, after. Dora's sleeve no longer comes out through the mantle; Myra's hands are out of her bell" act 55,95,135,165 240 300 1.3 "Dora before=$SRC/bs-dora" "Dora after=$SRC/as-dora" "Anna before=$SRC/bs-anna" "Anna after=$SRC/as-anna" "Myra before=$SRC/bs-myra" "Myra after=$SRC/as-myra"
python3 $S $D/look-0.29-hover.jpg "Myra Belle's hover, play camera behind (crop x1.4): before, legs hidden in the bell; after, tipped into the hover, legs trailing and kicking, the skirt flared" act 95,100,105,110,115,120 220 280 1.4 "before=$SRC/b-myra" "after=$SRC/a-myra"
python3 $S $D/look-0.29-hover-side.jpg "Myra Belle's hover, side-on (crop x1.3)" act 95,100,105,110,115,120 240 300 1.3 "before=$SRC/bs-myra" "after=$SRC/as-myra"
python3 $S $D/look-0.29-shield.jpg "Anna's aegis from straight behind (crop x1.4): before, its inner third behind her back and braid; after, the whole disc and the owl beside her" act 95,100,105,110,115 260 300 1.4 "before=$SRC/b-anna" "after=$SRC/a-anna"
python3 $S $D/look-0.29-arms.jpg "Arms out of skirts and coats, play camera behind (crop x1.3)" act 15,40,145,200 220 300 1.3 "Myra before=$SRC/b-myra" "Myra after=$SRC/a-myra" "Skye before=$SRC/b-skein" "Skye after=$SRC/a-skein" "Rook before=$SRC/b-rook" "Rook after=$SRC/a-rook"
python3 tools/shots/look29-faces.py $D/look-0.29-faces.jpg 3 60 snow:$SRC/fb-snow:$SRC/fa-snow ink:$SRC/fb-ink:$SRC/fa-ink origami:$SRC/fb-origami:$SRC/fa-origami glow:$SRC/fb-glow:$SRC/fa-glow lantern:$SRC/fb-lantern:$SRC/fa-lantern knight:$SRC/fb-knight:$SRC/fa-knight rain:$SRC/fb-rain:$SRC/fa-rain memory:$SRC/fb-memory:$SRC/fa-memory
python3 tools/shots/look29-faces.py $D/look-0.29-faces-rook.jpg 3 60 snow:$SRC/fb-snow0:$SRC/fa-snow0
python3 $S $D/look-0.29-paper.jpg "Painted paper (Heroes as 3D figures off): Rook walking away, walking back, standing. Before, a still card standing; after, breath, sway, a stirring hem and a nod" walk 21,24,27,51,54,72,78,84,87 180 280 1.1 "Rook before=$SRC/bp-rook" "Rook after=$SRC/ap-rook" "Rook Lighter=$SRC/apl-rook" "Myra after=$SRC/ap-myra"
ROWS=""; for h in 0 1 2 3 4; do ROWS="$ROWS after$h=$SRC/ai-$h"; done
python3 $S $D/look-0.29-idle.jpg "Idle fidgets: standing from frame 10; from about frame 70 each hero does their own thing (camera a quarter round). Rows: Dora, Anna, Myra Belle, Skye, Rook" idle 8,60,76,84,92,100,108,116 220 300 1.0 $ROWS
mp4() { ffmpeg -y -loglevel error -framerate 30 -start_number $2 -i "$SRC/$1/$3_%03d.png" -frames:v $4 -vf "scale=960:540,drawtext=fontfile=$FONT:text='$5':x=12:y=12:fontsize=17:fontcolor=white:box=1:boxcolor=0x10101c@0.6" -c:v libx264 -preset veryfast -crf 28 -pix_fmt yuv420p "$D/look-0.29-$6.mp4"; }
mp4 a-dora 15 act 120 "Dora, play camera behind: walk, aim high and fire, fire level strafing, jump, second jump (bubble)" dora
mp4 a-anna 35 act 100 "Anna: aim and throw, strafe, rock-hop and the aegis from straight behind" anna
mp4 a-myra 78 act 52 "Myra Belle: the hover, legs trailing and kicking, the skirt flared" myra
mp4 ap-rook 0 walk 90 "Rook on painted paper (Heroes as 3D figures off): walk away, walk back, stand" paper-rook
ls -la $D/look-0.29-*
