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
  console.log('doors:', await pg.evaluate(() => [...document.querySelectorAll('#worlds a')].map(a => a.textContent + ' ' + a.href).join(' | ')));
  await pg.evaluate(() => document.getElementById('worlds').scrollIntoView()); await pg.screenshot({ path: '/tmp/t/pull-title.png' });
  await pg.tap('#bPlay'); await pg.waitForTimeout(12000);
  console.log('quest:', await pg.textContent('#quest'));
  await pg.evaluate(() => { LL.sim.setLens('ink'); LL.sim.setLens('snow'); }); await pg.waitForTimeout(1200); await pg.screenshot({ path: '/tmp/t/pull-play.png' });
  await pg.tap('#bPause'); await pg.waitForTimeout(600); console.log('perf:', await pg.textContent('#perf')); console.log(await pg.evaluate(() => LL.perfReport().text));
  await pg.evaluate(() => document.getElementById('perf').scrollIntoView()); await pg.screenshot({ path: '/tmp/t/pull-pause.png' });
  console.log(errs.length ? errs.join('\n') : 'no page errors'); await b.close(); srv.close();
})().catch(e => { console.error('RUNFAIL', e); process.exit(1); });
