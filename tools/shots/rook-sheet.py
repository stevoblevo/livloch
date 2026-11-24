"""0.25 rook: contact sheets for the Rook Vale evidence. Frames from tools/shots/rook.js or heroes3d.js, laid out in a grid,
each with a caption; optionally cropped round the middle of the frame.
  python3 tools/shots/rook-sheet.py OUT.jpg COLS "frame.png=caption" ... [--crop x0,y0,x1,y1] [--scale s]
Needs Pillow."""
import sys
from PIL import Image, ImageDraw, ImageFont
args = sys.argv[1:]; crop = None; scale = 1.0
if '--crop' in args: i = args.index('--crop'); crop = tuple(int(v) for v in args[i + 1].split(',')); del args[i:i + 2]
if '--scale' in args: i = args.index('--scale'); scale = float(args[i + 1]); del args[i:i + 2]
out, cols, items = args[0], int(args[1]), [a.split('=', 1) for a in args[2:]]
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 15)
except Exception: font = ImageFont.load_default()
ims = []
for f, cap in items:
    im = Image.open(f).convert('RGB')
    if crop: im = im.crop(crop)
    if scale != 1.0: im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    d = ImageDraw.Draw(im); d.rectangle((0, im.height - 24, im.width, im.height), fill=(12, 10, 24)); d.text((6, im.height - 21), cap, fill=(240, 232, 214), font=font); ims.append(im)
w, h = ims[0].size; rows = (len(ims) + cols - 1) // cols
S = Image.new('RGB', (w * cols, h * rows), (12, 10, 24))
for i, im in enumerate(ims): S.paste(im, ((i % cols) * w, (i // cols) * h))
S.save(out, quality=88); print(out, S.size)
