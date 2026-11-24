/* 0.25 air: offline audio levels of the air sounds (LL.audio.offline renders one event in an OfflineAudioContext and
   reports peak, RMS and length). It measures; it does not listen. Also renders the old 'jump' and a 'dash' for scale.
   Env: LL_ROOT, PORT (8867). Prints JSON. */
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs'), http = require('http'), path = require('path');
const root = process.env.LL_ROOT || process.cwd(), port = +(process.env.PORT || 8867);
const types = { '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png', '.jpg': 'image/jpeg', '.css': 'text/css', '.json': 'application/json', '.mp3': 'audio/mpeg' };
const srv = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; fs.readFile(path.join(root, u), (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': types[path.extname(u)] || 'application/octet-stream' }); r.end(d); } }); }).listen(port);
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const pg = await (await b.newContext({ viewport: { width: 640, height: 400 } })).newPage(); const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  await pg.route('**/*', rt => { const u = rt.request().url(); if (u.includes('three.min.js')) return rt.fulfill({ path: '/tmp/t/node_modules/three/build/three.min.js', contentType: 'text/javascript' }); if (u.startsWith('http://localhost')) return rt.continue(); return rt.abort(); });
  await pg.goto('http://localhost:' + port + '/'); await pg.waitForTimeout(1500);
  await pg.evaluate(() => { LL.cfg.mode = 'match'; document.querySelectorAll('.hero')[0].click(); }); await pg.click('#bPlay'); await pg.waitForTimeout(2500);
  const res = await pg.evaluate(async () => {
    const W = LL.sim.W, p = W.player, cam = { x: p.x, z: p.z }, out = {};
    const as = (id) => { const d = LL.HEROES.find(h => h.id === id); return Object.assign({}, p, { def: d }); };
    const cases = { 'jump (Dora)': ['dora', { k: 'jump' }], 'jump (Anna, plain)': ['anna', { k: 'jump' }], 'second jump (Anna, rock-hop)': ['anna', { k: 'jump', dbl: true, n: 2 }],
      'second jump (Skein Doll, tuck)': ['skein', { k: 'jump', dbl: true, n: 2 }], 'hover (Myra Belle)': ['myra', { k: 'hover' }], 'hoverend release (Myra Belle)': ['myra', { k: 'hoverend', why: 'release' }],
      'dash (for scale)': ['dora', { k: 'dash' }] };
    for (const name in cases) { const u = as(cases[name][0]); const keep = W.player; W.player = u; const ev = Object.assign({ u: u }, cases[name][1]);
      const r = await LL.audio.offline(ev, W, cam, 2); W.player = keep; out[name] = r ? { peak: +r.peak.toFixed(3), rms: +r.rms.toFixed(4), seconds: +r.seconds.toFixed(2), threw: r.threw } : null; }
    return out;
  });
  console.log(JSON.stringify(res, null, 1)); console.log(errs.length ? errs.join('\n') : 'no page errors'); await b.close(); srv.close();
})().catch(e => { console.error('RUNFAIL', e); process.exit(1); });
