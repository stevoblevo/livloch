#!/usr/bin/env python3
"""Turn a four-view turnaround sheet into a paper-hero sprite sheet.

Usage: python3 tools/sheet.py SHEET.png art/heroes/NAME.png

Input: one image with four views left to right on a plain flat background
(front, left side, back, three-quarter), feet on one baseline.
Output: 1408 x 640 PNG, four 352 x 640 cells with transparent background,
feet at the bottom of each cell. gfx.js (PAPER) shows the cell that matches
where the camera stands. Needs Pillow and numpy.
"""
import sys
from collections import deque
import numpy as np
from PIL import Image, ImageFilter

def sheet(src, out, CW=352, CH=640):
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
    if len(runs) != 4: sys.exit('expected 4 figures, found %d' % len(runs))
    alpha = Image.fromarray(np.where(mask, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))
    rgba = np.dstack([a.astype(np.uint8), np.asarray(alpha)])
    ys = np.where(fg.sum(axis=1) > 2)[0]; y0, y1 = ys[0], ys[-1] + 1; sc = (CH - 6) / (y1 - y0)
    atlas = Image.new('RGBA', (CW * 4, CH), (0, 0, 0, 0))
    for i, (x0, x1) in enumerate(runs):
        w = int((x1 - x0) * sc)
        if w > CW: sys.exit('view %d is too wide for its cell (%d > %d)' % (i, w, CW))
        atlas.paste(Image.fromarray(rgba[y0:y1, x0:x1], 'RGBA').resize((w, CH - 6), Image.LANCZOS), (i * CW + (CW - w) // 2, 6))
    atlas.quantize(colors=255, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(out, optimize=True)
    print(out, atlas.size)

if __name__ == '__main__':
    if len(sys.argv) != 3: sys.exit(__doc__)
    sheet(sys.argv[1], sys.argv[2])
