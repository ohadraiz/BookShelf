// Checks assets/format.js against data/library.json and against tools/convert.py.
// Run: node tests/format.test.js
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const F = require('../assets/format.js');

const root = path.join(__dirname, '..');
const lib = JSON.parse(fs.readFileSync(path.join(root, 'data', 'library.json'), 'utf8'));
const fails = [];
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// 1. library -> app records -> library gives the same books, shelves and library info
const app = F.fromLibrary(lib);
const info = Object.assign({}, lib.library); delete info.shelves; delete info.yearlyGoal;
const back = F.toLibrary(app.meta, app.books, info, lib.exportedAt);
if (!eq(back.library, lib.library)) fails.push('library section changed');
if (back.books.length !== lib.books.length) fails.push('book count changed');
lib.books.forEach((b, i) => { if (!eq(b, back.books[i])) fails.push('book changed: ' + b.id); });

// 2. the app records match what tools/convert.py to-backup produces
const tmp = path.join(os.tmpdir(), 'bookshelf-backup-' + process.pid + '.json');
const py = spawnSync('python', [path.join(root, 'tools', 'convert.py'), 'to-backup', path.join(root, 'data', 'library.json'), '-o', tmp], { encoding: 'utf8' });
if (py.status !== 0) fails.push('python to-backup failed: ' + py.stderr);
else {
  const pyb = JSON.parse(fs.readFileSync(tmp, 'utf8'));
  fs.unlinkSync(tmp);
  if (!eq(pyb.meta, app.meta)) fails.push('meta differs from python');
  const byId = Object.fromEntries(pyb.books.map(b => [b.id, b]));
  app.books.forEach(b => {
    const p = byId[b.id];
    if (!p) { fails.push('python is missing ' + b.id); return; }
    for (const k of Object.keys(b)) if (!eq(b[k], p[k])) { fails.push(`${b.id}.${k}: js ${JSON.stringify(b[k])} vs python ${JSON.stringify(p[k])}`); break; }
  });
}

// 3. data/library.js holds the same data as data/library.json
const js = fs.readFileSync(path.join(root, 'data', 'library.js'), 'utf8');
const sandbox = {};
new Function('window', js)(sandbox);
if (!eq(sandbox.BOOKSHELF_BASELINE, lib)) fails.push('data/library.js is out of date: run python tools/convert.py to-js data/library.json -o data/library.js');

// 4. a wrong file is refused
let refused = false;
try { F.fromLibrary({ format: 'other' }); } catch (e) { refused = true; }
if (!refused) fails.push('fromLibrary accepted a file that is not bookshelf-library');

console.log(`books ${app.books.length}, shelves ${app.meta.shelves.length}`);
fails.slice(0, 20).forEach(f => console.log('FAIL', f));
console.log(fails.length ? `${fails.length} failed` : 'PASS');
process.exit(fails.length ? 1 : 0);
