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
  const extra = at => ev.filter(e => e.k === 'hollow' && e.extra && Math.abs(e.at - at) < 0.2).length; assert.deepStrictEqual([extra(reds[0].at), extra(reds[1].at), extra(reds[2].at)], [3, 4, 5]);
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
test('Echo replays the last seconds of shots from where they were fired, weaker, then rests', () => {
  const W = world({ auto: false }), p = W.player; W.waveT = 1e9; W.hollowT = [1e9, 1e9, 1e9]; W.thiefT = 1e9;
  assert.strictEqual(S.echo(), false, 'nothing to replay yet');
  p.ctl.fire = true; p.ctl.ax = p.x; p.ctl.ay = 1.3; p.ctl.az = p.z - 40; const x0 = p.x, z0 = p.z; run(W, 3, keepAlive); p.ctl.fire = false; const fired = W.rec.filter(r => r.s).length; assert.ok(fired > 5, 'recorded ' + fired + ' shots');
  W.projs.length = 0; assert.strictEqual(S.echo(), true); assert.ok(W.echo && W.echoCd === C.ECHO_CD);
  const ev = run(W, C.ECHO_T + 0.5, keepAlive), es = ev.filter(e => e.k === 'echoshot'); assert.strictEqual(es.length, fired, 'every shot replayed'); assert.ok(Math.abs(es[0].x - x0) < 2 && Math.abs(es[0].z - z0) < 2, 'from where they were fired');
  assert.ok(ev.some(e => e.k === 'echoend') && !W.echo); assert.strictEqual(S.echo(), false, 'resting');
  const W2 = world({ auto: false }), q = W2.player; q.ctl.fire = true; q.ctl.ax = q.x; q.ctl.ay = 1.3; q.ctl.az = q.z - 40; run(W2, 9.5, keepAlive); q.ctl.fire = false; S.setLens('memory'); assert.ok(S.echo()); assert.strictEqual(W2.echoCd, C.ECHO_CD_MEM); assert.ok(W2.echo.f[W2.echo.f.length - 1].t - W2.echo.f[0].t > C.ECHO_T + 1, 'Memory replays longer');
});
test('Echo shots hurt at ECHO_DMG strength', () => {
  const W = world(), p = W.player; W.waveT = 1e9; W.hollowT = [1e9, 1e9, 1e9]; W.thiefT = 1e9; W.projs.length = 0;
  W.rec.length = 0; for (let k = 0; k < 30; k++) W.rec.push({ t: W.t - 3 + k * 0.1, x: p.x, z: p.z, yaw: 0, s: k === 10 ? [p.x, 1.3, p.z, 0, 0, -1] : null });
  assert.ok(S.echo()); let b = []; for (let k = 0; k < 80 && !b.length; k++) { S.step(1 / 40); b = W.projs.filter(q => q.echo); } assert.ok(b.length >= 1, 'echo bullet in flight'); assert.ok(Math.abs(b[0].dmg - p.def.gun.dmg * p.st.dmg * C.ECHO_DMG) < 1e-6);
});
test('Dreamwalk shows the systems: it misses a mood once, then answers it, and wears Rainwake in the rain', () => {
  const W = world({ dream: true, auto: false }); assert.ok(W.lean && W.dream && W.player.useAI);
  const ev = run(W, C.RED_EVERY + 20, keepAlive);
  assert.ok(ev.some(e => e.k === 'moodmiss'), 'one deliberate miss'); assert.ok(ev.some(e => e.k === 'moodsolved'), 'then the answer'); assert.ok(ev.find(e => e.k === 'red').thin, 'so the rain came thin');
  assert.ok(ev.some(e => e.k === 'dream' && e.sys === 'rainwake') && W.lens === 'rain', 'Rainwake worn in the rain');
  assert.ok(ev.some(e => e.k === 'call'), 'it called a thread');
});
test('goals: one thing to do next, each pays once, any order', () => {
  const W = world({ auto: false }), p = W.player; assert.strictEqual(S.goal().id, 'orbs');
  const s0 = p.total; S.setLens('ink'); assert.ok(W.goals.done.view, 'changing the view completes its goal out of order'); assert.strictEqual(p.total - s0, 40); assert.strictEqual(S.goal().id, 'orbs', 'the screen still shows the first one not done');
  S.setLens('snow'); assert.strictEqual(p.total - s0, 40, 'paid once');
  S._t.spawnThief(); const th = W.thieves[0]; S._t.kill(th, p, p); assert.ok(W.goals.done.thief);
  assert.ok(W.fx.filter(e => e.k === 'goal').length === 2);
  const F = world({ mode: 'fallen' }); assert.strictEqual(S.goal(), null, 'Ever Fallen has no goals; it has a clock');
});
test('First Rain ends when the first red rain ends and counts five stars', () => {
  const W = world({ mode: 'short' }); const ev = run(W, 400, keepAlive); const o = ev.find(e => e.k === 'over');
  assert.ok(W.over && o && o.short, 'ended'); assert.ok(Math.abs(o.t - (C.RED_EVERY + C.RED_T)) < 1, 'at ' + o.t.toFixed(1)); assert.strictEqual(W.winner, 0);
  assert.deepStrictEqual(Object.keys(o.stars).sort(), LL.STARS.map(s => s.id).sort()); assert.strictEqual(o.n, LL.STARS.filter(s => o.stars[s.id]).length); assert.strictEqual(o.stars.mood, false, 'bots answer no mood');
  const L = world(); run(L, 400, keepAlive); assert.ok(!L.over && !L.short, 'the long match does not end at the rain');
});
test('guardian fox unlock: the events main.js listens for carry what it asks', () => {
  // main.js feats() unlocks the fox on (thiefdown with p && carry) or (relit with recovered), and only for a person.
  // The sim half of that contract is what can be proven here: the flags must be set exactly in those cases.
  let W = world(), g = W.st[0][1].outer, t = thiefOn(W, g);
  run(W, 3, w => { w.thiefT = 1e9; keepAlive(w); }); assert.ok(g.dark && t.carry === g, 'thief carries the guardian light');
  W.fx.length = 0; S._t.kill(t, W.player, W.player); let ev = W.fx.find(e => e.k === 'thiefdown');
  assert.ok(ev && ev.p === true && ev.carry === g, 'the player catching a laden thief flags p and carry');
  W = world(); g = W.st[0][1].outer; t = thiefOn(W, g); run(W, 3, w => { w.thiefT = 1e9; keepAlive(w); }); assert.ok(t.carry === g);
  const bot = W.heroes.find(h => !h.isPlayer); W.fx.length = 0; S._t.kill(t, bot, bot); ev = W.fx.find(e => e.k === 'thiefdown');
  assert.ok(ev && ev.p === false && ev.carry === g, 'a bot making the same catch does not flag p');
  W = world(); W.thiefT = 1e9; S._t.spawnThief(); t = W.thieves[W.thieves.length - 1]; assert.ok(!t.carry, 'a fresh thief carries nothing');
  W.fx.length = 0; S._t.kill(t, W.player, W.player); ev = W.fx.find(e => e.k === 'thiefdown');
  assert.ok(ev && ev.p === true && !ev.carry, 'catching an empty-handed thief flags no carry');
});
test('guardian fox unlock: an Ever Fallen rescue relights as recovered; a timer relight does not', () => {
  let W = world({ mode: 'fallen' }); W.thiefT = 1e9; W.hollowT = [1e9, 1e9, 1e9]; W.waveT = 1e9; W.redNext = 1e9;
  S._t.spawnThief(); const th = W.thieves[0]; th.x = -48; th.z = -60; W.fx.length = 0;
  S._t.kill(th, W.player, W.player); const ev = W.fx.find(e => e.k === 'relit');
  assert.ok(ev && ev.recovered === true && ev.u && ev.u.team === 0 && !ev.u.dark, 'the rescue relight is flagged recovered');
  W = world(); const g = W.st[0][1].outer; g.dark = true; g.darkT = 0.05;
  const relit = run(W, 1, w => { w.thiefT = 1e9; keepAlive(w); }).find(e => e.k === 'relit' && e.u === g);
  assert.ok(relit && !relit.recovered, 'a guardian whose dark timer runs out relights with no recovered flag');
});
test('motion rig: stride follows distance walked, not time', () => {
  const M = require(path.join(__dirname, '..', 'js', 'motion.js')), u = { x: 0, z: 0, yaw: 0, onGround: true, def: { id: 'dora' }, lastShotT: -99 };
  const a = M.create(), b = M.create(); M.pose(a, u, 0.02, 0, false); M.pose(b, u, 0.02, 0, false);
  for (let i = 0; i < 40; i++) { u.z += 0.1; M.pose(a, u, 0.02, i * 0.02, false); } // 4 m in 0.8 s
  const u2 = Object.assign({}, u, { z: 0 }); for (let i = 0; i < 80; i++) { u2.z += 0.05; M.pose(b, u2, 0.02, i * 0.02, false); } // 4 m in 1.6 s
  assert.ok(Math.abs(a.phase - b.phase) < 1e-9, 'same distance, same stride phase: ' + a.phase.toFixed(3) + ' vs ' + b.phase.toFixed(3));
  assert.ok(Math.abs(a.phase - (4 / M.RIGS.dora.cycle * 2 * Math.PI) % (2 * Math.PI)) < 1e-9);
  const c = M.create(); M.pose(c, u, 0.02, 0, false); for (let i = 0; i < 30; i++) M.pose(c, u, 0.02, i * 0.02, false); assert.ok(c.mix < 0.01, 'standing still settles to no stride');
});
test('motion rig: aim rises fast and lets go slower; a landing squashes; a teleport is not a stride', () => {
  const M = require(path.join(__dirname, '..', 'js', 'motion.js')), u = { x: 0, z: 0, yaw: 0, onGround: true, def: { id: 'anna' }, lastShotT: -99 }, m = M.create();
  M.pose(m, u, 0.016, 0, false); u.lastShotT = 1; let p = M.pose(m, u, 0.05, 1.02, false); const up = p.aim; assert.ok(up > 0.7, 'aim up in one frame: ' + up.toFixed(2));
  p = M.pose(m, u, 0.05, 1.4, false); assert.ok(p.aim > 0.4 && p.aim < up, 'aim holds a moment after the burst');
  u.onGround = false; M.pose(m, u, 0.05, 2, false); u.onGround = true; p = M.pose(m, u, 0.016, 2.05, false); assert.ok(p.squash > 0.4, 'landing squashes'); for (let i = 0; i < 30; i++) p = M.pose(m, u, 0.02, 2.1 + i * 0.02, false); assert.ok(p.squash < 0.05, 'and recovers');
  const ph = m.phase; u.z += 30; M.pose(m, u, 0.016, 3, false); assert.strictEqual(m.phase, ph, 'a respawn jump does not advance the stride');
  const r = M.pose(M.create(), u, 0.016, 3, true); assert.strictEqual(r.sway + r.body + r.roll + r.squash, 0, 'reduced motion is still');
});
test('motion gaits (0.21): Dora bobs and rolls as in 0.20; Anna is lower, rolls more and plants her feet', () => {
  const M = require(path.join(__dirname, '..', 'js', 'motion.js'));
  assert.strictEqual(M.gaitOf('dora').bob, 1); assert.strictEqual(M.gaitOf('dora').braid, null); assert.strictEqual(M.gaitOf('myra').throw, 0);
  const walk = (id, n) => { const m = M.create(), u = { x: 0, z: 0, yaw: 0, onGround: true, def: { id }, lastShotT: -99 }; let p, sq = 0, contacts = 0;
    for (let i = 0; i < n; i++) { u.z += 0.2; p = M.pose(m, u, 1 / 30, i / 30, false, { r: 0, f: 6, fb: true, m: 1, h: 2.4 }); if (p.contact) contacts++; sq = Math.max(sq, p.squash); } return { p, sq, contacts }; };
  const d = walk('dora', 90), a = walk('anna', 90), lift = Math.abs(Math.sin(d.p.phase)) * d.p.mix;
  assert.ok(Math.abs(d.p.body - (0.062 * lift - 0.024 * d.p.mix)) < 1e-9, 'Dora bobs exactly as in 0.20');
  assert.ok(Math.abs(d.p.roll - d.p.sway * 0.03 - Math.max(-0.06, Math.min(0.06, -d.p.turn * 0.02))) < 1e-9, 'Dora rolls exactly as in 0.20 (no idle while striding)');
  assert.ok(a.contacts > 3, 'Anna steps: ' + a.contacts); assert.ok(a.sq > d.sq + 0.1, 'each of Anna\'s steps squashes, Dora\'s do not: ' + a.sq.toFixed(2) + ' vs ' + d.sq.toFixed(2));
  assert.ok(a.p.g.shift > 1 && a.p.g.bob < 1, 'Anna moves her weight more and bounces less');
});
test('the braid (0.21): hangs at rest, trails a run across the screen, swings with the step and settles when she stops', () => {
  const M = require(path.join(__dirname, '..', 'js', 'motion.js')), u = { x: 0, z: 0, yaw: 0, onGround: true, def: { id: 'anna' }, lastShotT: -99, id: 1 };
  const run = (m, n, sc, step, fps) => { let p, lo = 0, hi = 0; const dt = 1 / (fps || 30); for (let i = 0; i < n; i++) { u.x += (step || 0) * 30 * dt; p = M.pose(m, u, dt, (m.t = (m.t || 0) + dt), false, sc); lo = Math.min(lo, p.braid); hi = Math.max(hi, p.braid); } return { p, lo, hi }; };
  let m = M.create(); let r = run(m, 60, { r: 0, f: 0, fb: true, m: 1, h: 2.4 }); assert.ok(Math.abs(r.p.braid) < 0.02, 'hangs straight when standing: ' + r.p.braid.toFixed(3));
  m = M.create(); r = run(m, 90, { r: 6, f: 0, fb: false, m: 1, h: 2.4 }, 0.2); assert.ok(r.p.braid < -0.15, 'running to the right of the screen trails it to the left: ' + r.p.braid.toFixed(2));
  const mm = M.create(); const r2 = run(mm, 90, { r: -6, f: 0, fb: false, m: 1, h: 2.4 }, 0.2); assert.ok(Math.abs(r2.p.braid + r.p.braid) < 0.05, 'and the mirror of it running left');
  m = M.create(); r = run(m, 90, { r: 0, f: 6, fb: true, m: 1, h: 2.4 }, 0.2); assert.ok(r.hi - r.lo > 0.12, 'walking away, the step swings it side to side: ' + (r.hi - r.lo).toFixed(2));
  const settle = run(m, 120, { r: 0, f: 0, fb: true, m: 1, h: 2.4 }, 0); assert.ok(Math.abs(settle.p.braid) < 0.03, 'and it settles after she stops: ' + settle.p.braid.toFixed(3));
  const a = M.create(), b = M.create(); u.x = 0; const ra = run(a, 30, { r: 6, f: 0, fb: false, m: 1, h: 2.4 }, 0.2, 30); u.x = 0; const rb = run(b, 120, { r: 6, f: 0, fb: false, m: 1, h: 2.4 }, 0.05, 120);
  assert.ok(Math.abs(ra.p.braid - rb.p.braid) < 0.06, 'about the same at 30 and 120 frames a second: ' + ra.p.braid.toFixed(3) + ' vs ' + rb.p.braid.toFixed(3));
  const d = M.pose(M.create(), { x: 0, z: 0, yaw: 0, onGround: true, def: { id: 'dora' } }, 1 / 30, 0, false, { r: 6, f: 0 }); assert.strictEqual(d.braid, 0, 'no braid, no swing');
  assert.strictEqual(M.pose(M.create(), u, 1 / 30, 0, true, { r: 6, f: 0 }).braid, 0, 'reduced motion: still');
});
test('the throw (0.21): a held trigger winds up before the next shot, the shot throws, letting go settles; others never wind up', () => {
  const M = require(path.join(__dirname, '..', 'js', 'motion.js')), m = M.create(), u = { x: 0, z: 0, yaw: 0, onGround: true, def: { id: 'anna' }, lastShotT: -99, ctl: { fire: true }, fireT: 0.4, ammo: 5, reloadT: 0 };
  let p; for (let i = 0; i < 12; i++) { u.fireT -= 1 / 30; p = M.pose(m, u, 1 / 30, i / 30, false); } assert.ok(p.throw < -0.4, 'wound up as the shot comes: ' + p.throw.toFixed(2));
  u.lastShotT = 0.4; u.fireT = 0.476; p = M.pose(m, u, 1 / 30, 0.41, false); assert.ok(p.throw > 0.6, 'thrown on the shot: ' + p.throw.toFixed(2));
  u.ctl.fire = false; for (let i = 0; i < 30; i++) p = M.pose(m, u, 1 / 30, 0.45 + i / 30, false); assert.ok(Math.abs(p.throw) < 0.02, 'settles when the trigger is let go');
  const d = M.create(), ud = Object.assign({}, u, { def: { id: 'dora' }, ctl: { fire: true }, fireT: 0.05 }); for (let i = 0; i < 10; i++) p = M.pose(d, ud, 1 / 30, i / 30, false); assert.strictEqual(p.throw, 0, 'Dora fires, she does not throw');
});
test('ability poses (0.21): Tumble stomps, Core Sample braces and holds the aim, a dash has no pose', () => {
  const M = require(path.join(__dirname, '..', 'js', 'motion.js')), u = { x: 0, z: 0, yaw: 0, onGround: true, def: { id: 'anna' }, lastShotT: -99 };
  let m = M.create(); M.pose(m, u, 1 / 30, 0, false); assert.strictEqual(M.cast(m, 'nova'), 'stomp'); let sq = 0, st = 0, p; for (let i = 1; i < 6; i++) { p = M.pose(m, u, 1 / 30, i / 30, false); sq = Math.max(sq, p.squash); st = Math.max(st, p.stomp); }
  assert.ok(sq > 0.5 && st > 0.8, 'a stomp squashes hard: ' + sq.toFixed(2));
  m = M.create(); M.pose(m, u, 1 / 30, 0, false); assert.strictEqual(M.cast(m, 'line', false), 'brace'); let bk = 0; for (let i = 1; i < 9; i++) { p = M.pose(m, u, 1 / 30, i / 30, false); bk = Math.max(bk, p.brace); }
  assert.ok(bk > 0.15 && p.aim > 0.8, 'shoved back and holding the aim: ' + bk.toFixed(2) + ', aim ' + p.aim.toFixed(2)); for (let i = 0; i < 60; i++) p = M.pose(m, u, 1 / 30, 1 + i / 30, false); assert.ok(p.brace < 0.01 && p.aim < 0.2, 'and recovers');
  assert.strictEqual(M.cast(M.create(), 'dash'), null); assert.strictEqual(M.cast(M.create(), 'line', true), 'point');
});
test('idle and coat (0.21): standing is not a frozen card; the coat halves lift with their own knee', () => {
  const M = require(path.join(__dirname, '..', 'js', 'motion.js')), u = { x: 0, z: 0, yaw: 0, onGround: true, def: { id: 'anna' }, lastShotT: -99, id: 2 }, m = M.create();
  const xs = []; for (let i = 0; i < 150; i++) xs.push(M.pose(m, u, 1 / 30, i / 30, false, { r: 0, f: 0, fb: true }).idle); assert.ok(Math.max(...xs) - Math.min(...xs) > 0.3, 'the weight drifts while standing');
  assert.strictEqual(M.pose(M.create(), u, 1 / 30, 3, true).idle, 0, 'reduced motion: still');
  const w = M.create(); let maxL = 0, maxR = 0; for (let i = 0; i < 60; i++) { u.z += 0.2; const p = M.pose(w, u, 1 / 30, 5 + i / 30, false, { r: 0, f: 6, fb: true }); if (p.sway > 0.6) maxL = Math.max(maxL, p.flapL - p.flapR); if (p.sway < -0.6) maxR = Math.max(maxR, p.flapR - p.flapL); }
  assert.ok(maxL > 0.3 && maxR > 0.3, 'each half lifts with its own leg: ' + maxL.toFixed(2) + ', ' + maxR.toFixed(2));
});
/* 0.25 AIR. Each hero's move in the air, from `air` on its row in core.js, through the real sim at 60 steps a second. */
const airHero = (id, o) => { const i = LL.HEROES.findIndex(d => d.id === id), W = world(Object.assign({ heroPick: i, auto: false }, o || {})), h = W.player; h.useAI = false; h.x = -62; h.z = -60; h.stamina = 3; h.ctl.mx = h.ctl.mz = 0; return { W, h }; };
function airRun(W, h, secs, each) { const out = []; for (let i = 0; i < Math.round(secs * 60) && !W.over; i++) { if (each) each(i, W.t); S.step(1 / 60); h.hp = h.maxHp; for (const e of W.fx) if (e.u === h) out.push(Object.assign({ at: W.t }, e)); W.fx.length = 0; } return out; }
const airK = (ev, k) => ev.filter(e => e.k === k);
test('air (0.25): Dora jumps once, Anna and the Skein Doll twice, Myra Belle once and then hangs', () => {
  const want = { dora: [1, 0, 0], anna: [2, 1, 0], skein: [2, 1, 0], myra: [1, 0, 1] };
  for (const id in want) { const { W, h } = airHero(id); airRun(W, h, 0.5); h.stamina = 3;
    const ev = airRun(W, h, 1.6, (i) => { if (i === 0 || i === 20 || i === 30 || i === 40) h.ctl.jump = true; h.ctl.jumpHeld = i >= 20 && i < 50; });
    const j = airK(ev, 'jump'); assert.strictEqual(j.length, want[id][0], id + ': jumps ' + j.length); assert.strictEqual(j.filter(e => e.dbl).length, want[id][1], id + ': second jumps');
    assert.strictEqual(airK(ev, 'hover').length, want[id][2], id + ': hovers'); assert.ok(h.onGround, id + ' has landed');
    assert.strictEqual(LL.HEROES.find(d => d.id === id).air.jumps, id === 'anna' || id === 'skein' ? 2 : 1); }
  const { W, h } = airHero('anna'); airRun(W, h, 0.3); h.stamina = 3; const ev = airRun(W, h, 0.5, (i) => { if (i === 0 || i === 18) h.ctl.jump = true; });
  assert.strictEqual(airK(ev, 'jump')[1].n, 2); assert.ok(h.stamina < 3, 'the second jump costs stamina'); // (it comes back at one per 2.6 s)
  const z = airHero('skein'); z.h.stamina = 0; const e0 = airRun(z.W, z.h, 0.6, (i) => { if (i === 0 || i === 18) z.h.ctl.jump = true; }); assert.strictEqual(airK(e0, 'jump').length, 1, 'no stamina, no second jump');
});
test('air (0.25): Myra Belle\'s hover lasts about 1.2 s while jump is held, sinks slowly, drifts, and comes once per airtime', () => {
  let { W, h } = airHero('myra'); airRun(W, h, 0.3); h.stamina = 3; const H = h.def.air.hover; let vyMid = null, yLow = 9, t0 = null, hov = 0;
  let ev = airRun(W, h, 2.4, (i, t) => { h.ctl.jump = i === 0; h.ctl.jumpHeld = true; if (h.hoverT > 0) { if (t0 == null) t0 = t; hov += 1 / 60; if (t - t0 > 0.6 && vyMid == null) vyMid = h.vy; if (t - t0 < 1.0) yLow = Math.min(yLow, h.y); } });
  const hs = airK(ev, 'hover'), he = airK(ev, 'hoverend'); assert.strictEqual(hs.length, 1, 'held through the top of the jump, the wings take her'); assert.strictEqual(he[0].why, 'spent');
  const dur = he[0].at - hs[0].at; assert.ok(Math.abs(dur - H.t) < 0.05, 'hangs ' + dur.toFixed(2) + ' s, want ' + H.t);
  assert.ok(Math.abs(vyMid + H.sink) < 0.3, 'sinks at about ' + H.sink + ' m/s: ' + vyMid.toFixed(2)); assert.ok(yLow > 0.8, 'stays up through the first second: ' + yLow.toFixed(2) + ' m');
  const land = ev.find(e => e.k === 'hoverend') && ev[ev.length - 1].at; const air = (land || W.t) - ev[0].at; assert.ok(h.onGround && air > 1.5, 'in the air ' + air.toFixed(2) + ' s (a jump alone is 0.74)');
  assert.strictEqual(h.stamina, 2, 'one stamina'); // (2.4 s: none has come back yet)
  ({ W, h } = airHero('myra')); airRun(W, h, 0.3); h.stamina = 3;
  ev = airRun(W, h, 1.2, (i) => { h.ctl.jump = i === 0 || i === 15 || i === 40; h.ctl.jumpHeld = (i >= 15 && i < 33) || i === 40; });
  assert.strictEqual(airK(ev, 'hover').length, 1, 'once per airtime: a third press does not hang again'); const rel = airK(ev, 'hoverend')[0]; assert.strictEqual(rel.why, 'release');
  assert.ok(Math.abs(rel.at - airK(ev, 'hover')[0].at - 0.3) < 0.04, 'letting go drops her at once');
  ({ W, h } = airHero('myra')); airRun(W, h, 0.3); h.stamina = 3; let vx = 0;
  airRun(W, h, 1.2, (i) => { h.ctl.jump = i === 0; h.ctl.jumpHeld = true; h.ctl.mx = i > 25 ? 1 : 0; if (h.hoverT > 0) vx = h.vx; }); assert.ok(vx > 3, 'drifts with the stick while hanging: ' + vx.toFixed(1) + ' m/s');
  airRun(W, h, 1.5, () => { h.ctl.mx = 0; h.ctl.jumpHeld = false; }); assert.ok(h.onGround);
  ev = airRun(W, h, 2, (i) => { h.ctl.jump = i === 0; h.ctl.jumpHeld = true; }); assert.strictEqual(airK(ev, 'hover').length, 1, 'and again after landing');
  ({ W, h } = airHero('myra')); h.stamina = 0; ev = airRun(W, h, 1.5, (i) => { h.ctl.jump = i === 0; h.ctl.jumpHeld = true; }); assert.strictEqual(airK(ev, 'hover').length, 0, 'no stamina, no hover');
});
test('air (0.25): a hero row without `air` jumps exactly as before 0.25', () => {
  const { W, h } = airHero('anna'); h.def = Object.assign({}, h.def); delete h.def.air; airRun(W, h, 0.3); h.stamina = 3; let y = 0, vy2 = null;
  const ev = airRun(W, h, 2, (i) => { h.ctl.jump = i === 0 || i === 20 || i === 40; h.ctl.jumpHeld = true; y = Math.max(y, h.y); if (i === 21) vy2 = h.vy; });
  const j = airK(ev, 'jump'); assert.strictEqual(j.length, 2); assert.ok(j[1].dbl && j[1].n === undefined, 'the old second jump event'); assert.strictEqual(airK(ev, 'hover').length, 0, 'held jump does nothing');
  assert.ok(Math.abs(vy2 - (9.2 - C.GRAV / 60)) < 1e-9, 'second jump at 9.2 m/s'); assert.strictEqual(h.stamina, 2, 'for one stamina');
  const k = airHero('dora'); k.h.def = Object.assign({}, k.h.def); delete k.h.def.air; airRun(k.W, k.h, 0.3); let t1 = null; const e1 = airRun(k.W, k.h, 1, (i, t) => { k.h.ctl.jump = i === 0; if (i > 0 && t1 == null && k.h.onGround) t1 = t; });
  assert.ok(Math.abs(t1 - e1[0].at - 2 * 9.6 / C.GRAV) < 0.04, 'one jump is 0.74 s in the air: ' + (t1 - e1[0].at).toFixed(3));
});
test('air (0.25): bots use the moves: double-jumpers jump again now and then, a bot Myra Belle hangs', () => {
  const got = { anna: 0, skein: 0, myra: 0 };
  /* Bots choose by Math.random (the sim is not yet seeded, issue #27), so this counts over four seeds and asks that each move
     is used at all, plus a total: with two seeds and a floor of 2 each it failed about one run in eight (lead, 0.25). */
  for (const id in got) for (const seed of [3, 4, 5, 6]) { const W = world({ heroPick: LL.HEROES.findIndex(d => d.id === id), seed: seed }); const ev = run(W, 240, keepAlive);
    got[id] += ev.filter(e => e.u && e.u.def && e.u.def.id === id && ((e.k === 'jump' && e.dbl) || e.k === 'hover')).length; }
  assert.ok(got.anna >= 1 && got.skein >= 1 && got.myra >= 1 && got.anna + got.skein + got.myra >= 6, 'second jumps and hovers by bots over four 4-minute runs each: ' + JSON.stringify(got));
});
test('air poses (0.25): the rig\'s air clocks: take-off, the top, the fall, a second jump, the hover, the landing', () => {
  const M = require(path.join(__dirname, '..', 'js', 'motion.js')), m = M.create(), u = { x: 0, z: 0, yaw: 0, onGround: true, vy: 0, jumps: 0, def: { id: 'skein' }, lastShotT: -99 };
  const f = (n, fn) => { let a, mx = {}; for (let i = 0; i < n; i++) { if (fn) fn(i); a = M.pose(m, u, 1 / 60, i / 60, false).airs; for (const k of ['tko', 'rise', 'apex', 'fall', 'dbl', 'hov']) mx[k] = Math.max(mx[k] || 0, a[k]); } return { a, mx }; };
  let r = f(10); assert.strictEqual(r.mx.tko + r.mx.rise + r.mx.apex + r.mx.fall + r.mx.hov, 0, 'on the ground: no air');
  u.onGround = false; u.vy = 9.6; u.jumps = 1; r = f(6, () => { u.vy -= C.GRAV / 60; }); assert.ok(r.mx.tko > 0.8 && r.a.rise > 0.5, 'a take-off, then the rise');
  r = f(20, () => { u.vy -= C.GRAV / 60; }); assert.ok(r.a.tko < 0.05 && r.mx.apex > 0.8, 'the take-off is over by the top: ' + r.a.tko.toFixed(2) + ', ' + r.mx.apex.toFixed(2));
  const n0 = m.A.n; u.vy = 9.2; u.jumps = 2; r = f(1); assert.strictEqual(m.A.n, n0 + 1, 'a second jump is seen'); r = f(16); assert.ok(r.mx.dbl > 0.9, 'its envelope peaks');
  r = f(30, () => { u.vy = -9; }); assert.ok(r.a.dbl === 0 && r.a.dblP === 1 && r.a.fall > 0.9, 'it ends; falling');
  u.hoverT = 1; r = f(15, () => { u.vy = -1.5; }); assert.ok(r.a.hov > 0.9, 'the hover blends in in a quarter second: ' + r.a.hov.toFixed(2));
  u.hoverT = 0; r = f(30); assert.ok(r.a.hov < 0.05, 'and out');
  u.onGround = true; u.vy = 0; u.jumps = 0; r = f(3); assert.strictEqual(r.a.tko + r.a.rise + r.a.apex + r.a.fall + r.a.dbl, 0, 'landed');
  const k = M.create(); u.onGround = false; u.vy = 4; M.pose(k, u, 1 / 60, 0, false); assert.ok(k.A.tk > 1, 'a knock up (4 m/s) is not a take-off');
});
/* 0.23 WARDROBE. The unlock rules are pure functions of the saved settings; js/wardrobe.js loads under Node without a page. */
const WD = (require(path.join(__dirname, '..', 'js', 'wardrobe.js')), LL.wardrobe);
// what main.js does at boot: its own fields from the save, then the wardrobe's (defaults, saved values, repair)
const boot = (save) => { const cfg = { bestStars: 0, wins: 0, losses: 0, unl: {}, all: false }; if (save) for (const k in cfg) if (k in save) cfg[k] = save[k]; return WD.adopt(cfg, save || null); };
// one match a person played, as events: goals done during it, Cabinet secrets found during it, then the end
function playOne(cfg, known, m) {
  const got = [], mid = [];
  for (const id of m.goals || []) { WD.count(cfg, { k: 'goal', id }, null); WD.settle(cfg, known, got); }
  for (const id of m.cab || []) { cfg.unl[id] = 1; WD.settle(cfg, known, got); }
  mid.push(...got);
  WD.count(cfg, Object.assign({ k: 'over' }, m.over || { short: true, n: m.n || 0, winner: 0 }), m.W || { diff: 1 }); if ((m.over || {}).short !== false && m.n > (cfg.bestStars || 0)) cfg.bestStars = m.n;
  WD.settle(cfg, known, got); return { got, mid };
}
test('wardrobe: a catalogue of things in five slots, each with a line and a rule that says how to earn it', () => {
  assert.ok(WD.ITEMS.length >= 12 && WD.ITEMS.length <= 18, WD.ITEMS.length + ' items');
  const slots = WD.SLOTS.map(s => s.id); assert.deepStrictEqual(slots, ['trail', 'step', 'ring', 'lamp', 'ghost']);
  for (const s of slots) assert.ok(WD.ITEMS.filter(it => it.slot === s).length >= 3, s + ' has at least three');
  const ids = new Set(); for (const it of WD.ITEMS) { assert.ok(!ids.has(it.id), 'unique ' + it.id); ids.add(it.id); assert.ok(it.name && it.line && !/!/.test(it.line + it.name), it.id + ': a name and a quiet line');
    assert.ok(WD.how(it).length > 4, it.id + ' says how it is earned: ' + WD.how(it)); assert.ok(WD.PAL[it.id] && WD.PAL[it.id].d, it.id + ' has colours'); }
  for (const c of WD.ITEMS.filter(it => it.rule.cab)) assert.ok(LL.CABINET.find(x => x.id === c.rule.cab && x.feat), c.id + ' reads a real Cabinet secret');
  for (const c of WD.ITEMS.filter(it => it.rule.goal)) assert.ok(LL.GOALS.find(x => x.id === c.rule.goal), c.id + ' reads a real goal');
});
test('wardrobe: old saves keep working, with defaults and credit for what they prove', () => {
  const a = boot(null); assert.deepStrictEqual([a.starsTotal, a.rains, a.lightsTotal, a.winsBy, a.wear, a.goalsEver], [0, 0, 0, [0, 0, 0], {}, {}]); assert.deepStrictEqual(WD.open(a), [], 'a new player owns nothing yet');
  const old = { sens: 1.2, look: 'ink', wins: 2, losses: 5, bestStars: 3, unl: { snuff: 1, plates: 1 }, petUnlocked: true }; // a 0.22 save: no wardrobe fields at all
  const b = boot(old); assert.strictEqual(b.rains, 1, 'a best star count means a First Rain was finished'); assert.strictEqual(b.starsTotal, 3);
  const ob = WD.open(b); for (const id of ['halo', 'powder', 'lantern', 'fireflies']) assert.ok(ob.includes(id), 'credited ' + id); assert.ok(!ob.includes('petals') && !ob.includes('motes'), 'and nothing it cannot prove');
  assert.deepStrictEqual(b.wear, {}, 'nothing is put on at load'); assert.strictEqual(WD.worn(b, 'ring'), null);
  const c = boot({ starsTotal: '7', rains: -2, goalsEver: null, winsBy: 'x', wear: { ring: 'motes', trail: 'nope', lamp: '' }, wardSeen: [1], unl: 'x' });
  assert.deepStrictEqual([c.starsTotal, c.rains, c.goalsEver, c.winsBy, c.wear, c.wardSeen, c.unl], [7, 0, {}, [0, 0, 0], { lamp: '' }, {}, {}], 'broken fields repaired; a wrong slot is dropped');
  const d = boot(JSON.parse(JSON.stringify(b))); assert.deepStrictEqual(WD.open(d), ob, 'the same after a save and a load'); assert.deepStrictEqual(boot(JSON.parse(JSON.stringify(d))), d, 'repair is idempotent');
});
test('wardrobe: rules are pure; locked things cannot be worn; the hidden Cabinet switch opens everything', () => {
  const cfg = boot({ bestStars: 2, unl: { snuff: 1 } }), before = JSON.stringify(cfg);
  for (const it of WD.ITEMS) { WD.has(cfg, it); WD.progress(cfg, it); WD.how(it); } WD.open(cfg); WD.next(cfg, 3); assert.strictEqual(JSON.stringify(cfg), before, 'reading a rule changes nothing');
  assert.strictEqual(WD.equip(cfg, 'gilt'), false, 'locked'); assert.strictEqual(cfg.wear.ghost, undefined);
  assert.ok(WD.equip(cfg, 'lantern')); assert.strictEqual(WD.worn(cfg, 'lamp').id, 'lantern'); assert.ok(WD.equip(cfg, '', 'lamp')); assert.strictEqual(WD.worn(cfg, 'lamp'), null); assert.strictEqual(cfg.wear.lamp, '', 'taken off on purpose');
  cfg.all = true; assert.strictEqual(WD.open(cfg).length, WD.ITEMS.length, 'everything open'); assert.ok(WD.equip(cfg, 'gilt')); assert.strictEqual(WD.worn(cfg, 'ghost').id, 'gilt');
  cfg.all = false; assert.strictEqual(WD.worn(cfg, 'ghost'), null, 'switched off again, what was not earned is not worn');
  delete cfg.wear.ghost; const k = WD.known(cfg); assert.strictEqual(WD.count(cfg, { k: 'goal', id: 'echo' }), true); assert.strictEqual(WD.count(cfg, { k: 'goal', id: 'echo' }), false, 'a goal counts once');
  const got = WD.settle(cfg, k, []); assert.deepStrictEqual(got.map(x => x.id), ['moon']); assert.strictEqual(cfg.wear.ghost, 'moon', 'the first in a never-chosen slot is put on');
  cfg.goalsEver.orbs = 1; cfg.wear.trail = ''; WD.settle(cfg, k, []); assert.strictEqual(cfg.wear.trail, '', 'a slot taken off on purpose stays off');
});
test('wardrobe: the first thing opens during the first First Rain, the next when it ends', () => {
  // the real sim (bots at the player's hands); every event is counted as main.js counts a person's
  const W = world({ mode: 'short' }), cfg = boot(null), known = WD.known(cfg), got = []; let firstAt = -1;
  const ev = run(W, 400, keepAlive); assert.ok(W.over, 'the rain ended');
  for (const e of ev) { WD.count(cfg, e, W); WD.settle(cfg, known, got); if (got.length && firstAt < 0) firstAt = e.at; }
  assert.ok(firstAt > 0 && firstAt < 120, 'something opened mid-match, at ' + firstAt.toFixed(0) + ' s: ' + got.map(x => x.id).join(', ')); assert.strictEqual(got[0].id, 'motes');
  assert.strictEqual(cfg.rains, 1); assert.ok(cfg.starsTotal >= 0 && got.some(x => x.id === 'halo'), 'finishing it opens the halo');
  assert.strictEqual(WD.worn(cfg, 'trail').id, 'motes', 'and they are worn at once'); assert.strictEqual(WD.worn(cfg, 'ring').id, 'halo');
});
test('wardrobe: the ladder gives something every match or two for the first ten, and says what is next', () => {
  // counted thresholds rise along the ladder, kind by kind
  for (const kind of ['rains', 'stars', 'lights']) { const t = WD.ITEMS.filter(it => it.rule[kind]).map(it => it.rule[kind]); assert.deepStrictEqual(t, t.slice().sort((a, b) => a - b), kind + ' in order: ' + t); }
  const profiles = {
    'one star a match, no secrets': Array.from({ length: 10 }, (_, i) => ({ n: 1, goals: i === 0 ? ['orbs', 'thread', 'view'] : [] })),
    'a few stars, the usual goals': [{ n: 1, goals: ['orbs', 'thread', 'view'] }, { n: 1, goals: ['thief'], cab: ['snuff'] }, { n: 2, goals: ['guard'] }, { n: 1 }, { n: 2, goals: ['echo'] }, { n: 2 }, { n: 1, goals: ['mood'], cab: ['plates'] }, { n: 2 }, { n: 2 }, { n: 3, goals: ['ness'], cab: ['peachball'] }],
    'no stars at all': Array.from({ length: 10 }, () => ({ n: 0 }))
  };
  for (const name in profiles) {
    const cfg = boot(null), known = WD.known(cfg), per = [];
    profiles[name].forEach((m, i) => { const nx = WD.next(cfg, 1)[0]; assert.ok(nx && !WD.has(cfg, nx) && WD.ITEMS.every(it => it.rank >= nx.rank || WD.has(cfg, it)), 'next is the first locked thing on the ladder');
      const r = playOne(cfg, known, m); per.push(r.got.length); if (i === 0 && name !== 'no stars at all') assert.ok(r.mid.length >= 1, name + ': the first match opens something before it ends'); });
    assert.ok(per[0] >= 1, name + ': something in the first match');
    for (let i = 0; i + 1 < per.length; i++) assert.ok(per[i] + per[i + 1] >= 1, name + ': nothing new in matches ' + (i + 1) + ' and ' + (i + 2) + ' (' + per.join(' ') + ')');
    assert.ok(WD.open(cfg).length >= 5, name + ': ' + WD.open(cfg).length + ' things after ten matches (' + per.join(' ') + ')');
  }
  const win = boot(null); WD.count(win, { k: 'over', winner: 0 }, { diff: 2 }); assert.deepStrictEqual(win.winsBy, [0, 0, 1], 'a livelock won on Cruel'); assert.ok(WD.has(win, 'gilt'));
  WD.count(win, { k: 'over', winner: 0 }, { diff: 0, lean: true }); assert.deepStrictEqual(win.winsBy, [0, 0, 1], 'leaning back wins nothing, as with the record');
  const ef = boot(null); for (let i = 0; i < 5; i++) WD.count(ef, { k: 'relit', recovered: true }); WD.count(ef, { k: 'relit' }); assert.strictEqual(ef.lightsTotal, 5); assert.ok(WD.has(ef, 'splat'));
});
/* 0.25 rook: Rook Vale, the fifth hero, and Lantern Lift (from the Lantern Ford study, work/lantern-ford-wick-aviator). */
const ROOK = LL.HEROES.findIndex(d => d.id === 'rook');
// Rook alone in the open: no AI, nothing near, standing at (x, z) and looking down +z.
function rookAt(x, z) { const W = world({ heroPick: ROOK, auto: false }), h = W.player; h.useAI = false; h.x = x; h.z = z; h.y = 0; h.vx = h.vz = h.vy = 0; h.onGround = true; h.ctl.ax = x; h.ctl.az = z + 30; h.ctl.ay = 1.5; return { W, h, a: h.def.ab[1] }; }
// fly one lift with a fixed stick; returns what happened. Stops when he lands (or after `secs`).
function fly(W, h, mx, mz, secs, each) { const r = { top: 0, air: 0, ev: [], landed: false, rose: 0, sinkMax: 0 }; h.ctl.ab[1] = true;
  for (let i = 0; i < secs * 60; i++) { keepAlive(W); h.ctl.mx = mx; h.ctl.mz = mz; if (each) each(i); const y0 = h.y; S.step(1 / 60);
    for (const e of W.fx) if (e.u === h && /^(lift|liftthread|glide|liftland)$/.test(e.k)) r.ev.push(e.k); W.fx.length = 0;
    r.top = Math.max(r.top, h.y); if (!h.onGround) r.air += 1 / 60; if (h.glide) r.sinkMax = Math.max(r.sinkMax, (y0 - h.y) * 60); if (h.liftT > 0) r.rose += 1 / 60;
    if (r.ev.indexOf('lift') >= 0 && h.onGround && !h.liftT && !h.glide && i > 5) { r.landed = true; break; } }
  return r; }
test('Rook Vale is the fifth hero and the first four keep their indices', () => {
  assert.deepStrictEqual(LL.HEROES.map(d => d.id), ['dora', 'anna', 'myra', 'skein', 'rook'], 'saves store the hero as an index');
  const d = LL.HEROES[4]; assert.strictEqual(d.name, 'Rook Vale'); assert.strictEqual(d.title, 'The Wick Aviator'); assert.deepStrictEqual(d.ab.map(a => a.kind), ['line', 'lift', 'zone']); assert.deepStrictEqual(d.ab.map(a => a.key), ['Q', 'E', 'F']);
  assert.strictEqual(d.air.jumps, 1); assert.ok(d.ab[2].ult && !d.ab[0].ult && !d.ab[1].ult);
  assert.strictEqual(d.build.length, C.MAX_ITEMS); assert.deepStrictEqual(d.build.slice().sort((a, b) => a - b), LL.ITEMS.map((_, i) => i), 'the bot build names every item once');
  const hs = LL.HEROES.slice(0, 4), lo = (k) => Math.min.apply(null, hs.map(k)), hi = (k) => Math.max.apply(null, hs.map(k)), dps = (x) => x.gun.dmg * x.gun.rate * x.gun.pellets;
  assert.ok(d.hp >= lo(x => x.hp) && d.hp <= hi(x => x.hp), 'health within the others'); assert.ok(d.speed >= lo(x => x.speed) && d.speed <= hi(x => x.speed), 'speed within the others');
  assert.ok(dps(d) >= lo(dps) * 0.95 && dps(d) <= hi(dps) * 1.05, 'gun damage per second within the others: ' + dps(d));
  for (let i = 0; i < 5; i++) { const W = world({ heroPick: i }); assert.strictEqual(W.player.def.id, LL.HEROES[i].id); assert.strictEqual(W.player.defIdx, i); assert.strictEqual(new Set(W.heroes.map(h => h.def.id)).size, 3, 'three different heroes'); }
});
test('Lantern Lift: about a second of rise, never above the cap, then a glide down slower than a fall', () => {
  const { W, h, a } = rookAt(-24, 20); assert.ok(LL.laneNearest(1, h.x, h.z, { s: 0, d: 0 }).d > 20, 'well off every thread');
  const r = fly(W, h, 0, 1, 8);
  assert.deepStrictEqual(r.ev, ['lift', 'glide', 'liftland'], 'events in order, no thread: ' + r.ev);
  assert.ok(Math.abs(r.rose - a.rise) < 0.06, 'rise lasted ' + r.rose.toFixed(2) + ' s');
  assert.ok(r.top > a.cap - 0.6 && r.top <= a.cap + 1e-6, 'top ' + r.top.toFixed(2) + ' m, cap ' + a.cap);
  assert.ok(r.sinkMax <= a.sink + 0.05, 'never sinks faster than ' + a.sink + ' m/s while gliding: ' + r.sinkMax.toFixed(2));
  const drop = Math.sqrt(2 * a.cap / C.GRAV); assert.ok(r.air - a.rise > drop * 1.8, 'the way down (' + (r.air - a.rise).toFixed(2) + ' s) is a glide, not a fall (' + drop.toFixed(2) + ' s)');
  assert.ok(r.landed && h.onGround && h.y === 0 && !h.glide && h.liftT === 0, 'and he lands');
  assert.ok(h.z - 20 > 14, 'steered forward ' + (h.z - 20).toFixed(1) + ' m');
});
test('Lantern Lift: steerable, he can fire aloft, and the jump cannot add height', () => {
  const { W, h, a } = rookAt(-24, 20); let shots = 0, top = 0, x1 = 0;
  h.ctl.ab[1] = true;
  for (let i = 0; i < 150; i++) { keepAlive(W); h.ctl.mx = i < 40 ? 0 : 1; h.ctl.mz = i < 40 ? 1 : 0; h.ctl.fire = true; h.ctl.jump = i % 10 === 0; h.ctl.ax = h.x; h.ctl.az = h.z + 30; S.step(1 / 60);
    shots += W.fx.filter(e => e.k === 'shot' && e.u === h && !h.onGround).length; W.fx.length = 0; top = Math.max(top, h.y); if (i === 40) x1 = h.x; if (h.onGround && i > 10) break; }
  assert.ok(shots >= 3, 'fired ' + shots + ' shots in the air'); assert.ok(top <= a.cap + 1e-6, 'jumping while aloft did not pass the cap: ' + top.toFixed(2)); assert.ok(h.x - x1 > 4, 'turned in the air: ' + (h.x - x1).toFixed(1) + ' m sideways');
});
test('Lantern Lift respects its cooldown: no continuous flight', () => {
  const { W, h, a } = rookAt(-24, 20); const r = fly(W, h, 0, 0, 8); assert.ok(r.landed);
  assert.ok(h.cds[1] > a.cd - r.air - 0.2 && h.cds[1] > 4, 'still cooling when he lands: ' + h.cds[1].toFixed(1) + ' s'); assert.ok(r.air < a.cd * 0.5, 'aloft ' + r.air.toFixed(2) + ' s of a ' + a.cd + ' s cooldown');
  let lifts = 0, air = 0; for (let i = 0; i < 30 * 60; i++) { keepAlive(W); h.ctl.ab[1] = true; h.ctl.mx = 0; h.ctl.mz = 0; S.step(1 / 60); lifts += W.fx.filter(e => e.k === 'lift').length; W.fx.length = 0; if (!h.onGround) air++; }
  assert.ok(lifts >= 3 && lifts <= 4, lifts + ' lifts in 30 s with the key held'); assert.ok(air / 60 < 12, 'on the ground most of the time: ' + (air / 60).toFixed(1) + ' s of 30 in the air');
});
test('Lantern Lift: a thread catches him once per lift, only when he flies along it', () => {
  const off = fly.apply(null, (() => { const q = rookAt(-24, 20); return [q.W, q.h, 0, 1, 8]; })());
  // on the Middle thread, flying along it
  const A = rookAt(0, -20), along = fly(A.W, A.h, 0, 1, 8);
  assert.strictEqual(along.ev.filter(k => k === 'liftthread').length, 1, 'caught exactly once: ' + along.ev); assert.ok(A.h.liftCaught);
  assert.ok(Math.abs((along.rose - off.rose) - A.a.thread) < 0.08, 'the catch added ' + (along.rose - off.rose).toFixed(2) + ' s of rise'); assert.ok(along.top <= A.a.cap + 1e-6);
  // across the thread: no catch
  const X = rookAt(-10, -20), across = fly(X.W, X.h, 1, 0, 8); assert.strictEqual(across.ev.filter(k => k === 'liftthread').length, 0, 'crossing a thread is not following it');
  // gliding onto a thread and turning along it: caught then, lifted again for a moment, still once
  const G = rookAt(-11, -20); let turned = false; const late = fly(G.W, G.h, 1, 0, 8, () => { if (G.h.glide && Math.abs(G.h.x) < 1.6) turned = true; if (turned) { G.h.ctl.mx = 0; G.h.ctl.mz = 1; } });
  assert.strictEqual(late.ev.filter(k => k === 'liftthread').length, 1, 'caught from the glide: ' + late.ev); assert.ok(late.ev.indexOf('liftthread') > late.ev.indexOf('glide')); assert.strictEqual(late.ev.filter(k => k === 'glide').length, 2, 'and glides again after');
  // standing still over a thread: nothing to follow
  const St = rookAt(0, -20), still = fly(St.W, St.h, 0, 0, 8); assert.strictEqual(still.ev.filter(k => k === 'liftthread').length, 0);
});
test('Landing Bell tolls where he is when it rings, and waits for level three', () => {
  const { W, h } = rookAt(-24, 20); h.level = 1; h.ctl.ab[2] = true; S.step(1 / 30); assert.strictEqual(W.zones.length, 0, 'no bell before the ult level');
  h.level = C.ULT_LEVEL; h.ctl.ab[1] = true; S.step(1 / 30); h.ctl.ab[2] = true; h.ctl.mz = 1; let toll = null;
  for (let i = 0; i < 90 && !toll; i++) { keepAlive(W); h.ctl.mz = 1; S.step(1 / 30); toll = W.fx.find(e => e.k === 'toll'); W.fx.length = 0; }
  assert.ok(toll, 'it tolled'); assert.ok(Math.hypot(toll.x - h.x, toll.z - h.z) < 1, 'on him, not where he rang it'); assert.ok(toll.z - 20 > 4, 'he had moved ' + (toll.z - 20).toFixed(1) + ' m');
});
test('bots with Rook play whole matches, use the lift, and nothing breaks', () => {
  for (const mode of ['short', 'match', 'fallen']) { const W = world({ heroPick: ROOK, mode: mode, seed: 11 }), h = W.player; assert.strictEqual(h.def.id, 'rook'); let lifts = 0, top = 0, bad = 0;
    for (let i = 0; i < 150 * 30 && !W.over; i++) { S.step(1 / 30); lifts += W.fx.filter(e => e.k === 'lift' && e.u === h).length; W.fx.length = 0; top = Math.max(top, h.y); if (!W.heroes.every(u => [u.x, u.y, u.z, u.vx, u.vy, u.vz, u.hp].every(Number.isFinite))) bad++; }
    assert.strictEqual(bad, 0, mode + ': every hero number stays finite'); assert.ok(top <= h.def.ab[1].cap + 1e-6, mode + ': never above the cap (' + top.toFixed(2) + ')'); assert.ok(lifts >= 1, mode + ': the bot lifted ' + lifts + ' times in 150 s'); }
  // as an ally of each of the other four, and dying mid-lift does not leave him flying
  let allied = 0; for (let seed = 1; seed < 40 && allied < 4; seed++) { const W = world({ heroPick: seed % 4, seed: seed }); if (W.heroes.some(u => u.def.id === 'rook' && !u.isPlayer)) { allied++; run(W, 40); } } assert.ok(allied >= 3, 'Rook rolled as a bot ally ' + allied + ' times');
  const { W, h } = rookAt(-24, 20); h.ctl.ab[1] = true; for (let i = 0; i < 20; i++) S.step(1 / 60); assert.ok(h.liftT > 0 && h.y > 1); S._t.kill ? S._t.damage(h, 1e6, null, 'unit') : 0; assert.ok(!h.alive); W.fx.length = 0;
  const ev = run(W, 40, w => { w.patron.forEach(p => { p.hp = p.maxHp; }); }); assert.ok(h.alive, 'respawned'); assert.ok(!ev.some(e => e.k === 'liftland' || e.k === 'glide'), 'no lift events from a dead pilot'); assert.ok(!h.glide && h.liftT === 0);
});
/* ---------- 0.26 ness: the chomp and the flood ----------
   The sim still uses Math.random (issue #27), so staged tests place every piece by hand and whole-match tests sum over seeds. */
const NS = S.NESS;
function nessUp(o) { const W = world(o), n = W.ness; n.respT = 0; S.step(1 / 30); n.rise = 1; n.chompT = 0; n.floodAt = 1e9; n.floodHp = true; W.fx.length = 0; W.waveT = 1e9; W.thiefT = 1e9;
  W.heroes.forEach((h, i) => { h.useAI = false; h.x = -60 + i * 3; h.z = -100; }); return W; }
function stand(W, d, ang) { const h = W.player, n = W.ness; h.x = n.x + Math.sin(ang || Math.PI) * d; h.z = n.z + Math.cos(ang || Math.PI) * d; h.y = 0; h.vx = h.vy = h.vz = 0; h.onGround = true; return h; }
const fine = (W) => W.heroes.every(h => [h.x, h.y, h.z, h.vx, h.vy, h.vz, h.hp].every(isFinite)) && [W.ness.x, W.ness.z, W.ness.yaw, W.ness.hp].every(isFinite);
test('the Ness chomps only after its tell; the bite hurts once, holds, then throws the hero clear', () => {
  const W = nessUp(), n = W.ness, h = stand(W, 11.5), hp0 = h.hp; let heldT = 0, moved = 0;
  const ev = run(W, 6, w => { if (h.held) { heldT += 1 / 30; h.ctl.mx = 1; const x0 = h.x; moved = Math.max(moved, Math.abs(h.x - x0)); } w.heroes.forEach(o => { if (o !== h) { o.x = -60; o.z = -100; } }); });
  const tell = ev.find(e => e.k === 'nesstell'), lock = ev.find(e => e.k === 'nesslock'), bite = ev.find(e => e.k === 'nesschomp'), rel = ev.find(e => e.k === 'nessrelease');
  assert.ok(tell && tell.u === h, 'a tell on the hero in reach'); assert.ok(lock && bite && rel, 'lock, chomp and release all happened');
  assert.ok(Math.abs(bite.at - tell.at - NS.TELL) < 0.08, 'the bite lands NESS.TELL after the tell: ' + (bite.at - tell.at).toFixed(2));
  assert.ok(Math.abs(bite.at - lock.at - NS.LOCK) < 0.08, 'the spot stops following NESS.LOCK before the bite');
  assert.ok(!ev.some(e => e.k === 'hit' && e.p === 2 && e.at < bite.at - 0.01), 'no harm before the bite');
  assert.ok(bite.hit && bite.u === h && bite.held, 'caught and held');
  const want = (NS.BITE + NS.BITE_MIN * bite.at / 60) * (1 - h.st.resist), hits = ev.filter(e => e.k === 'hit' && e.p === 2);
  assert.strictEqual(hits.length, 1, 'one bite, no more harm while held'); assert.ok(Math.abs(hits[0].amt - want) < 2, 'bite damage ' + hits[0].amt.toFixed(0) + ', want ' + want.toFixed(0));
  assert.ok(Math.abs(rel.at - bite.at - NS.HOLD) < 0.1 && rel.why === 'time', 'held NESS.HOLD seconds without mashing: ' + (rel.at - bite.at).toFixed(2));
  assert.ok(!h.held && h.alive && h.hp < hp0, 'released alive');
  assert.ok(Math.hypot(h.x - n.x, h.z - n.z) > NS.REACH - 3, 'thrown clear of the loch: ' + Math.hypot(h.x - n.x, h.z - n.z).toFixed(1) + ' m');
  assert.ok(ev.filter(e => e.k === 'nesstell').length === 1, 'not picked again at once (safe for NESS.SAFE, then the cooldown)');
});
test('the chomp is dodged by a timed jump, a dash out of the ring, or a thread; a miss leaves the Ness open', () => {
  // standing still: bitten (the control)
  let W = nessUp(), h = stand(W, 11.5); let ev = run(W, 1.4); assert.ok(ev.some(e => e.k === 'nesschomp' && e.hit && e.u === h), 'standing still is caught');
  // a jump over the bite
  W = nessUp(); h = stand(W, 11.5); const n = W.ness;
  ev = run(W, 1.4, w => { const ch = w.ness.chomp; if (ch && ch.ph === 'tell' && ch.t <= 0.32 && h.onGround) h.ctl.jump = true; });
  let bite = ev.find(e => e.k === 'nesschomp'); assert.ok(bite && !bite.hit && !h.held, 'a jump clears the jaws'); assert.ok(n.openT > 0, 'a miss leaves it open');
  const hp0 = n.hp; S._t.damage(n, 100, h, 'gun'); assert.ok(Math.abs((hp0 - n.hp) - 100 * NS.OPEN_MUL) < 1e-6, 'open: it takes NESS.OPEN_MUL damage');
  ev = run(W, NS.OPEN + 0.2, w => { h.x = -60; h.z = -100; }); const hp1 = n.hp; S._t.damage(n, 100, h, 'gun'); assert.ok(Math.abs((hp1 - n.hp) - 100) < 1e-6, 'and ordinary damage once it has recovered');
  assert.ok(!ev.some(e => e.k === 'nesstell' || e.k === 'nessspit'), 'while open it does nothing');
  // a dash once the spot has locked
  W = nessUp(); h = stand(W, 11.5);
  ev = run(W, 1.4, w => { const ch = w.ness.chomp; if (ch && ch.locked && h.dashT <= 0 && !h.dashed) { h.dashed = true; h.ctl.mx = 0; h.ctl.mz = -1; h.ctl.dash = true; } });
  bite = ev.find(e => e.k === 'nesschomp'); assert.ok(bite && !bite.hit && !h.held, 'a dash out of the ring is not caught');
  // on a thread: not prey at all
  W = nessUp(); h = stand(W, 11.5); h.zip = { lane: 1, dir: 1, s: 60 }; ev = run(W, 0.3); assert.ok(!ev.some(e => e.k === 'nesstell'), 'a hero riding a thread is not bitten');
  // out of reach: nothing
  W = nessUp(); h = stand(W, NS.REACH + 2); ev = run(W, 3, w => { stand(w, NS.REACH + 2); }); assert.ok(!ev.some(e => e.k === 'nesstell'), 'no tell beyond NESS.REACH');
});
test('held in the jaws: mashing or a friend shooting the Ness ends it early; the Ness dying lets go', () => {
  const held = () => { const W = nessUp(), h = stand(W, 11.5); const ev = run(W, 0.98); assert.ok(h.held, 'held'); return { W, h, at: W.t }; };
  let r = held(), k = 0; let ev = run(r.W, 2, w => { if (r.h.held && k++ % 4 === 0) r.h.ctl.jump = true; }); let rel = ev.find(e => e.k === 'nessrelease');
  assert.ok(rel && rel.why === 'mash' && rel.at - r.at < NS.HOLD - 0.3, 'mashing jump gets out early: ' + (rel.at - r.at).toFixed(2) + ' s');
  r = held(); const y0 = r.h.y; r.h.ctl.mx = 1; r.h.ctl.fire = true; r.h.ctl.ab[0] = true; const am = r.h.ammo; S.step(1 / 30); assert.ok(r.h.ammo === am && r.h.cds[0] <= 0, 'no shooting or casting from the jaws'); r.W.fx.length = 0;
  S._t.damage(r.W.ness, r.W.ness.maxHp * (NS.LETGO + 0.01), r.W.heroes[0] === r.h ? r.W.heroes[2] : r.W.heroes[0], 'gun'); ev = run(r.W, 0.2); rel = ev.find(e => e.k === 'nessrelease'); assert.ok(rel && rel.why === 'shot', 'shot free by a friend');
  r = held(); S._t.damage(r.W.ness, 1e7, r.W.heroes[0], 'gun'); assert.ok(!r.h.held && !r.W.ness.alive, 'the Ness dying lets go'); ev = run(r.W, 3); assert.ok(r.h.alive && fine(r.W));
  // dying in the jaws does not leave the next life held
  r = held(); S._t.damage(r.h, 1e7, null, 'unit'); run(r.W, 1); assert.ok(!r.h.held && !r.W.ness.chomp, 'a dead hero is dropped');
});
test('the flood: a warning, the water runs out from the loch, stands, drains, and always ends', () => {
  const W = nessUp(), n = W.ness; assert.strictEqual(S.waterAt(0, 0), 0); assert.ok(S._t.flood('test'));
  const far = [[-77, 137], [77, -137], [-77, -137]]; let highT = 0, wetFar = 0, nearT = 0, outSeen = false, maxAway = 0;
  const ev = run(W, 40, w => { if (w.flood && w.flood.ph === 'high') { highT += 1 / 30; if (far.every(p => S.waterAt(p[0], p[1]) === 1)) wetFar += 1 / 30; } if (S.waterAt(0, 0) > 0.5) nearT += 1 / 30; if (n.out) { outSeen = true; maxAway = Math.max(maxAway, Math.hypot(n.x - n.hx, n.z - n.hz)); } });
  const at = k => { const e = ev.find(x => x.k === k); return e ? e.at : -1; }, t0 = at('floodwarn');
  assert.ok(t0 >= 0 && at('flood') > 0 && at('flooddrain') > 0 && at('floodend') > 0, 'floodwarn, flood, flooddrain, floodend');
  assert.ok(Math.abs(at('flood') - t0 - NS.SWELL) < 0.1, 'NESS.SWELL seconds of warning'); assert.ok(at('flood') < at('flooddrain') && at('flooddrain') < at('floodend'));
  assert.ok(Math.abs(highT - NS.HIGH) < 0.15 && Math.abs(wetFar - highT) < 0.05, 'the whole field is under water for NESS.HIGH seconds: ' + wetFar.toFixed(1));
  assert.ok(nearT > 12 && nearT < 20, 'the middle thread is wet ' + nearT.toFixed(1) + ' s'); assert.ok(at('floodend') - t0 < 25, 'over within 25 s: ' + (at('floodend') - t0).toFixed(1));
  assert.ok(!W.flood && S.waterAt(0, 0) === 0, 'dry again'); assert.ok(outSeen && maxAway > 15, 'the Ness left the loch (' + maxAway.toFixed(0) + ' m)');
  assert.ok(!n.out && n.x === n.hx && n.z === n.hz && n.alive, 'and is back in it'); assert.ok(S._t.flood('again') && W.flood.ph === 'swell', 'and a later flood can start');
});
test('in the flood heroes wade slower, move faster in the air, skim farther on a dash, and are carried by the current', () => {
  const setup = (wet) => { const W = nessUp(), h = W.player; if (wet) { S._t.flood('test'); run(W, NS.SWELL + NS.FAR / NS.FRONT + 0.3); assert.strictEqual(W.flood.ph, 'high'); } W.ness.alive = wet; if (!wet) W.ness.respT = 1e9; h.x = -24; h.z = -30; h.y = 0; h.vx = h.vz = h.vy = 0; h.onGround = true; h.stamina = 3; return { W, h }; };
  const walk = (wet) => { const { W, h } = setup(wet); W.ness.out = false; W.ness.x = W.ness.hx; h.ctl.mx = 1; for (let i = 0; i < 45; i++) { h.ctl.mx = 1; S.step(1 / 30); } return Math.hypot(h.vx, h.vz); };
  const dry = walk(false), wet = walk(true); assert.ok(Math.abs(wet / dry - NS.WADE) < 0.02, 'wading is NESS.WADE of walking: ' + (wet / dry).toFixed(2));
  const air = (wet) => { const { W, h } = setup(wet); let top = 0; h.ctl.jump = true; for (let i = 0; i < 20; i++) { h.ctl.mx = 1; S.step(1 / 30); if (!h.onGround) top = Math.max(top, Math.hypot(h.vx, h.vz)); } return top; };
  const a0 = air(false), a1 = air(true); assert.ok(a1 > a0 * 1.1, 'faster through the air over the water: ' + (a1 / a0).toFixed(2));
  const dash = (wet) => { const { W, h } = setup(wet); const x0 = h.x; h.ctl.mx = 1; h.ctl.dash = true; for (let i = 0; i < 14; i++) { h.ctl.mx = 0; S.step(1 / 60); } return h.x - x0; };
  const d0 = dash(false), d1 = dash(true); assert.ok(d1 > d0 * 1.3, 'a dash skims farther: ' + d0.toFixed(1) + ' m dry, ' + d1.toFixed(1) + ' m wet');
  // the current: standing on a thread's line, carried away from the middle of the valley; off the threads, not carried
  let r = setup(true); r.h.x = 0; r.h.z = 30; for (let i = 0; i < 30; i++) S.step(1 / 30); assert.ok(Math.abs((r.h.z - 30) - NS.CUR) < 0.3, 'carried up the thread at NESS.CUR: ' + (r.h.z - 30).toFixed(2) + ' m in a second');
  r = setup(true); r.h.x = 0; r.h.z = -30; for (let i = 0; i < 30; i++) S.step(1 / 30); assert.ok(r.h.z < -31.5, 'and the other way on the other side');
  r = setup(true); r.h.x = -24; r.h.z = -30; for (let i = 0; i < 30; i++) S.step(1 / 30); assert.ok(Math.abs(r.h.z + 30) < 0.01, 'no current off the threads');
  // a thread is above the water: the ride is as fast as ever
  const ride = (wet) => { const { W, h } = setup(wet); h.x = 0; h.z = -60; h.ctl.zip = true; h.ctl.zipDir = 1; S.step(1 / 30); assert.ok(h.zip, 'on the thread'); const z0 = h.z; for (let i = 0; i < 30; i++) S.step(1 / 30); return h.z - z0; };
  assert.ok(Math.abs(ride(true) - ride(false)) < 0.2, 'riding a thread is not slowed');
});
test('in the flood small troopers float slower and drift; a hollow does not drift', () => {
  const W = nessUp(); S._t.flood('test'); W.waveT = 0; run(W, NS.SWELL + NS.FAR / NS.FRONT + 0.3, w => { w.ness.out = false; w.ness.x = w.ness.hx; w.ness.z = w.ness.hz; w.ness.chompT = 9; });
  const t = W.troopers.find(u => u.alive && u.team === 0 && u.lane === 0 && !u.big); assert.ok(t, 'a trooper');
  W.troopers.forEach(u => { if (u !== t) u.alive = false; }); t.s = 40; t.lat = 0; t.x = LL.lanes[0].pts[2][0]; t.z = -64; const s0 = (LL.laneNearest(0, t.x, t.z, t._q = {}), t._q.s); t.s = s0;
  for (let i = 0; i < 30; i++) { W.ness.out = false; W.ness.chompT = 9; S.step(1 / 30); } const went = t.s - s0;
  // marching +s at 5.2 x NESS.FLOAT, drifting -s (z < 0: away from the middle) at NESS.DRIFT
  assert.ok(Math.abs(went - (5.2 * NS.FLOAT - NS.DRIFT)) < 0.35, 'floats and drifts: ' + went.toFixed(2) + ' m/s, want ' + (5.2 * NS.FLOAT - NS.DRIFT).toFixed(2));
  assert.ok(t.wet === 1);
});
test('a flood comes once a rising: when the Ness is hurt under NESS.FLOOD_HP, or by the clock, never into a red rain', () => {
  // by the clock: NESS.FLOOD_FIRST after it surfaces, with nobody near it
  let W = world({ seed: 3 }); let ev = run(W, 262, w => { keepAlive(w); w.rushNext[0] = w.rushNext[1] = 1e9; w.ness.hp = w.ness.maxHp; });
  let up = ev.find(e => e.k === 'nessup'), warn = ev.filter(e => e.k === 'floodwarn');
  assert.ok(up && Math.abs(up.at - 180) < 0.1); assert.ok(warn.length === 1 && warn[0].why === 'time' && Math.abs(warn[0].at - up.at - NS.FLOOD_FIRST) < 0.2, 'flood warning ' + (warn[0] && (warn[0].at - up.at).toFixed(1)) + ' s after it surfaces');
  // provoked: under NESS.FLOOD_HP of its health, once
  W = nessUp(); const n = W.ness; n.floodHp = false; S._t.damage(n, n.maxHp * (1 - NS.FLOOD_HP) - 5, null, 'unit'); ev = run(W, 1); assert.ok(!ev.some(e => e.k === 'floodwarn'), 'not above the line');
  S._t.damage(n, 10, null, 'unit'); ev = run(W, 30); warn = ev.filter(e => e.k === 'floodwarn'); assert.ok(warn.length === 1 && warn[0].why === 'hurt', 'provoked under the line'); assert.ok(ev.some(e => e.k === 'floodend'));
  n.hp = n.maxHp; run(W, 1); S._t.damage(n, n.maxHp * 0.5, null, 'unit'); ev = run(W, 20); assert.ok(!ev.some(e => e.k === 'floodwarn'), 'only once a rising'); assert.ok(n.floodAt > W.t + 150, 'the next one by the clock is NESS.FLOOD_EVERY away');
  // never into a red rain
  W = nessUp(); W.ness.floodAt = 0; W.redNext = W.t + 20; ev = run(W, 5); assert.ok(!ev.some(e => e.k === 'floodwarn'), 'held back before a red rain');
  W = nessUp(); W.ness.floodAt = 0; W.red = 30; ev = run(W, 5); assert.ok(!ev.some(e => e.k === 'floodwarn'), 'and during one');
});
test('the Ness roams and chomps in the flood, goes home, and killing it out there still gives the Greatness', () => {
  let W = nessUp(), n = W.ness; S._t.flood('test'); const h = W.player; let tells = 0, away = 0;
  let ev = run(W, 30, w => { if (w.flood && !h.held && h.onGround && w.flood.ph !== 'drain') { h.x = 0; h.z = -30; } away = Math.max(away, Math.hypot(n.x - n.hx, n.z - n.hz)); });
  assert.ok(ev.some(e => e.k === 'nesstell' && e.u === h), 'it swims to a hero standing in the water and bites'); assert.ok(away > 25, 'it crossed the field: ' + away.toFixed(0) + ' m from the loch');
  assert.ok(!n.out && n.x === n.hx && n.z === n.hz, 'home when the water has gone'); assert.ok(!W.flood);
  // killed out in the field
  W = nessUp(); n = W.ness; S._t.flood('test'); run(W, NS.SWELL + 2, w => { w.player.x = 0; w.player.z = -30; }); assert.ok(n.out && W.flood.ph !== 'swell');
  const k = W.heroes[0]; S._t.damage(n, 1e7, k, 'gun'); assert.ok(!n.alive && W.great[0] === C.GREAT_T, 'the Greatness for the side that landed it'); assert.strictEqual(W.flood.ph, 'drain', 'and the water starts back at once');
  ev = run(W, 6); assert.ok(ev.some(e => e.k === 'floodend') && !W.flood); assert.ok(W.great[0] > C.GREAT_T - 7 && W.great[0] < C.GREAT_T);
  ev = run(W, 245, keepAlive); assert.ok(ev.some(e => e.k === 'nessup') && n.alive && n.x === n.hx && !n.out, 'it comes back up in the loch');
});
test('whole bot matches with the Ness: floods end, nobody stays in the jaws, bots dodge some bites and ride threads, fishing goes on', () => {
  let floods = 0, tells = 0, bitten = 0, dodged = 0, zips = 0, fishing = 0, downs = 0, over = 0, longest = 0;
  for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
    const W = world({ seed: seed, heroPick: seed % LL.HEROES.length, difficulty: seed % 3 }); let fl0 = -1, heldT = 0, ok = true; const tgt = {};
    for (let i = 0; i < 1300 * 30 && !W.over; i++) {
      S.step(1 / 30);
      for (const e of W.fx) {
        if (e.k === 'floodwarn') { floods++; fl0 = W.t; } else if (e.k === 'floodend') { longest = Math.max(longest, W.t - fl0); fl0 = -1; }
        else if (e.k === 'nesstell' && e.u.kind === 'hero') { tells++; tgt.u = e.u; } else if (e.k === 'nesschomp' && tgt.u) { if (e.u) bitten++; else dodged++; tgt.u = null; }
        else if (e.k === 'zip' && W.flood && W.flood.ph !== 'swell') zips++; else if (e.k === 'fishing') fishing++; else if (e.k === 'nessdown') downs++;
      }
      W.fx.length = 0;
      heldT = W.heroes.some(h => h.held) ? heldT + 1 / 30 : 0; assert.ok(heldT < NS.HOLD + 0.2, 'seed ' + seed + ': held too long');
      if (fl0 >= 0) assert.ok(W.t - fl0 < 25, 'seed ' + seed + ': a flood that does not end');
      if (i % 30 === 0) ok = ok && fine(W);
    }
    assert.ok(ok, 'seed ' + seed + ': every number stays finite'); assert.ok(W.over, 'seed ' + seed + ': the match ends (' + W.t.toFixed(0) + ' s)'); over++;
    assert.ok(!W.ness.out || W.flood, 'seed ' + seed + ': the Ness is only out of the loch in a flood');
  }
  assert.ok(floods >= 8, 'a flood in every match: ' + floods); assert.ok(longest < 25, 'the longest flood: ' + longest.toFixed(1) + ' s');
  assert.ok(tells >= 8, 'heroes are picked: ' + tells); assert.ok(bitten >= 2 && dodged >= 2, 'bots dodge some bites and take some: ' + dodged + ' dodged, ' + bitten + ' bitten');
  assert.ok(zips >= 5, 'bots take the threads in a flood: ' + zips); assert.ok(fishing >= 4, 'bots still go fishing: ' + fishing); assert.ok(downs >= 4, 'and still land the Ness: ' + downs);
});
test('the model never reads the look: sim and core have no presentation references', () => {
  for (const f of ['core.js', 'sim.js']) { const src = fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8').replace(/typeof window !== 'undefined' \? window : globalThis/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"])\/\/.*$/gm, '$1'); // comments may talk about the rule; code may not break it
    for (const bad of [/\bLL\.gfx\b/, /\bLL\.ui\b/, /\bdocument\b/, /\bwindow\b/, /\blook\b/i, /\bLK\b/, /localStorage/]) assert.ok(!bad.test(src), f + ' mentions ' + bad); }
  assert.strictEqual(typeof LL.gfx, 'undefined', 'sim ran with no renderer loaded');
});
console.log('\n' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
