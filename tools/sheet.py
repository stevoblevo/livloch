#!/usr/bin/env python3
"""Turn a painted sheet into a cutout sprite for the game.

Usage: python3 tools/sheet.py SHEET.png OUT.png [HEIGHT]

Input: one image with figures in a row, left to right, on a plain flat
background, feet on one baseline. Any number of figures.
Output: a PNG with one equal cell per figure, transparent background, feet at
the bottom of each cell, HEIGHT pixels tall (default 640).

Heroes (art/heroes/NAME.png, listed in PAPER in js/gfx.js) need four figures:
front, left side, back, three-quarter. Everything else (art/flats/NAME.png,
listed in FLATS) is described in art/flats/README.md. Needs Pillow and numpy.
"""
import sys
from collections import deque
import numpy as np
from PIL import Image, ImageFilter

def sheet(src, out, CH=640):
    a = np.asarray(Image.open(src).convert('RGB')).astype(int); H, W, _ = a.shape
    cand = np.abs(a - a[5, 5]).sum(axis=2) < 46          # close to the corner colour
    mask = np.zeros((H, W), bool); q = deque()           # flood from the border, so grey inside a figure survives
    for x in range(W):
        for y in (0, H - 1):
            if cand[y, x]: mask[y, x] = True; q.append((y, x))
    for y in range(H):
        for x in (0, W - 1):
            if cand[y, x] and not mask[y, x]: mask[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < H and 0 <= nx < W and cand[ny, nx] and not mask[ny, nx]: mask[ny, nx] = True; q.append((ny, nx))
    fg = ~mask; cols = fg.sum(axis=0) > 2; runs = []; s = None
    for x in range(W):
        if cols[x] and s is None: s = x
        if not cols[x] and s is not None:
            if x - s > 40: runs.append((s, x))
            s = None
    if s is not None: runs.append((s, W))
    if not runs: sys.exit('no figures found')
    alpha = Image.fromarray(np.where(mask, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))
    rgba = np.dstack([a.astype(np.uint8), np.asarray(alpha)])
    ys = np.where(fg.sum(axis=1) > 2)[0]; y0, y1 = ys[0], ys[-1] + 1; sc = (CH - 6) / (y1 - y0)
    CW = (int(max(x1 - x0 for x0, x1 in runs) * sc) + 9) // 8 * 8
    atlas = Image.new('RGBA', (CW * len(runs), CH), (0, 0, 0, 0))
    for i, (x0, x1) in enumerate(runs):
        w = int((x1 - x0) * sc)
        atlas.paste(Image.fromarray(rgba[y0:y1, x0:x1], 'RGBA').resize((w, CH - 6), Image.LANCZOS), (i * CW + (CW - w) // 2, 6))
    atlas.quantize(colors=255, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(out, optimize=True)
    print(out, atlas.size, '%d cells' % len(runs))

if __name__ == '__main__':
    if len(sys.argv) not in (3, 4): sys.exit(__doc__)
    sheet(sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) == 4 else 640)
