/* Synthesized game feedback. No media files, gameplay state or game RNG. */
(function () {
  'use strict';
  const KEY = 'wenshan-sound', MASTER = .35;
  // 'ambient' follows the iPhone silent switch (silent = no sound); 'playback' plays even when the switch is on silent.
  const AUDIO_SESSION = 'ambient';
  let on = true, context = null, master = null, room = null, interacted = false, seed = 1, progress = 0, resuming = false;
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
    source.connect(filter || gain); if (filter) filter.connect(gain); gain.connect(master); if (room) safely(() => gain.connect(room));
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
      safely(() => { if (name === 'count') tone(1320, 1320, .04, .02, 0, name); });
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
      master = context.createGain(); master.gain.value = MASTER;
      // A gentle compressor and a short synthetic room give the cues body instead of a dry beep.
      const out = safely(() => { const c = context.createDynamicsCompressor(); c.threshold.value = -18; c.ratio.value = 3; c.connect(context.destination); return c; }) || context.destination;
      master.connect(out);
      room = safely(() => {
        const conv = context.createConvolver(), len = Math.ceil(context.sampleRate * 1.6), ir = context.createBuffer(2, len, context.sampleRate), rng = random('room');
        for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (rng() * 2 - 1) * Math.pow(1 - i / len, 3); }
        conv.buffer = ir; const wet = context.createGain(); wet.gain.value = .28; conv.connect(wet); wet.connect(out); return conv;
      }) || null;
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
    // Only moments that tell the player something make a sound: a good or bad round, a crisis, the count and its verdict.
    const N = { A2: 110, D3: 146.8, E3: 164.8, F3: 174.6, A3: 220, Bb3: 233.1, C4: 261.6, E4: 329.6, G4: 392, C5: 523.3, E5: 659.3, G5: 784, C6: 1046.5 };
    // FM bell: a sine whose brightness fades with the note, like a struck chime.
    const bell = (f, at = 0, vol = .08, len = 1.4) => {
      const t = context.currentTime + delay + at, mod = context.createOscillator(), depth = context.createGain(), car = context.createOscillator();
      mod.frequency.value = f * 3.5; depth.gain.setValueAtTime(f * 2.2, t); depth.gain.exponentialRampToValueAtTime(1, t + len * .6);
      car.frequency.value = f; mod.connect(depth); depth.connect(car.frequency); mod.start(t); mod.stop(t + len + .05);
      voice(car, len, vol, delay + at);
    };
    // Soft low tone for setbacks: rounded, no buzz.
    const low = (f, at = 0, vol = .1, len = .7) => { const o = context.createOscillator(); o.type = 'triangle'; o.frequency.value = f; const lp = context.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700; voice(o, len, vol, delay + at, '', lp); };
    if (name === 'positive') { bell(N.C5, 0, .07); bell(N.E5, .1, .07); bell(N.G5, .2, .08, 1.8); }
    else if (name === 'negative') { low(N.E3, 0, .11, .5); low(N.C4 / 2, .18, .11, .9); }
    else if (name === 'crisis') { for (let i = 0; i < 4; i++) { low(N.A2, i * .22, .12, .2); low(N.Bb3 / 2, i * .22, .07, .2); } bell(N.E4, .9, .05, 1.6); }
    else if (name === 'draw') bell(N.C6, 0, .05, .6);
    else if (name === 'win') { [N.C5, N.E5, N.G5, N.C6].forEach((f, i) => bell(f, i * .14, .08, 2.2)); low(N.C4 / 2, .56, .1, 1.6); }
    else if (name === 'lose') { low(N.A3, 0, .1, .8); low(N.F3, .35, .1, .8); low(N.D3, .7, .11, 1.6); }
    else if (name === 'stamp') low(N.A2, .04, .14, .3);
  }
  function startLoop(name) { if (!on || !['steps', 'count'].includes(name)) return; if (!loops.has(name)) loops.set(name, { active: false, timer: null }); runLoop(name); }
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
