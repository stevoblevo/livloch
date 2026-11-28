# 0.29 look: faces at play distance, before and after, per view. Each capture folder holds faces_000.png and faces.json
# (tools/shots/look29.js SCENE=faces). One row per view: every head, before then after, cropped and enlarged.
# Run: python3 tools/shots/look29-faces.py out.jpg scale crop label:BEFORE_DIR:AFTER_DIR [...]
import sys, json
from PIL import Image, ImageDraw, ImageFont
out, sc, cw = sys.argv[1], float(sys.argv[2]), int(sys.argv[3])
try: F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 13)
except Exception: F = ImageFont.load_default()
rows = []
for a in sys.argv[4:]:
    lab, b, c = a.split(':'); tiles = []
    for tag, d in (('before', b), ('after', c)):
        im = Image.open(d + '/faces_000.png').convert('RGB'); info = json.load(open(d + '/faces.json'))
        for h in info:
            x, y = h['head']; ch = int(cw * 1.5)
            t = im.crop((x - cw // 2, y - int(ch * 0.35), x + cw // 2, y + int(ch * 0.65))).resize((int(cw * sc), int(ch * sc)), Image.LANCZOS)
            g = ImageDraw.Draw(t); s = '%s %s %s' % (lab, tag, h['id']); g.rectangle((0, 0, 7 * len(s) + 6, 16), fill=(16, 16, 28)); g.text((3, 1), s, fill=(255, 230, 120), font=F)
            tiles.append(t)
    rows.append(tiles)
w, h = rows[0][0].size; n = max(len(r) for r in rows)
S = Image.new('RGB', (w * n, h * len(rows)), (16, 16, 28))
for j, r in enumerate(rows):
    for i, t in enumerate(r): S.paste(t, (i * w, j * h))
S.save(out, quality=88); print(out, S.size)
