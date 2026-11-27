/* 0.29 look: the heroes from the play camera, the weak spots named in the 0.28 look report. The game loop is stopped and the
   real sim is stepped by hand (as tools/shots/look.js does), with a scripted player; every frame is drawn and saved.
   SCENE (comma list):
     act    the player, back to the camera: stand, walk, aim high and fire, fire level, the air (second jump and its guard,
            Myra's hover, Rook's Lantern Lift), the first two abilities, a landing, a long idle. SIDE=1 for side-on.
     faces  every hero 4.5 to 11 m in front of the player, facing the camera (one frame; same spots as look.js faces).
     walk   a short walk toward and away and a stand (for the paper fallback: PAPER=1).
     idle   a few steps, then standing four seconds, the camera a quarter round: the idle fidget comes in after two.
   Writes OUT/<scene>_###.png and OUT/<scene>.json (per frame: hero on screen [x, y of the head], state).
   Env: LL_ROOT, OUT, SCENE, HERO (0..4), SIDE, PAPER, LOW, LOOK, W/H (1280x720), PORT (8875-8879), N (act length), EVERY (save every n-th frame), KEEP (frames always saved). */
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs'), http = require('http'), path = require('path');
const root = process.env.LL_ROOT || process.cwd(), out = process.env.OUT || '/tmp/look29/x', W_ = +(process.env.W || 1280), H_ = +(process.env.H || 720), port = +(process.env.PORT || 8875), hero = +(process.env.HERO || 0);
const every = +(process.env.EVERY || 1), scenes = (process.env.SCENE || 'act').split(','), side = !!process.env.SIDE, paper = !!process.env.PAPER;
fs.mkdirSync(out, { recursive: true });
const types = { '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg' };
const srv = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; fs.readFile(path.join(root, u), (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': types[path.extname(u)] || 'application/octet-stream' }); r.end(d); } }); }).listen(port);
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await (await b.newContext({ viewport: { width: W_, height: H_ } })).newPage(); const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR: ' + e.message)); pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('CONSOLE: ' + m.text()); });
  await pg.route('**/*', rt => { const u = rt.request().url(); if (u.includes('three.min.js')) return rt.fulfill({ path: process.env.THREE_LOCAL || '/tmp/t/node_modules/three/build/three.min.js', contentType: 'text/javascript' }); if (u.startsWith('http://localhost')) return rt.continue(); return rt.abort(); });
  await pg.goto('http://localhost:' + port + '/'); await pg.waitForTimeout(2000);
  await pg.evaluate((i) => { LL.cfg.mode = 'match'; LL.cfg.pet = false; document.querySelectorAll('.hero')[i].click(); }, hero);
  if (process.env.LOOK) await pg.evaluate((l) => { LL.cfg.look = l; document.body.setAttribute('data-look', l); LL.gfx.setLook(l); }, process.env.LOOK);
  await pg.click('#bPlay'); await pg.waitForTimeout(3500);
  await pg.evaluate((o) => { window.requestAnimationFrame = () => 0; if (LL.face && LL.face.plain) LL.face.plain(); document.getElementById('hud').hidden = true; const gl = document.getElementById('gl'); document.querySelectorAll('body > *').forEach(e => { if (!e.contains(gl)) e.style.visibility = 'hidden'; });
    const W = LL.sim.W, p = W.player; p.useAI = false; W.waveT = 1e9; W.thiefT = 1e9; W.hollowT = [1e9, 1e9, 1e9]; W.troopers.forEach(u => { u.alive = false; }); W.projs.length = 0; if (W.ness) { W.ness.respT = 1e9; W.ness.alive = false; W.ness.rise = 0; }
    W.heroes.forEach((h, i) => { if (h !== p) { h.useAI = false; h.x = (i ? 1 : -1) * 60; h.z = -120; h.ctl.mx = h.ctl.mz = 0; } });
    if (o.low) LL.gfx.setQuality(true);
    if (o.paper) LL.gfx.setHeroes3d(false);
    window.__head = (h) => { const q = {}; LL.gfx.project(h.x, h.y + 1.3, h.z, q); return [Math.round(q.x), Math.round(q.y)]; };
  }, { paper: paper, low: !!process.env.LOW });
  if (paper) await pg.waitForTimeout(1500); // the painted sheet loads
  for (const sc of scenes) {
    if (sc === 'faces') {
      const info = await pg.evaluate(() => {
        const W = LL.sim.W, p = W.player, v = LL.dbg.view; let id = 9100;
        if (W.heroes.length < 5) { const have = W.heroes.map(h => h.defIdx); for (let k = 0; k < LL.HEROES.length; k++) if (have.indexOf(k) < 0) { const h0 = W.heroes.find(h => h !== p); const c = Object.assign({}, h0, { id: id++, def: LL.HEROES[k], defIdx: k, name: LL.HEROES[k].name, ctl: Object.assign({}, h0.ctl, { ab: [false, false, false] }), ai: Object.assign({}, h0.ai), hurtBy: {}, items: [] }); W.heroes.push(c); if (W.units) W.units.push(c); }
          LL.gfx.setHeroes3d(false); LL.gfx.setHeroes3d(true); }
        p.x = 0; p.z = -14; p.y = 0; p.vx = p.vz = p.vy = 0; p.onGround = true; p.yaw = 0; p.alive = true; p.hp = p.maxHp; v.mode = 'play'; v.target = p; v.yaw = 0; v.pitch = -0.08; v.zoom = 0;
        const others = W.heroes.filter(h => h !== p).sort((a, b) => a.defIdx - b.defIdx), spots = [[-2.6, 5], [2.6, 6], [-4.6, 9], [4.4, 10], [0.2, 13]];
        others.forEach((h, i) => { const s = spots[i]; h.alive = true; h.x = s[0]; h.z = p.z + s[1]; h.y = 0; h.vx = h.vz = h.vy = 0; h.onGround = true; h.yaw = Math.PI; h.pitch = 0; h.ctl.mx = h.ctl.mz = 0; h.ctl.fire = false; });
        for (let k = 0; k < 20; k++) LL.gfx.frame(1 / 30, v);
        return others.map(h => ({ id: h.def.id, head: (function () { const q = {}; LL.gfx.project(h.x, h.y + 1.85, h.z, q); return [Math.round(q.x), Math.round(q.y)]; })() }));
      });
      await pg.screenshot({ path: out + '/faces_000.png' }); fs.writeFileSync(out + '/faces.json', JSON.stringify(info)); console.log('faces', JSON.stringify(info));
      continue;
    }
    const N = +(process.env.N || (sc === 'walk' ? 90 : (sc === 'idle' ? 125 : 230))), log = [];
    await pg.evaluate((o) => { const W = LL.sim.W, p = W.player, v = LL.dbg.view; p.alive = true; p.hp = p.maxHp; p.x = 0; p.z = -18; p.y = 0; p.vx = p.vy = p.vz = 0; p.onGround = true; p.jumps = 0; p.stamina = 3; p.yaw = 0; p.cds = [0, 0, 0]; p.liftT = 0; p.glide = false; p.tbN = 0; p.tbT = 0;
      v.mode = 'play'; v.target = p; v.yaw = o.side ? -Math.PI / 2 : (o.sc === 'idle' ? 0.75 : 0); v.pitch = -0.05; v.zoom = 0; W.fx.length = 0; for (let k = 0; k < 8; k++) LL.gfx.frame(1 / 30, v); }, { side: side, sc: sc });
    for (let k = 0; k < N; k++) {
      const row = await pg.evaluate((o) => {
        const W = LL.sim.W, S = LL.sim, p = W.player, ct = p.ctl, v = LL.dbg.view, dt = 1 / 30, k = o.k, id = p.def.id, ev = [];
        /* the script, by frame (30 a second) */
        let mz = 0, mx = 0, fire = false, pitchA = 0.05, jump = false, hold = false, ab = -1, beat = 'stand';
        if (o.sc === 'idle') { mz = k < 10 ? 0.6 : 0; beat = k < 10 ? 'walk' : (k < 70 ? 'stand' : 'fidget'); }
        else if (o.sc === 'walk') { mz = k < 30 ? 0.55 : (k < 60 ? -0.55 : 0); beat = k < 30 ? 'walk away' : (k < 60 ? 'walk back' : 'stand'); }
        else {
          if (k < 15) beat = 'stand';
          else if (k < 35) { beat = 'walk'; mz = 1; }
          else if (k < 60) { beat = 'aim high, fire'; fire = true; pitchA = 0.85; }
          else if (k < 80) { beat = 'fire level, strafe'; fire = true; pitchA = 0.12; mx = k < 70 ? 1 : -1; }
          else if (k < 130) { beat = 'air'; if (id === 'rook') { if (k === 82) ab = 1; mz = 0.6; } else { jump = k === 82 || (id !== 'myra' && k === 92); hold = id === 'myra' && k >= 82 && k < 122; } fire = k > 100 && k < 112; pitchA = 0.3; }
          else if (k < 160) { beat = 'ability 1'; if (k === 132) ab = 0; fire = k > 140; pitchA = 0.2; }
          else if (k < 190) { beat = 'ability 2'; if (k === 162 && id !== 'rook' && id !== 'dora' && id !== 'skein') ab = 1; if (k === 162 && (id === 'dora' || id === 'skein')) ab = 0; }
          else beat = 'idle';
        }
        for (let s = 0; s < 2; s++) {
          ct.mx = mx; ct.mz = mz; const cp = {}; LL.gfx.camPose(p, 0, pitchA, 0, cp);
          const aim = {}; S.aimPoint(cp.x, cp.y, cp.z, cp.dx, cp.dy, cp.dz, cp.dist + 0.4, p.team, aim); ct.ax = aim.x; ct.ay = aim.y; ct.az = aim.z; ct.jumpHeld = hold; ct.fire = fire; ct.ab = [false, false, false];
          if (s === 0) { if (jump) ct.jump = true; if (ab >= 0) { ct.ab[ab] = true; p.cds[ab] = 0; } }
          p.stamina = 3; if (p.ammo != null && p.ammo < 2) p.ammo = 20;
          W.structs.forEach(q => { q.atkT = 1e9; }); S.step(dt / 2);
          for (const e of W.fx) { LL.gfx.fx(e); if (e.u === p && /^(jump|land|lift|hover|cast|guard)/.test(e.k)) ev.push(e.k); } W.fx.length = 0;
        }
        LL.gfx.frame(dt, v);
        return { k: k, beat: beat, y: +p.y.toFixed(2), head: window.__head(p), guard: p.guardK || '', hov: +(p.hoverT || 0).toFixed(2), ev: ev };
      }, { k: k, sc: sc });
      log.push(row); if (k % every === 0 || (process.env.KEEP || '').split(',').indexOf(String(k)) >= 0) await pg.screenshot({ path: out + '/' + sc + '_' + String(k).padStart(3, '0') + '.png' });
    }
    fs.writeFileSync(out + '/' + sc + '.json', JSON.stringify(log));
    console.log(sc, log.filter(r => r.ev.length).map(r => r.k + ':' + r.ev.join('+')).join(' '));
  }
  console.log(errs.length ? errs.join('\n') : 'no page errors'); await b.close(); srv.close();
})().catch(e => { console.error('RUNFAIL', e); process.exit(1); });
