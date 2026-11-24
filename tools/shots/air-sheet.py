#!/usr/bin/env python3
"""0.25 air: a contact sheet of AIR=1 frames from tools/shots/heroes3d.js, each cropped round the hero (air.json gives
where the hero's middle was on screen), labelled with the frame, height, vertical speed, hover left and events.

  python3 tools/shots/air-sheet.py OUT sheet.jpg 8,10,14,19,30,55 [cols] [cw] [ch] [title]

Frames may be 'auto' for a pick of take-off, rise, top, second jump or hover, fall and landing. Needs Pillow."""
import json, sys, os
from PIL import Image, ImageDraw, ImageFont

out, dst = sys.argv[1], sys.argv[2]
log = json.load(open(os.path.join(out, 'air.json')))
pick = sys.argv[3] if len(sys.argv) > 3 else 'auto'
cols = int(sys.argv[4]) if len(sys.argv) > 4 else 6
cw = int(sys.argv[5]) if len(sys.argv) > 5 else 260
ch = int(sys.argv[6]) if len(sys.argv) > 6 else 300
title = sys.argv[7] if len(sys.argv) > 7 else ''

def auto():
    fs, n = [], len(log)
    first = next((i for i, r in enumerate(log) if any(e.startswith('jump') for e in r['ev'])), 0)
    fs += [first + 1, first + 3]  # take-off
    top = next((i for i in range(first + 1, n) if log[i]['vy'] <= 0.5), first + 8)
    fs.append(top)
    second = next((i for i in range(first + 1, n) if any(e in ('jump:dbl', 'hover') for e in log[i]['ev'])), None)
    if second is not None: fs += [second + 1, second + 4, second + 8, second + 12]
    land = next((i for i in range(max(fs) + 1, n) if log[i]['g']), n - 1)
    fs += [land - 3, land, land + 2, land + 5]
    return [f for f in fs if 0 <= f < n]

frames = auto() if pick == 'auto' else [int(x) for x in pick.split(',')]
rows = (len(frames) + cols - 1) // cols
top = 30 if title else 0
sheet = Image.new('RGB', (cw * cols, ch * rows + top), (16, 14, 30))
d = ImageDraw.Draw(sheet)
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 13); tfont = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 17)
except Exception: font = tfont = ImageFont.load_default()
if title: d.text((8, 5), title, fill=(240, 230, 255), font=tfont)
for k, f in enumerate(frames):
    im = Image.open(os.path.join(out, 'a%03d.png' % f)).convert('RGB'); r = log[f]
    x0 = max(0, min(im.width - cw, r['sx'] - cw // 2)); y0 = max(0, min(im.height - ch, r['sy'] - int(ch * 0.55)))
    cx, cy = (k % cols) * cw, (k // cols) * ch + top
    sheet.paste(im.crop((x0, y0, x0 + cw, y0 + ch)), (cx, cy))
    lab = '%d  y %.2f  vy %.1f%s' % (f, r['y'], r['vy'], ('  hover %.2f' % r['hov']) if r['hov'] > 0 else '')
    d.rectangle((cx, cy + ch - 34, cx + cw, cy + ch), fill=(16, 14, 30))
    d.text((cx + 5, cy + ch - 33), lab, fill=(240, 230, 255), font=font)
    if r['ev']: d.text((cx + 5, cy + ch - 17), ' '.join(r['ev']), fill=(255, 210, 120), font=font)
sheet.save(dst, quality=86)
print(dst, frames)
