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
test('red rain starts every 300 s, lasts 60 s, and is warned 15 s ahead', () => {
  const W = world(); const ev = run(W, 1290, keepAlive); const at = k => ev.filter(e => e.k === k).map(e => Math.round(e.at));
  assert.deepStrictEqual(at('red'), [300, 600, 900, 1200]); assert.deepStrictEqual(at('redend'), [360, 660, 960, 1260]); assert.deepStrictEqual(at('redwarn'), [285, 585, 885, 1185]);
});
test('the model never reads the look: sim and core have no presentation references', () => {
  for (const f of ['core.js', 'sim.js']) { const src = fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8').replace(/typeof window !== 'undefined' \? window : globalThis/g, '');
    for (const bad of [/\bLL\.gfx\b/, /\bLL\.ui\b/, /\bdocument\b/, /\bwindow\b/, /\blook\b/i, /\bLK\b/, /localStorage/]) assert.ok(!bad.test(src), f + ' mentions ' + bad); }
  assert.strictEqual(typeof LL.gfx, 'undefined', 'sim ran with no renderer loaded');
});
console.log('\n' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
