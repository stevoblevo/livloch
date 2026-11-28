/* 0.29 feel: the sounds of the four 0.28 rules, measured, not heard. Each event is rendered alone in an
   OfflineAudioContext by LL.audio.offline (no drone, no music) and its peak, RMS and length are printed, with Dora's
   shot, a fold and the shared toll beside them for scale. It shows each event makes a sound, how loud and how long;
   it cannot say how it sounds. Env: LL_ROOT (default this checkout), PORT (8870-8874). */
'use strict';
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/npm-tools/node_modules/playwright');
const fs = require('fs'), http = require('http'), path = require('path');
const root = process.env.LL_ROOT || path.join(__dirname, '..', '..'), port = +(process.env.PORT || 8874);
const types = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
const srv = http.createServer(function (q, r) { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; fs.readFile(path.join(root, u), function (e, d) { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': types[path.extname(u)] || 'application/octet-stream' }); r.end(d); } }); }).listen(port);
(async function () {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const pg = await (await b.newContext({ viewport: { width: 640, height: 400 } })).newPage();
  await pg.route('**/*', function (rt) { const u = rt.request().url(); if (u.includes('three.min.js')) return rt.fulfill({ path: process.env.THREE_LOCAL || '/tmp/t/node_modules/three/build/three.min.js', contentType: 'text/javascript' }); if (u.startsWith('http://localhost')) return rt.continue(); return rt.abort(); });
  await pg.goto('http://localhost:' + port + '/'); await pg.waitForTimeout(1500);
  const rows = await pg.evaluate(async function () {
    const A = LL.audio, dora = LL.HEROES[0], me = { def: dora, team: 0, x: 0, z: 0 }, W = { player: me }, cam = { x: 0, z: 0 }, out = [];
    const house = { x: 0, z: 0, team: 0, kind: 'guardian' }, small = { big: false }, big = { big: true };
    const evs = [['dora shot (scale)', { k: 'shot', u: me, x: 0, z: 0 }], ['fold (scale)', { k: 'fold', x: 0, z: 0 }], ['shared toll (scale)', { k: 'toll', x: 0, z: 0, r: 13, col: 0xb48cf0 }],
      ['arrive, yours, struck 3', { k: 'arrive', u: me, x: 0, z: 0, n: 3, lane: 1 }], ['arrive, an ally 25 m off', { k: 'arrive', u: { def: dora, team: 0 }, x: 25, z: 0, n: 0, lane: 1 }],
      ['caught (small Hush crumples)', { k: 'caught', u: small, x: 5, z: 0, i: 0 }], ['death, creased small', { k: 'death', kind: 'trooper', u: small, team: 1, x: 5, z: 0, creased: true }],
      ['pinned (hollow)', { k: 'pinned', u: big, x: 8, z: 0 }], ['unpinned', { k: 'unpinned', u: big, x: 8, z: 0 }],
      ['ember (light taken)', { k: 'ember', u: me, p: true }], ['mended', { k: 'mended', u: me, s: house, amt: 700, relit: false, p: true }], ['mended, relit', { k: 'mended', u: me, s: house, amt: 900, relit: true, p: true }],
      ['brightend (house 10 m off)', { k: 'brightend', u: { x: 10, z: 0 } }],
      ['slackwarn', { k: 'slackwarn', lane: 1, in: 20 }], ['slack', { k: 'slack', lane: 1, t: 50, n: 1 }],
      ['slackend, Hush house fell', { k: 'slackend', lane: 1, fell: 1, broke: 1 }], ['slackend, yours fell', { k: 'slackend', lane: 1, fell: 0, broke: 0 }], ['slackend, time', { k: 'slackend', lane: 1 }]];
    for (const e of evs) { const r = await A.offline(e[1], W, cam, 4); out.push([e[0], r]); }
    return out; });
  for (const r of rows) console.log(r[0].padEnd(32), r[1] ? ('peak ' + r[1].peak.toFixed(3) + '  rms ' + r[1].rms.toFixed(4) + '  ' + r[1].seconds.toFixed(2) + ' s' + (r[1].threw ? '  THREW ' + r[1].threw : '')) : 'no OfflineAudioContext');
  await b.close(); srv.close();
})().catch(function (e) { console.error('RUNFAIL', e); process.exit(1); });
