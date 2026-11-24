/* 0.25 rook: Rook Vale from the play camera, driven by the real sim. The game loop is stopped; each frame this script sets the
   player's controls (as a hand would), steps LL.sim twice at 1/60 s, hands the events to the renderer, and draws once. So
   the lift, the thread catch, the glide and the landing here are the model's, not a scripted height.
   The run: forward along the Middle thread, strafe right then left while firing, forward again, Lantern Lift along the
   thread (the thread catches him), fire on the way down, land, the camera turns a quarter as he runs on (away from the Hush tower ahead), a second lift off the
   thread banking across the camera (its cooldown is zeroed for the picture: in play it is 9 s), land, stop.
   Writes OUT/f###.png and OUT/log.json (per frame: phase, height, liftT, glide, events).
   Env: LL_ROOT, OUT, W/H (640x400), PORT (8870-8879), LOOK, PAPER=1, HUD=1 (keep the HUD), ZOOM. */
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs'), http = require('http'), path = require('path');
const root = process.env.LL_ROOT || process.cwd(), out = process.env.OUT || '/tmp/rook', W_ = +(process.env.W || 640), H_ = +(process.env.H || 400), port = +(process.env.PORT || 8873);
fs.mkdirSync(out, { recursive: true });
const types = { '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg' };
const srv = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; fs.readFile(path.join(root, u), (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': types[path.extname(u)] || 'application/octet-stream' }); r.end(d); } }); }).listen(port);
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await (await b.newContext({ viewport: { width: W_, height: H_ } })).newPage(); const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  await pg.route('**/*', rt => { const u = rt.request().url(); if (u.includes('three.min.js')) return rt.fulfill({ path: '/tmp/t/node_modules/three/build/three.min.js', contentType: 'text/javascript' }); if (u.startsWith('http://localhost')) return rt.continue(); return rt.abort(); });
  await pg.goto('http://localhost:' + port + '/'); await pg.waitForTimeout(2000);
  const idx = await pg.evaluate(() => LL.HEROES.findIndex(d => d.id === 'rook'));
  await pg.evaluate((i) => { LL.cfg.mode = 'match'; document.querySelectorAll('.hero')[i].click(); }, idx);
  if (process.env.PAPER) await pg.evaluate(() => { LL.cfg.heroes3d = false; if (LL.gfx.setHeroes3d) LL.gfx.setHeroes3d(false); });
  if (process.env.LOOK) await pg.evaluate((l) => { LL.cfg.look = l; document.body.setAttribute('data-look', l); LL.gfx.setLook(l); }, process.env.LOOK);
  await pg.click('#bPlay'); await pg.waitForTimeout(3500);
  await pg.evaluate((o) => { window.requestAnimationFrame = () => 0; if (!o.hud) document.getElementById('hud').hidden = true; const W = LL.sim.W, p = W.player;
    p.useAI = false; p.x = 0; p.z = -18; /* clear of the Reign house behind (the camera needs 6 m) and short of the Hush tower ahead */ p.y = 0; p.vx = p.vz = p.vy = 0; p.onGround = true; p.level = 3; p.yaw = 0;
    W.heroes.forEach((h, i) => { if (h !== p) { h.useAI = false; h.x = (i ? 1 : -1) * 60; h.z = -120; h.ctl.mx = h.ctl.mz = 0; } });
    const v = LL.dbg.view; v.yaw = 0; v.pitch = -0.1; v.zoom = o.zoom; for (let k = 0; k < 6; k++) LL.gfx.frame(0.033, v); }, { hud: !!process.env.HUD, zoom: +(process.env.ZOOM || 0) });
  await pg.waitForTimeout(1200);
  const N = 332, log = [];
  for (let f = 0; f < N; f++) {
    const row = await pg.evaluate((f) => {
      const W = LL.sim.W, S = LL.sim, p = W.player, c = p.ctl, v = LL.dbg.view, dt = 1 / 30; let ph = '';
      if (f >= 190 && f < 220) v.yaw += (Math.PI / 2) / 30;                                         // the camera turns a quarter
      const fx = Math.sin(v.yaw), fz = Math.cos(v.yaw), rx = -fz, rz = fx; let mx = 0, mz = 0, fire = false, lift = false, down = 0;
      if (f < 12) ph = 'idle';
      else if (f < 34) { ph = 'run'; mx = fx; mz = fz; }
      else if (f < 62) { ph = 'strafe right, firing'; mx = rx; mz = rz; fire = true; }
      else if (f < 90) { ph = 'strafe left, firing'; mx = -rx; mz = -rz; fire = true; }
      else if (f < 102) { ph = 'run'; mx = fx; mz = fz; }
      else if (f < 190) { ph = p.liftT > 0 ? 'lift along the thread' : (p.glide ? 'glide, firing' : (f < 106 ? 'lift' : 'landed, run')); mx = fx; mz = fz; lift = f === 102; fire = p.glide && f > 136; down = p.glide ? 0.12 : 0; }
      else if (f < 226) { ph = 'run, camera turning'; mx = fx; mz = fz; }
      else if (f < 310) { if (f === 226) p.cds[1] = 0; lift = f === 226; const a = (f - 226) / 84; mx = fx * 0.75 + rx * Math.sin(a * 6.283) * 0.8; mz = fz * 0.75 + rz * Math.sin(a * 6.283) * 0.8; ph = p.liftT > 0 || f < 230 ? 'second lift, off the thread, banking' : (p.glide ? 'glide, banking' : 'landed'); }
      else ph = 'stop';
      const ev = [];
      for (let k = 0; k < 2; k++) {
        c.mx = mx; c.mz = mz; c.fire = fire; c.ax = p.x + fx * 30; c.az = p.z + fz * 30; c.ay = p.y + 1.5 - down * 30; if (lift && k === 0) c.ab[1] = true;
        W.heroes.forEach(h => { if (h.alive) h.hp = h.maxHp; }); S.step(dt / 2);
        for (const e of W.fx) { LL.gfx.fx(e); if (/^(lift|liftthread|glide|liftland)$/.test(e.k) && e.u === p) ev.push(e.k); } W.fx.length = 0;
      }
      LL.gfx.frame(dt, v);
      return { f: f, ph: ph, y: +p.y.toFixed(2), liftT: +p.liftT.toFixed(2), glide: !!p.glide, sp: +Math.hypot(p.vx, p.vz).toFixed(1), ev: ev };
    }, f);
    log.push(row); await pg.screenshot({ path: out + '/f' + String(f).padStart(3, '0') + '.png' });
  }
  fs.writeFileSync(out + '/log.json', JSON.stringify(log));
  const ev = log.filter(r => r.ev.length).map(r => r.f + ':' + r.ev.join('+')).join(' '), top = Math.max.apply(null, log.map(r => r.y));
  console.log('events ' + ev + ' | top ' + top + ' m'); console.log(errs.length ? errs.join('\n') : 'no page errors'); await b.close(); srv.close();
})().catch(e => { console.error('RUNFAIL', e); process.exit(1); });
