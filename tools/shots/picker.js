/* 0.25 rook: the title screen's hero picker at several window sizes, to check that five cards lay out.
   Writes OUT/picker-<name>.png (the whole title, scrolled so the cards show) and prints each card's box.
   Env: LL_ROOT, OUT, PORT (8870-8879), PICK (hero index to select first, default 4), SIZES ("name:WxH,..."). */
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs'), http = require('http'), path = require('path');
const root = process.env.LL_ROOT || process.cwd(), out = process.env.OUT || '/tmp/picker', port = +(process.env.PORT || 8872), pick = +(process.env.PICK || 4);
const sizes = (process.env.SIZES || 'desktop:1440x900,laptop:1280x720,tablet:900x700,phone:390x844,small:360x640,landscape:844x390').split(',').map(s => { const m = s.match(/^(\w+):(\d+)x(\d+)$/); return { name: m[1], w: +m[2], h: +m[3] }; });
fs.mkdirSync(out, { recursive: true });
const types = { '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg' };
const srv = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; fs.readFile(path.join(root, u), (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': types[path.extname(u)] || 'application/octet-stream' }); r.end(d); } }); }).listen(port);
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const s of sizes) {
    const pg = await (await b.newContext({ viewport: { width: s.w, height: s.h }, deviceScaleFactor: s.w < 500 ? 2 : 1, hasTouch: s.w < 900, isMobile: s.w < 500 })).newPage();
    await pg.route('**/*', rt => { const u = rt.request().url(); if (u.includes('three.min.js')) return rt.fulfill({ path: '/tmp/t/node_modules/three/build/three.min.js', contentType: 'text/javascript' }); if (u.startsWith('http://localhost')) return rt.continue(); return rt.abort(); });
    await pg.goto('http://localhost:' + port + '/'); await pg.waitForTimeout(1500);
    const info = await pg.evaluate((i) => { const hs = Array.from(document.querySelectorAll('.hero')); hs[i].click(); hs[0].scrollIntoView({ block: 'start' }); const hw = document.getElementById('heroes').getBoundingClientRect();
      return { cards: hs.length, grid: [Math.round(hw.width), Math.round(hw.height)], boxes: hs.map(h => { const r = h.getBoundingClientRect(); return [Math.round(r.left - hw.left), Math.round(r.top - hw.top), Math.round(r.width), Math.round(r.height)]; }),
        clipped: hs.filter(h => h.scrollWidth > h.clientWidth + 1 || Array.from(h.querySelectorAll('h4, .ti')).some(x => x.scrollWidth > x.clientWidth + 1)).length, pressed: hs.findIndex(h => h.getAttribute('aria-pressed') === 'true') }; }, pick);
    await pg.waitForTimeout(300); await pg.screenshot({ path: path.join(out, 'picker-' + s.name + '.png') });
    console.log(s.name, s.w + 'x' + s.h, JSON.stringify(info)); await pg.context().close();
  }
  await b.close(); srv.close();
})().catch(e => { console.error('RUNFAIL', e); process.exit(1); });
