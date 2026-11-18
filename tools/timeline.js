// One bot match as a timeline. Run: node tools/timeline.js [difficulty 0-2] [seed]
// Simulator output only: all three Reign heroes are on autopilot. Not a human session.
const path = require('path');
require(path.join(__dirname, '..', 'js', 'core.js')); require(path.join(__dirname, '..', 'js', 'sim.js'));
const S = LL.sim, T = LL.U.fmtTime, diff = +(process.argv[2] || 1), seed = +(process.argv[3] || 3);
const W = S.newWorld({ heroPick: 0, difficulty: diff, auto: true, seed: seed });
const c = { theft: 0, snuff: 0, thiefdown: 0, thiefhome: 0, lastbreath: 0, fold: 0, nessdown: 0 }; let next = 30;
const log = (s) => console.log(T(W.t).padStart(5), s);
console.log('difficulty', ['Gentle', 'Even', 'Cruel'][diff], 'seed', seed, '(bots only)');
while (!W.over && W.t < 1500) {
  S.step(1 / 40);
  for (const e of W.fx) {
    if (e.k in c) c[e.k]++;
    if (e.k === 'redwarn') log('red rain warning'); else if (e.k === 'red') log('RED RAIN begins'); else if (e.k === 'redend') log('red rain ends');
    else if (e.k === 'structdown') log((e.u.team === 0 ? 'Reign' : 'Hush') + ' loses ' + e.u.kind + ' on thread ' + e.u.lane);
    else if (e.k === 'thiefhome' && e.carry) log('thief home with a light: ' + e.carry.kind + ' thread ' + e.carry.lane + ' dark 120 s');
    else if (e.k === 'herokill') log(e.victim.name + ' falls'); else if (e.k === 'lastbreath') log('Last Breath: ' + e.u.name);
    else if (e.k === 'nessdown') log('Ness killed, Greatness to team ' + e.team); else if (e.k === 'fold') log('fold used');
    else if (e.k === 'over') log('OVER: ' + (e.winner === 0 ? 'Reign wins' : 'Hush wins'));
  }
  W.fx.length = 0;
  if (W.t >= next) {
    next += 30; const rd = W.structs.filter(s => s.team === 0 && !s.alive).length, hd = W.structs.filter(s => s.team === 1 && !s.alive).length;
    log('  phase ' + (W.red > 0 ? 'RED ' : 'calm') + ' | structures lost R' + rd + ' H' + hd + ' | dark ' + W.structs.filter(s => s.dark && s.alive).length + ' | hollows ' + W.troopers.filter(u => u.alive && u.big).length +
      ' | thieves ' + W.thieves.filter(u => u.alive).length + ' | steals ' + (c.theft + c.snuff) + ' caught ' + c.thiefdown + ' home ' + c.thiefhome + ' | mercy ' + (W.mercy ? 'on' : 'off') + ' | player hp ' + Math.round(W.player.hp / W.player.maxHp * 100) + '% | last breaths ' + c.lastbreath);
  }
}
