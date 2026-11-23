/* Optional draw-only game adapter. Factory + paper pen injected; no listeners, clock or simulation dependency. */
import {tokens} from './depth-tokens.mjs';
export const styles=Object.freeze(['foldlight','rainprint','classic']);
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
export const palettes=Object.freeze({
  foldlight:Object.freeze({haze:'#a2bbcd',snow:'#95adc3',shade:'#4d6886',night:'#20394c',bank:'#213f52',ink:'#152a37',hint:'#d3bdf4',keep:'#ffc174',carry:'#ffc181'}),
  rainprint:Object.freeze({haze:'#bdaccc',snow:'#9290ae',shade:'#504860',night:'#2d243c',bank:'#281d35',ink:'#1d182f',hint:'#d6c6ff',keep:'#ffd295',carry:'#ffc181'}),
  classic:Object.freeze({hint:'#c3abcd',keep:'#ffb360',carry:'#ffb360'})
});
export function cue({dark=false,carrier=false,seen=false,restored=false}={}){
  return restored?'restored':carrier?'recoverable':dark?'dark':seen?'threat':'protected';
}
export function createDepthPose(){return {x:[0,0,0],y:[0,0,0],ready:false};}
export function depthPose(out, yaw, lean, dt, reduced=false){
  const gain=1-(1-tokens['depth-follow'])**(clamp(dt,0,.1)*60);
  [tokens['depth-pointer-back'],tokens['depth-pointer-mid'],tokens['depth-pointer-front']].forEach((d,i)=>{
    const x=(reduced?0:Math.sin(yaw))*d, y=(reduced?0:clamp(lean,-1,1))*d*.35;
    if(!out.ready||reduced){out.x[i]=x;out.y[i]=y;}else{out.x[i]+=(x-out.x[i])*gain;out.y[i]+=(y-out.y[i])*gain;}
  });out.ready=true;return out;
}
function firShape(v) {
  const tris=[];
  const trunk=[[-.05,-.56,0],[.05,-.56,0],[.035,0,0],[-.033,0,0]];
  tris.push([trunk[0],trunk[1],trunk[2]],[trunk[0],trunk[2],trunk[3]]);
  for(let i=0;i<5;i++){
    const y=-.12-i*.145, w=(.35-i*.047)*(1+.08*Math.sin(v+i)), a=[(v-1)*.022,y-.30,0], d=[v*.012,y-.065,.15-i*.018];
    const l=[-w,y-.017,.021], r=[w*.89,y+.017,.02], b=[.025,y+.018,.029];
    tris.push([l,a,d,'cap'],[l,d,b],[d,a,r,'cap'],[d,r,b]);
  }
  return {tris,stock:'paper-washi',tags:{cap:'washi'}};
}
export function createStage({canvas,pen,material}){
  let tornDown=false; const memo=new Map(), trees=new Map();
  function cache(style){
    if(tornDown||style==='classic'||!palettes[style])return null;
    if(memo.has(style))return memo.get(style);
    const p=palettes[style], r=style==='rainprint', bg=canvas(720,320), g=bg.getContext('2d'), raw=canvas(720,320);
    try{if(!material)throw Error('no material');material.render(raw.getContext('2d'),{width:720,height:320,seed:7841,look:'rainprint',layer:r?'surface':'subterrain',detail:.56,rain:.30}); if(g.drawImage)g.drawImage(raw,55,272,610,43,0,0,720,320);}catch{g.fillStyle=p.shade;g.fillRect(0,0,720,320);}
    raw.width=1;raw.height=1;
    const ridges=[2,3].map((n,i)=>{
      const c=canvas(1080,200), k=c.getContext('2d');
      pen.range(k,{x:0,y:188,width:1080,height:i===0?78:59,peaks:i===0?10:15,seed:284+n*97,stock:i===0?p.bank:p.ink,cap:i===0?'washi':null,depth:.43,shadow:false,lineWidth:1.2});
      return c;
    });
    const tree=[0,1,2].map(i=>{
      const c=canvas(140,180), k=c.getContext('2d');
      pen.fold(k,firShape(i),{x:70,y:176,size:170,stock:[p.ink,p.bank,p.shade][i],open:.9,shadow:false,lineWidth:1.2});
      trees.set(style+':'+i,c);return c;
    });
    const baked={bg,ridges,tree};memo.set(style,baked);return baked;
  }
  function drawRidges(ctx, options){
    const {style,w,horizon,yaw,motion}=options, m=cache(style);
    if(!m)return false;
    const p=palettes[style], stretch=Math.max(960,w*1.32);
    ctx.save();
    m.ridges.forEach((c,i)=>{
      const left=-((Math.sin(yaw)*.18+.45)*stretch)%stretch+motion.x[i+1], tall=(i===0?.105:.075)*w, y=horizon-(i===0?tall*.82:tall*.65)+motion.y[i+1];
      ctx.globalAlpha=i===0?.69:.9;
      for(let k=-1;k<3;k++)ctx.drawImage(c,left+k*stretch,y,stretch+1,tall);
      ctx.globalAlpha=tokens['op-haze'];ctx.fillStyle=p.haze;ctx.fillRect(0,horizon-10+i*4,w,9);
    });
    ctx.restore();return true;
  }
  function dispose(){if(tornDown)return;tornDown=true;for(const v of memo.values())for(const s of [v.bg,...v.ridges,...v.tree]){s.width=1;s.height=1;}memo.clear();trees.clear();material?.dispose();}
  return Object.freeze({cache,drawRidges,dispose});
}
