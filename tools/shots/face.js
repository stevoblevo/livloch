/* 0.28 face: captures for the first minute and the HUD.
   MODE=title   the title for TITLE_S seconds (frames every STEP s), then Walk in and the settle behind the hero.
                Writes OUT/<size>-t##.png and OUT/<size>-p##.png, and with VIDEO=1 a webm of the whole run.
   MODE=hud     a match about a minute in, the HUD with a cooldown running, in each view in LOOKS. OUT/<size>-hud-<look>.png
   MODE=picker  the title's hero picker with the mute button, OUT/<size>-picker.png
   SIZE desk (1280x720), phone (390x780, touch), land (844x390, touch). REDUCED=1 for reduced motion. FORCE=1 tells the
   title to show the live valley even though SwiftShader is slower than the fallback threshold (LL.faceForce).
   ROOT (default: this checkout), PORT (8870), OUT (/tmp/face). */
'use strict';
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/npm-tools/node_modules/playwright');
const fs = require('fs'), http = require('http'), path = require('path');
const root = process.env.ROOT || path.join(__dirname, '..', '..'), port = +(process.env.PORT || 8870), out = process.env.OUT || '/tmp/face';
const mode = process.env.MODE || 'title', size = process.env.SIZE || 'desk';
fs.mkdirSync(out, { recursive: true });
const types = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4' };
const srv = http.createServer(function (q, r) { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; const f = path.join(root, path.normalize(u)); fs.readFile(f, function (e, d) { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); r.end(d); } }); }).listen(port);
const VP = { desk: { viewport: { width: 1280, height: 720 } }, desk960: { viewport: { width: 960, height: 540 } }, phone: { viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }, land: { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 } }[size];
(async function () {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const opt = Object.assign({ reducedMotion: process.env.REDUCED ? 'reduce' : 'no-preference' }, VP);
  if (process.env.VIDEO) opt.recordVideo = { dir: out, size: VP.viewport };
  const ctx = await b.newContext(opt), pg = await ctx.newPage(), errs = [];
  pg.on('console', function (m) { if (m.type() === 'error') errs.push(m.text()); });
  pg.on('pageerror', function (e) { errs.push('PAGEERROR ' + e.message); }); pg.on('response', function (r) { if (r.status() >= 400) errs.push('HTTP ' + r.status() + ' ' + r.url()); });
  await pg.route('**/*', function (rt) { const u = rt.request().url(); if (u.includes('three.min.js')) return rt.fulfill({ path: '/tmp/t/node_modules/three/build/three.min.js', contentType: 'text/javascript' }); if (u.startsWith('http://localhost')) return rt.continue(); return rt.abort(); });
  await pg.addInitScript(function (o) { try { localStorage.setItem('livelock.v1', JSON.stringify(o)); } catch (e) {} window.LL = window.LL || {}; if (o.force) window.LL.faceForce = true; }, { look: process.env.LOOK || 'snow', v6: true, v17: true, coached: true, hero: +(process.env.HERO || 0), force: !!process.env.FORCE });
  if (mode === 'title') { await pg.clock.install({ time: 0 }); await pg.clock.pauseAt(1000); }
  await pg.goto('http://localhost:' + port + '/');
  const tap = function (sel) { return VP.hasTouch ? pg.tap(sel) : pg.click(sel); };
  if (mode === 'title') {
    /* The page's clock is Playwright's fake one, stepped 1/FPS s per captured frame, so the frames are evenly spaced in
       the game's time however slow SwiftShader is. The menu's 0.38 s CSS fade and the HUD's fade-in run on real time. */
    const FPS = +(process.env.FPS || 12), T = +(process.env.TITLE_S || 9), P = +(process.env.PLAY_S || 4); let i = 0;
    for (let k = 0; k < T * FPS; k++) { await pg.clock.runFor(1000 / FPS); await pg.screenshot({ path: out + '/' + size + '-t' + String(i++).padStart(3, '0') + '.png' }); }
    console.log('title state', JSON.stringify(await pg.evaluate(function () { return LL.face ? LL.face.state() : null; })));
    await pg.evaluate(function () { LL.input.lockFailed = true; });
    await tap('#bPlay'); i = 0;
    for (let k = 0; k < P * FPS; k++) { await pg.clock.runFor(1000 / FPS); await pg.screenshot({ path: out + '/' + size + '-p' + String(i++).padStart(3, '0') + '.png' }); }
    console.log('play state', JSON.stringify(await pg.evaluate(function () { return LL.face.state(); })));
  } else if (mode === 'hud') {
    await pg.waitForTimeout(1200); await pg.evaluate(function () { LL.input.lockFailed = true; }); await tap('#bPlay'); await pg.waitForTimeout(2500);
    await pg.evaluate(function () { const S = LL.sim, W = S.W; for (let i = 0; i < 60 * 30; i++) S.step(1 / 30); W.fx.forEach(function (e) { LL.ui.fx(e); }); W.fx.length = 0;
      const p = W.player; p.alive = true; p.hp = p.maxHp * 0.72; p.souls = Math.max(p.souls, 640); p.level = Math.max(p.level, 6); p.cds[0] = p.cdMax[0] * 0.55; p.ammo = Math.max(1, Math.floor(p.magSize * 0.6)); p.stamina = Math.max(1, p.st.stam - 1);
      LL.dbg.hold = setInterval(function () { p.hp = Math.min(p.hp, p.maxHp * 0.72); }, 100); LL.dbg.view.pitch = -0.05; });
    const looks = (process.env.LOOKS || 'snow,ink,origami,glow').split(',');
    for (const k of looks) {
      await pg.evaluate(function (k) { LL.gfx.setLook(k); document.body.setAttribute('data-look', k); LL.cfg.look = k; LL.sim.setLens(k); LL.ui.lookChips(); const p = LL.sim.W.player; p.cds[0] = p.cdMax[0] * 0.95 + 1.2; }, k);
      await pg.waitForTimeout(1300); await pg.screenshot({ path: out + '/' + size + '-hud-' + k + '.png' });
    }
  } else if (mode === 'picker') {
    await pg.waitForTimeout(1500); await pg.screenshot({ path: out + '/' + size + '-picker.png' });
    const hit = await pg.evaluate(function () { const m = document.getElementById('bMute').getBoundingClientRect(); const over = []; document.querySelectorAll('#title button, #title .hero').forEach(function (el) { if (el.id === 'bMute') return; const r = el.getBoundingClientRect(); if (r.width && r.left < m.right && r.right > m.left && r.top < m.bottom && r.bottom > m.top) over.push(el.id || el.className + ':' + el.textContent.slice(0, 12)); }); return { mute: [m.left, m.top, m.width], overlaps: over }; });
    console.log('mute overlaps', JSON.stringify(hit));
    for (const y of [120, 260, 420]) {
      await pg.evaluate(function (y) { document.getElementById('title').scrollTop = y; }, y); await pg.waitForTimeout(300);
      const h2 = await pg.evaluate(function () { const m = document.getElementById('bMute').getBoundingClientRect(); const over = []; document.querySelectorAll('#title .hero, #title .chip, #title .btn').forEach(function (el) { const r = el.getBoundingClientRect(); if (r.width && r.left < m.right && r.right > m.left && r.top < m.bottom && r.bottom > m.top) over.push(el.textContent.trim().slice(0, 14)); }); return { muteTop: Math.round(m.top), overlaps: over }; });
      console.log('scrolled', y, JSON.stringify(h2)); if (y === 260) await pg.screenshot({ path: out + '/' + size + '-picker-scrolled.png' });
    }
  }
  console.log(errs.length ? errs.join('\n') : 'no script errors');
  await ctx.close(); await b.close(); srv.close();
})().catch(function (e) { console.error(e); process.exit(1); });
