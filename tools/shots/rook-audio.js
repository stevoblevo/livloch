/* 0.25 rook: Rook Vale's sounds, measured, not heard. Each event is rendered alone in an OfflineAudioContext by
   LL.audio.offline (no drone, no music) and its peak, RMS and length are printed, with Dora's shot and the shared toll
   beside them for scale. It shows that each event makes a sound, how loud and how long; it cannot say how it sounds.
   Env: LL_ROOT, PORT (8870-8879). */
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs'), http = require('http'), path = require('path');
const root = process.env.LL_ROOT || process.cwd(), port = +(process.env.PORT || 8874);
const types = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
const srv = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; fs.readFile(path.join(root, u), (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': types[path.extname(u)] || 'application/octet-stream' }); r.end(d); } }); }).listen(port);
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const pg = await (await b.newContext({ viewport: { width: 640, height: 400 } })).newPage();
  await pg.route('**/*', rt => { const u = rt.request().url(); if (u.includes('three.min.js')) return rt.fulfill({ path: '/tmp/t/node_modules/three/build/three.min.js', contentType: 'text/javascript' }); if (u.startsWith('http://localhost')) return rt.continue(); return rt.abort(); });
  await pg.goto('http://localhost:' + port + '/'); await pg.waitForTimeout(1500);
  const rows = await pg.evaluate(async () => {
    const A = LL.audio, rook = LL.HEROES.find(d => d.id === 'rook'), dora = LL.HEROES[0], u = { def: rook }, d = { def: dora }, W = { player: u }, Wd = { player: d }, cam = { x: 0, z: 0 }, out = [];
    const evs = [['rook shot', { k: 'shot', u: u, x: 0, z: 0 }, W], ['dora shot (scale)', { k: 'shot', u: d, x: 0, z: 0 }, Wd], ['lift', { k: 'lift', u: u, x: 0, z: 0 }, W], ['glide', { k: 'glide', u: u, x: 0, z: 0 }, W],
      ['thread catch', { k: 'liftthread', u: u }, W], ['landing', { k: 'liftland', u: u }, W], ['Landing Bell rung', { k: 'cast', u: u, i: 2, kind: 'zone' }, W], ['Landing Bell tolls', { k: 'toll', x: 0, z: 0, r: 7.5, col: rook.col }, W],
      ['shared toll (scale)', { k: 'toll', x: 0, z: 0, r: 13, col: 0xb48cf0 }, W], ['lift, another Rook 20 m off', { k: 'lift', u: { def: rook }, x: 20, z: 0 }, W]];
    for (const e of evs) { const r = await A.offline(e[1], e[2], cam, 4.5); out.push([e[0], r]); }
    return out; });
  for (const r of rows) console.log(r[0].padEnd(30), r[1] ? ('peak ' + r[1].peak.toFixed(3) + '  rms ' + r[1].rms.toFixed(4) + '  ' + r[1].seconds.toFixed(2) + ' s' + (r[1].threw ? '  THREW ' + r[1].threw : '')) : 'no OfflineAudioContext');
  await b.close(); srv.close();
})().catch(e => { console.error('RUNFAIL', e); process.exit(1); });
