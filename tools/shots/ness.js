/* 0.26 ness: the Ness and the flood from the play camera, driven by the real sim. The game loop is stopped; each frame
   this script sets the player's controls as a hand would, steps LL.sim twice at 1/60 s, hands the events to the
   renderer, and draws once. So the tell, the bite, the hold, the water and where the Ness swims are the model's.
   SCENE: surface (it comes up; idle; the camera walks round it), chomp (stand in reach: tell, bite, held, thrown),
          dodge (jump over the bite: the miss, its head on the ground), flood (the warning, the water, the Ness out
          among the threads, a ride on a thread, the drain), still (one staged frame per line of STILLS, for the views).
   Writes OUT/f###.png (every EVERY-th frame) and OUT/log.json (per frame: phase, what the Ness is doing, events).
   Env: LL_ROOT, OUT, SCENE, W/H (640x400), PORT (8880-8889), LOOK, LOW=1 (Lighter graphics), REDUCED=1, PAPER=1,
        HUD=1, ZOOM, EVERY (1), HERO (0). */
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs'), http = require('http'), path = require('path');
const root = process.env.LL_ROOT || process.cwd(), out = process.env.OUT || '/tmp/ness', W_ = +(process.env.W || 640), H_ = +(process.env.H || 400), port = +(process.env.PORT || 8881), scene = process.env.SCENE || 'chomp', every = +(process.env.EVERY || 1);
fs.mkdirSync(out, { recursive: true });
const types = { '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg' };
const srv = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; fs.readFile(path.join(root, u), (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': types[path.extname(u)] || 'application/octet-stream' }); r.end(d); } }); }).listen(port);
const FRAMES = { surface: 300, chomp: 170, dodge: 150, flood: 700, still: 8 };
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await (await b.newContext({ viewport: { width: W_, height: H_ }, reducedMotion: process.env.REDUCED ? 'reduce' : 'no-preference' })).newPage(); const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR: ' + e.message)); pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_FAILED/.test(m.text())) errs.push('CONSOLE: ' + m.text()); });
  await pg.route('**/*', rt => { const u = rt.request().url(); if (u.includes('three.min.js')) return rt.fulfill({ path: '/tmp/t/node_modules/three/build/three.min.js', contentType: 'text/javascript' }); if (u.startsWith('http://localhost')) return rt.continue(); return rt.abort(); });
  await pg.goto('http://localhost:' + port + '/'); await pg.waitForTimeout(2000);
  await pg.evaluate((i) => { LL.cfg.mode = 'match'; document.querySelectorAll('.hero')[i].click(); }, +(process.env.HERO || 0));
  if (process.env.PAPER) await pg.evaluate(() => { LL.cfg.heroes3d = false; if (LL.gfx.setHeroes3d) LL.gfx.setHeroes3d(false); });
  if (process.env.LOW) await pg.evaluate(() => { LL.cfg.low = true; LL.gfx.setQuality(true); });
  if (process.env.LOOK) await pg.evaluate((l) => { LL.cfg.look = l; document.body.setAttribute('data-look', l); LL.gfx.setLook(l); }, process.env.LOOK);
  await pg.click('#bPlay'); await pg.waitForTimeout(3500);
  if (process.env.LOW) await pg.evaluate(() => { LL.gfx.setQuality(true); LL.gfx.setLook(LL.cfg.look || 'snow'); LL.gfx.build(LL.sim.W); });
  await pg.evaluate((o) => { window.requestAnimationFrame = () => 0; if (!o.hud) document.getElementById('hud').hidden = true; const W = LL.sim.W, p = W.player, n = W.ness, N = LL.sim.NESS;
    p.useAI = false; p.y = 0; p.vx = p.vz = p.vy = 0; p.onGround = true; W.thiefT = 1e9;
    const park = () => W.heroes.forEach((h, i) => { if (h !== p) { h.useAI = false; h.x = (i ? 1 : -1) * 60; h.z = -120; h.ctl.mx = h.ctl.mz = 0; } });
    const v = LL.dbg.view; v.pitch = -0.02; v.zoom = o.zoom; window.__sc = o.scene; n.floodAt = 1e9; n.floodHp = true;
    if (o.scene === 'surface') { park(); p.x = n.x - 2; p.z = n.z - 21; v.yaw = 0.1; v.pitch = 0.1; n.respT = 0.5; }
    else if (o.scene === 'chomp' || o.scene === 'dodge') { park(); p.x = n.x; p.z = n.z - 19; v.yaw = 0; v.pitch = 0.06; n.respT = 0; LL.sim.step(1 / 60); n.rise = 1; n.chompT = 1e9; }
    else if (o.scene === 'flood') { p.x = 6; p.z = -14; v.yaw = 0.9; v.pitch = 0.02; n.respT = 0; LL.sim.step(1 / 60); n.rise = 1; n.chompT = 2; W.heroes.forEach((h, i) => { if (h !== p) { h.x = i ? 44 : -4; h.z = -30 - i * 4; } }); }
    else if (o.scene === 'still') { park(); n.respT = 0; LL.sim.step(1 / 60); n.rise = 1; n.chompT = 1e9; const q = (o.cam || '-3,-18,0.15,0.1').split(',').map(Number); p.x = n.x + q[0]; p.z = n.z + q[1]; v.yaw = q[2]; v.pitch = q[3]; if (o.aggro) { n.aggro = p; n.lastHurt = 1e9; n.spitT = 1e9; } }
    for (const e of W.fx) LL.gfx.fx(e); W.fx.length = 0;
    for (let k = 0; k < 6; k++) LL.gfx.frame(0.033, v); }, { hud: !!process.env.HUD, zoom: +(process.env.ZOOM || 0), scene: scene, cam: process.env.CAM, aggro: !!process.env.AGGRO });
  await pg.waitForTimeout(1200);
  const N = +(process.env.N || FRAMES[scene]), log = [];
  for (let f = 0; f < N; f++) {
    const row = await pg.evaluate((f) => {
      const W = LL.sim.W, S = LL.sim, p = W.player, c = p.ctl, v = LL.dbg.view, n = W.ness, NS = S.NESS, dt = 1 / 30, sc = window.__sc; let ph = '', mx = 0, mz = 0, jump = false, dash = false, zip = 0, fire = false, aim = null;
      const fx = () => Math.sin(v.yaw), fz = () => Math.cos(v.yaw), ch = n.chomp;
      if (sc === 'surface') {
        ph = f < 75 ? 'it surfaces' : (f < 150 ? 'idle' : 'walking round it');
        if (f >= 150) { const a = Math.atan2(p.x - n.x, p.z - n.z) + 0.011, d = 21; const nx = n.x + Math.sin(a) * d, nz = n.z + Math.cos(a) * d; mx = (nx - p.x) * 30 / 7; mz = (nz - p.z) * 30 / 7; v.yaw = Math.atan2(n.x - p.x, n.z - p.z) + 0.1; }
      } else if (sc === 'chomp') {
        if (f < 20) ph = 'out of reach'; else if (f < 58 && !ch && !p.held) { ph = 'walking into reach'; mx = fx(); mz = fz(); if (f === 20) n.chompT = 0.9; }
        else ph = ch ? (ch.ph === 'tell' ? (ch.locked ? 'the tell, spot locked' : 'the tell') : 'held in the jaws') : (p.onGround ? 'thrown clear, landed' : 'thrown');
        if (p.held || (!p.onGround && f > 70)) v.pitch += (0.28 - v.pitch) * 0.12; else if (f > 70) v.pitch += (0.06 - v.pitch) * 0.1;
        if (f > 70 && !p.held && p.onGround) v.yaw += (Math.atan2(n.x - p.x, n.z - p.z) - v.yaw) * 0.12;
      } else if (sc === 'dodge') {
        if (f < 20) ph = 'out of reach'; else if (f < 58 && !ch) { ph = 'walking into reach'; mx = fx(); mz = fz(); if (f === 20) n.chompT = 0.9; }
        else if (ch && ch.ph === 'tell') { ph = ch.locked ? 'the tell, spot locked' : 'the tell'; if (ch.t <= 0.3 && p.onGround) { jump = true; mx = -fx(); mz = -fz(); } else if (!p.onGround) { mx = -fx(); mz = -fz(); } }
        else if (n.openT > 0) { ph = 'missed: its head lies open'; fire = true; aim = [n.biteX, 1, n.biteZ]; if (!p.onGround) { mx = -fx(); mz = -fz(); } }
        else ph = 'it recovers';
      } else if (sc === 'flood') {
        const F = W.flood; if (f === 8) S._t.flood('shot');
        const toN = Math.atan2(n.x - p.x, n.z - p.z);
        if (!F) ph = f < 8 ? 'before' : 'after: dry, the Ness back in the loch';
        else if (F.ph === 'swell') { ph = 'the warning: the loch stands up'; v.yaw += (toN - v.yaw) * 0.08; }
        else if (F.ph === 'rise') { ph = 'the water runs out'; v.yaw += (toN - v.yaw) * 0.08; }
        else if (F.ph === 'high') {
          v.yaw += (toN - v.yaw) * 0.1;
          if (F.t > 8.6) { ph = 'wading'; mx = -Math.cos(v.yaw) * 0.9; mz = Math.sin(v.yaw) * 0.9; }
          else if (F.t > 4.6) { ph = p.held ? 'held in the jaws' : (ch && ch.ph === 'tell' ? 'the tell, in the water' : 'wading, the Ness coming'); if (ch && ch.ph === 'tell' && ch.tgt === p && window.__dodge && ch.t <= 0.3 && p.onGround) jump = true; mx = -fx() * 0.5; mz = -fz() * 0.5; }
          else { ph = p.zip ? 'riding the thread above the water' : 'to the thread'; if (!p.zip && S.canZip(p) >= 0) zip = -1; else if (!p.zip) { mx = (0 - p.x) / 3; mz = 0; } }
        } else { ph = 'the water runs back'; v.yaw += (toN - v.yaw) * 0.08; }
        if (p.held) v.pitch += (0.25 - v.pitch) * 0.1; else v.pitch += (0.03 - v.pitch) * 0.1;
      }
      const m = Math.hypot(mx, mz); if (m > 1) { mx /= m; mz /= m; }
      const ev = [];
      for (let k = 0; k < 2; k++) {
        c.mx = mx; c.mz = mz; c.fire = fire; if (aim) { c.ax = aim[0]; c.ay = aim[1]; c.az = aim[2]; } else { c.ax = p.x + fx() * 30; c.az = p.z + fz() * 30; c.ay = p.y + 1.5 + Math.sin(v.pitch) * 30; }
        if (jump && k === 0) c.jump = true; if (dash && k === 0) c.dash = true; if (zip && k === 0) { c.zip = true; c.zipDir = zip; }
        W.heroes.forEach(h => { if (h.alive && h.hp < h.maxHp * 0.5) h.hp = h.maxHp * 0.5; }); W.patron.forEach(q => { q.hp = q.maxHp; }); S.step(dt / 2);
        for (const e of W.fx) { LL.gfx.fx(e); if (/^(ness|flood)/.test(e.k)) ev.push(e.k + (e.hit != null ? (e.hit ? ':hit' : ':miss') : '') + (e.why ? ':' + e.why : '')); } W.fx.length = 0;
      }
      LL.gfx.frame(dt, v);
      return { f: f, ph: ph, y: +p.y.toFixed(2), held: !!p.held, hp: Math.round(p.hp), ness: [+n.x.toFixed(1), +n.z.toFixed(1)], out: !!n.out, open: +n.openT.toFixed(2), flood: W.flood ? W.flood.ph + ' ' + W.flood.reach.toFixed(0) : '', wet: +S.waterAt(p.x, p.z).toFixed(2), sp: +Math.hypot(p.vx, p.vz).toFixed(1), zip: !!p.zip, calls: LL.gfx._calls(), ev: ev };
    }, f);
    log.push(row); if (f % every === 0) await pg.screenshot({ path: out + '/f' + String(f).padStart(3, '0') + '.png' });
  }
  fs.writeFileSync(out + '/log.json', JSON.stringify(log));
  const info = await pg.evaluate(() => Object.assign({}, LL.ness.info(), { gfx: LL.gfx.info() }));
  console.log('events ' + log.filter(r => r.ev.length).map(r => r.f + ':' + r.ev.join('+')).join(' ')); console.log('ness ' + JSON.stringify(info));
  console.log(errs.length ? errs.join('\n') : 'no page errors'); await b.close(); srv.close();
})().catch(e => { console.error('RUNFAIL', e); process.exit(1); });
