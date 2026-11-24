// Guardian Fox evidence pass for PR #6 (0.11 candidate). Run: node tools/fox-evidence.js
// Drives the real page in headless Chrome and saves frames to docs/evidence/.
// What this proves: the fox renders, follows, points its thread at a laden thief, hides the thread
// when no thief carries light, obeys the real Settings toggle (which persists across a reload),
// shows in Lean Back, and renders with reduced motion on. Frame-rate numbers are from headless
// SwiftShader and say nothing about a real device. Nothing here proves how the game feels.
const fs = require('fs'), http = require('http'), path = require('path');
let chromium; try { chromium = require('playwright-core').chromium; } catch (e) { chromium = require('/home/hatch/workspace/pw-tools/node_modules/playwright-core').chromium; }
const root = path.join(__dirname, '..'), out = path.join(root, 'docs', 'evidence');
fs.mkdirSync(out, { recursive: true });
const three = process.env.THREE_JS || '/home/hatch/workspace/pw-tools/three.min.js';
const mime = { '.js': 'text/javascript', '.jpg': 'image/jpeg', '.html': 'text/html' };
const srv = http.createServer((q, r) => { const u = q.url.split('?')[0], p = path.join(root, u === '/' ? 'index.html' : u); fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': mime[path.extname(p)] || 'application/octet-stream' }); r.end(d); } }); }).listen(8767);
const report = [];
const log = (s) => { report.push(s); console.log(s); };
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/home/hatch/workspace/cft/chrome-linux64/chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const newPage = async (opts) => {
    const ctx = await b.newContext(opts || { viewport: { width: 1280, height: 720 } });
    const pg = await ctx.newPage(); const errs = [];
    pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|Failed to load resource/.test(m.text())) errs.push(m.text()); });
    await pg.route('**/*', rt => { const u = rt.request().url(); if (u.includes('three.min.js')) return rt.fulfill({ path: three, contentType: 'text/javascript' }); if (u.startsWith('http://localhost')) return rt.continue(); return rt.abort(); });
    return { ctx, pg, errs };
  };
  const start = async (pg, lean) => {
    await pg.goto('http://localhost:8767/');
    await pg.waitForTimeout(1200);
    if (lean) await pg.click('#cLean');
    await pg.evaluate(() => document.querySelectorAll('#heroes .hero')[0].click());
    await pg.click('#bPlay');
    await pg.waitForTimeout(900);
    await pg.evaluate(() => { LL.input.lockFailed = true; window.__keep = setInterval(() => { const W = LL.sim.W; if (!W) return; W.heroes.forEach(h => { h.hp = h.maxHp; }); W.patron.forEach(p => { p.hp = p.maxHp; }); W.thiefT = 1e9; }, 50); });
  };
  const unlock = (pg) => pg.evaluate(() => { LL.cfg.petUnlocked = true; LL.cfg.pet = true; LL.ui.petStatus(); LL.gfx.setPet(true); return { unlocked: LL.cfg.petUnlocked, pet: LL.cfg.pet, enabled: LL.gfx.petEnabled, boxDisabled: document.querySelector('#oPet').disabled, boxChecked: document.querySelector('#oPet').checked }; });
  const shot = async (pg, name, note) => { await pg.screenshot({ path: path.join(out, name + '.jpg'), type: 'jpeg', quality: 82 }); log(name + '.jpg | ' + note); };
  const look = async (pg, k) => { await pg.evaluate(k => { if (LL.cfg.look !== k) document.querySelector('#looks2 [data-look="' + k + '"]').click(); }, k); await pg.waitForTimeout(700); };
  // Build the theft scene: a thief snuffs the outer guardian, then is pinned in front of the player, laden (state 1, carrying).
  const theftScene = async (pg) => {
    return pg.evaluate(async () => { const S = LL.sim, W = S.W, p = W.player, g = W.st[0][1].outer, wait = ms => new Promise(r => setTimeout(r, ms));
      W.thieves.forEach(t => { t.alive = false; }); W.troopers.forEach(u => { if (u.team === 1) u.alive = false; });
      p.x = 0; p.z = -8; p.y = 0; p.zip = null; p.useAI = false; LL.dbg.view.yaw = 0; LL.dbg.view.pitch = -0.05;
      S._t.spawnThief(); const t = W.thieves[W.thieves.length - 1]; t.mark = g; t.x = g.x + 4; t.z = g.z; t.speed = 8.4;
      for (let i = 0; i < 40 && !(t.carry === g && t.state === 1); i++) await wait(100);
      const got = { carry: t.carry === g, state: t.state, dark: g.dark };
      t.x = 3; t.z = 3; t.speed = 0; window.__t = t;
      window.__pin = setInterval(() => { const tt = window.__t; if (tt && tt.alive) { tt.x = 3; tt.z = 3; } const pp = LL.sim.W.player; pp.x = 0; pp.z = -8; }, 30);
      return got; });
  };

  /* ---- desktop, normal motion ---- */
  {
    const { ctx, pg, errs } = await newPage();
    await start(pg, false);
    const u = await unlock(pg); log('unlock state: ' + JSON.stringify(u));
    const sc = await theftScene(pg); log('theft scene: ' + JSON.stringify(sc));
    await pg.waitForTimeout(800);
    await shot(pg, 'fox-tether-snow', 'fox beside the player, thread to the laden thief at (3,3); guardian dark=' + sc.dark + ', thief state=' + sc.state);
    await look(pg, 'ink'); await shot(pg, 'fox-tether-ink', 'same scene, Inkblot Noir look');
    await look(pg, 'memory'); await shot(pg, 'fox-tether-memory', 'same scene, Memory look');
    await look(pg, 'snow');
    // idle: no thief carries anything -> fox present, no thread
    await pg.evaluate(() => { clearInterval(window.__pin); LL.sim.W.thieves.forEach(t => { t.alive = false; }); });
    await pg.waitForTimeout(600);
    await shot(pg, 'fox-idle-snow', 'fox present with no laden thief: no thread should be drawn');
    // fps, pet on vs off, same idle scene (headless SwiftShader numbers only)
    const fps = await pg.evaluate(async () => { const meas = () => new Promise(res => { const ts = []; let last = performance.now(); const loop = (n) => { ts.push(n - last); last = n; if (ts.length < 240) requestAnimationFrame(loop); else { ts.sort((a, b2) => a - b2); res({ medianMs: +ts[120].toFixed(2), meanMs: +(ts.reduce((a, x) => a + x, 0) / ts.length).toFixed(2) }); } }; requestAnimationFrame(loop); });
      const on = await meas(); LL.gfx.setPet(false); const off = await meas(); LL.gfx.setPet(true); return { on, off }; });
    log('fps (SwiftShader, idle scene): pet on median ' + fps.on.medianMs + ' ms mean ' + fps.on.meanMs + ' ms; pet off median ' + fps.off.medianMs + ' ms mean ' + fps.off.meanMs + ' ms');
    // real Settings toggle: pause, click the actual #oPet checkbox, resume
    await pg.keyboard.press('KeyP'); await pg.waitForTimeout(500);
    await shot(pg, 'fox-settings-on', 'pause > Settings with the fox unlocked: checkbox enabled and checked');
    await pg.evaluate(() => document.querySelector('#oPet').click());
    await pg.waitForTimeout(200);
    const offState = await pg.evaluate(() => ({ pet: LL.cfg.pet, enabled: LL.gfx.petEnabled, saved: JSON.parse(localStorage.getItem('livelock.v1')).pet }));
    log('after toggle off: ' + JSON.stringify(offState));
    await pg.keyboard.press('KeyP'); await pg.waitForTimeout(600);
    await shot(pg, 'fox-off-snow', 'fox toggled off in Settings: no fox beside the player');
    await pg.keyboard.press('KeyP'); await pg.waitForTimeout(400);
    await pg.evaluate(() => document.querySelector('#oPet').click());
    await pg.keyboard.press('KeyP'); await pg.waitForTimeout(600);
    const onState = await pg.evaluate(() => ({ pet: LL.cfg.pet, enabled: LL.gfx.petEnabled, saved: JSON.parse(localStorage.getItem('livelock.v1')).pet, savedUnlocked: JSON.parse(localStorage.getItem('livelock.v1')).petUnlocked }));
    log('after toggle back on: ' + JSON.stringify(onState));
    await shot(pg, 'fox-on-again-snow', 'fox toggled back on in Settings: fox returns');
    log('desktop script errors: ' + (errs.length ? errs.slice(0, 5).join(' / ') : 'none'));
    // persistence: reload the page entirely; the saved toggle + unlock must come back on their own
    await start(pg, false);
    const persisted = await pg.evaluate(() => ({ unlocked: LL.cfg.petUnlocked, pet: LL.cfg.pet, enabled: LL.gfx.petEnabled, boxDisabled: document.querySelector('#oPet').disabled, boxChecked: document.querySelector('#oPet').checked }));
    log('after full reload + new match: ' + JSON.stringify(persisted));
    await pg.evaluate(() => { const W = LL.sim.W, p = W.player; p.x = 0; p.z = -8; p.useAI = false; LL.dbg.view.yaw = 0; LL.dbg.view.pitch = -0.05; });
    await pg.waitForTimeout(700);
    await shot(pg, 'fox-persisted-snow', 'after a full page reload: fox restored from the saved setting, no manual re-enable');
    await ctx.close();
  }

  /* ---- Lean Back: the fox shows while the hero plays itself ---- */
  {
    const { ctx, pg, errs } = await newPage();
    await start(pg, true);
    await unlock(pg);
    const st = await pg.evaluate(() => ({ lean: LL.sim.W.lean, auto: LL.sim.W.auto, playerAI: LL.sim.W.player.useAI }));
    await pg.waitForTimeout(1200);
    await shot(pg, 'fox-leanback-snow', 'Lean Back world (lean=' + st.lean + ', hero plays itself=' + st.playerAI + '): fox visible beside the hero');
    log('leanback state: ' + JSON.stringify(st) + '; errors: ' + (errs.length ? errs.slice(0, 3).join(' / ') : 'none'));
    await ctx.close();
  }

  /* ---- reduced motion ---- */
  {
    const { ctx, pg, errs } = await newPage({ viewport: { width: 1280, height: 720 }, reducedMotion: 'reduce' });
    await start(pg, false);
    await unlock(pg);
    const red = await pg.evaluate(() => LL.gfx.reduced);
    await pg.evaluate(() => { const W = LL.sim.W, p = W.player; p.x = 0; p.z = -8; p.useAI = false; LL.dbg.view.yaw = 0; LL.dbg.view.pitch = -0.05; });
    await pg.waitForTimeout(700);
    await shot(pg, 'fox-reduced-snow', 'prefers-reduced-motion emulated; gfx.reduced=' + red + ' (fox bob and tail sway are disabled in code when this is set)');
    log('reduced state: gfx.reduced=' + red + '; errors: ' + (errs.length ? errs.slice(0, 3).join(' / ') : 'none'));
    await ctx.close();
  }

  /* ---- phone frame of the theft scene ---- */
  {
    const { ctx, pg, errs } = await newPage({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    await pg.goto('http://localhost:8767/'); await pg.waitForTimeout(1200);
    await pg.evaluate(() => document.querySelectorAll('#heroes .hero')[0].click());
    await pg.tap('#bPlay'); await pg.waitForTimeout(900);
    await pg.evaluate(() => { LL.input.lockFailed = true; window.__keep = setInterval(() => { const W = LL.sim.W; if (!W) return; W.heroes.forEach(h => { h.hp = h.maxHp; }); W.patron.forEach(p => { p.hp = p.maxHp; }); W.thiefT = 1e9; }, 50); });
    await unlock(pg);
    const sc = await theftScene(pg);
    await pg.waitForTimeout(800);
    await shot(pg, 'fox-tether-phone', 'phone viewport, theft scene: carry=' + sc.carry + ', state=' + sc.state);
    log('phone errors: ' + (errs.length ? errs.slice(0, 3).join(' / ') : 'none'));
    await ctx.close();
  }

  fs.writeFileSync(path.join(out, 'fox-capture-log.txt'), report.join('\n') + '\n');
  await b.close(); srv.close();
})().catch(e => { console.error('FOX EVIDENCE RUN FAILED', e); process.exit(1); });
