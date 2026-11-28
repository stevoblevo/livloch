/* 0.30 feel: where the banner sits against the play. In a real match (Lighter graphics, SwiftShader), the player at
   home facing out with the base house ahead, the wave-2 banner ("Troopers drop souls.") shown with a busy feed, on a
   desktop (1280x720 and 960x540), a phone in portrait (390x844) and on its side (844x390), touch layout on phones.
   Measures the banner's box against: the play centre (the middle of the frame, 30-70 % across, 35-80 % down; PROJ=1
   adds the hero and the houses within 45 m projected with the game's camera, but those boxes land off the drawn
   figures, so they are off by default: judge hero and houses from the frame), and the HUD (score,
   feed, objective, map, health, lanterns; one faded to nothing does not count). Writes OUT/feel-0.30-banner-<view>-<TAG>.jpg with the boxes drawn and
   prints the overlaps (px^2). Env: ROOT, JS_FROM (serve js/ from another checkout: a before's CSS with
   this checkout's tool hook R._cam), TAG (after|before), PORT (8871), OUT (/tmp/feel30b). */
'use strict';
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/npm-tools/node_modules/playwright');
const fs = require('fs'), http = require('http'), path = require('path');
const root = process.env.ROOT || path.join(__dirname, '..', '..'), port = +(process.env.PORT || 8871), out = process.env.OUT || '/tmp/feel30b', TAG = process.env.TAG || 'after';
fs.mkdirSync(out, { recursive: true });
const types = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
const srv = http.createServer(function (q, r) { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; const f = path.join(process.env.JS_FROM && u.startsWith('/js/') ? process.env.JS_FROM : root, path.normalize(u)); fs.readFile(f, function (e, d) { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); r.end(d); } }); }).listen(port);
const VIEWS = [['desktop', 1280, 720, false], ['desktop-small', 960, 540, false], ['phone-portrait', 390, 844, true], ['phone-landscape', 844, 390, true]];
(async function () {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const [name, w, h, touch] of VIEWS) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch, deviceScaleFactor: 1 }), pg = await ctx.newPage(), errs = [];
    pg.on('pageerror', function (e) { errs.push(e.message); });
    await pg.route('**/*', function (rt) { const u = rt.request().url(); if (u.includes('three.min.js')) return rt.fulfill({ path: process.env.THREE_LOCAL || '/tmp/t/node_modules/three/build/three.min.js', contentType: 'text/javascript' }); if (u.startsWith('http://localhost')) return rt.continue(); return rt.abort(); });
    await pg.addInitScript(function (o) { try { localStorage.setItem('livelock.v1', JSON.stringify(o)); } catch (e) {} }, { look: 'snow', v6: true, v17: true, coached: true, mode: 'match', hero: 0, low: true });
    await pg.goto('http://localhost:' + port + '/'); await pg.waitForTimeout(2500);
    if (process.env.JS_FROM) await pg.addStyleTag({ content: '#foldPtr { display: none; }' }); /* the older CSS does not hide this checkout's fold pointer */
    await pg.evaluate(function (t) { LL.input.lockFailed = true; LL.cfg.mode = 'match'; if (t) document.body.classList.add('touch'); }, touch);
    await pg.evaluate(function () { document.getElementById('bPlay').click(); }); await pg.waitForTimeout(3000);
    const r = await pg.evaluate(function (t) {
      const S = LL.sim, W = S.W, p = W.player; if (t) { document.body.classList.add('touch'); if (LL.input) LL.input.device = 'touch'; }
      W.paused = false; for (let k = 0; k < 30 * 40; k++) { S.step(1 / 30); W.fx.length = 0; W.patron.forEach(function (q) { q.hp = q.maxHp; }); p.hp = p.maxHp; }
      const sp = S.spawnPos(0, p.slot); p.x = sp.x; p.z = sp.z; p.y = 0; p.yaw = 0; p.zip = null; LL.dbg.view.yaw = 0; LL.dbg.view.pitch = -0.05; LL.dbg.view.zoom = 0;
      ['The crease has caught the small ones on the West thread', 'A <b>hollow</b> is pinned in the crease', 'Dora mended the Middle guardian', 'The <b>Middle</b> is slack'].forEach(function (s) { LL.ui.fx && 0; const f = document.getElementById('feed'), e = document.createElement('p'); e.innerHTML = s; f.appendChild(e); });
      const q = document.getElementById('quest'); if (q && q.hidden) { q.hidden = false; if (!q.textContent) q.innerHTML = '<small>Next</small> Shoot five of your own orbs'; }
      LL.ui.banner('Troopers drop souls.', 'Shoot the orb that floats up to secure the other half', 99); return true; }, touch);
    for (let k = 0; k < 12; k++) await pg.waitForTimeout(250);
    const m = await pg.evaluate(function (PROJ) {
      const W = LL.sim.W, cam = LL.gfx._cam(), T = window.THREE, v = new T.Vector3(), cw = innerWidth, ch = innerHeight; cam.updateMatrixWorld(); cam.matrixWorldInverse.copy(cam.matrixWorld).invert(); cam.updateProjectionMatrix();
      const proj = function (x, y, z) { v.set(x, y, z).project(cam); return { x: (v.x + 1) / 2 * cw, y: (1 - v.y) / 2 * ch, back: v.z > 1 }; };
      const box = function (pts) { const q = pts.filter(function (p) { return !p.back; }); if (!q.length) return null; const xs = q.map(function (p) { return p.x; }), ys = q.map(function (p) { return p.y; }); return { l: Math.max(0, Math.min.apply(0, xs)), t: Math.max(0, Math.min.apply(0, ys)), r: Math.min(cw, Math.max.apply(0, xs)), b: Math.min(ch, Math.max.apply(0, ys)) }; };
      const p = W.player, things = [];
      const hm = LL.gfx._heroes().find(function (q) { return q.unit === p; }); let hb = null;
      if (hm) { const bx = new T.Box3().setFromObject(hm), c = [bx.min, bx.max]; const pts = []; for (let i = 0; i < 8; i++) pts.push(proj(c[i & 1].x, c[(i >> 1) & 1].y, c[(i >> 2) & 1].z)); hb = box(pts); }
      if (hb && PROJ) things.push(['hero', hb]);
      const fx = Math.sin(cam.rotation.y + Math.PI), fz = Math.cos(cam.rotation.y + Math.PI);
      W.structs.forEach(function (s) { if (!s.alive) return; const dx = s.x - p.x, dz = s.z - p.z, d = Math.hypot(dx, dz); if (d > 45) return;
        const r = s.r || 3, hy = s.kind === 'warden' ? 9 : 6.5, bb = box([proj(s.x - r, 0, s.z), proj(s.x + r, 0, s.z), proj(s.x, hy, s.z), proj(s.x - r, hy * 0.7, s.z), proj(s.x + r, hy * 0.7, s.z)]);
        if (PROJ && bb && bb.r - bb.l > 4 && bb.b > 0 && bb.t < ch) things.push(['house ' + s.kind + ' ' + Math.round(d) + 'm', bb]); });
      things.push(['middle', { l: cw * 0.3, t: ch * 0.35, r: cw * 0.7, b: ch * 0.8 }]);
      const rect = function (id) { const e = document.getElementById(id); if (!e || e.hidden) return null; const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2 || getComputedStyle(e).visibility === 'hidden' || getComputedStyle(e).display === 'none' || +getComputedStyle(e).opacity < 0.05) return null; return { l: r.left, t: r.top, r: r.right, b: r.bottom }; };
      const hud = ['score', 'feed', 'quest', 'miniF', 'mini', 'hpRow', 'hpWrap', 'bottom', 'abil', 'ab0', 'ab1', 'ab2', 'stam', 'topR'].map(function (id) { return [id, rect(id)]; }).filter(function (x) { return x[1]; });
      const bn = rect('banner');
      const ov = function (a, c) { const w = Math.min(a.r, c.r) - Math.max(a.l, c.l), h = Math.min(a.b, c.b) - Math.max(a.t, c.t); return w > 0 && h > 0 ? Math.round(w * h) : 0; };
      return { banner: bn, play: things.map(function (t) { return [t[0], t[1], bn ? ov(bn, t[1]) : -1]; }), hud: hud.map(function (t) { return [t[0], t[1], bn ? ov(bn, t[1]) : -1]; }) };
    }, !!process.env.PROJ);
    await pg.evaluate(function (m) {
      const add = function (r, col, lab) { const d = document.createElement('div'); d.style.cssText = 'position:fixed;pointer-events:none;z-index:99;border:2px ' + (lab === 'middle' ? 'dashed' : 'solid') + ' ' + col + ';left:' + r.l + 'px;top:' + r.t + 'px;width:' + (r.r - r.l) + 'px;height:' + (r.b - r.t) + 'px;font:10px monospace;color:' + col; d.textContent = lab; document.body.appendChild(d); };
      m.play.forEach(function (t) { add(t[1], t[2] > 0 ? '#ff3030' : '#30ff80', t[0]); }); if (m.banner) add(m.banner, '#ffe040', 'banner');
    }, m);
    const f = path.join(out, 'feel-0.30-banner-' + name + '-' + TAG + '.jpg'); await pg.screenshot({ path: f, type: 'jpeg', quality: 82 });
    console.log(name, TAG, 'banner', JSON.stringify(m.banner && { l: Math.round(m.banner.l), t: Math.round(m.banner.t), r: Math.round(m.banner.r), b: Math.round(m.banner.b) }));
    console.log('  play overlap', m.play.map(function (t) { return t[0] + ':' + t[2]; }).join('  '));
    console.log('  hud overlap ', m.hud.filter(function (t) { return t[2] > 0; }).map(function (t) { return t[0] + ':' + t[2]; }).join('  ') || 'none', errs.length ? ' ERR ' + errs.slice(0, 2).join(' | ') : '');
    await ctx.close();
  }
  await b.close(); srv.close();
})().catch(function (e) { console.error(e); process.exit(1); });
