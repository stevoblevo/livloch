// Headless bot-versus-Hush soak. Run: node tools/soak.js [matches per difficulty]
// core.js and sim.js have no DOM dependency, so whole matches run under Node.
const path = require('path');
require(path.join(__dirname, '..', 'js', 'core.js'));
require(path.join(__dirname, '..', 'js', 'sim.js'));
const S = LL.sim, n = +process.argv[2] || 6;
for (const diff of [0, 1, 2]) {
  let wins = 0; const out = [];
  for (let seed = 1; seed <= n; seed++) {
    const W = S.newWorld({ heroPick: seed % 4, difficulty: diff, auto: true, seed: seed * 7 + diff });
    while (!W.over && W.t < 1500) {
      S.step(1 / 40); W.fx.length = 0;
      for (const u of W.units) if (!isFinite(u.x + u.z + u.hp)) { console.error('NaN in', u.kind); process.exit(1); }
    }
    if (W.winner === 0) wins++;
    out.push(LL.U.fmtTime(W.t) + (W.winner === 0 ? 'W' : 'L'));
  }
  console.log(['Gentle', 'Even', 'Cruel'][diff], 'Reign wins', wins + '/' + n, out.join(' '));
}
