// GoatCounter events for the v13 game: game-start and game-end/<background>/<affiliation>.
// Page views come from the official count.js tag in index.html. This file only watches saves of
// the current game (localStorage "wenshan-campaign-v13") and never sends names, text, policy
// content or save data: only the enumerated identity and party ids. Every step is wrapped so a
// blocked or broken counter can never change how the game saves or plays.
(function () {
  'use strict';
  var KEY = 'wenshan-campaign-v13', SENT = 'gc-sent:';
  var BACKGROUNDS = { newcomer: 1, heir: 1, incumbent: 1 }, PARTIES = { independent: 1, kmt: 1, dpp: 1 };
  var queue = [], timer = null, tries = 0, prev = null, store = null;

  function parse(raw) {
    try { var s = JSON.parse(raw); return s && typeof s === 'object' ? s : null; } catch (_) { return null; }
  }
  function snapshot(s) {
    if (!s) return null;
    var seed = Number(s.seed);
    return {
      started: s.started === true,
      phase: typeof s.phase === 'string' ? s.phase : '',
      seed: Number.isFinite(seed) ? String(seed >>> 0) : '',
      background: s.settings && BACKGROUNDS[s.settings.background] === 1 ? s.settings.background : 'other',
      affiliation: s.settings && PARTIES[s.settings.affiliation] === 1 ? s.settings.affiliation : 'other'
    };
  }
  // One event per game (seed) per tab session: reloads and repeated saves of the same game never resend.
  function once(name, seed) {
    if (!seed) return false;
    var id = SENT + seed + ':' + name;
    try { if (window.sessionStorage.getItem(id)) return false; window.sessionStorage.setItem(id, '1'); } catch (_) { /* no sessionStorage: the transition check still dedupes */ }
    return true;
  }
  function counter() {
    try { var gc = window.goatcounter; return gc && typeof gc.count === 'function' ? gc : null; } catch (_) { return null; }
  }
  function flush() {
    var gc = counter();
    if (!gc) return false;
    while (queue.length) { var e = queue.shift(); try { gc.count(e); } catch (_) { } }
    return true;
  }
  // count.js loads async and may be blocked: retry for about 30 seconds, then give up quietly.
  function schedule() {
    if (timer || !queue.length) return;
    timer = setInterval(function () {
      tries++;
      if (flush() || tries >= 60) { clearInterval(timer); timer = null; if (tries >= 60) queue.length = 0; tries = 0; }
    }, 500);
  }
  function send(path, title) {
    queue.push({ path: path, title: title, event: true });
    if (!flush()) schedule();
  }
  function onSave(raw) {
    var next = snapshot(parse(raw)), before = prev;
    prev = next || prev;
    if (!next) return;
    if (next.started && !(before && before.started && before.seed === next.seed) && once('start', next.seed)) send('game-start', '開始競選');
    if (next.phase === 'result' && !(before && before.phase === 'result' && before.seed === next.seed) && once('end', next.seed)) send('game-end/' + next.background + '/' + next.affiliation, '開票結局');
  }

  try {
    store = window.localStorage;
    prev = snapshot(parse(store.getItem(KEY)));
    var proto = Object.getPrototypeOf(store), original = proto && proto.setItem;
    if (typeof original !== 'function') return;
    proto.setItem = function (key, value) {
      var result = original.apply(this, arguments);
      try { if (this === store && String(key) === KEY) onSave(String(value)); } catch (_) { }
      return result;
    };
  } catch (_) { /* storage unavailable: the game handles that itself, analytics just stays off */ }
})();
