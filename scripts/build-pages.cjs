"use strict";
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const source = path.join(root, 'dist');

// Publish only the current entrypoint and its runtime. Historical games and
// source artwork stay in the repository for regression tests, never in Pages.
function releaseFiles() {
  const html = fs.readFileSync(path.join(source, 'index.html'), 'utf8');
  const files = new Set(['index.html']);
  for (const [, url] of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
    if (url === './' || /^https?:/.test(url)) continue;
    const file = url.split(/[?#]/)[0];
    if (!/^[a-z][a-z0-9-]*\.(js|css)$/.test(file)) throw Error('Unexpected entry dependency: ' + file);
    files.add(file);
  }
  const context = {window: {}, console};
  vm.runInNewContext(fs.readFileSync(path.join(source, 'day-art.js'), 'utf8'), context, {timeout: 5000});
  const art = context.window.DayArt;
  // Registries include rain scenes, animation sheets and fallback images that
  // may not load during a normal first visit. Render the map to resolve its kit.
  for (const registry of [art.files, art.visits, art.rain, art.toyScenes]) {
    for (const file of Object.values(registry)) files.add('assets/matte-toy-v1/' + file);
  }
  for (const [, file] of art.scene().matchAll(/(?:src|href)="(assets\/[^"?#]+)"/g)) files.add(file);
  for (const file of files) {
    if (file.includes('..') || !fs.statSync(path.join(source, file)).isFile()) throw Error('Invalid runtime file: ' + file);
  }
  return [...files].sort();
}

function buildPages(output = path.join(root, '.pages')) {
  const files = releaseFiles();
  // Callers provide a new/empty staging directory; never recursively erase an
  // arbitrary path or leave obsolete files behind in a reused artifact.
  if (fs.existsSync(output) && fs.readdirSync(output).length) throw Error('Output must be empty: ' + output);
  fs.mkdirSync(output, {recursive: true});
  let bytes = 0;
  for (const file of files) {
    const target = path.join(output, file);
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.copyFileSync(path.join(source, file), target);
    bytes += fs.statSync(target).size;
  }
  return {files: files.length, bytes};
}
module.exports = {releaseFiles, buildPages};
if (require.main === module) console.log(JSON.stringify(buildPages()));
