// Red-rain experiments from handoff issue #3. Run: node tools/redrain.js [matches per cell]
// Bots only. The sim is seeded (0.27, #27), so a repeat run prints the same table; a gap between variants is real for these
// seeds, but a dozen matches is still a small sample.
const path = require('path');
require(path.join(__dirname, '..', 'js', 'core.js')); require(path.join(__dirname, '..', 'js', 'sim.js'));
const S = LL.sim, n = +process.argv[2] || 12;
const variants = { baseline: {}, 'stagger thieves': { stagger: 1 }, 'cap one blackout': { cap: 1 }, 'recovery window 20 s': { recover: 1 }, 'all three': { stagger: 1, cap: 1, recover: 1 } };
for (const diff of [1, 2]) {
  console.log('\n' + ['Gentle', 'Even', 'Cruel'][diff] + ', ' + n + ' bot matches per row');
  for (const name in variants) {
    let wins = 0, lossT = [], dark = 0, deaths = 0, lost1012 = 0;
    for (let seed = 1; seed <= n; seed++) {
      const W = S.newWorld({ heroPick: seed % LL.HEROES.length /* 0.25 rook: five heroes */, difficulty: diff, auto: true, seed: seed * 7 + diff, tune: variants[name] });
      while (!W.over && W.t < 1500) { S.step(1 / 40); for (const e of W.fx) { if (e.k === 'thiefhome' && e.carry) dark++; if (e.k === 'herokill') deaths++; if (e.k === 'structdown' && e.u.team === 0 && W.t >= 600 && W.t < 720) lost1012++; } W.fx.length = 0; }
      if (W.winner === 0) wins++; else lossT.push(W.t);
    }
    const avg = lossT.length ? LL.U.fmtTime(lossT.reduce((a, b) => a + b, 0) / lossT.length) : '-';
    console.log('  ' + name.padEnd(22) + ' Reign wins ' + String(wins).padStart(2) + '/' + n + ' | mean loss at ' + avg + ' | Reign structures lost 10:00-12:00 per match ' + (lost1012 / n).toFixed(2) + ' | lights carried home per match ' + (dark / n).toFixed(2) + ' | hero deaths per match ' + (deaths / n).toFixed(2));
  }
}
