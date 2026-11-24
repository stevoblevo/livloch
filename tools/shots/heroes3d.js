/* 0.24 heroes3d: scripted close-ups of one hero, frame by frame (the game loop is stopped), for judging the 3D figures and
   comparing them with the painted cards. Segments: idle, run away, strafe right and left while firing, back-pedal, stop,
   a running jump, a dash, a side-on run, a run toward the camera, standing facing it, a fall. Writes OUT/f###.png and
   OUT/seg.json (which frames are which segment).
   Env: LL_ROOT, HERO (0 Dora, 1 Anna, 2 Myra, 3 Skein), OUT, W/H, PORT (use 8850-8859), ZOOM (0..1, default 0.75),
   LOOK (a view id), PAPER=1 (the painted cards), SEGS (comma list of segment names to run, default all), STEP (frames
   between screenshots, default 1). */
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
  ['front', 34, [0, 1], Math.PI], ['frontIdle', 16, [0, 0], Math.PI], ['frontAim', 14, [0, 0], Math.PI, true], ['fall', 24, [0, 0], 0, false, 'die']
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
