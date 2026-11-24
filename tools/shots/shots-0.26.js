/* A look per gun (0.26): the bot plays the player to a fight, then the player's hero fires at the nearest enemy while N frames
   are recorded with model events passed to the renderer and the HUD as main.js does. Counts WebGL draw calls per frame.
   Env: LL_ROOT, PORT (8870), OUT, HERO (0..4), LOOK (snow), LOW (1 = Lighter graphics), T (40), N (45), W/H (960x540), TOUCH (1),
   SKIP (frames to run before the first capture, 6), EXTRA (n: every n frames also add a harmless extra shot of the hero's gun at a random spot in front, for a legible gallery; says so in the evidence notes), AIM (far|near|quiet), AIMY, EVERY (1), FULL (1 = full page shot, else the canvas and HUD both come in the page shot anyway). */
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs'), http = require('http'), path = require('path'), root = process.env.LL_ROOT || process.cwd(), port = +(process.env.PORT || 8870), out = process.env.OUT || '/tmp/t/shots';
fs.mkdirSync(out, { recursive: true });
const types = { '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.css': 'text/css', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; fs.readFile(path.join(root, u), (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': types[path.extname(u)] || 'application/octet-stream' }); r.end(d); } }); }).listen(port);
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const touch = process.env.TOUCH === '1';
  const ctx = await b.newContext({ viewport: { width: +(process.env.W || 960), height: +(process.env.H || 540) }, hasTouch: touch, isMobile: touch });
  const pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', e => errs.push(e.message));
  await pg.addInitScript(() => { window.__draws = 0; for (const C of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) { if (!C) continue; for (const k of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) { const o = C.prototype[k]; if (o) C.prototype[k] = function () { window.__draws++; return o.apply(this, arguments); }; } } });
  await pg.route('**/*', rt => { const u = rt.request().url(); if (u.includes('three.min.js')) return rt.fulfill({ path: '/tmp/t/node_modules/three/build/three.min.js', contentType: 'text/javascript' }); if (u.startsWith('http://localhost')) return rt.continue(); return rt.abort(); });
  await pg.goto('http://localhost:' + port + '/'); await pg.waitForTimeout(1800);
  await pg.evaluate((o) => { LL.cfg.mode = 'match'; LL.cfg.look = o.look; LL.cfg.hero = o.hero; if (o.low && LL.gfx.setQuality) { LL.cfg.low = true; LL.gfx.setQuality(true); } }, { look: process.env.LOOK || 'snow', hero: +(process.env.HERO || 0), low: process.env.LOW === '1' });
  await pg.click('#bPlay'); await pg.waitForTimeout(2500);
  if (process.env.LOW === '1') await pg.evaluate(() => { LL.gfx.setQuality(true); });
  await pg.evaluate((T) => { window.requestAnimationFrame = () => 0; LL.input.lockFailed = true; const S = LL.sim, W = S.W; W.player.useAI = true;
    for (let i = 0; i < T * 30; i++) { S.step(1 / 30); W.heroes.forEach(h => { if (h.team === 0 && h.alive) h.hp = h.maxHp; }); W.fx.length = 0; } }, +(process.env.T || 40));
  const N = +(process.env.N || 45), SKIP = +(process.env.SKIP || 6), EVERY = +(process.env.EVERY || 1), stats = [];
  for (let f = 0; f < N * EVERY + SKIP; f++) {
    const st = await pg.evaluate(([aim, aimy, extra]) => { const S = LL.sim, W = S.W, v = LL.dbg.view, p = W.player; p.useAI = false; p.hp = p.maxHp;
      let best = null, bd = 1e9; W.units.concat(W.heroes).forEach(u => { if (!u.alive || u.team === p.team || u === p) return; const d = Math.hypot(u.x - p.x, u.z - p.z); if (d < bd) { bd = d; best = u; } });
      if (best) { const dx = best.x - p.x, dz = best.z - p.z, dd = Math.hypot(dx, dz) || 1, far = aim === 'far' ? Math.max(dd, 48) / dd : 1; p.ctl.ax = p.x + dx * far; p.ctl.ay = aim === 'far' ? aimy : (best.y || 0) + 1.2; p.ctl.az = p.z + dz * far; p.yaw = Math.atan2(dx, dz); } p.ctl.fire = true; p.ctl.mx = 0; p.ctl.mz = 0;
      if (aim === 'quiet') { W.units.length = 0; W.heroes.forEach(h => { if (h !== p) { h.x = 900; h.z = 900; } }); p.yaw = aimy; p.ctl.ax = p.x + Math.sin(aimy) * 50; p.ctl.az = p.z + Math.cos(aimy) * 50; p.ctl.ay = 1.5; }
      if (extra > 0 && (W.t * 30 | 0) % extra === 0) { const g = p.def.gun, sy = Math.sin(p.yaw), cy = Math.cos(p.yaw), off = (Math.random() - 0.5) * 5, up = 0.7 + Math.random() * 1.8, sp = g.speed, ay = (Math.random() - 0.5) * 0.05, ax = (Math.random() - 0.5) * 0.05 + 0.02;
        W.projs.push({ x: p.x + cy * off + sy * 2, y: up, z: p.z - sy * off + cy * 2, vx: (sy + cy * ax) * sp, vy: ay * sp, vz: (cy - sy * ax) * sp, life: g.range / g.speed, dmg: 0, team: p.team, owner: p, r: 0.18, kind: 'bullet', gun: true, hit: null, size: g.size }); }
      S.step(1 / 30); p.hp = p.maxHp;
      for (let i = 0; i < W.fx.length; i++) { LL.gfx.fx(W.fx[i]); LL.ui.fx(W.fx[i]); } W.fx.length = 0;
      v.mode = 'play'; v.target = p; v.yaw += (((p.yaw - v.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * 0.5; v.pitch = -0.1; window.__draws = 0;
      LL.gfx.frame(1 / 30, v); LL.ui.frame(1 / 30, W, v, { hot: false, orb: false, canZip: false, canFold: false });
      const pts = []; if (LL.shots && LL.shots.cam) { const cam = LL.shots.cam, V = new THREE.Vector3(), w = innerWidth, h = innerHeight; W.projs.forEach(q => { if (!q.gun || q.owner !== p) return; V.set(q.x, q.y, q.z).project(cam); if (V.z < 1 && Math.abs(V.x) < 1 && Math.abs(V.y) < 1) pts.push([Math.round((V.x + 1) / 2 * w), Math.round((1 - V.y) / 2 * h), Math.round(Math.hypot(q.x - cam.position.x, q.z - cam.position.z))]); }); }
      return { pts, draws: window.__draws, sh: LL.shots ? LL.shots.stats() : null, projs: W.projs.length, enemy: bd }; }, [process.env.AIM || 'far', +(process.env.AIMY || (process.env.AIM === 'quiet' ? 1.1 : 3.2)), +(process.env.EXTRA || 0)]);
    stats.push(st);
    if (f >= SKIP && (f - SKIP) % EVERY === 0) await pg.screenshot({ path: out + '/f' + String(Math.floor((f - SKIP) / EVERY)).padStart(3, '0') + '.png' });
  }
  fs.writeFileSync(out + '/stats.json', JSON.stringify(stats.slice(SKIP)));
  const dr = stats.slice(SKIP).map(s => s.draws), mx = Math.max.apply(null, dr), av = dr.reduce((a, c) => a + c, 0) / dr.length;
  const inst = stats.slice(SKIP).map(s => s.sh ? s.sh.instances : 0), meshes = stats.slice(SKIP).map(s => s.sh ? s.sh.meshes : 0), pj = stats.slice(SKIP).map(s => s.projs);
  console.log(JSON.stringify({ hero: process.env.HERO || 0, look: process.env.LOOK || 'snow', low: process.env.LOW === '1', drawsAvg: +av.toFixed(1), drawsMax: mx, shotInstMax: Math.max.apply(null, inst), shotMeshesMax: Math.max.apply(null, meshes), projsMax: Math.max.apply(null, pj) }));
  console.log(errs.length ? errs.join('\n') : 'no page errors'); await b.close(); srv.close();
})().catch(e => { console.error('RUNFAIL', e); process.exit(1); });
