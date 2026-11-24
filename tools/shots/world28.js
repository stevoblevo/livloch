// 0.28 world captures: scenery.js plus RAW=1 (also a no-post frame, *_raw.png, for sampling colours) and poses moon, moon2.
// Run: LL_ROOT=$PWD PORT=8880 OUT=/tmp/w28/x LOOKS=snow,origami POSES=lane,west RAW=1 T=5 node tools/shots/world28.js
// W, H: viewport. T: seconds of bot play first. LOW=1: lighter graphics. TAG: a word added to each file name.
// W, H: viewport. T: seconds of bot play first. LOW=1: lighter graphics. TAG: a word added to each file name.
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs'), http = require('http'), path = require('path');
const root = process.env.LL_ROOT || process.cwd(), port = +(process.env.PORT || 8790), out = process.env.OUT || '/tmp/sc/s', tag = process.env.TAG ? '_' + process.env.TAG : '';
const looks = (process.env.LOOKS || 'snow').split(','), poses = (process.env.POSES || 'fight,lane,loch,west,high').split(',');
fs.mkdirSync(out, { recursive: true });
const types = { '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.mp4': 'video/mp4', '.css': 'text/css', '.json': 'application/json' };
const srv = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; fs.readFile(path.join(root, u), (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': types[path.extname(u)] || 'application/octet-stream' }); r.end(d); } }); }).listen(port);
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await (await b.newContext({ viewport: { width: +(process.env.W || 1280), height: +(process.env.H || 720) } })).newPage(); const errs = [];
  pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console error: ' + m.text().slice(0, 300)); });
  await pg.route('**/*', rt => { const u = rt.request().url(); if (u.includes('three.min.js')) return rt.fulfill({ path: '/tmp/t/node_modules/three/build/three.min.js', contentType: 'text/javascript' }); if (u.startsWith('http://localhost')) return rt.continue(); return rt.abort(); });
  await pg.goto('http://localhost:' + port + '/'); await pg.waitForTimeout(1800);
  await pg.evaluate((low) => { LL.cfg.mode = 'match'; LL.cfg.look = 'snow'; LL.cfg.petUnlocked = LL.cfg.pet = true; LL.cfg.low = !!low; }, !!process.env.LOW);
  await pg.click('#bPlay'); await pg.waitForTimeout(2500);
  await pg.evaluate((T) => { LL.input.lockFailed = true; const S = LL.sim, W = S.W; W.player.useAI = true; for (let i = 0; i < T * 30; i++) { S.step(1 / 30); W.heroes.forEach(h => { if (h.team === 0 && h.alive) h.hp = h.maxHp; }); } W.fx.length = 0; }, +(process.env.T || 75));
  await pg.waitForTimeout(1200);
  // stop the game loop; from here every frame is drawn by hand
  await pg.evaluate(() => { window.requestAnimationFrame = () => 0; window.__fight = { x: LL.sim.W.player.x, z: LL.sim.W.player.z, yaw: LL.sim.W.player.yaw }; LL.gfx.setQuality(!!LL.cfg.low); });
  await pg.evaluate(() => { const r = THREE.Object3D.prototype.lookAt; THREE.Object3D.prototype.lookAt = function (x, y, z) { if (window.__cam && this.isPerspectiveCamera) { this.position.set(...window.__cam.p); return r.call(this, new THREE.Vector3(...window.__cam.l)); } return r.apply(this, arguments); }; }); // 0.28: CAM poses (cf3, cs0, ccrane) put the camera by hand for close-ups
  await pg.waitForTimeout(400);
  for (const look of looks) {
    const calls = await pg.evaluate((look) => {
      document.body.setAttribute('data-look', look); LL.gfx.setLook(look); LL.sim.W.lens = look;
      const v = LL.dbg.view, p = LL.sim.W.player, F = window.__fight; v.mode = 'play'; v.target = p; v.pitch = -0.08; v.zoom = 0; p.x = F.x; p.z = F.z; p.yaw = v.yaw = F.yaw;
      for (let k = 0; k < 4; k++) LL.gfx.frame(0.033, v);
      const nb = LL.gfx.noPost; LL.gfx.noPost = true; const bl = LL.gfx.low; LL.gfx.low = true; LL.gfx.frame(0.033, v); const c = LL.gfx._calls(); LL.gfx.noPost = nb; LL.gfx.low = bl; return c;
    }, look);
    console.log(look, 'scene draw calls', calls);
    if (process.env.EVAL) console.log('eval', JSON.stringify(await pg.evaluate(process.env.EVAL)));
    for (const pose of poses) {
      await pg.evaluate(([pose, D, O]) => {
        window.__D = D; window.__O = O; const W = LL.sim.W, p = W.player, v = LL.dbg.view, F = window.__fight; v.mode = 'play'; v.target = p; v.pitch = -0.08; v.zoom = 0;
        p.alive = true; p.y = 0; p.vy = 0; p.onGround = true; p.vx = p.vz = 0;
        window.__cam = null; const at = (x, z, yaw) => { p.x = x; p.z = z; p.yaw = yaw; v.yaw = yaw; };
        if (pose === 'fight') at(F.x, F.z, F.yaw);
        else if (pose === 'lane') at(0, -92, 0);
        else if (pose === 'loch') at(8, -20, Math.atan2(24 - 8, 0 + 20));
        else if (pose === 'west') at(-46, -64, 0.25);
        else if (pose === 'edge') at(-66, -30, -1.2);
        else if (pose === 'base') at(3, -118, 0.1);
        else if (pose === 'moon') at(0, -92, -0.45)
        else if (pose === 'moon2') at(-10, -60, -0.1)
        else if (/^c(f\d+|s\d+|crane\d?)$/.test(pose)) { // close-up: camera by hand, D metres from the subject at height Hc looking at its middle
          const k = pose.slice(1), D = +window.__D; let tx, tz, ty = 1.5, ang = 0.7;
          if (k[0] === 'f') { const f = W.fruit[+k.slice(1)]; f.ripe = true; if (f.lens) W.lens = f.lens; tx = f.x; tz = f.z; ty = LL.C.FRUIT_INFO[f.k].big ? 2.2 : 1.3; }
          else if (k[0] === 's') { const q = W.strays[+k.slice(1)]; tx = q.x; tz = q.z; ty = 1.7; ang = q.yaw + 0.8; }
          else { const i = +(k.slice(5) || 0), c = W.creases[i]; c.t = 0; c.cd = 0; c.guard.alive = false; tx = LL.C.CREASE_X[i]; tz = 0; ty = 2.4; ang = 0.9; }
          window.__cam = { p: [tx + Math.sin(ang) * D, ty + 0.6, tz + Math.cos(ang) * D], l: [tx, ty, tz] }; p.x = tx - 30; p.z = tz - 30; // the hero out of the frame
        }
        else if (/^(f\d+|s\d+|crane\d?)$/.test(pose)) { // 0.28 props: fN fruit N, sN stray N, crane / crane1; D metres away, offset so the hero does not cover it
          const D = +(window.__D || 9); let tx, tz;
          if (pose[0] === 'f') { const f = W.fruit[+pose.slice(1)]; f.ripe = true; if (f.lens) W.lens = f.lens; tx = f.x; tz = f.z; } else if (pose[0] === 's') { const q = W.strays[+pose.slice(1)]; tx = q.x; tz = q.z; }
          else { const i = +(pose.slice(5) || 0), c = W.creases[i]; c.t = 0; c.cd = 0; c.guard.alive = false; tx = LL.C.CREASE_X[i]; tz = 0; }
          const O = +(window.__O), y0 = 0.3, px = tx - Math.sin(y0) * D, pz = tz - Math.cos(y0) * D; at(px, pz, y0 - O); // O: radians the hero turns away, so the subject sits to one side of it
        }
        else if (pose === 'high') { v.mode = 'attract'; v.target = null; }
        for (let k = 0; k < 8; k++) LL.gfx.frame(0.05, v);
      }, [pose, process.env.D || 9, process.env.O || 0.5]);
      await pg.waitForTimeout(150);
      await pg.screenshot({ path: out + '/' + look + '_' + pose + tag + '.png' });
      if (process.env.RAW) { await pg.evaluate(() => { LL.gfx.noPost = true; LL.gfx.low = true; LL.gfx.frame(0.033, LL.dbg.view); }); await pg.screenshot({ path: out + '/' + look + '_' + pose + tag + '_raw.png' }); await pg.evaluate(() => { LL.gfx.noPost = false; LL.gfx.low = !!LL.cfg.low; }); }
    }
  }
  console.log(errs.length ? errs.join('\n') : 'no page errors'); await b.close(); srv.close();
})().catch(e => { console.error('RUNFAIL', e); process.exit(1); });
