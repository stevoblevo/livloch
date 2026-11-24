# Contact sheet of capture frames, cropped round the hero (pos.json from anna.js). Needs Pillow.
# Run: python3 tools/shots/crop.py OUT sheet.jpg 0,10,20 [columns] [width] [height] [scale]; "all" for every frame.
# crop frames around the hero: python3 crop.py DIR out.jpg idx,idx,... [cols] [w] [h] [scale]
import sys, json
from PIL import Image, ImageDraw
d, out = sys.argv[1], sys.argv[2]
idx = [int(x) for x in sys.argv[3].split(',')] if sys.argv[3] != 'all' else None
cols = int(sys.argv[4]) if len(sys.argv) > 4 else 8
cw = int(sys.argv[5]) if len(sys.argv) > 5 else 200; ch = int(sys.argv[6]) if len(sys.argv) > 6 else 280
sc = float(sys.argv[7]) if len(sys.argv) > 7 else 1.0
pos = json.load(open(d + '/pos.json'))
if idx is None: idx = list(range(len(pos)))
ims = []
for i in idx:
    im = Image.open('%s/f%03d.png' % (d, i)).convert('RGB'); x, y = pos[i]
    box = (x - cw // 2, y - int(ch * 0.42), x + cw // 2, y + int(ch * 0.58))
    c = im.crop(box)
    if sc != 1: c = c.resize((int(cw * sc), int(ch * sc)), Image.LANCZOS)
    ImageDraw.Draw(c).text((3, 2), str(i), fill=(255, 255, 0)); ims.append(c)
w, h = ims[0].size; rows = (len(ims) + cols - 1) // cols
S = Image.new('RGB', (w * cols, h * rows))
for k, im in enumerate(ims): S.paste(im, ((k % cols) * w, (k // cols) * h))
S.save(out, quality=90); print(S.size)
