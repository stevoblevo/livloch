// Scenery check: several fixed poses in several looks from one match, with the game loop stopped so every frame is the same
// moment. Prints the scene draw calls for each look (one plain render with post off, so the count is the scene's, not the post quad's).
// Run: LL_ROOT=$PWD PORT=8790 OUT=/tmp/sc/s LOOKS=snow,lantern POSES=fight,lane,loch,west,high node tools/shots/scenery.js
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
      await pg.evaluate((pose) => {
        const W = LL.sim.W, p = W.player, v = LL.dbg.view, F = window.__fight; v.mode = 'play'; v.target = p; v.pitch = -0.08; v.zoom = 0;
        p.alive = true; p.y = 0; p.vy = 0; p.onGround = true; p.vx = p.vz = 0;
        const at = (x, z, yaw) => { p.x = x; p.z = z; p.yaw = yaw; v.yaw = yaw; };
        if (pose === 'fight') at(F.x, F.z, F.yaw);
        else if (pose === 'lane') at(0, -92, 0);
        else if (pose === 'loch') at(8, -20, Math.atan2(24 - 8, 0 + 20));
        else if (pose === 'west') at(-46, -64, 0.25);
        else if (pose === 'edge') at(-66, -30, -1.2);
        else if (pose === 'base') at(3, -118, 0.1);
        else if (pose === 'high') { v.mode = 'attract'; v.target = null; }
        for (let k = 0; k < 8; k++) LL.gfx.frame(0.05, v);
      }, pose);
      await pg.waitForTimeout(150);
      await pg.screenshot({ path: out + '/' + look + '_' + pose + tag + '.png' });
    }
  }
  console.log(errs.length ? errs.join('\n') : 'no page errors'); await b.close(); srv.close();
})().catch(e => { console.error('RUNFAIL', e); process.exit(1); });
