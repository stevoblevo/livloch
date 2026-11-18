const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs'), http = require('http'), path = require('path');
const root = process.env.LL_ROOT || '/home/claude/livelock';
const srv = http.createServer((q, r) => { let p = path.join(root, q.url.split('?')[0] === '/' ? 'index.html' : q.url.split('?')[0]); fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': p.endsWith('.js') ? 'text/javascript' : (p.endsWith('.jpg') ? 'image/jpeg' : 'text/html') }); r.end(d); } }); }).listen(8765);
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const pg = await ctx.newPage(); const errs = [];
  pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  pg.on('pageerror', e => errs.push('PAGEERROR: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
  await pg.route('**/*', rt => { const u = rt.request().url(); if (u.includes('three.min.js')) return rt.fulfill({ path: '/tmp/t/node_modules/three/build/three.min.js', contentType: 'text/javascript' }); if (u.startsWith('http://localhost')) return rt.continue(); return rt.abort(); });
  await pg.goto('http://localhost:8765/'); await pg.waitForTimeout(2000);
  await pg.tap('[data-mode="fallen"]'); await pg.tap('#cLean'); await pg.waitForTimeout(300);
  await pg.screenshot({ path: '/tmp/t/m-title.png' });
  console.log('modeLine:', await pg.textContent('#modeLine'), '| play button:', await pg.textContent('#bPlay'));
  await pg.tap('#bPlay'); await pg.waitForTimeout(1500);
  const ff = (secs) => pg.evaluate((secs) => { const S = LL.sim, W = S.W; for (let i = 0; i < secs * 30 && !W.over; i++) { S.step(1 / 30); if (i % 3 === 0) { W.fx.forEach(e => { LL.gfx.fx(e); LL.ui.fx(e); }); W.fx.length = 0; } } return { t: Math.round(W.t), lights: W.lights, over: W.over, lean: W.lean, fallen: W.fallen, lane: W.player.ai.lane, lens: W.lens, dark: W.structs.filter(s => s.team === 0 && s.dark).length }; }, secs);
  console.log('start', JSON.stringify(await ff(1)));
  await pg.tap('#lCall2'); await pg.waitForTimeout(300); console.log('after call East', JSON.stringify(await ff(100)));
  await pg.waitForTimeout(1500); await pg.screenshot({ path: '/tmp/t/m-lean.png' });
  for (let i = 0; i < 6; i++) { await pg.tap('#lView'); await pg.waitForTimeout(500); }
  console.log('after 6 view taps', JSON.stringify(await ff(1))); await pg.waitForTimeout(1500); await pg.screenshot({ path: '/tmp/t/m-rain.png' });
  await pg.tap('#lView'); await ff(20); await pg.waitForTimeout(1500); await pg.screenshot({ path: '/tmp/t/m-memory.png' });
  console.log('memory', JSON.stringify(await ff(1)), 'fold disabled:', await pg.evaluate(() => document.getElementById('lFold').disabled));
  console.log('end', JSON.stringify(await ff(3600))); await pg.waitForTimeout(4200); await pg.screenshot({ path: '/tmp/t/m-over.png' });
  console.log('over:', await pg.textContent('#overH'), '|', await pg.textContent('#overP'), '| best', await pg.evaluate(() => LL.cfg.bestT));
  await pg.tap('#bTitle'); await pg.waitForTimeout(800);
  console.log('cabinet button hidden:', await pg.evaluate(() => document.getElementById('bCab').hidden), 'unl', JSON.stringify(await pg.evaluate(() => LL.cfg.unl)));
  await pg.tap('#bCab'); await pg.waitForTimeout(500); await pg.screenshot({ path: '/tmp/t/m-cab.png' }); console.log(await pg.textContent('#cabSub'));
  await pg.evaluate(() => { LL.cfg.all = true; LL.ui.showCab(); }); await pg.waitForTimeout(300);
  await pg.evaluate(() => { [...document.querySelectorAll('#cabList .item')].find(b => b.textContent.includes('Snuff')).click(); }); await pg.waitForTimeout(2500);
  for (let i = 0; i < 40; i++) { await pg.evaluate(() => { const cv = document.getElementById('snuffC'), r = cv.getBoundingClientRect(); for (let k = 0; k < 9; k++) cv.onpointerdown({ clientX: r.left + (k % 3 + 0.5) * r.width / 3, clientY: r.top + (Math.floor(k / 3) + 0.5) * r.height / 3 }); }); await pg.waitForTimeout(150); }
  await pg.screenshot({ path: '/tmp/t/m-snuff.png' }); console.log('snuff:', await pg.textContent('#snuffT'));
  await pg.evaluate(() => { [...document.querySelectorAll('#cabList .item')].find(b => b.textContent.includes('plates')).click(); }); await pg.waitForTimeout(1500);
  await pg.evaluate(() => document.querySelectorAll('#plates button')[5].click()); await pg.waitForTimeout(1500); await pg.screenshot({ path: '/tmp/t/m-plates.png', fullPage: false });
  console.log('plates loaded:', JSON.stringify(await pg.evaluate(() => [...document.querySelectorAll('#plates img')].map(i => i.naturalWidth))));
  console.log(errs.length ? errs.slice(0, 10).join('\n') : 'no console errors');
  await b.close(); srv.close();
})().catch(e => { console.error('RUNFAIL', e); process.exit(1); });
