// Headless bot-versus-Hush soak. Run: node tools/soak.js [matches per difficulty] [first seed]
// core.js and sim.js have no DOM dependency, so whole matches run under Node.
// The sim is seeded (0.27, #27): the same arguments print the same lines every run, so two soaks can be diffed.
// Each line is one match: its seed, hero, length, result, structures still standing each side and a fingerprint of its whole event stream.
const path = require('path');
require(path.join(__dirname, '..', 'js', 'core.js'));
require(path.join(__dirname, '..', 'js', 'sim.js'));
const S = LL.sim, n = +process.argv[2] || 6, first = +process.argv[3] || 1;
const fnv = (h, s) => { for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0; return h; };
for (const diff of [0, 1, 2]) {
  let wins = 0; const out = [], name = ['Gentle', 'Even', 'Cruel'][diff];
  for (let k = first; k < first + n; k++) {
    const seed = k * 7 + diff, heroPick = k % LL.HEROES.length;
    const W = S.newWorld({ heroPick: heroPick, difficulty: diff, auto: true, seed: seed });
    let h = 2166136261, evs = 0;
    while (!W.over && W.t < 1500) {
      S.step(1 / 40);
      for (const e of W.fx) { h = fnv(h, e.k + (e.u && e.u.id != null ? e.u.id : '')); evs++; }
      W.fx.length = 0;
      for (const u of W.units) if (!isFinite(u.x + u.z + u.hp)) { console.error('NaN in', u.kind, 'seed', seed); process.exit(1); }
    }
    if (W.winner === 0) wins++;
    out.push(LL.U.fmtTime(W.t) + (W.winner === 0 ? 'W' : 'L'));
    console.log('  ' + name.padEnd(6), 'seed', String(seed).padStart(3), LL.HEROES[heroPick].id.padEnd(5), LL.U.fmtTime(W.t).padStart(5), W.winner === 0 ? 'W' : 'L',
      'standing', W.structs.filter(u => u.team === 0 && u.alive).length + '-' + W.structs.filter(u => u.team === 1 && u.alive).length, 'events', evs, 'fp', h.toString(16).padStart(8, '0'));
  }
  console.log(name, 'Reign wins', wins + '/' + n, out.join(' '));
}
