/* 0.24 heroes3d: scripted close-ups of one hero, frame by frame (the game loop is stopped), for judging the 3D figures and
   comparing them with the painted cards. Segments: idle, run away, strafe right and left while firing, back-pedal, stop,
   a running jump, a dash, a side-on run, a run toward the camera, standing facing it, a fall. Writes OUT/f###.png and
   OUT/seg.json (which frames are which segment).
   Env: LL_ROOT, HERO (0 Dora, 1 Anna, 2 Myra, 3 Skein), OUT, W/H, PORT (use 8850-8859), ZOOM (0..1, default 0.75),
   LOOK (a view id), PAPER=1 (the painted cards), SEGS (comma list of segment names to run, default all), STEP (frames
   between screenshots, default 1), LOOKS (comma list of view ids: instead of the segments, the three heroes on the field side by
   side in each view, from behind and from the front), TURN=1 (a turntable of all four, idle then running; N frames per lap).
   0.25 air: AIR=1 plays the hero's air move through the real model (LL.sim._t.heroStep: the jump, the second jump, the
   hover, gravity and landing, two half-steps a frame as the game does), its events handed to the renderer, with the play
   camera (ZOOM 0 unless set) behind the hero, or SIDE=1 with the camera to its side. Writes OUT/a###.png and OUT/air.json
   (per frame: height, vertical speed, jumps, hover left, stamina, events, the hero's middle on screen). REDUCED=1 turns on
   reduced motion. Ports 8860-8869. */
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs'), http = require('http'), path = require('path');
const root = process.env.LL_ROOT || process.cwd(), out = process.env.OUT || '/tmp/h3/x', hero = +(process.env.HERO || 0), W_ = +(process.env.W || 640), H_ = +(process.env.H || 480), port = +(process.env.PORT || 8851);
fs.mkdirSync(out, { recursive: true });
const types = { '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.mp4': 'video/mp4', '.css': 'text/css', '.json': 'application/json', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg' };
const srv = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; fs.readFile(path.join(root, u), (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': types[path.extname(u)] || 'application/octet-stream' }); r.end(d); } }); }).listen(port);
/* name, frames, move (local: x left, z forward, speed fraction), face (hero yaw relative to the camera's), fire, extra */
const SEGS = [
  ['idle', 24, [0, 0], 0], ['run', 36, [0, 1], 0], ['strafeR', 30, [-1, 0], 0, true], ['strafeL', 30, [1, 0], 0, true], ['back', 26, [0, -0.7], 0, false],
  ['stop', 18, [0, 0], 0], ['aim', 16, [0, 0], 0, true], ['jump', 26, [0, 1], 0, false, 'jump'], ['dash', 14, [0, 1], 0, false, 'dash'], ['side', 34, [0, 1], Math.PI / 2],
  ['front', 34, [0, 1], Math.PI], ['frontIdle', 16, [0, 0], Math.PI], ['frontAim', 14, [0, 0], Math.PI, true], ['echo', 30, [0, 0], 0, false, 'echo'], ['fall', 24, [0, 0], 0, false, 'die']
];
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await (await b.newContext({ viewport: { width: W_, height: H_ } })).newPage(); const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR: ' + e.message)); pg.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()); });
  await pg.route('**/*', rt => { const u = rt.request().url(); if (u.includes('three.min.js')) return rt.fulfill({ path: '/tmp/t/node_modules/three/build/three.min.js', contentType: 'text/javascript' }); if (u.startsWith('http://localhost')) return rt.continue(); return rt.abort(); });
  await pg.goto('http://localhost:' + port + '/'); await pg.waitForTimeout(2000);
  if (process.env.PAPER) await pg.evaluate(() => { LL.cfg.heroes3d = false; if (LL.gfx.setHeroes3d) LL.gfx.setHeroes3d(false); });
  if (process.env.LOOK) await pg.evaluate((l) => { LL.cfg.look = l; document.body.setAttribute('data-look', l); LL.gfx.setLook(l); }, process.env.LOOK);
  await pg.evaluate((i) => { LL.cfg.mode = 'match'; document.querySelectorAll('.hero')[i].click(); }, hero);
  await pg.click('#bPlay'); await pg.waitForTimeout(3500);
  await pg.evaluate((z) => { window.requestAnimationFrame = () => 0; document.getElementById('hud').hidden = true; const W = LL.sim.W; W.troopers.length = 0; W.thieves.length = 0; W.projs.length = 0;
    const p = W.player, g = W.structs.find(s => s.team === 0 && s.kind === 'guardian' && s.lane === 1); p.x = g.x + 6; p.z = g.z + 30; p.y = 0; p.onGround = true; p.yaw = Math.PI; p.alive = true; p.hp = p.maxHp; p.useAI = false;
    W.heroes.forEach(h => { if (h !== p) { h.x = 500; h.z = 500; } });
    LL.dbg.view.yaw = Math.PI; LL.dbg.view.pitch = -0.1; LL.dbg.view.zoom = z; for (let k = 0; k < 6; k++) LL.gfx.frame(0.033, LL.dbg.view); }, +(process.env.ZOOM || 0.75));
  await pg.waitForTimeout(1200);
  if (process.env.TURN) { // a turntable: all four heroes in a row (a fourth is added for the picture), idle while the camera circles, then each running a small circle
    await pg.evaluate(() => { const W = LL.sim.W, p = W.player; if (W.heroes.length < 4) { const h = Object.assign({}, W.heroes.find(x => x !== p)); h.id = 9999; W.heroes.push(h); }
      const have = W.heroes.map(h => h.def.id), want = ['dora', 'anna', 'myra', 'skein']; W.heroes.forEach((h, i) => { h.def = LL.HEROES.find(d => d.id === want[i]); h.alive = true; h.hp = h.maxHp; h.useAI = false; });
      W.player = W.heroes[1]; W.heroes.forEach(h => { h.isPlayer = h === W.player; }); const pl = W.player, g = W.structs.find(s => s.team === 0 && s.kind === 'guardian' && s.lane === 1); pl.x = g.x + 6; pl.z = g.z + 30;
      W.heroes.forEach((h, i) => { h.x0 = pl.x + (i - 1.5) * 1.6; h.z0 = pl.z; h.x = h.x0; h.z = h.z0; h.y = 0; h.onGround = true; h.yaw = 0; });
      LL.gfx.setLook(LL.cfg.look || 'snow'); LL.dbg.view.zoom = 0.2; LL.dbg.view.pitch = -0.18; });
    const N = +(process.env.N || 120);
    for (let f = 0; f < N * 2; f++) {
      await pg.evaluate((o) => { const W = LL.sim.W, v = LL.dbg.view, dt = 1 / 30; W.t += dt; v.yaw += Math.PI * 2 / o.N; const run = o.f >= o.N;
        W.heroes.forEach((h, i) => { if (run) { const a = (o.f - o.N) * dt * 2.6 + i * 1.57, r = 1.1, nx = h.x0 + Math.cos(a) * r - r, nz = h.z0 + Math.sin(a) * r; h.vx = (nx - h.x) / dt; h.vz = (nz - h.z) / dt; h.x = nx; h.z = nz; h.yaw = Math.atan2(h.vx, h.vz); }
          else { h.vx = h.vz = 0; h.yaw = 0; } h.y = 0; h.onGround = true; h.pitch = 0; });
        v.target = { x: W.heroes.reduce((a, h) => a + h.x0, 0) / 4 - 0.4, y: 0, z: W.heroes[0].z0 + 0.4, dashT: 0, zip: null }; LL.gfx.frame(dt, v); }, { f: f, N: N });
      await pg.screenshot({ path: out + '/t' + String(f).padStart(3, '0') + '.png' });
    }
    console.log(errs.length ? errs.join('\n') : 'no page errors'); await b.close(); srv.close(); return;
  }
  if (process.env.AIR) { // 0.25 air: the hero's air move, played by the model, from behind (or SIDE=1 from the side)
    const id = await pg.evaluate(() => LL.sim.W.player.def.id), side = !!process.env.SIDE;
    if (process.env.REDUCED) await pg.evaluate(() => { LL.gfx.reduced = true; }); // reduced motion, as the OS setting would set it
    /* a plan per hero: frames (30 a second) at which to press jump, hold it, move ([forward, right] as fractions of full speed) and fire */
    const P = { press: [], hold: [], move: [], fire: [], N: 0 };
    const seq = (o) => { P.N = o.N; for (let f = 0; f < o.N; f++) { P.press[f] = (o.press || []).indexOf(f) >= 0; P.hold[f] = (o.hold || []).some(r => f >= r[0] && f < r[1]); P.fire[f] = (o.fire || []).some(r => f >= r[0] && f < r[1]);
      let m = [0.5, 0]; (o.move || []).forEach(r => { if (f >= r[0] && f < r[1]) m = r[2]; }); P.move[f] = m; } };
    if (side) { if (id === 'myra') seq({ N: 84, press: [10, 62], hold: [[10, 60], [62, 64]] }); else if (id === 'dora') seq({ N: 64, press: [10, 40], hold: [[10, 13], [40, 43]] }); else seq({ N: 64, press: [10, 20], hold: [[10, 13], [20, 23]] }); }
    else if (id === 'dora') seq({ N: 112, press: [8, 45, 82], hold: [[8, 11], [45, 48], [82, 85]], fire: [[45, 70]], move: [[72, 112, [0, 0]]] });
    else if (id === 'myra') seq({ N: 124, press: [8, 76, 88], hold: [[8, 62], [76, 79], [88, 106]], fire: [[30, 46]], move: [[24, 38, [0.2, 0.7]], [38, 52, [0.2, -0.7]], [64, 124, [0.4, 0]]] });
    else seq({ N: 112, press: [8, 17, 56, 70], hold: [[8, 11], [17, 20], [56, 59], [70, 73]], fire: [[56, 66]], move: [[50, 100, [0.45, 0.3]], [100, 112, [0, 0]]] });
    await pg.evaluate((o) => { const W = LL.sim.W, p = W.player, v = LL.dbg.view; p.useAI = false; p.stamina = 3; p.yaw = Math.PI; v.yaw = o.side ? Math.PI / 2 : Math.PI; v.pitch = -0.12; v.zoom = o.z;
      for (let k = 0; k < 8; k++) LL.gfx.frame(1 / 30, v); }, { side: side, z: +(process.env.ZOOM || 0) });
    const log = [];
    for (let f = 0; f < P.N; f++) {
      if (P.press[f]) await pg.evaluate(() => { LL.sim.W.player.stamina = 3; });
      const r = await pg.evaluate((o) => {
        const W = LL.sim.W, p = W.player, v = LL.dbg.view, c = p.ctl, dt = 1 / 30, yaw = Math.PI, fx = Math.sin(yaw), fz = Math.cos(yaw), rx = -fz, rz = fx;
        c.ax = p.x + fx * 30; c.ay = 1.5; c.az = p.z + fz * 30; c.mx = fx * o.m[0] + rx * o.m[1]; c.mz = fz * o.m[0] + rz * o.m[1]; c.fire = o.fire; c.jumpHeld = o.hold; const ev = [];
        for (let s = 0; s < 2; s++) { if (s === 0 && o.press) c.jump = true; W.t += dt / 2; LL.sim._t.heroStep(p, dt / 2); p.hp = p.maxHp; if (p.ammo < 2) p.ammo = p.magSize;
          for (const e of W.fx) { if (e.u === p && /jump|hover/.test(e.k)) ev.push(e.k + (e.dbl ? ':dbl' : '') + (e.why ? ':' + e.why : '')); try { LL.gfx.fx(e); } catch (er) {} } W.fx.length = 0; }
        W.projs.length = 0; LL.gfx.frame(dt, v); const q = {}; LL.gfx.project(p.x, p.y + 1.1, p.z, q);
        return { y: +p.y.toFixed(3), vy: +p.vy.toFixed(2), j: p.jumps, hov: +(p.hoverT || 0).toFixed(2), g: p.onGround, st: p.stamina, ev: ev, sx: Math.round(q.x), sy: Math.round(q.y) };
      }, { press: P.press[f], hold: P.hold[f], m: P.move[f], fire: P.fire[f] });
      log.push(r); await pg.screenshot({ path: out + '/a' + String(f).padStart(3, '0') + '.png' });
    }
    fs.writeFileSync(out + '/air.json', JSON.stringify(log));
    console.log(id, side ? 'side' : 'behind', log.map((r, i) => r.ev.length ? i + ':' + r.ev.join('+') : '').filter(Boolean).join(' '));
    console.log(errs.length ? errs.join('\n') : 'no page errors'); await b.close(); srv.close(); return;
  }
  if (process.env.LOOKS) { // every view: all four heroes standing in a row, from behind and from the front, after a few frames of running in place
    let shot = 0;
    for (const l of process.env.LOOKS.split(',')) {
      for (const face of [0, Math.PI]) {
        await pg.evaluate((o) => { if (LL.gfx.look !== LL.gfx.LOOKS[o.l]) { document.body.setAttribute('data-look', o.l); LL.gfx.setLook(o.l); }
          const W = LL.sim.W, v = LL.dbg.view, p = W.player, g = W.structs.find(s => s.team === 0 && s.kind === 'guardian' && s.lane === 1); p.x = g.x + 6; p.z = g.z + 30; p.y = 0; p.onGround = true;
          W.heroes.forEach((h, i) => { const k = i - W.heroes.indexOf(p); h.alive = true; h.onGround = true; h.y = 0; h.x = p.x - Math.cos(v.yaw) * k * 1.3; h.z = p.z + Math.sin(v.yaw) * k * 1.3; h.yaw = v.yaw + o.face; h.vx = h.vz = 0; h.lastShotT = -9; });
          for (let k = 0; k < 20; k++) { W.t += 1 / 30; W.heroes.forEach(h => { h.yaw = v.yaw + o.face; h.pitch = 0; }); LL.gfx.frame(1 / 30, v); } }, { l: l, face: face });
        await pg.screenshot({ path: out + '/L' + String(shot++).padStart(2, '0') + '-' + l + (face ? '-front' : '-back') + '.png' });
      }
    }
    console.log(errs.length ? errs.join('\n') : 'no page errors'); await b.close(); srv.close(); return;
  }
  const want = process.env.SEGS ? process.env.SEGS.split(',') : null, step = +(process.env.STEP || 1), seg = []; let f = 0, shot = 0;
  for (const S of SEGS) {
    if (want && want.indexOf(S[0]) < 0) continue; const first = shot;
    for (let k = 0; k < S[1]; k++, f++) {
      await pg.evaluate((o) => {
        const W = LL.sim.W, p = W.player, v = LL.dbg.view, dt = 1 / 30, sp = (p.def.speed || 7) * 0.95; W.t += dt;
        p.yaw = v.yaw + o.face; const fx = Math.sin(v.yaw), fz = Math.cos(v.yaw), rx = Math.cos(v.yaw), rz = -Math.sin(v.yaw);
        if (o.face === Math.PI) { /* toward the camera: the hero faces it and walks toward it */ }
        let mx = 0, mz = 0; const m = o.move; // local to the hero: [left, forward]
        const hx = Math.sin(p.yaw), hz = Math.cos(p.yaw), lx = Math.cos(p.yaw), lz = -Math.sin(p.yaw);
        mx = hx * m[1] + lx * m[0]; mz = hz * m[1] + lz * m[0];
        if (o.k === 0 && o.extra === 'jump') { p.onGround = false; p.vy = 9.5; }
        if (o.extra === 'dash' && o.k === 2) p.dashT = 0.2;
        if (o.extra === 'echo') { // the Echo, running a slow circle beside the hero (positions in 10 Hz steps, as the model gives them)
          if (o.k === 0) W.echo = { f: [], i: 0, at: 0, t0: W.t, x: p.x, z: p.z, yaw: p.yaw, shots: 0, a: 0 };
          const e = W.echo; e.a += 1 / 30; if (o.k % 3 === 0) { const a = e.a * 1.6; e.x = p.x + Math.cos(a) * 2.4 - 2.4 * 0 + Math.sin(v.yaw) * 2.5; e.z = p.z + Math.sin(a) * 2.4 + Math.cos(v.yaw) * 2.5; e.yaw = a + Math.PI; }
          if (o.k === 29) W.echo = null; }
        if (o.extra === 'die') { if (o.k === 2) { p.alive = false; } }
        else { p.alive = true; }
        if (p.dashT > 0) { mx *= 3.2; mz *= 3.2; p.dashT -= dt; }
        p.vx = mx * sp; p.vz = mz * sp; p.x += p.vx * dt; p.z += p.vz * dt;
        if (!p.onGround) { p.vy -= 26 * dt; p.y += p.vy * dt; if (p.y <= 0) { p.y = 0; p.vy = 0; p.onGround = true; p.vyLand = 9; } } else { p.y = 0; p.vy = 0; }
        p.ctl.fire = !!o.fire; if (o.fire) { p.fireT = (p.fireT || 0) - dt; if (p.fireT <= 0) { p.lastShotT = W.t; p.fireT = 1 / (p.def.gun.rate || 4); } } else p.fireT = 0;
        p.ammo = 5; p.reloadT = 0; p.pitch = o.fire ? 0.05 : 0;
        if (o.face === Math.PI / 2) v.yaw += 0; // side: the camera keeps its yaw, the hero runs across it
        LL.gfx.frame(dt, v);
      }, { k: k, move: S[2], face: S[3], fire: !!S[4], extra: S[5] || null });
      if (k % step === 0) { await pg.screenshot({ path: out + '/f' + String(shot).padStart(3, '0') + '.png' }); shot++; }
    }
    seg.push({ name: S[0], from: first, to: shot - 1 });
    // put the hero back in front of the camera for the next segment
    await pg.evaluate(() => { const W = LL.sim.W, p = W.player, g = W.structs.find(s => s.team === 0 && s.kind === 'guardian' && s.lane === 1); p.x = g.x + 6; p.z = g.z + 30; p.alive = true; p.dashT = 0; p.onGround = true; p.y = 0; });
  }
  fs.writeFileSync(out + '/seg.json', JSON.stringify(seg));
  const info = await pg.evaluate(() => { const m = LL.gfx._heroes()[LL.sim.W.heroes.indexOf(LL.sim.W.player)]; return m && m.fig ? LL.heroes3d._dbg(m.fig) : 'paper'; });
  console.log(JSON.stringify(info)); console.log(errs.length ? errs.join('\n') : 'no page errors'); await b.close(); srv.close();
})().catch(e => { console.error('RUNFAIL', e); process.exit(1); });
