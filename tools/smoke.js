/* Browser smoke test (issue #28). Serves this folder on a local port, opens the game in headless Chromium through
   Playwright, and exits 1 if any page error or console error appears while it:
     1. loads the title screen and checks LL.gfx.ok (WebGL came up);
     2. starts a First Rain (Walk in) and lets it run about ten seconds;
     3. switches through all eight views (LL.C.LENSES) and draws a few frames in each;
     4. turns Lighter graphics on and draws again;
     5. pauses, quits to the title, and draws the title again.
   It proves the page boots and draws, not how it looks or feels.

   Run locally:  npm i --no-save playwright && npx playwright install chromium && node tools/smoke.js
   CI runs the same (.github/workflows/ci.yml, job "Browser smoke test").
   Env: PORT (default 8790), PLAYWRIGHT (a path to require if playwright is installed elsewhere), THREE_LOCAL (a local
   three.min.js to serve instead of the cdnjs copy, for machines without the network), SHOT (write a screenshot here). */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), port = +(process.env.PORT || 8790);
let pw; try { pw = require(process.env.PLAYWRIGHT || 'playwright'); } catch (e) { console.error('Playwright is not installed: npm i --no-save playwright && npx playwright install chromium'); process.exit(2); }
const types = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.mp4': 'video/mp4', '.woff2': 'font/woff2' };
const srv = http.createServer(function (q, r) {
  let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html';
  const f = path.join(root, path.normalize(u)); if (f.indexOf(root) !== 0) { r.writeHead(403); r.end(); return; }
  fs.readFile(f, function (e, d) { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); r.end(d); } });
}).listen(port);

const problems = [], steps = [];
const step = function (s) { steps.push(s); console.log('·', s); };
(async function () {
  const b = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const pg = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  pg.on('pageerror', function (e) { problems.push('page error: ' + String(e && e.stack || e).slice(0, 600)); });
  pg.on('console', function (m) { if (m.type() === 'error') problems.push('console error: ' + m.text().slice(0, 400)); });
  pg.on('requestfailed', function (q) { const u = q.url(); if (u.indexOf('localhost') >= 0 && !/favicon/.test(u)) problems.push('failed request: ' + u + ' (' + (q.failure() && q.failure().errorText) + ')'); });
  pg.on('response', function (r) { const u = r.url(); if (u.indexOf('localhost') >= 0 && r.status() >= 400 && !/favicon/.test(u)) problems.push('HTTP ' + r.status() + ': ' + u); });
  if (process.env.THREE_LOCAL) await pg.route('**/three.min.js', function (rt) { return rt.fulfill({ path: process.env.THREE_LOCAL, contentType: 'text/javascript' }); });
  const wait = function (ms) { return pg.waitForTimeout(ms); };

  await pg.goto('http://localhost:' + port + '/', { waitUntil: 'load', timeout: 60000 }); await wait(2500);
  const ok = await pg.evaluate(function () { return !!(window.LL && LL.gfx && LL.gfx.ok); });
  if (!ok) problems.push('LL.gfx.ok is false: WebGL did not come up');
  step('title loaded, gfx ok ' + ok);

  await pg.click('#bPlay'); await wait(2000);
  const t0 = await pg.evaluate(function () { return LL.sim.W ? LL.sim.W.t : 0; }); await wait(8000);
  /* A software renderer draws a few frames a second, so match time moves slowly here: the test asks that it moves. */
  const play = await pg.evaluate(function () { const W = LL.sim.W; return { player: !!(W && W.player), t: W ? +W.t.toFixed(2) : 0, hud: !document.getElementById('hud').hidden }; });
  if (!play.player || !play.hud || !(play.t > t0)) problems.push('the match did not run: ' + JSON.stringify(play) + ' (was ' + t0 + ')');
  step('First Rain ran from ' + t0.toFixed(2) + ' s to ' + play.t + ' s of match time, HUD shown ' + play.hud);

  const looks = await pg.evaluate(function () { return LL.C.LENSES.slice(); });
  for (const l of looks) { await pg.evaluate(function (id) { document.body.setAttribute('data-look', id); LL.gfx.setLook(id); }, l); await wait(700); }
  step('drew all ' + looks.length + ' views: ' + looks.join(', '));

  await pg.evaluate(function () { LL.gfx.setQuality(true); }); await wait(1200);
  step('Lighter graphics drew');
  if (process.env.SHOT) await pg.screenshot({ path: process.env.SHOT });

  /* The game canvas sits over the HUD for pointer lock, so the buttons are pressed as the page's own handlers would be. */
  await pg.evaluate(function () { document.getElementById('bPause').click(); }); await wait(500);
  await pg.evaluate(function () { document.getElementById('bQuit').click(); }); await wait(1500);
  const title = await pg.evaluate(function () { return !document.getElementById('title').hidden; });
  if (!title) problems.push('quitting did not return to the title');
  step('back at the title ' + title);

  await b.close(); srv.close();
  if (problems.length) { console.error('\nSMOKE FAILED (' + problems.length + '):\n' + problems.join('\n')); process.exit(1); }
  console.log('\nsmoke ok: ' + steps.length + ' steps, no page or console errors');
})().catch(function (e) { console.error('SMOKE RUN FAILED', e); try { srv.close(); } catch (x) {} process.exit(1); });
