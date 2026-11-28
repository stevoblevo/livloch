/* 0.30 feel: every rule sound (and a few of the game's own for scale) rendered alone in an OfflineAudioContext by
   LL.audio.offline (no drone, no music) and written to WAV, so they can be measured (tools/shots/feel30-audio.py) and
   listened to. The rendered buffer is caught by wrapping OfflineAudioContext, so an older checkout (ROOT) works too.
   Random parts (noise offsets, crumple timing) are seeded, so a before and an after differ only by the code.
   Env: CUE (a music cue whose key the effects follow, e.g. battle-1; 0.30 and later), ROOT (checkout to serve, default this one), OUT (/tmp/feel30-audio/<TAG>), TAG (after|before), PORT (8874). */
'use strict';
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/npm-tools/node_modules/playwright');
const fs = require('fs'), http = require('http'), path = require('path');
const root = process.env.ROOT || path.join(__dirname, '..', '..'), port = +(process.env.PORT || 8874), TAG = process.env.TAG || 'after';
const out = process.env.OUT || path.join('/tmp/feel30-audio', TAG); fs.mkdirSync(out, { recursive: true });
const types = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
const srv = http.createServer(function (q, r) { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; fs.readFile(path.join(root, u), function (e, d) { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': types[path.extname(u)] || 'application/octet-stream' }); r.end(d); } }); }).listen(port);
function wav(f, x, sr) {
  const n = x.length, b = Buffer.alloc(44 + n * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(x[i] * 32767))), 44 + i * 2); fs.writeFileSync(f, b);
}
(async function () {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const pg = await (await b.newContext({ viewport: { width: 640, height: 400 } })).newPage();
  await pg.route('**/*', function (rt) { const u = rt.request().url(); if (u.includes('three.min.js')) return rt.fulfill({ path: process.env.THREE_LOCAL || '/tmp/t/node_modules/three/build/three.min.js', contentType: 'text/javascript' }); if (u.startsWith('http://localhost')) return rt.continue(); return rt.abort(); });
  await pg.addInitScript(function () {
    const OC = window.OfflineAudioContext; if (!OC) return;
    window.OfflineAudioContext = function (a, b, c) { const o = new OC(a, b, c), sr = o.startRendering.bind(o); o.startRendering = function () { return sr().then(function (buf) { window.__buf = Array.from(buf.getChannelData(0)); return buf; }); }; return o; };
  });
  await pg.goto('http://localhost:' + port + '/'); await pg.waitForTimeout(1500);
  const names = await pg.evaluate(function () {
    let s = 12345; Math.random = function () { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
    const dora = LL.HEROES[0], me = { def: dora, team: 0, x: 0, z: 0 }, W = { player: me }, cam = { x: 0, z: 0 };
    const house = { x: 0, z: 0, team: 0, kind: 'guardian' }, small = { big: false }, big = { big: true };
    window.__evs = [['ref-shot-dora', { k: 'shot', u: me, x: 0, z: 0 }], ['ref-fold', { k: 'fold', x: 0, z: 0 }], ['ref-toll', { k: 'toll', x: 0, z: 0, r: 13, col: 0xb48cf0 }],
      ['ref-soul-secured', { k: 'soul', kind: 'secured', p: true }],
      ['arrive-yours', { k: 'arrive', u: me, x: 0, z: 0, n: 3, lane: 1 }], ['arrive-ally-25m', { k: 'arrive', u: { def: dora, team: 0 }, x: 25, z: 0, n: 0, lane: 1 }],
      ['caught', { k: 'caught', u: small, x: 5, z: 0, i: 0 }], ['death-creased', { k: 'death', kind: 'trooper', u: small, team: 1, x: 5, z: 0, creased: true }],
      ['pinned', { k: 'pinned', u: big, x: 8, z: 0 }], ['unpinned', { k: 'unpinned', u: big, x: 8, z: 0 }],
      ['ember', { k: 'ember', u: me, p: true }], ['mended', { k: 'mended', u: me, s: house, amt: 700, relit: false, p: true }], ['mended-relit', { k: 'mended', u: me, s: house, amt: 900, relit: true, p: true }],
      ['brightend-10m', { k: 'brightend', u: { x: 10, z: 0 } }],
      ['slackwarn', { k: 'slackwarn', lane: 1, in: 20 }], ['slack', { k: 'slack', lane: 1, t: 50, n: 1 }],
      ['slackend-hush-fell', { k: 'slackend', lane: 1, fell: 1, broke: 1 }], ['slackend-yours-fell', { k: 'slackend', lane: 1, fell: 0, broke: 0 }], ['slackend-time', { k: 'slackend', lane: 1 }]];
    window.__W = W; window.__cam = cam; return window.__evs.map(function (e) { return e[0]; });
  });
  for (let i = 0; i < names.length; i++) {
    const x = await pg.evaluate(async function (a) { const i = a[0]; if (a[1] && LL.audio.key) LL.audio.key(a[1]); window.__buf = null; await LL.audio.offline(window.__evs[i][1], window.__W, window.__cam, 4); return window.__buf; }, [i, process.env.CUE || '']);
    if (!x) { console.log(names[i], 'no buffer'); continue; }
    wav(path.join(out, names[i] + '.wav'), x, 44100); console.log(TAG, names[i], 'written');
  }
  await b.close(); srv.close();
})().catch(function (e) { console.error('RUNFAIL', e); process.exit(1); });
