// Issue #7: in Dreamwalk the screen must show the view the director picks, and the saved look must come back after.
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs'), http = require('http'), path = require('path'), root = process.env.LL_ROOT || process.cwd();
const types = { '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.mp4': 'video/mp4' };
const srv = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; fs.readFile(path.join(root, u), (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': types[path.extname(u)] || 'application/octet-stream' }); r.end(d); } }); }).listen(8772);
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await (await b.newContext({ viewport: { width: 640, height: 400 } })).newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.route('**/*', rt => { const u = rt.request().url(); if (u.includes('three.min.js')) return rt.fulfill({ path: '/tmp/t/node_modules/three/build/three.min.js', contentType: 'text/javascript' }); if (u.startsWith('http://localhost')) return rt.continue(); return rt.abort(); });
  await pg.goto('http://localhost:8772/'); await pg.waitForTimeout(1800);
  const state = () => pg.evaluate(() => ({ lens: LL.sim.W && LL.sim.W.lens, drawn: LL.gfx.look.name, body: document.body.getAttribute('data-look'), saved: LL.cfg.look }));
  await pg.evaluate(() => { LL.cfg.dream = true; LL.cfg.mode = 'match'; }); await pg.click('#cDream').catch(() => {}); await pg.evaluate(() => { LL.cfg.dream = true; });
  await pg.click('#bPlay'); await pg.waitForTimeout(1500); console.log('start   ', JSON.stringify(await state()));
  await pg.evaluate(() => { LL.sim.setLens('memory'); }); await pg.waitForTimeout(1500); console.log('director', JSON.stringify(await state()));
  await pg.evaluate(() => { LL.sim.setLens('rain'); }); await pg.waitForTimeout(1500); console.log('director', JSON.stringify(await state()));
  await pg.evaluate(() => { document.getElementById('bQuit').click(); }); await pg.waitForTimeout(1500); console.log('title   ', JSON.stringify(await state()));
  await pg.reload(); await pg.waitForTimeout(1800); console.log('reload  ', JSON.stringify(await state()));
  console.log(errs.length ? errs.join('\n') : 'no page errors'); await b.close(); srv.close();
})().catch(e => { console.error('RUNFAIL', e); process.exit(1); });
