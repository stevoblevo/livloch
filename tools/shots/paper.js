const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs'), http = require('http'), path = require('path');
const root = process.env.LL_ROOT || '/home/claude/livelock';
const srv = http.createServer((q, r) => { let p = path.join(root, q.url.split('?')[0] === '/' ? 'index.html' : q.url.split('?')[0]); fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': p.endsWith('.js') ? 'text/javascript' : (p.endsWith('.jpg') ? 'image/jpeg' : 'text/html') }); r.end(d); } }); }).listen(8765);
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await (await b.newContext({ viewport: { width: 900, height: 620 } })).newPage(); const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  await pg.route('**/*', rt => { const u = rt.request().url(); if (u.includes('three.min.js')) return rt.fulfill({ path: '/tmp/t/node_modules/three/build/three.min.js', contentType: 'text/javascript' }); if (u.startsWith('http://localhost')) return rt.continue(); return rt.abort(); });
  await pg.goto('http://localhost:8765/'); await pg.waitForTimeout(2000);
  await pg.evaluate((i) => document.querySelectorAll('.hero')[i].click(), +(process.env.HERO || 0)); await pg.click('#bPlay'); await pg.waitForTimeout(2500);
  await pg.keyboard.press('KeyP'); await pg.waitForTimeout(500);
  await pg.evaluate(() => { document.getElementById('pause').style.display = 'none'; });
  const shots = [];
  for (const [n, d] of [['back', 0], ['q-left', 2.5], ['side-left', 1.6], ['side-right', -1.6], ['tq-right', -2.5], ['front', 3.14]]) {
    await pg.evaluate((d) => { const W = LL.sim.W, v = LL.dbg.view; W.player.yaw = v.yaw + d; LL.gfx.frame(0.016, v); }, d);
    const f = '/tmp/t/p-' + n + '.png'; await pg.screenshot({ path: f, clip: { x: 250, y: 150, width: 400, height: 420 } }); shots.push(f);
  }
  console.log('paper:', await pg.evaluate(() => !!LL.sim.W.player && LL.cfg.hero), errs.length ? errs.join('\n') : 'no page errors');
  await b.close(); srv.close();
})().catch(e => { console.error('RUNFAIL', e); process.exit(1); });
