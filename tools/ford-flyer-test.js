'use strict';
const {test}=require('node:test'), A=require('node:assert/strict');
require('../js/core');require('../js/sim');
const S=LL.sim, dt=1/60;
const W=()=>{const w=S.newWorld({seed:18,heroPick:0,fordFlyer:true}); S.beginLanternTrial();return w;};
const steps=(w,count)=>{for(let i=0;i<count&&!w.over;i++)S.step(dt);};
const cast=w=>{w.player.ctl.mz=1;w.player.ctl.ab[1]=true;steps(w,1);};
test('only a living human recovering stolen light earns the unlock',()=>{
  const w=W(); const h=w.player;
  A.equal(S.earnsFordFlyer({result:'recovered'},h),true);
  A.equal(S.earnsFordFlyer({result:'escaped'},h),false);
  A.equal(S.earnsFordFlyer({result:'protected'},h),false);
  A.equal(S.earnsFordFlyer(null,h),false);
  A.equal(S.earnsFordFlyer({result:'recovered'},{...h,useAI:true}),false);
});
test('normal roster and automated world never acquire the bonus pilot',()=>{
  A.deepEqual(LL.HEROES.map(h=>h.id),['dora','anna','myra','skein']);
  let w=S.newWorld({seed:18,heroPick:0}); A.equal(w.player.def.id,'dora'); A.equal(S.buyFordSupply('gum'),false);
  w=S.newWorld({seed:18,heroPick:0,auto:true,fordFlyer:true}); A.equal(w.player.def.id,'dora');
  w=W(); A.equal(w.player.def.id,'rook'); A(w.heroes.filter(h=>!h.isPlayer).every(h=>h.def.id!=='rook'));
});
test('flight moves and lifts the pilot, consumes integrity, and safely lands; empty pack cannot lift',()=>{
  const w=W(),p=w.player,z=p.z; cast(w); A.equal(p.pack,46); A(p.liftT > 0);
  steps(w,51); A(p.z>z+3); A(p.y>1&&p.y<=4.1);
  steps(w,110); A.equal(p.y,0);A.equal(p.liftT,0); A(p.onGround);
  p.pack=12; p.cds[1]=0;cast(w); A.equal(p.liftT,0); A.equal(p.pack,12); A(w.fx.some(e=>e.k==='wickdry'));
});
test('aligned flight catches an existing thread once, for a bounded lift window',()=>{
  const w=W(),p=w.player;const loc={};
  LL.lanePoint(1,LL.lanes[1].len*.32,loc);
  p.x=loc.x;p.z=loc.z;p.ctl.mx=loc.dx;p.ctl.mz=loc.dz;p.ctl.ab[1]=true;
  steps(w,40);
  const caught=w.fx.filter(e=>e.k==='wickthread');
  A.equal(caught.length,1); A.equal(p.pack,54); A(p.liftT>0);
  steps(w,110); A.equal(w.fx.filter(e=>e.k==='wickthread').length,1); A.equal(p.liftT,0); A(p.onGround);
});
test('collectible gum auto-repairs once; stamina kit does not alter hero HP',()=>{
  const w=W(),p=w.player;sink(p,10);
  const g=w.trial.supplies[0];p.x=g.x;p.z=g.z;
  steps(w,1); A.equal(p.pack,48);A(g.used);A.equal(p.hp,p.maxHp);
  steps(w,20); A.equal(p.pack,48);
});
function sink(p,val){p.pack=val;}
test('shop uses souls; Mastic changes the next lift; Doublemint restarts it',()=>{
  const w=W(),p=w.player;
  p.pack=50;
  A.equal(S.buyFordSupply('mastic'),true); A.equal(p.souls,17); A.equal(p.pack,64);A(p.mastic);
  A.equal(S.buyFordSupply('doublemint'),false);A.equal(p.souls,17);
  A.equal(S.buyFordSupply('toString'),false);
  cast(w);A.equal(p.pack,47);A(p.liftT>1.3);A.equal(p.mastic,false);A(p.cds[1]>0);
  p.souls=30; A.equal(S.buyFordSupply('doublemint'),true);A.equal(p.souls,0);A.equal(p.pack,58);A.equal(p.cds[1],0);A.equal(p.mintT,6);
});
test('hush carrier contact scuffs the pack at most once in 1.1 seconds',()=>{
  const w=W(),p=w.player;steps(w,290);
  const t=w.trial.thief;A(t.carry);
  p.x=t.x;p.z=t.z;p.ctl.mz=0;steps(w,2);
  A.equal(p.pack,56);A(w.fx.some(e=>e.k==='wickwear'));
  steps(w,10);A.equal(p.pack,56);
});
