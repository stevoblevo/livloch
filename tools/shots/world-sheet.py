# 0.25 world: before/after sheets from two runs of tools/shots/world.js (BEFORE and AFTER folders) into docs/evidence.
# python3 tools/shots/world-sheet.py BEFORE AFTER OUTDIR
# Close-ups are cropped round each shot's subject (the .json world.js writes beside each frame) and enlarged; every tile is
# labelled with the look, the shot and which run it is. Needs Pillow.
import sys, json, os
from PIL import Image, ImageDraw

B, A, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
NAMES = {'snow': 'Cobalt Snow', 'ink': 'Inkblot Noir', 'lantern': 'Lantern Night', 'origami': 'Origami', 'glow': 'Hypermetapunk',
         'knight': 'Knight Night', 'rain': 'Rainwake', 'memory': 'Memory'}

def tile(run, look, shot, crop=None, size=(640, 360)):
    d = B if run == 'before' else A
    p = os.path.join(d, look + '_' + shot)
    if not os.path.exists(p + '.png'):
        return None
    im = Image.open(p + '.png').convert('RGB')
    if crop:
        cw, ch = crop; j = json.load(open(p + '.json'))
        x0 = max(0, min(im.width - cw, j['x'] - cw // 2)); y0 = max(0, min(im.height - ch, j['y'] - ch // 2))
        im = im.crop((x0, y0, x0 + cw, y0 + ch))
    im = im.resize(size, Image.LANCZOS)
    dr = ImageDraw.Draw(im); label = NAMES.get(look, look) + ' . ' + shot + ' . ' + run
    dr.rectangle((0, 0, 8 + 6 * len(label), 16), fill=(0, 0, 0)); dr.text((4, 3), label, fill=(255, 255, 255))
    return im

def sheet(name, rows, crop=None, size=(640, 360)):
    tiles = [[tile(r, l, s, crop, size) for (r, l, s) in row] for row in rows]
    cols = max(len(r) for r in tiles)
    S = Image.new('RGB', (cols * size[0], len(tiles) * size[1]), (16, 16, 16))
    for y, row in enumerate(tiles):
        for x, t in enumerate(row):
            if t: S.paste(t, (x * size[0], y * size[1]))
    S.save(os.path.join(OUT, 'world-0.25-' + name + '.jpg'), quality=84)
    print('wrote', 'world-0.25-' + name + '.jpg', S.size)

ba = lambda look, shot: [('before', look, shot), ('after', look, shot)]
# 31: the Reign column from behind, 20 to 40 m, close up; and 8 to 20 m
sheet('reign-back', [ba(l, 'reign') for l in ['snow', 'lantern', 'ink', 'origami', 'glow']], crop=(360, 200), size=(720, 400))
sheet('reign-frames', [ba('snow', 'reign'), ba('snow', 'reignnear'), ba('lantern', 'reignnear')])
# 32: a hollow from behind, far, side on and in front
sheet('hollow-snow-ink', [ba('snow', s) for s in ['hollowback', 'hollowfar', 'hollowside', 'hollowfront']] + [ba('ink', s) for s in ['hollowback', 'hollowfar', 'hollowside', 'hollowfront']], crop=(300, 170), size=(600, 340))
sheet('hollow-looks', [ba(l, 'hollowback') for l in ['lantern', 'origami', 'glow']] + [ba(l, 'hollowside') for l in ['lantern', 'origami', 'glow']], crop=(300, 170), size=(600, 340))
sheet('hollow-frames', [ba('snow', 'hollowback'), ba('snow', 'hollowside')])
sheet('smalls-unchanged', [ba(l, 'smalls') for l in ['snow', 'ink']], crop=(420, 240), size=(630, 360))
# 29: the ground beside the threads, from the play camera
sheet('ground-snow', [ba('snow', s) for s in ['ground', 'groundside', 'groundwest']])
sheet('ground-looks', [ba(l, 'ground') for l in ['origami', 'lantern', 'ink', 'glow', 'knight', 'rain', 'memory']], size=(560, 315))
sheet('ground-close', [ba(l, 'ground') for l in ['snow', 'origami', 'lantern']], crop=(560, 300), size=(700, 375))
