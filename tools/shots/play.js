/* Play-like motion capture: the camera behind, the hero facing where it looks, running, strafing both ways, back-pedalling,
   stopping, and running while the camera turns. Runs against any version folder (LL_ROOT), so versions can be compared
   frame for frame. Env: LL_ROOT, HERO, OUT, N (180), W/H, PORT. */
// Scripted motion capture: one hero walks away, turns side-on, jumps, fires a burst, stops, and the camera circles.
// Drives the renderer frame by frame (the game loop is stopped), so the result is smooth even on a slow headless GPU.
// Run: LL_ROOT=$PWD HERO=1 OUT=/tmp/t/mo node tools/shots/motion.js ; then ffmpeg -framerate 30 -i $OUT/f%03d.png out.mp4
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs'), http = require('http'), path = require('path');
const root = process.env.LL_ROOT || process.cwd(), out = process.env.OUT || '/tmp/t/mo', hero = +(process.env.HERO || 0), W_ = +(process.env.W || 640), H_ = +(process.env.H || 400);
fs.mkdirSync(out, { recursive: true });
const types = { '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.mp4': 'video/mp4', '.css': 'text/css', '.json': 'application/json' };
const srv = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; fs.readFile(path.join(root, u), (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': types[path.extname(u)] || 'application/octet-stream' }); r.end(d); } }); }).listen(+(process.env.PORT || 8771));
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await (await b.newContext({ viewport: { width: W_, height: H_ } })).newPage(); const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  await pg.route('**/*', rt => { const u = rt.request().url(); if (u.includes('three.min.js')) return rt.fulfill({ path: '/tmp/t/node_modules/three/build/three.min.js', contentType: 'text/javascript' }); if (u.startsWith('http://localhost')) return rt.continue(); return rt.abort(); });
  await pg.goto('http://localhost:' + (process.env.PORT || 8771) + '/'); await pg.waitForTimeout(2000);
  await pg.evaluate((i) => { LL.cfg.mode = 'match'; LL.cfg.petUnlocked = LL.cfg.pet = !!+(new URLSearchParams('x=' + 0).get('x') || 0) || false; document.querySelectorAll('.hero')[i].click(); }, hero);
  if (process.env.FOX) await pg.evaluate(() => { LL.cfg.petUnlocked = LL.cfg.pet = true; LL.gfx.setPet(true); });
  if (process.env.PAPER) await pg.evaluate(() => { LL.cfg.heroes3d = false; if (LL.gfx.setHeroes3d) LL.gfx.setHeroes3d(false); }); // 0.24: the painted cards, for before-and-after
  if (process.env.LOOK) await pg.evaluate((l) => { LL.cfg.look = l; document.body.setAttribute('data-look', l); LL.gfx.setLook(l); }, process.env.LOOK);
  await pg.click('#bPlay'); await pg.waitForTimeout(3500); await pg.evaluate((o) => { window.__zoom = o.z; window.__dash = o.dash; }, { z: +(process.env.ZOOM || 0), dash: !!process.env.DASH });
  await pg.evaluate(() => { window.requestAnimationFrame = () => 0; document.getElementById('hud').hidden = true; const W = LL.sim.W; W.troopers.length = 0; W.thieves.length = 0; W.projs.length = 0;
    const p = W.player, g = W.structs.find(s => s.team === 0 && s.kind === 'guardian' && s.lane === 1); p.x = g.x + 6; p.z = g.z + 34; p.y = 0; p.onGround = true; p.yaw = Math.PI; p.alive = true; p.hp = p.maxHp;
    window.__mo = { t: 0, yaw: Math.PI }; LL.dbg.view.yaw = Math.PI; LL.dbg.view.pitch = -0.12; LL.dbg.view.zoom = +(window.__zoom || 0); for (let k = 0; k < 6; k++) LL.gfx.frame(0.033, LL.dbg.view); });
  await pg.waitForTimeout(1500);
  const N = +(process.env.N || 180);
  for (let f = 0; f < N; f++) {
    await pg.evaluate((f) => {
      /* Play-like: the hero always faces where the camera looks (third-person aim), and moves with WASD. */
      const W = LL.sim.W, p = W.player, v = LL.dbg.view, dt = 1 / 30, S = 6; W.t += dt;
      if (f >= 130 && f < 180) v.yaw += 0.03;                          // turn the camera while running
      p.yaw = v.yaw;
      const fx = Math.sin(p.yaw), fz = Math.cos(p.yaw), rx = -fz, rz = fx;
      let mx = 0, mz = 0;
      if (f < 30 || (f >= 130 && f < 180)) { mx = fx; mz = fz; }        // run forward
      else if (f < 60) { mx = rx; mz = rz; }                             // strafe one way
      else if (f < 90) { mx = -rx; mz = -rz; }                           // strafe the other
      else if (f < 110) { mx = -fx * 0.7; mz = -fz * 0.7; }              // back-pedal
      if (f >= 40 && f < 52 && f % 4 === 0) p.lastShotT = W.t;           // a few shots while strafing
      p.vx = mx * S; p.vz = mz * S; p.x += p.vx * dt; p.z += p.vz * dt; p.y = 0; p.vy = 0; p.onGround = true; p.dashT = 0;
      LL.gfx.frame(dt, v);
    }, f);
    await pg.screenshot({ path: out + '/f' + String(f).padStart(3, '0') + '.png' });
  }
  console.log(errs.length ? errs.join('\n') : 'no page errors'); await b.close(); srv.close();
})().catch(e => { console.error('RUNFAIL', e); process.exit(1); });
