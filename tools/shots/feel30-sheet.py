"""0.30 feel: contact sheets from tools/shots/feel30.js stills: a row per look, before then after.
usage: python3 feel30-sheet.py IN_DIR OUT_DIR   writes OUT_DIR/feel-0.30-{fold,foldfar,light}.jpg and feel-0.30-foldoff.jpg"""
import sys, os
from PIL import Image, ImageDraw

IN, OUT = sys.argv[1], sys.argv[2]
LOOKS = [('snow', 'Cobalt Snow'), ('ink', 'Inkblot Noir'), ('origami', 'Origami'), ('glow', 'Hypermetapunk')]
CAP = {'fold': 'beside the crease', 'foldfar': 'from behind, 25 m down the thread', 'light-bright': 'a house burning bright', 'foldoff': 'facing away: the pointer'}


def label(im, text):
    d = ImageDraw.Draw(im); d.rectangle((0, 0, 8 + 7 * len(text), 18), fill=(0, 0, 0)); d.text((5, 3), text, fill=(255, 255, 255))


def sheet(scene, name, tags=('before', 'after')):
    rows = []
    for k, nm in LOOKS:
        ims = []
        for t in tags:
            f = os.path.join(IN, 'feel-0.30-%s-%s-%s.jpg' % (scene, k, t))
            if os.path.exists(f):
                im = Image.open(f).convert('RGB'); label(im, '%s - %s: %s' % (nm, t, CAP.get(scene, scene))); ims.append(im)
        if ims:
            rows.append(ims)
    if not rows:
        return
    w, h = rows[0][0].size; n = max(len(r) for r in rows)
    o = Image.new('RGB', (w * n, h * len(rows)))
    for y, r in enumerate(rows):
        for x, im in enumerate(r):
            o.paste(im, (x * w, y * h))
    o.save(os.path.join(OUT, 'feel-0.30-%s.jpg' % name), quality=84)


sheet('fold', 'fold'); sheet('foldfar', 'foldfar'); sheet('light-bright', 'light'); sheet('foldoff', 'foldoff', ('after',))
