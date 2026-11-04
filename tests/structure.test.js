// Checks that the split code still fits together. Run: node tests/structure.test.js
// - every file app.html loads exists and parses
// - all app scripts together parse as one program, so two files never declare
//   the same top-level name (classic scripts share one global scope)
// - nothing still has inline code in app.html
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'app.html'), 'utf8');
const fails = [];

const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
const styles = [...html.matchAll(/<link rel="stylesheet" href="(assets\/[^"]+)">/g)].map(m => m[1]);
if (/<script>(?!<\/script>)/.test(html)) fails.push('app.html has inline <script> code; put it in assets/');
if (/<style>/.test(html)) fails.push('app.html has an inline <style>; put it in assets/styles.css');

for (const f of [...scripts, ...styles]) {
  if (!fs.existsSync(path.join(root, f))) fails.push('missing file: ' + f);
}

const appFiles = scripts.filter(f => f.startsWith('assets/') && f !== 'assets/format.js');
const parts = [];
for (const f of appFiles) {
  const code = fs.readFileSync(path.join(root, f), 'utf8');
  try { new vm.Script(code, { filename: f }); } catch (e) { fails.push(`${f}: ${e.message}`); }
  parts.push(code.replace(/^"use strict";$/m, ''));
}
try {
  new vm.Script('"use strict";\n' + parts.join('\n;\n'), { filename: 'all-app-scripts.js' });
} catch (e) {
  fails.push('the app scripts clash when loaded together: ' + e.message);
}

// every file in assets/ (except beta and format.js) is loaded by app.html
const onDisk = fs.readdirSync(path.join(root, 'assets')).filter(n => /\.(js|css)$/.test(n)).map(n => 'assets/' + n);
for (const f of onDisk) if (!scripts.includes(f) && !styles.includes(f)) fails.push('not loaded by app.html: ' + f);

if (appFiles[appFiles.length - 1] !== 'assets/boot.js') fails.push('assets/boot.js must be the last script');

console.log(`app scripts ${appFiles.length}, styles ${styles.length}`);
fails.forEach(f => console.log('FAIL', f));
console.log(fails.length ? `${fails.length} failed` : 'PASS');
process.exit(fails.length ? 1 : 0);
