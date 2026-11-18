const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs'), http = require('http'), path = require('path');
const root = process.env.LL_ROOT || '/home/claude/livelock';
const srv = http.createServer((q, r) => { let p = path.join(root, q.url.split('?')[0] === '/' ? 'index.html' : q.url.split('?')[0]); fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': p.endsWith('.js') ? 'text/javascript' : (p.endsWith('.jpg') ? 'image/jpeg' : 'text/html') }); r.end(d); } }); }).listen(8765);
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await (await b.newContext({ viewport: { width: 1100, height: 620 } })).newPage(); const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR: ' + e.message + (e.stack || '').split('\n').slice(0, 3).join(' | ')));
  await pg.route('**/*', rt => { const u = rt.request().url(); if (u.includes('three.min.js')) return rt.fulfill({ path: '/tmp/t/node_modules/three/build/three.min.js', contentType: 'text/javascript' }); if (u.startsWith('http://localhost')) return rt.continue(); return rt.abort(); });
  await pg.goto('http://localhost:8765/'); await pg.waitForTimeout(2000);
  if (process.argv[2] === 'standin') await pg.evaluate(() => { const F = LL.gfx.FLATS, d = 'art/heroes/dora.png'; ['house', 'tower', 'trooper', 'hush', 'hollow', 'thief', 'ness', 'pines', 'rocks'].forEach(k => F[k] = { src: d, cells: 4 }); F.backdrop = { src: 'art/card.jpg', cells: 1 }; LL.gfx.setLook('ink'); LL.gfx.setLook('snow'); });
  await pg.evaluate(() => document.querySelector('.hero').click()); await pg.click('#bPlay'); await pg.waitForTimeout(2500);
  await pg.evaluate(() => { LL.input.lockFailed = true; const S = LL.sim, W = S.W; for (let i = 0; i < 2400; i++) S.step(1 / 30); W.fx.length = 0; S._t.spawnThief(); S._t.spawnHollow(1, true); const p = W.player; p.x = 10; p.z = (W.structs.find(s => s.team === 0 && s.kind === 'guardian' && s.lane === 1).z) * 0.55; p.hp = p.maxHp; p.alive = true; const g = W.structs.find(s => s.team === 0 && s.kind === 'guardian' && s.lane === 1); LL.dbg.view.yaw = Math.atan2(g.x - p.x, g.z - p.z); p.yaw = LL.dbg.view.yaw; });
  await pg.waitForTimeout(2500); await pg.screenshot({ path: '/tmp/t/slots-' + (process.argv[2] || 'plain') + '.png' });
  console.log(await pg.evaluate(() => LL.gfx._flats())); console.log(process.argv[2] || 'plain', errs.length ? errs.join('\n') : 'no page errors');
  await b.close(); srv.close();
})().catch(e => { console.error('RUNFAIL', e); process.exit(1); });
