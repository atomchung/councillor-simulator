/* Synthesized game feedback. No media files, gameplay state or game RNG. */
(function () {
  'use strict';
  const KEY = 'wenshan-sound', MASTER = .35;
  // 'ambient' follows the iPhone silent switch (silent = no sound); 'playback' plays even when the switch is on silent.
  const AUDIO_SESSION = 'ambient';
  let on = true, context = null, master = null, interacted = false, seed = 1, progress = 0, resuming = false;
  let pending = [];
  const voices = new Set(), loops = new Map();
  try { on = window.localStorage.getItem(KEY) !== 'off'; } catch (_) {}
  const safely = fn => { try { return fn(); } catch (_) { return undefined; } };
  const settle = promise => promise?.catch?.(() => {});
  function ready() { return on && interacted && context && context.state === 'running' && !document.hidden; }
  function random(key) {
    let value = (Number(seed) >>> 0) || 1;
    for (const char of key) value = Math.imul(value ^ char.charCodeAt(0), 16777619) >>> 0;
    return () => { value ^= value << 13; value ^= value >>> 17; value ^= value << 5; return (value >>> 0) / 4294967296; };
  }
  function remove(v) { voices.delete(v); safely(() => v.source.disconnect()); safely(() => v.gain.disconnect()); safely(() => v.filter?.disconnect()); }
  function stopVoice(v, fade = 0) {
    safely(() => { const t = context.currentTime; v.gain.gain.cancelScheduledValues(t); v.gain.gain.setValueAtTime(v.gain.gain.value, t); v.gain.gain.linearRampToValueAtTime(0, t + fade); v.source.stop(t + fade); });
    if (!fade) remove(v);
  }
  function voice(source, duration, volume, delay = 0, tag = '', filter = null) {
    const t = context.currentTime + delay, gain = context.createGain(), v = { source, gain, filter, tag };
    source.connect(filter || gain); if (filter) filter.connect(gain); gain.connect(master);
    gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(volume, t + Math.min(.008, duration / 4));
    if (Number.isFinite(duration)) gain.gain.exponentialRampToValueAtTime(.0001, t + duration);
    voices.add(v); source.onended = () => remove(v); source.start(t); if (Number.isFinite(duration)) source.stop(t + duration + .01); return v;
  }
  function tone(from, to, duration, volume, delay = 0, tag = '') {
    const source = context.createOscillator(), t = context.currentTime + delay;
    source.type = 'sine'; source.frequency.setValueAtTime(from, t); source.frequency.exponentialRampToValueAtTime(to, t + duration);
    return voice(source, duration, volume, delay, tag);
  }
  function noise(duration, volume, delay = 0, tag = '', cutoff = 1800, repeat = false) {
    const source = context.createBufferSource(), buffer = context.createBuffer(1, Math.ceil(context.sampleRate * (repeat ? 2 : duration)), context.sampleRate), data = buffer.getChannelData(0), rng = random(tag);
    for (let i = 0; i < data.length; i++) data[i] = rng() * 2 - 1;
    source.buffer = buffer; source.loop = repeat;
    const filter = context.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = cutoff;
    return voice(source, repeat ? Infinity : duration, volume, delay, tag, filter);
  }
  function silence() {
    pending = [];
    for (const loop of loops.values()) { window.clearTimeout(loop.timer); loop.timer = null; loop.active = false; }
    for (const v of [...voices]) stopVoice(v);
  }
  function runLoop(name) {
    const loop = loops.get(name); if (!loop || loop.active || !ready()) return;
    loop.active = true;
    if (name === 'rain') { noise(2, .055, 0, name, 1100, true); return; }
    const beat = () => {
      loop.timer = null;
      if (loops.get(name) !== loop || !ready()) { loop.active = false; return; }
      safely(() => name === 'steps' ? noise(.065, .055, 0, name, 650) : tone(140, 65, .045, .09, 0, name));
      loop.timer = window.setTimeout(beat, name === 'steps' ? 350 : 220 - 170 * progress);
    };
    beat();
  }
  function resume() {
    if (!on || !interacted || document.hidden) return;
    if (!context) {
      const Audio = window.AudioContext || window.webkitAudioContext; if (!Audio) return;
      // Ambient respects the iPhone silent switch; never opt into media playback.
      safely(() => { if (window.navigator?.audioSession) window.navigator.audioSession.type = AUDIO_SESSION; });
      context = new Audio();
      // iOS unlock: start a 1-sample silent buffer inside this same trusted gesture.
      safely(() => { const unlock = context.createBufferSource(); unlock.buffer = context.createBuffer(1, 1, 22050); unlock.connect(context.destination); unlock.start(0); });
      master = context.createGain(); master.gain.value = MASTER; master.connect(context.destination);
    }
    if (context.state === 'running') { for (const name of loops.keys()) runLoop(name); return; }
    if (resuming) return;
    resuming = true;
    settle(context.resume().then(() => {
      resuming = false; const cues = pending; pending = [];
      if (ready()) { for (const cue of cues) safely(() => play(cue.name, cue.opts)); for (const name of loops.keys()) safely(() => runLoop(name)); }
      else if (document.hidden || !on) settle(context.suspend());
    }, () => { resuming = false; pending = []; }));
  }
  function play(name, opts = {}) {
    if (Number.isFinite(opts.seed)) seed = opts.seed;
    if (name === 'count') { progress = Math.max(0, Math.min(1, Number(opts.progress) || 0)); return; }
    if (name === 'seed') return;
    if (!ready()) {
      if (on && interacted && resuming && !document.hidden && pending.length < 4) pending.push({ name, opts: { ...opts } });
      return;
    }
    const delay = Math.max(0, Math.min(.5, Number(opts.delay) || 0));
    if (name === 'click') tone(700, 420, .028, .035);
    else if (name === 'depart') tone(220, 650, .16, .1);
    else if (name === 'question') tone(480, 820, .10, .075);
    else if (name === 'positive') { tone(440, 440, .12, .1); tone(660, 660, .18, .1, .12); }
    else if (name === 'negative') tone(170, 100, .22, .12);
    else if (name === 'rival') { tone(150, 135, .12, .12); tone(125, 110, .17, .12, .17); }
    else if (name === 'crisis') { tone(233, 233, .34, .1); tone(247, 247, .34, .1); tone(92, 70, .5, .14, .12); }
    else if (name === 'draw') noise(.045, .16, delay, 'draw', 1700);
    else if (name === 'win') {
      tone(110, 45, .32, .25);
      const rng = random('firecrackers');
      for (let i = 0; i < 18; i++) noise(.025 + rng() * .035, .1 + rng() * .08, .04 + i * .08, 'firecracker-' + i, 2600);
    } else if (name === 'lose') tone(200, 65, .7, .18);
    else if (name === 'stamp') { noise(.09, .14, .04, 'stamp', 900); tone(95, 55, .12, .1, .04); }
  }
  function startLoop(name) { if (!on || !['steps', 'rain', 'count'].includes(name)) return; if (!loops.has(name)) loops.set(name, { active: false, timer: null }); runLoop(name); }
  function stopLoop(name) { pending = pending.filter(cue => cue.name !== name); const loop = loops.get(name); if (loop) window.clearTimeout(loop.timer); loops.delete(name); for (const v of [...voices]) if (v.tag === name) stopVoice(v, name === 'rain' && !document.hidden ? .18 : 0); }
  function setEnabled(value) { on = !!value; safely(() => window.localStorage.setItem(KEY, on ? 'on' : 'off')); if (!on) { silence(); loops.clear(); if (context) settle(context.suspend()); } else resume(); }
  document.addEventListener('click', event => {
    if (!event.isTrusted) return;
    interacted = true;
    // Turning sound off must not create a context on that very first click.
    if (event.target?.closest?.('[data-action="sound-toggle"]')?.dataset?.action === 'sound-toggle' && on) return;
    safely(resume);
  }, true);
  document.addEventListener('touchend', event => { if (!event.isTrusted || event.target?.closest?.('[data-action="sound-toggle"]')) return; interacted = true; safely(resume); }, true);
  document.addEventListener('visibilitychange', () => safely(() => { if (document.hidden) { silence(); if (context) settle(context.suspend()); } else resume(); }));
  window.addEventListener('pagehide', () => safely(() => { silence(); if (context) settle(context.suspend()); }));
  window.DaySound = Object.freeze({ play: (name, opts) => safely(() => play(name, opts)), startLoop: name => safely(() => startLoop(name)), stopLoop: name => safely(() => stopLoop(name)), setEnabled: value => safely(() => setEnabled(value)), enabled: () => on });
})();
