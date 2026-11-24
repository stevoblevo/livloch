// 0.23 wardrobe: the title button, the wardrobe screen (full, a locked card, a phone), the mid-match feed line, the end
// screen with something new and what is next, then the player's hero running with things on, in several looks.
// In-valley frames are driven one at a time (the game loop is stopped), as in motion.js. Contact sheet and clip:
//   LL_ROOT=$PWD OUT=/tmp/t/wd node tools/shots/wardrobe.js
//   python3 tools/shots/wardrobe-sheet.py /tmp/t/wd docs/evidence/wardrobe-0.23.jpg
//   ffmpeg -y -framerate 30 -i /tmp/t/wd/clip/f%03d.png -c:v libx264 -preset veryfast -crf 26 -pix_fmt yuv420p docs/evidence/wardrobe-0.23.mp4
// Env: LL_ROOT, OUT (default /tmp/t/wd), PORT (default 8810; 8810 to 8814 are this script's), LOOKS (default snow,lantern,origami),
//      SETS (default all four below), HERO (0 Dora, 1 Anna, 2 Myra, 3 Skein, 4 Rook), CLIP=0 to skip the clip.
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs'), http = require('http'), path = require('path');
const root = process.env.LL_ROOT || process.cwd(), out = process.env.OUT || '/tmp/t/wd', port = +(process.env.PORT || 8810), hero = +(process.env.HERO || 0);
const looks = (process.env.LOOKS || 'snow,lantern,origami').split(',');
const SETS = {
  a: { trail: 'petals', step: 'powder', ring: 'halo', lamp: 'lantern', ghost: 'ink' },
  b: { trail: 'motes', step: 'leaf', ring: 'crane', lamp: 'moth', ghost: 'moon' },
  c: { trail: 'fireflies', step: 'splat', ring: 'compass', lamp: 'jade', ghost: 'gilt' },
  d: { trail: 'confetti', step: 'powder', ring: 'moons', lamp: 'lantern', ghost: 'gilt' }
};
const sets = (process.env.SETS || 'a,b,c,d').split(',');
fs.mkdirSync(out + '/clip', { recursive: true });
const types = { '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.mp4': 'video/mp4', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; fs.readFile(path.join(root, u), (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': types[path.extname(u)] || 'application/octet-stream' }); r.end(d); } }); }).listen(port);
// a player six matches in: some things open, some not
const PROFILE = { v6: true, v17: true, mode: 'short', look: 'snow', hero: hero, bestStars: 3, starsTotal: 7, rains: 6, goalsEver: { orbs: 1, thread: 1, view: 1, thief: 1, guard: 1, echo: 1 }, unl: { snuff: 1, plates: 1 },
  wear: { trail: 'petals', ring: 'halo', lamp: 'lantern', step: 'powder', ghost: 'ink' }, wardSeen: { motes: 1, halo: 1, powder: 1, lantern: 1, ink: 1, petals: 1, moon: 1 } };
const errs = [];
async function page(b, vw, vh, profile) {
  const ctx = await b.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: 1 });
  await ctx.addInitScript((p) => { try { if (p) localStorage.setItem('livelock.v1', JSON.stringify(p)); } catch (e) {} }, profile);
  const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push('PAGEERROR: ' + e.message)); pg.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await pg.route('**/*', rt => { const u = rt.request().url(); if (u.includes('three.min.js')) return rt.fulfill({ path: '/tmp/t/node_modules/three/build/three.min.js', contentType: 'text/javascript' }); if (u.startsWith('http://localhost')) return rt.continue(); return rt.abort(); });
  await pg.goto('http://localhost:' + port + '/'); await pg.waitForTimeout(1800); return { ctx, pg };
}
/* the hero runs across the camera's view, dashes, jumps and lands; returns the hero's place on screen per frame */
async function drive(pg, n, keep, dir, o) {
  const pos = [];
  for (let f = 0; f < n; f++) {
    const p = await pg.evaluate((a) => {
      const f = a.f, W = LL.sim.W, p = W.player, v = LL.dbg.view, dt = 1 / 30; W.t += dt;
      const yaw = v.yaw + (a.o.cross == null ? 1.05 : a.o.cross); p.yaw = yaw; const dash = f % 90 >= 40 && f % 90 < 48; p.dashT = dash ? 0.2 : 0; const S = 6.2 * (dash ? 2.6 : 1);
      if (f % 90 >= 56 && f % 90 < 72) { const k = (f % 90 - 56) / 16; p.y = Math.sin(k * Math.PI) * 1.3; p.vy = Math.cos(k * Math.PI) * 7; p.onGround = false; } else { p.y = 0; p.vy = 0; p.onGround = true; }
      const stop = a.o.stopAt != null && f >= a.o.stopAt; p.vx = stop ? 0 : Math.sin(yaw) * S; p.vz = stop ? 0 : Math.cos(yaw) * S; p.x += p.vx * dt; p.z += p.vz * dt;
      if (a.o.orbit && f >= a.o.orbit) v.yaw += 0.03;
      LL.gfx.frame(dt, v); const q = { x: 0, y: 0, vis: false }; LL.gfx.project(p.x, p.y + 1.1, p.z, q); return [Math.round(q.x), Math.round(q.y)];
    }, { f: f + ((o && o.f0) || 0), o: o || {} });
    pos.push(p);
    if (keep.indexOf(f) >= 0) await pg.screenshot({ path: dir(f) });
  }
  return pos;
}
async function valley(pg, look) {
  await pg.evaluate((look) => { LL.cfg.mode = 'match'; LL.cfg.all = true; document.querySelectorAll('#looks [data-look="' + look + '"]')[0].click(); }, look);
  await pg.click('#bPlay'); await pg.waitForTimeout(2500);
  await pg.evaluate(() => { window.requestAnimationFrame = () => 0; document.getElementById('hud').hidden = true; const W = LL.sim.W; W.troopers.length = 0; W.thieves.length = 0; W.projs.length = 0;
    const p = W.player, g = W.structs.find(s => s.team === 0 && s.kind === 'guardian' && s.lane === 1); p.useAI = false; p.x = g.x - 10; p.z = g.z + 26; p.alive = true; p.hp = p.maxHp;
    LL.dbg.view.yaw = 0.35; LL.dbg.view.pitch = -0.2; LL.dbg.view.zoom = 0; for (let k = 0; k < 4; k++) LL.gfx.frame(0.033, LL.dbg.view); });
}
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  // 1. the title and the wardrobe screen (desktop)
  { const { ctx, pg } = await page(b, 1280, 800, PROFILE);
    await pg.screenshot({ path: out + '/title.png' });
    await pg.click('#bWard'); await pg.mouse.move(1270, 790); await pg.waitForTimeout(1600); await pg.screenshot({ path: out + '/screen.png' });
    await pg.hover('.wcard[data-id="crane"]'); await pg.waitForTimeout(900); await pg.screenshot({ path: out + '/screen-locked.png' });
    await pg.click('.wcard[data-id="motes"]'); await pg.waitForTimeout(900); await pg.screenshot({ path: out + '/screen-motes.png' });
    await pg.evaluate(() => { document.getElementById('ward').scrollTop = 9999; }); await pg.waitForTimeout(700); await pg.screenshot({ path: out + '/screen-bottom.png' });
    const st = await pg.evaluate(() => ({ worn: LL.cfg.wear, seen: Object.keys(LL.cfg.wardSeen).length, badge: document.getElementById('bWard').textContent, nav: document.activeElement && document.activeElement.className }));
    await pg.keyboard.press('Escape'); await pg.waitForTimeout(300);
    st.after = await pg.evaluate(() => ({ title: !document.getElementById('title').hidden, ward: !document.getElementById('ward').hidden, badge: document.getElementById('bWard').textContent }));
    console.log('screen', JSON.stringify(st)); await ctx.close(); }
  // 2. the same on a phone, in Origami
  { const { ctx, pg } = await page(b, 390, 844, Object.assign({}, PROFILE, { look: 'origami' }));
    await pg.click('#bWard'); await pg.waitForTimeout(1600); await pg.screenshot({ path: out + '/phone.png' }); await ctx.close(); }
  // 3. a first match: the feed line mid-match, then the end screen (a new player; events are given by hand)
  { const { ctx, pg } = await page(b, 1280, 800, { v6: true, v17: true, mode: 'short', look: 'lantern', hero: hero });
    await pg.click('#bPlay'); await pg.waitForTimeout(2500);
    await pg.evaluate(() => { const W = LL.sim.W; LL.ui.fx({ k: 'goal', id: 'orbs', pay: 60, line: 'Shoot five of your own orbs' }); LL.wardrobe.fx({ k: 'goal', id: 'orbs', pay: 60, line: 'Shoot five of your own orbs' }, W); });
    await pg.waitForTimeout(1200); await pg.screenshot({ path: out + '/feed.png' });
    const mid = await pg.evaluate(() => ({ wear: LL.cfg.wear, goals: LL.cfg.goalsEver }));
    await pg.evaluate(() => { const W = LL.sim.W; W.over = true; W.stars = { houses: true, mood: false, guard: true, ness: false, goals: false }; LL.cfg.bestStars = 2;
      LL.wardrobe.fx({ k: 'over', short: true, n: 2, winner: 0, t: W.t }, W); LL.ui.showOver(); });
    await pg.waitForTimeout(1800); await pg.screenshot({ path: out + '/over.png' });
    const end = await pg.evaluate(() => ({ rains: LL.cfg.rains, stars: LL.cfg.starsTotal, wear: LL.cfg.wear, box: document.getElementById('wardOver').innerText.replace(/\s+/g, ' ').slice(0, 300) }));
    console.log('match', JSON.stringify({ mid, end })); await ctx.close(); }
  // 4. in the valley: each look, each set, a few frames
  for (const look of looks) {
    const { ctx, pg } = await page(b, 960, 600, Object.assign({}, PROFILE, { look: 'snow' }));
    await valley(pg, look);
    for (const s of sets) {
      await pg.evaluate((w) => { LL.cfg.wear = w; const W = LL.sim.W, p = W.player, g = W.structs.find(s => s.team === 0 && s.kind === 'guardian' && s.lane === 1); p.x = g.x - 10; p.z = g.z + 26; LL.dbg.view.yaw = 0.35; for (let k = 0; k < 3; k++) LL.gfx.frame(0.033, LL.dbg.view); }, SETS[s]);
      const pos = await drive(pg, 80, [34, 44, 70, 79], f => out + '/v-' + look + '-' + s + '-' + f + '.png', { stopAt: 74 });
      fs.writeFileSync(out + '/v-' + look + '-' + s + '-pos.json', JSON.stringify(pos));
      console.log(look, s, JSON.stringify(await pg.evaluate(() => LL.wardrobe._dbg())));
    }
    await ctx.close();
  }
  // 5. a clip: Cobalt Snow with one set, then Lantern Night with another, the camera coming round at the end
  if (process.env.CLIP !== '0') {
    const { ctx, pg } = await page(b, 960, 540, Object.assign({}, PROFILE, { look: 'snow' }));
    await valley(pg, 'snow'); await pg.evaluate((w) => { LL.cfg.wear = w; }, SETS.a);
    let k = 0; const dir = () => out + '/clip/f' + String(k++).padStart(3, '0') + '.png';
    for (let f = 0; f < 120; f++) await drive(pg, 1, [0], dir, { f0: f });
    await pg.evaluate((w) => { LL.cfg.wear = w; document.querySelector('#looks [data-look="lantern"]').click(); const W = LL.sim.W, p = W.player, g = W.structs.find(s => s.team === 0 && s.kind === 'guardian' && s.lane === 1); p.x = g.x - 10; p.z = g.z + 26; LL.dbg.view.yaw = 0.35; for (let i = 0; i < 3; i++) LL.gfx.frame(0.033, LL.dbg.view); }, SETS.b);
    for (let f = 0; f < 120; f++) await drive(pg, 1, [0], dir, { f0: f, stopAt: f >= 80 ? 0 : null, orbit: f >= 80 ? 0 : null });
    await ctx.close();
  }
  console.log(errs.length ? errs.join('\n') : 'no page errors'); await b.close(); srv.close();
})().catch(e => { console.error('RUNFAIL', e); process.exit(1); });
