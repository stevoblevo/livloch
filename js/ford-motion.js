/* Shared distance-driven view rig. Never writes to the simulated unit. */
(function(root){
'use strict';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const rigs={rook:{cycle:3.5,hem:.28},dora:{cycle:3.75,hem:.20},anna:{cycle:3.25,hem:.30},myra:{cycle:2.95,hem:.22},skein:{cycle:3.6,hem:.27}};
function create(){return {x:null,z:null,phase:0,mix:0,aim:0,ground:true,land:0};}
function pose(m,u,dt,t,still){
  const step=m.x==null ? 0 : Math.hypot(u.x-m.x,u.z-m.z), r=rigs[u.def.id]||rigs.dora;
  m.x=u.x;m.z=u.z;dt=clamp(dt,0,.1);
  const moving=step<2.5 && dt>0 ? clamp(step/(dt*5.4),0,1):0;
  m.mix+=(moving*(u.onGround?1:.24)-m.mix)*(1-Math.exp(-dt*(moving>m.mix?17:21)));
  if(step<2.5 && u.onGround) m.phase=(m.phase+step/r.cycle*2*Math.PI)%(2*Math.PI);
  if(u.onGround && !m.ground)m.land=1;
  m.ground=!!u.onGround;m.land*=Math.exp(-dt*13);
  const age=Math.max(0,t-(u.lastShotT??-99)), shooting=age<.25;
  m.aim+=((shooting?1:0)-m.aim)*(1-Math.exp(-dt*(shooting?34:14)));
  const f=Math.sin(m.phase)*m.mix, sway=still?0:f;
  const recoil=still?0:Math.exp(-age*35)*clamp(m.aim+.3,0,1);
  return {sway,phase:m.phase,mix:m.mix,aim:m.aim,hem:r.hem, liftL:Math.max(0,sway)*.21,liftR:Math.max(0,-sway)*.21, body:still?0:.025*Math.abs(sway)-.043*m.land,
    roll:sway*.026+(still?0:(u.dashT>0?.045:0)),recoil,air:!u.onGround};
}
const api={create,pose}; if(typeof module!=='undefined')module.exports=api; else root.LL.paperMotion=api;
})(typeof window==='undefined'?globalThis:window);
