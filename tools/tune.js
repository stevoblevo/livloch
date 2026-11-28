/* Balance against the agreed target (docs/PLAN.md, "What the player should learn without being told"; docs/ROADMAP.md
   Phase 1, 0.20): Even winnable with two of the five lessons, Cruel only with four, Gentle by someone who knows none.

   Run:  node tools/tune.js [seeds] [first seed] [options]
         node tools/tune.js 12                 every difficulty, lessons known 0..5, the long match and First Rain
         node tools/tune.js 8 1 --mode match   only the long match (or --mode short for First Rain)
         node tools/tune.js 8 1 --diff 1       only Even (0 Gentle, 1 Even, 2 Cruel)
         node tools/tune.js 8 1 --lessons 0,2,135   which lesson sets to run: digits name the lessons, 0 none
         node tools/tune.js 8 1 --lines        also print one line per match
         node tools/tune.js 8 1 --jobs 1       how many worker processes (default: one per CPU)
         node tools/tune.js 8 1 --c SLACK.mul=1.5,FOLD_T=30   try numbers in C (core.js) without editing it; --set does C.DIFF

   WHAT IT IS. A scripted player for the human's hero, not a bot: the player's hero runs with useAI off, exactly as in a
   person's match (so the two teammates are the usual bots with their human-match handicap, botMul 0.78, and take the
   other two threads), and the policy below drives it only through hero.ctl and the public actions a person has
   (S.setLens, S.fold, S.echo, S.buy). Its aim is a bot's aim with a little more wobble. What changes between rows is
   only which of the five lessons it acts on. The sim is seeded (0.27, #27) and the policy draws from its own
   LL.rng, never W.rng, so every line is reproducible and the policy itself does not move the model's draws.

   THE FIVE LESSONS, as behaviours (the order they should be found; "lessons known k" in the table is the first k):
     0 none   Keeps the middle thread and walks up behind its own troopers (every level steps back out of a Hush
              building's reach when none of its troopers is under it); shoots whatever is nearest in range; casts whatever is ready
              at whatever it is shooting; buys its hero's build every half minute; fights on to 12% health before
              walking home; runs to any other thread whose house is being hit. Never rides a thread, never shoots an
              orb, never changes the view, never hunts, never dodges the Ness.
     1 Equal force cancels; break the symmetry. Keeps the middle thread (the patron's) and stands
              closer behind the wave; shoots its own soul orbs to secure them; hollows and buildings first among targets;
              Echo in a fight; fishes the Ness from outside its reach when the lane is quiet, for the Greatness, and jumps
              its bite.
     2 The world keeps time. Hunts the small ones (thieves) within 45 m (20 m while its thread is busy) before they reach the Hush third
              of the valley; walks to ripe little fruit within 30 m between waves; presses the building with its troopers while its thread's hollow is down; falls back
              to its own house during a full red rain.
     3 Looking is an action. Answers the mood with the right view about five seconds after the warning; wears
              Rainwake through the rain; fetches a ripe big fruit within 55 m through its view, then back to snow.
     4 Distance is not fixed. Rides threads (to the front, where a long ride lands as an arrival, and home to heal);
              kills the west stray when its crease is guarded and folds the next thread into its own, which shuts that
              thread to the Hush for 45 s; the Ness crease too once the Ness is down. Keeps the crease for the red rain
              when one is less than two minutes off, and folds 15 s into it, when the rain's hollows are on their way.
     5 You cannot keep everything lit. Stops running to every house under attack: leaves its thread only for an inner
              house or the patron. When a thread goes slack it leaves its own thread dark, rides the slack thread to
              the far side's open house and takes it. A light from home (it still walks home only at 12%) goes to the
              house that needs it most, not the first one passed.
              (0.28: until 0.28 lesson 5 also walked home at 35%. Going home early, or by choice when its thread was
              quiet, and carrying every light out, measured at no gain or a loss at 40 seeds on Cruel, even with the
              light worth half a house: time off the thread costs more than a mended house returns. See
              docs/evidence/play-0.28-notes.txt.)

   Letters after the digits switch one habit off (or, in capitals, an experiment on), to measure it alone: s no ride to
   the slack thread's open house, h a light goes to the first house passed, n the crease is not kept for the rain,
   a no arrivals; F keeps the crease for the slack thread and folds its own thread into it, R gives up the slack
   house when its own is in danger, v runs to guardian fires as lessons 0 to 4 do. The 0.27 letters are in the code.

   WHAT IT MEASURES. Per difficulty and lessons known: the long match's win rate, median length, how losses came (by the
   gutter after 20:00, or overrun), structures lost each side, the player's deaths and what killed it, the longest
   stretch with no building falling and when the first one fell; arrivals landed, lights carried into houses and small
   Hush caught by a fold; First Rain's mean stars, how often every house stood, and how often 3+ stars.
   WHAT IT CANNOT. It is a policy, not a person: it never misreads the screen, never panics, never discovers a lesson
   halfway. Read the rows as the slope between lessons, not as what a person will feel. Simulator output only. */
const path = require('path'), cp = require('child_process'), os = require('os');
require(path.join(__dirname, '..', 'js', 'core.js')); require(path.join(__dirname, '..', 'js', 'sim.js'));
const S = LL.sim, C = LL.C, U = LL.U, lanes = LL.lanes, hyp = Math.hypot, NESS = S.NESS;
const P = { x: 0, z: 0, dx: 0, dz: 0 }, Q = { s: 0, d: 0 };

function policy(W, L, seed) {
  const has = (k) => L.indexOf(String(k)) >= 0, r = LL.rng(seed * 7919 + (has('q') ? 14 : 13)), p = W.player;
  const st = { thinkT: 0, lane: 1, laneT: 0, pick: 0, buyT: 10, retreat: false, ax: p.x, ay: 1.5, az: p.z + 20, tgt: null, gx: p.x, gz: p.z,
    lat: (r() * 2 - 1) * 2.5, strafe: r() * 9, ph: r() * 6, hp: {}, hurtAt: {}, covered: {}, moodAt: -1, fold: -1, orb: null, back: false, wantLens: null, zipOn: false, fetch: false, fetchAt: 40, fetchT0: 0, had: false, keep: null, busyAt: -9 };
  const en = 1, rel = S.rel;
  function enemyNext(l) { const s = W.st[en][l]; return s.outer.alive ? s.outer : (s.inner.alive ? s.inner : W.patron[en]); }
  function think() {
    const c = p.ctl, hpF = p.hp / p.maxHp, wasFold = st.fold; st.fold = -1;
    st.covered = {}; for (const b of W.structs) if (b.team === 1 && b.alive) { for (const u of W.troopers) if (u.alive && u.team === 0 && hyp(u.x - b.x, u.z - b.z) < b.range - 2) { st.covered[b.id] = true; break; } }
    for (const s of W.structs) if (s.team === 0) { if (st.hp[s.id] != null && s.hp < st.hp[s.id] - 1) st.hurtAt[s.id] = W.t; st.hp[s.id] = s.hp; }
    if ((st.buyT -= 0.2) <= 0) { st.buyT = 30; const b = p.def.build; for (let i = 0; i < b.length; i++) if (p.items.indexOf(b[i]) < 0) { if (p.souls >= LL.ITEMS[b[i]].cost) S.buy(p, b[i]); break; } }
    // retreat
    const low = 0.12;
    if (st.retreat) { if (hpF > 0.9) st.retreat = false; } else if (hpF < low) st.retreat = true;
    // lesson 5 (0.29): home is somewhere to go by choice. Before a red rain, and when a thread is about to go slack, it rides home for a light and keeps one house with it
    const K = W.slack, slackOn = K.t > 0, slackSoon = K.warned || slackOn;
    { const rainDue = has('I') && W.red <= 0 && W.redNext - W.t < 14 && !W.short, tideDue = has('U') && K.warned && C.dif(W).slackHollows > 0 && W.st[0][K.lane].inner.alive;
      const tw0 = enemyNext(st.pick); let near0 = 0; for (const u of W.troopers) if (u.alive && u.team === 1 && hyp(u.x - p.x, u.z - p.z) < 35) near0 += u.big ? 3 : 1;
      const siegeDue = !has('z') && (tw0.kind !== 'patron' || !has('P')) && (tw0.kind === 'patron' || !has('Q')) && S.vuln(tw0) && !(tw0.blindT > 0) && !S.slack(tw0) && near0 < 4 && !(W.red > 0 && !W.thin) && !slackOn && W.t - st.busyAt > 1.5;
      if (st.had && !p.ember) { st.keep = null; st.fetchAt = W.t + 15; } st.had = !!p.ember;
      if (st.fetch) { if (p.ember || st.retreat || W.t > st.fetchT0 + 30) st.fetch = false; }
      else if (has(5) && has('G') && C.EMBER.wait < 100 && !p.ember && !st.retreat && hpF > 0.5 && W.t > st.fetchAt && (rainDue || tideDue || siegeDue)) { st.fetch = true; st.fetchT0 = W.t; st.fetchAt = W.t + 40; st.keep = rainDue ? 'rain' : tideDue ? 'tide' : 'siege'; } }
    // views (lesson 3)
    const m = W.mood;
    if (has(3)) {
      if (m && !m.done) { if (st.moodAt < 0) st.moodAt = W.t + 5; if (W.t >= st.moodAt && !has('m')) S.setLens(m.lens); }
      else { st.moodAt = -1; if (W.red > 0 && !has('r')) S.setLens('rain'); else if (!st.wantLens) S.setLens('snow'); }
    }
    // lane
    st.laneT -= 0.2;
    if (st.laneT <= 0) {
      st.laneT = 40;
      if (has('l')) { let bl = 1, bv = 1e9; for (let l = 0; l < 3; l++) { const e = enemyNext(l), v = e.hp / e.maxHp + (e.kind === 'guardian' ? 0 : e.kind === 'warden' ? 1 : 2); if (v < bv) { bv = v; bl = l; } } st.pick = bl; }
      else st.pick = 1;
      if (W.t > 600 && has(1) && has('j')) { const b = W.heroes.find(h => h !== p && h.alive); if (b) st.pick = b.ai.lane; }
    }
    st.lane = st.pick;
    for (const k of W.creases) if (k.t > 0 && k.team === 0 && k.from === st.lane) st.lane = k.to; // whoever folds its own thread away goes with its troopers
    // lesson 5: a slack thread carries to the far side's open house. It leaves its own thread dark for fifty seconds and takes that house
    let raid = null;
    if (has(5) && has('S') && slackOn && hpF > 0.35) { const e = enemyNext(K.lane); const mine = W.st[0][st.pick], mh = mine.outer.alive ? mine.outer : mine.inner, risk = has('R') && K.lane !== st.pick && st.lane === st.pick && mh.alive && (mh.hp < mh.maxHp * 0.5 || W.troopers.some(u => u.alive && u.team === 1 && u.big && u.lane === st.pick && hyp(u.x - mh.x, u.z - mh.z) < 30)); if (S.slack(e) && S.vuln(e) && !risk) { st.lane = K.lane; raid = e; } }
    let fire = null; // a house of ours being hit
    for (const s of W.structs) if (s.team === 0 && s.alive && st.hurtAt[s.id] > W.t - 2) { if (!has(5) || has('v') || s.kind !== 'guardian') { if (!fire || s.kind !== 'guardian') fire = s; } }
    if (fire && fire.lane !== st.lane && !raid) st.lane = fire.lane;
    // lesson 5: a light from home goes to the house that needs it most, and the hero's thread waits
    let mend = null;
    let siege = null; if (false && p.ember && (st.keep === 'siege' || !st.keep) && !st.retreat && hpF > 0.4) { const e = enemyNext(st.pick); if (S.vuln(e) && !(e.blindT > 0) && !S.slack(e)) siege = e; }
    if (has(5) && !has('h') && p.ember && !st.retreat && !siege) { let bv = 0; for (const s of W.structs) { if (s.team !== 0 || !s.alive || s.kind === 'patron' || !S.vuln(s) || !(s.dark || s.hp <= s.maxHp * C.EMBER.under)) continue; let hol = 0; for (const u of W.troopers) if (u.alive && u.team === 1 && u.big && u.lane === s.lane && hyp(u.x - s.x, u.z - s.z) < 60) hol++; const v = (1 - s.hp / s.maxHp) + (s.dark ? 0.5 : 0) + (st.hurtAt[s.id] > W.t - 6 ? 0.5 : 0) + hol * 0.6 + (s.lane === st.pick ? 0.15 : 0) + (s.brightT > 0 ? -3 : 0) + (st.keep === 'tide' && s.lane === K.lane ? 4 : 0) + (st.keep === 'rain' && s.lane === st.pick ? 2 : 0) + (st.keep && s.kind === 'guardian' ? 0.3 : 0); if (v > bv) { bv = v; mend = s; } } if (mend) { st.lane = mend.lane; raid = null; } }
    const lane = st.lane, Ln = lanes[lane];
    LL.laneNearest(lane, p.x, p.z, Q); const myS = rel(0, lane, Q.s), onLane = Q.d < 6;
    // where to stand
    let standS = W.front[0][lane] - (has(1) && !has('w') ? 3 : 6);
    const tw = enemyNext(lane), twS = tw === W.patron[en] ? Ln.len + 6 : rel(0, lane, tw.s);
    let pushing = false; for (const u of W.troopers) if (u.alive && u.team === 0 && hyp(u.x - tw.x, u.z - tw.z) < tw.range - 2) { pushing = true; break; }
    const window = has(2) && !has('k') && W.hollowT[lane] > 0 && pushing;
    standS = Math.min(standS, pushing ? twS - (window ? 10 : 15) : twS - tw.range + 3);
    if ((raid || (has(2) && !has('k'))) && S.slack(tw) && S.vuln(tw) && hpF > 0.35) standS = twS - 14;
    if (raid && !onLane && standS - myS > 50 && S.zipEnd(0, lane) - myS > 30) { LL.lanePoint(lane, Q.s, P); st.join = true; } else st.join = false; // lesson 4: get onto the slack thread first, then ride it // lesson 2: a slack house cannot fire; this is the moment to stand under it
    if (has(2) && !has('k') && W.red > 0 && !W.thin) { const g = W.st[0][lane]; const own = g.outer.alive ? g.outer : g.inner; if (own.alive) standS = Math.min(standS, rel(0, lane, own.s) + 4); }
    standS = U.clamp(standS, 8, Ln.len - 16);
    if (!st.join) LL.lanePoint(lane, rel(0, lane, standS), P); let gx = P.x - P.dz * (st.join ? 0 : st.lat), gz = P.z + P.dx * (st.join ? 0 : st.lat), job = 'lane'; const laneX = gx, laneZ = gz;
    // errands, in order of what a lesson says matters
    const free = !st.retreat && hpF > 0.45;
    let near = 0; for (const u of W.troopers) if (u.alive && u.team === 1 && hyp(u.x - p.x, u.z - p.z) < 35) near += u.big ? 3 : 1;
    const quiet = near < 3; // lesson 2's errands wait for a quiet thread: the time to fetch is between waves
    if (has(2) && !has('t') && !st.retreat) { let bt = null, bd = quiet ? 45 : 20; for (const t of W.thieves) if (t.alive && t.z < 40) { const d = hyp(t.x - p.x, t.z - p.z); if (d < bd) { bd = d; bt = t; } } if (bt) { gx = bt.x; gz = bt.z; job = 'thief'; st.tgt = bt; } }
    st.wantLens = null;
    if (job === 'lane' && free && has(3) && !has('b') && !(m && !m.done) && !(W.red > 0)) { for (const f of W.fruit) if (f.ripe && f.lens && hyp(f.x - p.x, f.z - p.z) < 55) { st.wantLens = f.lens; S.setLens(f.lens); gx = f.x; gz = f.z; job = 'fruit'; break; } }
    if (job === 'lane' && !st.retreat && quiet && has(2) && !has('f')) { for (const f of W.fruit) if (f.ripe && !f.lens && hyp(f.x - p.x, f.z - p.z) < 30 && (f.k !== 'hips' || hpF < 0.8)) { gx = f.x; gz = f.z; job = 'fruit'; break; } }
    if (job === 'lane' && free && has(4)) {
      // lesson 4: the fold. The next thread into its own, which shuts that thread to the Hush; kept for the rain when one is near, and folded once the rain's hollows are on their way
      const home = st.pick;
      for (let i = 0; i < W.creases.length; i++) {
        const k = W.creases[i]; if (k.t > 0 || k.cd > 0 || (home !== k.a && home !== k.b)) continue;
        let from = home === k.b ? k.a : k.b, to = home; const sv = has(5) && has('F') && !W.short && !W.fray; if (sv && slackSoon && K.lane === from) { from = home; to = K.lane; } const own = W.st[0][from], ownS = own.outer.alive ? own.outer : own.inner;
        if (W.troopers.some(u => u.alive && u.team === 1 && u.big && u.lane === from && u.z <= -13) || !ownS.alive || ownS.hp < ownS.maxHp * 0.4) continue;
        if (k.guard.alive) { if (i === 0 && hyp(k.x - p.x, k.z - p.z) < 60 && W.t > 40) { gx = k.guard.x; gz = k.guard.z; job = 'stray'; st.tgt = k.guard; } continue; }
        if (sv ? (!slackOn && K.next - W.t < 110 && !(slackSoon && from !== home)) : (!has('n') && !W.fallen && !W.short && (W.red <= 0 ? W.redNext - W.t < 110 : W.red > C.RED_T - 15))) continue;
        gx = k.x; gz = k.z; job = 'fold';
        if (S.creaseFor(p) === i) { const side = C.LANE_X[to] - k.x; c.ax = p.x + Math.sign(side || 1) * 10; c.az = p.z; c.ay = 1.5; if (wasFold === i) S.fold(p, i); else st.fold = i; }
        break;
      }
    }
    const ns = W.ness;
    if (job === 'lane' && free && has(1) && !has('y') && ns.alive && ns.rise >= 1 && hpF > 0.6 && Math.abs(lane - 2) <= 1) {
      let busy = false; for (const u of W.troopers) if (u.alive && u.team === 1 && u.big && hyp(u.x - p.x, u.z - p.z) < 25) busy = true;
      if (!busy) { gx = ns.out ? ns.x - 14 : C.LOCH.x; gz = ns.out ? ns.z - 14 : C.LOCH.z - (NESS.REACH + 3.5); job = 'ness'; }
    }
    if (raid && job !== 'fold') { gx = laneX; gz = laneZ; job = 'lane'; st.wantLens = null; } // the open house comes before every errand
    if (mend && job !== 'thief' && !raid) { LL.lanePoint(lane, Math.max(4, mend.s - 5), P); gx = P.x; gz = P.z; job = 'mend'; }
    if (siege) { LL.lanePoint(lane, rel(0, lane, twS - 7), P); gx = P.x; gz = P.z; job = 'siege'; }
    if (st.retreat || (st.fetch && !raid)) { gx = p.x >= 0 ? 8 : -8; gz = -C.SPAWN_Z + 8; job = 'home'; } // 0.29: a point in the fountain beside the patron, not behind it (until 0.29 a rider coming home down the middle thread walked into its own patron and stood there)
    // lesson 4: a long way is ridden. Off its thread and far from where it is going, it walks to the nearest thread first
    st.via = -1;
    if (has(4) && !p.zip && (job === 'home' || job === 'mend' || job === 'siege') && S.canZip(p) < 0) { const far = job === 'home' ? p.z > -70 : ((job === 'siege' ? twS - 7 : mend.s) - myS > 40 && hyp(gx - p.x, gz - p.z) > 45); if (far) { const nl = job === 'home' ? LL.nearestLane(p.x, p.z) : lane; LL.laneNearest(nl, p.x, p.z, Q); if (Q.d > 5) { LL.lanePoint(nl, Math.max(Q.s, 4), P); gx = P.x; gz = P.z; st.via = nl; } } }
    if (job === 'fold' || job === 'stray' || job === 'thief') st.busyAt = W.t;
    st.gx = gx; st.gz = gz; st.job = job;
    // threads (lesson 4)
    if (has(4)) {
      if (p.zip) { const ts = rel(0, p.zip.lane, p.zip.s);
        if (job === 'mend') { if (p.zip.dir < 0 || p.zip.lane !== lane || ts >= mend.s - 8) c.zip = true; }
        else if (job === 'siege') { if (p.zip.dir < 0 || p.zip.lane !== lane || ts >= twS - 10) c.zip = true; }
        else if (job === 'home' ? p.zip.dir > 0 : job !== 'lane') c.zip = true;
        else if (job === 'lane') { // an arrival: a long ride lets go among the small Hush, not behind its own troopers
          let among = 0; if (ts - p.zip.s0 >= C.ARRIVE.min && !has('a')) for (const u of W.troopers) if (u.alive && u.team === 1 && !u.big && hyp(u.x - p.x, u.z - p.z) < C.ARRIVE.r - 1) among++;
          const far = raid ? standS - 2 : ts - p.zip.s0 >= C.ARRIVE.min - 6 && !has('a') ? W.front[0][lane] + 4 : standS - 5;
          if (p.zip.dir < 0 || p.zip.lane !== lane || (among >= 2 && !raid) || ts >= far) c.zip = true; }
      }
      else if (job === 'mend') { if (onLane && S.canZip(p) === lane && mend.s - myS > 40) { c.zip = true; c.zipDir = 1; } }
      else if (job === 'siege') { if (onLane && S.canZip(p) === lane && twS - myS > 40 && S.zipEnd(0, lane) - myS > 25) { c.zip = true; c.zipDir = 1; } }
      else if (job === 'home') { const zl = S.canZip(p); if (zl >= 0) { LL.laneNearest(zl, p.x, p.z, Q); if (Q.s > 30) { c.zip = true; c.zipDir = -1; } } }
      else if (onLane && S.canZip(p) === lane) { if (job === 'lane' && standS - myS > 40 && S.zipEnd(0, lane) - myS > 25) { c.zip = true; c.zipDir = 1; } }
    }
    // target
    if (job !== 'thief' && job !== 'stray') {
      const range = p.def.gun.range * 0.92; let best = null, bs = -1e9;
      for (const u of W.units) {
        if (!u.alive || u.team !== en) continue; const d = hyp(u.x - p.x, u.z - p.z) - u.r; if (d > range) continue;
        if (u.struct && (!S.vuln(u) || (!u.pressed && !W.fray && !S.slack(u)))) continue;
        if (!(u.kind === 'trooper' || u.kind === 'thief' || u.struct)) continue;
        let sc = -d;
        if (has(1) && !has('p')) sc += u.big ? 40 : u.struct ? ((has(2) || raid) && S.slack(u) ? 60 : 25) : u.kind === 'thief' ? 50 : (1 - u.hp / u.maxHp) * 15;
        if (sc > bs) { bs = sc; best = u; }
      }
      if (!best && ns.alive && (job === 'ness' || (ns.out && hyp(ns.x - p.x, ns.z - p.z) < range) || (ns.hp < ns.maxHp * 0.98 && hyp(ns.x - p.x, ns.z - p.z) < range && has(1)))) best = ns;
      if (job === 'ness' && ns.alive && hyp(ns.x - p.x, ns.z - p.z) < range) best = ns;
      st.tgt = best;
    }
    st.orb = null;
    if (has(1) && !has('o') && W.orbs.length) for (const o of W.orbs) if (!o.dead && o.team === 0 && o.t < 2.2 && hyp(o.x - p.x, o.z - p.z) < 26 && !(st.tgt && st.tgt.big && hyp(st.tgt.x - p.x, st.tgt.z - p.z) < 10)) { st.orb = o; break; }
    if (has(1) && !has('e') && S.echoReady() && st.tgt && (st.tgt.big || st.tgt.struct || st.tgt.kind === 'ness') && W.t - p.lastShotT < 0.5) S.echo();
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
      const ch = W.ness.alive && W.ness.chomp; // lesson 1 fishes the Ness, so it has learned its tell: jump over the bite
      if (has(1) && ch && ch.ph === 'tell' && p.onGround && ch.t <= 0.3 && ch.t > 0.12 && hyp(p.x - ch.tx, p.z - ch.tz) < NESS.BITE_R + 2.5) c.jump = true;
      st.thinkT -= dt; if (st.thinkT <= 0) { st.thinkT = 0.2; think(); }
      if (st.tgt && !st.tgt.alive) st.tgt = null;
      st.strafe += dt;
      const dx = st.gx - p.x, dz = st.gz - p.z, d = hyp(dx, dz); let mx = 0, mz = 0; if (d > 1.2) { mx = dx / d; mz = dz / d; }
      const t = st.tgt;
      if (t && st.job !== 'home') { const tx = t.x - p.x, tz = t.z - p.z, tdd = hyp(tx, tz) || 1, sg = Math.sin(st.strafe * 1.5 + st.ph) > 0 ? 1 : -1; mx += -tz / tdd * 0.6 * sg; mz += tx / tdd * 0.6 * sg; if (t.big && tdd < 9) { mx -= tx / tdd * 0.8; mz -= tz / tdd * 0.8; } }
      const ns = W.ness; if (ns.alive && ns.rise >= 0.5 && !p.zip) { const kx = p.x - ns.x, kz = p.z - ns.z, kd = hyp(kx, kz), keep = ns.out ? 12 : NESS.REACH + 1; if (kd < keep && kd > 0.01 && (st.job === 'ness' || st.job === 'fold')) { mx += kx / kd * 1.2; mz += kz / kd * 1.2; } }
      for (const b of W.structs) { // every level has learned that a Hush building shoots whoever stands under it alone
        if (b.team !== 1 || !b.alive || b.dark || S.slack(b) || st.covered[b.id] || st.job === 'siege') continue; const kx = p.x - b.x, kz = p.z - b.z, kd = hyp(kx, kz);
        if (kd < b.range + 1.5 && kd > 0.01) { mx += kx / kd * 1.5; mz += kz / kd * 1.5; } }
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
  const pol = policy(W, L, seed), p = W.player, o = { deaths: 0, by: {}, rLost: 0, hLost: 0, firstR: -1, firstH: -1, lastDown: 0, gap: 0, moods: 0, folds: 0, ness: 0, thefts: 0, chomps: 0, floods: 0, falls: [], gapAt: 0, arrivals: 0, mends: 0, caught: 0, blinds: 0 };
  while (!W.over && W.t < 1500) {
    pol.step(1 / 40); S.step(1 / 40);
    for (const e of W.fx) {
      if (e.k === 'herokill' && e.victim === p) { o.deaths++; const s = e.src, k = !s ? 'fountain' : s.kind === 'trooper' ? (s.big ? 'hollow' : 'trooper') : s.struct ? 'tower' : s.kind === 'ness' || (s.owner && s.owner.kind === 'ness') ? 'ness' : s.owner && s.owner.struct ? 'tower' : (s.kind || 'other'); o.by[k] = (o.by[k] || 0) + 1; }
      else if (e.k === 'structdown') { if (e.u.team === 0) { o.rLost++; if (o.firstR < 0) o.firstR = W.t; } else { o.hLost++; if (o.firstH < 0) o.firstH = W.t; } o.falls.push((e.u.team === 0 ? 'R' : 'H') + Math.round(W.t) + (e.u.kind === 'patron' ? 'p' : 'wme'[e.u.lane])); if (W.t - o.lastDown > o.gap) { o.gap = W.t - o.lastDown; o.gapAt = o.lastDown; } o.lastDown = W.t; }
      else if (e.k === 'fold' && e.p) o.folds++;
      else if (e.k === 'nessdown' && e.team === 0) o.ness++;
      else if (e.k === 'theft' || e.k === 'snuff') o.thefts++;
      else if (e.k === 'nesschomp' && e.p) o.chomps++;
      else if (e.k === 'floodwarn') o.floods++;
      else if (e.k === 'arrive' && e.p && e.n) o.arrivals++;
      else if (e.k === 'mended' && e.p) o.mends++;
      else if (e.k === 'caught') o.caught++;
      else if (e.k === 'blinded' && e.p) o.blinds++;
      if (process.env.DBG && (((e.k === 'ember' || e.k === 'mended' || e.k === 'blinded') && e.p) || e.k === 'slackwarn' || e.k === 'slack' || e.k === 'slackend' || e.k === 'red' || e.k === 'redwarn' || e.k === 'structdown')) console.log(U.fmtTime(W.t), e.k, e.s ? e.s.kind + e.s.lane : '', e.lane != null ? 'lane' + e.lane : '', e.u && e.u.struct ? e.u.kind + e.u.lane + 't' + e.u.team : '', e.fell != null ? 'fell' + e.fell : '');
    }
    W.fx.length = 0;
  }
  if (W.t - o.lastDown > o.gap) { o.gap = W.t - o.lastDown; o.gapAt = o.lastDown; }
  o.t = W.t; o.win = W.winner === 0; o.moods = W.moodsSolved; o.hero = LL.HEROES[heroPick].id;
  if (W.stars) { o.stars = LL.STARS.filter(x => W.stars[x.id]).length; o.houses = !!W.stars.houses; o.starSet = LL.STARS.filter(x => W.stars[x.id]).map(x => ({ houses: 'H', mood: 'M', guard: 'T', ness: 'N', goals: 'G' })[x.id]).join(''); }
  o.how = o.win ? 'won' : (W.t >= 1200 ? 'gutter' : 'overrun');
  return o;
}

/* --set row.key=value,...: try numbers in C.DIFF without editing core.js. row is 0, 1, 2 or * for every row. */
function apply(set, cset) {
  if (cset) for (const kv of cset.split(',')) { const m = /^(\w+)(?:\.(\w+))?=(-?[\d.]+)$/.exec(kv); if (!m || !(m[1] in C) || (m[2] && !(m[2] in C[m[1]]))) throw new Error('bad --c ' + kv); if (m[2]) C[m[1]][m[2]] = +m[3]; else C[m[1]] = +m[3]; }
  if (!set) return; for (const kv of set.split(',')) { const m = /^([0-2*])\.(\w+)=(-?[\d.]+)$/.exec(kv); if (!m) throw new Error('bad --set ' + kv);
    for (let d = 0; d < 3; d++) if (m[1] === '*' || +m[1] === d) { if (!(m[2] in C.DIFF[d])) throw new Error('no C.DIFF key ' + m[2]); C.DIFF[d][m[2]] = +m[3]; } }
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
    if (mode === 'match') console.log('diff    lessons  win   margin  median  lost by gutter/overrun  structs lost R-H  player deaths (by)          longest quiet  first fall  folds moods ness  arrivals lights caught blinded');
    else console.log('diff    lessons  stars  3+    houses  structs lost R-H  player deaths  moods ness  star sets');
    for (const diff of a.diffs) for (const L of a.lessons) {
      const rs = res.filter(x => x.diff === diff && x.mode === mode && x.L === L).map(x => x.o), n = rs.length; if (!n) continue;
      const avg = (f) => (rs.reduce((s, x) => s + f(x), 0) / n);
      const by = {}; rs.forEach(x => { for (const k in x.by) by[k] = (by[k] || 0) + x.by[k]; });
      const byS = Object.keys(by).sort((p, q) => by[q] - by[p]).map(k => k + ' ' + (by[k] / n).toFixed(1)).join(', ');
      const name = L === '0' ? 'none' : L;
      if (mode === 'match') {
        const w = rs.filter(x => x.win).length;
        console.log(D[diff].padEnd(7), name.padEnd(8), pct(w, n).padStart(4), avg(x => x.hLost - x.rLost).toFixed(1).padStart(7), U.fmtTime(med(rs.map(x => x.t))).padStart(7), ('  ' + rs.filter(x => x.how === 'gutter').length + '/' + rs.filter(x => x.how === 'overrun').length).padEnd(24),
          (avg(x => x.rLost).toFixed(1) + '-' + avg(x => x.hLost).toFixed(1)).padEnd(17), (avg(x => x.deaths).toFixed(1) + ' (' + byS + ')').padEnd(28), U.fmtTime(med(rs.map(x => x.gap))).padStart(6) + '      ', U.fmtTime(med(rs.map(x => Math.min(x.firstR < 0 ? 1e9 : x.firstR, x.firstH < 0 ? 1e9 : x.firstH)))).padStart(6) + '    ',
          avg(x => x.folds).toFixed(1).padStart(4), avg(x => x.moods).toFixed(1).padStart(5), avg(x => x.ness).toFixed(1).padStart(4), avg(x => x.arrivals).toFixed(1).padStart(8), avg(x => x.mends).toFixed(1).padStart(6), avg(x => x.caught).toFixed(0).padStart(6), avg(x => x.blinds).toFixed(1).padStart(7));
      } else {
        const sets = {}; rs.forEach(x => { sets[x.starSet || '-'] = (sets[x.starSet || '-'] || 0) + 1; });
        console.log(D[diff].padEnd(7), name.padEnd(8), avg(x => x.stars || 0).toFixed(1).padStart(5), pct(rs.filter(x => x.stars >= 3).length, n).padStart(5), pct(rs.filter(x => x.houses).length, n).padStart(7),
          ('  ' + avg(x => x.rLost).toFixed(1) + '-' + avg(x => x.hLost).toFixed(1)).padEnd(19), avg(x => x.deaths).toFixed(1).padStart(13), avg(x => x.moods).toFixed(1).padStart(7), avg(x => x.ness).toFixed(1).padStart(5) + '  ',
          Object.keys(sets).sort((p, q) => sets[q] - sets[p]).slice(0, 4).map(k => k + ' ' + sets[k]).join(', '));
      }
    }
  }
  if (a.lines) for (const x of res) console.log([['G', 'E', 'C'][x.diff], x.mode, 'L' + x.L, 'seed', x.seed, x.o.hero, U.fmtTime(x.o.t), x.o.how, 'R-H', x.o.rLost + '-' + x.o.hLost, 'deaths', x.o.deaths, 'falls', x.o.falls.join(' '), 'quiet', U.fmtTime(x.o.gap) + '@' + U.fmtTime(x.o.gapAt), 'floods', x.o.floods, 'chomps', x.o.chomps, 'ness', x.o.ness, x.o.stars != null ? 'stars ' + x.o.stars + ' ' + x.o.starSet : ''].join(' '));
}

function args() {
  const v = process.argv.slice(2), a = { n: 8, first: 1, diffs: [0, 1, 2], modes: ['match', 'short'], lessons: ['0', '1', '12', '123', '1234', '12345'], lines: false, jobs: os.cpus().length, set: '', c: '' };
  const pos = []; for (let i = 0; i < v.length; i++) {
    if (v[i] === '--mode') a.modes = [v[++i]]; else if (v[i] === '--diff') a.diffs = v[++i].split(',').map(Number);
    else if (v[i] === '--set') a.set = v[++i]; else if (v[i] === '--c') a.c = v[++i];
    else if (v[i] === '--lessons') a.lessons = v[++i].split(','); else if (v[i] === '--lines') a.lines = true; else if (v[i] === '--jobs') a.jobs = +v[++i];
    else pos.push(v[i]);
  }
  if (pos[0]) a.n = +pos[0]; if (pos[1]) a.first = +pos[1];
  return a;
}
if (process.argv[2] === '--worker') {
  process.on('message', (msg) => { const list = msg.list; apply(msg.set, msg.c); const out = list.map(j => Object.assign(j, { o: play(j.diff, j.mode, j.L, j.seed) })); process.send(out, () => process.exit(0)); }); // exit only once the results are sent: a large message is dropped by an early exit
} else if (require.main === module) {
  const a = args(), all = jobs(a), k = Math.max(1, Math.min(a.jobs, all.length)), res = []; let left = k;
  const t0 = Date.now();
  if (a.set) console.log('C.DIFF with --set ' + a.set); if (a.c) console.log('C with --c ' + a.c);
  if (k === 1) { apply(a.set, a.c); for (const j of all) res.push(Object.assign(j, { o: play(j.diff, j.mode, j.L, j.seed) })); report(a, res); }
  else for (let w = 0; w < k; w++) {
    const ch = cp.fork(__filename, ['--worker']);
    ch.on('exit', (code) => { if (code) { console.error('a worker failed, code ' + code); process.exit(1); } });
    ch.on('message', (out) => { res.push(...out); if (--left === 0) { res.sort((p, q) => p.diff - q.diff || (p.mode < q.mode ? -1 : p.mode > q.mode ? 1 : 0) || (p.L < q.L ? -1 : p.L > q.L ? 1 : 0) || p.seed - q.seed); report(a, res); console.log('\n' + all.length + ' matches in ' + Math.round((Date.now() - t0) / 1000) + ' s'); } });
    ch.send({ list: all.filter((_, i) => i % k === w), set: a.set, c: a.c });
  }
}
module.exports = { policy: policy, play: play };
