/* 0.29 feel: the four 0.28 rules from the play camera, staged in a real match and drawn by the game's own loop on
   Playwright's paused clock (stepped 1/FPS s per frame, like tools/shots/face.js), so every frame is the same moment
   in game time whichever checkout is served.
   Scenes (SCENES, in this order in one match): arrive (a long ride on the Middle thread lands among the Hush), fold (the
   crease catches small Hush and pins a hollow), light (a hero goes home, leaves with a light and mends a house), slack
   (the Middle thread's warning, slack, and its end).
   Stills: OUT/feel-0.29-<scene>-<look>-<TAG>.jpg at the moments in SHOTS below. VIDEO=1 also writes every frame of
   each scene to OUT/v-<scene>/ for an mp4. Prints the rule state (LL.rulefx._state, when there is one) per still.
   ROOT (the checkout to serve; point it at an older one for "before"), TAG (after|before), LOOKS (snow,ink,origami,glow),
   PORT (8870), OUT, FPS (20), PRE (frames drawn before a still, 5), HERO (0), W, H, REDUCED=1, LOW=1, BANNER=1 (keep the
   banner, hidden by default because it covers the middle of the frame). */
'use strict';
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/npm-tools/node_modules/playwright');
const fs = require('fs'), http = require('http'), path = require('path');
const root = process.env.ROOT || path.join(__dirname, '..', '..'), port = +(process.env.PORT || 8870), out = process.env.OUT || '/tmp/feel29';
const TAG = process.env.TAG || 'after', FPS = +(process.env.FPS || 20), VIDEO = !!process.env.VIDEO, WW = +(process.env.W || 960), HH = +(process.env.H || 540);
const PRE = +(process.env.PRE || 5);
const looks = (process.env.LOOKS || 'snow,ink,origami,glow').split(',');
fs.mkdirSync(out, { recursive: true });
const types = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg' };
const srv = http.createServer(function (q, r) { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; const f = path.join(root, path.normalize(u)); fs.readFile(f, function (e, d) { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); r.end(d); } }); }).listen(port);
(async function () {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const look of looks) {
    const ctx = await b.newContext({ viewport: { width: WW, height: HH }, reducedMotion: process.env.REDUCED ? 'reduce' : 'no-preference' }), pg = await ctx.newPage(), errs = [];
    pg.on('console', function (m) { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); }); pg.on('pageerror', function (e) { errs.push('PAGEERROR ' + e.message); });
    await pg.route('**/*', function (rt) { const u = rt.request().url(); if (u.includes('three.min.js')) return rt.fulfill({ path: process.env.THREE_LOCAL || '/tmp/t/node_modules/three/build/three.min.js', contentType: 'text/javascript' }); if (u.startsWith('http://localhost')) return rt.continue(); return rt.abort(); });
    /* one drawn frame per 1/FPS s of the paused clock (the page's own rAF would draw three or four in that time) */
    await pg.addInitScript(function (ms) { window.requestAnimationFrame = function (cb) { return setTimeout(function () { cb(performance.now()); }, ms); }; }, 1000 / FPS);
    await pg.addInitScript(function (o) { try { localStorage.setItem('livelock.v1', JSON.stringify(o)); } catch (e) {} }, { look: look, v6: true, v17: true, coached: true, mode: 'match', hero: +(process.env.HERO || 0), low: !!process.env.LOW });
    await pg.clock.install({ time: 0 }); await pg.clock.pauseAt(1000);
    await pg.goto('http://localhost:' + port + '/');
    if (!process.env.BANNER) await pg.addStyleTag({ content: '#banner { visibility: hidden !important; }' });
    for (let k = 0; k < 20; k++) { await pg.clock.runFor(100); await pg.waitForTimeout(100); }
    await pg.evaluate(function () { LL.input.lockFailed = true; LL.cfg.mode = 'match'; }); await pg.click('#bPlay');
    for (let k = 0; k < 14; k++) { await pg.clock.runFor(400); await pg.waitForTimeout(60); }
    /* helpers in the page: skip the sim ahead (events to the renderer and HUD, not drawn), keep the player alive */
    await pg.evaluate(function () {
      const S = LL.sim; window.FE = {
        skip: function (to) { const W = S.W; while (W.t < to && !W.over) { S.step(1 / 30); W.patron.forEach(function (p) { p.hp = p.maxHp; }); if (window.FE.floor) window.FE.floor.forEach(function (s) { s.hp = Math.max(s.hp, s.maxHp * 0.6); }); W.fx.forEach(function (e) { LL.gfx.fx(e); LL.ui.fx(e); }); W.fx.length = 0; } },
        keep: function () { const W = S.W, p = W.player; p.useAI = false; if (!p.alive) { p.alive = true; p.respT = 0; } if (p.hp < p.maxHp * 0.6 && !window.FE.noKeep) p.hp = p.maxHp * 0.9; W.patron.forEach(function (q) { q.hp = q.maxHp; }); if (window.FE.floor) window.FE.floor.forEach(function (s) { s.hp = Math.max(s.hp, s.maxHp * 0.6); });
          W.heroes.forEach(function (h) { if (h.team === 1) { h.x = 60; h.z = 95; h.alive = false; h.respT = 999; } }); },
        lanePt: function (lane, z) { const Q = {}; LL.laneNearest(lane, LL.C.LANE_X[lane], z, Q); const P = {}; LL.lanePoint(lane, Q.s, P); return { s: Q.s, x: P.x, z: P.z }; },
        put: function (u, lane, z, lat) { const q = window.FE.lanePt(lane, z); u.lane = lane; u.s = q.s; u.lat = lat || 0; u.x = q.x + (lat || 0); u.z = q.z; u.vx = u.vz = 0; u.tgt = null; u.folded = false; u.caught = 0; },
        view: function (yaw, pitch) { LL.dbg.view.yaw = yaw; LL.dbg.view.pitch = pitch; LL.dbg.view.zoom = 0; },
        st: function () { const W = S.W, hm = LL.gfx._heroes().find(function (m) { return m.unit === W.player; }); return { rf: LL.rulefx && LL.rulefx._state ? LL.rulefx._state() : null, hero: hm ? hm.visible : null, bt: LL.gfx._btRaw, y: +W.player.y.toFixed(2), z: +W.player.z.toFixed(1), calls: LL.gfx._calls() }; }
      };
      window.FE.skip(70); window.FE.keep();
    });
    let vi = 0, vdir = null;
    const frame = async function (name) {
      await pg.evaluate(function () { window.FE.keep(); }); await pg.clock.runFor(1000 / FPS);
      if (vdir) await pg.screenshot({ path: path.join(vdir, String(vi++).padStart(4, '0') + '.jpg'), type: 'jpeg', quality: 86 });
      if (name) { const f = path.join(out, 'feel-0.29-' + name + '-' + look + '-' + TAG + '.jpg'); await pg.screenshot({ path: f, type: 'jpeg', quality: 86 }); console.log(look, TAG, name, JSON.stringify(await pg.evaluate(function () { return window.FE.st(); }))); }
    };
    /* VIDEO: every frame drawn. Otherwise the sim is skipped ahead without drawing and only the PRE frames before each
       still are drawn, which is several times faster on SwiftShader; effects begun while skipping start when drawing does. */
    const skip = async function (secs) { await pg.evaluate(function (d) { window.FE.keep(); window.FE.skip(LL.sim.W.t + d); }, secs); };
    const run = async function (secs, shots) { const n = Math.round(secs * FPS); shots = shots || {};
      if (VIDEO) { for (let k = 0; k < n; k++) await frame(shots[k] || null); return; }
      let k = 0; const ks = Object.keys(shots).map(Number).sort(function (a, b) { return a - b; });
      for (const t of ks) { const a = Math.max(k, t - PRE + 1); if (a > k) await skip((a - k) / FPS); for (let j = a; j <= t; j++) await frame(j === t ? shots[t] : null); k = t + 1; }
      if (n > k) await skip((n - k) / FPS); };
    const until = async function (test, maxS) { for (let k = 0; k < maxS * FPS; k++) { if (await pg.evaluate(test)) return true; if (VIDEO) await frame(null); else await skip(1 / FPS); } return false; };
    const only = (process.env.SCENES || 'arrive,fold,light,slack').split(',');
    const scene = function (name) { vi = 0; vdir = VIDEO ? path.join(out, 'v-' + name) : null; if (vdir) fs.mkdirSync(vdir, { recursive: true }); };
    /* ARRIVE: a ride on the Middle thread from its first house to the front, small Hush around where it lands */
    if (only.includes('arrive')) { scene('arrive');
    await pg.evaluate(function () {
      const S = LL.sim, W = S.W, p = W.player, end = S.zipEnd(0, 1), s0 = end - 58, s = end - 16, P = {}; LL.lanePoint(1, s, P);
      p.x = P.x; p.z = P.z; p.y = 0.4; p.zip = { lane: 1, dir: 1, s: s, s0: s0 }; p.onGround = false; p.yaw = 0; window.FE.view(0, -0.12); p.ember = false;
      let k = 0; const zs = [[2, -1.5], [5, 1.5], [8, -0.5], [12, 1], [16, -1.2]]; const E = {}; LL.lanePoint(1, end, E);
      W.troopers.forEach(function (u) { if (u.alive && u.team === 1 && !u.big && k < zs.length && Math.abs(u.z - E.z) > 30) { window.FE.put(u, 1, E.z + zs[k][0], zs[k][1]); k++; } });
      window.FE.arr0 = p.arrivals || 0;
    });
    await until(function () { return (LL.sim.W.player.arrivals || 0) > window.FE.arr0 || !LL.sim.W.player.zip; }, 6);
    await run(1.5, { 2: 'arrive', 8: 'arrive-run' }); }
    /* FOLD: the west crease folds the West thread away; four small Hush and a hollow are already inside its band */
    if (only.includes('fold')) { scene('fold');
    await pg.evaluate(function () {
      const S = LL.sim, W = S.W, p = W.player, c = W.creases[0]; c.guard.alive = false; c.cd = 0; c.t = 0;
      p.x = c.x; p.z = c.z; p.y = 0; p.zip = null; p.yaw = Math.PI / 2; LL.dbg.view.yaw = Math.PI / 2; S.fold(p, 0); const lane = c.from;
      W.fx.forEach(function (e) { LL.gfx.fx(e); LL.ui.fx(e); }); W.fx.length = 0;
      const q = window.FE.lanePt(lane, -7); p.x = q.x - 4.6; p.z = q.z; p.yaw = 0.24; window.FE.view(0.24, -0.08);
      W.troopers.forEach(function (u) { if (u.alive && u.lane === lane && u.z > -16 && u.z < 16 && u.team === 0) u.alive = false; });
      let k = 0; const zs = [1.5, 3.5, 6, 8]; W.troopers.forEach(function (u) { if (u.alive && u.team === 1 && !u.big && k < zs.length && Math.abs(u.z) > 16) { window.FE.put(u, lane, zs[k], (k % 2 ? 1 : -1) * 1.2); k++; } });
      S._t.spawnHollow(lane); const h = W.troopers[W.troopers.length - 1]; window.FE.put(h, lane, 5, 2.4);
      return lane;
    });
    await run(3, { 26: 'fold' }); }
    /* LIGHT: home, mended by the fountain until a light is taken, then the walk to the Middle thread's first house */
    if (only.includes('light')) { scene('light');
    await pg.evaluate(function () { const W = LL.sim.W, p = W.player, sp = LL.sim.spawnPos(0, p.slot); p.x = sp.x; p.z = sp.z; p.y = 0; p.zip = null; p.ember = false; p.mendAcc = 0; p.hp = p.maxHp * 0.45; window.FE.noKeep = true; window.FE.view(0, -0.05); });
    await until(function () { return LL.sim.W.player.ember; }, 12);
    await pg.evaluate(function (back) { const W = LL.sim.W, p = W.player, s = W.st[0][1].outer; s.hp = s.maxHp * 0.55; s.dark = false; s.brightT = 0; p.x = s.x + 1.6; p.z = s.z - back; p.yaw = 0; window.FE.noKeep = false; p.hp = p.maxHp; window.FE.view(0, -0.03); }, VIDEO ? 26 : 17);
    if (VIDEO) { await pg.keyboard.down('KeyW'); await run(1.0, { 18: 'light-carry' }); await until(function () { return LL.sim.W.st[0][1].outer.brightT > 0; }, 6); await pg.keyboard.up('KeyW'); }
    else { await run(0.3, { 5: 'light-carry' }); await pg.evaluate(function () { const p = LL.sim.W.player, s = LL.sim.W.st[0][1].outer; p.z = s.z - 10.5; }); await until(function () { return LL.sim.W.st[0][1].outer.brightT > 0; }, 3); }
    await run(1.6, { 4: 'light-mend', 30: 'light-bright' }); }
    /* SLACK: the Middle thread made the most worn, its warning, slack, and the end */
    if (only.includes('slack')) { scene('slack');
    await pg.evaluate(function () {
      const S = LL.sim, W = S.W, K = W.slack, p = W.player; W.structs.forEach(function (s) { if (s.alive && s.kind !== 'patron') s.hp = s.maxHp; s.dark = false; s.brightT = 0; });
      W.st[0][1].outer.hp *= 0.75; W.st[1][1].outer.hp *= 0.75; window.FE.floor = [W.st[0][1].outer, W.st[1][1].outer, W.st[0][1].inner, W.st[1][1].inner]; K.t = 0; K.warned = false; K.next = W.t + LL.C.SLACK.warn + 0.2;
      const q = window.FE.lanePt(1, -46); p.x = q.x + 1.6; p.z = q.z; p.y = 0; p.zip = null; p.yaw = 0; window.FE.view(0, -0.07);
      window.FE.skip(K.next - 4);
    });
    await run(1.2, { 22: 'slack-warn' });
    await pg.evaluate(function () { const K = LL.sim.W.slack; if (!(K.t > 0)) window.FE.skip(K.next + 0.5); });
    await pg.evaluate(function () { const W = LL.sim.W; window.FE.skip(W.t + 3); });
    await run(1.6, { 28: 'slack' });
    await pg.evaluate(function () { const K = LL.sim.W.slack; if (K.t > 0) K.t = 0.05; });
    await run(1.4, { 8: 'slack-end' }); }
    console.log(look, TAG, errs.length ? errs.slice(0, 5).join(' | ') : 'no script errors');
    await ctx.close();
  }
  await b.close(); srv.close();
})().catch(function (e) { console.error(e); process.exit(1); });
