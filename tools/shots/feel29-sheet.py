"""0.29 feel: contact sheets from tools/shots/feel29.js stills, one per rule: a row per look, before (the checkout
without the 0.29 feel work) then after, each tile captioned.
python3 tools/shots/feel29-sheet.py BEFORE_DIR AFTER_DIR OUT_DIR [looks]   (looks default snow,ink,origami,glow)"""
import sys, os
from PIL import Image, ImageDraw, ImageFont
bd, ad, od = sys.argv[1:4]
looks = (sys.argv[4] if len(sys.argv) > 4 else 'snow,ink,origami,glow').split(',')
NAMES = {'snow': 'Cobalt Snow', 'ink': 'Inkblot Noir', 'origami': 'Origami', 'glow': 'Hypermetapunk'}
RULES = {
    'arrive': [('before', 'arrive', 'before: landing'), ('after', 'arrive', 'after: landing'), ('after', 'arrive-run', 'after: +0.3 s, the run along the thread')],
    'fold': [('before', 'fold', 'before: crease holds'), ('after', 'fold', 'after: caught small ones crumple, hollow bound')],
    'light': [('before', 'light-carry', 'before: carrying a light'), ('after', 'light-carry', 'after: the lantern on the hero'), ('after', 'light-mend', 'after: the house mended'), ('after', 'light-bright', 'after: burning bright')],
    'slack': [('before', 'slack', 'before: slack'), ('after', 'slack-warn', 'after: warning, 3 s to go'), ('after', 'slack', 'after: slack'), ('after', 'slack-end', 'after: pulled tight')],
}
TW, TH = 480, 270
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 17)
except Exception: font = ImageFont.load_default()
os.makedirs(od, exist_ok=True)
for rule, cols in RULES.items():
    sheet = Image.new('RGB', (TW * len(cols), TH * len(looks)), (16, 14, 24)); d = ImageDraw.Draw(sheet)
    for r, look in enumerate(looks):
        for c, (tag, still, cap) in enumerate(cols):
            f = os.path.join(bd if tag == 'before' else ad, 'feel-0.29-%s-%s-%s.jpg' % (still, look, tag))
            x, y = c * TW, r * TH
            if os.path.exists(f): sheet.paste(Image.open(f).convert('RGB').resize((TW, TH), Image.LANCZOS), (x, y))
            else: d.text((x + 20, y + 140), 'missing ' + os.path.basename(f), fill=(255, 120, 120), font=font)
            t = NAMES.get(look, look) + ' - ' + cap
            d.rectangle((x, y, x + d.textlength(t, font=font) + 14, y + 26), fill=(0, 0, 0))
            d.text((x + 7, y + 4), t, fill=(255, 236, 200) if tag == 'after' else (190, 190, 200), font=font)
    p = os.path.join(od, 'feel-0.29-%s.jpg' % rule); sheet.save(p, quality=82); print('wrote', p, sheet.size)
