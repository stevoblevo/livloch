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
  const t0 = W.t; ev = run(W, 125, w => { w.thiefT = 1e9; keepAlive(w); g.hp = Math.max(g.hp, 500); w.heroes.forEach(h => { h.ember = false; }); }); /* 0.29 play: no hero walks a light into it meanwhile */ const relit = ev.find(e => e.k === 'relit' && e.u === g);
  assert.ok(relit, 'relit event'); assert.ok(Math.abs((relit.at - t0) - 118) < 4, 'dark for about 120 s, got ' + (relit.at - t0 + 2).toFixed(1));
});
test('a hollow returns to its thread after the respawn delay', () => {
  for (const d of [0, 1, 2]) { const W = world({ difficulty: d }); run(W, 55, keepAlive); const big = W.troopers.filter(u => u.alive && u.big && u.lane0 === 1); assert.strictEqual(big.length, 1, 'one hollow on the middle thread');
    S._t.damage(big[0], 1e7, null, 'unit'); const want = C.DIFF[d].hollowBack, t0 = W.t; let back = -1; run(W, want + 4, w => { keepAlive(w); if (back < 0 && w.troopers.some(u => u.alive && u.big && u.lane0 === 1)) back = w.t - t0; });
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
  S.setLens(W.mood.lens); assert.ok(W.mood.solved && W.thin); let ev = upTo(W, 301); assert.ok(ev.some(e => e.k === 'red' && e.thin)); assert.strictEqual(extras(W), C.DIFF[1].thinHollows, 'a thin rain brings only C.DIFF thinHollows');
  upTo(W, 362); assert.strictEqual(W.thin, false, 'the next rain starts fresh');
  W = world(); upTo(W, 271); const wrong = C.LENSES.filter(l => l !== W.mood.lens && l !== W.lens); S.setLens(wrong[0]); S.setLens(wrong[1]); assert.ok(!W.mood.done, 'two misses are allowed'); S.setLens(wrong[2]); assert.ok(W.mood.done && !W.mood.solved, 'the third miss loses it');
  S.setLens(W.mood.lens); assert.strictEqual(W.thin, false, 'too late'); upTo(W, 300.5); assert.ok(extras(W) >= 1 && C.DIFF[1].rainHollows > C.DIFF[1].thinHollows, 'full rain: extra hollows arrive, more than a thin rain brings');
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
/* 0.29 look */
test('paper life (0.29): a painted card standing still breathes, sways and stirs; walking it waddles; a 3D figure and reduced motion are untouched', () => {
  const M = require(path.join(__dirname, '..', 'js', 'motion.js'));
  const stand = (paper, still) => { const m = M.create(), u = { x: 0, z: 0, yaw: 0, onGround: true, def: { id: 'rook' }, lastShotT: -99, id: 3 }; let lo = {}, hi = {};
    for (let i = 0; i < 150; i++) { const p = M.pose(m, u, 1 / 30, i / 30, still, { r: 0, f: 0, fb: true, m: 1, h: 2.4, paper: paper }); if (i < 30) continue;
      ['body', 'roll', 'cloak', 'head'].forEach(k => { lo[k] = Math.min(lo[k] == null ? 9 : lo[k], p[k]); hi[k] = Math.max(hi[k] == null ? -9 : hi[k], p[k]); }); }
    const r = {}; for (const k in lo) r[k] = hi[k] - lo[k]; return r; };
  const pap = stand(true, false), fig = stand(false, false), red = stand(true, true);
  assert.ok(pap.body > 0.02 && pap.roll > 0.012 && pap.cloak > 0.015 && pap.head > 0.01, 'a standing card moves: ' + JSON.stringify(pap));
  assert.ok(fig.body < 1e-9 && fig.cloak < 1e-9, 'a 3D figure standing gets none of it: ' + JSON.stringify(fig));
  assert.ok(red.body + red.roll + red.cloak + red.head === 0, 'reduced motion stays still');
  const walk = (paper) => { const m = M.create(), u = { x: 0, z: 0, yaw: 0, onGround: true, def: { id: 'rook' }, lastShotT: -99 }; let hi = 0;
    for (let i = 0; i < 90; i++) { u.z += 0.2; const p = M.pose(m, u, 1 / 30, i / 30, false, { r: 0, f: 6, fb: true, m: 1, h: 2.4, paper: paper }); if (i > 30) hi = Math.max(hi, Math.abs(p.roll)); } return hi; };
  assert.ok(walk(true) > walk(false) * 1.5, 'walking, the card waddles more than the bare rig: ' + walk(true).toFixed(3) + ' vs ' + walk(false).toFixed(3));
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
test('air (0.25): Anna and the Skein Doll jump twice (Dora too since 0.26), Myra Belle once and then hangs', () => {
  const want = { dora: [2, 1, 0], anna: [2, 1, 0], skein: [2, 1, 0], myra: [1, 0, 1] }; // 0.26 guard: Dora's second jump is her bubble
  for (const id in want) { const { W, h } = airHero(id); airRun(W, h, 0.5); h.stamina = 3;
    const ev = airRun(W, h, 1.6, (i) => { if (i === 0 || i === 20 || i === 30 || i === 40) h.ctl.jump = true; h.ctl.jumpHeld = i >= 20 && i < 50; });
    const j = airK(ev, 'jump'); assert.strictEqual(j.length, want[id][0], id + ': jumps ' + j.length); assert.strictEqual(j.filter(e => e.dbl).length, want[id][1], id + ': second jumps');
    assert.strictEqual(airK(ev, 'hover').length, want[id][2], id + ': hovers'); assert.ok(h.onGround, id + ' has landed');
    assert.strictEqual(LL.HEROES.find(d => d.id === id).air.jumps, id === 'myra' ? 1 : 2); }
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
  const got = { anna: [], skein: [], myra: [] };
  /* Seeded since 0.27 (#27), so these counts are the same every run. Measured at 0.27 for seeds 3 to 6: Anna 6 2 3 3,
     the Skein Doll 5 8 0 6, Myra Belle 3 5 5 2. The floors sit well under that so a retune that shifts the draws still
     passes, and a bot that stops using its air fails. */
  for (const id in got) for (const seed of [3, 4, 5, 6]) { const W = world({ heroPick: LL.HEROES.findIndex(d => d.id === id), seed: seed }); const ev = run(W, 240, keepAlive);
    got[id].push(ev.filter(e => e.u && e.u.def && e.u.def.id === id && ((e.k === 'jump' && e.dbl) || e.k === 'hover')).length); }
  for (const id in got) { const sum = got[id].reduce((a, b) => a + b, 0), used = got[id].filter(n => n > 0).length;
    assert.ok(sum >= 6 && used >= 3, id + ': second jumps and hovers in four 4-minute runs (seeds 3 to 6): ' + got[id].join(' ')); }
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
/* 0.26 GUARD. Guards on the second jump, thread boosts, Dora's hat, Myra Belle's boon and Rook's barrel roll, through the
   real sim at 60 steps a second, in a quiet valley (no waves, thieves or hollows; the other heroes parked far off). */
const gHero = (id, x, z, o) => { const W = world(Object.assign({ heroPick: LL.HEROES.findIndex(d => d.id === id), auto: false }, o || {})), h = W.player; h.useAI = false;
  W.heroes.forEach(u => { if (u !== h) { u.useAI = false; u.x = 70 + u.slot; u.z = -130; u.ctl.mx = u.ctl.mz = 0; } }); W.waveT = 1e9; W.thiefT = 1e9; W.hollowT = [1e9, 1e9, 1e9]; W.troopers.forEach(u => { u.alive = false; });
  h.x = x; h.z = z; h.y = 0; h.vx = h.vz = h.vy = 0; h.onGround = true; h.stamina = 3; h.yaw = 0; h.aimYaw = 0; h.ctl.mx = h.ctl.mz = 0; return { W, h }; };
// steps the world; the hero aims 30 m along h.aimYaw unless each() aims it; returns its events (and every guard event)
function gRun(W, h, secs, each) { const out = []; for (let i = 0; i < Math.round(secs * 60) && !W.over; i++) { h.ctl.ax = h.x + Math.sin(h.aimYaw) * 30; h.ctl.az = h.z + Math.cos(h.aimYaw) * 30; h.ctl.ay = h.y + 1.5;
  if (each) each(i, W.t); S.step(1 / 60); for (const e of W.fx) if (e.u === h || e.k === 'boon') out.push(Object.assign({ at: W.t }, e)); W.fx.length = 0; } return out; }
// a Hush small one standing still at (x, z) that never attacks unless told: a source of hits with a place
function foe(W, x, z, big) { S._t.spawnHollow(1); const u = W.troopers[W.troopers.length - 1]; W.fx.length = 0; Object.assign(u, { x: x, z: z, big: !!big, r: big ? 1.15 : 0.7, h: big ? 3.2 : 1.7, hp: 5000, maxHp: 5000, speed: 0, atkT: 1e9, ranged: !big, range: big ? 3.2 : 15, dmg: 20, rate: 1 }); return u; }
const dmgFrom = (h, src, n, kind) => { const a = h.hp; S._t.damage(h, n || 40, src, kind || 'unit'); const d = a - h.hp; h.hp = h.maxHp; return d; };
const dblJump = (W, h, at2) => gRun(W, h, (at2 || 15) / 60 + 0.02, (i) => { if (i === 0 || i === (at2 || 15)) h.ctl.jump = true; });
const at = (h, deg, d) => [h.x + Math.sin(deg * Math.PI / 180) * d, h.z + Math.cos(deg * Math.PI / 180) * d];
test('guard (0.26): Anna\'s aegis blocks hits from the front for its 0.9 s, not from behind; a melee attacker is shoved', () => {
  const { W, h } = gHero('anna', -24, 20), G = h.def.air.guard; assert.deepStrictEqual([G.kind, G.t, G.arc], ['aegis', 0.9, 60]);
  const front = foe(W, ...at(h, 0, 12)), back = foe(W, ...at(h, 180, 12)), in50 = foe(W, ...at(h, 50, 12)), out70 = foe(W, ...at(h, -70, 12));
  assert.ok(dmgFrom(h, front) > 30, 'no guard on the ground');
  const ev = dblJump(W, h); const g = airK(ev, 'guard'); assert.strictEqual(g.length, 1, 'the second jump raises it'); assert.strictEqual(g[0].kind, 'aegis');
  assert.strictEqual(dmgFrom(h, front), 0, 'blocked from the front'); assert.strictEqual(dmgFrom(h, in50, 40, 'tower'), 0, 'and from 50 degrees off the aim');
  assert.ok(dmgFrom(h, back) > 30, 'not from behind'); assert.ok(dmgFrom(h, out70) > 30, 'not from 70 degrees off');
  assert.ok(dmgFrom(h, null) > 30, 'a hit with no source has no direction to block'); const f0 = W.fx.filter(e => e.k === 'guarded' && e.how === 'block').length; assert.ok(f0 >= 2, 'blocks are told');
  const hol = foe(W, h.x, h.z + 2.2, true), sm = foe(W, h.x + 0.4, h.z + 1.9), z0 = hol.z, z1 = sm.z;
  assert.strictEqual(dmgFrom(h, hol), 0); assert.strictEqual(dmgFrom(h, sm), 0);
  assert.ok(Math.abs(hol.z - z0 - G.knock / 2) < 0.15 && hol.slowT > 0, 'a hollow is shoved half the knock: ' + (hol.z - z0).toFixed(2)); assert.ok(sm.z - z1 > G.knock * 0.85, 'a small one the whole knock: ' + (sm.z - z1).toFixed(2));
  assert.ok(W.fx.some(e => e.k === 'guarded' && e.melee), 'a melee block is told as one');
  let end = null; const ev2 = gRun(W, h, 1.2, () => { if (!end && h.guardT <= 0) end = W.t; }); const ge = airK(ev2, 'guardend')[0]; assert.ok(ge && ge.why === 'time');
  assert.ok(Math.abs(ge.at - g[0].at - G.t) < 0.03, 'up for ' + (ge.at - g[0].at).toFixed(2) + ' s'); assert.ok(dmgFrom(h, front) > 30, 'and down after');
});
test('guard (0.26): the aegis stops a shot from the front before it bursts, and a trooper\'s shots through the real path', () => {
  const spit = (W, h, z) => { W.ness.x = h.x; W.ness.z = z; W.projs.push({ x: h.x, y: h.y + 1.2, z: z, vx: 0, vy: 0, vz: (h.z - z) / Math.abs(h.z - z) * 38, grav: 0, life: 1.6, dmg: 62, aoe: 3.5, team: 2, owner: W.ness, r: 0.6, kind: 'orb', size: 0.85, col: 0x7fe0ff, dot: 0, dotT: 0, slow: 0, slowT: 0 }); };
  let { W, h } = gHero('anna', -24, 20); dblJump(W, h, 18); spit(W, h, h.z + 14); let hp0 = h.hp; const ev = gRun(W, h, 0.45);
  assert.strictEqual(h.hp, hp0, 'no damage from the front'); assert.ok(!W.projs.some(p => p.kind === 'orb'), 'the spit is gone'); assert.ok(airK(ev, 'guarded').some(e => e.how === 'block' && e.kind === 'proj'));
  ({ W, h } = gHero('anna', -24, 20)); dblJump(W, h, 18); spit(W, h, h.z - 14); hp0 = h.hp; gRun(W, h, 0.45); assert.ok(hp0 - h.hp > 40, 'from behind it bursts on her: ' + (hp0 - h.hp).toFixed(0));
  // a Hush trooper on the Middle thread shooting her: its tracer and damage come from trooperStep
  ({ W, h } = gHero('anna', 0, 0)); const u = foe(W, 0, 7); u.lane = 1; u.s = LL.lanes[1].len / 2 + 7; u.atkT = 0.4; u.tgt = null; u.tgtT = 0; dblJump(W, h, 12);
  hp0 = h.hp; const e2 = gRun(W, h, 0.5); assert.strictEqual(h.hp, hp0, 'its shots were blocked'); assert.ok(airK(e2, 'guarded').length >= 1, 'at least one shot met the shield');
});
test('guard (0.26): Dora jumps twice now; her bubble soaks up to 200 for 1.2 s, then pops; the rest gets through', () => {
  let { W, h } = gHero('dora', -24, 20); const G = h.def.air.guard; assert.deepStrictEqual([h.def.air.jumps, G.kind, G.t, G.hp], [2, 'bubble', 1.2, 200]);
  const f = foe(W, ...at(h, 180, 12)); const ev = dblJump(W, h); assert.strictEqual(airK(ev, 'jump').length, 2); assert.strictEqual(airK(ev, 'guard')[0].kind, 'bubble');
  assert.strictEqual(dmgFrom(h, f, 120), 0, 'soaked, from any side'); assert.ok(Math.abs(h.guardHp - 80) < 1e-6);
  assert.ok(Math.abs(dmgFrom(h, f, 120) - 40) < 1e-6, 'the bubble takes what room it has left (80); 40 gets through'); assert.ok(!(h.guardT > 0), 'and pops'); assert.strictEqual(W.fx.filter(e => e.k === 'guardend')[0].why, 'full');
  assert.ok(dmgFrom(h, f, 120) > 100, 'nothing soaked after the pop');
  ({ W, h } = gHero('dora', -24, 20)); const e1 = dblJump(W, h); const g0 = airK(e1, 'guard')[0]; dmgFrom(h, f, 50); const e2 = gRun(W, h, 1.4); const ge = airK(e2, 'guardend')[0];
  assert.ok(ge.why === 'time' && Math.abs(ge.at - g0.at - G.t) < 0.03, 'unfilled, it lasts ' + (ge.at - g0.at).toFixed(2) + ' s');
});
test('guard (0.26): Skye frays into thread for 0.6 s: hits and shots pass through; the fountain still burns', () => {
  const { W, h } = gHero('skein', -24, 20), G = h.def.air.guard; assert.deepStrictEqual([G.kind, G.t], ['fray', 0.6]);
  const f = foe(W, ...at(h, 0, 12)), b = foe(W, ...at(h, 180, 12)); const ev = dblJump(W, h); const g0 = airK(ev, 'guard')[0]; assert.strictEqual(g0.kind, 'fray');
  assert.strictEqual(dmgFrom(h, f, 80, 'tower') + dmgFrom(h, b, 80, 'unit') + dmgFrom(h, null, 80, 'ab'), 0, 'everything passes'); assert.ok(dmgFrom(h, null, 30, 'dot') > 20, 'a bleed or the fountain is not a hit');
  W.ness.x = h.x; W.ness.z = h.z + 8; W.projs.push({ x: h.x, y: h.y + 1.1, z: h.z + 8, vx: 0, vy: 0, vz: -38, grav: 0, life: 1.6, dmg: 62, aoe: 3.5, team: 2, owner: W.ness, r: 0.6, kind: 'orb', size: 0.85, col: 0x7fe0ff, dot: 0, dotT: 0, slow: 0, slowT: 0 });
  const p = W.projs[W.projs.length - 1], hp0 = h.hp; const e2 = gRun(W, h, 0.3); assert.strictEqual(h.hp, hp0, 'a spit flew through her'); assert.ok(p.z < h.z - 1 || p.life <= 0 || W.projs.indexOf(p) < 0, 'and on past'); assert.strictEqual(airK(e2, 'guarded').filter(e => e.how === 'pass' && e.kind === 'proj').length, 1, 'told once');
  const e3 = gRun(W, h, 0.5); const ge = airK(e2.concat(e3), 'guardend')[0]; assert.ok(Math.abs(ge.at - g0.at - G.t) < 0.03, 'frayed for ' + (ge.at - g0.at).toFixed(2) + ' s'); assert.ok(dmgFrom(h, f) > 30, 'whole again after');
});
test('guard (0.26): a guard costs the second jump\'s stamina; jumping all minute long is not invulnerability', () => {
  for (const id of ['anna', 'dora', 'skein']) { const { W, h } = gHero(id, -24, 20); h.stamina = 0; const e0 = dblJump(W, h); assert.strictEqual(airK(e0, 'guard').length, 0, id + ': no stamina, no second jump, no guard'); }
  const cap = { anna: 0.45, dora: 0.55, skein: 0.3 };
  for (const id in cap) { const { W, h } = gHero(id, -24, 20); h.stamina = 3; let up = 0, n = 0; const ev = gRun(W, h, 60, (i) => { h.ctl.jump = i % 3 === 0; if (h.guardT > 0) up++; n++; h.hp = h.maxHp; });
    const gs = airK(ev, 'guard').length, most = 3 + Math.floor(60 / 2.6) + 1; assert.ok(gs >= 15 && gs <= most, id + ': ' + gs + ' guards in a minute of jumping (at most ' + most + ')'); assert.ok(up / n < cap[id], id + ': guarded ' + (100 * up / n).toFixed(0) + '% of the minute'); }
});
test('thread boost (0.26): only over a thread and moving along it: more lift and speed along it, counted for the life', () => {
  const B = C.TBOOST, jump2 = (id, x, z, mx, mz) => { const { W, h } = gHero(id, x, z); let top = 0, vMax = 0; const ev = gRun(W, h, 1.6, (i) => { h.ctl.mx = mx; h.ctl.mz = mz; if (i === 30 || i === 45) h.ctl.jump = true; top = Math.max(top, h.y); if (i > 45 && !h.onGround) vMax = Math.max(vMax, Math.hypot(h.vx, h.vz)); }); return { W, h, ev, top, vMax, tb: airK(ev, 'tboost') }; };
  const on = jump2('anna', 0, -20, 0, 1), off = jump2('anna', -24, -20, 0, 1), across = jump2('anna', -2, -20, 1, 0), still = jump2('anna', 0, -20, 0, 0);
  assert.strictEqual(on.tb.length, 1, 'along the Middle thread: a boost'); assert.strictEqual(off.tb.length + across.tb.length + still.tb.length, 0, 'none off it, across it or standing');
  assert.ok(on.top - off.top > 0.6, 'higher by ' + (on.top - off.top).toFixed(2) + ' m'); assert.ok(on.vMax > off.vMax * 1.4, 'faster along it: ' + on.vMax.toFixed(1) + ' vs ' + off.vMax.toFixed(1) + ' m/s');
  const t0 = on.tb[0]; assert.ok(t0.why === 'jump' && t0.n === 1 && t0.lane === 1 && Math.abs(t0.dz) > 0.99 && Math.abs(t0.tx) < 1e-6, 'told with the thread under it');
  assert.ok(on.h.z - off.h.z > 1.5, 'and it carried her ' + (on.h.z - off.h.z).toFixed(1) + ' m further');
  const k = jump2('skein', 0, 20, 0, -1); assert.strictEqual(k.tb.length, 1, 'either way along a thread'); assert.strictEqual(k.h.tbN, 1); S._t.damage(k.h, 1e6, null, 'unit'); assert.strictEqual(k.h.tbN, 0, 'the count is per life');
});
test('hat (0.26): three thread boosts charge Dora\'s hat; thrown, it cuts each foe out and back, comes home, and the charge resets', () => {
  const { W, h } = gHero('dora', 0, 24), Ht = h.def.air.hat; assert.deepStrictEqual([Ht.need, Ht.dmg], [3, 100]); h.aimYaw = Math.PI;
  h.ctl.hat = true; gRun(W, h, 0.1); assert.ok(!h.hat, 'not before it is charged');
  let ready = 0; for (let k = 0; k < 3; k++) { h.stamina = 3; const ev = gRun(W, h, 1.6, (i) => { h.ctl.mz = -1; h.ctl.mx = 0; if (i === 4 || i === 18) h.ctl.jump = true; }); ready += airK(ev, 'hatready').length; assert.strictEqual(h.hatN, k + 1, 'charge ' + (k + 1)); }
  assert.strictEqual(ready, 1, 'told once, when full'); h.x = 0; h.z = 0; h.vx = h.vz = 0; h.aimYaw = 0; gRun(W, h, 0.5, () => { h.ctl.mz = 0; });
  const fs = [foe(W, 0.3, 4), foe(W, -0.4, 8), foe(W, 0.5, 12), foe(W, 4, 8)], hp = fs.map(u => u.hp);
  h.ctl.hat = true; let far = 0, flying = 0; const ev = gRun(W, h, 2.5, () => { if (h.hat) { flying += 1 / 60; far = Math.max(far, Math.hypot(h.hat.x - h.x, h.hat.z - h.z)); } });
  assert.ok(airK(ev, 'hatthrow').length === 1 && airK(ev, 'hatturn').length === 1 && airK(ev, 'hatback').length === 1, 'out, turn, home: ' + ev.map(e => e.k).join(' '));
  assert.ok(far > Ht.out - 1 && far < Ht.out + 1.5, 'out ' + far.toFixed(1) + ' m'); assert.ok(flying > 0.9 && flying < 1.8, 'in the air ' + flying.toFixed(2) + ' s'); assert.strictEqual(h.hat, null);
  const took = fs.map((u, i) => hp[i] - u.hp); [0, 1, 2].forEach(i => assert.ok(Math.abs(took[i] - 2 * Ht.dmg * h.st.ap) < 1, 'foe ' + i + ' cut out and back: ' + took[i].toFixed(0))); assert.strictEqual(took[3], 0, 'one off the line is not cut');
  assert.strictEqual(airK(ev, 'hatcut').length, 6); assert.strictEqual(h.hatN, 0, 'the charge is spent'); h.ctl.hat = true; gRun(W, h, 0.1); assert.ok(!h.hat, 'no second throw without three more boosts');
  h.hatN = 3; h.ctl.hat = true; gRun(W, h, 0.2); assert.ok(h.hat); S._t.damage(h, 1e6, null, 'unit'); assert.ok(!h.hat && h.hatN === 0, 'a fall drops the hat and the charge');
});
test('boon (0.26): a hover the thread boosted that ends still on it mends Myra Belle and her side near her; off the thread, nothing', () => {
  const B = h => h.def.air.boon, hov = (x, z, stick) => { const { W, h } = gHero('myra', x, z); const al = W.heroes.filter(u => u !== h); al[0].x = x + 3; al[0].z = z + 2; al[1].x = x + 25; al[1].z = z;
    W.heroes.forEach(u => { u.hp = u.maxHp * 0.5; }); const hp = W.heroes.map(u => u.hp); const ev = gRun(W, h, 2.6, (i) => { const m = stick(h); h.ctl.mx = m[0]; h.ctl.mz = m[1]; h.ctl.jump = i === 10; h.ctl.jumpHeld = i >= 10 && i < 110; al[0].x = h.x + 3; al[0].z = h.z + 1; al[1].x = h.x + 25; al[1].z = h.z; });
    return { W, h, al, ev, gain: W.heroes.map((u, i) => u.hp - hp[i]) }; };
  const r = hov(0, -20, () => [0, 1]), b = airK(r.ev, 'boon'); assert.strictEqual(airK(r.ev, 'tboost').filter(e => e.why === 'hover').length, 1, 'the hover was boosted'); assert.strictEqual(b.length, 1, 'one boon');
  const amt = B(r.h).heal * r.h.st.ap, iMe = r.W.heroes.indexOf(r.h), iNear = r.W.heroes.indexOf(r.al[0]), iFar = r.W.heroes.indexOf(r.al[1]);
  assert.ok(b[0].who.indexOf(r.h) >= 0 && b[0].who.indexOf(r.al[0]) >= 0 && b[0].who.indexOf(r.al[1]) < 0, 'her and the ally beside her, not the one 25 m off');
  assert.ok(r.gain[iNear] >= amt - 0.5 && r.gain[iFar] < amt * 0.5, 'the near ally gained ' + r.gain[iNear].toFixed(0) + ', the far one ' + r.gain[iFar].toFixed(0));
  const d = hov(0, -20, (h) => h.hoverT > 0 ? [1, 0.3] : [0, 1]); assert.strictEqual(airK(d.ev, 'tboost').length, 1, 'boosted at the start'); assert.strictEqual(airK(d.ev, 'boon').length, 0, 'but she drifted off the thread: ' + d.h.x.toFixed(1) + ' m');
  const o = hov(-24, -20, () => [0, 1]); assert.strictEqual(airK(o.ev, 'tboost').length + airK(o.ev, 'boon').length, 0, 'off a thread: no boost, no boon');
  const H = r.h.def.air.hover; let { W, h } = gHero('myra', 0, -20); let vyB = null; gRun(W, h, 1.6, (i) => { h.ctl.mz = 1; h.ctl.jump = i === 10; h.ctl.jumpHeld = i >= 10; if (h.hoverT > 0 && h.hoverAge > 0.95 && vyB == null) vyB = h.vy; });
  assert.ok(Math.abs(vyB + H.sink * C.TBOOST.sinkK) < 0.2, 'the thread holds her up: she sinks at ' + (-vyB).toFixed(2) + ' m/s, not ' + H.sink);
});
test('bots (0.26): under fire a bot opens its guard (Rook rolls) and the guard catches hits', () => {
  /* Each hero gets 12 s under steady fire (a 15-damage hit from 10 m in front every 0.6 s) on seeds 3, 4 and 5. Seeded
     since 0.27 (#27); measured then, guards/guarded per run: Anna 5/5 6/11 5/7, Dora 5/10 6/12 6/11, the Skein Doll 4/4
     6/6 5/5, Rook 2/2 4/3 7/4. Every run must guard and catch at least once; the sums must reach 8. */
  const got = {}; for (const id of ['anna', 'dora', 'skein', 'rook']) { got[id] = { guard: 0, guarded: 0, runs: [] };
    for (const seed of [3, 4, 5]) { const { W, h } = gHero(id, -24, 20, { seed: seed }); h.useAI = true; const f = foe(W, h.x, h.z + 10); let next = 0.5;
      const ev = gRun(W, h, 12, (i, t) => { if (id === 'rook' && h.onGround && h.cds[1] <= 0) h.ctl.ab[1] = true; if (t >= next) { next += 0.6; f.x = h.x + Math.sin(h.yaw) * 10; f.z = h.z + Math.cos(h.yaw) * 10; S._t.damage(h, 15, f, 'unit'); } h.hp = h.maxHp; });
      const g = ev.filter(e => e.k === 'guard' || e.k === 'roll').length, d = airK(ev, 'guarded').length; got[id].guard += g; got[id].guarded += d; got[id].runs.push(g + '/' + d);
      assert.ok(g >= 1 && d >= 1, id + ', seed ' + seed + ': the bot guards under fire and the guard catches a hit (' + g + '/' + d + ')'); } }
  for (const id in got) assert.ok(got[id].guard >= 8 && got[id].guarded >= 8, id + ': ' + JSON.stringify(got[id])); if (process.env.SHOW) console.log('      ' + JSON.stringify(got));
});
test('bots (0.26): whole matches: they boost along their own threads, Dora throws her hat, and nothing breaks', () => {
  const got = { tboost: 0, hat: 0, cuts: 0, boon: 0, guard: 0 }; let bad = 0;
  for (const id of ['dora', 'anna', 'skein', 'myra']) for (const seed of [3, 4, 5, 6]) { const W = world({ heroPick: LL.HEROES.findIndex(d => d.id === id), seed: seed }), tb0 = got.tboost;
    for (let i = 0; i < 150 * 30 && !W.over; i++) { keepAlive(W); S.step(1 / 30); for (const e of W.fx) { if (e.k === 'hatthrow') got.hat++; else if (e.k === 'hatcut') got.cuts++; else if (e.k in got) got[e.k]++; } W.fx.length = 0;
      if (i % 30 === 0 && !W.heroes.every(u => [u.x, u.y, u.z, u.vx, u.vy, u.vz, u.hp].every(Number.isFinite) && (!u.hat || [u.hat.x, u.hat.y, u.hat.z].every(Number.isFinite)))) bad++; }
    assert.ok(got.tboost > tb0, id + ', seed ' + seed + ': the bots boost along a thread at least once in 150 s'); }
  assert.strictEqual(bad, 0, 'every number stays finite');
  /* seeded since 0.27 (#27); measured then over these 16 runs: 48 boosts, 3 hat throws, 5 cuts, 84 guards */
  assert.ok(got.tboost >= 30 && got.hat >= 2 && got.cuts >= 2 && got.guard >= 50, 'over 16 bot runs of 150 s: ' + JSON.stringify(got));
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
test('roll (0.26): Rook\'s dash aloft is a barrel roll to one side; shots from afar miss while it lasts, close ones land', () => {
  const { W, h } = rookAt(-24, 20), a = h.def.ab[1]; assert.ok(a.roll > 0.3 && a.roll < 0.6 && a.rollNear === 4);
  h.aimYaw = 0; const far = foe(W, -24, 32), near = foe(W, -24, 22.5);
  h.ctl.dash = true; let ev = gRun(W, h, 0.1); assert.strictEqual(airK(ev, 'roll').length, 0, 'on the ground a dash is a dash');
  gRun(W, h, 1.5); h.stamina = 3; h.ctl.ab[1] = true; gRun(W, h, 0.4); assert.ok(h.liftT > 0);
  const x0 = h.x; ev = gRun(W, h, 0.05, (i) => { h.ctl.mx = -1; h.ctl.mz = 0; if (i === 0) h.ctl.dash = true; }); const r = airK(ev, 'roll'); assert.strictEqual(r.length, 1); assert.strictEqual(r[0].dir, -1, 'stick right: a roll to his right');
  assert.ok(h.rollT > 0); assert.strictEqual(dmgFrom(h, far, 50, 'tower'), 0, 'a shot from 12 m misses'); assert.ok(dmgFrom(h, near, 50) > 30, 'a hit from 2.5 m lands'); assert.ok(W.fx.some(e => e.k === 'guarded' && e.how === 'roll'));
  gRun(W, h, 0.2, () => { h.ctl.mx = -1; }); assert.ok(x0 - h.x > 3, 'he went sideways ' + (x0 - h.x).toFixed(1) + ' m'); gRun(W, h, a.roll); assert.ok(!(h.rollT > 0) && dmgFrom(h, far, 50) > 30, 'and it ends');
  h.stamina = 3; ev = gRun(W, h, 0.05, (i) => { h.ctl.mx = 0; h.ctl.mz = 1; if (i === 0) h.ctl.dash = true; }); assert.strictEqual(airK(ev, 'roll')[0].dir, 1, 'with the stick ahead it goes the other way from the last');
});
/* ---------- 0.26 ness: the chomp and the flood ----------
   Staged tests place every piece by hand. The sim is seeded since 0.27 (#27), so the whole-match test below asks each match
   for its own flood, bite, fishing trip and kill, as well as totals over the eight. */
const NS = S.NESS;
function nessUp(o) { const W = world(o), n = W.ness; n.respT = 0; S.step(1 / 30); n.rise = 1; n.chompT = 0; n.floodAt = 1e9; n.floodHp = true; W.fx.length = 0; W.waveT = 1e9; W.thiefT = 1e9;
  W.heroes.forEach((h, i) => { h.useAI = false; h.x = -60 + i * 3; h.z = -100; h.ctl.mx = h.ctl.mz = 0; }); return W; } /* lead, 0.26: the first step above lets bots steer; their stick would stay on ctl */
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
  const setup = (wet) => { const W = nessUp(), h = W.player; if (wet) { S._t.flood('test'); run(W, NS.SWELL + NS.FAR / NS.FRONT + 0.3); assert.strictEqual(W.flood.ph, 'high'); W.ness.out = false; W.ness.x = W.ness.hx; W.ness.z = W.ness.hz; W.ness.chomp = null; W.player.held = null; } else { W.ness.alive = false; W.ness.respT = 1e9; } h.x = -24; h.z = -30; h.y = 0; h.vx = h.vz = h.vy = 0; h.onGround = true; h.stamina = 3; h.ctl.mx = h.ctl.mz = 0; /* lead, 0.26: nessUp's first step lets the bot steer before useAI is cleared, and its stick stays on ctl; a 'standing' hero walked about 1 run in 4 */ return { W, h }; };
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
    const W = world({ seed: seed, heroPick: seed % LL.HEROES.length, difficulty: seed % 3 }); let fl0 = -1, heldT = 0, ok = true; const tgt = {}, b = [floods, tells, fishing, downs];
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
    assert.ok(floods > b[0] && fishing > b[2], 'seed ' + seed + ': a flood and a fishing trip in every match'); /* 0.30 play: the Ness landed is counted over the eight, below. With the tide taking a house, seed 8 (Cruel, bots alone) is lost at 6:58 before anyone lands it */ // 0.28 play: a hero picked is counted over the eight, below; the new rules moved the draws and two of the eight now pass without a tell
  }
  /* measured at 0.27 over these eight: 15 floods, 36 tells, 17 bitten, 19 dodged, 39 rides in a flood, 16 fishing, 13 downs
     measured at 0.28 (play: the slack thread, the fold's catch, lights) over the same eight: 12 floods, 29 tells, 11 bitten,
     17 dodged, 39 rides in a flood, 20 fishing, 9 downs
     measured at 0.29 (play: kept houses, lights from thieves, the tides, the patron that dims) over the same eight: 32 tells,
     7 bitten, 25 dodged, 38 rides in a flood, 15 fishing, 10 downs; the floor for bites taken went from 8 to 5
     measured at 0.30 (play: the tide takes a house; bots no longer single out a slack house): 14 floods, 31 tells,
     7 bitten, 22 dodged, 33 rides in a flood, 17 fishing, 11 downs; seed 8 is lost at 6:58 with no Ness landed, so that is counted over the eight */
  if (process.env.NESS_COUNTS) console.log('ness counts', JSON.stringify({ floods, tells, bitten, dodged, zips, fishing, downs, longest }));
  assert.ok(longest < 25, 'the longest flood: ' + longest.toFixed(1) + ' s');
  assert.ok(tells >= 24, 'heroes are picked: ' + tells); assert.ok(bitten >= 5 && dodged >= 8, 'bots dodge some bites and take some: ' + dodged + ' dodged, ' + bitten + ' bitten');
  assert.ok(zips >= 20, 'bots take the threads in a flood: ' + zips); assert.ok(fishing >= 12, 'bots still go fishing: ' + fishing); assert.ok(downs >= 8, 'and still land the Ness: ' + downs);
});
/* 0.27 SEED (#27). Every random draw in the model goes through W.rng, so one seed and one set of inputs give one match.
   trace() steps a world under a script and keeps what a replay would need: every event in order, with units written as
   kind#id, and the state at the end (the clock, every unit, souls, troopers, the Ness, the flood, kills, the generator). */
function trace(o, secs, script) {
  const W = world(o), evs = [], ref = (k, v) => (k !== '' && v && typeof v === 'object' && 'id' in v && 'kind' in v) ? v.kind + '#' + v.id : v;
  for (let i = 0; i < Math.round(secs * 30) && !W.over; i++) { if (script) script(W, i); S.step(1 / 30); for (const e of W.fx) evs.push(JSON.stringify(Object.assign({ at: W.t }, e), ref)); W.fx.length = 0; }
  const n = W.ness, f = W.flood;
  const state = JSON.stringify({ t: W.t, over: W.over, winner: W.winner, kills: W.kills, units: W.units.map(u => [u.kind + '#' + u.id, u.team, u.alive, u.x, u.y, u.z, u.hp, u.souls]),
    troopers: W.troopers.filter(u => u.alive).length, ness: n && [n.alive, n.x, n.z, n.hp, n.count, !!n.out], flood: f && [f.ph, f.t], red: W.red, lights: W.lights, next: W.rng() });
  return { W, evs, state, kinds: evs.map(s => JSON.parse(s).k).join(' ') };
}
/* a player who is not a bot: walks, aims, fires, jumps, dashes, changes view and calls a thread on fixed frames */
const scripted = (W, i) => { const h = W.player, c = h.ctl; h.useAI = false; const t = i / 30;
  c.mx = Math.sin(t * 0.7); c.mz = Math.cos(t * 0.3); c.ax = h.x + Math.sin(t) * 25; c.az = h.z + 25; c.ay = 1.5; c.fire = (i % 90) < 50;
  c.jump = i % 47 === 0; c.dash = i % 173 === 0; if (i % 600 === 300) S.setLens(C.LENSES[(i / 600 | 0) % C.LENSES.length]); };
test('seeded (0.27): one seed and one set of inputs give one match, event for event; another seed gives another', () => {
  for (const o of [{ seed: 41, auto: false }, { seed: 42, dream: true, difficulty: 2 }, { seed: 43, mode: 'fallen', heroPick: 3 }]) {
    const a = trace(o, 120, o.auto === false ? scripted : null);
    trace(Object.assign({}, o, { seed: o.seed + 1000 }), 20);
    const b = trace(o, 120, o.auto === false ? scripted : null), c = trace(Object.assign({}, o, { seed: o.seed + 1 }), 120, o.auto === false ? scripted : null);
    assert.ok(a.evs.length > 100, 'enough happens to compare: ' + a.evs.length + ' events');
    assert.strictEqual(b.kinds, a.kinds, JSON.stringify(o) + ': the same event kinds in the same order');
    const at = a.evs.findIndex((e, i) => e !== b.evs[i]); assert.strictEqual(at, -1, JSON.stringify(o) + ': first different event ' + at + ': ' + a.evs[at] + ' / ' + b.evs[at]);
    assert.strictEqual(b.state, a.state, JSON.stringify(o) + ': the same end state');
    assert.notStrictEqual(c.state, a.state, JSON.stringify(o) + ': another seed, another match'); assert.notStrictEqual(c.evs.join('\n'), a.evs.join('\n'));
  }
  assert.ok(S.newWorld({ seed: 9 }).rng() === S.newWorld({ seed: 9 }).rng() && LL.rng(9)() !== LL.rng(10)(), 'the generator is keyed by the seed alone');
  for (const f of ['core.js', 'sim.js']) { const src = fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"])\/\/.*$/gm, '$1');
    assert.ok(!/Math\.random|Date\.now|performance\.now/.test(src), f + ': the model draws only from W.rng and keeps only W.t'); }
});
test('seeded (0.27): a whole bot match with a fixed seed plays out the same to the last second', () => {
  for (const o of [{ seed: 6, heroPick: 1, difficulty: 0 }, { seed: 2, mode: 'short', heroPick: 4, difficulty: 2 }]) {
    const a = trace(o, 1500), b = trace(o, 1500);
    assert.ok(a.W.over, JSON.stringify(o) + ': the match ends (' + a.W.t.toFixed(0) + ' s)'); assert.strictEqual(b.W.t, a.W.t, 'it ends at the same moment'); assert.strictEqual(b.W.winner, a.W.winner);
    assert.strictEqual(b.evs.length, a.evs.length, 'the same number of events'); assert.ok(a.evs.every((e, i) => e === b.evs[i]), 'event for event'); assert.strictEqual(b.state, a.state, 'the same end state');
  }
});
/* ---------- 0.28 play: arrival, the fold catches, a light from home, the slack thread ---------- */
const hushSmall = (W, lane, s) => { const u = W.troopers.find(t => t.alive && t.team === 1 && !t.big && !t.used); u.used = true; LL.lanePoint(lane, s, PP); u.lane = lane; u.s = s; u.lat = 0; u.x = PP.x; u.z = PP.z; u.tgt = null; u.tgtT = 9; return u; }, PP = { x: 0, z: 0, dx: 0, dz: 0 };
test('0.28 play: a long ride toward the front lands as an arrival; a short one, or a ride home, lands quietly', () => {
  const go = (s0, s1, dir) => { const W = world({ auto: false }), h = W.player; run(W, 5, keepAlive); const u = hushSmall(W, 1, s1 + 3), big = (S._t.spawnHollow(1, true), W.troopers[W.troopers.length - 1]); LL.lanePoint(1, s1 - 3, PP); big.x = PP.x; big.z = PP.z; big.s = s1 - 3; big.tgtT = 9;
    LL.lanePoint(1, s1, PP); h.x = PP.x; h.z = PP.z; h.zip = { lane: 1, dir: dir, s: s1, s0: s0 }; const hp0 = u.hp, b0 = big.hp; h.ctl.zip = true; S._t.heroStep(h, 1 / 30); const ev = W.fx.filter(e => e.k === 'arrive'); W.fx.length = 0; return { ev, lost: hp0 - u.hp, bigLost: b0 - big.hp, u, h, W }; };
  let r = go(20, 80, 1); assert.strictEqual(r.ev.length, 1, 'one arrival'); assert.ok(r.ev[0].p && r.ev[0].n === 2, 'it names the player and counts both: ' + r.ev[0].n); assert.ok(!r.h.zip, 'off the thread');
  const want = C.ARRIVE.dmg + C.ARRIVE.dmgMin * (r.W.t / 60); assert.ok(Math.abs(r.lost - want) < 1, 'the small one takes the landing: ' + r.lost + ' of ' + want); assert.ok(Math.abs(r.bigLost - want * 0.25) < 1, 'a hollow takes a quarter: ' + r.bigLost);
  assert.ok(r.u.slowT > 0 && r.u.slowAmt >= C.ARRIVE.slow, 'and staggers');
  r = go(80 - C.ARRIVE.min + 5, 80, 1); assert.strictEqual(r.ev.length, 0, 'a short ride lands quietly'); assert.strictEqual(r.lost, 0);
  r = go(140, 80, -1); assert.strictEqual(r.ev.length, 0, 'a ride home lands quietly'); assert.strictEqual(r.lost, 0);
});
test('0.28 play: the fold catches the small Hush on the thread folded away, and pins a hollow until it lets go', () => {
  const W = world({ auto: false }), h = W.player, c = W.creases[0]; run(W, 5, keepAlive); c.guard.alive = false; h.x = c.x; h.z = c.z; h.yaw = Math.PI / 2; // facing +x, the middle: the west thread folds into the middle one
  assert.ok(S.fold(h, 0)); assert.strictEqual(c.from, 0); assert.strictEqual(c.to, 1);
  const u = hushSmall(W, 0, LL.lanes[0].len / 2 + 4), far = hushSmall(W, 0, LL.lanes[0].len / 2 + 40), other = hushSmall(W, 2, LL.lanes[2].len / 2 + 4); S._t.spawnHollow(0, true); const big = W.troopers[W.troopers.length - 1]; LL.lanePoint(0, LL.lanes[0].len / 2 + 2, PP); big.x = PP.x; big.z = PP.z; big.s = LL.lanes[0].len / 2 + 2;
  const mine = W.troopers.find(t => t.alive && t.team === 0 && t.lane === 0); LL.lanePoint(0, LL.lanes[0].len / 2 - 4, PP); mine.s = LL.lanes[0].len / 2 - 4; mine.x = PP.x; mine.z = PP.z;
  const orbs0 = W.orbs.length, souls0 = h.total; let ev = run(W, 0.2, w => { keepAlive(w); h.x = 70; h.z = -100; });
  assert.ok(u.caught > 0 && ev.some(e => e.k === 'caught' && e.u === u), 'the small one in the crease is caught'); assert.ok(!(far.caught > 0), 'one that has not reached the crease is not'); assert.ok(!(other.caught > 0), 'nor one on another thread'); assert.ok(!(big.caught > 0) && big.pinned && ev.some(e => e.k === 'pinned' && e.u === big), 'a hollow is too heavy to crumple: it is pinned'); assert.strictEqual(mine.lane, 1, 'the folder\'s own trooper crosses, as before');
  const z0 = u.z; ev = run(W, C.FOLD_CATCH + 0.3, w => { keepAlive(w); h.x = 70; h.z = -100; }); assert.ok(!u.alive, 'it crumples and is gone'); assert.ok(ev.some(e => e.k === 'death' && e.u === u && e.creased), 'and says so'); assert.ok(Math.abs(u.z - z0) < 0.01, 'without taking another step');
  assert.ok(big.alive, 'the hollow is still there'); assert.ok(h.total - souls0 < 12, 'nobody is paid for the small one');
  const bz = big.z; run(W, 5, w => { keepAlive(w); h.x = 70; h.z = -100; big.hp = big.maxHp; }); assert.ok(Math.abs(big.z - bz) < 0.01, 'pinned, it does not walk'); { const hp0 = big.hp; run(W, 1, w => { keepAlive(w); h.x = 70; h.z = -100; }); assert.ok(Math.abs((hp0 - big.hp) - big.maxHp * C.FOLD_CRUSH) < big.maxHp * 0.004, 'and the crease presses it: ' + (hp0 - big.hp).toFixed(0)); } c.t = 0.05; ev = run(W, 3, w => { keepAlive(w); h.x = 70; h.z = -100; big.hp = big.maxHp; }); assert.ok(ev.some(e => e.k === 'foldend') && ev.some(e => e.k === 'unpinned' && e.u === big) && !big.pinned, 'the crease lets go of it'); assert.ok(big.z < bz - 3, 'and it comes on: ' + (bz - big.z).toFixed(1));
});
test('0.28 play: the fountain\'s mending sends a hero out with one light, and the light mends or relights one house', () => {
  const W = world({ auto: false }), h = W.player, sp = S.spawnPos(0, h.slot), g = W.st[0][1].outer, wd = W.st[0][1].inner, hold = (w) => { w.patron.forEach(p => { p.hp = p.maxHp; }); w.waveT = 99; w.thiefT = 1e9; };
  let ev = run(W, C.EMBER.wait - 0.5, hold); assert.ok(!h.ember && !ev.some(e => e.k === 'ember'), 'a hero standing whole at home is given nothing at once');
  h.x = 40; h.z = -90; run(W, 0.2, hold); h.x = sp.x; h.z = sp.z; h.hp = h.maxHp * 0.3; ev = run(W, C.EMBER.need / 0.14 + 0.1, hold); assert.ok(h.ember, 'mended at home, it carries a light'); assert.strictEqual(ev.filter(e => e.k === 'ember').length, 1); assert.ok(ev.find(e => e.k === 'ember').p && !ev.find(e => e.k === 'ember').waited, 'and the light says it came of mending');
  h.hp = h.maxHp * 0.3; ev = run(W, 8, hold); assert.strictEqual(ev.filter(e => e.k === 'ember').length, 0, 'one light at a time');
  g.hp = g.maxHp * 0.5; h.x = 30; h.z = -100; ev = run(W, 0.2, hold); assert.ok(h.ember && !ev.some(e => e.k === 'mended'), 'away from every house it keeps the light');
  h.x = g.x + 4; h.z = g.z; h.zip = { lane: 1, dir: 1, s: g.s, s0: g.s }; S._t.heroStep(h, 1 / 30); assert.ok(h.ember, 'a rider keeps the light as it passes'); h.zip = null; h.x = g.x + 4; h.z = g.z; h.y = 0;
  ev = run(W, 0.2, hold); const m = ev.find(e => e.k === 'mended'); assert.ok(m && m.s === g && m.p, 'on foot by a hurt house, the light goes in'); assert.ok(Math.abs(g.hp - g.maxHp * (0.5 + C.EMBER.heal)) < 2, 'mended by ' + C.EMBER.heal + ': ' + (g.hp / g.maxHp).toFixed(2)); assert.ok(!h.ember, 'and the light is spent'); assert.ok(g.brightT > 0, 'the house burns bright');
  h.ember = true; const t = thiefOn(W, g); g.dark = true; g.darkT = 0; t.carry = g; t.state = 1; h.x = g.x + 4; h.z = g.z; ev = run(W, 0.2, hold); assert.ok(!g.dark && ev.some(e => e.k === 'mended' && e.relit), 'a dark house is lit again'); assert.strictEqual(t.carry, null, 'and the hush carries nothing now');
  h.ember = true; S._t.damage(h, 1e6, null, 'unit'); assert.ok(!h.alive && !h.ember, 'the light goes out with its carrier');
  const F = world({ auto: false, mode: 'fallen' }), fh = F.player; fh.hp = fh.maxHp * 0.3; run(F, 8, hold); assert.ok(!fh.ember, 'not in Ever Fallen: there a light is won from a small one');
  { const shots = (bright) => { const X = world({ auto: false }), xg = X.st[0][1].outer; run(X, 5, keepAlive); const u = hushSmall(X, 1, xg.s + 6); if (bright) xg.brightT = C.EMBER.bright; xg.atkT = 0; return run(X, 4, w => { keepAlive(w); w.waveT = 99; u.hp = u.maxHp; u.x = xg.x; u.z = xg.z + 6; }).filter(e => e.k === 'towershot' && e.u === xg).length; }; const n0 = shots(false), n1 = shots(true); assert.ok(n1 >= n0 * C.EMBER.fire - 1 && n1 > n0, 'a bright house fires ' + C.EMBER.fire + ' times as fast: ' + n1 + ' against ' + n0); }
});
test('0.28 play: halfway between rains one thread goes slack: its houses stop firing and stand unprotected', () => {
  const W = world({ auto: false, difficulty: 1 }), D = C.SLACK, hold = (w) => { keepAlive(w); w.structs.forEach(s => { s.hp = s.maxHp; }); };
  let ev = run(W, D.first - D.warn - 1, hold); assert.ok(!ev.some(e => e.k === 'slackwarn' || e.k === 'slack'), 'nothing before its time');
  ev = run(W, 2, hold); const w = ev.find(e => e.k === 'slackwarn'); assert.ok(w && Math.abs(w.at - (D.first - D.warn)) < 0.1, 'said ' + D.warn + ' s ahead'); const lane = w.lane; assert.ok(!S.slack(W.st[1][lane].outer), 'not slack yet');
  ev = run(W, D.warn, hold); const s0 = ev.find(e => e.k === 'slack'); assert.ok(s0 && s0.lane === lane && Math.abs(s0.at - D.first) < 0.1, 'slack at ' + D.first); assert.strictEqual(ev.filter(e => e.k === 'hollow' && e.extra && e.lane === lane).length, C.DIFF[1].slackHollows, 'the Hush leans on it');
  for (const t of [0, 1]) { assert.ok(S.slack(W.st[t][lane].outer) && S.slack(W.st[t][lane].inner), 'both houses of side ' + t); assert.ok(!S.slack(W.st[t][(lane + 1) % 3].outer), 'not the next thread'); assert.ok(!S.slack(W.patron[t]), 'never a patron'); }
  const a = W.st[1][lane].outer, b = W.st[1][(lane + 1) % 3].outer; a.pressed = b.pressed = false; const ha = a.hp, hb = b.hp; S._t.damage(a, 100, W.player, 'gun'); S._t.damage(b, 100, W.player, 'gun'); W.fx.length = 0;
  assert.ok(Math.abs((ha - a.hp) - 100 * D.mul) < 0.01, 'a slack house takes ' + D.mul + ' times, pressed or not: ' + (ha - a.hp)); assert.ok(Math.abs((hb - b.hp) - 30) < 0.01, 'the others keep their protection: ' + (hb - b.hp));
  ev = run(W, D.t - 2, hold); assert.ok(!ev.some(e => e.k === 'towershot' && e.u.lane === lane && e.u.kind !== 'patron'), 'no house on the slack thread fires'); assert.ok(ev.some(e => e.k === 'towershot' && e.u.lane !== lane), 'the others do');
  ev = run(W, 3, hold); assert.ok(ev.some(e => e.k === 'slackend' && e.lane === lane), 'it pulls tight after ' + D.t + ' s'); assert.ok(!S.slack(a));
  const worn = (lane + 1) % 3, gone = (lane + 2) % 3, hold2 = (w) => { keepAlive(w); w.structs.forEach(s => { if (s.alive) s.hp = s.maxHp * (s.lane === worn && s.kind === 'guardian' && s.team === 0 ? 0.5 : 1); }); };
  W.st[1][gone].outer.alive = false; W.st[1][gone].inner.alive = false; // the thread with the most lost, but one side has no house left on it
  ev = run(W, S.tideAfter(D.first) - D.first, hold2); const s1 = ev.find(e => e.k === 'slack'); assert.ok(s1 && Math.abs(s1.at - S.tideAfter(D.first)) < 0.1, 'again at the next tide'); assert.strictEqual(s1.lane, worn, 'the most worn thread goes slack, and a thread where one side has no house comes last');
  { const Z = world({ auto: false }), zh = Z.player, far = Z.st[1][1].outer; Z.slack.lane = 1; Z.slack.t = 30; assert.ok(Math.abs(S.zipEnd(0, 1) - LL.lanes[1].len * D.ride[0]) < 0.01, 'a slack thread carries to the far guardian'); assert.ok(S.zipEnd(0, 0) < LL.lanes[0].len * 0.5, 'the others end where they did'); far.alive = false; assert.ok(Math.abs(S.zipEnd(0, 1) - LL.lanes[1].len * D.ride[1]) < 0.01, 'and on to the warden once the guardian is down'); Z.slack.t = 0; assert.ok(S.zipEnd(0, 1) < LL.lanes[1].len * 0.7, 'pulled tight, it ends where it did'); }
  { const Z = world({ auto: false, difficulty: 1 }); run(Z, D.first + 1, hold); const ln = Z.slack.lane, lean = Z.troopers.filter(u => u.alive && u.lean === Z.slack.n); assert.strictEqual(lean.length, C.DIFF[1].slackHollows, 'the leaning hollow is marked');
    S._t.kill(Z.st[1][ln].outer, null, null); const e2 = Z.fx.find(e => e.k === 'slackend'); assert.ok(e2 && e2.fell === 1 && e2.broke === lean.length, 'a Hush house falls: the thread pulls tight and the lean breaks'); assert.ok(!(Z.slack.t > 0) && lean.every(u => !u.alive) && !S.slack(Z.st[0][ln].outer), 'the Reign house on it is its own again');
    const Y = world({ auto: false, difficulty: 1 }); run(Y, D.first + 1, hold); const ly = Y.slack.lane, lean2 = Y.troopers.filter(u => u.alive && u.lean === Y.slack.n); S._t.kill(Y.st[0][ly].outer, null, null); assert.ok(!(Y.slack.t > 0) && Y.fx.some(e => e.k === 'slackend' && e.fell === 0 && e.broke === 0), 'a Reign house falls: tight again'); assert.ok(lean2.every(u => u.alive), 'and the hollow keeps coming'); }
  for (const mode of ['short', 'fallen']) { const X = world({ mode: mode }); ev = run(X, D.first + 5, hold); assert.ok(!ev.some(e => e.k === 'slackwarn' || e.k === 'slack'), 'no slack thread in ' + mode); }
  const G = world({ difficulty: 0, auto: false }); ev = run(G, D.first + 1, hold); assert.strictEqual(ev.filter(e => e.k === 'hollow' && e.extra).length, C.DIFF[0].slackHollows, 'Gentle: the Hush does not lean');
});
/* ---------- 0.29 play: a light can be fetched, a kept house holds, the tides come more often ---------- */
test('0.29 play: a hero who waits at home leaves with a light; stepping out starts the wait again', () => {
  const W = world({ auto: false }), h = W.player, sp = S.spawnPos(0, h.slot), hold = (w) => { w.patron.forEach(p => { p.hp = p.maxHp; }); w.waveT = 99; w.thiefT = 1e9; };
  let ev = run(W, C.EMBER.wait - 0.3, hold); assert.ok(!h.ember, 'not before ' + C.EMBER.wait + ' s');
  h.x = 40; h.z = -90; run(W, 0.2, hold); h.x = sp.x; h.z = sp.z; ev = run(W, C.EMBER.wait - 0.3, hold); assert.ok(!h.ember, 'a step outside and the wait begins again');
  ev = run(W, 0.6, hold); const e = ev.find(x => x.k === 'ember'); assert.ok(h.ember && e && e.p && e.waited, 'whole, it waited ' + C.EMBER.wait + ' s and carries a light');
  ev = run(W, C.EMBER.wait + 1, hold); assert.ok(!ev.some(x => x.k === 'ember'), 'one light at a time');
  const g = W.st[0][0].outer; h.x = g.x + 4; h.z = g.z; ev = run(W, 0.2, hold); assert.ok(ev.some(x => x.k === 'mended' && x.s === g) && g.brightT > 0, 'a whole house takes the light too, and is kept');
  const F = world({ auto: false, mode: 'fallen' }); run(F, C.EMBER.wait + 3, hold); assert.ok(!F.player.ember, 'not in Ever Fallen');
});
test('0.29 play: a kept house takes less harm, is never slack, and no small one takes its light', () => {
  const W = world({ auto: false, difficulty: 1 }), D = C.SLACK, hold = (w) => { keepAlive(w); w.structs.forEach(s => { s.hp = s.maxHp; }); };
  const a = W.st[0][0].outer, b = W.st[0][2].outer; a.pressed = b.pressed = true; a.brightT = 500; const ha = a.hp, hb = b.hp; S._t.damage(a, 100, null, 'unit'); S._t.damage(b, 100, null, 'unit'); W.fx.length = 0;
  assert.ok(Math.abs((ha - a.hp) - 100 * C.EMBER.guard) < 0.01, 'kept, it takes ' + C.EMBER.guard + ' of the blow: ' + (ha - a.hp)); assert.ok(Math.abs((hb - b.hp) - 100) < 0.01, 'the house beside it takes it all');
  W.structs.forEach(s => { if (s.team === 0) s.brightT = 500; }); const first = W.slack.next; run(W, first + 1, hold); const ln = W.slack.lane; assert.ok(W.slack.t > 0, 'a thread is slack');
  assert.ok(!S.slack(W.st[0][ln].outer) && !S.slack(W.st[0][ln].inner), 'the kept houses on it are not'); assert.ok(S.slack(W.st[1][ln].outer), 'the Hush house on it is');
  const k = W.st[0][ln].outer; k.pressed = false; const hk = k.hp; S._t.damage(k, 100, null, 'unit'); assert.ok(Math.abs((hk - k.hp) - 100 * 0.3 * C.EMBER.guard) < 0.01, 'and it keeps its protection: ' + (hk - k.hp));
  const u = hushSmall(W, ln, k.s + 6); k.atkT = 0; const ev = run(W, 3, w => { hold(w); w.waveT = 99; u.hp = u.maxHp; u.x = k.x; u.z = k.z + 6; }); assert.ok(ev.some(e => e.k === 'towershot' && e.u === k), 'and it fires');
  const X = world({ auto: false }); X.heroes.forEach(h => { h.souls = 0; }); X.st[0][0].outer.brightT = X.st[0][1].outer.brightT = 500; for (let i = 0; i < 12; i++) { X.thiefT = 1e9; S._t.spawnThief(); const t = X.thieves[X.thieves.length - 1]; assert.strictEqual(t.mark, X.st[0][2].outer, 'the small one goes for the house that is not kept'); t.alive = false; }
});
/* ---------- 0.30 play: the tide takes a house ---------- */
test('0.30 play: a slack thread nobody pulled tight takes the more worn front house; a kept house is never taken; Gentle takes none', () => {
  const D = C.SLACK, setup = (o, each) => { const W = world(Object.assign({ auto: false, difficulty: 1 }, o)); W.waveT = 1e9; const hold = (w) => { keepAlive(w); w.waveT = 1e9; w.troopers.forEach(u => { u.alive = false; }); if (each) each(w); }; run(W, D.first + 1, hold); return { W, hold, ln: W.slack.lane }; };
  { const { W, hold, ln } = setup(), mine = W.st[0][ln].outer, theirs = W.st[1][ln].outer; assert.ok(W.slack.t > 0, 'slack');
    mine.hp = mine.maxHp * 0.8; theirs.hp = theirs.maxHp * 0.5; assert.strictEqual(S.tideTake(), theirs, 'theirs is the more worn');
    let ev = run(W, D.t - D.last - 2, hold); assert.ok(!ev.some(e => e.k === 'slacklast' || e.k === 'slacktake'), 'nothing said before the last ' + D.last + ' s');
    ev = run(W, 2, hold); const l = ev.find(e => e.k === 'slacklast'); assert.ok(l && l.u === theirs && l.lane === ln, 'said ' + D.last + ' s ahead, naming the house');
    const hp0 = W.patron[1].hp; ev = run(W, D.last + 1, hold); const k = ev.map(e => e.k);
    assert.ok(!theirs.alive && mine.alive, 'their house fell, mine stands'); assert.ok(k.indexOf('slacktake') >= 0 && k.indexOf('slacktake') < k.indexOf('structdown'), 'slacktake, then structdown');
    const se = ev.find(e => e.k === 'slackend'); assert.ok(se && se.fell === 1 && se.took, 'the thread pulls tight, marked as taken'); assert.ok(!(W.slack.t > 0), 'no longer slack');
    assert.ok(hp0 > 0 && ev.some(e => e.k === 'patrondim'), 'and their patron dims as for any house that falls'); }
  { const { W, hold, ln } = setup(), mine = W.st[0][ln].outer, theirs = W.st[1][ln].outer; mine.hp = mine.maxHp * 0.3; theirs.hp = theirs.maxHp * 0.6;
    run(W, D.t + 1, hold); assert.ok(!mine.alive && theirs.alive, 'mine was the more worn: mine falls'); assert.strictEqual(S.tideTake(), null, 'nothing to take once the thread is tight');
    const W2 = setup().W; assert.ok(W2.slack.t > 0); }
  { const { W, hold, ln } = setup(), mine = W.st[0][ln].outer, theirs = W.st[1][ln].outer; mine.hp = mine.maxHp * 0.3; theirs.hp = theirs.maxHp * 0.9; mine.brightT = 500;
    const ev = run(W, D.t + 1, hold); assert.ok(mine.alive && !theirs.alive, 'a kept house is never taken: the tide takes theirs instead'); assert.ok(ev.some(e => e.k === 'slacktake' && e.team === 1)); }
  { const { W, hold, ln } = setup(); const ev = run(W, D.t + 1, (w) => { hold(w); w.structs.forEach(s => { s.hp = s.maxHp; }); });
    assert.ok(W.st[0][ln].outer.alive && W.st[1][ln].outer.alive, 'two whole houses: nothing falls'); assert.ok(ev.some(e => e.k === 'slackend' && e.fell == null) && !ev.some(e => e.k === 'slacktake'), 'the thread just pulls tight'); }
  { const { W, hold, ln } = setup(), mine = W.st[0][ln], theirs = W.st[1][ln].outer; S._t.kill(mine.outer, null, null); assert.ok(!(W.slack.t > 0), 'a house that falls by itself still pulls the thread tight'); W.slack.t = 20; W.slack.lane = ln;
    mine.inner.hp = mine.inner.maxHp * 0.4; theirs.hp = theirs.maxHp * 0.7; assert.strictEqual(S.tideTake(), mine.inner, 'with the guardian gone the warden is the front house'); }
  { const { W, hold, ln } = setup({ difficulty: 0 }), mine = W.st[0][ln].outer; mine.hp = mine.maxHp * 0.3; const ev = run(W, D.t + 1, hold); assert.ok(mine.alive && !ev.some(e => e.k === 'slacktake' || e.k === 'slacklast'), 'Gentle: the tide takes nothing'); }
});
test('0.29 play: one early tide, then two to every rain, none while it rains; the hollow sets out ahead', () => {
  const W = world({ difficulty: 1 }), D = C.SLACK, E = C.RED_EVERY, hold = (w) => { keepAlive(w); w.structs.forEach(s => { s.hp = s.maxHp; }); }, ev = run(W, 2 * E + C.RED_T + D.t + 5, hold);
  const at = ev.filter(e => e.k === 'slack').map(e => Math.round(e.at)), warn = ev.filter(e => e.k === 'slackwarn').map(e => Math.round(e.at)), want = [D.first, E - D.pre, E + C.RED_T, 2 * E - D.pre, 2 * E + C.RED_T];
  assert.deepStrictEqual(at, want, 'tides at ' + want.join(', ') + ' s: ' + at.join(', ')); assert.deepStrictEqual(warn, want.map(t => t - D.warn), 'each said ' + D.warn + ' s ahead');
  for (const t of at) for (const r of [E, 2 * E]) assert.ok(t + D.t <= r || t >= r + C.RED_T, 'the tide at ' + t + ' is over before the rain at ' + r + ' falls, or begins as it ends');
  const lean = ev.filter(e => e.k === 'hollow' && e.extra && Math.abs(e.at - (D.first - D.lead)) < 0.1); assert.strictEqual(lean.length, C.DIFF[1].slackHollows, 'the hollow sets out ' + D.lead + ' s before the first tide');
  assert.strictEqual(ev.filter(e => e.k === 'hollow' && e.extra && Math.abs(e.at - D.first) < 0.1).length, 0, 'and no second one when the thread goes slack');
});
test('0.29 play: whoever catches a small one carries off a light', () => {
  const W = world({ auto: false }), h = W.player; h.x = -12; h.z = -12; const t = thiefOn(W, h); S._t.damage(t, 1e6, h, 'gun'); assert.ok(h.ember, 'the catcher carries a light'); assert.ok(W.fx.some(e => e.k === 'ember' && e.u === h && e.thief), 'and the event says where it came from'); W.fx.length = 0;
  const t2 = thiefOn(W, h); S._t.damage(t2, 1e6, h, 'gun'); assert.strictEqual(W.fx.filter(e => e.k === 'ember').length, 0, 'one light at a time');
  h.ember = false; const t3 = thiefOn(W, h); S._t.damage(t3, 1e6, null, 'unit'); assert.ok(!h.ember, 'a small one that a house or trooper puts down leaves no light');
  const F = world({ auto: false, mode: 'fallen' }), fh = F.player, ft = thiefOn(F, fh); S._t.damage(ft, 1e6, fh, 'gun'); assert.ok(!fh.ember, 'not in Ever Fallen: there the light goes to a dark house');
});
test('0.29 play: every Hush house that falls takes a part of the Hush patron', () => {
  const W = world({ auto: false }), p = W.patron[1], hp0 = p.hp; S._t.kill(W.st[1][0].outer, null, null); const e = W.fx.find(x => x.k === 'patrondim');
  assert.ok(Math.abs((hp0 - p.hp) - p.maxHp * C.PATRON_DIM) < 0.01, 'a guardian on the west thread: ' + (hp0 - p.hp).toFixed(0)); assert.ok(e && e.u === p && e.n === 1 && e.by === W.st[1][0].outer, 'and it is said');
  const r0 = W.patron[0].hp; S._t.kill(W.st[0][0].outer, null, null); assert.strictEqual(W.patron[0].hp, r0, 'the Reign patron does not live on its houses');
  p.hp = 5; S._t.kill(W.st[1][2].outer, null, null); assert.ok(p.alive && p.hp >= 1 && !W.over, 'a falling house never takes the last of it');
  const F = world({ auto: false, mode: 'short' }), f0 = F.patron[1].hp; S._t.kill(F.st[1][0].outer, null, null); assert.strictEqual(F.patron[1].hp, f0, 'not in First Rain');
});
test('0.29 play: an arrival needs a landing among the Hush', () => {
  const W = world({ auto: false }), h = W.player; run(W, 5, keepAlive); const u = hushSmall(W, 1, 80 + C.ARRIVE.r + 6); LL.lanePoint(1, 80, PP); h.x = PP.x; h.z = PP.z; h.zip = { lane: 1, dir: 1, s: 80, s0: 20 }; const hp0 = u.hp; h.ctl.zip = true; S._t.heroStep(h, 1 / 30);
  assert.ok(!W.fx.some(e => e.k === 'arrive') && u.hp === hp0 && !h.zip, 'let go short of them, with none in reach of the landing, the ride ends quietly: the one ahead on the thread is not struck');
});
test('the model never reads the look: sim and core have no presentation references', () => {
  for (const f of ['core.js', 'sim.js']) { const src = fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8').replace(/typeof window !== 'undefined' \? window : globalThis/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"])\/\/.*$/gm, '$1'); // comments may talk about the rule; code may not break it
    for (const bad of [/\bLL\.gfx\b/, /\bLL\.ui\b/, /\bdocument\b/, /\bwindow\b/, /\blook\b/i, /\bLK\b/, /localStorage/]) assert.ok(!bad.test(src), f + ' mentions ' + bad); }
  assert.strictEqual(typeof LL.gfx, 'undefined', 'sim ran with no renderer loaded');
});
console.log('\n' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
