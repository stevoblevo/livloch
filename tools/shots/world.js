// 0.25 world: what the play camera sees (issues #29 ground by the threads, #31 Reign backs at distance, #32 hollows from behind).
// Every frame is from the normal player camera (play mode, behind the hero), with the sim frozen and the scene staged by hand
// so before and after show the same moment. Point LL_ROOT at another checkout to get the "before" frames.
// Writes OUT/<look>_<shot>.png and prints, per look and shot, the scene's draw calls and triangles (one render with bloom and
// the post pass off, counted by wrapping the WebGL draw functions, so the same script measures any version).
// Env: LL_ROOT, PORT (8880), OUT (/tmp/wd), LOOKS (snow,ink,lantern,origami,glow), SHOTS (all below), W, H (1280x720),
//      LOW=1 (Lighter graphics, rebuilt), HERO (0), T (seconds of bot play first, 20).
// Shots: reign (a Reign column 20 to 40 m ahead, walking away, Hush beyond), reignnear (the same column at 8 to 20 m),
//        hollowback (a hollow 12 m ahead, walking away from the camera, as when chasing it), hollowfar (the same at 25 m),
//        hollowside (14 m, side on), hollowfront (14 m, facing the camera), smalls (hush troopers and a thief, unchanged check),
//        ground (middle thread, troopers' feet and soul orbs by the thread), groundwest (the west thread looking along it),
//        groundside (looking across the thread at the ground beside it), groundlow (the camera's pitch down a little more).
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs'), http = require('http'), path = require('path');
const root = process.env.LL_ROOT || process.cwd(), port = +(process.env.PORT || 8880), out = process.env.OUT || '/tmp/wd';
const looks = (process.env.LOOKS || 'snow,ink,lantern,origami,glow').split(',');
const shots = (process.env.SHOTS || 'reign,reignnear,hollowback,hollowfar,hollowside,hollowfront,smalls,ground,groundwest,groundside,groundlow').split(',');
fs.mkdirSync(out, { recursive: true });
const types = { '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.mp4': 'video/mp4', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; fs.readFile(path.join(root, u), (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': types[path.extname(u)] || 'application/octet-stream' }); r.end(d); } }); }).listen(port);
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: +(process.env.W || 1280), height: +(process.env.H || 720) } });
  await ctx.addInitScript(() => {
    window.__cnt = { on: false, calls: 0, tris: 0 };
    const tri = (mode, n) => mode === 4 ? n / 3 : (mode === 5 || mode === 6 ? Math.max(0, n - 2) : 0);
    const wrap = (P) => { if (!P) return;
      const dA = P.drawArrays, dE = P.drawElements, dAI = P.drawArraysInstanced, dEI = P.drawElementsInstanced, C = window.__cnt;
      P.drawArrays = function (m, f, n) { if (C.on) { C.calls++; C.tris += tri(m, n); } return dA.apply(this, arguments); };
      P.drawElements = function (m, n) { if (C.on) { C.calls++; C.tris += tri(m, n); } return dE.apply(this, arguments); };
      if (dAI) P.drawArraysInstanced = function (m, f, n, k) { if (C.on) { C.calls++; C.tris += tri(m, n) * k; } return dAI.apply(this, arguments); };
      if (dEI) P.drawElementsInstanced = function (m, n, t, o, k) { if (C.on) { C.calls++; C.tris += tri(m, n) * k; } return dEI.apply(this, arguments); };
    };
    wrap(window.WebGLRenderingContext && WebGLRenderingContext.prototype); wrap(window.WebGL2RenderingContext && WebGL2RenderingContext.prototype);
  });
  const pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR: ' + e.message)); pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console error: ' + m.text().slice(0, 300)); });
  await pg.route('**/*', rt => { const u = rt.request().url(); if (u.includes('three.min.js')) return rt.fulfill({ path: '/tmp/t/node_modules/three/build/three.min.js', contentType: 'text/javascript' }); if (u.startsWith('http://localhost')) return rt.continue(); return rt.abort(); });
  await pg.goto('http://localhost:' + port + '/'); await pg.waitForTimeout(1800);
  await pg.evaluate((o) => { LL.cfg.mode = 'match'; LL.cfg.look = 'snow'; LL.cfg.petUnlocked = LL.cfg.pet = false; LL.cfg.low = o.low; document.querySelectorAll('.hero')[o.hero].click(); }, { low: !!process.env.LOW, hero: +(process.env.HERO || 0) });
  await pg.click('#bPlay'); await pg.waitForTimeout(2500);
  await pg.evaluate((T) => { LL.input.lockFailed = true; const S = LL.sim, W = S.W; W.player.useAI = true; for (let i = 0; i < T * 30; i++) { S.step(1 / 30); W.heroes.forEach(h => { if (h.team === 0 && h.alive) h.hp = h.maxHp; }); } W.fx.length = 0; }, +(process.env.T || 20));
  await pg.waitForTimeout(800);
  // stop the game loop and the sim; from here every frame is drawn by hand
  await pg.evaluate(() => { window.requestAnimationFrame = () => 0; const S = LL.sim; S.step = function () {}; LL.gfx.setQuality(!!LL.cfg.low); document.getElementById('hud').hidden = true;
    const W = S.W; W.red = 0;
    /* a stand-in unit the renderer can draw; the sim is frozen, so nothing else reads it */
    let id = 9000; window.__unit = (team, x, z, yaw, o) => Object.assign({ id: id++, kind: 'trooper', team: team, x: x, y: 0, z: z, vx: Math.sin(yaw) * 0.01 * (o && o.still ? 0 : 100), vy: 0, vz: Math.cos(yaw) * 0.01 * (o && o.still ? 0 : 100), yaw: yaw, r: 0.6, h: 1.6, hp: 100, maxHp: 100, alive: true, struct: false, flash: 0, big: false, ranged: false }, o || {});
    window.__stage = (shot) => {
      const W = LL.sim.W, p = W.player, v = LL.dbg.view, U = window.__unit;
      W.troopers.length = 0; W.thieves.length = 0; W.projs.length = 0; W.orbs.length = 0; if (W.strays) W.strays.forEach(s => { s.x += 400; });
      W.heroes.forEach(h => { if (h !== p) { h.x = 300 + h.id; h.z = 300; } });
      p.alive = true; p.hp = p.maxHp; p.y = 0; p.vy = 0; p.onGround = true; p.vx = p.vz = 0; p.dashT = 0; p.useAI = false;
      v.mode = 'play'; v.target = p; v.pitch = -0.08; v.zoom = 0;
      const at = (x, z, yaw, pitch) => { p.x = x; p.z = z; p.yaw = yaw; v.yaw = yaw; if (pitch != null) v.pitch = pitch; };
      const reignCol = (z0, z1) => { let k = 0; for (let z = z0; z <= z1; z += 2.1) { for (let c = 0; c < 2; c++) { const ranged = (k % 3) === 2; W.troopers.push(U(0, (c ? 0.85 : -0.85) + Math.sin(k) * 0.25, z + c * 0.9, 0, { ranged: ranged })); k++; } } };
      const hushPack = (z0, n) => { for (let k = 0; k < n; k++) W.troopers.push(U(1, ((k % 3) - 1) * 1.5, z0 + Math.floor(k / 3) * 1.8, Math.PI, { ranged: k % 4 === 3 })); };
      const hollow = (x, z, yaw) => { W.troopers.push(U(1, x, z, yaw, { big: true, r: 1.15, h: 3.2, hp: 2000, maxHp: 2000 })); };
      /* Everything stands in the open stretch of the middle thread between the Reign guardian (z -22.6) and the Hush guardian
         (z 34.6), so no tower pulls the camera in. The hero stands a little off the thread so the subject shows beside it. */
      if (shot === 'reign') { at(2.6, -12, 0); reignCol(8, 26); hushPack(29.5, 6); }
      else if (shot === 'reignnear') { at(2.6, -12, 0); reignCol(-4, 8); hushPack(12, 6); }
      else if (shot === 'hollowback') { at(-2.4, 14, Math.PI); hollow(0, 2, Math.PI); W.troopers.push(U(0, -1.2, -5, 0), U(0, 1.1, -5.6, 0, { ranged: true })); }
      else if (shot === 'hollowfar') { at(-2.4, 19, Math.PI); hollow(0, -6, Math.PI); W.troopers.push(U(0, -1.2, -13, 0), U(0, 1.1, -13.6, 0, { ranged: true })); }
      else if (shot === 'hollowside') { at(-14, -2.4, Math.PI / 2); hollow(0, 0, Math.PI); }
      else if (shot === 'hollowfront') { at(2.4, -14, 0); hollow(0, 0, Math.PI); }
      else if (shot === 'smalls') { at(2.4, -6, 0); hushPack(2, 6);
        W.thieves.push(U(1, -3, 4, Math.PI * 0.8, { kind: 'thief', state: 1, carry: { x: 0 }, r: 0.6, h: 1.5 })); W.thieves.push(U(1, 3.5, 7, -Math.PI * 0.85, { kind: 'thief', state: 0, carry: null, r: 0.6, h: 1.5 })); }
      else if (shot === 'ground' || shot === 'groundlow') { at(0.8, -8, 0, shot === 'groundlow' ? -0.2 : -0.08); W.troopers.push(U(0, -0.9, -1.5, 0), U(0, 0.9, -0.6, 0, { ranged: true }), U(0, -0.6, 2, 0), U(0, 1.2, 2.8, 0));
        W.orbs.push({ x: 2.2, y: 0.9, z: -3.5, val: 10, team: 0, t: 0, dead: false }, { x: -1.7, y: 1.4, z: 0, val: 10, team: 0, t: 0, dead: false }, { x: 3.4, y: 2.2, z: 4, val: 10, team: 0, t: 0, dead: false }); }
      else if (shot === 'groundwest') { at(-47.2, -20, 0.08); W.troopers.push(U(0, -48.8, -10, 0), U(0, -47.2, -9, 0), U(1, -48, 12, Math.PI)); } // the west guardians stand at z -33.9 and 33.9
      else if (shot === 'groundside') { at(0.8, -6, 0.62); W.orbs.push({ x: 3.2, y: 0.9, z: -0.5, val: 10, team: 0, t: 0, dead: false }); W.troopers.push(U(0, 0.4, 0.5, 0), U(0, -0.5, 4, 0)); }
      for (let k = 0; k < 18; k++) LL.gfx.frame(0.1, v); // long enough for a wall's pull-in on the camera to ease back out
      // where the subject is on screen, for close-up crops; and whether anything pulled the camera in
      const sub = { reign: [0, 1.0, 17], reignnear: [0, 1.0, 2], hollowback: [0, 1.4, 2], hollowfar: [0, 1.4, -6], hollowside: [0, 1.4, 0], hollowfront: [0, 1.4, 0], smalls: [0, 1, 4], ground: [2.5, 0, -4], groundlow: [2.5, 0, -4], groundwest: [-45, 0, -14], groundside: [3.5, 0, -1] }[shot] || [p.x, 1, p.z];
      const o = {}; LL.gfx.project(sub[0], sub[1], sub[2], o); return { x: Math.round(o.x), y: Math.round(o.y), bt: +(LL.gfx._btRaw == null ? 1 : LL.gfx._btRaw).toFixed(2), near: W.obstacles.filter(q => Math.hypot(q.x - p.x, q.z - p.z) < 8).map(q => [Math.round(q.x), Math.round(q.z), q.r, q.tree ? 'tree' : 'rock']) };
    };
    window.__count = () => { // the scene alone: one plain render, no bloom, no post
      const v = LL.dbg.view, nb = LL.gfx.noPost, bl = LL.gfx.low; LL.gfx.noPost = true; LL.gfx.low = true; window.__cnt.calls = 0; window.__cnt.tris = 0; window.__cnt.on = true;
      LL.gfx.frame(0.0, v); window.__cnt.on = false; LL.gfx.noPost = nb; LL.gfx.low = bl; LL.gfx.frame(0.0, v); return [window.__cnt.calls, Math.round(window.__cnt.tris)];
    };
  });
  for (const look of looks) {
    await pg.evaluate((look) => { document.body.setAttribute('data-look', look); LL.gfx.setLook(look); LL.sim.W.lens = look; }, look);
    await pg.waitForTimeout(500);
    for (const shot of shots) {
      const st = await pg.evaluate((s) => window.__stage(s), shot); await pg.waitForTimeout(120);
      fs.writeFileSync(out + '/' + look + '_' + shot + '.json', JSON.stringify(st)); if (st.bt < 0.99) console.log('  note: the camera was pulled in to ' + st.bt + ' of its distance; obstacles near the hero ' + JSON.stringify(st.near));
      const c = await pg.evaluate(() => window.__count());
      await pg.screenshot({ path: out + '/' + look + '_' + shot + '.png' });
      console.log(look + ' ' + shot + ': ' + c[0] + ' draw calls, ' + c[1] + ' triangles (scene, no bloom or post)' + (process.env.LOW ? ' [Lighter graphics]' : ''));
    }
  }
  if (process.env.EVAL) console.log('eval', JSON.stringify(await pg.evaluate(process.env.EVAL)));
  console.log(errs.length ? errs.join('\n') : 'no page errors'); await b.close(); srv.close();
})().catch(e => { console.error('RUNFAIL', e); process.exit(1); });
