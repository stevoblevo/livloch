/* 0.28.1: the title fade under different frame patterns. node tools/face-sim.js $PWD/js/face.js */
const el={style:{},classList:{add(){},remove(){}}};
global.document={hidden:false,getElementById:()=>el};global.window={LL:{gfx:{reduced:false,low:false}}};global.LL=window.LL;
require(process.argv[2]);const F=LL.face;
function run(name,frames){F.title();let fadeAt=null;for(let i=0;i<frames.length;i++){const r=F.titleFrame(frames[i]/1000,frames[i]);const st=F.state();if(st.fading&&fadeAt==null)fadeAt=st.t;}console.log(name,JSON.stringify(F.state()),'fadeAt',fadeAt);}
const a=n=>Array(n);
run('fast 60fps',a(600).fill(16.7));
run('hitchy start then 30fps',[...a(20).fill(300),...a(300).fill(33)]);
run('background tab 3s then fast',(()=>{const f=[...a(200).fill(16.7)];document.hidden=true;F.title();for(let i=0;i<5;i++)F.titleFrame(1,1000);document.hidden=false;return f})());
run('slow 25fps',a(400).fill(40));
run('very slow 8fps',a(200).fill(125));
