#!/usr/bin/env python3
"""Turn a seven-figure motion-parts sheet into a sprite for a painted hero.

Usage: python3 tools/motion.py SHEET.png art/heroes/NAME-motion.png

Input, left to right on a flat background, feet on one baseline:
  1 front, arms removed   2 left side, arms removed   3 back, arms removed
  4 one arm from the side  5 one arm from the front
  6 shooting pose from behind   7 shooting pose from the left side
Output: seven equal cells, 640 px tall. Bodies stand on the bottom edge. The two
arm cells are moved so the shoulder end sits at the top centre of the cell; the
script prints how long the arm is as a fraction of the figure, which goes in
PAPER as arms.len. Needs Pillow and numpy.
"""
import sys
from collections import deque
import numpy as np
from PIL import Image, ImageFilter

def cut(src):
    a = np.asarray(Image.open(src).convert('RGB')).astype(int); H, W, _ = a.shape
    cand = np.abs(a - a[5, 5]).sum(axis=2) < 46
    mask = np.zeros((H, W), bool); q = deque()
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
            if x - s > 24: runs.append((s, x))
            s = None
    if s is not None: runs.append((s, W))
    alpha = Image.fromarray(np.where(mask, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))
    return np.dstack([a.astype(np.uint8), np.asarray(alpha)]), fg, runs

def motion(src, out, CH=640):
    rgba, fg, runs = cut(src)
    if len(runs) != 7: sys.exit('expected 7 figures, found %d' % len(runs))
    ys = np.where(fg.sum(axis=1) > 2)[0]; y0, y1 = ys[0], ys[-1] + 1; sc = (CH - 6) / (y1 - y0)
    CW = (int(max(x1 - x0 for x0, x1 in runs) * sc) + 9) // 8 * 8
    atlas = Image.new('RGBA', (CW * 7, CH), (0, 0, 0, 0)); arm = []
    for i, (x0, x1) in enumerate(runs):
        if i in (3, 4):
            rows = np.where(fg[:, x0:x1].sum(axis=1) > 0)[0]; a0, a1 = rows[0], rows[-1] + 1
            w, h = int((x1 - x0) * sc), int((a1 - a0) * sc)
            atlas.paste(Image.fromarray(rgba[a0:a1, x0:x1], 'RGBA').resize((w, h), Image.LANCZOS), (i * CW + (CW - w) // 2, 0)); arm.append(h / CH)
        else:
            w = int((x1 - x0) * sc)
            atlas.paste(Image.fromarray(rgba[y0:y1, x0:x1], 'RGBA').resize((w, CH - 6), Image.LANCZOS), (i * CW + (CW - w) // 2, 6))
    atlas.quantize(colors=255, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(out, optimize=True)
    print(out, atlas.size, 'arms.len %.3f' % max(arm))

if __name__ == '__main__':
    if len(sys.argv) != 3: sys.exit(__doc__)
    motion(sys.argv[1], sys.argv[2])
