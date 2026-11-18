const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs'), http = require('http'), path = require('path');
const root = process.env.LL_ROOT || '/home/claude/livelock';
const srv = http.createServer((q, r) => { let p = path.join(root, q.url.split('?')[0] === '/' ? 'index.html' : q.url.split('?')[0]); fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': p.endsWith('.js') ? 'text/javascript' : (p.endsWith('.jpg') ? 'image/jpeg' : 'text/html') }); r.end(d); } }); }).listen(8765);
(async () => {
  const mode = process.argv[2] || 'desk';
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext((mode === 'phone' || mode === 'titlephone') ? { viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 } : { viewport: { width: 1280, height: 720 } });
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
  pg.on('pageerror', e => errs.push('PAGEERROR: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
  await pg.route('**/*', rt => { const u = rt.request().url(); if (u.includes('three.min.js')) return rt.fulfill({ path: '/tmp/t/node_modules/three/build/three.min.js', contentType: 'text/javascript' }); if (u.startsWith('http://localhost')) return rt.continue(); return rt.abort(); });
  await pg.goto('http://localhost:8765/'); await pg.waitForTimeout(2500);
  await pg.screenshot({ path: `/tmp/t/${mode}-title.png` });
  if (mode === 'title' || mode === 'titlephone') { console.log(errs.filter(e => !e.includes('ERR_FAILED')).join('\n') || 'no script errors'); await b.close(); srv.close(); return; }
  if (mode === 'phone') { await pg.tap('#bPlay'); } else { await pg.click('#bPlay'); }
  await pg.waitForTimeout(1500);
  if (mode === 'views') {
    await pg.evaluate(() => { LL.input.lockFailed = true; const S = LL.sim, W = S.W; setInterval(() => { W.heroes.forEach(h => { h.hp = h.maxHp; }); W.patron.forEach(p => { p.hp = p.maxHp; }); W.thiefT = 1e9; }, 50);
      const f = W.fruit.find(q => q.k === 'biglemon'); f.ripe = true; const p = W.player; p.x = f.x + 1; p.z = f.z - 9; LL.dbg.view.yaw = 0; LL.dbg.view.pitch = 0.02; W.heroes.forEach(h => { if (!h.isPlayer) { h.useAI = false; h.x = 70; h.z = -120; } }); for (let i = 0; i < 269 * 30; i++) { p.x = f.x + 1; p.z = f.z - 9; S.step(1 / 30); W.fx.length = 0; } });
    await pg.waitForTimeout(2500); await pg.screenshot({ path: '/tmp/t/views-a.png' });
    const mood = await pg.evaluate(() => LL.sim.W.mood && LL.sim.W.mood.lens);
    await pg.keyboard.press('KeyV'); await pg.waitForTimeout(600);
    await pg.evaluate(k => { document.querySelector('#looks2 [data-look="' + k + '"]').click(); }, mood); await pg.waitForTimeout(900);
    await pg.evaluate(() => { document.querySelector('#looks2 [data-look="origami"]').click(); }); await pg.waitForTimeout(1200); await pg.screenshot({ path: '/tmp/t/views-b.png' });
    console.log('mood lens', mood, JSON.stringify(await pg.evaluate(() => ({ lens: LL.sim.W.lens, thin: LL.sim.W.thin, solved: LL.sim.W.mood.solved, guesses: LL.sim.W.mood.guesses }))));
  } else if (mode === 'fruit') {
    await pg.evaluate(() => { LL.input.lockFailed = true; const W = LL.sim.W; setInterval(() => { W.heroes.forEach(h => { h.hp = h.maxHp; }); W.thiefT = 1e9; }, 50); W.fruit.forEach(f => { f.ripe = true; }); const p = W.player; p.x = 14; p.z = 18; LL.dbg.view.yaw = 0.5; LL.dbg.view.pitch = -0.02; W.heroes.forEach(h => { if (!h.isPlayer) { h.useAI = false; h.x = 70; h.z = -120; } }); });
    await pg.waitForTimeout(1200); await pg.screenshot({ path: '/tmp/t/fruit-a.png' });
    await pg.evaluate(() => { const W = LL.sim.W, p = W.player; p.x = 12; p.z = 24; }); await pg.waitForTimeout(500);
    await pg.evaluate(() => { const W = LL.sim.W, p = W.player; p.x = 24; p.z = 28; }); await pg.waitForTimeout(700); await pg.screenshot({ path: '/tmp/t/fruit-b.png' });
  } else if (mode === 'fold') {
    await pg.evaluate(() => { LL.input.lockFailed = true; const W = LL.sim.W; for (let i = 0; i < 900; i++) LL.sim.step(1 / 30); W.fx.length = 0; document.querySelector('#looks2 [data-look="origami"]').click(); const p = W.player; p.x = 24; p.z = 0; p.yaw = -Math.PI / 2; });
    await pg.waitForTimeout(600);
    await pg.screenshot({ path: '/tmp/t/fold-before.png' });
    const ok = await pg.evaluate(() => { const W = LL.sim.W, p = W.player; const r = LL.sim.fold(p, 1); p.x = -6; p.z = -19; return r; });
    console.log('folded', ok);
    await pg.waitForTimeout(2200);
    await pg.screenshot({ path: '/tmp/t/fold-after.png' });
  } else if (mode === 'looks') {
    await pg.evaluate(() => { LL.input.lockFailed = true; const W = LL.sim.W; for (let i = 0; i < 3000; i++) LL.sim.step(1 / 30); W.fx.length = 0; W.ness.respT = 0; const p = W.player; p.x = 8; p.z = -44; p.hp = p.maxHp; p.alive = true; });
    await pg.waitForTimeout(2500);
    for (const k of ['snow', 'ink', 'origami', 'knight', 'glow', 'lantern', 'memory', 'rain']) {
      await pg.evaluate(k => { document.querySelector('#looks2 [data-look="' + k + '"]').click(); const p = LL.sim.W.player; p.hp = p.maxHp; }, k);
      await pg.waitForTimeout(1800);
      await pg.screenshot({ path: '/tmp/t/look-' + k + '.png' });
    }
    await pg.keyboard.press('KeyP'); await pg.waitForTimeout(300); await pg.click('#bQuit'); await pg.waitForTimeout(1500);
    await pg.evaluate(() => document.querySelector('#looks [data-look="origami"]').click()); await pg.waitForTimeout(1500);
    await pg.screenshot({ path: '/tmp/t/look-title-origami.png' });
  } else if (mode === 'desk') {
    await pg.evaluate(() => { LL.input.lockFailed = true; });
    await pg.keyboard.down('KeyW'); await pg.waitForTimeout(600); await pg.keyboard.press('KeyT'); await pg.waitForTimeout(3500);
    await pg.screenshot({ path: '/tmp/t/desk-zip.png' });
    await pg.waitForTimeout(3000);
    await pg.mouse.move(640, 360); await pg.mouse.down(); await pg.waitForTimeout(2500);
    await pg.keyboard.press('KeyQ'); await pg.keyboard.press('Space'); await pg.waitForTimeout(700);
    await pg.screenshot({ path: '/tmp/t/desk-play.png' });
    await pg.mouse.up(); await pg.keyboard.up('KeyW');
    // fast forward with auto to exercise everything
    const res = await pg.evaluate(() => { LL.sim.setAuto(true); const W = LL.sim.W; let n = 0; while (!W.over && n++ < 60000) { LL.sim.step(1 / 30); if (n % 3 === 0) { W.fx.forEach(e => { LL.gfx.fx(e); LL.ui.fx(e); LL.audio.fx(e, W, LL.gfx.cam()); }); W.fx.length = 0; } if (n === 9000) break; } return { t: W.t, over: W.over, souls: W.player.souls, lvl: W.player.level }; });
    console.log('ff', JSON.stringify(res));
    await pg.waitForTimeout(1200);
    await pg.screenshot({ path: '/tmp/t/desk-mid.png' });
    await pg.keyboard.press('KeyB'); await pg.waitForTimeout(400); await pg.screenshot({ path: '/tmp/t/desk-shop.png' });
    await pg.click('#item0'); await pg.keyboard.press('KeyB'); await pg.waitForTimeout(200);
    await pg.keyboard.press('KeyP'); await pg.waitForTimeout(300); await pg.screenshot({ path: '/tmp/t/desk-pause.png' });
    await pg.click('#bResume');
    const fin = await pg.evaluate(() => { const W = LL.sim.W; let n = 0; while (!W.over && n++ < 80000) LL.sim.step(1 / 30); return { t: W.t, over: W.over, w: W.winner }; });
    console.log('fin', JSON.stringify(fin));
    await pg.waitForTimeout(3600); await pg.screenshot({ path: '/tmp/t/desk-over.png' });
    const fps = await pg.evaluate(() => new Promise(r => { let n = 0, t0 = performance.now(); (function f() { n++; if (performance.now() - t0 > 1500) r(n / 1.5); else requestAnimationFrame(f); })(); }));
    console.log('fps(swiftshader, title)', fps.toFixed(1));
  } else {
    await pg.waitForTimeout(1000);
    await pg.evaluate(() => { const W = LL.sim.W; for (let i = 0; i < 9300; i++) LL.sim.step(1 / 30); W.fx.length = 0; const p = W.player; p.hp = p.maxHp; p.alive = true; p.x = 3; p.z = 6; });
    await pg.waitForTimeout(2500);
    await pg.screenshot({ path: '/tmp/t/phone-play.png' });
    await pg.tap('#bShop'); await pg.waitForTimeout(300); await pg.screenshot({ path: '/tmp/t/phone-shop.png' });
  }
  console.log(errs.length ? errs.slice(0, 12).join('\n') : 'no console errors');
  await b.close(); srv.close();
})().catch(e => { console.error('RUNFAIL', e); process.exit(1); });
