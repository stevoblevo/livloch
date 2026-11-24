/* 0.28 look: the weak spots named in 0.24-0.26, from the play camera behind the hero. The game loop is stopped; frames are
   drawn by hand. Point LL_ROOT at an older checkout for the same frames before.
   SCENE (comma list):
     faces   all five heroes (the two the match lacks are added as stand-ins the sim never steps) stood 4.5 to 11 m in
             front of the player, facing the camera, idle; one frame, plus OUT/faces.json with each head on screen.
     boost   the real sim: run along the Middle thread, a jump, the second jump over it (the thread boost), the landing and
             a few steps; per frame the hero's height and its head's place on screen (OUT/boost.json).
     lift    (Rook) Lantern Lift along the thread to its top and the glide down, measured the same way (OUT/lift.json).
     cloth   the hero standing, its back to the camera, right arm raised high (the gun up), then side-on; one frame each.
   Writes OUT/<scene>_###.png. Env: LL_ROOT, OUT, SCENE, HERO (player, 0..4), W/H (1280x720), PORT (8875-8879), LOOK, EVERY (2). */
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs'), http = require('http'), path = require('path');
const root = process.env.LL_ROOT || process.cwd(), out = process.env.OUT || '/tmp/look/x', W_ = +(process.env.W || 1280), H_ = +(process.env.H || 720), port = +(process.env.PORT || 8876), hero = +(process.env.HERO || 0), every = +(process.env.EVERY || 2);
const scenes = (process.env.SCENE || 'faces').split(',');
fs.mkdirSync(out, { recursive: true });
const types = { '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg' };
const srv = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; fs.readFile(path.join(root, u), (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': types[path.extname(u)] || 'application/octet-stream' }); r.end(d); } }); }).listen(port);
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await (await b.newContext({ viewport: { width: W_, height: H_ } })).newPage(); const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR: ' + e.message)); pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('CONSOLE: ' + m.text()); });
  await pg.route('**/*', rt => { const u = rt.request().url(); if (u.includes('three.min.js')) return rt.fulfill({ path: '/tmp/t/node_modules/three/build/three.min.js', contentType: 'text/javascript' }); if (u.startsWith('http://localhost')) return rt.continue(); return rt.abort(); });
  await pg.goto('http://localhost:' + port + '/'); await pg.waitForTimeout(2000);
  await pg.evaluate((i) => { LL.cfg.mode = 'match'; LL.cfg.pet = false; document.querySelectorAll('.hero')[i].click(); }, hero);
  if (process.env.LOOK) await pg.evaluate((l) => { LL.cfg.look = l; document.body.setAttribute('data-look', l); LL.gfx.setLook(l); }, process.env.LOOK);
  await pg.click('#bPlay'); await pg.waitForTimeout(3500);
  await pg.evaluate(() => { window.requestAnimationFrame = () => 0; document.getElementById('hud').hidden = true;
    const W = LL.sim.W, p = W.player; p.useAI = false; W.waveT = 1e9; W.thiefT = 1e9; W.hollowT = [1e9, 1e9, 1e9]; W.troopers.forEach(u => { u.alive = false; }); W.projs.length = 0; if (W.ness) { W.ness.respT = 1e9; W.ness.alive = false; W.ness.rise = 0; }
    W.heroes.forEach((h, i) => { if (h !== p) { h.useAI = false; h.x = (i ? 1 : -1) * 60; h.z = -120; h.ctl.mx = h.ctl.mz = 0; } });
    window.__head = (h) => { const o = {}; LL.gfx.project(h.x, h.y + 1.85, h.z, o); return [Math.round(o.x), Math.round(o.y)]; };
  });
  for (const sc of scenes) {
    if (sc === 'faces' || sc === 'cloth') {
      const info = await pg.evaluate((sc) => {
        const W = LL.sim.W, p = W.player, v = LL.dbg.view; let id = 9100;
        if (sc === 'faces' && W.heroes.length < 5) { const have = W.heroes.map(h => h.defIdx); for (let k = 0; k < LL.HEROES.length; k++) if (have.indexOf(k) < 0) { const h0 = W.heroes.find(h => h !== p); const c = Object.assign({}, h0, { id: id++, def: LL.HEROES[k], defIdx: k, name: LL.HEROES[k].name, ctl: Object.assign({}, h0.ctl, { ab: [false, false, false] }), ai: Object.assign({}, h0.ai), hurtBy: {}, items: [] }); W.heroes.push(c); if (W.units) W.units.push(c); }
          LL.gfx.setHeroes3d(false); LL.gfx.setHeroes3d(true); }
        p.x = 0; p.z = -14; p.y = 0; p.vx = p.vz = p.vy = 0; p.onGround = true; p.yaw = 0; p.alive = true; p.hp = p.maxHp; v.mode = 'play'; v.target = p; v.yaw = 0; v.pitch = -0.08; v.zoom = 0;
        const others = W.heroes.filter(h => h !== p).sort((a, b) => a.defIdx - b.defIdx);
        if (sc === 'faces') { const spots = [[-2.6, 5], [2.6, 6], [-4.6, 9], [4.4, 10], [0.2, 13]]; others.forEach((h, i) => { const s = spots[i]; h.alive = true; h.team = h.team; h.x = s[0]; h.z = p.z + s[1]; h.y = 0; h.vx = h.vz = h.vy = 0; h.onGround = true; h.yaw = Math.PI; h.pitch = 0; h.ctl.mx = h.ctl.mz = 0; h.ctl.fire = false; }); }
        for (let k = 0; k < 20; k++) LL.gfx.frame(1 / 30, v);
        return sc === 'faces' ? others.map(h => ({ id: h.def.id, head: window.__head(h) })) : null;
      }, sc);
      await pg.screenshot({ path: out + '/' + sc + '_000.png' });
      if (sc === 'cloth') { // the arm raised: aim high; then side-on
        await pg.evaluate(() => { const W = LL.sim.W, p = W.player, v = LL.dbg.view; v.pitch = 0.9; p.pitch = 0.9; for (let k = 0; k < 2; k++) { const c = p.ctl; c.mx = c.mz = 0; c.ax = p.x; c.az = p.z + 3; c.ay = p.y + 1.5 + 6; c.fire = false; LL.sim.step(1 / 60); } for (let k = 0; k < 15; k++) LL.gfx.frame(1 / 30, v); });
        await pg.screenshot({ path: out + '/cloth_001.png' });
        await pg.evaluate(() => { const W = LL.sim.W, p = W.player, v = LL.dbg.view; v.yaw = -Math.PI / 2; v.pitch = 0.1; for (let k = 0; k < 15; k++) LL.gfx.frame(1 / 30, v); });
        await pg.screenshot({ path: out + '/cloth_002.png' });
      }
      if (info) fs.writeFileSync(out + '/faces.json', JSON.stringify(info));
      console.log(sc, JSON.stringify(info));
      continue;
    }
    // boost / lift: the real sim
    const N = sc === 'lift' ? 120 : 84, log = [];
    await pg.evaluate(() => { const W = LL.sim.W, p = W.player, v = LL.dbg.view; p.alive = true; p.hp = p.maxHp; p.x = 0; p.z = -18; p.y = 0; p.vx = p.vy = p.vz = 0; p.onGround = true; p.jumps = 0; p.stamina = 3; p.yaw = 0; p.cds = [0, 0, 0]; p.liftT = 0; p.glide = false; p.tbN = 0; p.tbT = 0;
      v.mode = 'play'; v.target = p; v.yaw = 0; v.pitch = -0.05; v.zoom = 0; W.fx.length = 0; for (let k = 0; k < 8; k++) LL.gfx.frame(1 / 30, v); });
    for (let k = 0; k < N; k++) {
      const row = await pg.evaluate((o) => {
        const W = LL.sim.W, S = LL.sim, p = W.player, ct = p.ctl, v = LL.dbg.view, dt = 1 / 30, ev = [], k = o.k, id = p.def.id;
        const jump = o.sc === 'boost' && (k === 16 || (id !== 'myra' && k === 25)), hold = o.sc === 'boost' && id === 'myra' && k >= 16 && k < 60, lift = o.sc === 'lift' && k === 8;
        for (let s = 0; s < 2; s++) {
          ct.mx = 0; ct.mz = k < (o.sc === 'lift' ? 100 : 60) ? 1 : 0; const cp = {}; LL.gfx.camPose(p, v.yaw, v.pitch, v.zoom, cp); const aim = {}; S.aimPoint(cp.x, cp.y, cp.z, cp.dx, cp.dy, cp.dz, cp.dist + 0.4, p.team, aim); ct.ax = aim.x; ct.ay = aim.y; ct.az = aim.z; ct.jumpHeld = hold; ct.fire = false;
          if (s === 0) { if (jump) ct.jump = true; if (lift) ct.ab[1] = true; }
          W.structs.forEach(q => { q.atkT = 1e9; }); S.step(dt / 2);
          for (const e of W.fx) { LL.gfx.fx(e); if (e.u === p && /^(jump|tboost|land|lift|hover)/.test(e.k)) ev.push(e.k); } W.fx.length = 0;
        }
        LL.gfx.frame(dt, v);
        return { k: k, y: +p.y.toFixed(2), vy: +(p.vy || 0).toFixed(2), head: window.__head(p), feet: (function () { const q = {}; LL.gfx.project(p.x, p.y, p.z, q); return Math.round(q.y); })(), ev: ev };
      }, { k: k, sc: sc });
      log.push(row); if (k % every === 0) await pg.screenshot({ path: out + '/' + sc + '_' + String(k).padStart(3, '0') + '.png' });
    }
    fs.writeFileSync(out + '/' + sc + '.json', JSON.stringify(log));
    const hy = log.map(r => r.head[1]), fy = log.map(r => r.feet);
    console.log(sc, 'peak y', Math.max(...log.map(r => r.y)), 'head on screen y: min', Math.min(...hy), 'max', Math.max(...hy), 'feet max', Math.max(...fy), 'of', H_, '|', log.filter(r => r.ev.length).map(r => r.k + ':' + r.ev.join('+')).join(' '));
  }
  console.log(errs.length ? errs.join('\n') : 'no page errors'); await b.close(); srv.close();
})().catch(e => { console.error('RUNFAIL', e); process.exit(1); });
