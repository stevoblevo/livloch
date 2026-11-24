/* Shot, hit and kill feel (0.23): lets the bot play the player for T seconds to reach a fight, then records N frames
   with every model event passed to the renderer and the HUD the way main.js does (R.fx, UI.fx), so muzzle flashes,
   paper bits, crumples, tissue and the crosshair ticks are all in frame. Env: LL_ROOT, PORT (8778), OUT (/tmp/t/feel),
   T (40), N (90), W/H (960x540), LOOK (snow), HERO (0). Encode with ffmpeg -framerate 30 -i OUT/f%03d.png. */
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs'), http = require('http'), path = require('path'), root = process.env.LL_ROOT || process.cwd(), port = +(process.env.PORT || 8778), out = process.env.OUT || '/tmp/t/feel';
fs.mkdirSync(out, { recursive: true });
const types = { '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.css': 'text/css', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; fs.readFile(path.join(root, u), (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': types[path.extname(u)] || 'application/octet-stream' }); r.end(d); } }); }).listen(port);
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await (await b.newContext({ viewport: { width: +(process.env.W || 960), height: +(process.env.H || 540) } })).newPage(); const errs = [];
  pg.on('pageerror', e => errs.push(e.message));
  await pg.route('**/*', rt => { const u = rt.request().url(); if (u.includes('three.min.js')) return rt.fulfill({ path: '/tmp/t/node_modules/three/build/three.min.js', contentType: 'text/javascript' }); if (u.startsWith('http://localhost')) return rt.continue(); return rt.abort(); });
  await pg.goto('http://localhost:' + port + '/'); await pg.waitForTimeout(1800);
  await pg.evaluate((o) => { LL.cfg.mode = 'match'; LL.cfg.look = o.look; LL.cfg.hero = o.hero; }, { look: process.env.LOOK || 'snow', hero: +(process.env.HERO || 0) });
  await pg.click('#bPlay'); await pg.waitForTimeout(2500);
  await pg.evaluate((T) => { window.requestAnimationFrame = () => 0; LL.input.lockFailed = true; const S = LL.sim, W = S.W; W.player.useAI = true;
    for (let i = 0; i < T * 30; i++) { S.step(1 / 30); W.heroes.forEach(h => { if (h.team === 0 && h.alive) h.hp = h.maxHp; }); W.fx.length = 0; } }, +(process.env.T || 40));
  const N = +(process.env.N || 90);
  for (let f = 0; f < N; f++) {
    await pg.evaluate(() => { const S = LL.sim, W = S.W, v = LL.dbg.view, p = W.player; S.step(1 / 30); p.hp = p.maxHp;
      for (let i = 0; i < W.fx.length; i++) { LL.gfx.fx(W.fx[i]); LL.ui.fx(W.fx[i]); } W.fx.length = 0;
      v.mode = 'play'; v.target = p; v.yaw += (((p.yaw - v.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * 0.25; v.pitch = -0.1;
      LL.gfx.frame(1 / 30, v); LL.ui.frame(1 / 30, W, v, { hot: false, orb: false, canZip: false, canFold: false }); });
    await pg.screenshot({ path: out + '/f' + String(f).padStart(3, '0') + '.png' });
  }
  console.log(errs.length ? errs.join('\n') : 'no page errors'); await b.close(); srv.close();
})().catch(e => { console.error('RUNFAIL', e); process.exit(1); });
