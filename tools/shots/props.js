// Props art pass (0.20): the Hush towers, the troopers on both sides and the rocks, framed close and in a fight.
// One browser session per look. Writes OUT_<shot>.png for shot in: fight, tower, crowd, rock; prints draw calls per frame.
// Env: LL_ROOT, PORT (default 8795), LOOK (snow), OUT (prefix, default /tmp/pr/<look>), W, H, T (seconds simulated, default 60),
//      SHOTS (comma list, default all).
// Draw calls are counted by wrapping the WebGL draw functions, so the same script measures any version of the game.
// "scene" is counted with lighter graphics on (no bloom passes); "frame" is the full frame with bloom and the post pass.
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs'), http = require('http'), path = require('path'), root = process.env.LL_ROOT || process.cwd(), port = +(process.env.PORT || 8795);
const look = process.env.LOOK || 'snow', out = process.env.OUT || ('/tmp/pr/' + look), shots = (process.env.SHOTS || 'fight,tower,crowd,face,rock').split(',');
fs.mkdirSync(path.dirname(out), { recursive: true });
const types = { '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.mp4': 'video/mp4' };
const srv = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; fs.readFile(path.join(root, u), (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': types[path.extname(u)] || 'application/octet-stream' }); r.end(d); } }); }).listen(port);
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: +(process.env.W || 1280), height: +(process.env.H || 720) } });
  await ctx.addInitScript(() => {
    window.__draws = 0; window.__frames = 0;
    const wrap = (P) => { if (!P) return; ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced'].forEach(k => { const f = P[k]; if (f) P[k] = function () { window.__draws++; return f.apply(this, arguments); }; }); };
    wrap(window.WebGLRenderingContext && WebGLRenderingContext.prototype); wrap(window.WebGL2RenderingContext && WebGL2RenderingContext.prototype);
    const raf = window.requestAnimationFrame; window.requestAnimationFrame = function (cb) { return raf.call(window, function (t) { window.__frames++; cb(t); }); };
  });
  const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.route('**/*', rt => { const u = rt.request().url(); if (u.includes('three.min.js')) return rt.fulfill({ path: '/tmp/t/node_modules/three/build/three.min.js', contentType: 'text/javascript' }); if (u.startsWith('http://localhost')) return rt.continue(); return rt.abort(); });
  await pg.goto('http://localhost:' + port + '/'); await pg.waitForTimeout(1800);
  await pg.evaluate((look) => { LL.cfg.mode = 'match'; LL.cfg.look = look; LL.cfg.petUnlocked = LL.cfg.pet = true; }, look);
  if (process.env.STANDIN) await pg.evaluate(() => { const F = LL.gfx.FLATS, d = 'art/heroes/dora.png'; ['tower', 'trooper', 'hush', 'hollow', 'thief', 'rocks'].forEach(k => F[k] = { src: d, cells: 4 }); }); // the painted-cutout paths, with a stand-in picture
  await pg.click('#bPlay'); await pg.waitForTimeout(2500);
  await pg.evaluate((T) => { LL.input.lockFailed = true; const S = LL.sim, W = S.W; W.player.useAI = true; for (let i = 0; i < T * 30; i++) { S.step(1 / 30); W.heroes.forEach(h => { if (h.team === 0 && h.alive) h.hp = h.maxHp; }); } W.fx.length = 0; }, +(process.env.T || 60));
  const count = async (low) => {
    await pg.evaluate((low) => { LL.gfx.low = low; }, low); await pg.waitForTimeout(400);
    const a = await pg.evaluate(() => [window.__draws, window.__frames]); await pg.waitForTimeout(1200); const z = await pg.evaluate(() => [window.__draws, window.__frames]);
    await pg.evaluate(() => { LL.gfx.low = false; }); return Math.round((z[0] - a[0]) / Math.max(1, z[1] - a[1]));
  };
  const step = S0 => pg.evaluate(() => { const S = LL.sim; if (!S._step0) S._step0 = S.step; S.step = function () {}; });
  const shot = async (name) => { await pg.waitForTimeout(1600); await pg.screenshot({ path: out + '_' + name + '.png' }); const sc = await count(true), fr = await count(false); console.log(name + ': ' + sc + ' scene draw calls, ' + fr + ' with bloom and post'); };
  if (shots.includes('fight')) { await pg.waitForTimeout(1400); await shot('fight'); }
  // From here the sim is frozen so each frame is framed on purpose. The renderer keeps animating.
  await step();
  const place = (fn, arg) => pg.evaluate(fn, arg);
  if (shots.includes('crowd')) {
    await place(() => { const S = LL.sim, W = S.W, p = W.player; p.useAI = false; p.alive = true; p.hp = p.maxHp; p.vx = p.vz = 0;
      // gather a crowd in front of the hero on the middle thread: a few of each side, a hollow, a thief carrying light
      const P = { x: 0, z: 0, dx: 0, dz: 1 }; LL.lanePoint(1, LL.lanes[1].len * 0.5, P);
      const cx = P.x, cz = P.z; let k0 = 0, k1 = 0;
      W.troopers.forEach(t => { if (!t.alive) return; if (t.big) return; if (t.team === 0 && k0 < 7) { t.x = cx + ((k0 % 4) - 1.5) * 1.6; t.z = cz - 2 - Math.floor(k0 / 4) * 1.8; t.yaw = 0; t.vx = 0; t.vz = 1; k0++; } else if (t.team === 1 && k1 < 7) { t.x = cx + ((k1 % 4) - 1.5) * 1.7; t.z = cz + 3 + Math.floor(k1 / 4) * 1.8; t.yaw = Math.PI; t.vx = 0; t.vz = -1; k1++; } });
      if (!W.troopers.some(t => t.alive && t.big)) S._t.spawnHollow(1, true);
      const h = W.troopers.find(t => t.alive && t.big); if (h) { h.x = cx + 4.5; h.z = cz + 7; h.yaw = Math.PI; h.vx = 0; h.vz = -1; }
      if (!W.thieves.some(t => t.alive)) S._t.spawnThief();
      const th = W.thieves.find(t => t.alive); if (th) { th.x = cx - 5; th.z = cz + 2; th.state = 1; th.yaw = Math.PI * 0.75; th.vx = 1; th.vz = -1; }
      p.x = cx + 2; p.z = cz - 8; p.y = 0; const v = LL.dbg.view; v.yaw = Math.atan2(cx - p.x, cz + 2 - p.z) + 0.3; v.pitch = -0.12; p.yaw = v.yaw; });
    await shot('crowd');
  }
  if (shots.includes('face')) { // the same crowd from the Hush side: Reign faces and lanterns, Hush backs
    await place(() => { const W = LL.sim.W, p = W.player, P = { x: 0, z: 0, dx: 0, dz: 1 }; LL.lanePoint(1, LL.lanes[1].len * 0.5, P);
      p.x = P.x - 2; p.z = P.z + 13; p.y = 0; const v = LL.dbg.view; v.yaw = Math.atan2(P.x - p.x, P.z - p.z) + 0.3; v.pitch = -0.1; p.yaw = v.yaw; });
    await shot('face');
  }
  if (shots.includes('rock')) {
    await place(() => { const W = LL.sim.W, p = W.player; p.useAI = false; p.alive = true; p.hp = p.maxHp; p.vx = p.vz = 0;
      // the rock nearest the middle of the valley on the Reign side, seen from a lane
      let best = null, bd = 1e9; W.obstacles.forEach(o => { if (o.tree || o.z > -8) return; const d = Math.hypot(o.x - 0, o.z + 40); if (d < bd) { bd = d; best = o; } });
      const dx = -best.x, dz = -40 - best.z, d = Math.hypot(dx, dz) || 1; p.x = best.x + dx / d * 9; p.z = best.z + dz / d * 9; p.y = 0;
      const v = LL.dbg.view; v.yaw = Math.atan2(best.x - p.x, best.z - p.z); v.pitch = -0.12; p.yaw = v.yaw; });
    await shot('rock');
  }
  // the towers last: the closest one clears the troopers away
  if (shots.includes('tower')) {
    await place(() => { const W = LL.sim.W, p = W.player; p.useAI = false; p.alive = true; p.hp = p.maxHp; p.vx = p.vz = 0;
      const g = W.structs.find(s => s.team === 1 && s.kind === 'guardian' && s.lane === 1 && s.alive) || W.structs.find(s => s.team === 1 && s.kind !== 'patron' && s.alive);
      p.x = g.x + 3; p.z = g.z - (+(window.__TD || 15)); p.y = 0; const v = LL.dbg.view; v.yaw = Math.atan2(g.x - p.x, g.z - p.z) + 0.34; v.pitch = 0.2; p.yaw = v.yaw; });
    await shot('tower');
    await place(() => { const W = LL.sim.W, p = W.player; // the warden of the same thread, from in front and to one side, hero out of the way
      const g = W.structs.find(s => s.team === 1 && s.kind === 'warden' && s.lane === 1 && s.alive) || W.structs.find(s => s.team === 1 && s.kind !== 'patron' && s.alive);
      p.x = g.x + 9; p.z = g.z - 13; p.y = 0; const v = LL.dbg.view; v.yaw = Math.atan2(g.x - p.x, g.z - p.z) + 0.36; v.pitch = 0.26; p.yaw = v.yaw; });
    await shot('warden');
    await place(() => { const W = LL.sim.W, p = W.player; // a guardian straight on, close, looking up at its eyes; the valley cleared of troopers for it
      W.troopers.forEach(t => { t.alive = false; }); W.thieves.forEach(t => { t.alive = false; }); W.heroes.forEach(h => { if (h !== p) { h.x += 60; } });
      const g = W.structs.find(s => s.team === 1 && s.kind === 'guardian' && s.lane === 0 && s.alive) || W.structs.find(s => s.team === 1 && s.kind !== 'patron' && s.alive);
      p.x = g.x + 2.5; p.z = g.z - 10; p.y = 0; const v = LL.dbg.view; v.yaw = Math.atan2(g.x - p.x, g.z - p.z) + 0.42; v.pitch = 0.36; p.yaw = v.yaw; });
    await shot('eyes');
  }
  console.log(errs.length ? errs.join('\n') : 'no page errors'); await b.close(); srv.close();
})().catch(e => { console.error('RUNFAIL', e); process.exit(1); });
