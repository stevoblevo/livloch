const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs'), http = require('http'), path = require('path'); const root = '/home/claude/saelion-relay-canary'; const miss = [];
const srv = http.createServer((q, r) => { let u = q.url.split('?')[0]; if (u === '/livloch' || u === '/livloch/') u = '/livloch/index.html'; if (u === '/') u = '/index.html'; fs.readFile(path.join(root, u), (e, d) => { if (e) { miss.push(u); r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': u.endsWith('.js') ? 'text/javascript' : (u.endsWith('.jpg') ? 'image/jpeg' : 'text/html') }); r.end(d); } }); }).listen(8766);
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await (await b.newContext({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true })).newPage(); const errs = [];
  pg.on('pageerror', e => errs.push(e.message));
  await pg.route('**/*', rt => { const u = rt.request().url(); if (u.includes('three.min.js')) return rt.fulfill({ path: '/tmp/t/node_modules/three/build/three.min.js', contentType: 'text/javascript' }); if (u.startsWith('http://localhost')) return rt.continue(); return rt.abort(); });
  await pg.goto('http://localhost:8766/livloch'); await pg.waitForTimeout(2500);
  console.log('LL loaded:', await pg.evaluate(() => !!(window.LL && LL.sim && LL.CABINET)), '| footer:', await pg.evaluate(() => document.querySelector('footer').textContent.slice(0, 14)));
  await pg.tap('#bPlay'); await pg.waitForTimeout(1500); console.log('playing:', await pg.evaluate(() => !!LL.sim.W.player && !document.getElementById('hud').hidden));
  await pg.goto('http://localhost:8766/'); await pg.waitForTimeout(800); console.log('home link:', await pg.evaluate(() => !!document.querySelector('a[href="/livloch"]')));
  console.log('missing:', JSON.stringify(miss), 'errors:', JSON.stringify(errs)); await b.close(); srv.close();
})();
