// Evidence pass for handoff issue #3 (the "Gale" list). Run: node tools/evidence.js
// Drives the real page in headless Chrome and saves frames to docs/evidence/. Needs playwright and a Chrome binary.
// What this proves: the page renders these things. What it cannot prove: how anything sounds or feels to a person.
const fs = require('fs'), http = require('http'), path = require('path');
let chromium; try { chromium = require('playwright').chromium; } catch (e) { chromium = require('/opt/npm-tools/node_modules/playwright').chromium; }
const root = path.join(__dirname, '..'), out = path.join(root, 'docs', 'evidence'), three = process.env.THREE_JS || '/tmp/t/node_modules/three/build/three.min.js';
const mime = { '.js': 'text/javascript', '.jpg': 'image/jpeg', '.html': 'text/html' };
const srv = http.createServer((q, r) => { const u = q.url.split('?')[0], p = path.join(root, u === '/' ? 'index.html' : u); fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': mime[path.extname(p)] || 'application/octet-stream' }); r.end(d); } }); }).listen(8766);
const report = [];
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  for (const dev of ['desktop', 'phone']) {
    const ctx = await b.newContext(dev === 'phone' ? { viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 } : { viewport: { width: 1280, height: 720 } });
    const pg = await ctx.newPage(); const errs = [];
    pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|Failed to load resource/.test(m.text())) errs.push(m.text()); });
    await pg.route('**/*', rt => { const u = rt.request().url(); if (u.includes('three.min.js')) return rt.fulfill({ path: three, contentType: 'text/javascript' }); if (u.startsWith('http://localhost')) return rt.continue(); return rt.abort(); });
    const shot = async (name, note) => { const f = dev + '-' + name + '.jpg'; await pg.screenshot({ path: path.join(out, f), type: 'jpeg', quality: 82 }); report.push(f + ' | ' + note); };
    const tap = async (sel) => { if (dev === 'phone') await pg.tap(sel); else await pg.click(sel); };
    const start = async (hero) => { await pg.goto('http://localhost:8766/'); await pg.waitForTimeout(1200); await pg.evaluate(h => document.querySelectorAll('#heroes .hero')[h].click(), hero); await tap('#bPlay'); await pg.waitForTimeout(900); await pg.evaluate(() => { LL.input.lockFailed = true; window.__keep = setInterval(() => { const W = LL.sim.W; if (!W) return; W.heroes.forEach(h => { h.hp = h.maxHp; }); W.patron.forEach(p => { p.hp = p.maxHp; }); W.thiefT = 1e9; }, 50); }); };
    const look = async (k) => { await pg.evaluate(k => { if (LL.cfg.look !== k) document.querySelector('#looks2 [data-look="' + k + '"]').click(); }, k); await pg.waitForTimeout(700); };

    // 1. every Hush type in one frame
    await start(0);
    await pg.evaluate(() => { const S = LL.sim, W = S.W, p = W.player; for (let i = 0; i < 900; i++) S.step(1 / 30); W.fx.length = 0; W.red = 0;
      W.troopers.forEach(u => { if (Math.abs(u.z) < 40) u.alive = false; }); p.x = 0; p.z = -8; p.y = 0; p.zip = null; LL.dbg.view.yaw = 0; LL.dbg.view.pitch = -0.05;
      S._t.spawnHollow(1, true); const hol = W.troopers[W.troopers.length - 1]; hol.x = 2.6; hol.z = 2; hol.s = LL.lanes[1].len / 2 + 2; hol.speed = 0; hol.dmg = 0;
      let k = 0; W.troopers.forEach(u => { if (u.alive && u.team === 1 && !u.big && k < 3) { u.x = -4 + k * 1.6; u.z = 1 + k * 0.6; u.s = LL.lanes[1].len / 2 + 1; u.speed = 0; u.dmg = 0; u.lat = -4 + k * 1.6; k++; } });
      S._t.spawnThief(); const t = W.thieves[W.thieves.length - 1]; t.x = -1.2; t.z = -2.5; t.speed = 0; t.mark = W.st[0][1].outer; window.__thief = t; window.__hushSeen = { hollow: !!hol.alive, troopers: k, thief: !!t.alive }; });
    await pg.waitForTimeout(700);
    const seen = await pg.evaluate(() => window.__hushSeen);
    await shot('hush-types-snow', 'hollow, ' + seen.troopers + ' hush troopers and a thief placed in front of the player, Cobalt Snow look');
    await look('ink'); await shot('hush-types-ink', 'same placement in the Inkblot look; thief route cue should point at the guardian it is after');
    await look('snow');

    // 2. thief outcomes: light taken, light returned on capture, 120 s dark and 25% health lost when it gets home
    const r2 = await pg.evaluate(async () => { const S = LL.sim, W = S.W, p = W.player, g = W.st[0][1].outer, wait = ms => new Promise(r => setTimeout(r, ms));
      W.thieves.forEach(t => { t.alive = false; }); W.troopers.forEach(u => { if (u.team === 1) u.alive = false; }); p.x = 0; p.z = -41; LL.dbg.view.yaw = 0; LL.dbg.view.pitch = 0.05; g.hp = g.maxHp;
      S._t.spawnThief(); const t = W.thieves[W.thieves.length - 1]; t.mark = g; t.x = g.x + 4; t.z = g.z; t.speed = 8.4; await wait(900); t.speed = 1.2; t.hp = t.maxHp = 1e6; window.__t = t; return { dark: g.dark, carrying: t.carry === g }; });
    await pg.waitForTimeout(900); await shot('light-taken', 'guardian dark=' + r2.dark + ', thief carrying=' + r2.carrying + ' (model values at capture time)');
    await look('ink'); await shot('light-taken-ink', 'Inkblot look: violet ring on the dark guardian, copper route from thief to gate'); await look('snow');
    const r3 = await pg.evaluate(async () => { const S = LL.sim, W = S.W, g = W.st[0][1].outer, t = window.__t, wait = ms => new Promise(r => setTimeout(r, ms)); const hp = g.hp; S._t.damage(t, 1e9, W.player, 'gun'); await wait(500); return { dark: g.dark, hpSame: g.hp === hp }; });
    await shot('light-returned', 'after capture: guardian dark=' + r3.dark + ', health unchanged=' + r3.hpSame);
    const r4 = await pg.evaluate(async () => { const S = LL.sim, W = S.W, g = W.st[0][1].outer, wait = ms => new Promise(r => setTimeout(r, ms)); g.hp = g.maxHp;
      S._t.spawnThief(); const t = W.thieves[W.thieves.length - 1]; t.mark = g; t.x = g.x + 4; t.z = g.z; await wait(900); const hp0 = g.hp; t.x = 0; t.z = LL.C.PATRON_Z - 7; await wait(600); return { dark: g.dark, darkT: Math.round(g.darkT), lost: Math.round((hp0 - g.hp) / g.maxHp * 100) }; });
    await shot('guardian-dark-120', 'thief got home: guardian dark=' + r4.dark + ', dark timer ' + r4.darkT + ' s, health lost ' + r4.lost + '%');

    // 3. Myra Belle and the Skein Doll, facing the camera, with an ability each
    let cast = null;
    for (let tries = 0; tries < 10 && !cast; tries++) { await start(1); cast = await pg.evaluate(() => { const W = LL.sim.W, m = W.heroes.find(h => h.def.id === 'myra' && !h.isPlayer), s = W.heroes.find(h => h.def.id === 'skein' && !h.isPlayer); return m && s ? true : null; }); }
    if (cast) {
      await pg.evaluate(() => { const W = LL.sim.W, p = W.player, m = W.heroes.find(h => h.def.id === 'myra'), s = W.heroes.find(h => h.def.id === 'skein'); p.x = 0; p.z = -60; LL.dbg.view.yaw = 0; LL.dbg.view.pitch = 0;
        [[m, 1.7], [s, -1.7]].forEach(q => { const h = q[0]; h.useAI = false; h.x = q[1]; h.z = -56.5; h.vx = h.vz = 0; h.ctl.mx = h.ctl.mz = 0; h.ctl.fire = false; h.ctl.ax = q[1]; h.ctl.ay = 1.5; h.ctl.az = -90; h.level = 3; });
        window.__pin = setInterval(() => { [[m, 1.7], [s, -1.7]].forEach(q => { q[0].x = q[1]; q[0].z = -56.5; }); p.x = 0; p.z = -60; }, 30); });
      await pg.waitForTimeout(700); await shot('myra-and-skein', 'Myra Belle (left of frame or right, purple, round) and the Skein Doll (copper braids, mint cardigan) facing the camera');
      await pg.evaluate(() => { const W = LL.sim.W, m = W.heroes.find(h => h.def.id === 'myra'), s = W.heroes.find(h => h.def.id === 'skein'); m.cds[1] = 0; m.ctl.ab[1] = true; s.cds[2] = 0; s.ctl.ab[2] = true; });
      await pg.waitForTimeout(900); await shot('myra-mending-skein-knot', 'Myra casts Mending (heal circle), the Skein Doll ties a Knot (turret)');
    } else report.push(dev + '-myra-and-skein: NOT CAPTURED, both heroes never rolled as allies in 10 tries');

    // 4. audio: measured, not heard. Each event is rendered offline with no background drone.
    if (dev === 'desktop') {
      const au = await pg.evaluate(async () => { const A = LL.audio, W = LL.sim.W, g = W.st[0][1].outer, cam = { x: g.x, z: g.z }, rows = [];
        const evs = [['theft from the player', { k: 'theft', p: true, u: W.player, amt: 180 }], ['guardian blackout (snuff)', { k: 'snuff', u: g }], ['red rain warning', { k: 'redwarn' }], ['red rain start', { k: 'red' }], ['thief home with a light', { k: 'thiefhome', carry: g, vp: true }], ['thief caught', { k: 'thiefdown', p: true, vp: true, x: g.x, z: g.z }], ['guardian relit', { k: 'relit', u: g }], ['fold', { k: 'fold', p: true, x: 0, z: 0 }], ['hollow slam nearby', { k: 'slam', x: g.x, z: g.z }], ['control: unknown event', { k: 'nothing-at-all' }]];
        for (const e of evs) { const r = await A.offline(e[1], W, cam, 4.5); rows.push([e[0], r]); }
        return { live: A.on, rows: rows }; });
      const lines = ['Audio signal measurement. Each event is rendered through the game\'s own synth in an OfflineAudioContext, with no drone,', 'and the rendered samples are measured. Full scale is 1.0. This shows an event makes sound and roughly how loud and how long.', 'It does not show what it sounds like. Nobody has listened to it.', 'Live AudioContext started in this run: ' + au.live, ''];
      au.rows.forEach(r => lines.push(r[0].padEnd(28) + (r[1] ? ' peak ' + r[1].peak.toFixed(3) + '  rms ' + r[1].rms.toFixed(4) + '  audible for ' + r[1].seconds.toFixed(2) + ' s' + (r[1].threw ? '  THREW ' + r[1].threw : '') + (r[1].peak < 0.01 ? '  SILENT' : '') : ' no OfflineAudioContext')));
      fs.writeFileSync(path.join(out, 'audio-signal.txt'), lines.join('\n') + '\n'); report.push('audio-signal.txt | ' + au.rows.map(r => r[0] + ' peak ' + (r[1] ? r[1].peak.toFixed(3) : 'n/a')).join('; '));
    }
    report.push(dev + ' script errors: ' + (errs.length ? errs.slice(0, 5).join(' / ') : 'none'));
    await ctx.close();
  }
  fs.writeFileSync(path.join(out, 'capture-log.txt'), report.join('\n') + '\n'); console.log(report.join('\n'));
  await b.close(); srv.close();
})().catch(e => { console.error('EVIDENCE RUN FAILED', e); process.exit(1); });
