// Scripted motion capture for the 0.21 motion pass (Anna first): idle, walk away, strafe both ways, stop and settle,
// a held trigger (thrown shots with their wind-up), a side-on run and stop, side throws, Core Sample (Q, braced),
// Tumble (E, stomp), the camera round to the front, a walk toward the camera and a stomp from the front.
// Drives the renderer frame by frame (the game loop is stopped), so the frames are smooth even on a slow headless GPU.
// Writes OUT/f000.png ... and OUT/pos.json (the hero's chest on screen per frame, for cropping).
// Run: LL_ROOT=$PWD HERO=1 OUT=/tmp/an/x W=800 H=500 PORT=8801 node tools/shots/anna.js
//      ffmpeg -framerate 30 -i $OUT/f%03d.png -c:v libx264 -preset veryfast -pix_fmt yuv420p out.mp4
// HERO: 0 Dora, 1 Anna, 2 Myra, 3 Skein. ZOOM (0 to 1, default 0.7). N: stop early. KEEP=115-140,205-230: only write
// those frames (the rest are still played). THREE_JS: a local three.min.js r128.
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/npm-tools/node_modules/playwright');
const fs = require('fs'), http = require('http'), path = require('path');
const root = process.env.LL_ROOT || process.cwd(), out = process.env.OUT || '/tmp/t/anna', hero = +(process.env.HERO || 1), W_ = +(process.env.W || 800), H_ = +(process.env.H || 500), port = +(process.env.PORT || 8801);
fs.mkdirSync(out, { recursive: true });
const types = { '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.mp4': 'video/mp4', '.css': 'text/css', '.json': 'application/json' };
const srv = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; fs.readFile(path.join(root, u), (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': types[path.extname(u)] || 'application/octet-stream' }); r.end(d); } }); }).listen(port);
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await (await b.newContext({ viewport: { width: W_, height: H_ } })).newPage(); const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  await pg.route('**/*', rt => { const u = rt.request().url(); if (u.includes('three.min.js')) return rt.fulfill({ path: process.env.THREE_JS || '/tmp/t/node_modules/three/build/three.min.js', contentType: 'text/javascript' }); if (u.startsWith('http://localhost')) return rt.continue(); return rt.abort(); });
  await pg.goto('http://localhost:' + port + '/'); await pg.waitForTimeout(2000);
  await pg.evaluate((i) => { LL.cfg.mode = 'match'; document.querySelectorAll('.hero')[i].click(); }, hero);
  await pg.click('#bPlay'); await pg.waitForTimeout(3500);
  await pg.evaluate((z) => { window.requestAnimationFrame = () => 0; document.getElementById('hud').hidden = true; const W = LL.sim.W; W.troopers.length = 0; W.thieves.length = 0; W.projs.length = 0;
    const p = W.player, g = W.structs.find(s => s.team === 0 && s.kind === 'guardian' && s.lane === 1); p.x = g.x + 6; p.z = g.z + 34; p.y = 0; p.onGround = true; p.yaw = Math.PI; p.alive = true; p.hp = p.maxHp;
    p.ctl.fire = false; p.fireT = 0; p.ammo = p.magSize; p.reloadT = 0; p.lastShotT = -99;
    LL.dbg.view.yaw = Math.PI; LL.dbg.view.pitch = -0.12; LL.dbg.view.zoom = z; for (let k = 0; k < 6; k++) LL.gfx.frame(0.033, LL.dbg.view); }, +(process.env.ZOOM || 0.7));
  await pg.waitForTimeout(1500);
  const N = Math.min(+(process.env.N || 999), 330), pos = [], keep = (process.env.KEEP || '').split(',').filter(Boolean).map(r => r.split('-').map(Number));
  for (let f = 0; f < N; f++) {
    const at = await pg.evaluate((f) => {
      const W = LL.sim.W, p = W.player, v = LL.dbg.view, dt = 1 / 30, S = p.def.speed || 6.9; W.t += dt;
      let mx = 0, mz = 0, yaw = p.yaw; // mz: metres/s along the hero's facing; mx: metres/s to the right of the screen
      const seg = (a, b) => f >= a && f < b;
      const fire = (on) => { p.ctl.fire = on; if (!on) return; p.fireT -= dt; if (p.fireT <= 0) { p.lastShotT = W.t; p.fireT = 1 / p.def.gun.rate; LL.gfx.fx({ k: 'shot', u: p, x: p.x, y: p.y + 1.35, z: p.z }); } };
      const cast = (i) => { const a = p.def.ab[i]; LL.gfx.fx({ k: 'cast', u: p, i: i, kind: a.kind }); if (a.kind === 'nova') LL.gfx.fx({ k: 'nova', x: p.x, y: p.y, z: p.z, r: a.r, col: p.def.col }); };
      p.ctl.fire = false; if (p.fireT > 0) p.fireT -= dt;
      if (seg(0, 20)) { yaw = Math.PI; }                                   // idle, from behind
      else if (seg(20, 60)) { yaw = Math.PI; mz = S; }                    // walk away
      else if (seg(60, 80)) { yaw = Math.PI; mx = S * 0.8; }             // strafe right
      else if (seg(80, 100)) { yaw = Math.PI; mx = -S * 0.8; }           // strafe left
      else if (seg(100, 115)) { yaw = Math.PI; }                          // stop and settle
      else if (seg(115, 140)) { yaw = Math.PI; fire(true); }              // a held trigger from behind
      else if (seg(140, 160)) { yaw = Math.PI - (f - 140) / 20 * Math.PI / 2; mz = S; } // turn while walking
      else if (seg(160, 190)) { yaw = Math.PI / 2; mz = S; }              // side-on run
      else if (seg(190, 205)) { yaw = Math.PI / 2; }                      // stop and settle, side-on
      else if (seg(205, 230)) { yaw = Math.PI / 2; fire(true); }          // held trigger, side-on
      else if (seg(230, 245)) { yaw = Math.PI / 2; if (f === 232) cast(0); } // Q
      else if (seg(245, 262)) { yaw = Math.PI / 2; if (f === 248) cast(1); } // E
      else if (seg(262, 285)) { yaw = Math.PI / 2; v.yaw = Math.PI + (f - 262) / 23 * (Math.PI / 2); } // the camera goes round to the front
      else if (seg(285, 312)) { yaw = Math.PI / 2; mz = S * 0.7; }        // walk toward the camera
      else if (seg(312, 330)) { yaw = Math.PI / 2; if (f === 314) cast(1); } // stomp from the front
      const rx = -Math.cos(v.yaw), rz = Math.sin(v.yaw), vx = Math.sin(yaw) * mz + rx * mx, vz = Math.cos(yaw) * mz + rz * mx;
      p.yaw = yaw; p.vx = vx; p.vz = vz; p.x += vx * dt; p.z += vz * dt; p.y = 0; p.vy = 0; p.onGround = true;
      LL.gfx.frame(dt, v);
      const o = {}; LL.gfx.project(p.x, p.y + 1.2, p.z, o); return [Math.round(o.x), Math.round(o.y)];
    }, f);
    pos.push(at);
    if (!keep.length || keep.some(r => f >= r[0] && f <= (r[1] == null ? r[0] : r[1]))) await pg.screenshot({ path: out + '/f' + String(f).padStart(3, '0') + '.png' });
  }
  fs.writeFileSync(out + '/pos.json', JSON.stringify(pos));
  console.log(errs.length ? errs.join('\n') : 'no page errors'); await b.close(); srv.close();
})().catch(e => { console.error('RUNFAIL', e); process.exit(1); });
