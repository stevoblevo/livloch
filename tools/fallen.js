// Ever Fallen soak: how long do bots hold, and how many lights come back? Run: node tools/fallen.js [matches]
// Bots never change the view, so they never thin a rain. A person should beat these times.
const path = require('path');
require(path.join(__dirname, '..', 'js', 'core.js')); require(path.join(__dirname, '..', 'js', 'sim.js'));
const S = LL.sim, n = +process.argv[2] || 6;
for (const diff of [0, 1, 2]) {
  const out = []; let sum = 0;
  for (let seed = 1; seed <= n; seed++) {
    const W = S.newWorld({ heroPick: seed % LL.HEROES.length /* 0.25 rook: five heroes */, difficulty: diff, mode: 'fallen', auto: true, seed: seed * 7 + diff });
    while (!W.over && W.t < 3600) { S.step(1 / 40); W.fx.length = 0; }
    sum += W.t; out.push(LL.U.fmtTime(W.t) + '/' + W.lights);
  }
  console.log(['Gentle', 'Even', 'Cruel'][diff], 'mean', LL.U.fmtTime(sum / n), ' time/lights:', out.join(' '));
}
