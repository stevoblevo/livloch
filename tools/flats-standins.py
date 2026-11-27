#!/usr/bin/env python3
"""0.29 world: draws the stand-in paintings for the fruit, stray and crane slots (art/flats/fruit.png, stray.png, crane.png).
Flat fills, a dark ink line, a little paper grain; made from shapes so anyone can regenerate them. Replace with real paintings
(see art/flats/README.md) when they exist. Needs Pillow and numpy. Usage: python3 tools/flats-standins.py"""
import math, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
S = 3
INK = (42, 29, 42, 255)
def canvas(w, h): return Image.new('RGBA', (w * S, h * S), (0, 0, 0, 0))
def P(pts): return [(x * S, y * S) for x, y in pts]
def poly(d, pts, fill, w=3):
    d.polygon(P(pts), fill=fill); d.line(P(pts + [pts[0]]), fill=INK, width=w * S, joint='curve')
def leaf(d, cx, cy, ang, ln, wd, c0, c1):
    pts = []
    for i in range(0, 13):
        t = i / 12; x = ln * t; y = wd * math.sin(t * math.pi) * (1 - 0.25 * t) / 2
        pts.append((x, y))
    pts = pts + [(x, -y) for x, y in reversed(pts)]
    ca, sa = math.cos(ang), math.sin(ang)
    pts = [(cx + x * ca - y * sa, cy + x * sa + y * ca) for x, y in pts]
    poly(d, pts, c0, 3)
    mid = [(cx + (ln * .1) * ca, cy + (ln * .1) * sa), (cx + (ln * .85) * ca, cy + (ln * .85) * sa)]
    d.line(P(mid), fill=c1, width=2 * S)
def finish(im, name, out, grain=7):
    im = im.resize((im.width // S, im.height // S), Image.LANCZOS)
    a = np.asarray(im).astype(int); rng = np.random.default_rng(5)
    n = rng.integers(-grain, grain + 1, a.shape[:2])
    a[..., :3] = np.clip(a[..., :3] + n[..., None], 0, 255)
    Image.fromarray(a.astype('uint8'), 'RGBA').save(out); print(out, im.size)
def bush(d, ox, kind):
    rnd = random.Random(kind)
    pal = {'lemon': ((92, 140, 62), (156, 196, 84)), 'hips': ((70, 118, 80), (128, 170, 110)), 'lime': ((54, 116, 80), (110, 178, 102))}[kind]
    d.line(P([(ox + 128, 310), (ox + 130, 130)]), fill=INK, width=11 * S)
    d.line(P([(ox + 128, 310), (ox + 130, 130)]), fill=(118, 86, 56, 255), width=6 * S)
    for ring, (n, y, r, ln, wd, up) in enumerate([(9, 296, 60, 112, 40, -0.15), (8, 262, 44, 100, 38, -0.6), (7, 220, 30, 90, 36, -0.9), (7, 178, 20, 78, 34, -1.1)]):
        for i in range(n):
            side = -1 if i % 2 else 1; a = (i / n) * math.pi
            ang = (math.pi / 2 - (math.pi / 2 - 0.12 + up * 0.0) * 0) 
            dirx = math.cos(a) * (1 if i % 2 == 0 else -1)
            ang = math.atan2(up * 0.9 - 0.2 - rnd.random() * 0.2, dirx if abs(dirx) > .25 else .25 * side)
            c0 = tuple(int(pal[0][k] + (pal[1][k] - pal[0][k]) * (0.15 * ring + rnd.random() * .3)) for k in range(3)) + (255,)
            leaf(d, ox + 129 + side * 4, y, ang, ln * (.85 + rnd.random() * .3), wd, c0, pal[1] + (255,))
    leaf(d, ox + 130, 140, -math.pi / 2 - 0.5, 56, 28, pal[0] + (255,), pal[1] + (255,)); leaf(d, ox + 130, 140, -math.pi / 2 + 0.5, 56, 28, pal[0] + (255,), pal[1] + (255,))
def fruit():
    im = canvas(256 * 6, 320); d = ImageDraw.Draw(im)
    for i, k in enumerate(['lemon', 'hips', 'lime', 'lemon', 'hips', 'lime']): bush(d, i * 256, k)
    finish(im, 'fruit', 'art/flats/fruit.png')
def stray_cell(d, ox, front):
    body, belly, horn, shard = (92, 78, 128, 255), (140, 124, 176, 255), (244, 232, 214, 255), (182, 162, 228, 255)
    for x in (70, 130, 190, 250):
        if front and x in (130, 190): pass
    for x, y in ((92, 270), (228, 270)):
        poly(d, [(ox + x - 26, y), (ox + x - 22, y + 28), (ox + x + 22, y + 28), (ox + x + 26, y)], (52, 40, 78, 255))
    if not front: poly(d, [(ox + 160, 240), (ox + 200, 170), (ox + 214, 128), (ox + 238, 176), (ox + 210, 250)], body)
    pts = [(ox + 40, 230), (ox + 34, 170), (ox + 66, 112), (ox + 160, 92), (ox + 254, 112), (ox + 286, 170), (ox + 280, 230), (ox + 232, 276), (ox + 88, 276)]
    poly(d, pts, body)
    poly(d, [(ox + 80, 240), (ox + 70, 190), (ox + 160, 176), (ox + 250, 190), (ox + 240, 240), (ox + 160, 272)], belly, 2)
    for sg in (-1, 1):
        cx = ox + 160 + sg * 78
        poly(d, [(cx - sg * 10, 112), (cx + sg * 12, 52), (cx + sg * 4, 20), (cx + sg * 34, 60), (cx + sg * 30, 104)], horn)
    if front:
        for sg in (-1, 1):
            cx = ox + 160 + sg * 52
            d.ellipse(P([(cx - 26, 130), (cx + 26, 190)]), fill=(250, 240, 224, 255), outline=INK, width=3 * S)
            d.ellipse(P([(cx - 14 + sg * 2, 140), (cx + 14 + sg * 2, 184)]), fill=(201, 160, 255, 255), outline=INK, width=2 * S)
            d.ellipse(P([(cx - 4 + sg * 2, 146), (cx + 4 + sg * 2, 178)]), fill=(26, 16, 48, 255))
            d.line(P([(cx - sg * 30, 112), (cx + sg * 22, 126)]), fill=INK, width=7 * S)
        d.ellipse(P([(ox + 112, 190), (ox + 208, 250)]), fill=(222, 206, 226, 255), outline=INK, width=3 * S)
        d.ellipse(P([(ox + 136, 204), (ox + 146, 212)]), fill=INK); d.ellipse(P([(ox + 174, 204), (ox + 184, 212)]), fill=INK)
        d.line(P([(ox + 128, 230), (ox + 160, 240), (ox + 192, 230)]), fill=INK, width=4 * S)
        poly(d, [(ox + 140, 234), (ox + 146, 252), (ox + 152, 238)], horn, 2)
    else:
        for i in range(6):
            x = ox + 70 + i * 36
            poly(d, [(x - 12, 104 - i % 2 * 8), (x, 62 - i % 3 * 6), (x + 12, 104 - i % 2 * 8)], shard, 3)
def stray():
    im = canvas(320 * 2, 300); d = ImageDraw.Draw(im)
    stray_cell(d, 0, True); stray_cell(d, 320, False)
    finish(im, 'stray', 'art/flats/stray.png')
def crane_cell(d, ox, up):
    paper, shade, light, tip = (244, 232, 214, 255), (217, 200, 174, 255), (255, 250, 240, 255), (230, 184, 138, 255)
    wt = (30, 30) if up else (36, 170)
    poly(d, [(ox + 120, 150), (ox + wt[0] + 40, wt[1]), (ox + wt[0] + 100, wt[1] + (30 if up else -20)), (ox + 168, 146)], shade)
    poly(d, [(ox + 70, 150), (ox + 130, 190), (ox + 208, 168), (ox + 190, 134), (ox + 120, 128)], paper)
    poly(d, [(ox + 120, 128), (ox + 130, 190), (ox + 208, 168), (ox + 190, 134)], light, 2)
    poly(d, [(ox + 70, 150), (ox + 28, 112), (ox + 40, 150)], light, 3)
    poly(d, [(ox + 190, 140), (ox + 206, 90), (ox + 226, 62), (ox + 234, 90), (ox + 214, 144)], paper)
    poly(d, [(ox + 226, 62), (ox + 252, 74), (ox + 232, 88)], tip, 2)
    wb = (60, 24) if up else (70, 190)
    poly(d, [(ox + 140, 150), (ox + wb[0] + 90, wb[1]), (ox + wb[0] + 150, wb[1] + (36 if up else -30)), (ox + 196, 156)], light)
    d.line(P([(ox + 140, 150), (ox + wb[0] + 120, wb[1] + (14 if up else -6))]), fill=shade, width=2 * S)
def crane():
    im = canvas(256 * 2, 220); d = ImageDraw.Draw(im)
    crane_cell(d, 0, True); crane_cell(d, 256, False)
    finish(im, 'crane', 'art/flats/crane.png', 4)
fruit(); stray(); crane()
