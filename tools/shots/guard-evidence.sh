#!/bin/bash
# 0.26 guard: the committed evidence from tools/shots/guard.js captures. Expects, under $SRC (default /tmp/guard/final):
#   anna (HERO=1), anna-side (HERO=1 CAM=1.35 SEGS=guard), dora (HERO=0 SEGS=guard,boost), dora-hat (HERO=0 HUD=1 SEGS=hat),
#   myra (HERO=2 HUD=1), skye (HERO=3), rook (HERO=4), skye-red and rook-red (REDUCED=1), dora-paper (PAPER=1 SEGS=guard),
#   and audio.log (tools/shots/guard-audio.js). Writes docs/evidence/guard-0.26-*: contact sheets and one mp4 per hero
#   (real time, 30 fps). Run from the repository root. Needs Pillow and ffmpeg.
set -e
SRC=${SRC:-/tmp/guard/final}; D=docs/evidence; S=tools/shots/rook-sheet.py; FONT=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf
sheet() { local out=$1 cols=$2 dir=$3; shift 3; local args=(); for a in "$@"; do f=${a%%=*}; c=${a#*=}; args+=("$SRC/$dir/f$(printf %03d $f).png=$c"); done; python3 $S "$D/guard-0.26-$out.jpg" $cols "${args[@]}" --crop 80,0,560,360 --scale 0.75; }
sheet anna-behind 4 anna "6=6 a shot lands, no guard yet" "22=22 second jump: shield up" "25=25 blocked (front)" "30=30 blocked" "34=34 a shot from behind lands" "40=40 blocked" "49=49 the guard ends (0.9 s)" "70=70 second guard" "75=75 a hollow slams: blocked" "79=79 the hollow shoved back" "112=112 running the thread: jump" "121=121 second jump: thread boost" "123=123 the pull of light" "127=127 higher, faster along it" "135=135" "150=150 landing"
sheet anna-side 4 anna-side "22=22 shield up (side camera)" "25=25 blocked" "30=30 blocked" "34=34 from behind: lands" "70=70 second guard" "75=75 hollow slam blocked" "78=78 shoved" "84=84"
sheet dora-bubble 4 dora "6=6 a hit lands, no guard yet" "22=22 second jump: the bubble" "25=25 soaks a shot" "30=30 soaks" "35=35 soaks" "40=40 soaks" "45=45 full: the 5th gets 20 through" "47=47 it pops" "112=112 along the thread: jump" "121=121 thread boost and bubble" "124=124" "130=130"
sheet dora-hat 4 dora-hat "13=13 thread boost 1 (pips)" "57=57 boost 2" "101=101 boost 3: the hat is charged" "130=130 charged, it glows" "152=152 G: the hat is thrown" "155=155 cuts the first" "160=160 the second" "166=166 the third" "172=172 turns at 15 m" "180=180 back through them" "186=186" "192=192 home on her head"
sheet myra 4 myra "16=16 along the thread: jump" "27=27 the hover starts: thread boost" "29=29 the pull of light" "40=40 held up by the thread" "60=60 let go on the thread: boon" "62=62 the boon's rings" "86=86 again, an ally beside her" "97=97 boosted hover" "120=120" "133=133 spent on the thread: boon" "135=135 +50 to both" "140=140"
sheet skye 4 skye "6=6 a shot lands, no guard yet" "22=22 second jump: she frays" "24=24 a shot passes through" "27=27 into the somersault" "30=30 through again" "35=35 and again" "40=40 whole again (0.6 s)" "45=45 shots land again" "112=112 along the thread: jump" "121=121 thread boost, fraying" "124=124" "128=128"
sheet rook 4 rook "8=8 Lantern Lift" "30=30 aloft, a shot lands (no roll)" "34=34 dash aloft: barrel roll" "36=36 a shot misses" "38=38" "40=40" "42=42 misses" "44=44" "46=46 misses" "50=50 out of the roll" "70=70 glide" "100=100 landed"
python3 $S "$D/guard-0.26-reduced.jpg" 4 "$SRC/skye-red/f022.png=Skye, reduced motion: still bands" "$SRC/skye-red/f030.png=no somersault, no strands motion" "$SRC/rook-red/f038.png=Rook, reduced: the roll is a lean" "$SRC/dora-paper/f030.png=painted paper: the bubble as a sphere" --crop 80,0,560,360 --scale 0.75
[ -f "$SRC/audio.log" ] && sed -n '/^{/,/^}/p' "$SRC/audio.log" > "$D/guard-0.26-audio.json"
mp4() { local out=$1 title=$2; shift 2; local ins=() fl="" n=0; for d in "$@"; do ins+=(-framerate 30 -i "$SRC/$d/f%03d.png"); fl="$fl[$n:v]drawtext=fontfile=$FONT:text='$title':x=12:y=12:fontsize=18:fontcolor=white:box=1:boxcolor=0x10101c@0.6[v$n];"; n=$((n+1)); done
  local cat=""; for i in $(seq 0 $((n-1))); do cat="$cat[v$i]"; done
  ffmpeg -y -loglevel error "${ins[@]}" -filter_complex "${fl}${cat}concat=n=$n:v=1[v]" -map "[v]" -c:v libx264 -preset veryfast -crf 27 -pix_fmt yuv420p "$D/guard-0.26-$out.mp4"; }
mp4 anna "Anna - the aegis, then a thread boost (play camera, then side)" anna anna-side
mp4 dora "Dora - the astral bubble, a thread boost, the hat thrown" dora dora-hat
mp4 myra "Myra Belle - thread-boosted hovers and the boon" myra
mp4 skye "Skye - the fray, then a thread boost" skye
mp4 rook "Rook Vale - the barrel roll aloft" rook
ls -la $D/guard-0.26-*
