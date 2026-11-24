/* Music and mute check (0.21): loads the game, clicks once (browsers start audio only after a gesture), and reports
   which cue each deck is playing on the title, in a match, when the fight heats up, in red rain, after a mute, and at
   the end. It proves wiring, not sound: headless Chrome plays to a fake output. Screenshots of the mute button go to
   OUT. Env: LL_ROOT, PORT (8776), OUT (/tmp/t/music). */
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs'), http = require('http'), path = require('path'), root = process.env.LL_ROOT || process.cwd(), port = +(process.env.PORT || 8776), out = process.env.OUT || '/tmp/t/music';
fs.mkdirSync(out, { recursive: true });
const types = { '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4' };
const srv = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; const f = path.join(root, u); fs.stat(f, (e, st) => { if (e) { r.writeHead(404); return r.end(); }
  const range = q.headers.range, ty = types[path.extname(u)] || 'application/octet-stream';
  if (range) { const m = /bytes=(\d*)-(\d*)/.exec(range); const s = +m[1] || 0, en = m[2] ? +m[2] : st.size - 1; r.writeHead(206, { 'content-type': ty, 'content-range': 'bytes ' + s + '-' + en + '/' + st.size, 'accept-ranges': 'bytes', 'content-length': en - s + 1 }); fs.createReadStream(f, { start: s, end: en }).pipe(r); }
  else { r.writeHead(200, { 'content-type': ty, 'accept-ranges': 'bytes', 'content-length': st.size }); fs.createReadStream(f).pipe(r); } }); }).listen(port);
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const pg = await (await b.newContext({ viewport: { width: 960, height: 540 } })).newPage(); const errs = [];
  pg.on('pageerror', e => errs.push(e.message)); pg.on('requestfailed', q => { if (q.url().startsWith('http://localhost')) errs.push('failed ' + q.url()); }); pg.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED/.test(m.text())) errs.push(m.text().slice(0, 200)); }); // ERR_FAILED: outside requests this script blocks on purpose
  await pg.route('**/*', rt => { const u = rt.request().url(); if (u.includes('three.min.js')) return rt.fulfill({ path: '/tmp/t/node_modules/three/build/three.min.js', contentType: 'text/javascript' }); if (u.startsWith('http://localhost')) return rt.continue(); return rt.abort(); });
  await pg.goto('http://localhost:' + port + '/'); await pg.waitForTimeout(1500);
  const st = async (label) => console.log(label.padEnd(16), JSON.stringify(await pg.evaluate(() => Object.assign(LL.audio.state(), { muted: LL.audio.muted, ctx: LL.audio.on }))));
  await st('before gesture');
  await pg.mouse.click(480, 500); await pg.waitForTimeout(3500); await st('title');
  await pg.screenshot({ path: out + '/title-mute.png' });
  await pg.keyboard.press('KeyM'); await pg.waitForTimeout(300); await st('muted (M)');
  await pg.screenshot({ path: out + '/title-muted.png', clip: { x: 860, y: 0, width: 100, height: 80 } });
  await pg.click('#bMute'); await pg.waitForTimeout(300); await st('unmuted (click)');
  await pg.evaluate(() => { LL.cfg.mode = 'match'; }); await pg.click('#bPlay'); await pg.waitForTimeout(4500); await st('match');
  await pg.screenshot({ path: out + '/hud.png' });
  // heat: the player keeps getting hurt
    for (let i = 0; i < 8; i++) { await pg.evaluate(() => { const W = LL.sim.W, p = W.player; p.lastHurt = W.t; }); await pg.waitForTimeout(500); }
  await st('fight');
  await pg.evaluate(() => { LL.sim.W.red = 30; }); await pg.waitForTimeout(4000); await st('red rain');
  await pg.evaluate(() => { LL.sim.W.red = 0; }); await pg.keyboard.press('Escape'); await pg.waitForTimeout(600); await st('paused');
  await pg.evaluate(() => { LL.audio.fx({ k: 'over', winner: 0 }, LL.sim.W, { x: 0, z: 0 }); }); await pg.waitForTimeout(2000); await st('victory');
  console.log(errs.length ? 'errors:\n' + errs.join('\n') : 'no page errors'); await b.close(); srv.close();
})().catch(e => { console.error('RUNFAIL', e); process.exit(1); });
