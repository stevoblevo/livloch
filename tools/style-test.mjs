import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createStage,cue,depthPose,createDepthPose} from '../vendor/play-stage/stage.mjs';
import motion from '../js/ford-motion.js';
const file=p=>readFileSync(new URL('../vendor/'+p,import.meta.url));
const digest=s=>createHash('sha256').update(s).digest('hex');
test('every vendored toolkit runtime matches its source manifest',()=>{
 const m=JSON.parse(file('style-upstream.json'));
 for(const f of m.files)assert.equal(digest(file(f.path)),f.sha256,f.path);
 assert.equal(digest(file('depthfield/tokens.css')),m.depthfield.sha256);
 for(const [name,sha] of Object.entries(JSON.parse(file(m.hypermetapunk.manifest)).files)) assert.equal(digest(file('hmp-materials/0.2.0-materials.1/'+name)),sha);
});
test('only 3 decorative planes; farther planes travel less and still mode locks them',()=>{
 const d=createDepthPose();depthPose(d,.8,.3,.016);assert.equal(d.x.length,3);
 assert(d.x[0]<d.x[1]&&d.x[1]<d.x[2]);depthPose(d,1,-.5,.1,true);assert.deepEqual(d.x,[0,0,0]);assert.deepEqual(d.y,[0,0,0]);
});
test('gold wake depends on carrier fact, not the art treatment',()=>{
 assert.equal(cue({dark:true,carrier:true}),'recoverable');assert.equal(cue({dark:true}),'dark');assert.equal(cue({seen:true}),'threat');assert.equal(cue({restored:true}),'restored');
});
test('cache is style-bounded and repeated treatment switches never re-render the material',()=>{
 let render=0, dispose=0, folded=0; const canvas=(width,height)=>({width,height,getContext:()=>({fillRect(){}})});
 const s=createStage({canvas,pen:{range(){},fold(){folded++;}},material:{render(){render++;},dispose(){dispose++;}}});
 const f=s.cache('foldlight'); assert.equal(s.cache('foldlight'),f);
 const r=s.cache('rainprint');assert.notEqual(r,f); assert.equal(s.cache('classic'),null);assert.equal(render,2);assert.equal(folded,6);
 s.dispose();s.dispose();assert.equal(dispose,1);assert.equal(r.bg.width,1);assert.equal(s.cache('foldlight'),null);
});
test('spatial strides, no treadmill at rest; stopping returns feet to the baseline',()=>{
 const a=motion.create(), u={x:0,z:0,onGround:true,def:{id:'dora'}};motion.pose(a,u,.016,0);
 for(let i=0;i<25;i++){u.z+=.08;motion.pose(a,u,.016,i/60);}
 const phase=a.phase;assert(phase>2&&a.mix>.65);
 let r;for(let i=0;i<25;i++)r=motion.pose(a,u,.016,1+i/60);
 assert.equal(a.phase,phase);assert(r.mix<.01); assert(r.liftL+r.liftR<.01);
});
test('fire anticipation blends and releases; no camera data or hero mutation',()=>{
 const a=motion.create(), u=Object.freeze({x:0,z:0,onGround:true,lastShotT:2,def:Object.freeze({id:'dora'})});
 const r=motion.pose(a,u,.05,2.04); assert(r.aim>.7&&r.recoil>0);
 for(let i=0;i<15;i++)motion.pose(a,u,.05,2.4+i*.05);assert(a.aim<.001);
 const b=motion.pose(a,u,.05,2.10,true);assert.equal(b.recoil,0);assert.equal(b.roll,0);
});
