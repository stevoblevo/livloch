const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs'), http = require('http'), path = require('path');
const root = process.env.LL_ROOT || '/home/claude/livelock';
const srv = http.createServer((q, r) => { let p = path.join(root, q.url.split('?')[0] === '/' ? 'index.html' : q.url.split('?')[0]); fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': p.endsWith('.js') ? 'text/javascript' : (p.endsWith('.jpg') ? 'image/jpeg' : 'text/html') }); r.end(d); } }); }).listen(8765);
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await (await b.newContext({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 })).newPage(); const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  await pg.route('**/*', rt => { const u = rt.request().url(); if (u.includes('three.min.js')) return rt.fulfill({ path: '/tmp/t/node_modules/three/build/three.min.js', contentType: 'text/javascript' }); if (u.startsWith('http://localhost')) return rt.continue(); return rt.abort(); });
  await pg.goto('http://localhost:8765/'); await pg.waitForTimeout(2000);
  console.log('default mode:', await pg.evaluate(() => LL.cfg.mode), '|', await pg.textContent('#modeLine'));
  await pg.tap('#bPlay'); await pg.waitForTimeout(1500);
  await pg.evaluate(() => { const S = LL.sim, W = S.W; S.setLens('ink'); for (let i = 0; i < 400 * 30 && !W.over; i++) { if (W.mood && !W.mood.done) S.setLens(W.mood.lens); S.step(1 / 30); W.heroes.forEach(h => { if (h.alive) h.hp = h.maxHp; }); if (W.fx.some(e => e.k === 'over')) break; W.fx.forEach(e => LL.ui.fx(e)); W.fx.length = 0; } });
  await pg.waitForTimeout(14000); await pg.screenshot({ path: '/tmp/t/short-over.png' });
  console.log('over:', await pg.textContent('#overH'), '|', await pg.textContent('#overP')); console.log('stars:', await pg.evaluate(() => document.getElementById('stars').innerText.replace(/\n/g, ' / ')), '| best', await pg.evaluate(() => LL.cfg.bestStars));
  console.log(errs.length ? errs.join('\n') : 'no page errors'); await b.close(); srv.close();
})().catch(e => { console.error('RUNFAIL', e); process.exit(1); });
