// Triangles in scenery's ground growth (js/scenery.js): the baked plant mesh and the verge beside the threads (0.25), under
// Node with no browser, normal and Lighter graphics. Point ROOT at another checkout to compare versions.
// Usage: THREE_JS=/path/to/three.js node tools/scenerytris.js [ROOT] [look]
const path = require('path'), root = path.resolve(process.argv[2] || path.join(__dirname, '..')), look = process.argv[3] || 'snow';
global.window = global; global.THREE = require(process.env.THREE_JS || '/tmp/t/node_modules/three/build/three.js');
const ctx2d = { createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }), fillRect() {}, save() {}, restore() {}, translate() {}, rotate() {}, beginPath() {}, ellipse() {}, fill() {} };
global.document = { createElement: () => ({ getContext: () => ctx2d, width: 0, height: 0 }) };
require(path.join(root, 'js/core.js')); require(path.join(root, 'js/sim.js')); require(path.join(root, 'js/scenery.js'));
const T = THREE, SC = LL.scenery, W = LL.sim.newWorld({ heroPick: 0, difficulty: 1, seed: 1 });
const LK = { hemi: [0xb8b4ff, 0x3a2f5a, 0.8], dir: [0xffd0e0, 0.45], sky: [0x15123a, 0x3a2f78, 0xd07aa8], sun: [0xffe0b0, 0xfff6e0], star: 1 };
const tri = g => (g.index ? g.index.count : g.attributes.position.count) / 3;
[false, true].forEach(function (low) {
  const ctx = { T: T, scene: new T.Scene(), world: new T.Group(), sky: new T.Group(), renderer: { getDrawingBufferSize() {} }, LK: LK, id: look, R: { low: low, reduced: false }, groundH: () => 0, ground: null };
  SC.begin(ctx); SC.build(ctx); const n0 = ctx.world.children.length; SC.trees(W, W.obstacles.filter(o => o.tree));
  let plant = 0, verge = 0, vergeDraws = 0;
  ctx.world.children.forEach(function (o, i) { const g = o.geometry; if (!g) return;
    if (i >= n0 && !o.isInstancedMesh && !o.isPoints && g.attributes.aGlow) plant += tri(g); // the baked plant mesh
    if (g.attributes.aV) { verge += tri(g); vergeDraws++; } });
  console.log((low ? 'Lighter graphics' : 'normal          ') + '  plant mesh ' + plant + ' triangles, verge ' + verge + ' triangles in ' + vergeDraws + ' draw' + (vergeDraws === 1 ? '' : 's'));
});
