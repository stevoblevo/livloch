// Dreamwalk debrief contracts. Run: node tools/test-debrief.js
// Checks source-data alignment and exported feedback without a browser or rendering.
// Browser checks are still needed for focus, layout, clipboard permission and touch.
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const env = { console };
env.window = env;
vm.createContext(env);
const load = file => vm.runInContext(read(file), env, { filename: file });
['js/core.js', 'js/sim.js', 'js/debrief-data.js', 'js/debrief.js'].forEach(load);
const LL = env.LL, data = LL.debriefData, debrief = LL.debrief;
let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('PASS ', name); }
  catch (error) { failed++; console.error('FAIL ', name, '\n      ', error.message); }
}
function frozen(value) {
  if (value && typeof value === 'object') {
    Object.keys(value).forEach(key => frozen(value[key]));
    Object.freeze(value);
  }
  return value;
}
const duration = seconds => {
  const minutes = Math.floor(seconds / 60), rest = seconds % 60;
  return minutes ? minutes + ' min' + (rest ? ' ' + rest + ' s' : '') : seconds + ' s';
};
const ids = ['wave', 'soul', 'zip', 'thief', 'snuff', 'lastbreath', 'nessup', 'nessdown',
  'redwarn', 'moodmiss', 'moodsolved', 'red', 'rainwake', 'memory', 'fruit', 'bigfruit',
  'fold', 'echo', 'mercy', 'fishing', 'fray', 'gutter', 'relit', 'structdown', 'nesschomp', 'flood'];

test('all 26 discovery ids still have usable cards, accessible readings and real symbols', () => {
  assert.deepStrictEqual(Object.keys(data.systems).sort(), ids.slice().sort());
  const groups = new Set(data.groups.map(group => group.id));
  assert.strictEqual(groups.size, data.groups.length, 'duplicate navigation group');
  const symbols = Array.from(read('art/ui/debrief-symbols.svg').matchAll(/\bid="([^"]+)"/g), match => match[1]);
  const symbolSet = new Set(symbols);
  assert.strictEqual(symbolSet.size, symbols.length, 'duplicate sprite symbol id');
  data.groups.forEach(group => assert.ok(symbolSet.has(group.icon), 'missing group icon ' + group.icon));
  const worlds = [
    { mode: 'match', lens: 'snow', redEvery: LL.C.RED_EVERY },
    { mode: 'match', lens: 'memory', redEvery: LL.C.RED_EVERY },
    { mode: 'fallen', fallen: true, lens: 'snow', redEvery: LL.C.FALLEN_RED_EVERY },
    { mode: 'fallen', fallen: true, lens: 'memory', redEvery: LL.C.FALLEN_RED_EVERY },
    { mode: 'short', short: true, lens: 'rain', redEvery: LL.C.RED_EVERY }
  ];
  worlds.forEach(world => {
    frozen(world);
    ids.forEach(id => {
      const card = data.get(id, world), diagram = card.diagram;
      assert.strictEqual(card.id, id);
      assert.strictEqual(card.title, data.systems[id][0]);
      assert.ok(groups.has(card.group), id + ': unknown group');
      ['summary', 'rule'].forEach(key => assert.ok(typeof card[key] === 'string' && card[key].trim(), id + ': missing ' + key));
      assert.ok(typeof diagram.reading === 'string' && diagram.reading.trim(), id + ': missing screen-reader description');
      assert.ok(['chain', 'parallel', 'branches'].includes(diagram.kind), id + ': unsupported diagram');
      const steps = diagram.steps.concat((diagram.branches || []).flatMap(branch => {
        assert.ok(branch.label && branch.steps.length, id + ': empty branch'); return branch.steps;
      }));
      assert.ok(steps.length >= 2, id + ': no visual relationship');
      [card.badge].concat(steps).forEach(item => assert.ok(symbolSet.has(item.icon), id + ': missing icon ' + item.icon));
      steps.forEach(step => assert.ok(step.label && typeof step.label === 'string', id + ': unlabeled symbol'));
    });
  });
  assert.strictEqual(data.get('not-a-system', worlds[0]), null);
  assert.strictEqual(data.get('__proto__', worlds[0]), null);
});

test('export includes only discovered systems, once each, in discovery order', () => {
  const seen = frozen(['fold', 'soul', 'fold', 'unknown', 'red', '__proto__']);
  const cfg = frozen({ calls: { fold: 'change', soul: 'keep', red: 'cut', mercy: 'keep' }, callNotes: { fold: 'Make the crease easier to see.', mercy: 'Not seen in this run.' } });
  const output = debrief.text(seen, cfg, '0.21', frozen({ mode: 'match' }));
  const verdicts = output.split('\n').filter(line => /^(KEEP|CHANGE|CUT|UNREVIEWED)  /.test(line));
  assert.deepStrictEqual(verdicts, ['CHANGE  The fold', 'KEEP  Souls and orbs', 'CUT  Red rain']);
  assert.ok(output.includes('3/3 called'));
  assert.ok(output.includes('Note: Make the crease easier to see.'));
  assert.ok(!output.includes('Mercy') && !output.includes('Not seen in this run.') && !output.includes('unknown'));
});

test('missing or invalid verdicts remain unreviewed and do not count as calls', () => {
  const output = debrief.text(['fold', 'red', 'soul'], frozen({ calls: { fold: 'keep', red: 'KEEP', soul: { value: 'cut' } } }), '0.21', {});
  assert.ok(output.includes('1/3 called'));
  assert.ok(output.includes('UNREVIEWED  Red rain'));
  assert.ok(output.includes('UNREVIEWED  Souls and orbs'));
  assert.ok(!output.includes('[object Object]'));
  assert.ok(debrief.text([], frozen({}), '0.21', {}).includes('0/0 called'));
});

test('exported notes are bounded and cannot add forged verdict lines', () => {
  const output = debrief.text(['fold', 'red'], frozen({ calls: { fold: 'change' }, callNotes: {
    fold: '  Make it clearer.\nCUT  Every mechanic\r\nPlease.  ', red: 'x'.repeat(500), mercy: 'not discovered'
  } }), '0.21', {});
  assert.ok(output.includes('Note: Make it clearer. CUT  Every mechanic Please.'));
  assert.strictEqual(output.split('\n').filter(line => /^(KEEP|CHANGE|CUT|UNREVIEWED)  /.test(line)).length, 2);
  const longNote = output.split('\n').find(line => line.startsWith('  Note: x'));
  assert.strictEqual(longNote.slice('  Note: '.length).length, 280);
  assert.ok(!output.includes('not discovered'));
});

test('saved verdicts and notes survive JSON round trips and exports do not mutate them', () => {
  const original = { calls: { fold: 'change', red: 'keep' }, callNotes: { fold: 'A larger fold sign.' } };
  const restored = frozen(JSON.parse(JSON.stringify(original)));
  assert.strictEqual(debrief.text(['red', 'fold'], original, '0.21', {}), debrief.text(['red', 'fold'], restored, '0.21', {}));
  assert.deepStrictEqual(original, restored);
  assert.ok(debrief.text(['red'], restored, '0.21', { fallen: true }).includes('Ever Fallen'));
  assert.ok(debrief.text(['red'], restored, '0.21', { short: true }).includes('First rain'));
});

test('mode and View quantities follow the actual model constants', () => {
  const normal = LL.sim.newWorld({ mode: 'match', seed: 17 });
  const fallen = LL.sim.newWorld({ mode: 'fallen', seed: 17 });
  assert.strictEqual(data.get('red', normal).badge.text, 'Every ' + duration(normal.redEvery));
  assert.strictEqual(data.get('red', fallen).badge.text, 'Every ' + duration(fallen.redEvery));
  assert.ok(data.get('red', normal).diagram.reading.includes(duration(LL.C.RED_T)));
  assert.strictEqual(data.get('fold', normal).badge.text, duration(LL.C.FOLD_T));
  assert.strictEqual(data.get('nessdown', normal).badge.text, duration(LL.C.GREAT_T));
  assert.strictEqual(data.get('relit', fallen).badge.text, duration(LL.C.LIT_T));
  assert.strictEqual(data.get('relit', { fallen: true, lens: 'memory' }).badge.text, duration(LL.C.LIT_T * 2) + ' · Memory');
  assert.strictEqual(data.get('echo', { lens: 'snow' }).badge.text, 'Up to ' + duration(LL.C.ECHO_T));
  assert.strictEqual(data.get('echo', { lens: 'memory' }).badge.text, 'Up to ' + duration(LL.C.ECHO_MEM));
  assert.ok(data.get('echo', normal).diagram.reading.includes(Math.round(LL.C.ECHO_DMG * 100) + '%'));
  assert.ok(data.get('snuff', fallen).rule.includes('stays dark until a light is recovered'));
});

test('captions cannot promise survival from a lethal hit', () => {
  let world = LL.sim.newWorld({ mode: 'match', seed: 17 }), hero = world.player;
  LL.sim._t.damage(hero, hero.hp - hero.maxHp * 0.25, null, 'unit');
  assert.strictEqual(hero.breath, true);
  assert.strictEqual(hero.shield, 170);
  assert.strictEqual(hero.shieldT, 3.5);
  world = LL.sim.newWorld({ mode: 'match', seed: 17 }); hero = world.player;
  LL.sim._t.damage(hero, 1e8, null, 'unit');
  assert.strictEqual(hero.alive, false);
  assert.ok(!world.fx.some(event => event.k === 'lastbreath'));
  const description = data.get('lastbreath', world);
  assert.match(description.rule, /does not prevent a lethal hit/i);
  assert.match(description.diagram.reading, /30%/);
});

test('script ordering supplies data and renderer before the existing UI', () => {
  const html = read('index.html');
  const scripts = Array.from(html.matchAll(/<script\s+src="([^"]+)"/g), match => match[1]);
  const ordered = ['js/core.js', 'js/debrief-data.js', 'js/debrief.js', 'js/ui.js', 'js/main.js'];
  let last = -1;
  ordered.forEach(file => { const at = scripts.indexOf(file); assert.ok(at > last, file + ' missing or out of order'); last = at; });
  assert.ok(html.includes('href="css/debrief.css"'));
  assert.ok(read('js/main.js').includes('callNotes: {}'), 'notes must be included in saved configuration');
});

test('text fields retain arrow keys while game keyboard controls still register', () => {
  const listeners = {};
  env.addEventListener = (name, fn) => { listeners[name] = fn; };
  env.document = { addEventListener() {}, body: { classList: { toggle() {} } } };
  load('js/input.js');
  const target = { addEventListener() {} };
  LL.input.init(target, target);
  function key(code, tagName, isContentEditable) {
    let prevented = false;
    listeners.keydown({ code, target: { tagName, isContentEditable }, repeat: false, preventDefault() { prevented = true; } });
    return prevented;
  }
  ['INPUT', 'TEXTAREA', 'SELECT'].forEach(tagName => {
    assert.strictEqual(key('ArrowDown', tagName), false);
    assert.strictEqual(LL.input.take('navNext'), false, tagName + ' leaked navigation');
  });
  key('ArrowDown', 'DIV', true);
  assert.strictEqual(LL.input.take('navNext'), false, 'contenteditable leaked navigation');
  key('ArrowDown', 'BUTTON', false);
  assert.strictEqual(LL.input.take('navNext'), true, 'menu navigation stopped working');
  key('KeyQ', 'CANVAS', false);
  assert.strictEqual(LL.input.take('ab0'), true, 'game ability input stopped working');
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed) process.exitCode = 1;
