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
      const b = nodes["sheet-foot"].children.at(-1);
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
  for (const label of ["招募一位助手", "地方小隊", "派 2 位助手"])
    ok(h.nodes["sheet-body"].innerHTML.includes(label), "team hub " + label);
  h.click({ action: "category", id: "intel" });
  ok(
    h.nodes["sheet-body"].innerHTML.includes("查證手上的資料"),
    "verification visible with intelligence",
  );
}
// Tutorial is at most three short beats and names parallel assistant research early.
{
  const h = harness({
    s: state(24, "newcomer"),
    cfg: { research: [] },
    action: null,
    tutorialDone: false,
  });
  const beats = [];
  h.run("tutorial(0)");
  for (let i = 0; i < 3; i++) {
    beats.push(h.nodes.sub.textContent);
    ok(
      [...h.nodes.sub.textContent].length <= 25,
      "tutorial beat " + (i + 1) + " body stays short",
    );
    if (i < 2) h.nodes.actions.children[0].onclick();
  }
  ok(
    h.nodes.line.textContent.includes("第一步") && h.run("tutorialDone"),
    "third beat is the last and picks the first step",
  );
  ok(
    beats[1].includes("不占你的行程"),
    "second beat says assistant research runs alongside your action",
  );
}
// 小葉 assigns every free assistant to research by default; the player can still change it.
{
  const h = harness({
    s: state(24, "newcomer"),
    cfg: { research: [] },
    action: null,
    tutorialDone: true,
  });
  h.run("choose('canvass',{venue:'market'})");
  const auto = h.config().research;
  eq(auto.length, 2, "both assistants assigned by default");
  const pool = h.run("G.venueView(s).find(v=>v.id==='market').pool");
  const known = h.run("s.player.known");
  ok(auto.every((t) => !known.includes(t)), "auto research skips known topics");
  ok(!pool.some((t) => !known.includes(t)) || pool.includes(auto[0]), "auto research starts with the venue's unknown topics");
  ok(h.nodes["sheet-body"].innerHTML.includes("已派："), "plan detail shows the assignment");
  h.run("choose('prepare',{topic:" + JSON.stringify(auto[0]) + "})");
  ok(!h.config().research.includes(auto[0]), "assistants never duplicate the player's own research");
  eq(h.config().research.length, 2, "assistants topped up after changing action");
  // Opening advice: with nothing researched at a venue, 小葉 says prepare first instead of a blind street visit.
  const fresh = harness({ s: state(1, "heir"), cfg: { research: [] }, action: null, tutorialDone: true });
  const a = fresh.run("advice()");
  if (fresh.run("G.venueView(s).every(v=>!v.pool.some(t=>s.player.known.includes(t)))"))
    ok(/先查/.test(a.pick.text), "no researched venue: 小葉 recommends preparing first");
  ok(/離當選線|當選線上/.test(a.title), "advice states the vote gap");
  // Debate day: 小葉 sends the player to the debate.
  const debate = harness({ s: state(24, "newcomer"), cfg: { research: [] }, action: null, tutorialDone: true });
  debate.run("s.day=G.DEBATE_ROUND");
  eq(debate.run("advice().pick.text"), "出席政見會", "debate day is not missed");
  eq(debate.run("briefDue()"), true, "小葉 speaks up on the debate day");
  debate.run("s.day=4;s.budget.available=9e6");
  eq(debate.run("briefDue()"), false, "小葉 stays quiet on ordinary later rounds");
}
// Consecutive research selection stays in the same panel and cannot exceed capacity.
{
  const h = harness({
    s: state(),
    cfg: { research: [] },
    action: null,
    tutorialDone: true,
  });
  h.run("choose('canvass',{venue:'street'});cfg.research=[];team()");
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
  const uiResearch = clone(h.config().research);
  ok(
    h.nodes["sheet-foot"].children.at(-1).textContent.includes("出門去保儀路口"),
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
  // The result is shown in the same scene before the next round starts.
  eq(
    [h.state().day, h.state().phase],
    [1, "recap"],
    "answer shows its result before advancing",
  );
  const card = h.nodes["round-result"],
    total = Math.round(h.state().recap.totalVotes);
  ok(!card.hidden, "result card visible on the spot");
  ok(
    h.nodes["room"].classList.contains("field") &&
      !h.nodes["venue-scene"].hidden,
    "result stays in the field scene",
  );
  ok(
    h.nodes["venue-scene"].innerHTML.includes('data-stage="reaction"'),
    "scene switches to the residents' reaction",
  );
  ok(
    card.innerHTML.includes(
      (total > 0 ? "+" : total < 0 ? "−" : "±") +
        Math.abs(total).toLocaleString("zh-TW"),
    ),
    "signed round total shown",
  );
  ok(
    card.innerHTML.includes(
      'rr-score ' + (total > 0 ? "up" : total < 0 ? "down" : "zero"),
    ),
    "good or bad carried by colour class",
  );
  ok(card.innerHTML.includes("名"), "rank change shown");
  ok(
    !card.innerHTML.includes("<button") &&
      h.nodes.dialogue.classList.contains("hidden"),
    "no extra next-round button",
  );
  const reloadMid = harness(h.snapshot());
  eq(reloadMid.state().phase, "recap", "reload during result keeps it");
  ok(!reloadMid.nodes["round-result"].hidden, "reload shows result again");
  h.run("pauseResult()");
  ok(card.classList.contains("paused"), "holding pauses the countdown");
  h.run("runResult()");
  h.flush();
  eq(
    [h.state().day, h.state().phase],
    [2, "plan"],
    "result auto-advances to the next planning round",
  );
  ok(card.hidden, "result card cleared for planning");
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
  G.begin(base, "canvass", { research: uiResearch, booth: false, venue: "street" });
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
  const offer = G.offerView(s);
  ok(
    h.nodes.line.textContent.includes(offer.planText),
    "actual current invitation only",
  );
  eq(h.nodes.dialogue.dataset.type, "offer", "offer dialogue is typed");
  eq(h.nodes["talk-tag"].textContent, "合作邀約", "offer tag");
  ok(
    h.nodes.details.children[0].innerHTML.includes("你得到") &&
      h.nodes.details.children[0].innerHTML.includes("代價"),
    "offer lists what they ask and what you get",
  );
  ok(
    h.nodes["#visitor .tag-name"].textContent !== "來訪代表",
    "visitor tag names the broker",
  );
  eq(h.state().day, 2, "hearing invitation does not spend a turn");
  // Closing without answering: the visitor waits at the door with a cue.
  h.run("hideTalk()");
  h.flush();
  ok(
    h.nodes.visitor.classList.contains("waiting") &&
      !h.nodes.visitor.classList.contains("gone"),
    "unanswered visitor waits at the door",
  );
  // Answering: the result shows the engine's change, then the visitor walks out.
  h.run("inbox()");
  const money = h.state().budget.available;
  h.run("handleOffer('accept')");
  const rec = h.state().offers.find((x) => x.id === offer.id);
  eq(rec.status, "accepted", "accept goes through the engine");
  ok(
    h.nodes.details.children[0].innerHTML.includes(
      "+" + (rec.effect.money / 10000).toLocaleString("zh-TW"),
    ) || !rec.effect.money,
    "accepted deal shows the engine's money",
  );
  eq(
    h.state().budget.available - money,
    rec.effect.money,
    "shown money matches the budget change",
  );
  h.flush();
  ok(
    h.nodes.visitor.classList.contains("gone"),
    "handled visitor leaves the office",
  );
  h.run("hideTalk()");
  h.flush();
  ok(h.nodes.visitor.classList.contains("gone"), "visitor stays gone");
}
// A crisis is a different tier: its own type, tag, alarm, option reaction and engine-sourced result.
{
  let s;
  for (let seed = 1; seed < 200 && !s; seed++) {
    const x = state(seed, "heir");
    for (let r = 1; r < G.DAYS && x.phase === "plan"; r++) {
      if (x.crisis?.status === "pending") {
        s = x;
        break;
      }
      G.begin(x, "fundraise", {});
      G.arrive(x);
      G.next(x);
    }
  }
  ok(s, "real crisis fixture");
  const h = harness({
    s,
    cfg: { research: [] },
    action: null,
    tutorialDone: true,
    seenVisits: [s.day],
  });
  h.run("inbox()");
  eq(h.nodes.dialogue.dataset.type, "crisis", "crisis dialogue is typed");
  ok(
    h.nodes["talk-tag"].textContent.startsWith("突發事件"),
    "crisis carries the alert tag",
  );
  ok(h.nodes.dialogue.classList.contains("alarm"), "crisis entry alarms");
  eq(h.nodes.line.textContent, s.crisis.text, "crisis text from engine");
  h.run("hideTalk();inbox()");
  ok(
    !h.nodes.dialogue.classList.contains("alarm"),
    "reopening the same crisis does not alarm again",
  );
  ok(h.nodes.knock.classList.contains("alert"), "door flags a pending crisis");
  h.run("handleCrisis('apologize')");
  ok(
    h.nodes["reaction-layer"].getAttribute("class").includes("react-bow"),
    "apology plays the bow reaction",
  );
  h.flush();
  const c = h.state().crisis;
  eq(c.status, "resolved", "crisis resolved through the engine");
  eq(h.nodes.dialogue.dataset.state, "resolved", "result shown after reaction");
  ok(
    h.nodes.details.children[0].innerHTML.includes(
      Math.abs(Math.round(c.effect.votes)).toLocaleString("zh-TW"),
    ),
    "result shows the engine's vote change",
  );
  // Each crisis option has its own reaction class.
  const classes = new Set();
  for (const choice of ["pay", "apologize", "fight"]) {
    const x = clone(s);
    x.budget.available = Math.max(x.budget.available, G.COSTS.crisis);
    const k = harness({ s: x, cfg: {}, action: null, tutorialDone: true });
    k.run("handleCrisis(" + JSON.stringify(choice) + ")");
    classes.add(k.nodes["reaction-layer"].getAttribute("class"));
  }
  eq(classes.size, 3, "three options, three different reactions");
}
// Ordinary talk keeps its own types.
{
  const h = harness({ s: state(), cfg: {}, action: null, tutorialDone: true });
  h.run("brief()");
  eq(h.nodes.dialogue.dataset.type, "staff", "staff advice is typed");
  eq(h.nodes.speaker.textContent, "小葉", "staff name");
  h.run('say("field","小馬｜對手","q","",[])');
  eq(h.nodes.dialogue.dataset.type, "rival", "rival talk is typed");
  h.run('say("field","秀琴阿姨｜退休老師","q","",[])');
  eq(h.nodes.dialogue.dataset.type, "resident", "resident talk is typed");
  eq(h.nodes["speaker-role"].textContent, "退休老師", "role shown apart");
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
  for (let d = 1; d <= G.DAYS; d++) he.run("choose('fundraise');depart();finishTravel();advance()");
  he.run("finishCounting();finishCounting();result()");
  eq(calls.filter((c) => c[0] === "play" && ["win", "lose"].includes(c[1])).length, 1, "ending cue once");
}
{
  // Audio failure never blocks play.
  const bad = { enabled() { throw Error("x"); }, play() { throw Error("x"); }, startLoop() { throw Error("x"); }, stopLoop() { throw Error("x"); }, setEnabled() { throw Error("x"); } };
  const h = harness({ s: state(), cfg: {}, action: null, tutorialDone: true }, { soundStub: bad });
  h.run("choose('fundraise');depart();finishTravel();continueResult()");
  eq(h.state().day, 2, "throwing audio module still plays a round");
  const none = harness({ s: state(), cfg: {}, action: null, tutorialDone: true });
  none.nodes["settings-open"].onclick();
  none.nodes["sound-toggle"].onclick();
  none.run("choose('fundraise');depart();finishTravel();continueResult()");
  eq(none.state().day, 2, "no audio module still plays a round");
}
{
  const h = harness(
    { s: state(), cfg: {}, action: null, tutorialDone: true },
    { storageError: true },
  );
  h.run("choose('fundraise');depart();finishTravel();continueResult()");
  eq(h.state().day, 2, "storage failure still allows play");
}
{
  // Only a crisis or a cooperation offer interrupts; 小葉 speaks up only with something new.
  const h = harness({ s: state(), cfg: { research: [] }, action: null, tutorialDone: true });
  h.run("s.day=4;s.crisis=null;G.offerView=()=>null");
  eq(h.run("urgent()"), false, "no crisis or offer: nothing interrupts");
  h.run("s.crisis={status:'pending',text:'x'}");
  eq(h.run("urgent()"), true, "a pending crisis interrupts");
  h.run("s.crisis=null;s.day=4");
  const a = h.run("advice()");
  ok(/離當選線|當選線上/.test(a.title), "小葉 states the vote gap every round");
  ok(/每回合要多拿|守住/.test(a.sub), "小葉 states the pace needed");
  ok(a.pick && typeof a.pick.fn === "function" && a.pick.text, "小葉 offers one concrete next step");
}
{
  // The day's action can be changed from the plan sheet without scrolling.
  const h = harness({ s: state(), cfg: { research: [] }, action: null, tutorialDone: true });
  h.run("choose('canvass');planDetail()");
  const foot = h.nodes["sheet-foot"];
  ok(JSON.stringify(foot.children?.map?.((b) => b.textContent) || foot.innerHTML || "").includes("換行程"), "換行程 sits beside the departure button");
}
{
  // Players learn chiefs exist: maps label them and 小葉 explains the mechanic without ordering it.
  const h = harness({ s: state(24, "newcomer"), cfg: { research: [] }, action: null, tutorialDone: true });
  h.run("s.day=2");
  ok(/里長/.test(h.run("mechanicHint()")), "小葉 explains village chiefs");
  ok(/里長 \d+\/\d+|里長挺你/.test(h.run("mapMarkup()")), "wall map labels chief progress");
  h.run("s.day=3");
  ok(/挖小馬的料|里長/.test(h.run("mechanicHint()")), "小葉 mentions digging from round three");
}
{
  // 小葉 does not send the player to the same venue round after round.
  const h = harness({ s: state(24, "incumbent"), cfg: { research: [] }, action: null, tutorialDone: true });
  h.run("s.player.known=G.availableTopics(s).map(t=>t.id).filter(t=>t!=='tip');s.day=4;s.budget.available=9e6");
  const first = h.run("advice().pick.text");
  const venue = h.run("G.venueView(s).find(v=>advice().pick.text.includes(v.title)).id");
  h.run("s.journal.push({day:3,totalVotes:10,player:{action:'canvass',venue:" + JSON.stringify(venue) + ",teamReports:[]},summary:{headline:''}})");
  h.run("s.chiefs&&s.chiefs[" + JSON.stringify(venue) + "]&&(s.chiefs[" + JSON.stringify(venue) + "].broken=true)");
  ok(h.run("advice().pick.text") !== first, "advice rotates away from last round's venue");
}
{
  // A street question names its issue; a resident's memory shows only for the same issue.
  const h = harness({ s: state(24, "newcomer"), cfg: { research: [] }, action: null, tutorialDone: true });
  h.run("choose('canvass',{venue:'market'})");
  h.footer();
  h.run("finishTravel()");
  eq(h.state().phase, "question", "question reached");
  const title = h.run("G.TOPICS[s.pending.topic].title");
  ok(h.nodes.sub.textContent.includes("議題：" + title), "question names its issue");
  h.run("s.player.residents={x:{name:G.question(s).speakerName,topic:'__other__',lastQuote:'別的題'}}");
  eq(h.run("sameTopicMemory(G.question(s))"), "", "memory of another issue is not shown");
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
      h.run("choose('fundraise')");
      const research = clone(h.config().research);
      G.begin(baseline, "fundraise", { research, booth: false });
      G.arrive(baseline);
      G.next(baseline);
      h.run("depart();finishTravel()");
      eq(h.state().phase, "recap", background + " round " + round + " result first");
      h.run("continueResult()");
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
    // Ending: the count plays once, then the original report card.
    eq(h.run("ending.status"), "inprogress", "count starts after round nine");
    eq(h.nodes["office-ending"].dataset.view, "count", "counting night shown");
    eq(h.snapshot().ending.status, "inprogress", "count state saved");
    const midCount = harness(h.snapshot());
    eq(
      midCount.nodes["office-ending"].dataset.view,
      "count",
      "reload mid-count continues the count",
    );
    h.run("finishCounting()");
    const end = h.nodes["office-ending"];
    eq(end.dataset.view, "report", "report card after the count");
    ok(!end.hidden, "ending stays on screen");
    for (const part of ["report-card", "report-scene", "platform-summary", "report-numbers"])
      ok(end.innerHTML.includes(part), "report includes " + part);
    for (const t of baseline.result.titles || [])
      ok(end.innerHTML.includes(t.title), "title " + t.title);
    ok(!h.nodes.sheet.open, "ending is not a dismissible panel");
    const loaded = harness(h.snapshot());
    eq(
      loaded.state().result,
      baseline.result,
      "result reload does not draw election twice",
    );
    eq(
      loaded.nodes["office-ending"].dataset.view,
      "report",
      "reload after the count goes straight to the report",
    );
  }
}
// Ending titles from the shared engine appear on the report card, as in the original.
{
  const s = state(7, "newcomer");
  for (let r = 0; r < G.DAYS; r++) {
    if (s.crisis?.status === "pending") G.respondCrisis(s, "apologize");
    G.begin(s, "fundraise", { research: [], booth: false });
    G.arrive(s);
    G.next(s);
  }
  s.result.titles = [
    { id: "promise-king", title: "承諾之王", line: "說到的都做到了。" },
  ];
  const h = harness({
    s,
    cfg: {},
    action: null,
    tutorialDone: true,
    ending: { status: "seen", elapsed: 12 },
  });
  const end = h.nodes["office-ending"];
  eq(end.dataset.view, "report", "seen count goes straight to report");
  ok(
    end.innerHTML.includes("report-titles") && end.innerHTML.includes("承諾之王"),
    "titles shown on the report",
  );
  const old = harness({ s, cfg: {}, action: null, tutorialDone: true });
  eq(
    old.nodes["office-ending"].dataset.view,
    "report",
    "saves from before the count was tracked never replay it",
  );
}
// Engine facts restored on the office screens: chiefs, researched topics, origin and vote bank.
{
  const base = state(24, "newcomer"),
    venues = G.venueView(base),
    pick = venues.find((v) => v.pool.length) || venues[0],
    topic = pick.pool[0];
  if (!base.player.known.includes(topic)) base.player.known.push(topic);
  const h = harness({ s: clone(base), cfg: { research: [] }, action: null, tutorialDone: true });
  h.run("choose('canvass',{venue:'market'});planDetail()");
  const body = h.nodes["sheet-body"].innerHTML,
    chief = G.chiefPreview(base, "market");
  ok(body.includes(chief.name) && body.includes("已訪 " + chief.visits + "/" + chief.need + " 次"), "venue button shows the chief's visits");
  ok(body.includes("chief-note"), "chief line sits on the venue button");
  ok(body.includes(G.TOPICS[topic].short + " ✓"), "researched topic marked on its venue");
  const unknown = venues.flatMap((v) => v.pool).find((t) => !base.player.known.includes(t));
  if (unknown) ok(!body.includes(G.TOPICS[unknown].short + " ✓"), "unresearched topic left unmarked");
  h.run("mapPanel()");
  ok(h.nodes["sheet-body"].innerHTML.includes("市場老里長"), "wall map lists the chiefs");
  h.run("network()");
  ok(h.nodes["sheet-body"].innerHTML.includes("廟口里長"), "local team panel lists the chiefs");
  h.run("polls()");
  const o = G.originView(base), route = G.routeView(base);
  ok(h.nodes["sheet-body"].innerHTML.includes(o.title) && h.nodes["sheet-body"].innerHTML.includes(route.perk), "poll folder shows origin and vote bank");
  h.run("newGame()");
  const seed = h.run("nextSeed"),
    card = h.nodes["sheet-body"].innerHTML;
  ok(card.includes("本局出身") && card.includes("基本盤"), "character cards show origin and vote bank");
  for (const id of Object.keys(G.BACKGROUNDS))
    ok(card.includes(G.originView(G.initial(seed), id).title), "card origin for " + id + " matches the seed");
  h.footer();
  eq(h.state().seed, seed, "the new game uses the previewed seed");
  // A broken chief reads as on your side.
  const won = clone(base);
  won.chiefs.market.broken = true;
  const w = harness({ s: won, cfg: { research: [] }, action: null, tutorialDone: true });
  w.run("choose('canvass',{venue:'market'});planDetail()");
  ok(w.nodes["sheet-body"].innerHTML.includes("★ 市場老里長相挺"), "won chief marked with a star");
}
// Hindsight: the other answers are tried on copies only; the real answer applies once and the line survives reload.
{
  const base = state(24, "heir"),
    h = harness({ s: clone(base), cfg: { research: [] }, action: null, tutorialDone: true });
  h.run("choose('canvass',{venue:'street'})");
  const research = clone(h.config().research);
  h.footer();
  h.run("finishTravel()");
  eq(h.state().phase, "question", "question reached");
  const q = G.question(h.state()),
    i = q.options.findIndex((o) => o.unlocked);
  ok(q.options.filter((o) => o.unlocked).length >= 2, "question has alternatives to compare");
  h.nodes.actions.children[i].onclick();
  const got = h.state(),
    hs = got.hindsight?.[got.day];
  ok(hs && hs.chosen === q.options[i].text, "hindsight stored for the round");
  ok(h.nodes["round-result"].innerHTML.includes("rr-hindsight") && h.nodes["round-result"].innerHTML.includes("檢討"), "result card shows the hindsight line");
  G.begin(base, "canvass", { research, booth: false, venue: "street" });
  G.arrive(base);
  G.answer(base, q.options[i].id);
  const bare = clone(got);
  delete bare.hindsight;
  eq(bare, base, "hindsight leaves the campaign state as a plain answer");
  const reload = harness(h.snapshot());
  eq(reload.state().hindsight, got.hindsight, "reload keeps the hindsight");
}
console.log(JSON.stringify({ result: "passed", assertions: checks }));
