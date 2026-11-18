// Regression tests for the rules in handoff issue #3. Run: node tools/test.js
// These drive the real sim headless. They prove rule logic, not feel, art or sound.
const path = require('path'), fs = require('fs'), assert = require('assert');
require(path.join(__dirname, '..', 'js', 'core.js')); require(path.join(__dirname, '..', 'js', 'sim.js'));
const S = LL.sim, C = LL.C; let pass = 0, fail = 0;
const world = (o) => S.newWorld(Object.assign({ heroPick: 0, difficulty: 1, auto: true, seed: 5 }, o || {}));
const keepAlive = (W) => { W.patron.forEach(p => { p.hp = p.maxHp; }); W.heroes.forEach(h => { if (h.alive) h.hp = h.maxHp; }); };
function run(W, secs, each) { const out = []; for (let i = 0; i < secs * 30 && !W.over; i++) { if (each) each(W); S.step(1 / 30); for (const e of W.fx) out.push(Object.assign({ at: W.t }, e)); W.fx.length = 0; } return out; }
function test(name, fn) { try { fn(); pass++; console.log('PASS ', name); } catch (e) { fail++; console.log('FAIL ', name, '\n      ', e.message); } }

test('the Hush fields no heroes; the Reign fields exactly three', () => {
  for (const d of [0, 1, 2]) { const W = world({ difficulty: d }); assert.strictEqual(W.heroes.length, 3); assert.ok(W.heroes.every(h => h.team === 0)); run(W, 60); assert.ok(W.units.every(u => !(u.kind === 'hero' && u.team === 1))); }
});
test('Last Breath fires once per life, and again after a respawn', () => {
  const W = world(), h = W.player; let n = 0; const hit = (to) => { S._t.damage(h, h.hp - h.maxHp * to, null, 'unit'); n += W.fx.filter(e => e.k === 'lastbreath').length; W.fx.length = 0; };
  hit(0.25); assert.strictEqual(n, 1, 'first drop under 30%'); h.hp = h.maxHp; h.shield = 0; hit(0.2); assert.strictEqual(n, 1, 'second drop in the same life must not fire');
  h.shield = 0; S._t.damage(h, 1e6, null, 'unit'); W.fx.length = 0; assert.ok(!h.alive); run(W, 60, w => { w.patron.forEach(p => { p.hp = p.maxHp; }); }); assert.ok(h.alive, 'respawned');
  n = 0; h.hp = h.maxHp; h.shield = 0; hit(0.25); assert.strictEqual(n, 1, 'fires again in the next life');
});
test('Mercy is on at exactly a two-structure deficit and off otherwise', () => {
  const chk = (rd, hd) => { const W = world(); W.structs.filter(s => s.team === 0 && s.kind === 'guardian').slice(0, rd).forEach(s => { s.alive = false; }); W.structs.filter(s => s.team === 1 && s.kind === 'guardian').slice(0, hd).forEach(s => { s.alive = false; }); S.step(1 / 30); return W.mercy; };
  assert.strictEqual(chk(0, 0), false); assert.strictEqual(chk(1, 0), false); assert.strictEqual(chk(2, 0), true); assert.strictEqual(chk(3, 1), true); assert.strictEqual(chk(2, 1), false); assert.strictEqual(chk(0, 2), false);
});
function thiefOn(W, mark) { W.thiefT = 1e9; const before = W.thieves.length; S._t.spawnThief(); const t = W.thieves[W.thieves.length - 1]; assert.ok(W.thieves.length > before, 'thief spawned'); t.mark = mark; t.x = mark.x + mark.r + 3; t.z = mark.z; return t; }
test('stolen souls come back only if the thief is caught', () => {
  // out in the open, away from every structure and bot, so nothing else can catch the thief
  const rob = () => { const W = world(), h = W.player; h.useAI = false; h.x = -12; h.z = -12; h.souls = 500; const t = thiefOn(W, h); let after = -1;
    run(W, 3, w => { w.thiefT = 1e9; h.x = -12; h.z = -12; if (after < 0 && t.loot > 0) after = h.souls; }); assert.ok(t.loot > 0, 'theft happened'); assert.ok(t.alive, 'thief still running'); return { W, h, t, after: after < 0 ? h.souls : after }; };
  let r = rob(); assert.ok(r.after < 500 - r.t.loot + 12, 'souls were taken'); const before = r.h.souls, loot = r.t.loot;
  S._t.damage(r.t, 1e6, null, 'unit'); assert.ok(Math.abs(r.h.souls - (before + loot)) < 1e-6, 'full refund on capture, got ' + (r.h.souls - before) + ' of ' + loot);
  r = rob(); r.t.x = 0; r.t.z = C.PATRON_Z - 7; const b2 = r.h.souls;
  const ev = run(r.W, 3, w => { w.thiefT = 1e9; }); assert.ok(ev.some(e => e.k === 'thiefhome'), 'thief got home'); assert.ok(r.h.souls - b2 < 12, 'no refund when it gets home (only passive income)');
});
test('a guardian robbed of its light is dark 120 s and loses 25% health; capture relights it at once', () => {
  let W = world(), g = W.st[0][1].outer, t = thiefOn(W, g);
  run(W, 3, w => { w.thiefT = 1e9; keepAlive(w); }); assert.ok(g.dark && t.carry === g, 'snuffed');
  S._t.damage(t, 1e6, null, 'unit'); assert.strictEqual(g.dark, false, 'relit on capture'); assert.strictEqual(g.hp, g.maxHp, 'no health lost on capture');
  W = world(); g = W.st[0][1].outer; t = thiefOn(W, g); run(W, 3, w => { w.thiefT = 1e9; keepAlive(w); }); assert.ok(g.dark);
  t.x = 0; t.z = C.PATRON_Z - 7; const hp0 = g.hp; let ev = run(W, 2, w => { w.thiefT = 1e9; keepAlive(w); }); assert.ok(ev.some(e => e.k === 'thiefhome'));
  assert.ok(Math.abs((hp0 - g.hp) - g.maxHp * 0.25) < g.maxHp * 0.02, 'lost a quarter: ' + (hp0 - g.hp)); assert.ok(g.dark);
  const t0 = W.t; ev = run(W, 125, w => { w.thiefT = 1e9; keepAlive(w); g.hp = Math.max(g.hp, 500); }); const relit = ev.find(e => e.k === 'relit' && e.u === g);
  assert.ok(relit, 'relit event'); assert.ok(Math.abs((relit.at - t0) - 118) < 4, 'dark for about 120 s, got ' + (relit.at - t0 + 2).toFixed(1));
});
test('a hollow returns to its thread after the respawn delay', () => {
  for (const d of [0, 1, 2]) { const W = world({ difficulty: d }); run(W, 55, keepAlive); const big = W.troopers.filter(u => u.alive && u.big && u.lane0 === 1); assert.strictEqual(big.length, 1, 'one hollow on the middle thread');
    S._t.damage(big[0], 1e7, null, 'unit'); const want = [30, 24, 18][d], t0 = W.t; let back = -1; run(W, want + 4, w => { keepAlive(w); if (back < 0 && w.troopers.some(u => u.alive && u.big && u.lane0 === 1)) back = w.t - t0; });
    assert.ok(back > want - 1.5 && back < want + 1.5, 'difficulty ' + d + ': back after ' + back.toFixed(1) + ' s, want ' + want); }
});
test('red rain starts every 300 s, lasts 60 s, and is warned 30 s ahead', () => {
  const W = world(); const ev = run(W, 1290, keepAlive); const at = k => ev.filter(e => e.k === k).map(e => Math.round(e.at));
  assert.deepStrictEqual(at('red'), [300, 600, 900, 1200]); assert.deepStrictEqual(at('redend'), [360, 660, 960, 1260]); assert.deepStrictEqual(at('redwarn'), [270, 570, 870, 1170]);
});
test('fruit: each kind does its one thing, then regrows', () => {
  const W = world(), h = W.player, by = k => W.fruit.find(f => f.k === k); h.useAI = false;
  const sp0 = () => { h.vx = h.vz = 0; h.x = -60; h.z = -60; h.ctl.mx = 1; h.ctl.mz = 0; for (let i = 0; i < 30; i++) S.step(1 / 30); return Math.hypot(h.vx, h.vz); };
  const base = sp0(); S._t.eat(h, by('lemon')); const tEat = W.t; const fast = sp0(); assert.ok(fast > base * 1.25 && fast < base * 1.35, 'lemon is +30% speed: ' + (fast / base).toFixed(2));
  h.ctl.mx = 0; h.hp = h.maxHp * 0.4; h.slowT = 5; h.dotT = 5; S._t.eat(h, by('hips')); assert.ok(h.slowT === 0 && h.dotT === 0, 'rose hips clear slow and bleed');
  const hp0 = h.hp; for (let i = 0; i < 150; i++) { W.thiefT = 1e9; S.step(1 / 30); } assert.ok(h.hp - hp0 > h.maxHp * 0.3, 'rose hips mend about a third: ' + ((h.hp - hp0) / h.maxHp).toFixed(2));
  S._t.eat(h, by('lime')); assert.ok(h.furyT > 8 && W.heroes.filter(o => o !== h).every(o => o.furyT <= 0), 'little lime is for one hero');
  S._t.eat(h, by('biglime')); assert.ok(W.heroes.every(o => !o.alive || (o.furyT > 11 && o.zestT > 11)), 'big lime is for the whole side'); assert.ok(W.pull[0] > 11, 'and pulls orbs in');
  W.heroes.forEach(o => { o.zestT = 0; o.hp = o.maxHp * 0.3; }); S._t.eat(h, by('biglemon')); assert.ok(W.heroes.every(o => o.zestT > 15), 'big lemon: whole side quick'); S._t.eat(h, by('bighips')); assert.ok(W.heroes.every(o => o.hipsT > 5), 'big rose hips: whole side mending');
  const f = by('lemon'); assert.strictEqual(f.ripe, false); const g = C.FRUIT_INFO.lemon.grow; let ripeAt = -1; h.x = 70; h.z = -120;
  for (let i = 0; i < (g + 3) * 30 && ripeAt < 0; i++) { W.heroes.forEach(o => { o.hp = o.maxHp; if (o !== h) { o.x = 60; o.z = -125; } }); W.patron.forEach(p => { p.hp = p.maxHp; }); S.step(1 / 30); W.fx.length = 0; if (f.ripe) ripeAt = W.t - tEat; }
  assert.ok(Math.abs(ripeAt - g) < 1, 'lemon regrows ' + g + ' s after it is eaten, got ' + ripeAt.toFixed(1));
});
test('the Hush cannot eat fruit', () => {
  const W = world(); const f = W.fruit[0]; f.ripe = true; S._t.spawnThief(); const t = W.thieves[W.thieves.length - 1]; t.speed = 0; t.x = f.x; t.z = f.z; W.heroes.forEach(h => { h.useAI = false; h.x = 70; h.z = -120; });
  for (let i = 0; i < 60; i++) { W.thiefT = 1e9; S.step(1 / 30); } assert.strictEqual(f.ripe, true);
});
test('rare fruit can be eaten only through its own view', () => {
  const W = world(), h = W.player, f = W.fruit.find(q => q.k === 'biglemon'); h.useAI = false; W.heroes.forEach(o => { if (o !== h) { o.useAI = false; o.x = 70; o.z = -120; } });
  f.ripe = true; const sit = (n) => { for (let i = 0; i < n; i++) { h.x = f.x; h.z = f.z; W.thiefT = 1e9; h.hp = h.maxHp; S.step(1 / 30); } };
  sit(30); assert.strictEqual(f.ripe, true, 'standing on it in the wrong view does nothing'); S.setLens('knight'); sit(30); assert.strictEqual(f.ripe, true, 'still nothing in another wrong view');
  S.setLens(f.lens); sit(5); assert.strictEqual(f.ripe, false, 'eaten once the right view is worn'); assert.ok(W.heroes.every(o => o.zestT > 0));
});
test('a mood solved by wearing the fitting view thins the red rain; three wrong views lose it', () => {
  const upTo = (W, t) => run(W, t - W.t, keepAlive), extras = W => W.troopers.filter(u => u.big && u.extra).length; // count only the rain's own hollows, not the regular ones coming back
  let W = world(); upTo(W, 271); assert.ok(W.mood && !W.mood.done, 'a mood is set at the warning'); assert.notStrictEqual(W.mood.lens, W.lens, 'never the view already worn');
  S.setLens(W.mood.lens); assert.ok(W.mood.solved && W.thin); let ev = upTo(W, 301); assert.ok(ev.some(e => e.k === 'red' && e.thin)); assert.strictEqual(extras(W), 0, 'a thin rain brings no extra hollows');
  upTo(W, 362); assert.strictEqual(W.thin, false, 'the next rain starts fresh');
  W = world(); upTo(W, 271); const wrong = C.LENSES.filter(l => l !== W.mood.lens && l !== W.lens); S.setLens(wrong[0]); S.setLens(wrong[1]); assert.ok(!W.mood.done, 'two misses are allowed'); S.setLens(wrong[2]); assert.ok(W.mood.done && !W.mood.solved, 'the third miss loses it');
  S.setLens(W.mood.lens); assert.strictEqual(W.thin, false, 'too late'); upTo(W, 300.5); assert.ok(extras(W) >= 1, 'full rain: extra hollows arrive');
  W = world(); upTo(W, 305); assert.strictEqual(W.thin, false, 'bots never change the view, so their rain is never thin');
});
test('bots do not camp on rare fruit they cannot reach', () => {
  const W = world(); const f = W.fruit.find(q => q.k === 'biglemon'); f.ripe = true; const b = W.heroes.find(h => !h.isPlayer); b.x = f.x + 6; b.z = f.z;
  run(W, 20, w => { keepAlive(w); f.ripe = true; }); assert.ok(Math.hypot(b.x - f.x, b.z - f.z) > 12, 'bot walked away, now ' + Math.hypot(b.x - f.x, b.z - f.z).toFixed(0) + ' m off');
});
test('a mood never asks for the view already worn, whichever view that is', () => {
  for (const lens of C.LENSES) for (const seed of [1, 2, 3]) { const W = world({ lens: lens, seed: seed }); const ev = run(W, C.RED_EVERY - C.RED_WARN + 2, keepAlive); assert.ok(ev.some(e => e.k === 'redwarn'), 'warned'); assert.notStrictEqual(W.mood.lens, lens); }
});
test('Ever Fallen: the Hush cannot be hurt, houses start dark, and it always ends in a fall', () => {
  const W = world({ mode: 'fallen' }); assert.ok(W.structs.filter(s => s.team === 0 && s.kind !== 'patron').every(s => s.dark), 'Reign houses start dark');
  const g = W.structs.find(s => s.team === 1 && s.kind === 'guardian'), hp = g.hp; g.pressed = true; S._t.damage(g, 5000, W.player, 'unit'); assert.strictEqual(g.hp, hp, 'Hush guardian took no damage');
  const ev = run(W, 3000); assert.ok(W.over && W.winner === 1, 'ended with the Reign fallen at ' + W.t.toFixed(0)); const o = ev.find(e => e.k === 'over'); assert.ok(o.fallen && o.t > 0 && o.lights >= 0);
  assert.ok(!ev.some(e => e.k === 'gutter'), 'no gutter in Ever Fallen');
});
test('Ever Fallen: a small one put down relights the nearest dark house, and the light fades after LIT_T', () => {
  const W = world({ mode: 'fallen' }); W.thiefT = 1e9; W.hollowT = [1e9, 1e9, 1e9]; W.waveT = 1e9; W.redNext = 1e9;
  S._t.spawnThief(); const th = W.thieves[0]; assert.ok(th && th.alive, 'a small one comes even with nothing lit'); th.x = -48; th.z = -60; W.fx.length = 0;
  S._t.kill(th, W.player, W.player); const lit = W.structs.filter(s => s.team === 0 && s.kind !== 'patron' && !s.dark); assert.strictEqual(lit.length, 1); assert.strictEqual(W.lights, 1);
  run(W, C.LIT_T - 5, keepAlive); assert.ok(!lit[0].dark, 'still lit before LIT_T'); run(W, 10, keepAlive); assert.ok(lit[0].dark, 'dark again after LIT_T');
  S._t.spawnThief(); const t2 = W.thieves[W.thieves.length - 1]; t2.x = -48; t2.z = -60; S.setLens('memory'); S._t.kill(t2, W.player, W.player); const l2 = W.structs.find(s => s.team === 0 && s.kind !== 'patron' && !s.dark);
  run(W, C.LIT_T + 30, keepAlive); assert.ok(!l2.dark, 'Memory holds a light past LIT_T'); run(W, C.LIT_T, keepAlive); assert.ok(l2.dark, 'and not forever');
});
test('Ever Fallen: the rain comes every 150 s and one hollow thicker each time', () => {
  const W = world({ mode: 'fallen' }), ev = run(W, 470, keepAlive); const reds = ev.filter(e => e.k === 'red');
  assert.deepStrictEqual(reds.map(e => Math.round(e.at)), [150, 300, 450]);
  const extra = at => ev.filter(e => e.k === 'hollow' && Math.abs(e.at - at) < 0.2).length; assert.deepStrictEqual([extra(reds[0].at), extra(reds[1].at), extra(reds[2].at)], [3, 4, 5]);
});
test('Lean Back: the hero plays itself, goes where it is called, and the fold works from the chair', () => {
  const W = world({ lean: true, auto: false }); assert.ok(W.player.useAI && W.lean); assert.ok(S.call(2)); run(W, 60, keepAlive); assert.strictEqual(W.player.ai.lane, 2, 'called lane is kept');
  assert.strictEqual(LL.nearestLane(W.player.x, W.player.z), 2, 'hero is on the called thread');
  W.creases.forEach(c => { c.guard.alive = true; c.t = 0; c.cd = 0; }); assert.strictEqual(S.leanFold(), false, 'no fold while the crease is guarded'); W.creases[0].guard.alive = false; assert.strictEqual(S.leanFold(), true); assert.ok(W.creases[0].t > 0);
  const W2 = world(); assert.strictEqual(S.call(1), false, 'no calling outside Lean Back'); assert.strictEqual(S.leanFold(), false);
});
test('Rainwake pays half again only while the rain is red; Memory pays half', () => {
  const W = world(), h = W.player, got = (f) => { const a = h.total; f(); S._t.give(h, 100); return h.total - a; };
  assert.strictEqual(got(() => {}), 100); assert.strictEqual(got(() => { W.lens = 'rain'; }), 100); assert.strictEqual(got(() => { W.red = 10; }), 150); assert.strictEqual(got(() => { W.lens = 'memory'; }), 50);
});
test('the model never reads the look: sim and core have no presentation references', () => {
  for (const f of ['core.js', 'sim.js']) { const src = fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8').replace(/typeof window !== 'undefined' \? window : globalThis/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"])\/\/.*$/gm, '$1'); // comments may talk about the rule; code may not break it
    for (const bad of [/\bLL\.gfx\b/, /\bLL\.ui\b/, /\bdocument\b/, /\bwindow\b/, /\blook\b/i, /\bLK\b/, /localStorage/]) assert.ok(!bad.test(src), f + ' mentions ' + bad); }
  assert.strictEqual(typeof LL.gfx, 'undefined', 'sim ran with no renderer loaded');
});
console.log('\n' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
