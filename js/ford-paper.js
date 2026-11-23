/* CPU paper renderer for the Ford only. Still the same 3-D world positions, input,
   camera collision, aiming ray and sim. Deliberately not a fallback for full matches. */
(function () {
'use strict';
const LL=window.LL, R=LL.gfx;
R.enableFordPaper = function (gl) {
  const c=document.createElement('canvas'), ctx=c.getContext('2d',{alpha:false});
  if (!ctx) return false;
  gl.before(c); c.id='paper-ford'; c.setAttribute('aria-hidden','true');
  document.body.classList.add('paper-ford');
  const U=LL.U, img=src=>{const i=new Image(); i.src=src; return i;};
  const ridge=img('art/ford-ridge.webp'), house=img('art/flats/house.png'), grain=img('art/ford-snow.webp');
  const heroSheets=['dora','anna','myra','skein'].map(n=>img('art/heroes/'+n+'.png'));
  const orig=R.camPose, cam={x:0,y:0,z:0,dx:0,dy:0,dz:1,dist:5};
  let W,w,h,fx,fy,cx,sx,sp,cp, yard=[],stamps=[],tick=0,lastTrail=-10,stamp=0, flashes=[], snow=[];
  const mot=LL.paperMotion; let motion=mot.create(), depth=null, inkRidge=null, cueFrame='protected', flightThreads=[];
  const wickAviator=img('art/heroes/wick-aviator.svg');
  const motionSheets=['dora','anna','myra','skein'].map(n=>img('art/heroes/'+n+'-motion.png'));
  const heights=[2.45,2.4,1.95,2.2];
  const ready=i=>i.complete && i.naturalWidth>0;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  R.resize=()=>{ const scale=Math.min(devicePixelRatio||1,1.5); R.w=w=gl.clientWidth||innerWidth; R.h=h=gl.clientHeight||innerHeight; R.portrait=h>w;
    c.width=Math.round(w*scale); c.height=Math.round(h*scale); ctx.setTransform(scale,0,0,scale,0,0); };
  R.setQuality=()=>{R.resize();}; R.info=()=>({gpu:'CPU paper',w,h,pr:1,low:true,look:'Cobalt Snow',gl2:false});
  R.camPose=function(p,yaw,pitch,z,out){ return orig(p,yaw,pitch,z,out); };
  R.cam=()=>cam; R.setLook=id=>{R.look=R.LOOKS[id]||R.LOOKS.snow;};
  R.build=function(world){
    // The native camPose closes over gfx's world, so feed it through the minimal setter.
    R.setCameraWorld(world); W=world;
    const rnd=LL.rng(571); motion=mot.create(); depth=null; cueFrame='protected';
    tick=0; lastTrail=-10; yard=[]; flightThreads=[]; stamps=[]; flashes=[]; snow=[];
    if (!W.trial) return;
    const g=W.trial.guard;
    if(W.trial.supplies)flightThreads=LL.lanes.map((lane,i)=>{
      const points=[];for(let s=0;s<lane.len;s+=3){const pt={};LL.lanePoint(i,s,pt);points.push(pt);}return points;
    });
    for(let i=0;i<90;i++){
      const x=g.x+(i%2?1:-1)*(10+rnd()*44), z=g.z-12+rnd()*118;
      if(i<55) yard.push({x,z,h:3+rnd()*9,seed:rnd(),kind:'tree'});
      else yard.push({x,z,h:.3+rnd()*1.4,seed:rnd(),kind:'rock'});
    }
    for (let i=0;i<260;i++) stamps.push({x:g.x+(rnd()-.5)*87,z:g.z-26+rnd()*137,n:rnd(),wide:.2+rnd()*2});
    for (let i=0;i<55;i++) snow.push([rnd(),rnd(),rnd()]);
  };
  R.fx=e=>{if (!W?.trial) return;
    if (e.k==='snuff' || (e.k==='thiefdown' && e.carry)) flashes.push({x:e.u?.x??e.x,z:e.u?.z??e.z,y:2,k:e.k,t:tick});
    if (e.k==='hit') flashes.push({x:e.x,z:e.z,y:e.y,k:e.k,t:tick});
    if (flashes.length>32) flashes.shift();
  };
  function p(x,y,z){
    const a=x-cam.x,b=y-cam.y,d=z-cam.z, horiz=a*sx+d*cx, dep=horiz*cp+b*sp;
    return {x:w/2+(-a*cx+d*sx)*fx/Math.max(.19,dep),y:h/2-(b*cp-horiz*sp)*fy/Math.max(.19,dep),d:dep};
  }
  R.project=function(x,y,z,out){const b=p(x,y,z);out.x=b.x;out.y=b.y;out.vis=b.d>.2&&b.x>=0&&b.x<=w&&b.y>=0&&b.y<=h;return out;};
  function poly(points, fill){ctx.fillStyle=fill;ctx.beginPath(); points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();}
  function glow(x,y,r,col,alpha=.8){
    if (!(r>0) || r>1800) return;
    const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,col);g.addColorStop(.24,col+'b3');g.addColorStop(1,col+'00');
    ctx.globalAlpha=alpha;ctx.fillStyle=g;ctx.fillRect(x-r,y-r,2*r,2*r);ctx.globalAlpha=1;
  }
  function tree(o,b,s){
    let hh=o.h*s, ww=hh*.27, xx=b.x, yy=b.y, ink=['#111a2c','#1d2d43','#253750'][Math.floor(o.seed*3)];
    poly([[xx-ww*.11,yy],[xx+ww*.105,yy],[xx+ww*.07,yy-hh*.71],[xx-ww*.06,yy-hh*.68]],'#152237');
    for(let k=0;k<4;k++){
      const l=yy-hh*(.15+k*.17), r=ww*(1-k*.19), top=l-hh*.38;
      poly([[xx-r,l],[xx-r*.60,l-hh*.09],[xx-r*.38,l-hh*.23],[xx,top],[xx+r*.42,l-hh*.21],[xx+r*.66,l-hh*.08],[xx+r,l-hh*.03],[xx+r*.17,l-hh*.025]],ink);
      poly([[xx,top],[xx-r*.34,l-hh*.17],[xx-r*.71,l-hh*.09],[xx+r*.07,l-hh*.10],[xx+r*.26,l-hh*.20]],o.seed>.5?'#476181':'#3a5371');
    }
  }
  function shadow(x,y,r,k=.23){ctx.fillStyle='rgba(8,12,28,'+k+')';ctx.beginPath();ctx.ellipse(x,y,r,Math.max(1,r*.19),0,0,7);ctx.fill();}
  function line(a,b,col,width){ if(a.d<=.25 || b.d<=.25)return; ctx.strokeStyle=col;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke(); }
  R.frame=function(dt,v){
    if(!W?.trial||!v.target)return;
    tick+=dt; const g=W.trial.guard,t=W.trial.thief, pl=W.player;
    const yaw=v.yaw,pitch=v.pitch, style=R.fordArtStyle, lib=LL.fordStage;
    const kit=lib?.kit?.cache(style), colors=kit&&lib.palettes[style];
    if(kit){depth??=lib.createDepthPose(); lib.depthPose(depth,yaw,Math.sin(pitch)*2,dt,reduced);}
    cueFrame=lib?.cue({dark:!!g.dark,carrier:!!(t?.alive&&t.carry),seen:!!t?.alive,restored:W.trial.result==='recovered'})||'protected';
    const move=mot.pose(motion,pl,dt,W.t,reduced); sx=Math.sin(yaw);cx=Math.cos(yaw);sp=Math.sin(pitch);cp=Math.cos(pitch);
    orig(pl,yaw,pitch,v.zoom,cam); fx=fy=(h/2)/Math.tan((R.portrait?82:64)*(1-v.zoom*.30)*Math.PI/360);
    const horizon=h/2+Math.tan(pitch)*fy, sky=ctx.createLinearGradient(0,0,0,Math.max(1,h*.67));
    sky.addColorStop(0,'#09152b');sky.addColorStop(1,'#486a94');ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
    if(ready(ridge)){
      const rw=Math.max(w*1.65,h*2.8), rh=Math.max(h*.78,rw/3.35), s=(((yaw+.23)/2.0)%1+1)%1;
      if(style==='rainprint'&&!inkRidge){
        inkRidge=document.createElement('canvas');inkRidge.width=1024;inkRidge.height=512;
        const k=inkRidge.getContext('2d');k.filter='grayscale(1) contrast(1.47) brightness(1.22)';k.drawImage(ridge,0,0,1024,512);k.filter='none';
        k.globalCompositeOperation='screen';k.globalAlpha=.31;k.fillStyle='#583d65';k.fillRect(0,0,1024,512);
      }
      const viewRidge=style==='rainprint'?inkRidge:ridge;
      const dx=-(s*rw)+(kit?depth.x[0]:0), ry=horizon-rh*.63+(kit?depth.y[0]:0);
      for(let j=-1;j<=2;j++) {ctx.save();ctx.translate(dx+j*rw+(j%2?rw:0),ry); if(j%2)ctx.scale(-1,1);ctx.drawImage(viewRidge,0,0,rw+1,rh);ctx.restore();}
    }
    if(kit)lib.kit.drawRidges(ctx,{style,w,horizon:horizon+11,yaw,motion:depth});
    const y0=Math.max(0,horizon+8), ground=ctx.createLinearGradient(0,y0,0,Math.max(y0+1,h));
    ground.addColorStop(0,colors?.night||'#294264');ground.addColorStop(.22,colors?.shade||'#3a5274');ground.addColorStop(1,colors?.snow||'#61799b');
    ctx.fillStyle=ground;ctx.fillRect(0,y0,w,h);
    if(ready(grain) && y0<h) {
      ctx.save();
      ctx.beginPath(); ctx.rect(0,y0,w,h-y0); ctx.clip();
      ctx.globalCompositeOperation='soft-light';ctx.globalAlpha=.38;
      const tex=ctx.createPattern(grain,'repeat');
      const tx=((cam.x*14+cam.z*8)*Math.cos(yaw)+yaw*120)%512, ty=(cam.z*12-cam.x*7)%512;
      tex.setTransform(new DOMMatrix().translate(tx,ty).scale(1.15,.78));
      ctx.fillStyle=tex;ctx.fillRect(0,y0,w,h-y0);ctx.restore();
    }
    if(kit&&y0<h){
      ctx.save(); ctx.globalCompositeOperation=style==='rainprint'?'multiply':'soft-light';
      ctx.globalAlpha=style==='rainprint'?.40:.11;
      ctx.drawImage(kit.bg,0,144,720,176,0,y0,w,h-y0);ctx.restore();
    }
    const patches=stamps.map(o=>({o,b:p(o.x,0,o.z)})).filter(({b})=>b.d>1&&b.x>-150&&b.x<w+150&&b.y<h+30).sort((a,b)=>b.b.d-a.b.d);
    for(const {o,b} of patches){
      const r=Math.min(64,o.wide*fy/b.d), q=r*(.1+o.n*.12);
      poly([[b.x-r,b.y+.23*q],[b.x-r*.46,b.y-q],[b.x+r*.37,b.y-q*.6],[b.x+r,b.y+q*.09],[b.x+r*.3,b.y+q]],o.n>.61?'#91a6bc28':o.n>.26?'#a7baca22':'#16294726');
    }
    for(let z=g.z+85;z>g.z-25;z-=2.5){
      const x=g.x-5.3+.85*Math.sin((z-g.z)*.21), a=p(x-1.7,.01,z),b=p(x+1.7,.01,z),d=p(x+1.8,.01,z-2.55),e=p(x-1.8,.01,z-2.55);
      if([a,b,d,e].every(k=>k.d>.4))poly([[a.x,a.y],[b.x,b.y],[d.x,d.y],[e.x,e.y]], Math.floor(z)%3?'#35485f30':'#28384e50');
    }
    if (flightThreads.length) {
      for (const thread of flightThreads) {
        let prev=null; for (const node of thread) {
          const n=p(node.x,.035,node.z);
          if (prev&&n.d>1.3&&prev.d>1.3&&n.d<105&&((n.x>=-40&&n.x<=w+40)||(prev.x>=-40&&prev.x<=w+40)))
            line(prev,n,pl.liftT>0&&pl.threadCaught?'#b9f7dbb9':'#8dddc780',Math.min(4,Math.max(1,50/n.d)));
          prev=n;
        }
      }
    }
    const gb=p(g.x,0,g.z); if(!g.dark && gb.d>.2)glow(gb.x,gb.y,Math.min(230,7*fy/gb.d),'#e9a864',.37);
    if(t?.alive && t.carry && tick-lastTrail>.085){ yard.push({x:t.x,z:t.z,kind:'mote',birth:tick});lastTrail=tick; }
    yard=yard.filter(o=>o.kind!=='mote'||(tick-o.birth<2 && t?.alive && t.carry));
    const chart=[...yard,{...g,kind:'house'},{x:pl.x,y:pl.y,z:pl.z,kind:'hero'}];
    for(const o of W.trial.supplies||[])if(!o.used)chart.push({...o,kind:'supply'});
    if(t?.alive)chart.push({...t,kind:'thief'});
    chart.map(o=>({o,b:p(o.x,o.y||0,o.z)})).filter(({b})=>b.d>.29 && b.x>-480&&b.x<w+480).sort((a,b)=>b.b.d-a.b.d).forEach(({o,b})=>{
      const s=Math.min(260,fy/b.d);
      if(o.kind==='mote'){glow(b.x,b.y-2,Math.max(3,s*.38),'#ffbf6d',.8*(1-(tick-o.birth)/2));return;}
      if(o.kind==='tree'){
        if(!kit){tree(o,b,s);return;}
        const a=kit.tree[Math.floor(o.seed*3)],ht=o.h*s,wd=ht*a.width/a.height;
        shadow(b.x,b.y,wd*.49,.20);ctx.drawImage(a,b.x-wd/2,b.y-ht,wd,ht);return;
      }
      if(o.kind==='rock'){let k=o.h*s; poly([[b.x-k,b.y],[b.x-k*.55,b.y-k*.34],[b.x+k*.26,b.y-k*.48],[b.x+k,b.y-k*.12],[b.x+k*.75,b.y]],'#263953');return;}
      if(o.kind==='house'){
        shadow(b.x,b.y,3.3*s); if(!g.dark)glow(b.x,b.y-3*s,(cueFrame==='restored'?6.2:5)*s,colors?.keep||'#f0ad68',.6);
        if(ready(house)){ const sw=house.naturalWidth/3, sh=house.naturalHeight, ht=s*12.4, wd=ht*sw/sh;
          ctx.filter=g.dark?'brightness(.35) saturate(.38)':'none';ctx.drawImage(house,0,0,sw,sh,b.x-wd/2,b.y-ht,wd,ht);ctx.filter='none'; }
        return;
      }
      if(o.kind==='supply'){
        const label=LL.FORD_SUPPLIES[o.id],r=Math.max(5,.31*s),x=b.x,y=b.y-.23*s;
        glow(x,y,r*2,label.tint,.45);
        poly([[x-r,y],[x,y-r*.54],[x+r,y],[x,y+r*.54]],label.tint);
        if(b.d<12){ctx.font='12px monospace';ctx.textAlign='center';ctx.fillStyle='#111b28';ctx.fillText(label.name,x+1,y-r*.8+1);ctx.fillStyle='#effaf3';ctx.fillText(label.name,x,y-r*.8);}
        return;
      }
      if(o.kind==='hero'){
        if(pl.def.id==='rook'&&ready(wickAviator)){
          const tt=2.42*s,ww=tt*176/288,yaw=Math.atan2(cam.x-pl.x,cam.z-pl.z)-pl.yaw;
          const a=Math.atan2(Math.sin(yaw),Math.cos(yaw)),ad=Math.abs(a);
          const i=ad<.5?0:ad<1.2?3:ad<2.2?1:2;
          const floor=p(pl.x,0,pl.z);shadow(floor.x,floor.y,tt*.23,.20);
          ctx.save();ctx.translate(b.x,b.y);
          if(pl.liftT>0){
            for(let j=0;j<2;j++){
              const x=(j?1:-1)*tt*.066,y=-tt*.39,l=tt*(.19+(reduced?.0:Math.sin(tick*34+j)*.05));
              glow(x,y+l*.37,tt*.105,'#81e6cb',.55);
              poly([[x-tt*.022,y],[x+tt*.024,y],[x,y+l]],'#cdf6d980');
            }
            ctx.rotate(.095);
          }else ctx.rotate(move.roll);
          if((i===1||i===3)&&a>0)ctx.scale(-1,1);
          ctx.drawImage(wickAviator,i*176,0,176,288,-ww/2,-tt*.93,ww,tt);
          ctx.restore();return;
        }
        const hero=LL.cfg.hero, fallback=heroSheets[hero]||heroSheets[0], orig=motionSheets[hero]||motionSheets[0], ht=(heights[hero]||2.32)*s;
        const yawToCam=Math.atan2(cam.x-pl.x,cam.z-pl.z)-pl.yaw, d=Math.atan2(Math.sin(yawToCam),Math.cos(yawToCam)), ad=Math.abs(d);
        const side=ad>=.62&&ad<2.12, flip=side&&d>0, v=ad<.62?0:side?1:2;
        const src=ready(orig)?orig:fallback, n=src===orig?7:4;
        shadow(b.x,b.y,ht*.24);
        if(ready(src)){
          const sh=src.naturalHeight, sw=src.naturalWidth/n, wd=ht*sw/sh, base=v, split=Math.round(sh*(1-move.hem)), cutY=-ht*(1-split/sh);
          ctx.save();ctx.translate(b.x,b.y);if(flip)ctx.scale(-1,1);
          const slice=(cell,x0,x1,y0,y1,ox=0,oy=0)=>{const a0=Math.round(x0*sw),a1=Math.round(x1*sw);
            ctx.drawImage(src,cell*sw+a0,y0,a1-a0,y1-y0,-wd/2+wd*x0+ox,-ht+y0/sh*ht+oy,wd*(x1-x0),(y1-y0)/sh*ht);};
          // Both feet settle back onto the same line. Side poses scissor around a hem hinge.
          if(side){
            for(const [sign,alpha] of [[-1,.72],[1,1]]){
              ctx.save();ctx.globalAlpha=alpha;ctx.translate(0,cutY);ctx.rotate(sign*move.sway*.47);
              ctx.translate(0,-cutY);slice(base,0,1,split,sh,0,-Math.max(0,sign*move.sway)*.12*ht*move.hem);ctx.restore();
            }
          }else{
            slice(base,0,.5,split,sh,-move.sway*ht*.014,-move.liftL*ht*move.hem);
            slice(base,.5,1,split,sh,move.sway*ht*.014,-move.liftR*ht*move.hem);
          }
          ctx.save();ctx.translate(0,cutY);ctx.rotate(move.roll);ctx.translate(0,-cutY);
          const kick=move.recoil*ht*.016, rise=(move.body*ht)-kick;
          if(src===orig&&(side||v===2)&&move.aim>.005){
            // Alpha crossfade the existing directional fire art, not the legs.
            ctx.globalAlpha=1-move.aim;slice(base,0,1,0,Math.min(sh,split+18),-kick*.27,rise);
            ctx.globalAlpha=move.aim;slice(side?6:5,0,1,0,Math.min(sh,split+18),-kick*.27,rise);
          }else slice(base,0,1,0,Math.min(sh,split+18),0,rise);
          // Bare shoulder poses use the painted arm cells at the hip end of the swing.
          if(src===orig&&hero!==0&&move.aim<.96){
            const a=hero===1?[.685,.105,.367]:hero===2?[.60,.19,.356]:[.66,.13,.352],sy=-ht*a[0],armH=ht*a[2];
            const arm=(sign)=>{ctx.save();ctx.globalAlpha=1-move.aim;ctx.translate(side?0:sign*ht*a[1],sy);ctx.scale(sign,1);ctx.rotate(move.sway*.30+sign*.10);
              const aw=sw*.63, ah=Math.min(sh,Math.round(a[2]*sh));ctx.drawImage(src,(side?3:4)*sw+(sw-aw)/2,0,aw,ah,-armH*.31,0,armH*.62,armH);ctx.restore();};
            arm(-1);if(!side)arm(1);
          }
          ctx.restore();ctx.restore();
        }
        return;
      }
      shadow(b.x,b.y,.68*s); const x=b.x,y=b.y+(reduced?0:Math.sin(tick*11)*.10*s), d=s, lw=.55*d;
      const cut=[[x-.64*d,y],[x-.47*d,y-.43*d],[x-.37*d,y-1.49*d],[x-.12*d,y-1.22*d],[x+.13*d,y-1.29*d],[x+.36*d,y-1.55*d],[x+.42*d,y-.51*d],[x+.62*d,y-.06*d],[x+.3*d,y-.22*d],[x+.12*d,y],[x-.13*d,y-.15*d],[x-.31*d,y+.03*d]];
      poly(cut,t.flash>0?'#9183ae':'#181326');ctx.strokeStyle=(colors?.hint||'#c3abcd')+'a6';ctx.lineWidth=1;ctx.stroke();
      poly([[x-lw*.4,y-.99*d],[x-lw*.12,y-.94*d],[x-lw*.14,y-1.02*d]],'#ffe6f7');
      poly([[x+lw*.4,y-.99*d],[x+lw*.12,y-.94*d],[x+lw*.14,y-1.02*d]],'#ffe6f7');
      if(t.carry){glow(x,y-1.72*d,Math.max(11,d*.97),colors?.carry||'#ffb360',.93); poly([[x,y-1.98*d],[x+.15*d,y-1.72*d],[x,y-1.50*d],[x-.15*d,y-1.72*d]],'#ffe9ac');}
    });
    for(const u of W.projs){ if(!u.alive && u.dead)continue; const b=p(u.x,u.y,u.z), a=p(u.x-u.vx*.025,u.y-u.vy*.025,u.z-u.vz*.025);line(a,b,'#ffc88d',2); }
    for(const f of flashes){const age=tick-f.t,b=p(f.x,f.y,f.z);if(age>.6||b.d<.3)continue;glow(b.x,b.y,(f.k==='hit'?40:110)*age+8,f.k==='snuff'?'#a68dde':'#ffd596',(1-age/.6)*.55);}
    flashes=flashes.filter(f=>tick-f.t<.62);
    if (style==='rainprint' && kit) {
      // Copper stitchwork reads as a trail even without the glow; it ends at the stolen lantern.
      const path=yard.filter(o=>o.kind==='mote').map(o=>p(o.x,.14,o.z)).filter(o=>o.d>.4);
      ctx.save();ctx.setLineDash([4,6]);for(let i=1;i<path.length;i++)line(path[i-1],path[i],'#ffd19abd',1.45);ctx.restore();
    }
    if(!reduced) for(const [x,y,r] of snow){const xx=((x+tick*(.003+r*.006))%1)*w, yy=((y+tick*(.025+r*.045))%1)*h;ctx.fillStyle=t?.carry&&r>.9?'#fb70636c':'#d3e4ff78';if(style==='rainprint'){ctx.strokeStyle=r>.8?'#cfbeb54f':'#d9cbe22c';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(xx,yy);ctx.lineTo(xx-r*8,yy+r*13+3);ctx.stroke();} else ctx.fillRect(xx,yy,r*1.8+1,r*1.1+1);}
    const vign=ctx.createRadialGradient(w/2,h*.45,Math.min(w,h)*.38,w/2,h*.5,Math.hypot(w,h)*.60);
    vign.addColorStop(0,'#090d1900');vign.addColorStop(1,'#090d19a8');ctx.fillStyle=vign;ctx.fillRect(0,0,w,h);
  };
  R.resize();
  return true;
};
})();
