#!/usr/bin/env python3
"""Measure the braid's outline in each motion cell that shows it, for PAPER.anna.braid in js/gfx.js (0.21).

Usage: python3 tools/shots/braid-outline.py art/heroes/anna-motion.png [debug.png]

For each cell (1 side, 2 back, 5 aim back, 6 aim side) it walks down the rows, keeps the run of hair-coloured (or
turquoise-band) pixels nearest the braid's centre, takes the median edges over 11 rows, pads them by 3 px, samples every
16 px and closes the outline on a point at the tip. Prints the JS lines for PAPER (cell u, v; v up from the bottom).
The row limits and centre guesses in CELLS were set by looking at the sheet. Needs Pillow.
"""
import sys, json
from PIL import Image, ImageDraw
im = Image.open(sys.argv[1]).convert('RGBA'); px = im.load(); W, H = im.size; CW = W // 7
def hair(p):
    r, g, b, a = p
    if a < 128: return False
    return (r >= 95 and r > 1.95 * g and r > 2.2 * b) or (r >= 60 and r > 2.3 * g and g < 60)
def band(p):
    r, g, b, a = p
    return a >= 128 and g > 95 and b > 90 and r < 130 and g > r + 15
# cell: (first row, last row, centre x at the top, at the bottom, half-width searched), sheet px; LIM: rows kept in the outline
CELLS = {1: (150, 368, 432, 438, 26), 2: (150, 372, 640, 640, 34), 5: (140, 372, 1410, 1412, 34), 6: (128, 384, 1752, 1758, 26)}
LIM = {1: (158, 368), 2: (152, 370), 5: (148, 375), 6: (140, 362)}
dbg = im.copy(); d = ImageDraw.Draw(dbg)
for c, (y0, y1, xa, xb, hw) in CELLS.items():
    rows = []
    for y in range(y0, y1 + 1):
        xc = round(xa + (xb - xa) * (y - y0) / max(1, y1 - y0))
        if rows: xc = round(0.5 * xc + 0.5 * (rows[-1][1] + rows[-1][2]) / 2)
        ok = [x for x in range(xc - hw, xc + hw + 1) if 0 <= x < W and (hair(px[x, y]) or band(px[x, y]))]
        if not ok: rows.append((y, xc, xc)); continue
        runs, s = [], ok[0]
        for a, b in zip(ok, ok[1:] + [None]):
            if b is None or b > a + 3: runs.append((s, a)); s = b
        best = min(runs, key=lambda r: 0 if r[0] <= xc <= r[1] else min(abs(r[0] - xc), abs(r[1] - xc)))
        rows.append((y, best[0], best[1]))
    sm = []
    for i, (y, l, r) in enumerate(rows):
        win = rows[max(0, i - 5): i + 6]
        sm.append((y, sorted(w[1] for w in win)[len(win) // 2] - 3, sorted(w[2] for w in win)[len(win) // 2] + 3))
    a, b = LIM[c]
    keep = [r for r in sm[::8] if a <= r[0] <= b - 6]
    keep = keep[::2] + ([keep[-1]] if len(keep) % 2 == 0 else [])
    tip = ((keep[-1][1] + keep[-1][2]) / 2, b)
    poly = [(l, y) for (y, l, r) in keep] + [tip] + [(r, y) for (y, l, r) in reversed(keep)]
    d.polygon(poly, outline=(255, 255, 0, 255))
    q = lambda x, y: [round((x - c * CW) / CW, 3), round(1 - y / H, 3)]
    p = q((keep[0][1] + keep[0][2]) / 2, keep[0][0])
    print("      %d: { p: %s, poly: %s }," % (c, json.dumps(p), json.dumps([v for (x, y) in poly for v in q(x, y)]).replace(' ', '')))
if len(sys.argv) > 2:
    bg = Image.new('RGBA', dbg.size, (120, 140, 120, 255)); bg.alpha_composite(dbg); bg.convert('RGB').save(sys.argv[2])
