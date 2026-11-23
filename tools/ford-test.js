const assert=require('node:assert/strict');
const {test}=require('node:test');
require('../js/core');require('../js/sim');
const S=LL.sim;
const world=()=>{const W=S.newWorld({seed:571,heroPick:0,auto:false});S.beginLanternTrial();return W;};
function step(W,n,pre){const events=[];for(let i=0;i<n*60&&!W.over;i++){pre?.();S.step(1/60);events.push(...W.fx.splice(0));}return events;}
test('a live 0.18 match has no boxed scenario state',()=>{
 const W=S.newWorld({seed:571,heroPick:0,auto:false}); assert.equal(W.trial,undefined);
 assert.equal(W.structs.filter(s=>s.alive).length,14);
});
test('the Hush actually snuffs the middle guardian and reaches its original gate',()=>{
 const W=world(), ev=step(W,28);
 assert(ev.some(e=>e.k==='snuff' && e.u===W.trial.guard));
 assert(ev.some(e=>e.k==='thiefhome' && e.carry===W.trial.guard));
 assert.equal(W.trial.result,'escaped'); assert.equal(W.trial.guard.dark,true);
 assert.equal(W.trial.guard.hp,W.trial.guard.maxHp*.75);
});
test('real bolts kill the carrier, restore the guardian and set a win',()=>{
 const W=world(), g=W.trial.guard;
 step(W,4.4); assert(g.dark); const t=W.trial.thief, p=W.player;
 // Flank the blocking guardian. Drive the public hero control inputs and actual projectile sim, not a damage hook.
 p.x=g.x-7;p.z=g.z+1;
 const ev=step(W,6,()=>{const c=p.ctl; c.fire=true;c.ax=t.x+t.vx*.09;c.ay=.8;c.az=t.z+t.vz*.09; c.mx=0;c.mz=1;});
 assert(ev.some(e=>e.k==='shot')); assert(ev.some(e=>e.k==='thiefdown' && e.carry===g));
 assert.equal(W.trial.result,'recovered'); assert.equal(g.dark,false); assert.equal(g.hp,g.maxHp);
});
test('replay constructs a fresh lit shrine and no leftover carrier',()=>{
 const a=world();step(a,28);const b=world();
 assert.notEqual(a.trial.guard,b.trial.guard);assert.equal(b.trial.guard.dark,false);assert.equal(b.trial.thief,null);assert.equal(b.t,0);
});
