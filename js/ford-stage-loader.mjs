import {createStage,createDepthPose,depthPose,palettes,cue} from '../vendor/play-stage/stage.mjs';
import {createRenderer} from '../vendor/hmp-materials/0.2.0-materials.1/materials.mjs';
const canvas=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h});
const pen=window.Storeybrook?.pen?.('knight');
if(pen){
  const kit=createStage({canvas,pen,material:createRenderer({createCanvas:canvas})});
  window.LL.fordStage={kit,createDepthPose,depthPose,palettes,cue};
}
