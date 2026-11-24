// 0.25 rook: one Lantern Lift at 60 Hz, holding forward, with nothing else acting on him: off every thread, then along the
// Middle thread. Prints seconds in the air, top height, metres covered and when each lift event fired.
// Run: node tools/rookfly.js   (simulator numbers; they say nothing about how it feels)
const path = require('path'); require(path.join(__dirname, '..', 'js', 'core.js')); require(path.join(__dirname, '..', 'js', 'sim.js'));
const S = LL.sim, ROOK = LL.HEROES.findIndex(d => d.id === 'rook');
function go(name, x, z, mx, mz) {
  const W = S.newWorld({ heroPick: ROOK, auto: false, seed: 5, difficulty: 1 }), h = W.player; h.useAI = false; h.x = x; h.z = z; h.ctl.ax = x; h.ctl.az = z + 30; h.ctl.ab[1] = true;
  let air = 0, top = 0; const ev = [];
  for (let i = 0; i < 600; i++) { W.heroes.forEach(u => { u.hp = u.maxHp; }); h.ctl.mx = mx; h.ctl.mz = mz; S.step(1 / 60);
    for (const e of W.fx) if (e.u === h && /^(lift|liftthread|glide|liftland)$/.test(e.k)) ev.push(e.k + ' at ' + W.t.toFixed(2) + ' s, ' + h.y.toFixed(1) + ' m up'); W.fx.length = 0;
    top = Math.max(top, h.y); if (!h.onGround) air += 1 / 60; else if (i > 5) break; }
  console.log(name + ': ' + air.toFixed(2) + ' s in the air, top ' + top.toFixed(2) + ' m, ' + Math.hypot(h.x - x, h.z - z).toFixed(1) + ' m covered; ' + ev.join('; '));
}
go('off a thread', -24, 20, 0, 1); go('along the Middle thread', 0, -20, 0, 1); go('standing still', -24, 20, 0, 0);
