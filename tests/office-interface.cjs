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
  const saved = initial ? { [KEY]: JSON.stringify(initial) } : {},
    nodes = {},
    timers = new Map(),
    events = {},
    audio = { starts: 0, gain: 0, resumes: 0 };
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
  class AudioContext {
    constructor() {
      this.sampleRate = 100;
      this.currentTime = 0;
      this.state = "suspended";
      this.destination = {};
    }
    createBuffer() {
      const data = new Float32Array(300);
      return { getChannelData: () => data };
    }
    createBufferSource() {
      return {
        connect(x) {
          return x;
        },
        start() {
          audio.starts++;
        },
      };
    }
    createBiquadFilter() {
      return {
        frequency: { value: 0 },
        connect(x) {
          return x;
        },
      };
    }
    createGain() {
      return {
        gain: {
          value: 0,
          setTargetAtTime(v) {
            audio.gain = v;
          },
        },
        connect(x) {
          return x;
        },
      };
    }
    resume() {
      this.state = "running";
      audio.resumes++;
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
    window: { DayGame: G, AudioContext },
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
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(root + "/day-art.js", "utf8"), ctx);
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
      for (const f of events.click || []) f({ target: b });
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
// Weather uses the shared engine and a single synthesised source, with mute and background silence.
{
  const rain = Array.from({ length: 100 }, (_, i) => state(i)).find(
    (s) => G.weather(s).id === "rain",
  );
  ok(rain, "rain fixture");
  const h = harness({ s: rain, cfg: {}, action: null, tutorialDone: true });
  const beforeAudio = h.state();
  ok(
    h.nodes.room.classList.contains("rainy"),
    "actual rain switches glass overlay",
  );
  eq(h.audio.starts, 0, "no audio before gesture");
  h.run("rainAudio(true);rainAudio(true)");
  eq(h.audio.starts, 1, "one loop for repeated gestures");
  ok(h.audio.gain > 0, "rain gain enabled");
  h.nodes["sound-toggle"].onclick();
  eq(h.audio.gain, 0, "mute fades rain");
  h.nodes["sound-toggle"].onclick();
  h.doc.hidden = true;
  h.emit("visibilitychange");
  eq(h.audio.gain, 0, "background tab silent");
  eq(h.state(), beforeAudio, "audio has no effect on game state");
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
