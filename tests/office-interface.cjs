"use strict";
// Real controller + shared engine, with a minimal DOM; geometry is verified in a browser.
const fs = require("node:fs"),
  vm = require("node:vm"),
  assert = require("node:assert/strict"),
  path = require("node:path");
const root = path.resolve(__dirname, "../dist"),
  G = require(root + "/day-engine.js"),
  KEY = "campaign-office-playtest-v2";
const html = fs.readFileSync(root + "/office.html", "utf8"),
  source = fs.readFileSync(root + "/office.js", "utf8");
const clone = (x) => JSON.parse(JSON.stringify(x));
let checks = 0;
function ok(value, label) {
  assert.ok(value, label);
  checks++;
}
function eq(a, b, label) {
  assert.deepEqual(clone(a), clone(b), label);
  checks++;
}
function state(seed = 24, background = "heir") {
  const s = G.initial(seed);
  G.configure(s, { background, affiliation: "independent" });
  G.start(s);
  return s;
}
function harness(initial, opts = {}) {
  const saved = { ...(initial ? { [KEY]: JSON.stringify(initial) } : {}), ...(opts.extraSaved || {}) },
    nodes = {},
    timers = new Map(),
    events = {},
    audio = { starts: 0, contexts: 0, resumes: 0 };
  let serial = 0,
    doc;
  function element(id = "") {
    const classes = new Set();
    return {
      id,
      open: false,
      hidden: false,
      disabled: false,
      dataset: {},
      attributes: {},
      children: [],
      textContent: "",
      innerHTML: "",
      isConnected: true,
      style: {
        setProperty(k, v) {
          this[k] = v;
        },
      },
      classList: {
        add(...a) {
          a.forEach((x) => classes.add(x));
        },
        remove(...a) {
          a.forEach((x) => classes.delete(x));
        },
        contains: (k) => classes.has(k),
        toggle(k, b) {
          if (b ?? !classes.has(k)) classes.add(k);
          else classes.delete(k);
        },
      },
      setAttribute(k, v) {
        this.attributes[k] = String(v);
      },
      getAttribute(k) {
        return this.attributes[k];
      },
      focus() {
        doc.activeElement = this;
      },
      append(...n) {
        this.children.push(...n);
      },
      replaceChildren(...n) {
        this.children = n;
      },
      querySelector(sel) {
        return (nodes[id + sel] ??= element(id + sel));
      },
      querySelectorAll() {
        return this.children;
      },
      addEventListener(k, f) {
        (this.events ??= {})[k] = f;
      },
      showModal() {
        this.open = true;
      },
      close() {
        if (!this.open) return;
        this.open = false;
        this.events?.close?.();
      },
      closest() {
        return this;
      },
    };
  }
  for (const [, id] of html.matchAll(/id="([^"]+)"/g)) nodes[id] = element(id);
  nodes.dialogue.classList.add("hidden");
  doc = {
    hidden: false,
    activeElement: null,
    getElementById: (id) => (nodes[id] ??= element(id)),
    createElement: () => element(),
    querySelector: (sel) => (nodes[sel] ??= element(sel)),
    querySelectorAll: () => [],
    addEventListener(k, f) {
      (events[k] ??= []).push(f);
    },
  };
  // Minimal Web Audio mock; real day-sound.js runs against it when opts.realSound is set.
  const audioNode = () => ({
    gain: { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {} },
    frequency: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} },
    connect() {},
    disconnect() {},
    start() { audio.starts++; },
    stop() {},
  });
  class AudioContext {
    constructor() {
      audio.contexts++;
      this.sampleRate = 100;
      this.currentTime = 0;
      this.state = "suspended";
      this.destination = {};
    }
    createBuffer() {
      const data = new Float32Array(300);
      return { getChannelData: () => data };
    }
    createGain() { return audioNode(); }
    createOscillator() { return audioNode(); }
    createBufferSource() { return audioNode(); }
    createBiquadFilter() { return audioNode(); }
    resume() {
      this.state = "running";
      audio.resumes++;
      return Promise.resolve();
    }
    suspend() {
      this.state = "suspended";
      return Promise.resolve();
    }
  }
  const storage = {
    getItem: (k) => saved[k] || null,
    setItem(k, v) {
      if (opts.storageError) throw Error("blocked");
      saved[k] = v;
    },
  };
  const ctx = {
    window: {
      DayGame: G,
      ...(opts.realSound
        ? {
            AudioContext,
            localStorage: undefined,
            navigator: { audioSession: { type: "auto" } },
            setTimeout: (f, ms) => timers.set(++serial, { f, ms }) && serial,
            clearTimeout: (id) => timers.delete(id),
            addEventListener() {},
          }
        : {}),
      ...(opts.soundStub ? { DaySound: opts.soundStub } : {}),
    },
    document: doc,
    localStorage: storage,
    console,
    performance: { now: () => 0 },
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    setTimeout: (f, ms) => {
      timers.set(++serial, { f, ms });
      return serial;
    },
    clearTimeout: (id) => timers.delete(id),
    requestAnimationFrame: () => ++serial,
    cancelAnimationFrame() {},
    Math,
    Float32Array,
  };
  ctx.window.localStorage ??= opts.realSound ? storage : undefined;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(root + "/day-art.js", "utf8"), ctx);
  if (opts.realSound)
    vm.runInContext(fs.readFileSync(root + "/day-sound.js", "utf8"), ctx, { filename: "day-sound.js" });
  vm.runInContext(source, ctx, { filename: "office.js" });
  const run = (code) => vm.runInContext(code, ctx);
  return {
    nodes,
    saved,
    audio,
    doc,
    run,
    state: () => clone(run("s")),
    config: () => clone(run("cfg")),
    flush() {
      const batch = [...timers.values()];
      timers.clear();
      for (const x of batch) x.f();
    },
    click(data) {
      const b = element();
      b.dataset = data;
      for (const f of events.click || []) f({ target: b, isTrusted: true });
    },
    footer() {
      const b = nodes["sheet-foot"].children[0];
      assert.ok(b && !b.disabled, "enabled primary action");
      b.onclick();
    },
    snapshot: () => JSON.parse(saved[KEY]),
    emit(k) {
      for (const f of events[k] || []) f({ target: element() });
    },
  };
}
// Identity/party are real game settings; cancellation keeps an existing campaign intact.
{
  const h = harness({
    s: state(),
    cfg: { research: [] },
    action: null,
    tutorialDone: true,
  });
  const before = h.state();
  h.run("newGame()");
  h.click({ action: "identity", id: "incumbent" });
  h.click({ action: "party", id: "dpp" });
  ok(
    h.nodes["sheet-body"].innerHTML.includes("老柯"),
    "selected party updates all names",
  );
  h.run("closePanel()");
  eq(h.state(), before, "cancel preserves campaign");
  h.run("newGame()");
  h.click({ action: "identity", id: "incumbent" });
  h.click({ action: "party", id: "dpp" });
  h.footer();
  eq(
    h.state().settings,
    { background: "incumbent", affiliation: "dpp" },
    "start applies both settings",
  );
  ok(
    h.nodes["office-sign"].textContent.startsWith("老柯"),
    "office sign follows character",
  );
  eq(h.run("tutorialDone"), false, "new game resets tutorial");
}
// Catalog is grouped but all former actions remain reachable.
{
  const h = harness({
    s: state(),
    cfg: { research: [] },
    action: null,
    tutorialDone: true,
  });
  h.run("catalog()");
  ok(
    !h.nodes["sheet-body"].innerHTML.includes('data-id="tv"'),
    "TV not dumped in first catalog",
  );
  h.click({ action: "category", id: "publicity" });
  for (const id of ["rally", "tv", "online"])
    ok(
      h.nodes["sheet-body"].innerHTML.includes('data-id="' + id + '"'),
      id + " available in publicity",
    );
  h.click({ open: "teamhub" });
  for (const label of ["招募一位助手", "地方小隊", "安排 2 位助手"])
    ok(h.nodes["sheet-body"].innerHTML.includes(label), "team hub " + label);
  h.click({ action: "category", id: "intel" });
  ok(
    h.nodes["sheet-body"].innerHTML.includes("查證手上的資料"),
    "verification visible with intelligence",
  );
}
// Consecutive research selection stays in the same panel and cannot exceed capacity.
{
  const h = harness({
    s: state(),
    cfg: { research: [] },
    action: null,
    tutorialDone: true,
  });
  h.run("choose('canvass',{venue:'street'});team()");
  const title = h.nodes["sheet-title"].textContent;
  for (const id of ["health", "childcare", "housing"])
    h.click({ action: "research", id });
  eq(h.config().research, ["health", "childcare"], "third assignment refused");
  eq(
    h.nodes["sheet-title"].textContent,
    title,
    "research selection does not jump away",
  );
}
// One primary click begins travel; a second click and stale completion cannot spend another round.
{
  const base = state(),
    h = harness({
      s: clone(base),
      cfg: { research: [] },
      action: null,
      tutorialDone: true,
    });
  h.run("choose('canvass',{venue:'street'})");
  ok(
    h.nodes["sheet-foot"].children[0].textContent.includes("出門去保儀路口"),
    "destination on the committing action",
  );
  h.footer();
  eq(
    h.state().phase,
    "travel",
    "one click commits without another confirmation",
  );
  const after = clone(h.state());
  h.run("depart()");
  eq(h.state(), after, "double departure ignored");
  h.run("finishTravel()");
  eq(h.state().phase, "question", "map travel reaches question");
  ok(
    h.nodes["venue-scene"].innerHTML.includes("street-residential-v2.webp"),
    "street uses original street art",
  );
  ok(
    (h.nodes["venue-scene"].innerHTML.match(/toy-figure/g) || []).length >= 8,
    "original residents restored",
  );
  const q = G.question(h.state()),
    answer = q.options.find((o) => o.unlocked);
  h.run("G.answer(s," + JSON.stringify(answer.id) + ");recap()");
  eq(
    [h.state().day, h.state().phase],
    [2, "plan"],
    "answer advances directly to next planning round",
  );
  const settled = clone(h.state());
  h.run("finishTravel();recap();advance()");
  eq(h.state(), settled, "stale callbacks cannot settle twice");
  ok(
    h.nodes["round-change"].textContent.includes("上回合"),
    "prior result stays visible in next round",
  );
  const reload = harness(h.snapshot());
  eq(reload.state(), settled, "reload preserves result exactly");
  // Same actions through the bare engine produce the identical campaign state.
  G.begin(base, "canvass", { research: [], booth: false, venue: "street" });
  G.arrive(base);
  G.answer(base, answer.id);
  G.next(base);
  eq(h.state(), base, "UI flow does not change engine votes or randomness");
}
// A new-game dialog during travel can be cancelled without stranding the journey.
{
  const h = harness({ s: state(), cfg: {}, action: null, tutorialDone: true });
  h.run("choose('canvass');depart();newGame()");
  const b = h.state().budget.available;
  h.run("closePanel();finishTravel()");
  eq(h.state().phase, "question", "cancel resumes paused travel");
  eq(h.state().budget.available, b, "cancel does not charge twice");
}
// Pending visitors enter without an extra knock click; dismissal persists across reload.
{
  let s;
  for (let seed = 1; seed < 30; seed++) {
    const x = state(seed);
    G.begin(x, "fundraise", {});
    G.arrive(x);
    G.next(x);
    if (G.offerView(x)) {
      s = x;
      break;
    }
  }
  ok(s, "real round-two invitation fixture");
  const h = harness({ s, cfg: {}, action: null, tutorialDone: true });
  h.flush();
  ok(
    !h.nodes.dialogue.classList.contains("hidden"),
    "automatic visitor dialogue",
  );
  ok(
    h.nodes.line.textContent.includes(G.offerView(s).pitch),
    "actual current invitation only",
  );
  eq(h.state().day, 2, "hearing invitation does not spend a turn");
}
// Settings entry, single sound switch and shared-audio wiring.
const rainState = Array.from({ length: 100 }, (_, i) => state(i)).find(
  (s) => G.weather(s).id === "rain",
);
ok(rainState, "rain fixture");
const stubFor = (calls, on = { v: true }) => ({
  enabled: () => on.v,
  play: (...a) => calls.push(["play", ...a]),
  startLoop: (n) => calls.push(["startLoop", n]),
  stopLoop: (n) => calls.push(["stopLoop", n]),
  setEnabled: (v) => {
    on.v = !!v;
    calls.push(["setEnabled", !!v]);
  },
});
{
  const h = harness({ s: rainState, cfg: {}, action: null, tutorialDone: true });
  ok(h.nodes.room.classList.contains("rainy"), "actual rain switches glass overlay");
  eq(h.audio.contexts, 0, "office never creates its own AudioContext");
  ok(!/new\s+AC\b|window\.AudioContext|createBufferSource/.test(source), "office.js has no private rain synth");
}
{
  const calls = [];
  const h = harness({ s: rainState, cfg: {}, action: null, tutorialDone: true }, { soundStub: stubFor(calls) });
  ok(calls.some((c) => c[0] === "startLoop" && c[1] === "rain"), "rainy round starts the shared rain loop");
  // HUD: round and funds together, no calendar/ledger text props left.
  eq(h.nodes["hud-round"].textContent, "第 " + rainState.day + " / " + G.DAYS + " 回合 · 雨", "HUD round shows rain");
  ok(h.nodes["hud-funds"].textContent.startsWith("競選經費 "), "HUD funds label");
  ok(!/id="calendar-round"|id="ledger-money"|id="weather-label"/.test(html), "calendar and ledger text props removed");
  ok(html.includes('id="settings-open"') && html.indexOf('id="settings-open"') < html.indexOf('id="scene"'), "gear in top bar");
  // Settings: main screen no longer carries the controls.
  const main = html.slice(0, html.indexOf('<dialog class="sheet settings"'));
  ok(!main.includes('id="sound-toggle"') && !main.includes('id="restart"'), "controls moved out of main screen");
  ok(html.indexOf('id="sound-toggle"') > html.indexOf('id="settings"'), "sound switch lives in settings");
  h.nodes["settings-open"].onclick();
  ok(h.nodes.settings.open, "gear opens settings");
  eq(h.nodes["sound-state"].textContent, "開", "sound defaults on");
  h.nodes["sound-toggle"].onclick();
  ok(calls.some((c) => c[0] === "setEnabled" && c[1] === false), "toggle mutes shared module");
  eq(h.nodes["sound-state"].textContent, "關", "label follows");
  eq(h.nodes["sound-toggle"].attributes["aria-pressed"], "false", "pressed state follows");
  h.nodes["settings-close"].onclick();
  ok(!h.nodes.settings.open, "settings close");
  // New game stays confirm-first: restart closes settings, opens picker, cancel keeps the campaign.
  const before = h.state();
  h.nodes["settings-open"].onclick();
  h.nodes.restart.onclick();
  ok(!h.nodes.settings.open && h.nodes.sheet.open, "new game opens the character picker");
  h.run("closePanel()");
  eq(h.state(), before, "cancelling new game keeps the campaign");
}
{
  // Real shared module: preference persists in the same key as the main game; first click unlocks.
  const h = harness({ s: rainState, cfg: {}, action: null, tutorialDone: true }, { realSound: true });
  eq(h.audio.contexts, 0, "no AudioContext before a trusted click");
  h.click({ action: "x" });
  eq(h.audio.contexts, 1, "first trusted click creates the context");
  ok(h.audio.starts >= 1, "silent unlock buffer started inside the same click");
  h.nodes["sound-toggle"].onclick();
  eq(h.saved["wenshan-sound"], "off", "sound preference persists under the shared key");
  eq(h.nodes["sound-state"].textContent, "關", "label shows off");
  const reloaded = harness(
    { s: rainState, cfg: {}, action: null, tutorialDone: true },
    { realSound: true, extraSaved: { "wenshan-sound": "off" } },
  );
  eq(reloaded.nodes["sound-state"].textContent, "關", "off survives reload");
}
{
  // Event wiring: departure, steps, question, result, ending, crisis, rival; each once.
  const calls = [];
  const h = harness({ s: state(), cfg: { research: [] }, action: null, tutorialDone: true }, { soundStub: stubFor(calls) });
  const count = (n) => calls.filter((c) => c[0] === "play" && c[1] === n).length;
  h.click({ action: "noop" });
  ok(count("click") >= 1, "button tap cue");
  h.run("choose('canvass',{venue:'market'});depart()");
  eq(count("depart"), 1, "departure cue once");
  ok(calls.some((c) => c[0] === "startLoop" && c[1] === "steps"), "footsteps start while travelling");
  h.run("finishTravel()");
  ok(calls.filter((c) => c[0] === "stopLoop" && c[1] === "steps").length >= 1, "footsteps stop on arrival");
  eq(count("question"), 1, "question pop once");
  h.run("{const q=G.question(s);G.answer(s,q.options.find(o=>o.unlocked).id);recap();recap()}");
  eq(count("positive") + count("negative"), 1, "result cue exactly once per recap");
  const r = h.state().journal.at(-1);
  eq(count(r.totalVotes >= 0 ? "positive" : "negative"), 1, "cue matches vote sign");
  eq(count("rival"), r.rival?.attack || r.rival?.challenge ? 1 : 0, "rival cue only when attacked");
  calls.length = 0;
  const hc = harness({ s: state(), cfg: { research: [] }, action: null, tutorialDone: true }, { soundStub: stubFor(calls) });
  hc.run("s.crisis={status:'pending',text:'test crisis',id:'c1'};inbox();inbox()");
  eq(calls.filter((c) => c[0] === "play" && c[1] === "crisis").length, 1, "crisis sting once per crisis");
  calls.length = 0;
  const e = state(5);
  const he = harness({ s: e, cfg: { research: [] }, action: null, tutorialDone: true }, { soundStub: stubFor(calls) });
  for (let d = 1; d <= G.DAYS; d++) he.run("choose('fundraise');depart();finishTravel()");
  he.run("result();result()");
  eq(calls.filter((c) => c[0] === "play" && ["win", "lose"].includes(c[1])).length, 1, "ending cue once");
}
{
  // Audio failure never blocks play.
  const bad = { enabled() { throw Error("x"); }, play() { throw Error("x"); }, startLoop() { throw Error("x"); }, stopLoop() { throw Error("x"); }, setEnabled() { throw Error("x"); } };
  const h = harness({ s: state(), cfg: {}, action: null, tutorialDone: true }, { soundStub: bad });
  h.run("choose('fundraise');depart();finishTravel()");
  eq(h.state().day, 2, "throwing audio module still plays a round");
  const none = harness({ s: state(), cfg: {}, action: null, tutorialDone: true });
  none.nodes["settings-open"].onclick();
  none.nodes["sound-toggle"].onclick();
  none.run("choose('fundraise');depart();finishTravel()");
  eq(none.state().day, 2, "no audio module still plays a round");
}
{
  const h = harness(
    { s: state(), cfg: {}, action: null, tutorialDone: true },
    { storageError: true },
  );
  h.run("choose('fundraise');depart();finishTravel()");
  eq(h.state().day, 2, "storage failure still allows play");
}
// Full nine-round controller journeys preserve the shared engine outcome for every identity.
for (const background of ["newcomer", "heir", "incumbent"]) {
  for (const seed of [1, 7, 24]) {
    const baseline = state(seed, background);
    G.upgrade(baseline);
    const h = harness({
      s: clone(baseline),
      cfg: { research: [] },
      action: null,
      tutorialDone: true,
    });
    for (let round = 1; round <= G.DAYS; round++) {
      if (baseline.crisis?.status === "pending") {
        G.respondCrisis(baseline, "apologize");
        h.run("handleCrisis('apologize')");
      }
      G.begin(baseline, "fundraise", { research: [], booth: false });
      G.arrive(baseline);
      G.next(baseline);
      h.run("choose('fundraise');depart();finishTravel()");
      eq(
        h.state().day,
        baseline.day,
        background + " round " + round + " advances once",
      );
    }
    eq(
      h.state().result,
      baseline.result,
      background + " exact final tally seed " + seed,
    );
    eq(
      h.state().journal,
      baseline.journal,
      background + " exact nine-round history seed " + seed,
    );
    const loaded = harness(h.snapshot());
    eq(
      loaded.state().result,
      baseline.result,
      "result reload does not draw election twice",
    );
  }
}
console.log(JSON.stringify({ result: "passed", assertions: checks }));
