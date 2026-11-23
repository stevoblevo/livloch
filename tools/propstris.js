// Triangles in each 0.20 prop (js/props.js), built under Node with no browser. THREE_JS = path to three.js r128 (UMD build).
// Usage: THREE_JS=/path/to/three.js node tools/propstris.js
const path = require('path');
global.window = global; global.THREE = require(process.env.THREE_JS || '/tmp/t/node_modules/three/build/three.js');
global.document = { createElement: () => ({ getContext: () => ({ createLinearGradient: () => ({ addColorStop() {} }), fillRect() {} }) }) };
global.LL = {}; require(path.join(__dirname, '..', 'js', 'props.js'));
const T = THREE, P = LL.props, tri = g => (g.index ? g.index.count : g.attributes.position.count) / 3;
const LK = { hush: 0x161230, add: true, team: [0xff9a3c, 0x9fb4ff], snowcaps: true };
const parent = new T.Group(), PG = P.troopers(T, LK, parent, null, h => new T.Color(h), o => o);
console.log('Reign trooper ' + tri(PG.reign.geometry) + ' + lantern core ' + tri(PG.lantern.geometry));
console.log('Hush small one ' + tri(PG.hush.geometry) + ' + eyes ' + tri(PG.eyes.geometry));
console.log('hollow ' + tri(parent.children[0].geometry) + ' + eyes ' + tri(parent.children[1].geometry));
[['guardian', 2.4], ['warden', 3]].forEach(function (k) { const g = new T.Group(), lit = new T.Group();
  P.hushTower(T, { kind: k[0], r: k[1], x: 10, z: 80, team: 1 }, g, lit, { glowSprite: function () { return { material: { userData: {} } }; }, teamCol: 0x9fb4ff, LK: LK });
  console.log('Hush ' + k[0] + ': tissue ' + tri(lit.children[0].geometry) + ', light ' + tri(lit.children[1].geometry)); });
const rocks = []; for (let i = 0; i < 30; i++) rocks.push({ x: i, z: i, r: 2, h: 2, seed: i / 30 });
P.rocks(T, rocks, LK, new T.Object3D()).children.forEach(function (m, i) { console.log('rock shape ' + i + ': ' + tri(m.geometry)); });
