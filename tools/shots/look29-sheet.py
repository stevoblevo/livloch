# 0.29 look: a contact sheet from tools/shots/look29.js captures, cropped round the hero (OUT/<scene>.json), one row per
# capture folder (before, after, ...), each frame labelled with its number and beat.
# Run: python3 tools/shots/look29-sheet.py out.jpg "title" scene idx,idx,... cropW cropH scale label=DIR [label=DIR ...]
import sys, json
from PIL import Image, ImageDraw, ImageFont
out, title, scene, idx = sys.argv[1], sys.argv[2], sys.argv[3], [int(x) for x in sys.argv[4].split(',')]
cw, ch, sc = int(sys.argv[5]), int(sys.argv[6]), float(sys.argv[7])
rows = [a.split('=', 1) for a in sys.argv[8:]]
try: F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 13); FT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 16)
except Exception: F = FT = ImageFont.load_default()
tw, th = int(cw * sc), int(ch * sc)
S = Image.new('RGB', (tw * len(idx), th * len(rows) + 26), (16, 16, 28))
ImageDraw.Draw(S).text((8, 4), title, fill=(255, 255, 255), font=FT)
for r, (lab, d) in enumerate(rows):
    log = json.load(open('%s/%s.json' % (d, scene)))
    for c, i in enumerate(idx):
        im = Image.open('%s/%s_%03d.png' % (d, scene, i)).convert('RGB'); x, y = log[i]['head']
        x = max(cw // 2, min(im.width - cw // 2, x)); y0 = max(0, min(im.height - ch, y - int(ch * 0.45)))
        t = im.crop((x - cw // 2, y0, x + cw // 2, y0 + ch))
        if sc != 1: t = t.resize((tw, th), Image.LANCZOS)
        g = ImageDraw.Draw(t); s = '%s f%d %s' % (lab, i, log[i]['beat']); g.rectangle((0, 0, 8 + 7 * len(s), 17), fill=(16, 16, 28)); g.text((4, 1), s, fill=(255, 230, 120), font=F)
        S.paste(t, (c * tw, 26 + r * th))
S.save(out, quality=88); print(out, S.size)
