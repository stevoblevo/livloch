// 0.23 wardrobe, behaviour checks in headless Chrome with reduced motion on: an old save is credited at boot; the title badge;
// the screen opens from the keyboard, arrows move between cards, Enter wears one and it is saved; a locked card cannot be worn;
// Escape closes it; a Dreamwalk earns nothing and shows no end-screen box; frames run with things worn. Prints JSON.
// Run: LL_ROOT=$PWD node tools/shots/wardrobe-checks.js   (PORT default 8812)
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs'), http = require('http'), path = require('path'); const root = process.env.LL_ROOT || process.cwd(), port = +(process.env.PORT || 8812);
const types = { '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.css': 'text/css' };
const srv = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; fs.readFile(path.join(root, u), (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': types[path.extname(u)] || 'application/octet-stream' }); r.end(d); } }); }).listen(port);
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 1000, height: 700 }, reducedMotion: 'reduce' });
  await ctx.addInitScript(() => localStorage.setItem('livelock.v1', JSON.stringify({ v6: true, v17: true, bestStars: 2, unl: { snuff: 1 }, look: 'snow' })));
  const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.route('**/*', rt => { const u = rt.request().url(); if (u.includes('three.min.js')) return rt.fulfill({ path: '/tmp/t/node_modules/three/build/three.min.js', contentType: 'text/javascript' }); if (u.startsWith('http://localhost')) return rt.continue(); return rt.abort(); });
  await pg.goto('http://localhost:' + port + '/'); await pg.waitForTimeout(1500);
  const r = {};
  r.boot = await pg.evaluate(() => ({ reduced: LL.gfx.reduced, open: LL.wardrobe.open(LL.cfg), wear: LL.cfg.wear, badge: document.getElementById('bWard').textContent }));
  await pg.focus('#bWard'); await pg.keyboard.press('Enter'); await pg.waitForTimeout(600);
  r.opened = await pg.evaluate(() => ({ screen: LL.ui.screen, focus: document.activeElement.id || document.activeElement.className }));
  for (let i = 0; i < 4; i++) { await pg.keyboard.press('ArrowDown'); await pg.waitForTimeout(80); }
  r.nav = await pg.evaluate(() => ({ focus: document.activeElement.className + ' ' + document.activeElement.dataset.id, info: document.getElementById('wardInfo').innerText.slice(0, 80) }));
  // walk to the powder card and wear it with Enter
  for (let i = 0; i < 30; i++) { const id = await pg.evaluate(() => document.activeElement.dataset ? document.activeElement.dataset.id : ''); if (id === 'powder') break; await pg.keyboard.press('ArrowDown'); await pg.waitForTimeout(60); }
  await pg.keyboard.press('Enter'); await pg.waitForTimeout(200);
  r.worn = await pg.evaluate(() => ({ wear: LL.cfg.wear, saved: JSON.parse(localStorage.getItem('livelock.v1')).wear, focus: document.activeElement.dataset.id, pressed: document.activeElement.getAttribute('aria-pressed') }));
  await pg.click('.wcard[data-id="gilt"]'); r.locked = await pg.evaluate(() => ({ ghost: LL.cfg.wear.ghost || null, info: document.getElementById('wardInfo').innerText.replace(/\s+/g, ' ') }));
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(200); r.closed = await pg.evaluate(() => ({ screen: LL.ui.screen, ward: !document.getElementById('ward').hidden }));
  // a Dreamwalk earns nothing and shows no box
  await pg.evaluate(() => { LL.cfg.dream = true; LL.cfg.mode = 'short'; }); await pg.click('#bPlay'); await pg.waitForTimeout(1500);
  r.dream = await pg.evaluate(() => { const W = LL.sim.W, before = JSON.stringify([LL.cfg.rains, LL.cfg.starsTotal, LL.cfg.goalsEver]); LL.wardrobe.fx({ k: 'goal', id: 'echo' }, W); LL.wardrobe.fx({ k: 'over', short: true, n: 3, winner: 0 }, W); return { same: before === JSON.stringify([LL.cfg.rains, LL.cfg.starsTotal, LL.cfg.goalsEver]), box: !document.getElementById('wardOver').hidden, dream: W.dream }; });
  // reduced motion in the valley: frames run, the lamp does not bob
  r.valley = await pg.evaluate(() => { const W = LL.sim.W; LL.cfg.wear = { lamp: 'lantern', ring: 'halo', trail: 'motes' }; const ys = []; for (let i = 0; i < 40; i++) { W.t += 1 / 30; LL.gfx.frame(1 / 30, LL.dbg.view); } for (let i = 0; i < 20; i++) { W.t += 1 / 30; LL.gfx.frame(1 / 30, LL.dbg.view); ys.push(LL.wardrobe._dbg()); } return ys[19]; });
  console.log(JSON.stringify(r, null, 1)); console.log(errs.length ? errs.join('\n') : 'no page errors'); await b.close(); srv.close();
})();
