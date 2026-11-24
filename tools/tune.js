/* Balance against the agreed target (docs/PLAN.md, "What the player should learn without being told"; docs/ROADMAP.md
   Phase 1, 0.20): Even winnable with two of the five lessons, Cruel only with four, Gentle by someone who knows none.

   Run:  node tools/tune.js [seeds] [first seed] [options]
         node tools/tune.js 12                 every difficulty, lessons known 0..5, the long match and First Rain
         node tools/tune.js 8 1 --mode match   only the long match (or --mode short for First Rain)
         node tools/tune.js 8 1 --diff 1       only Even (0 Gentle, 1 Even, 2 Cruel)
         node tools/tune.js 8 1 --lessons 0,2,135   which lesson sets to run: digits name the lessons, 0 none
         node tools/tune.js 8 1 --lines        also print one line per match
         node tools/tune.js 8 1 --jobs 1       how many worker processes (default: one per CPU)

   WHAT IT IS. A scripted player for the human's hero, not a bot: the player's hero runs with useAI off, exactly as in a
   person's match (so the two teammates are the usual bots with their human-match handicap, botMul 0.78, and take the
   other two threads), and the policy below drives it only through hero.ctl and the public actions a person has
   (S.setLens, S.fold, S.echo, S.buy). Its aim is a bot's aim with a little more wobble. What changes between rows is
   only which of the five lessons it acts on. The sim is seeded (0.27, #27) and the policy draws from its own
   LL.rng, never W.rng, so every line is reproducible and the policy itself does not move the model's draws.

   THE FIVE LESSONS, as behaviours (the order they should be found; "lessons known k" in the table is the first k):
     0 none   Picks the middle thread and walks up behind its own troopers; shoots whatever is nearest in range; casts
              whatever is ready at whatever it is shooting; buys its hero's build every half minute; fights on to 12%
              health before walking home; runs to any other thread whose house is being hit. Never rides a thread,
              never shoots an orb, never changes the view, never hunts.
     1 Equal force cancels; break the symmetry. Goes to the thread where the Hush's next building is weakest and stands
              closer behind the wave; shoots its own soul orbs to secure them; hollows and buildings first among targets;
              Echo in a fight; fishes the Ness from outside its reach when the lane is quiet, for the Greatness.
     2 The world keeps time. Hunts the small ones (thieves) within 45 m before they get home; walks to ripe little
              fruit within 30 m; presses the building while its thread's hollow is down (the respawn window); falls back
              to its own house during a full red rain.
     3 Looking is an action. Answers the mood with the right view about five seconds after the warning; wears
              Rainwake through the rain; fetches a ripe big fruit within 55 m through its view, then back to snow.
     4 Distance is not fixed. Rides threads (to the front, and home to heal); kills the west stray when its crease is
              guarded and folds the lane next to it into its own; the Ness crease too once the Ness is down.
     5 You cannot keep everything lit. Stops running to every house under attack: leaves its thread only for an inner
              house or the patron; walks home at 35% health instead of 12% and comes back mended.

   WHAT IT MEASURES. Per difficulty and lessons known: the long match's win rate, median length, how losses came (by the
   gutter after 20:00, or overrun), structures lost each side, the player's deaths and what killed it, the longest
   stretch with no building falling; First Rain's mean stars, how often every house stood, and how often 3+ stars.
   WHAT IT CANNOT. It is a policy, not a person: it never misreads the screen, never panics, never discovers a lesson
   halfway. Read the rows as the slope between lessons, not as what a person will feel. Simulator output only. */
const path = require('path'), cp = require('child_process'), os = require('os');
require(path.join(__dirname, '..', 'js', 'core.js')); require(path.join(__dirname, '..', 'js', 'sim.js'));
const S = LL.sim, C = LL.C, U = LL.U, lanes = LL.lanes, hyp = Math.hypot, NESS = S.NESS;
const P = { x: 0, z: 0, dx: 0, dz: 0 }, Q = { s: 0, d: 0 };

function policy(W, L, seed) {
  const r = LL.rng(seed * 7919 + 13), p = W.player, has = (k) => L.indexOf(String(k)) >= 0;
  const st = { thinkT: 0, lane: 1, laneT: 0, pick: 0, buyT: 10, retreat: false, ax: p.x, ay: 1.5, az: p.z + 20, tgt: null, gx: p.x, gz: p.z,
    lat: (r() * 2 - 1) * 2.5, strafe: r() * 9, ph: r() * 6, hp: {}, hurtAt: {}, moodAt: -1, fold: -1, orb: null, back: false, wantLens: null, zipOn: false };
  const en = 1, rel = S.rel;
  function enemyNext(l) { const s = W.st[en][l]; return s.outer.alive ? s.outer : (s.inner.alive ? s.inner : W.patron[en]); }
  function think() {
    const c = p.ctl, hpF = p.hp / p.maxHp, wasFold = st.fold; st.fold = -1;
    for (const s of W.structs) if (s.team === 0) { if (st.hp[s.id] != null && s.hp < st.hp[s.id] - 1) st.hurtAt[s.id] = W.t; st.hp[s.id] = s.hp; }
    if ((st.buyT -= 0.2) <= 0) { st.buyT = 30; const b = p.def.build; for (let i = 0; i < b.length; i++) if (p.items.indexOf(b[i]) < 0) { if (p.souls >= LL.ITEMS[b[i]].cost) S.buy(p, b[i]); break; } }
    // retreat
    const low = has(5) ? 0.35 : 0.12;
    if (st.retreat) { if (hpF > 0.9) st.retreat = false; } else if (hpF < low) st.retreat = true;
    // views (lesson 3)
    const m = W.mood;
    if (has(3)) {
      if (m && !m.done) { if (st.moodAt < 0) st.moodAt = W.t + 5; if (W.t >= st.moodAt) S.setLens(m.lens); }
      else { st.moodAt = -1; if (W.red > 0) S.setLens('rain'); else if (!st.wantLens) S.setLens('snow'); }
    }
    // lane
    st.laneT -= 0.2;
    if (st.laneT <= 0) {
      st.laneT = 40;
      if (has(1)) { let bl = 1, bv = 1e9; for (let l = 0; l < 3; l++) { const e = enemyNext(l), v = e.hp / e.maxHp + (e.kind === 'guardian' ? 0 : e.kind === 'warden' ? 1 : 2); if (v < bv) { bv = v; bl = l; } } st.pick = bl; }
      else st.pick = 1;
      if (W.t > 600 && has(1)) { const b = W.heroes.find(h => h !== p && h.alive); if (b) st.pick = b.ai.lane; }
    }
    st.lane = st.pick;
    let fire = null; // a house of ours being hit
    for (const s of W.structs) if (s.team === 0 && s.alive && st.hurtAt[s.id] > W.t - 2) { if (!has(5) || s.kind !== 'guardian') { if (!fire || s.kind !== 'guardian') fire = s; } }
    if (fire && fire.lane !== st.lane) st.lane = fire.lane;
    const lane = st.lane, Ln = lanes[lane];
    LL.laneNearest(lane, p.x, p.z, Q); const myS = rel(0, lane, Q.s), onLane = Q.d < 6;
    // where to stand
    let standS = W.front[0][lane] - (has(1) ? 3 : 6);
    const tw = enemyNext(lane), twS = tw === W.patron[en] ? Ln.len + 6 : rel(0, lane, tw.s);
    let pushing = false; for (const u of W.troopers) if (u.alive && u.team === 0 && hyp(u.x - tw.x, u.z - tw.z) < tw.range - 2) { pushing = true; break; }
    const window = has(2) && W.hollowT[lane] > 0;
    standS = Math.min(standS, pushing || window ? twS - (window ? 10 : 15) : twS - tw.range - 4);
    if (has(2) && W.red > 0 && !W.thin) { const g = W.st[0][lane]; const own = g.outer.alive ? g.outer : g.inner; if (own.alive) standS = Math.min(standS, rel(0, lane, own.s) + 4); }
    standS = U.clamp(standS, 8, Ln.len - 16);
    LL.lanePoint(lane, rel(0, lane, standS), P); let gx = P.x - P.dz * st.lat, gz = P.z + P.dx * st.lat, job = 'lane';
    // errands, in order of what a lesson says matters
    const free = !st.retreat && hpF > 0.45;
    if (has(2) && !st.retreat) { let bt = null, bd = 45; for (const t of W.thieves) if (t.alive) { const d = hyp(t.x - p.x, t.z - p.z); if (d < bd) { bd = d; bt = t; } } if (bt) { gx = bt.x; gz = bt.z; job = 'thief'; st.tgt = bt; } }
    st.wantLens = null;
    if (job === 'lane' && free && has(3) && !(m && !m.done) && !(W.red > 0)) { for (const f of W.fruit) if (f.ripe && f.lens && hyp(f.x - p.x, f.z - p.z) < 55) { st.wantLens = f.lens; S.setLens(f.lens); gx = f.x; gz = f.z; job = 'fruit'; break; } }
    if (job === 'lane' && !st.retreat && has(2)) { for (const f of W.fruit) if (f.ripe && !f.lens && hyp(f.x - p.x, f.z - p.z) < 30 && (f.k !== 'hips' || hpF < 0.8)) { gx = f.x; gz = f.z; job = 'fruit'; break; } }
    if (job === 'lane' && free && has(4)) {
      for (let i = 0; i < W.creases.length; i++) {
        const k = W.creases[i]; if (k.t > 0 || k.cd > 0) continue;
        if (Math.abs(lane - (i === 0 ? 0 : 2)) > 1) continue;
        if (k.guard.alive) { if (i === 0 && hyp(k.x - p.x, k.z - p.z) < 60 && W.t > 40) { gx = k.guard.x; gz = k.guard.z; job = 'stray'; st.tgt = k.guard; } break; }
        gx = k.x; gz = k.z; job = 'fold';
        if (S.creaseFor(p) === i) { const into = lane === k.b ? k.b : k.a, side = C.LANE_X[into] - k.x; c.ax = p.x + Math.sign(side || 1) * 10; c.az = p.z; c.ay = 1.5; if (wasFold === i) S.fold(p, i); else st.fold = i; }
        break;
      }
    }
    const ns = W.ness;
    if (job === 'lane' && free && has(1) && ns.alive && ns.rise >= 1 && hpF > 0.6 && Math.abs(lane - 2) <= 1) {
      let busy = false; for (const u of W.troopers) if (u.alive && u.team === 1 && u.big && hyp(u.x - p.x, u.z - p.z) < 25) busy = true;
      if (!busy) { gx = ns.out ? ns.x - 14 : C.LOCH.x; gz = ns.out ? ns.z - 14 : C.LOCH.z - (NESS.REACH + 3.5); job = 'ness'; }
    }
    if (st.retreat) { const sp = S.spawnPos(0, p.slot); gx = sp.x; gz = sp.z; job = 'home'; }
    st.gx = gx; st.gz = gz; st.job = job;
    // threads (lesson 4)
    if (has(4)) {
      if (p.zip) { const ts = rel(0, p.zip.lane, p.zip.s); if (job !== 'home' && job !== 'lane') c.zip = true; else if (job === 'lane' && (p.zip.dir < 0 || p.zip.lane !== lane || ts >= standS - 5)) c.zip = true; }
      else if (onLane && S.canZip(p) === lane) { if (job === 'lane' && standS - myS > 40 && S.zipEnd(0, lane) - myS > 25) { c.zip = true; c.zipDir = 1; } else if (job === 'home' && myS > 30) { c.zip = true; c.zipDir = -1; } }
    }
    // target
    if (job !== 'thief' && job !== 'stray') {
      const range = p.def.gun.range * 0.92; let best = null, bs = -1e9;
      for (const u of W.units) {
        if (!u.alive || u.team !== en) continue; const d = hyp(u.x - p.x, u.z - p.z) - u.r; if (d > range) continue;
        if (u.struct && (!S.vuln(u) || (!u.pressed && !W.fray))) continue;
        if (!(u.kind === 'trooper' || u.kind === 'thief' || u.struct)) continue;
        let sc = -d;
        if (has(1)) sc += u.big ? 40 : u.struct ? 25 : u.kind === 'thief' ? 50 : (1 - u.hp / u.maxHp) * 15;
        if (sc > bs) { bs = sc; best = u; }
      }
      if (!best && ns.alive && (job === 'ness' || (ns.out && hyp(ns.x - p.x, ns.z - p.z) < range) || (ns.hp < ns.maxHp * 0.98 && hyp(ns.x - p.x, ns.z - p.z) < range && has(1)))) best = ns;
      if (job === 'ness' && ns.alive && hyp(ns.x - p.x, ns.z - p.z) < range) best = ns;
      st.tgt = best;
    }
    st.orb = null;
    if (has(1) && W.orbs.length) for (const o of W.orbs) if (!o.dead && o.team === 0 && o.t < 2.2 && hyp(o.x - p.x, o.z - p.z) < 26 && !(st.tgt && st.tgt.big && hyp(st.tgt.x - p.x, st.tgt.z - p.z) < 10)) { st.orb = o; break; }
    if (has(1) && S.echoReady() && st.tgt && (st.tgt.big || st.tgt.struct || st.tgt.kind === 'ness') && W.t - p.lastShotT < 0.5) S.echo();
    // abilities: any player casts what is ready at what it is shooting
    const t = st.tgt, td = t ? hyp(t.x - p.x, t.z - p.z) : 1e9;
    for (let i = 0; i < 3; i++) {
      if (p.cds[i] > 0 || (i === 2 && p.level < C.ULT_LEVEL) || p.zip) continue;
      const a = p.def.ab[i];
      if (a.kind === 'zone' && a.heal) { if (hpF < 0.6) c.ab[i] = true; continue; }
      if (a.kind === 'dash' || a.kind === 'blink' || a.kind === 'lift') { if (st.retreat && r() < 0.3) c.ab[i] = true; continue; }
      if (!t) continue;
      if (a.kind === 'nova' || (a.kind === 'zone' && !a.range)) { if (td < (a.r || 7) * 0.8) c.ab[i] = true; }
      else if (td < Math.min(a.range || 30, 34)) c.ab[i] = true;
    }
    if (!t && p.ammo < p.magSize * 0.4) c.reload = true;
  }
  return {
    step(dt) {
      const c = p.ctl;
      if (!p.alive) { c.fire = false; c.mx = c.mz = 0; st.retreat = false; return; }
      if (p.held) { if (r() < 3 * dt) c.jump = true; return; }
      st.thinkT -= dt; if (st.thinkT <= 0) { st.thinkT = 0.2; think(); }
      if (st.tgt && !st.tgt.alive) st.tgt = null;
      st.strafe += dt;
      const dx = st.gx - p.x, dz = st.gz - p.z, d = hyp(dx, dz); let mx = 0, mz = 0; if (d > 1.2) { mx = dx / d; mz = dz / d; }
      const t = st.tgt;
      if (t && st.job !== 'home') { const tx = t.x - p.x, tz = t.z - p.z, tdd = hyp(tx, tz) || 1, sg = Math.sin(st.strafe * 1.5 + st.ph) > 0 ? 1 : -1; mx += -tz / tdd * 0.6 * sg; mz += tx / tdd * 0.6 * sg; if (t.big && tdd < 9) { mx -= tx / tdd * 0.8; mz -= tz / tdd * 0.8; } }
      const ns = W.ness; if (ns.alive && ns.rise >= 0.5 && !p.zip) { const kx = p.x - ns.x, kz = p.z - ns.z, kd = hyp(kx, kz), keep = ns.out ? 12 : NESS.REACH + 1; if (kd < keep && kd > 0.01 && (st.job === 'ness' || st.job === 'fold')) { mx += kx / kd * 1.2; mz += kz / kd * 1.2; } }
      const mm = hyp(mx, mz); if (mm > 1) { mx /= mm; mz /= mm; } c.mx = mx; c.mz = mz;
      let aim = null;
      if (st.orb && !st.orb.dead) aim = [st.orb.x, st.orb.y + 0.25, st.orb.z];
      else if (t) { const tdd = hyp(t.x - p.x, t.z - p.z), lead = tdd / p.def.gun.speed * 0.7; aim = [t.x + (t.vx || 0) * lead, t.y + (t.struct ? Math.min(t.h * 0.5, 4) : t.h * 0.6), t.z + (t.vz || 0) * lead]; }
      if (st.fold >= 0) return;
      if (aim && st.job !== 'home') {
        const k = Math.min(1, dt * 7); st.ax += (aim[0] - st.ax) * k; st.ay += (aim[1] - st.ay) * k; st.az += (aim[2] - st.az) * k;
        const j = 1.15, tt = W.t;
        c.ax = st.ax + Math.sin(tt * 2.1 + st.ph) * j; c.ay = st.ay + Math.sin(tt * 2.9 + st.ph * 2) * j * 0.5; c.az = st.az + Math.cos(tt * 1.7 + st.ph) * j;
        c.fire = hyp(st.ax - aim[0], st.az - aim[2]) < 2.2 && hyp(aim[0] - p.x, aim[2] - p.z) < p.def.gun.range;
      } else { const fx = mm > 0.1 ? mx : Math.sin(p.yaw), fz = mm > 0.1 ? mz : Math.cos(p.yaw); st.ax = p.x + fx * 12; st.ay = 1.5; st.az = p.z + fz * 12; c.ax = st.ax; c.ay = st.ay; c.az = st.az; c.fire = false; }
    }
  };
}

function play(diff, mode, L, seed) {
  const heroPick = seed % LL.HEROES.length;
  const W = S.newWorld({ heroPick: heroPick, difficulty: diff, seed: seed * 7 + diff, mode: mode, auto: false });
  const pol = policy(W, L, seed), p = W.player, o = { deaths: 0, by: {}, rLost: 0, hLost: 0, firstR: -1, firstH: -1, lastDown: 0, gap: 0, moods: 0, folds: 0, ness: 0, thefts: 0, chomps: 0, floods: 0 };
  while (!W.over && W.t < 1500) {
    pol.step(1 / 40); S.step(1 / 40);
    for (const e of W.fx) {
      if (e.k === 'herokill' && e.victim === p) { o.deaths++; const s = e.src, k = !s ? 'fountain' : s.kind === 'trooper' ? (s.big ? 'hollow' : 'trooper') : s.struct ? 'tower' : s.kind === 'ness' || (s.owner && s.owner.kind === 'ness') ? 'ness' : s.owner && s.owner.struct ? 'tower' : (s.kind || 'other'); o.by[k] = (o.by[k] || 0) + 1; }
      else if (e.k === 'structdown') { if (e.u.team === 0) { o.rLost++; if (o.firstR < 0) o.firstR = W.t; } else { o.hLost++; if (o.firstH < 0) o.firstH = W.t; } o.gap = Math.max(o.gap, W.t - o.lastDown); o.lastDown = W.t; }
      else if (e.k === 'fold' && e.p) o.folds++;
      else if (e.k === 'nessdown' && e.team === 0) o.ness++;
      else if (e.k === 'theft' || e.k === 'snuff') o.thefts++;
      else if (e.k === 'nesschomp' && e.p) o.chomps++;
      else if (e.k === 'floodwarn') o.floods++;
    }
    W.fx.length = 0;
  }
  o.gap = Math.max(o.gap, W.t - o.lastDown);
  o.t = W.t; o.win = W.winner === 0; o.moods = W.moodsSolved; o.hero = LL.HEROES[heroPick].id;
  if (W.stars) { o.stars = LL.STARS.filter(x => W.stars[x.id]).length; o.houses = !!W.stars.houses; o.starSet = LL.STARS.filter(x => W.stars[x.id]).map(x => ({ houses: 'H', mood: 'M', guard: 'T', ness: 'N', goals: 'G' })[x.id]).join(''); }
  o.how = o.win ? 'won' : (W.t >= 1200 ? 'gutter' : 'overrun');
  return o;
}

function jobs(a) {
  const out = []; for (const diff of a.diffs) for (const mode of a.modes) for (const L of a.lessons) for (let s = a.first; s < a.first + a.n; s++) out.push({ diff, mode, L, seed: s });
  return out;
}
const med = (xs) => { const s = xs.slice().sort((a, b) => a - b); return s.length ? s[s.length >> 1] : 0; };
const pct = (k, n) => (n ? Math.round(100 * k / n) : 0) + '%';
function report(a, res) {
  const D = ['Gentle', 'Even', 'Cruel'];
  for (const mode of a.modes) {
    console.log('\n' + (mode === 'match' ? 'LONG MATCH' : 'FIRST RAIN') + ', ' + a.n + ' seeds from ' + a.first + ' (scripted player; simulator output, not human play)');
    if (mode === 'match') console.log('diff    lessons  win   median  lost by gutter/overrun  structs lost R-H  player deaths (by)          longest quiet  folds moods ness');
    else console.log('diff    lessons  stars  3+    houses  structs lost R-H  player deaths  moods ness  star sets');
    for (const diff of a.diffs) for (const L of a.lessons) {
      const rs = res.filter(x => x.diff === diff && x.mode === mode && x.L === L).map(x => x.o), n = rs.length; if (!n) continue;
      const avg = (f) => (rs.reduce((s, x) => s + f(x), 0) / n);
      const by = {}; rs.forEach(x => { for (const k in x.by) by[k] = (by[k] || 0) + x.by[k]; });
      const byS = Object.keys(by).sort((p, q) => by[q] - by[p]).map(k => k + ' ' + (by[k] / n).toFixed(1)).join(', ');
      const name = L === '0' ? 'none' : L;
      if (mode === 'match') {
        const w = rs.filter(x => x.win).length;
        console.log(D[diff].padEnd(7), name.padEnd(8), pct(w, n).padStart(4), U.fmtTime(med(rs.map(x => x.t))).padStart(7), ('  ' + rs.filter(x => x.how === 'gutter').length + '/' + rs.filter(x => x.how === 'overrun').length).padEnd(24),
          (avg(x => x.rLost).toFixed(1) + '-' + avg(x => x.hLost).toFixed(1)).padEnd(17), (avg(x => x.deaths).toFixed(1) + ' (' + byS + ')').padEnd(28), U.fmtTime(med(rs.map(x => x.gap))).padStart(6) + '      ',
          avg(x => x.folds).toFixed(1).padStart(4), avg(x => x.moods).toFixed(1).padStart(5), avg(x => x.ness).toFixed(1).padStart(4));
      } else {
        const sets = {}; rs.forEach(x => { sets[x.starSet || '-'] = (sets[x.starSet || '-'] || 0) + 1; });
        console.log(D[diff].padEnd(7), name.padEnd(8), avg(x => x.stars || 0).toFixed(1).padStart(5), pct(rs.filter(x => x.stars >= 3).length, n).padStart(5), pct(rs.filter(x => x.houses).length, n).padStart(7),
          ('  ' + avg(x => x.rLost).toFixed(1) + '-' + avg(x => x.hLost).toFixed(1)).padEnd(19), avg(x => x.deaths).toFixed(1).padStart(13), avg(x => x.moods).toFixed(1).padStart(7), avg(x => x.ness).toFixed(1).padStart(5) + '  ',
          Object.keys(sets).sort((p, q) => sets[q] - sets[p]).slice(0, 4).map(k => k + ' ' + sets[k]).join(', '));
      }
    }
  }
  if (a.lines) for (const x of res) console.log([['G', 'E', 'C'][x.diff], x.mode, 'L' + x.L, 'seed', x.seed, x.o.hero, U.fmtTime(x.o.t), x.o.how, 'R-H', x.o.rLost + '-' + x.o.hLost, 'deaths', x.o.deaths, x.o.stars != null ? 'stars ' + x.o.stars + ' ' + x.o.starSet : ''].join(' '));
}

function args() {
  const v = process.argv.slice(2), a = { n: 8, first: 1, diffs: [0, 1, 2], modes: ['match', 'short'], lessons: ['0', '1', '12', '123', '1234', '12345'], lines: false, jobs: os.cpus().length };
  const pos = []; for (let i = 0; i < v.length; i++) {
    if (v[i] === '--mode') a.modes = [v[++i]]; else if (v[i] === '--diff') a.diffs = v[++i].split(',').map(Number);
    else if (v[i] === '--lessons') a.lessons = v[++i].split(','); else if (v[i] === '--lines') a.lines = true; else if (v[i] === '--jobs') a.jobs = +v[++i];
    else pos.push(v[i]);
  }
  if (pos[0]) a.n = +pos[0]; if (pos[1]) a.first = +pos[1];
  return a;
}
if (process.argv[2] === '--worker') {
  process.on('message', (list) => { const out = list.map(j => Object.assign(j, { o: play(j.diff, j.mode, j.L, j.seed) })); process.send(out); process.exit(0); });
} else if (require.main === module) {
  const a = args(), all = jobs(a), k = Math.max(1, Math.min(a.jobs, all.length)), res = []; let left = k;
  const t0 = Date.now();
  if (k === 1) { for (const j of all) res.push(Object.assign(j, { o: play(j.diff, j.mode, j.L, j.seed) })); report(a, res); }
  else for (let w = 0; w < k; w++) {
    const ch = cp.fork(__filename, ['--worker']);
    ch.on('message', (out) => { res.push(...out); if (--left === 0) { res.sort((p, q) => p.diff - q.diff || (p.mode < q.mode ? -1 : p.mode > q.mode ? 1 : 0) || (p.L < q.L ? -1 : p.L > q.L ? 1 : 0) || p.seed - q.seed); report(a, res); console.log('\n' + all.length + ' matches in ' + Math.round((Date.now() - t0) / 1000) + ' s'); } });
    ch.send(all.filter((_, i) => i % k === w));
  }
}
module.exports = { policy: policy, play: play };
