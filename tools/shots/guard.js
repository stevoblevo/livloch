/* 0.26 guard: the guards, thread boosts, Dora's hat, Myra Belle's boon and Rook's barrel roll from the play camera behind the
   hero, driven by the real sim. The game loop is stopped; each frame this script sets the player's controls (as a hand
   would), steps LL.sim twice at 1/60 s, hands the events to the renderer, and draws once. Shooters are Hush small ones made
   from a hollow (LL.sim._t.spawnHollow) and stood on the Middle thread; they shoot at the hero through the sim's own
   trooperStep (tracer and damage), but only on the frames a plan says (atkT is held high otherwise), so each picture shows
   a shot meeting the guard. Waves, thieves and hollows are off, the structures hold their fire and the other heroes are
   parked, so nothing else is in the way.
   Segments (SEGS, comma list; default: all of the hero's):
     guard  standing on the thread, shooters 12 m ahead fire; a jump, the second jump, more shots (and for Anna a hollow
            walks in and slams into the shield, and a shot from behind lands)
     boost  running along the Middle thread; a jump, then a second jump (or Myra's hover) over it: the thread boost
     hat    (Dora) three boosted second jumps charge the hat; then it is thrown through three small ones and comes home
     boon   (Myra) a boosted hover along the thread with an ally beside her at half health; it ends on the thread
     roll   (Rook) Lantern Lift along the thread, shooters fire, a dash to his right: the barrel roll, the shots miss
   Writes OUT/f###.png, OUT/log.json (per frame: segment, height, guard, events) and OUT/seg.json.
   Env: LL_ROOT, HERO (0 Dora, 1 Anna, 2 Myra, 3 Skye, 4 Rook), OUT, W/H (640x400), PORT (8860-8869), LOOK, HUD=1 (the HUD on,
   fed the events and drawn each frame: the hat's pips, the boon's numbers), ZOOM,
   REDUCED=1, LOW=1 (Lighter graphics), CAM (the camera's yaw about the hero, radians: 0 behind, 1.57 her left side, 3.14 in front), DMG (the shooters' damage, default 18; Dora's guard run uses 55 so the bubble fills and pops). */
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs'), http = require('http'), path = require('path');
const root = process.env.LL_ROOT || process.cwd(), out = process.env.OUT || '/tmp/guard', W_ = +(process.env.W || 640), H_ = +(process.env.H || 400), port = +(process.env.PORT || 8861), hero = +(process.env.HERO || 0);
fs.mkdirSync(out, { recursive: true });
const types = { '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg' };
const srv = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; fs.readFile(path.join(root, u), (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': types[path.extname(u)] || 'application/octet-stream' }); r.end(d); } }); }).listen(port);
/* a plan: [segment, frames, setup, per-frame f(k) -> controls]. Controls: mz/mx (stick, in the camera's frame), jump, hold,
   hat, dash, lift, fire (shooter indices that fire this frame), back (a shooter behind fires). */
const PLANS = {
  guard: { N: 96, at: [0, -2], shooters: [[-0.6, 10], [0.7, 11], [0, 12.5]], hollow: true,
    f: (k, id) => ({ jump: k === 14 || (id === 'anna' && k === 62), dbl: k === 22 || (id === 'anna' && k === 70), fire: (k === 6 ? [0] : []).concat(k >= 24 && k <= 46 && k % 5 === 0 ? [k % 3] : []), back: id === 'anna' && k === 34, slam: id === 'anna' && k === 75, hold: false }) },
  boost: { N: 70, at: [0, -18], f: (k, id) => ({ mz: 1, jump: k === 16, dbl: id !== 'myra' && k === 25, hold: id === 'myra' && k >= 16 && k < 60 }) },
  hat: { N: 200, at: [-48, -24], shooters: [[0.4, 3.5], [-0.5, 7.5], [0.3, 11.5]], frozen: true, late: true,
    f: (k) => k < 140 ? { mz: 1, jump: k === 4 || k === 48 || k === 92, dbl: k === 13 || k === 57 || k === 101 } : { stage: k === 140, hat: k === 152 } },
  boon: { N: 96, at: [0, -18], ally: true, f: (k) => ({ mz: 1, jump: k === 16, hold: k >= 16 && k < 70 }) },
  roll: { N: 120, at: [0, -6], shooters: [[-0.6, 14], [0.7, 15], [0, 16.5]], f: (k) => ({ mz: k > 6 && k < 80 ? 0.6 : 0, lift: k === 8, dash: k === 34, mx: k >= 34 && k < 40 ? -1 : 0, fire: k >= 30 && k <= 46 && k % 4 === 2 ? [k % 3] : [] }) }
};
const BY = { dora: ['guard', 'boost', 'hat'], anna: ['guard', 'boost'], myra: ['boost', 'boon'], skein: ['guard', 'boost'], rook: ['roll'] };
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await (await b.newContext({ viewport: { width: W_, height: H_ } })).newPage(); const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR: ' + e.message)); pg.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()); });
  await pg.route('**/*', rt => { const u = rt.request().url(); if (u.includes('three.min.js')) return rt.fulfill({ path: '/tmp/t/node_modules/three/build/three.min.js', contentType: 'text/javascript' }); if (u.startsWith('http://localhost')) return rt.continue(); return rt.abort(); });
  await pg.goto('http://localhost:' + port + '/'); await pg.waitForTimeout(2000);
  await pg.evaluate((i) => { LL.cfg.mode = 'match'; document.querySelectorAll('.hero')[i].click(); }, hero);
  if (process.env.LOOK) await pg.evaluate((l) => { LL.cfg.look = l; document.body.setAttribute('data-look', l); LL.gfx.setLook(l); }, process.env.LOOK);
  await pg.click('#bPlay'); await pg.waitForTimeout(3500);
  const id = await pg.evaluate((o) => { window.requestAnimationFrame = () => 0; if (!o.hud) document.getElementById('hud').hidden = true; else ['banner', 'quest', 'feed', 'coach'].forEach(n => { const el = document.getElementById(n); if (el) el.style.display = 'none'; }); if (o.red) LL.gfx.reduced = true; if (o.low && LL.gfx.setQuality) LL.gfx.setQuality(true);
    const W = LL.sim.W, p = W.player; p.useAI = false; W.waveT = 1e9; W.thiefT = 1e9; W.hollowT = [1e9, 1e9, 1e9]; W.troopers.forEach(u => { u.alive = false; }); W.projs.length = 0;
    W.heroes.forEach((h, i) => { if (h !== p) { h.useAI = false; h.x = (i ? 1 : -1) * 60; h.z = -120; h.ctl.mx = h.ctl.mz = 0; } });
    const v = LL.dbg.view; v.yaw = 0; v.pitch = -0.1; v.zoom = o.zoom; return p.def.id; }, { hud: !!process.env.HUD, red: !!process.env.REDUCED, low: !!process.env.LOW, zoom: +(process.env.ZOOM || 0) });
  const segs = process.env.SEGS ? process.env.SEGS.split(',') : BY[id], log = [], seg = []; let shot = 0;
  for (const name of segs) {
    const P = PLANS[name], dmg = +(process.env.DMG || (id === 'dora' && name === 'guard' ? 55 : 18)), first = shot;
    await pg.evaluate((o) => { // stage the segment
      const W = LL.sim.W, S = LL.sim, p = W.player, L = LL.lanes[1].len / 2; W.troopers.forEach(u => { u.alive = false; }); W.projs.length = 0;
      p.alive = true; p.hp = p.maxHp; p.x = o.at[0]; p.z = o.at[1]; p.y = 0; p.vx = p.vy = p.vz = 0; p.onGround = true; p.jumps = 0; p.stamina = 3; p.yaw = 0; p.level = 3; p.cds = [0, 0, 0]; p.liftT = 0; p.glide = false;
      p.guardT = 0; p.guardK = ''; p.hat = null; p.hatN = 0; p.tbN = 0; p.tbT = 0; p.rollT = 0;
      const mkFoe = (x, z, big) => { S._t.spawnHollow(1); const u = W.troopers[W.troopers.length - 1]; Object.assign(u, { x: x, z: z, s: L + z, lat: x, big: !!big, r: big ? 1.15 : 0.7, h: big ? 3.2 : 1.7, hp: 9000, maxHp: 9000, speed: 0, atkT: 99, ranged: !big, range: big ? 3.2 : 15, dmg: o.dmg, rate: 99, tgt: null, tgtT: 0 }); return u; };
      W.gsMk = mkFoe; W.gs = o.late ? [] : (o.shooters || []).map(q => mkFoe(o.at[0] + q[0], o.at[1] + q[1])); W.gsBack = o.id === 'anna' && o.name === 'guard' ? mkFoe(o.at[0] + 0.8, o.at[1] - 9) : null;
      W.gsHollow = o.hollow && o.id === 'anna' ? mkFoe(o.at[0] + 0.3, o.at[1] + 14, true) : null;
      W.gs.concat(W.gsBack ? [W.gsBack] : [], W.gsHollow ? [W.gsHollow] : []).forEach(u => { if (!o.late) { u.tgt = p; u.tgtT = 1e9; } });
      W.gsAlly = null; if (o.ally) { const a = W.heroes.find(h => h !== p); a.alive = true; a.x = p.x + 2.6; a.z = p.z + 2.2; a.hp = a.maxHp * 0.5; a.yaw = 0; W.gsAlly = a; }
      W.fx.length = 0; const v = LL.dbg.view; v.yaw = o.cam; for (let k = 0; k < 8; k++) LL.gfx.frame(1 / 30, v);
    }, { cam: +(process.env.CAM || 0), at: P.at, shooters: P.shooters, hollow: P.hollow, ally: P.ally, late: P.late, id: id, name: name, dmg: dmg });
    for (let k = 0; k < P.N; k++) {
      const c = P.f(k, id);
      const row = await pg.evaluate((o) => {
        const W = LL.sim.W, S = LL.sim, p = W.player, ct = p.ctl, v = LL.dbg.view, dt = 1 / 30, ev = [];
        if (o.c.stage) { p.x = 0; p.z = -2; p.y = 0; p.vx = p.vy = p.vz = 0; p.onGround = true; W.gs = [[0.4, 3.5], [-0.5, 7.5], [0.3, 11.5]].map(q => { const u = W.gsMk(q[0], -2 + q[1]); u.tgt = null; u.tgtT = 1e9; return u; }); W.fx.length = 0; v.yaw = 0.42; } // the hat's three, stood up for the throw; the camera a little to her right so her body does not hide them
        (o.c.fire || []).forEach(i => { const u = W.gs[i]; if (u && u.alive) { u.atkT = 0; u.rate = 99; } });
        if (o.c.back && W.gsBack) { W.gsBack.atkT = 0; W.gsBack.rate = 99; }
        if (W.gsHollow) { const hl = W.gsHollow; if (o.k >= 40 && o.k < 76 && hl.z - p.z > 2.4) { hl.x = p.x + 0.3; hl.z -= 0.36; hl.s = LL.lanes[1].len / 2 + hl.z; hl.vz = -9; } else hl.vz = 0; if (o.c.slam) { hl.atkT = 0; hl.rate = 99; } }
        for (let s = 0; s < 2; s++) {
          ct.mx = (o.c.mx || 0); ct.mz = (o.c.mz || 0); ct.ax = p.x; ct.az = p.z + 30; ct.ay = p.y + 1.4; ct.jumpHeld = !!o.c.hold; ct.fire = false;
          if (s === 0) { if (o.c.jump || o.c.dbl) ct.jump = true; if (o.c.hat) ct.hat = true; if (o.c.dash) ct.dash = true; if (o.c.lift) ct.ab[1] = true; }
          if (W.gsAlly) { const a = W.gsAlly; a.x = p.x + 2.6; a.z = p.z + 2.2; a.vx = p.vx; a.vz = p.vz; a.yaw = 0; a.onGround = true; a.y = 0; }
          p.hp = Math.max(p.hp, p.maxHp * 0.5); W.patron.forEach(q => { q.hp = q.maxHp; }); W.structs.forEach(q => { q.atkT = 1e9; }); S.step(dt / 2);
          for (const e of W.fx) { try { LL.gfx.fx(e); if (o.hud) LL.ui.fx(e); } catch (er) { ev.push('FXERR ' + e.k + ' ' + er.message); } if ((e.u === p || e.k === 'boon') && /^(jump|guard|guarded|guardend|tboost|hat|boon|roll|hover)/.test(e.k)) ev.push(e.k + (e.dbl ? ':dbl' : '') + (e.how ? ':' + e.how : '') + (e.why ? ':' + e.why : '') + (e.kind && e.k !== 'guarded' ? ':' + e.kind : '')); if (e.k === 'hit' && e.p === 2) ev.push('hurt:' + Math.round(e.amt)); } W.fx.length = 0;
        }
        LL.gfx.frame(dt, v); if (o.hud) LL.ui.frame(dt, W, v, { hot: false, orb: false, canZip: false, canFold: false });
        return { y: +p.y.toFixed(2), gk: p.guardT > 0 ? p.guardK : '', gt: +(p.guardT || 0).toFixed(2), hp: Math.round(p.hp), hatN: p.hatN, hat: !!p.hat, roll: +(p.rollT || 0).toFixed(2), ally: W.gsAlly ? Math.round(W.gsAlly.hp) : null, ev: ev };
      }, { c: c, k: k, late: !!P.late, hud: !!process.env.HUD });
      row.seg = name; row.f = shot; log.push(row); await pg.screenshot({ path: out + '/f' + String(shot).padStart(3, '0') + '.png' }); shot++;
    }
    seg.push({ name: name, from: first, to: shot - 1 });
  }
  fs.writeFileSync(out + '/log.json', JSON.stringify(log)); fs.writeFileSync(out + '/seg.json', JSON.stringify(seg));
  console.log(id, log.filter(r => r.ev.length).map(r => r.f + ':' + r.ev.join('+')).join(' '));
  console.log(errs.length ? errs.join('\n') : 'no page errors'); await b.close(); srv.close();
})().catch(e => { console.error('RUNFAIL', e); process.exit(1); });
