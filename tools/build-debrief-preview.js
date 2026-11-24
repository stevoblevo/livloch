/* Build a portable visual-QA fixture from the actual production components.
   Usage: node tools/build-debrief-preview.js /absolute/output.html
   No bundler/dependencies; excludes the game and uses only the screenshot's sample discoveries. */
'use strict';
const fs = require('fs'), path = require('path'), root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
let html = read('tools/debrief-preview.html');
const gameStyle = /<style>([\s\S]*?)<\/style>/.exec(read('index.html'))[1];
html = html.replace('<base href="../">', '').replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis[^>]+>/, '');
html = html.replace('<link rel="stylesheet" href="css/debrief.css">', '<style>' + gameStyle + '\n' + read('css/debrief.css') + '</style>');
const sprite = read('art/ui/debrief-symbols.svg').replace('<svg ', '<svg style="display:none" aria-hidden="true" ');
html = html.replace('<body>', '<body>\n' + sprite);
html = html.replace('src="art/title.jpg"', 'src="data:image/jpeg;base64,' + fs.readFileSync(path.join(root, 'art/title.jpg')).toString('base64') + '"');
for (const name of ['core', 'debrief-data', 'debrief']) {
  let js = read('js/' + name + '.js');
  if (name === 'debrief') js = js.replace("'art/ui/debrief-symbols.svg#'", "'#'");
  html = html.replace('<script src="js/' + name + '.js"></script>', '<script>\n' + js + '\n</script>');
}
html = html.replace(/    const res = await fetch\('index.html'\);[\s\S]*?document\.head\.prepend\(style\.cloneNode\(true\)\);\n/, '');
html = html.replace('<a href="index.html">Play LIVLOCH</a>', '');
html = html.replace('Presentation preview · sample run, not live gameplay', 'Portable presentation preview · sample run, not live gameplay');
const out = path.resolve(process.argv[2] || path.join(root, 'debrief-preview.html'));
fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, html); console.log(out + ' (' + Buffer.byteLength(html) + ' bytes)');
