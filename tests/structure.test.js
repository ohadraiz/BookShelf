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

// install as an app (PWA): manifest, icons and service worker
const man = html.match(/<link rel="manifest" href="([^"]+)">/);
if (!man) fails.push('app.html has no <link rel="manifest">');
else {
  try {
    const m = JSON.parse(fs.readFileSync(path.join(root, man[1]), 'utf8'));
    for (const k of ['name', 'short_name', 'start_url', 'display', 'icons']) if (!m[k]) fails.push('manifest is missing ' + k);
    const sizes = (m.icons || []).map(i => i.sizes);
    for (const s of ['192x192', '512x512']) if (!sizes.includes(s)) fails.push('manifest needs a ' + s + ' icon');
    for (const i of m.icons || []) if (!fs.existsSync(path.join(root, i.src))) fails.push('missing icon ' + i.src);
  } catch (e) { fails.push('manifest: ' + e.message); }
}
for (const f of [...html.matchAll(/<link rel="(?:icon|apple-touch-icon)" href="([^"]+)"/g)].map(m => m[1])) {
  if (!fs.existsSync(path.join(root, f))) fails.push('missing icon ' + f);
}
try { new vm.Script(fs.readFileSync(path.join(root, 'sw.js'), 'utf8'), { filename: 'sw.js' }); }
catch (e) { fails.push('sw.js: ' + e.message); }

console.log(`app scripts ${appFiles.length}, styles ${styles.length}`);
fails.forEach(f => console.log('FAIL', f));
console.log(fails.length ? `${fails.length} failed` : 'PASS');
process.exit(fails.length ? 1 : 0);
