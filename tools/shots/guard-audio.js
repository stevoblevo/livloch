/* 0.26 guard: the guard and thread sounds, measured, not heard. Each event is rendered alone in an OfflineAudioContext by
   LL.audio.offline (no drone, no music) and its peak, RMS and length are printed, with Dora's shot and Anna's rock-hop
   beside them for scale. It shows that each event makes a sound, how loud and how long; it cannot say how it sounds.
   Writes JSON to stdout after the table. Env: LL_ROOT, PORT (8860-8869). */
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs'), http = require('http'), path = require('path');
const root = process.env.LL_ROOT || process.cwd(), port = +(process.env.PORT || 8866);
const types = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
const srv = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; fs.readFile(path.join(root, u), (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': types[path.extname(u)] || 'application/octet-stream' }); r.end(d); } }); }).listen(port);
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const pg = await (await b.newContext({ viewport: { width: 640, height: 400 } })).newPage();
  await pg.route('**/*', rt => { const u = rt.request().url(); if (u.includes('three.min.js')) return rt.fulfill({ path: '/tmp/t/node_modules/three/build/three.min.js', contentType: 'text/javascript' }); if (u.startsWith('http://localhost')) return rt.continue(); return rt.abort(); });
  await pg.goto('http://localhost:' + port + '/'); await pg.waitForTimeout(1500);
  const rows = await pg.evaluate(async () => {
    const A = LL.audio, H = (id) => ({ def: LL.HEROES.find(d => d.id === id), x: 0, z: 0, y: 0, h: 1.9 }), dora = H('dora'), anna = H('anna'), skye = H('skein'), myra = H('myra'), rook = H('rook'), cam = { x: 0, z: 0 }, out = [];
    const P = (u) => ({ player: u });
    const evs = [['dora shot (scale)', { k: 'shot', u: dora, x: 0, z: 0 }, P(dora)], ['anna rock-hop (scale)', { k: 'jump', u: anna, dbl: true, n: 2 }, P(anna)],
      ['aegis raised', { k: 'guard', u: anna, kind: 'aegis' }, P(anna)], ['aegis block', { k: 'guarded', u: anna, how: 'block' }, P(anna)], ['aegis melee block', { k: 'guarded', u: anna, how: 'block', melee: true }, P(anna)],
      ['bubble opens', { k: 'guard', u: dora, kind: 'bubble' }, P(dora)], ['bubble soaks', { k: 'guarded', u: dora, how: 'absorb' }, P(dora)], ['bubble pops', { k: 'guardend', u: dora, kind: 'bubble', why: 'full' }, P(dora)],
      ['fray', { k: 'guard', u: skye, kind: 'fray' }, P(skye)], ['fray, a shot passes', { k: 'guarded', u: skye, how: 'pass' }, P(skye)],
      ['thread boost', { k: 'tboost', u: anna }, P(anna)], ['hat charged', { k: 'hatready', u: dora }, P(dora)], ['hat thrown (whirr 1.8 s)', { k: 'hatthrow', u: dora }, P(dora)],
      ['hat cuts', { k: 'hatcut', u: dora, x: 0, z: 0 }, P(dora)], ['hat home', { k: 'hatback', u: dora }, P(dora)], ['boon', { k: 'boon', u: myra, x: 0, z: 0, who: [myra], amt: 50, r: 8 }, P(myra)],
      ['barrel roll', { k: 'roll', u: rook, dir: 1 }, P(rook)], ['aegis block, another Anna 20 m off', { k: 'guarded', u: Object.assign(H('anna'), { x: 20 }), how: 'block' }, P(dora)]];
    for (const e of evs) { const r = await A.offline(e[1], e[2], cam, 3); out.push([e[0], r]); }
    return out; });
  for (const r of rows) console.log(r[0].padEnd(36), r[1] ? ('peak ' + r[1].peak.toFixed(3) + '  rms ' + r[1].rms.toFixed(4) + '  ' + r[1].seconds.toFixed(2) + ' s' + (r[1].threw ? '  THREW ' + r[1].threw : '')) : 'no OfflineAudioContext');
  console.log(JSON.stringify(Object.fromEntries(rows.map(r => [r[0], r[1] && { peak: +r[1].peak.toFixed(4), rms: +r[1].rms.toFixed(5), seconds: +r[1].seconds.toFixed(2) }])), null, 1));
  await b.close(); srv.close();
})().catch(e => { console.error('RUNFAIL', e); process.exit(1); });
