# Contact sheet for the 0.23 wardrobe captures (tools/shots/wardrobe.js). Needs Pillow.
# Run: python3 tools/shots/wardrobe-sheet.py OUT docs/evidence/wardrobe-0.23.jpg
# Top: the wardrobe screen, a locked card, the end screen, the feed line, a phone in Origami.
# Below: the player's hero with four sets on (columns) in three looks (rows), mid-dash, cropped round the hero.
import sys, json, os
from PIL import Image, ImageDraw
d, out = sys.argv[1], sys.argv[2]
looks = ['snow', 'lantern', 'origami']; sets = ['a', 'b', 'c', 'd']
names = {'a': 'petals, snow powder, halo, paper lantern, ink double', 'b': 'motes, gold leaf, cranes, moth light, moonlight double',
         'c': 'fireflies, ink splats, compass rose, jade light, gilt double', 'd': 'confetti, snow powder, five moons, paper lantern, gilt double'}
W = 1920
def fit(im, w): return im.resize((w, int(im.height * w / im.width)), Image.LANCZOS)
top = [Image.open(os.path.join(d, f)).convert('RGB') for f in ['screen.png', 'screen-locked.png', 'over.png', 'feed.png']]
row1 = [fit(t, W // 4) for t in top]
phone = Image.open(os.path.join(d, 'phone.png')).convert('RGB')
cw, ch = W // 4, 340
cells = []
for l in looks:
    for s in sets:
        f = os.path.join(d, 'v-%s-%s-44.png' % (l, s)); pos = json.load(open(os.path.join(d, 'v-%s-%s-pos.json' % (l, s))))
        im = Image.open(f).convert('RGB'); x, y = pos[44]; x = min(max(x, 240), im.width - 240); y = min(max(y, 140), im.height - 160)
        c = im.crop((x - 240, y - 150, x + 240, y + 190)).resize((cw, ch), Image.LANCZOS)
        ImageDraw.Draw(c).text((6, 4), l + ' · ' + names[s], fill=(255, 240, 160)); cells.append(c)
h1 = max(r.height for r in row1)
ph = fit(phone, 300)
S = Image.new('RGB', (W + ph.width, max(h1 + ch * 3, ph.height)), (14, 9, 18))
for k, r in enumerate(row1): S.paste(r, (k * (W // 4), 0))
for k, c in enumerate(cells): S.paste(c, ((k % 4) * cw, h1 + (k // 4) * ch))
S.paste(ph, (W, 0))
S = S.resize((S.width * 3 // 4, S.height * 3 // 4), Image.LANCZOS)
S.save(out, quality=84); print(S.size)
