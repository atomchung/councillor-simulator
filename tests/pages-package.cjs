"use strict";
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const assert = require('node:assert/strict'), vm = require('node:vm');
const {buildPages} = require('../scripts/build-pages.cjs');
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'campaign-pages-'));
try {
  const stats = buildPages(output);
  const html = fs.readFileSync(path.join(output, 'index.html'), 'utf8');
  assert.ok(!html.includes('legacy-'));
  for (const old of ['legacy-v12', 'legacy-v5', 'engine.js', 'game.js', 'campaign-engine.js', 'assets/matte-toy-v1/incoming', 'assets/matte-toy-v1/candidates.png']) {
    assert.ok(!fs.existsSync(path.join(output, old)), old + ' excluded');
  }
  // Check rendered art against the artifact, including less common endings,
  // weather, original art mode and the fallback district map.
  const context = {window: {}, console};
  vm.runInNewContext(fs.readFileSync(path.join(output, 'day-art.js'), 'utf8'), context);
  const art = context.window.DayArt, rendered = [art.scene(), art.billboard('kmt')];
  for (const kind of ['market','street','river','temple','plaza','debate','office','tv','online','fundraise']) {
    for (const rain of [false, true]) rendered.push(art.interior(kind, {crowd: [], rain, staff: 4, mode: 'rally'}));
  }
  for (const stage of ['count','elected','refunded','forfeited']) rendered.push(art.countNight(stage));
  for (const identity of ['newcomer','heir','incumbent']) rendered.push(art.portrait({identity}));
  art.walkStep(.2, true); rendered.push(art.avatar('player'));
  art.useDistrictMap(); rendered.push(art.scene());
  art.setPack('original'); rendered.push(art.scene());
  let references = 0;
  for (const markup of [html, ...rendered]) {
    for (const [, url] of markup.matchAll(/(?:src|href|data-art-fallback)="([^"#]+)"/g)) {
      if (url === './' || /^https?:/.test(url)) continue;
      assert.ok(fs.existsSync(path.join(output, url.split(/[?#]/)[0])), 'published dependency ' + url);
      references++;
    }
  }
  assert.ok(stats.bytes < 10 * 1024 * 1024, 'release excludes source deliveries');
  assert.throws(() => buildPages(output), /Output must be empty/);
  console.log(JSON.stringify({result: 'passed', ...stats, references}));
} finally { fs.rmSync(output, {recursive: true, force: true}); }
