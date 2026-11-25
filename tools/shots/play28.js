/* 0.28 play: four frames from the play camera that show the new rules being said: a thread going slack, a thread slack,
   a hero leaving home with a light, and a fold catching the small Hush. The sim is run ahead in the page (no drawing)
   to just before each moment, then the game's own loop draws it. It shows that the words appear and nothing breaks;
   nothing is drawn in the world for these rules yet (docs/ARCHITECTURE.md, "Lessons 4 and 5").
   Run: LL_ROOT=$PWD OUT=docs/evidence PORT=8861 node tools/shots/play28.js */
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/npm-tools/node_modules/playwright');
const fs = require('fs'), http = require('http'), path = require('path');
const root = process.env.LL_ROOT || process.cwd(), out = process.env.OUT || '/tmp/t/play28', port = +(process.env.PORT || 8861);
fs.mkdirSync(out, { recursive: true });
const types = { '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; fs.readFile(path.join(root, u), (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': types[path.extname(u)] || 'application/octet-stream' }); r.end(d); } }); }).listen(port);
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await (await b.newContext({ viewport: { width: 960, height: 600 } })).newPage(); const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR: ' + e.message)); pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('CONSOLE: ' + m.text()); });
  await pg.route('**/*', rt => { const u = rt.request().url(); if (u.includes('three.min.js')) return rt.fulfill({ path: process.env.THREE_LOCAL || '/tmp/t/node_modules/three/build/three.min.js', contentType: 'text/javascript' }); if (u.startsWith('http://localhost')) return rt.continue(); return rt.abort(); });
  await pg.goto('http://localhost:' + port + '/'); await pg.waitForTimeout(2000);
  await pg.evaluate(() => { LL.cfg.mode = 'match'; document.querySelectorAll('.hero')[0].click(); });
  await pg.click('#bPlay'); await pg.waitForTimeout(3000);
  const ahead = (to) => pg.evaluate((to) => { const S = LL.sim, W = S.W; W.player.useAI = true; while (W.t < to && !W.over) { S.step(1 / 30); W.patron.forEach(p => { p.hp = p.maxHp; }); W.fx.length = 0; } W.player.useAI = false; return W.t; }, to);
  const shot = async (name) => { await pg.waitForTimeout(1800); await pg.screenshot({ path: path.join(out, name), type: 'jpeg', quality: 82 }); console.log('wrote', name); };
  await ahead(LL_T(129.9)); await shot('play-0.28-slackwarn.jpg');
  await ahead(LL_T(149.9)); await shot('play-0.28-slack.jpg');
  await pg.evaluate(() => { const W = LL.sim.W, p = W.player, sp = LL.sim.spawnPos(0, p.slot); p.x = sp.x; p.z = sp.z; p.y = 0; p.zip = null; p.hp = p.maxHp * 0.5; }); await pg.waitForFunction(() => LL.sim.W.player.ember, null, { timeout: 60000 }); await pg.waitForTimeout(600); await pg.screenshot({ path: path.join(out, 'play-0.28-light.jpg'), type: 'jpeg', quality: 82 }); console.log('wrote play-0.28-light.jpg');
  await pg.evaluate(() => { const W = LL.sim.W, p = W.player, c = W.creases[0]; c.guard.alive = false; c.cd = 0; c.t = 0; p.x = c.x; p.z = c.z; p.y = 0; p.ctl.ax = c.x + 10; p.ctl.az = c.z; p.yaw = Math.PI / 2; LL.sim.fold(p, 0); }); await shot('play-0.28-fold.jpg');
  console.log(errs.length ? errs.join('\n') : 'no page errors'); await b.close(); srv.close(); process.exit(errs.length ? 1 : 0);
})().catch(e => { console.error('RUNFAIL', e); process.exit(1); });
function LL_T(t) { return t; }
