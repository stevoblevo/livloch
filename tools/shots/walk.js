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
  await pg.waitForTimeout(2500); await pg.keyboard.press('KeyP'); await pg.waitForTimeout(500); await pg.evaluate(() => { document.getElementById('pause').style.display = 'none'; });
  let n = 0;
  for (const d of [0, 1.6, 3.14]) for (const ph of [0, 1.57, 4.71, 'fire']) {
    await pg.evaluate(([d, ph]) => { const W = LL.sim.W, v = LL.dbg.view, p = W.player; p.yaw = v.yaw + d; p.vx = 5; p.vz = 0; p.onGround = true; p.lastShotT = ph === 'fire' ? W.t : -99; LL.gfx._phase(ph === 'fire' ? 0 : ph); LL.gfx.frame(0, v); }, [d, ph]);
    await pg.screenshot({ path: '/tmp/t/w-' + (n++) + '.png', clip: { x: 330, y: 190, width: 240, height: 330 } });
  }
  console.log(errs.length ? errs.join('\n') : 'no page errors'); await b.close(); srv.close();
})().catch(e => { console.error('RUNFAIL', e); process.exit(1); });
