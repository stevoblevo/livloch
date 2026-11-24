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
  for (const id in got) for (const seed of [3, 4]) { const W = world({ heroPick: LL.HEROES.findIndex(d => d.id === id), seed: seed }); const ev = run(W, 240, keepAlive);
    got[id] += ev.filter(e => e.u && e.u.def && e.u.def.id === id && ((e.k === 'jump' && e.dbl) || e.k === 'hover')).length; }
  assert.ok(got.anna >= 2 && got.skein >= 2 && got.myra >= 2, 'second jumps and hovers by bots in 8 minutes: ' + JSON.stringify(got));
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
test('the model never reads the look: sim and core have no presentation references', () => {
  for (const f of ['core.js', 'sim.js']) { const src = fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8').replace(/typeof window !== 'undefined' \? window : globalThis/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"])\/\/.*$/gm, '$1'); // comments may talk about the rule; code may not break it
    for (const bad of [/\bLL\.gfx\b/, /\bLL\.ui\b/, /\bdocument\b/, /\bwindow\b/, /\blook\b/i, /\bLK\b/, /localStorage/]) assert.ok(!bad.test(src), f + ' mentions ' + bad); }
  assert.strictEqual(typeof LL.gfx, 'undefined', 'sim ran with no renderer loaded');
});
console.log('\n' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
