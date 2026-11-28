/* 0.30 play: two frames from the play camera that show the tide's take being said: ten seconds before a slack thread
   pulls tight ("will take your guardian") and the take itself. Even. The sim is run ahead in the page (no drawing) to
   just before each moment with the two front houses of the slack thread held at 40% (the Reign's) and 80% (the Hush's),
   then the game's own loop draws it. It shows that the words appear and nothing breaks; nothing is drawn in the world
   for this rule yet (docs/ARCHITECTURE.md, "The tide takes a house").
   Run: LL_ROOT=$PWD OUT=docs/evidence PORT=8861 node tools/shots/play30.js */
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/npm-tools/node_modules/playwright');
const fs = require('fs'), http = require('http'), path = require('path');
const root = process.env.LL_ROOT || process.cwd(), out = process.env.OUT || '/tmp/t/play30', port = +(process.env.PORT || 8861);
fs.mkdirSync(out, { recursive: true });
const types = { '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; fs.readFile(path.join(root, u), (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': types[path.extname(u)] || 'application/octet-stream' }); r.end(d); } }); }).listen(port);
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await (await b.newContext({ viewport: { width: 960, height: 600 } })).newPage(); const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR: ' + e.message)); pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('CONSOLE: ' + m.text()); });
  await pg.route('**/*', rt => { const u = rt.request().url(); if (u.includes('three.min.js')) return rt.fulfill({ path: process.env.THREE_LOCAL || '/tmp/t/node_modules/three/build/three.min.js', contentType: 'text/javascript' }); if (u.startsWith('http://localhost')) return rt.continue(); return rt.abort(); });
  await pg.goto('http://localhost:' + port + '/'); await pg.waitForTimeout(2000);
  await pg.evaluate(() => { LL.cfg.mode = 'match'; LL.cfg.diff = 1; document.querySelectorAll('.hero')[0].click(); });
  await pg.click('#bPlay'); await pg.waitForTimeout(3000);
  const ahead = (left) => pg.evaluate((left) => { const S = LL.sim, W = S.W, C = LL.C; W.player.useAI = true;
    while (!W.over && !(W.slack.t > 0 && W.slack.t <= left)) { S.step(1 / 30); W.patron.forEach(p => { p.hp = p.maxHp; }); W.heroes.forEach(h => { if (h.alive) h.hp = h.maxHp; });
      if (W.slack.lane >= 0) { const a = W.st[0][W.slack.lane].outer, b = W.st[1][W.slack.lane].outer; a.hp = a.maxHp * 0.4; b.hp = b.maxHp * 0.8; } W.fx.length = 0; }
    W.player.useAI = false; return { t: W.t, left: W.slack.t, lane: W.slack.lane, take: S.tideTake() && S.tideTake().team }; }, left);
  const shot = async (name) => { await pg.waitForTimeout(1800); await pg.screenshot({ path: path.join(out, name), type: 'jpeg', quality: 82 }); console.log('wrote', name); };
  console.log(JSON.stringify(await ahead(LL.last + 0.15))); await shot('play-0.30-last.jpg');
  console.log(JSON.stringify(await ahead(0.15))); await shot('play-0.30-take.jpg');
  console.log(JSON.stringify(await pg.evaluate(() => { const W = LL.sim.W, l = W.slack.lane; return { t: W.t, slack: W.slack.t, mine: W.st[0][l].outer.alive, theirs: W.st[1][l].outer.alive }; })));
  console.log(errs.length ? errs.join('\n') : 'no page errors'); await b.close(); srv.close(); process.exit(errs.length ? 1 : 0);
})().catch(e => { console.error('RUNFAIL', e); process.exit(1); });
const LL = { last: 10 };
