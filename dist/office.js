"use strict";
const G = window.DayGame,
  $ = (id) => document.getElementById(id),
  esc = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    ),
  wan = (n) =>
    (n / 10000).toLocaleString("zh-TW", { maximumFractionDigits: 1 }) + " 萬",
  num = (n) => Math.round(n || 0).toLocaleString("zh-TW");
const placeLabel = (p) =>
  ["canvass", "rally"].includes(p.id)
    ? p.venueTitle
    : {
        prepare: "競選辦公室",
        recruit: "夥伴工作室",
        fundraise: "募款小廣場",
        dig: "資料查訪",
        tv: "電視台",
        online: "直播間",
        press: "記者會",
        debate: "政見會",
      }[p.id] || p.venueTitle;
const STORE = "campaign-office-playtest-v2",
  POINTS = {
    market: [160, 150],
    street: [410, 145],
    plaza: [390, 65],
    river: [320, 225],
    temple: [130, 65],
  },
  NAMES = {
    canvass: "街訪",
    prepare: "研究",
    fundraise: "募款",
    recruit: "招募",
    rally: "造勢",
    tv: "電視",
    online: "直播",
    dig: "挖料",
    press: "爆料",
    debate: "政見會",
  },
  TOPIC = (t) => G.TOPICS[t]?.short || G.TOPICS[t]?.title || t;
let s,
  action = null,
  cfg = {},
  timers = [],
  activePanel = "",
  dialogueKind = "",
  focusReturn = null,
  epoch = 0,
  storageOK = true,
  tutorialDone = false,
  newSettings = { background: "newcomer", affiliation: "independent" },
  seenVisits = [],
  travelFrame = 0,
  soundedRecap = 0,
  soundedEnding = false,
  selectingCharacter = false,
  // Seed of the campaign being picked in the character panel, so its cards show that game's origins.
  nextSeed = null;
function later(fn, delay) {
  const e = epoch;
  timers.push(
    setTimeout(
      () => {
        if (e === epoch) fn();
      },
      matchMedia("(prefers-reduced-motion:reduce)").matches ? 0 : delay,
    ),
  );
}
function clearTimers() {
  cancelAnimationFrame(travelFrame);
  timers.forEach(clearTimeout);
  timers = [];
  epoch++;
}
function save() {
  try {
    localStorage.setItem(
      STORE,
      JSON.stringify({
        s,
        action,
        cfg,
        tutorialDone,
        seenVisits,
        ending,
      }),
    );
  } catch {
    storageOK = false;
  }
}
function fresh(settings = newSettings) {
  clearTimers();
  s = G.initial(nextSeed ?? Math.floor(Math.random() * 1000000));
  nextSeed = null;
  G.configure(s, settings);
  G.start(s);
  action = null;
  cfg = { research: [] };
  ending = null;
  tutorialDone = false;
  seenVisits = [];
  soundedRecap = 0;
  soundedEnding = false;
  save();
  office();
  tutorial(0);
}
// Atlas crops; card portraits are bottom-aligned so a wide crop never shows the next row's head below it.
const PORTRAITS = {
  newcomer: "223 22 199 356",
  heir: "676 24 213 349",
  incumbent: "1076 35 254 345",
};
function newGame() {
  clearTimers();
  selectingCharacter = true;
  nextSeed = Math.floor(Math.random() * 1000000);
  newSettings = {
    ...(s?.settings || { background: "newcomer", affiliation: "independent" }),
  };
  characterPanel();
}
// This game's origin preset and vote bank for one identity, as the original opening cards show them.
function originMarkup(id) {
  const t = G.initial(nextSeed ?? s?.seed ?? 0, { ...newSettings, background: id }),
    o = G.originView?.(t, id),
    b = G.baseView?.(t, id);
  return (
    (o
      ? `<span class="origin-line" title="${esc(o.info)}"><i>本局出身</i><b>${esc(o.title)}</b><em class="og">＋${esc(o.good)}</em><em class="ob">－${esc(o.bad)}</em></span>`
      : "") +
    (b
      ? `<span class="origin-line base" title="${esc(b.perkText)}"><i>基本盤</i><b>${esc(b.title)}</b><em class="og">＋${esc(b.perk)}</em></span>`
      : "")
  );
}
function characterPanel() {
  showPanel(
    "這次，由誰來打選戰？",
    `<p>選定人物與政黨後，再開始這一局。</p><div class="character-list">${Object.values(
      G.BACKGROUNDS,
    )
      .map(
        (b) =>
          `<button data-action="identity" data-id="${b.id}" aria-pressed="${newSettings.background === b.id}"><svg viewBox="${PORTRAITS[b.id]}" preserveAspectRatio="xMidYMax meet" aria-hidden="true"><image href="assets/matte-toy-v1/game/candidates.webp" width="1536" height="1024"/></svg><span><strong>${G.candidateName({ ...newSettings, background: b.id })} · ${b.title}</strong><small>${b.id === "newcomer" ? "擅長街訪、議題熟；經費少。" : b.id === "heir" ? "家族有人脈、經費多；議題要從頭準備。" : "有團隊與基本盤；舊承諾會被追問。"}</small>${originMarkup(b.id)}</span></button>`,
      )
      .join(
        "",
      )}</div><button class="reroll-origin" data-action="reroll-origin">換一組出身</button><div class="section-label">政黨</div><div class="rows party-list">${Object.values(
      G.PARTIES,
    )
      .map(
        (p) =>
          `<button data-action="party" data-id="${p.id}" aria-pressed="${newSettings.affiliation === p.id}">${p.title}<span aria-hidden="true">${newSettings.affiliation === p.id ? "●" : "○"}</span></button>`,
      )
      .join(
        "",
      )}</div><p class="choice-note">${esc(G.PARTIES[newSettings.affiliation].description)}</p>`,
    {
      text: "以 " + G.candidateName(newSettings) + " 開始選戰",
      fn: () => {
        selectingCharacter = false;
        closePanel();
        fresh(newSettings);
      },
    },
  );
}
function tutorial(step) {
  staffTalk();
  const name = G.candidateName(s.settings),
    r = G.raceView(s),
    n = capacity();
  const pages = [
    {
      line: `${name}，${G.DAYS} 回合內要衝過當選線。`,
      sub: `還差 ${num(Math.max(0, r.line - r.you))} 票。每回合你親自跑一個行程。`,
      next: "下一步",
    },
    {
      line: n ? `${n} 位助手可同時研究議題。` : "助手可同時研究議題。",
      sub: "不占你的行程；查過的題，現場看得到各群反應。",
      next: "選第一步",
    },
  ];
  if (step < 2) {
    const p = pages[step];
    say("staff", `小葉 · 教學 ${step + 1}/3`, p.line, p.sub, [
      { text: p.next, fn: () => tutorial(step + 1), primary: true },
      {
        text: "略過教學",
        fn: () => {
          tutorialDone = true;
          save();
          catalog();
        },
      },
    ]);
    return;
  }
  tutorialDone = true;
  save();
  say(
    "staff",
    "小葉 · 教學 3/3",
    "第一步做哪個？",
    "街訪拉地方支持；研究讓你答得出具體做法。",
    [
      {
        text: "先跑地方",
        note: "市場街訪 · 沒研究的題會被追問",
        fn: () => {
          G.setCampaignPlan(s, "organization");
          choose("canvass", { venue: "market" });
        },
      },
      {
        text: "先備議題",
        note: "本人研究，之後上節目",
        fn: () => {
          G.setCampaignPlan(s, "media");
          choose("prepare");
        },
      },
    ],
  );
}

function button(text, fn, note = "", primary = false, disabled = false) {
  const b = document.createElement("button");
  b.textContent = text;
  if (note) {
    const sm = document.createElement("small");
    sm.textContent = note;
    b.append(sm);
  }
  b.className = primary ? "primary" : "";
  b.disabled = disabled;
  b.onclick = fn;
  return b;
}
// Actor walks keep their own token: a walk-out still ends hidden after the round's timers are cleared.
const walkToken = {};
function move(id, x, y, scale = 1, away = false) {
  const el = $(id),
    token = (walkToken[id] = (walkToken[id] || 0) + 1);
  el.classList.remove("gone");
  el.classList.add("walking");
  el.style.setProperty("--x", x + "px");
  el.style.setProperty("--y", y + "px");
  el.style.setProperty("--scale", scale);
  setTimeout(
    () => {
      if (walkToken[id] !== token) return;
      el.classList.remove("walking");
      if (away) el.classList.add("gone");
    },
    matchMedia("(prefers-reduced-motion:reduce)").matches ? 0 : 650,
  );
}
// 小葉 walks the office floor between fixed spots. Links only join spots with clear floor between them,
// so a route from her post to the window goes around the front of the desk, never across it.
// 小葉 sits at the L-desk's return wing facing the candidate (painted into the seated background). To speak she
// stands, walks to the front of the main desk and talks; afterwards she walks back and sits down. Now and then she
// gets up and walks the floor. Links only join spots with clear floor between them, so she never crosses the desk.
const STAFF_SPOTS = {
    seat: [1080, 412, 0.76],
    wingFront: [960, 505, 0.8],
    talk: [763, 426, 0.78],
    frontLeft: [430, 476, 0.78],
    window: [300, 322, 0.7],
  },
  STAFF_LINKS = {
    seat: ["wingFront"],
    wingFront: ["seat", "talk"],
    talk: ["wingFront", "frontLeft"],
    frontLeft: ["talk", "window"],
    window: ["frontLeft"],
  },
  STAFF_STEP_MS = 1300,
  OFFICE_BG = { empty: "assets/office/office-ldesk-empty.png", seated: "assets/office/office-ldesk-aide.png" };
let staffSpot = "seat",
  staffRoute = 0,
  staffSeated = true,
  staffUpAt = 0;
function staffPath(from, to) {
  const seen = { [from]: null },
    queue = [from];
  while (queue.length) {
    const at = queue.shift();
    if (at === to) break;
    for (const n of STAFF_LINKS[at])
      if (!(n in seen)) {
        seen[n] = at;
        queue.push(n);
      }
  }
  const path = [];
  for (let at = to; at && at !== from; at = seen[at]) path.unshift(at);
  return path;
}
// Seated: the painted aide shows and the sprite hides; standing: the empty chair shows and the sprite takes over.
function staffSeat(seated) {
  staffSeated = seated;
  $("office-bg")?.setAttribute("href", seated ? OFFICE_BG.seated : OFFICE_BG.empty);
  $("desk-mask")?.setAttribute("href", seated ? OFFICE_BG.seated : OFFICE_BG.empty);
  $("aide-seat")?.classList.toggle("seated", seated);
  $("staff").classList.toggle("gone", seated);
  if (!seated) staffUpAt = Date.now();
}
function staffGo(to, done) {
  const route = ++staffRoute;
  if (staffSeated) {
    staffSeat(false);
    staffSpot = "seat";
    $("staff").classList.remove("face-right");
    move("staff", ...STAFF_SPOTS.seat);
  }
  const path = staffPath(staffSpot, to);
  const step = (i) => {
    if (route !== staffRoute) return;
    if (i >= path.length) return done?.();
    const [x0] = STAFF_SPOTS[staffSpot],
      [x, y, k] = STAFF_SPOTS[path[i]];
    $("staff").classList.toggle("face-right", x > x0);
    staffSpot = path[i];
    move("staff", x, y, k);
    setTimeout(() => step(i + 1), STAFF_STEP_MS);
  };
  step(0);
}
// She comes to the front of the main desk to talk to the candidate.
function staffTalk() {
  staffGo("talk", () => $("staff").classList.remove("face-right"));
}
// She walks back to her chair and sits down.
function staffSit() {
  if (staffSeated) return;
  staffGo("seat", () => {
    if (s?.phase === "plan" && $("dialogue").classList.contains("hidden")) staffSeat(true);
  });
}
// Scene changes put her straight back in her chair.
function staffSitNow() {
  staffRoute++;
  staffSpot = "seat";
  move("staff", ...STAFF_SPOTS.seat);
  staffSeat(true);
}
// While the player looks around the office, she sometimes gets up for a short walk and then sits back down.
function staffWander() {
  setTimeout(staffWander, 4500);
  if (
    !s ||
    s.phase !== "plan" ||
    document.hidden ||
    $("sheet").open ||
    !$("dialogue").classList.contains("hidden") ||
    $("room").classList.contains("field") ||
    matchMedia("(prefers-reduced-motion:reduce)").matches
  )
    return;
  if (staffSeated) {
    if (Math.random() < 0.15) staffGo(["talk", "frontLeft", "window"][Math.floor(Math.random() * 3)]);
  } else if (Date.now() - staffUpAt > 9000) staffSit();
}
setTimeout(staffWander, 4500);
function toast(text) {
  if ($("sheet").open) {
    $("sheet-status").textContent = text;
    later(() => {
      $("sheet-status").textContent = "";
    }, 3000);
    return;
  }
  $("toast").textContent = text;
  $("toast").classList.add("show");
  later(() => $("toast").classList.remove("show"), 2400);
}
function hideTalk() {
  $("dialogue").classList.add("hidden");
  $("dialogue").classList.remove("alarm");
  dialogueKind = "";
  settleVisitor();
  if (s.phase === "plan") staffSit();
  $("staff").focus();
  if (s.phase === "plan" && !$("sheet").open) queueVisitor();
}
// Dialogue types: who is talking and what kind of event it is read at a glance (tag, frame, name and role).
const TALK = {
  staff: "幕僚建議",
  resident: "街坊",
  host: "節目提問",
  rival: "對手小馬",
  offer: "合作邀約",
  invite: "行程邀約",
  crisis: "突發事件",
};
const talkType = (kind, who) =>
  kind === "staff"
    ? "staff"
    : /小馬/.test(who)
      ? "rival"
      : /主持人/.test(who)
        ? "host"
        : "resident";
const splitWho = (who) => {
  const [name, ...role] = String(who || "").split(/\s*[｜|·・]\s*/);
  return [name, role.join(" · ")];
};
// rows: [label, value, tone] facts shown under the line, e.g. what a deal asks and gives.
function factRows(rows) {
  const el = document.createElement("div");
  el.className = "facts";
  el.innerHTML = rows
    .filter((r) => r && r[1])
    .map(
      ([k, v, tone]) =>
        `<p class="${tone || ""}"><b>${esc(k)}</b><span>${esc(v)}</span></p>`,
    )
    .join("");
  return el;
}
function say(kind, who, line, sub, choices, closable = true, opts = {}) {
  const type = opts.type || talkType(kind, who),
    [name, role] = splitWho(who),
    d = $("dialogue");
  $("knock").style.display =
    kind === "visitor" ? "none" : pending() ? "block" : "none";
  $("candidate").classList.toggle("direction-left", kind === "visitor");
  if ($("sheet").open) $("sheet").close();
  dialogueKind = kind;
  d.dataset.type = type;
  d.dataset.state = opts.resolved ? "resolved" : "";
  d.classList.remove("alarm");
  $("talk-tag").textContent = opts.tag || TALK[type];
  $("speaker").textContent = name;
  $("speaker-role").textContent = opts.role ?? role;
  $("line").textContent = line;
  $("sub").textContent = sub || "";
  $("details").replaceChildren(...(opts.rows ? [factRows(opts.rows)] : []));
  $("actions").replaceChildren(
    ...choices.map((x) => button(x.text, x.fn, x.note, x.primary, x.disabled)),
  );
  $("dismiss").hidden = !closable;
  d.classList.remove("hidden");
  if (opts.alarm) alarm();
}
// A crisis arrives with a jolt: the panel shakes, the room flashes once and the alert sound plays if available.
function alarm() {
  const d = $("dialogue"),
    room = $("room");
  d.classList.remove("alarm");
  room.classList.remove("crisis-alert");
  void d.offsetWidth;
  d.classList.add("alarm");
  room.classList.add("crisis-alert");
  try {
    window.DaySound?.play?.("crisis");
  } catch {
    /* Sound is optional. */
  }
  later(() => {
    d.classList.remove("alarm");
    room.classList.remove("crisis-alert");
  }, 900);
}
function showPanel(title, html, footer) {
  // Re-rendering the same open panel (a choice inside it) keeps the reader where they were.
  const same = $("sheet").open && activePanel === title,
    keep = same ? [$("sheet-body").scrollTop, $("sheet").scrollTop] : [0, 0];
  $("sheet-status").textContent = "";
  hideTalk();
  focusReturn = document.activeElement;
  activePanel = title;
  $("sheet-title").textContent = title;
  $("sheet-body").innerHTML = html;
  $("sheet-foot").replaceChildren();
  $("sheet-foot").hidden = !footer;
  if (footer?.alt) $("sheet-foot").append(button(footer.alt.text, footer.alt.fn));
  if (footer)
    $("sheet-foot").append(
      button(footer.text, footer.fn, "", true, !!footer.disabled),
    );
  if (!$("sheet").open) $("sheet").showModal();
  $("sheet-body").scrollTop = keep[0];
  $("sheet").scrollTop = keep[1];
}
function closePanel() {
  if ($("sheet").open) $("sheet").close();
}
$("sheet").addEventListener("close", () => {
  activePanel = "";
  if (selectingCharacter) {
    selectingCharacter = false;
    resume();
    return;
  }
  queueVisitor();
  if (focusReturn?.isConnected) focusReturn.focus();
});
function preview() {
  return G.preview(s, action || "canvass", cfg);
}
function used() {
  return (
    (cfg.research || []).length +
    (cfg.booth ? 1 : 0) +
    (action === "online" ? G.TUNING.streamers : 0)
  );
}
function capacity() {
  return (s.player.team?.members || []).filter((m) => m.hiredDay < s.day)
    .length;
}
function conflict() {
  return used() > capacity() ? "助手不夠：減少研究或收起募款攤。" : "";
}
function pending() {
  if (s.phase !== "plan") return 0;
  const c = G.campaignView(s);
  return (
    Number(!!G.offerView(s)) +
    Number(c.opportunity?.status === "open" && !cfg.campaignOpportunity) +
    Number(!!c.followup && !cfg.campaignFollowup) +
    Number(s.crisis?.status === "pending") +
    Number(G.pendingChallenges(s).length > 0) +
    Number(s.day === G.DEBATE_ROUND && action !== "debate")
  );
}
// Only a crisis or a cooperation offer interrupts; everything else is picked up from the door.
function urgent() {
  return s.crisis?.status === "pending" || !!G.offerView(s);
}
// Phones: the empty floor under the office holds today's next step, so the plan is never hidden behind the desk.
function syncDock() {
  const show = s.phase === "plan" && s.crisis?.status !== "pending" && (s.day > 1 || tutorialDone);
  $("dock").hidden = !show;
  if (!show) return;
  const a = advice();
  $("dock-tip").textContent = a.title + " " + a.sub;
  $("dock-helpers").hidden = !cfg.research?.length;
  $("dock-helpers").textContent = cfg.research?.length ? `小葉已排助手查：${cfg.research.map(TOPIC).join("、")}（點此更換）` : "";
  $("dock-helpers").onclick = team;
  const g = guideHint();
  $("dock-guide").hidden = !g;
  if (g) {
    $("dock-hint").textContent = "小葉提醒：" + g.text;
    $("dock-guide-go").textContent = g.label;
    $("dock-guide-go").onclick = g.fn;
  }
  $("dock-pick").textContent = a.pick.text;
  $("dock-pick").onclick = a.pick.fn;
  $("dock-own").textContent = action ? "回到我排的行程" : "自己排行程";
  $("dock-own").onclick = () => (action ? planDetail() : catalog());
}
function sync() {
  const p = s.phase === "plan" ? preview() : s.pending || preview();
  $("round").textContent =
    `第 ${s.day} / ${G.DAYS} 回合 · ${wan(s.budget.available)}`;
  $("plan-label").textContent = action
    ? `${NAMES[action]} · ${["canvass", "rally"].includes(action) ? G.VENUES[cfg.venue || "market"].title : action === "prepare" ? TOPIC(p.topic) : placeLabel(p) || p.title}`
    : "今天親自做什麼？";
  $("plan-note").textContent =
    s.phase === "plan"
      ? conflict() ||
        (!p.allowed && action
          ? p.reason
          : `助手 ${capacity()} 人 · 主行程每回合一個`)
      : s.phase === "recap"
        ? "這回合已完成，先看看結果。"
        : s.phase === "result"
          ? "選戰結束，承諾保留在成績單。"
          : "現場等你回答";
  $("depart").disabled =
    ["question", "travel"].includes(s.phase) ||
    (s.phase === "plan" && (!action || !p.allowed || !!conflict()));
  $("all-actions").disabled = s.phase !== "plan";
  $("depart").textContent =
    s.phase === "recap"
      ? "下一回合 →"
      : s.phase === "result"
        ? "成績單"
        : "出發 →";
  $("caption").textContent =
    s.phase === "plan"
      ? G.campaignView(s).plan
        ? `方向：${G.campaignView(s).title}`
        : "點小葉聽建議，或翻桌上行程。"
      : s.phase === "recap"
        ? "這一回合留下了什麼"
        : s.phase === "result"
          ? "選戰成績單"
          : "現場 · " + (s.pending ? placeLabel(s.pending) : "行動中");
  $("inbox-short").textContent = pending()
    ? pending() + " 件待看"
    : "目前無邀約";
  const e = G.supportEstimate(s);
  const rank = G.raceView(s).rank;
  $("poll-short").textContent =
    (e.poll ? "民調" : "估計") + " 第 " + rank + " 名";
  $("poll-glance").textContent =
    (e.poll ? "民調" : "估計") + " · 第 " + rank + " 名";
  $("knock").style.display = pending() ? "block" : "none";
  doorCue();
  $("paper").setAttribute("opacity", s.journal.length ? "1" : "0");
  renderPins();
  sceneStatus();
  save();
}
function office() {
  hideResult();
  hideEnding();
  $("travel-scene").hidden = true;
  $("venue-scene").hidden = true;
  visitorArt("來訪代表");
  clearTimers();
  $("toast").classList.remove("show");
  $("toast").textContent = "";
  $("room").classList.remove("field", "arriving");
  $("field-backdrop").style.display = "none";
  $("visitor").classList.add("gone");
  $("visitor").classList.remove("waiting");
  visitorFor = "";
  clearReaction();
  staffSitNow();
  $("dialogue").classList.add("hidden");
  sync();
}
// Assistants not yet assigned; unassigned ones still follow you or canvass.
function freeHelpers() {
  return Math.max(0, capacity() - used());
}
// Most-watched issue the campaign has no read on yet (latest poll, else base weights).
function hotUnknownTopic() {
  const issues = s.polls?.at(-1)?.issues || s.landscape?.weights || {},
    ids = G.availableTopics(s)
      .map((t) => t.id)
      .filter((t) => t !== "tip");
  return (
    ids
      .filter(
        (t) =>
          !s.player.insight?.[t] &&
          !(cfg.research || []).includes(t) &&
          !(action === "prepare" && cfg.topic === t),
      )
      .sort((a, b) => (issues[b] || 0) - (issues[a] || 0))[0] || null
  );
}
// Topics nobody has read yet, hottest first; those asked at the chosen venue lead.
function researchCandidates() {
  const issues = s.polls?.at(-1)?.issues || s.landscape?.weights || {},
    known = s.player.known || [],
    venue = ["canvass", "rally"].includes(action) ? G.venueView(s).find((v) => v.id === (cfg.venue || "market")) : null,
    pool = venue?.pool || [];
  return G.availableTopics(s)
    .map((t) => t.id)
    .filter((t) => t !== "tip" && !known.includes(t) && !(action === "prepare" && cfg.topic === t))
    .sort((a, b) => Number(pool.includes(b)) - Number(pool.includes(a)) || (issues[b] || 0) - (issues[a] || 0));
}
// 小葉 fills every free assistant with research by default; the player can still change it in the research sheet.
function autoResearch() {
  if (s.phase !== "plan") return;
  cfg.research = (cfg.research || []).filter((t) => !(action === "prepare" && cfg.topic === t));
  for (const t of researchCandidates()) {
    if (freeHelpers() <= 0) break;
    if (!cfg.research.includes(t)) cfg.research.push(t);
  }
}
function researchEntry() {
  if (!capacity()) return "";
  const picked = (cfg.research || []).map(TOPIC);
  return `<button class="research-entry" data-open="team"><strong>派助手研究 · ${freeHelpers()} 位可派</strong><small>${picked.length ? "已派：" + esc(picked.join("、")) : "不占你的行程"}</small></button>`;
}
// Staff advice picks from current state: last result, rounds left, unread issues, race gap.
// 小葉 every round: where the vote stands, the pace needed, and one concrete next step built from current state.
// She plays a sound baseline (prepare before talking, attend the debate, keep funds, go where you can answer)
// and leaves the high-ceiling combos (chiefs plus rallies, digging and exposing, risky deals) to the player.
function advice() {
  const last = s.journal.at(-1),
    r = G.raceView(s),
    gapRaw = Math.max(0, r.line - r.you),
    left = G.DAYS - s.day + 1,
    free = freeHelpers(),
    known = s.player.known || [],
    venues = G.venueView(s),
    score = (v) => v.pool.filter((t) => known.includes(t)).length,
    // Residents tire of the same visitor: a venue visited last round drops behind any other venue you can
    // answer at, unless this visit wins its village chief over.
    lastVenue = ["canvass", "rally"].includes(last?.player.action) ? last.player.venue : null,
    rank = (v) => score(v) * 2 - (v.id === lastVenue && !G.chiefPreview(s, v.id)?.breaks && venues.some((x) => x.id !== v.id && score(x)) ? 3 : 0),
    best = [...venues].sort((a, b) => rank(b) - rank(a) || score(b) - score(a))[0];
  const researched = [
    ...new Set(
      (last?.player.teamReports || [])
        .filter((x) => x.task === "research" && x.knowledge)
        .map((x) => x.knowledge),
    ),
  ];
  const title = gapRaw
    ? `第 ${r.rank} 名，離當選線還差 ${num(gapRaw)} 票。`
    : `第 ${r.rank} 名，目前在當選線上。`;
  const pace =
    (last ? `上回合 ${signed(last.totalVotes)} 票。` : "") +
    (gapRaw
      ? `剩 ${left} 回合，每回合要多拿約 ${num(Math.ceil(gapRaw / left))} 票。`
      : `剩 ${left} 回合，守住就好。`);
  const go = (id, extra) => () => {
    choose(id, extra);
    planDetail();
  };
  const canvassAt = (v) => go("canvass", { venue: v.id });
  const helpers = () => (cfg.research?.length ? `助手已排好查「${cfg.research.map(TOPIC).join("、")}」。` : "");
  let tip, pick;
  const fresh = researched.find((t) => venues.some((v) => v.pool.includes(t)));
  if (s.day === G.DEBATE_ROUND && action !== "debate") {
    tip = "今天是政見發表會，缺席會被重罰，一定要出席。";
    pick = { text: "出席政見會", fn: go("debate") };
  } else if (s.budget.available < 100000) {
    tip = "經費快見底，先募款，下回合才有錢出門。";
    pick = { text: "去募款", fn: go("fundraise") };
  } else if (!score(best)) {
    // Nothing researched anywhere yet: talking now loses votes to follow-up questions.
    const v = venues.find((x) => x.pool.length) || best,
      topic = [...v.pool].sort((a, b) => ((s.polls?.at(-1)?.issues || {})[b] || 0) - ((s.polls?.at(-1)?.issues || {})[a] || 0))[0];
    tip = `還沒有題目查過，直接去街訪會被追問扣票。先查「${TOPIC(topic)}」，助手同時查其他題，下回合去${v.title}。`;
    pick = { text: `先查「${TOPIC(topic)}」`, fn: go("prepare", { topic }) };
  } else if (fresh) {
    const v = venues.find((x) => x.pool.includes(fresh));
    tip = `「${TOPIC(fresh)}」查好了，去${v.title}講它。`;
    pick = { text: `去${v.title}街訪`, fn: canvassAt(v) };
  } else if (left <= 2) {
    tip = `最後衝刺，去${best.title}拉票。`;
    pick = { text: `去${best.title}街訪`, fn: canvassAt(best) };
  } else {
    const ch = G.chiefPreview(s, best.id);
    tip =
      `去${best.title}街訪，那裡 ${score(best)} 個議題你答得出來` +
      (ch?.breaks ? `，這次去就能讓${ch.name}挺你。` : lastVenue && lastVenue !== best.id ? "；換個地方，免得同一批人聽膩。" : "。");
    pick = { text: `去${best.title}街訪`, fn: canvassAt(best) };
  }
  return { title, sub: pace + tip, pick, researched, free, helpers };
}
// 小葉 opens rounds one and two, then steps back: she speaks up again only on the debate day or when funds run low.
function briefDue() {
  return s.day <= 2 || s.day === G.DEBATE_ROUND || s.budget.available < 100000;
}
function brief() {
  if (s.phase !== "plan") return resume();
  if (s.day === 1 && !tutorialDone) return tutorial(0);
  staffTalk();
  let title,
    sub,
    choices = [];
  if (s.crisis?.status === "pending") {
    title = "有人爆料，出發前得先回應。";
    sub = s.crisis.text;
    choices.push({ text: "聽小葉說明", fn: inbox, primary: true });
  } else {
    const a = advice();
    title = a.title;
    // Round two is when 小葉 first explains a hidden mechanic in person; later rounds keep it in the dock.
    const g = s.day > 1 ? guideHint() : null;
    sub = a.sub + (g ? "\n小葉提醒：" + g.text : "");
    choices = [
      { ...a.pick, primary: true },
      {
        text: action ? "回到我排的行程" : "我自己排",
        fn: () => (action ? planDetail() : catalog()),
      },
      ...(g ? [{ text: g.label, fn: g.fn }] : []),
    ];
  }
  say("staff", `小葉 · 第 ${s.day} 回合`, title, sub, choices);
}
function choose(id, extra = {}) {
  const old = cfg;
  action = id;
  cfg = { research: old.research || [], booth: !!old.booth, ...extra };
  if (["canvass", "rally"].includes(id) && !cfg.venue) cfg.venue = "market";
  if (id === "prepare" && !cfg.topic)
    cfg.topic =
      G.availableTopics(s).find(
        (t) => t.id !== "tip" && !s.player.studied?.[t.id],
      )?.id || G.availableTopics(s)[0].id;
  cfg.research = cfg.research.filter(
    (t) => t !== cfg.topic || id !== "prepare",
  );
  autoResearch();
  closePanel();
  sync();
  planDetail();
}
function catalog() {
  if (s.phase !== "plan") return resume();
  showPanel(
    "今天親自做哪件事？",
    `<div class="rows">${researchEntry()}<button data-action="select" data-id="canvass"><strong>跑地方</strong><small>拜訪街坊，累積地方支持</small></button><button data-action="category" data-id="publicity"><strong>做宣傳</strong><small>造勢・電視・直播${s.day === G.DEBATE_ROUND ? "・政見會" : ""}</small></button><button data-action="category" data-id="preparation"><strong>做準備</strong><small>研究議題・籌募經費</small></button><button data-open="teamhub"><strong>帶團隊</strong><small>招募・地方小隊・助手分工</small></button><button data-action="category" data-id="intel"><strong>做情報</strong><small>挖料・查證・爆料</small></button></div>`,
  );
}
function category(id) {
  const groups = {
    publicity: [
      "宣傳",
      [
        "rally",
        "tv",
        "online",
        ...(s.day === G.DEBATE_ROUND ? ["debate"] : []),
      ],
    ],
    preparation: ["準備", ["prepare", "fundraise"]],
    intel: ["情報", ["dig", "press"]],
  };
  const [title, ids] = groups[id];
  showPanel(
    title + " · 選今天的主行程",
    '<div class="rows">' +
      ids
        .map((id) => {
          const a = G.ACTIONS.find((a) => a.id === id);
          return `<button data-action="select" data-id="${id}"><strong>${a.title}</strong><small>${esc(a.description)}</small></button>`;
        })
        .join("") +
      (id === "intel"
        ? '<button data-open="files"><strong>查證手上的資料</strong><small>查證只花錢，不占行程</small></button>'
        : "") +
      '</div><div class="tabs"><button data-open="catalog">換個方向</button></div>',
  );
}
function teamHub() {
  if (s.phase !== "plan") return resume();
  const n = G.networkView(s);
  showPanel(
    "我們的團隊",
    `<div class="rows"><button data-open="team"><strong>派 ${capacity()} 位助手</strong><small>研究、擺募款攤，或陪你出門</small></button><button data-action="select" data-id="recruit"><strong>招募一位助手</strong><small>用掉本回合；新人下回合起可派</small></button><button data-open="network"><strong>地方小隊 · ${n.active ? "已成立" : "未成立"}</strong><small>留在當地替你拉票，不占助手</small></button></div>`,
    {
      text: action ? "回到今天的行程" : "選今天的主行程",
      fn: () => (action ? planDetail() : catalog()),
    },
  );
}
function startLabel() {
  const p = preview();
  return action === "prepare"
    ? "開始研究 · 用掉本回合"
    : action === "recruit"
      ? "去招募助手 · 用掉本回合"
      : action === "fundraise"
        ? "去募款 · 用掉本回合"
        : "出門去" + placeLabel(p) + " →";
}

// A village chief's standing at a place: still a stranger (visits so far), won over on the next visit, or on your side.
function chiefText(c) {
  if (!c) return "";
  if (c.broken) return "★ " + c.name + "相挺";
  const bloc = G.TUNING?.chief?.bloc,
    gain = bloc ? "＋組織票約 " + num(bloc) : "";
  if (c.breaks)
    return (
      c.name +
      "：" +
      (c.need ? "已訪 " + c.visits + "/" + c.need + " 次，" : "") +
      "這次去就破冰" +
      (gain ? "（" + gain + "）" : "")
    );
  return (
    c.name +
    "：已訪 " +
    c.visits +
    "/" +
    c.need +
    " 次（" +
    (c.visits ? "再訪 " : "去 ") +
    (c.need - c.visits) +
    " 次破冰" +
    gain +
    "）"
  );
}
// Short chief label for maps: progress toward winning them over, or that they back you.
const chiefShort = (c) => (c.broken ? "里長挺你" : `里長 ${c.visits}/${c.need}`);
function mapChiefBadges(A) {
  return G.chiefView(s)
    .filter((c) => c && c.venue)
    .map((c) => {
      const p = A.spot?.(c.venue);
      return p
        ? `<span class="map-chief${c.broken ? " won" : ""}" style="left:${(p.x / 12).toFixed(2)}%;top:${(p.y / 6.5).toFixed(2)}%" title="${esc(chiefText(c))}">${chiefShort(c)}</span>`
        : "";
    })
    .join("");
}
// 小葉 explains mechanics nobody would find alone; information, not an instruction.
// 小葉 as the guide: each round she introduces one way of playing the player has not tried yet, with a button that
// opens it. She explains what it costs and what it does; whether to use it stays the player's call.
function guideHints() {
  const used = (id) => s.journal.some((j) => j.player.action === id),
    money = s.budget.available,
    known = s.player.known || [],
    venues = G.venueView(s),
    bestVenue = [...venues].sort((a, b) => b.pool.filter((t) => known.includes(t)).length - a.pool.filter((t) => known.includes(t)).length)[0],
    chiefs = G.chiefView(s).filter((c) => c && c.venue),
    tip = s.events?.tip,
    open = (id, extra) => () => {
      choose(id, extra);
      planDetail();
    },
    list = [];
  if (s.day >= 2 && chiefs.length && !chiefs.some((c) => c.broken))
    list.push({
      id: "chief",
      text: `有些地點有里長，同一個地點去滿次數就會破冰：拿到約 ${num(G.TUNING?.chief?.bloc || 400)} 張組織票，之後在那裡街訪的效果將近加倍。牆上地圖看得到進度。`,
      label: "看里長進度",
      fn: mapPanel,
    });
  if (!used("fundraise") && (money < 300000 || s.day >= 3))
    list.push({
      id: "fundraise",
      text: `錢不夠時可以「做準備 → 募款」：用掉一回合，募到約 ${wan(G.TUNING?.fundraise?.base?.[0] || 40000)}–${wan(G.TUNING?.fundraise?.base?.[1] || 90000)}。`,
      label: "看募款",
      fn: open("fundraise"),
    });
  if (s.day >= 2 && !used("rally") && money >= G.COSTS.rally + 50000)
    list.push({
      id: "rally",
      text: `「做宣傳 → 造勢晚會」一次能觸及的人比街訪多，花 ${wan(G.COSTS.rally)}；辦在你答得出題目的地點最划算。`,
      label: "看造勢",
      fn: open("rally", { venue: bestVenue?.id }),
    });
  if (s.day >= 3 && !used("tv") && money >= G.COSTS.tv + 50000)
    list.push({
      id: "tv",
      text: `「做宣傳 → 上電視」一次觸及最多人，花 ${wan(G.COSTS.tv)}；主持人從熱門題抽問，先研究過再上。`,
      label: "看上電視",
      fn: open("tv"),
    });
  if (s.day >= 3 && !(s.player.billboards || []).some((b) => b.round > 0) && money >= G.COSTS.billboard + 50000)
    list.push({
      id: "billboard",
      text: `有閒錢可以立看板（${wan(G.COSTS.billboard)}，最多 3 面）：街訪或造勢時在「加碼與後勤」勾選，立在那個地點後每回合都替你拉票。`,
      label: "看怎麼立看板",
      fn: () => {
        choose("canvass", { venue: bestVenue?.id });
        extras();
      },
    });
  if (s.day >= 3 && tip && !tip.history?.length && !tip.evidenceLevel)
    list.push({
      id: "dig",
      text: "「做情報」可以挖小馬的料：查證夠了再爆料。料可能是假的，指控錯了傷的是自己。",
      label: "看做情報",
      fn: open("dig"),
    });
  if (s.day >= G.GOTV_FROM)
    list.push({
      id: "gotv",
      text: `最後衝刺可以在「加碼與後勤」加買選前催票（${wan(G.COSTS.gotv)}），把支持你的人催出門投票。`,
      label: "看催票",
      fn: () => {
        if (!action) choose("canvass", { venue: bestVenue?.id });
        extras();
      },
    });
  return list;
}
function guideHint() {
  const list = guideHints();
  return list.length ? list[s.day % list.length] : null;
}
function mechanicHint() {
  return guideHint()?.text || "";
}
const chiefNote = (c) =>
  c ? `<small class="chief-note${c.broken ? " won" : ""}">${esc(chiefText(c))}</small>` : "";
function chiefList() {
  const list = G.chiefView?.(s) || [];
  return list.length
    ? `<div class="section-label">里長</div>${list.map((c) => `<p class="chief-row${c.broken ? " won" : ""}"><b>${esc(c.title)}</b> ${esc(chiefText(c))}</p>`).join("")}`
    : "";
}
function planDetail() {
  if (s.phase !== "plan") return resume();
  if (!action) return catalog();
  const p = preview(),
    known = s.player.known;
  let extra = "";
  if (["canvass", "rally"].includes(action))
    extra =
      '<div class="section-label">去哪裡</div><div class="rows">' +
      G.venueView(s)
        .map(
          (v) =>
            `<button data-action="venue" data-id="${v.id}" aria-pressed="${(cfg.venue || "market") === v.id}"><strong>${v.title}</strong><small>${v.mainTitle}多 · ${v.pool.map((t) => TOPIC(t) + (known.includes(t) ? " ✓" : "")).join("、")}</small>${chiefNote(G.chiefPreview(s, v.id))}</button>`,
        )
        .join("") +
      "</div>";
  if (action === "prepare")
    extra =
      '<div class="section-label">本人研究 · 這回合完成</div>' +
      topicGrid("personal");
  if (action === "fundraise")
    extra =
      '<div class="section-label">找誰 · 收了就要公開支持對方主張</div><div class="rows"><button data-action="donor" data-id="small" aria-pressed="' +
      (!cfg.donor || cfg.donor === "small") +
      '"><strong>街坊小額募款</strong><small>不綁立場 · 這回合不親自拉票</small></button>' +
      G.donorView(s)
        .filter((d) => d.status === "open")
        .map(
          (d) =>
            `<button data-action="donor" data-id="${d.id}" aria-pressed="${cfg.donor === d.id}"><strong>${d.name} · ${wan(d.money)}</strong><small>${esc(d.pitch)}</small></button>`,
        )
        .join("") +
      "</div>";
  if (["tv", "online", "debate"].includes(action))
    extra =
      '<div class="inline-note">可能談：' +
      (p.pool || [])
        .map((t) => `${TOPIC(t)}${known.includes(t) ? " ✓" : "（沒研究）"}`)
        .join("、") +
      "</div>";
  if (action === "press")
    extra = '<button data-open="files">打開查證與發布檔案</button>';
  const prep = p.pool?.length
    ? `<p class="choice-note">可能問 ${p.pool.length} 題，${p.pool.filter((t) => known.includes(t)).length} 題有資料，也可能問時事。</p>`
    : "";
  showPanel(
    "出發準備 · " + NAMES[action],
    `<p>${esc(p.description)}</p><div class="inline-note">費用 ${wan(p.totalCost || 0)}${p.expectedIncome ? ` · 募得約 ${wan(p.expectedIncome.min)}–${wan(p.expectedIncome.max)}` : ""}<br>${esc(p.risk || "")}${action === "recruit" ? `<br>招募 ${p.recruitCount} 人，下回合起可派` : ""}</div>${prep}${researchEntry()}${extra}<div class="confirm-strip">${esc(assignmentText())}</div>${pending() ? `<p class="choice-note">門口還有 ${pending()} 件消息。<button data-open="inbox">先聽來客</button></p>` : ""}<div class="tabs"><button data-open="extras" class="spend-entry">${["canvass", "rally"].includes(action) ? "花錢加碼：立看板・送小禮物" + (s.day >= G.GOTV_FROM ? "・催票" : "") : action === "tv" ? "花錢加碼：指定節目議題" + (s.day >= G.GOTV_FROM ? "・催票" : "") : "加碼與後勤"}</button></div>${!p.allowed || conflict() ? `<p class="danger">${esc(conflict() || p.reason)}</p>` : ""}`,
    {
      text: startLabel(),
      fn: depart,
      disabled: !p.allowed || !!conflict(),
      // Changing the day's action stays one tap away, next to the departure button.
      alt: { text: "換行程", fn: catalog },
    },
  );
}
function topicGrid(kind) {
  return (
    '<div class="topic-grid">' +
    G.availableTopics(s)
      .filter((t) => t.id !== "tip")
      .map((t) => {
        const done =
            kind === "personal"
              ? !!s.player.studied?.[t.id]
              : s.player.insight?.[t.id]?.level === "precise",
          on =
            kind === "personal"
              ? cfg.topic === t.id
              : (cfg.research || []).includes(t.id);
        return `<button data-action="${kind}" data-id="${t.id}" aria-pressed="${on}" ${done || (kind === "research" && action === "prepare" && cfg.topic === t.id) ? "disabled" : ""}><b>${esc(t.short || t.title)}</b><small>${topicState(t.id)}</small></button>`;
      })
      .join("") +
    "</div>"
  );
}
// One label set for research depth, matching the answer screen.
function topicState(id) {
  const level = s.player.insight?.[id]?.level;
  return level === "precise"
    ? "摸清楚"
    : level
      ? "知道方向"
      : s.player.known.includes(id)
        ? "有資料"
        : "沒研究";
}
function teamCountText() {
  return `已派 ${used()} / ${capacity()} 人，其他人${["prepare", "dig", "recruit"].includes(action) ? "自行拉票" : "陪你出門"}。`;
}
function assignmentText() {
  const p = preview();
  return p.teamAssignments
    .map(
      (m) =>
        `${m.name}：${{ research: "查 " + TOPIC(m.researchTopic), follow: "陪你出門", canvass: "自行拉票", booth: "募款攤", stream: "直播控場" }[m.task] || "待命"}`,
    )
    .join("／");
}
function team() {
  if (s.phase !== "plan") return resume();
  showPanel(
    "派助手研究",
    `<div class="research-compare"><p><b>派助手</b>不占你的行程・下回合才能用・看得出各群喜不喜歡（兩人查同題就跟自己查一樣準）</p><p><b>自己查</b>（做準備）用掉今天・這回合就懂・看得出各群有多喜歡</p></div><div class="inline-note" id="team-summary">${esc(assignmentText())}</div><p class="confirm-strip" id="team-count">${teamCountText()}</p><div class="section-label">點議題派一人</div>${topicGrid("research")}<div class="feature-row"><label for="booth">留 1 人擺小額募款攤</label><input type="checkbox" id="booth" ${cfg.booth ? "checked" : ""}></div><p class="danger" id="team-warning">${conflict()}</p><div class="tabs"><button data-open="teamhub">團隊與招募</button><button data-open="extras">加碼與後勤</button><button data-open="knowledge">研究筆記</button></div>`,
    {
      text: action ? "回到行程" : "選主行程",
      fn: () => (action ? planDetail() : catalog()),
    },
  );
}
function updateTeam() {
  sync();
  if ($("team-summary")) $("team-summary").textContent = assignmentText();
  if ($("team-count"))
    $("team-count").textContent = teamCountText();
  if ($("team-warning")) $("team-warning").textContent = conflict();
}
function extras() {
  if (s.phase !== "plan") return resume();
  if (!action) return catalog();
  const p = preview(),
    items = [];
  if (["canvass", "rally"].includes(action))
    items.push(
      ["gifts", "帶小禮物", G.COSTS.gifts],
      ["billboard", "立看板", G.COSTS.billboard],
    );
  if (s.day >= G.GOTV_FROM && ["canvass", "rally", "tv"].includes(action))
    items.push(["gotv", "選前催票", G.COSTS.gotv]);
  showPanel(
    "加碼與後勤",
    `<p>跟主行程一起做，不另占回合。</p>${items.map(([id, t, c]) => `<div class="feature-row"><label for="extra-${id}">${t} · ${wan(c)}</label><input id="extra-${id}" data-extra="${id}" type="checkbox" ${cfg[id] ? "checked" : ""}></div>`).join("")}${!items.length ? '<p class="empty">這個行程目前沒有現場加碼。</p>' : ""}${
      action === "tv"
        ? '<div class="section-label">付費指定節目議題 · ' +
          wan(G.COSTS.brief) +
          '</div><div class="rows">' +
          G.tvPool(s)
            .map(
              (t) =>
                `<button data-action="brief-topic" data-id="${t}" aria-pressed="${cfg.brief === t}">${TOPIC(t)}<small>${s.player.known.includes(t) ? "有資料" : "沒研究 · 指定後節目前先摸到方向"}</small></button>`,
            )
            .join("") +
          "</div>"
        : ""
    }<div class="tabs"><button data-open="team">派助手研究</button><button data-open="files">爆料檔案</button></div><div class="confirm-strip" id="extra-total">合計費用 ${wan(p.totalCost)}</div>`,
    { text: "回到行程", fn: planDetail },
  );
}
function renderPins() {
  if ($("wall-summary"))
    $("wall-summary").textContent = s.journal.length
      ? "走訪 " +
        s.journal.filter((j) => ["canvass", "rally"].includes(j.player.action))
          .length +
        " 次 · 公開 " +
        G.platformView(s).total +
        " 項"
      : "首站還沒出發";
  const visits = s.journal.filter((j) =>
    ["canvass", "rally"].includes(j.player.action),
  );
  $("wall-pins").innerHTML = Object.entries(POINTS)
    .map(([id, [x, y]]) => {
      const n = visits.filter((j) => j.player.venue === id).length;
      return `<circle cx="${650 + x * 0.47}" cy="${66 + y * 0.35}" r="${n ? 7 : 4}" fill="${n ? "#ae5a38" : "#7c9177"}"/>`;
    })
    .join("");
}
function mapMarkup() {
  const journals = s.journal.filter((j) =>
    ["canvass", "rally"].includes(j.player.action),
  );
  return (
    '<svg class="mini-map" viewBox="0 0 560 290" role="group" aria-label="選區足跡地圖"><path d="M35 245Q210 250 525 265" stroke="#9fc6bf" stroke-width="22" fill="none"/><path d="M50 55Q240 95 470 60M90 155L455 150M160 70L160 200L320 225L410 145L390 65" fill="none" stroke="#d3c398" stroke-width="16"/>' +
    Object.entries(POINTS)
      .map(([id, [x, y]]) => {
        const n = journals.filter((j) => j.player.venue === id).length,
          ch = G.chiefPreview(s, id),
          chiefTag = ch ? `<text class="map-chief-label${ch.broken ? " won" : ""}" x="${x}" y="${y - 38}" text-anchor="middle">${chiefShort(ch)}</text>` : "";
        return `<g class="map-site ${n ? "visited" : ""}" role="button" tabindex="0" data-action="map-venue" data-id="${id}" aria-label="${G.VENUES[id].title}，跑過 ${n} 次"><rect x="${x - 57}" y="${y - 33}" width="114" height="65" rx="10"/><circle cx="${x}" cy="${y - 15}" r="12"/><text class="count" x="${x}" y="${y - 11}" text-anchor="middle">${n || "·"}</text><text x="${x}" y="${y + 20}" text-anchor="middle">${G.VENUES[id].title}</text>${chiefTag}</g>`;
      })
      .join("") +
    "</svg>"
  );
}
function mapPanel() {
  const c = G.campaignView(s),
    platform = G.platformView(s);
  showPanel(
    "牆上的選戰地圖",
    `<p>${esc(c.plan ? c.hint : "跑過的地方會記在這裡。")}</p>${mapMarkup()}<p class="key">數字＝你跑過的次數；點地點排街訪。</p><div class="tabs"><button data-open="strategy">調整選戰方向</button><button data-open="teamhub">團隊與招募</button></div>${chiefList()}<div class="section-label">目前走到哪裡</div>${c.progress.map((p) => `<p style="margin:6px 0">${p.done ? "✓" : "○"} ${esc(p.label)}</p>`).join("")}<div class="section-label">已公開的承諾</div>${platform.items.length ? platform.items.map((p) => `<p>${esc(p.quote || p.text || p.title)}<small>第 ${p.day || p.round || "?"} 回合</small></p>`).join("") : '<p class="empty">還沒公開具體政見；研究不算承諾。</p>'}<details><summary>行動足跡 · ${s.journal.length} 回合</summary><ol class="route-history">${s.journal.map((j) => `<li>第 ${j.day} 回合 · ${esc(placeLabel({ id: j.player.action, venueTitle: j.player.venueTitle }) || "辦公室")} · ${NAMES[j.player.action]}<br>${esc(j.player.quote || j.player.result || j.summary.headline)}</li>`).join("") || "<li>還沒出發。</li>"}</ol></details>`,
    { text: "看完了，回辦公室", fn: closePanel },
  );
}
function strategy() {
  if (s.phase !== "plan")
    return toast("選戰已結束；可以回顧，下一局再調整方向。");
  const c = G.campaignView(s);
  showPanel(
    "把方向排進行程",
    `<p>選了就預排第一步：地方→街訪，宣傳→研究。</p><div class="rows">${G.CAMPAIGN_PLANS.map((p) => `<button data-action="strategy" data-id="${p.id}" aria-pressed="${c.plan === p.id}"><strong>${p.title}</strong><small>${p.pitch}</small></button>`).join("")}</div>`,
  );
}
function officeEstimate() {
  const e = G.supportEstimate(s),
    extra = Math.max(0, 3 - s.day) * 0.4;
  return {
    ...e,
    groups: e.groups.map((g) => ({
      ...g,
      lo: Math.max(0, Math.floor((g.lo - extra) * 10) / 10),
      hi: Math.ceil((g.hi + extra) * 10) / 10,
    })),
  };
}
function polls() {
  const e = officeEstimate(),
    r = G.raceView(s),
    route = G.routeView(s),
    rumor = G.rumorView(s),
    origin = G.originView?.(s);
  showPanel(
    "選情夾 · " + (e.poll ? "本回合民調" : "幕僚估計"),
    `<div class="statline"><span>目前估計<b>第 ${r.rank} 名</b></span><span>距當選線<b>${num(Math.max(0, r.line - r.you))} 票</b></span></div><p>${s.pollReports?.length ? "依最新民調與後續訪查估計" : "選前初估，街坊回報還少"}。黑線是我們的基本盤目標。</p>${e.groups.map((g, i) => `<div class="poll-row"><b>${g.title}${route && route.group === i ? '<i class="poll-star" aria-label="主力">★</i>' : ""}</b><div class="poll-track"><i class="poll-range" style="left:${Math.min((g.lo / 12) * 100, 95)}%;width:${Math.max(2, Math.min(((g.hi - g.lo) / 12) * 100, 100 - (g.lo / 12) * 100))}%"></i><i class="poll-target" style="left:${Math.min((route.targets[i].pct / 12) * 100, 98)}%"></i></div><span>${g.lo}–${g.hi}%</span></div>`).join("")}<div class="section-label">出身與基本盤</div>${origin ? `<p class="origin-line"><i>出身</i><b>${esc(origin.title)}</b><em class="og">＋${esc(origin.good)}</em><em class="ob">－${esc(origin.bad)}</em><small>${esc(origin.info)}</small></p>` : ""}${route ? `<p class="origin-line base"><i>基本盤</i><b>${esc(route.title)}</b><em class="og">＋${esc(route.perk)}</em><small>${esc(route.perkText)}</small></p>` : ""}<div class="section-label">小馬的動向</div><p>${esc(rumor.text || "目前沒有新消息。")} <span class="badge">${esc(rumor.reliability || "傳聞")}</span></p><div class="tabs"><button data-open="files">查證與爆料檔案</button><button data-open="map">看走過的地方</button></div>`,
    { text: "闔上選情夾", fn: closePanel },
  );
}
function network() {
  const n = G.networkView(s);
  showPanel(
    "地方小隊",
    (n.active
      ? `<p>小隊和受薪助手分開，只能去實際支持你的地方、講已公開政見。</p><label>地點 <select id="network-venue">${n.venues.map((v) => `<option value="${v.id}" ${v.id === n.venue ? "selected" : ""}>${v.title}</option>`).join("")}</select></label><p><label>政見 <select id="network-topic">${n.topics.map((t) => `<option value="${t.id}" ${t.id === n.topic ? "selected" : ""}>${esc(t.title)}</option>`).join("")}</select></label></p>${!n.topics.length ? "<p>還沒有可交給小隊講的具體政見。</p>" : ""}`
      : "<p>還沒成立地方小隊。先公開具體政見，跑熟一個地方，讓當地人願意替你繼續跑。</p>") + chiefList(),
    { text: "回辦公室", fn: closePanel },
  );
}
function files() {
  const f = G.fileView(s);
  showPanel(
    "檔案櫃 · 查證與爆料",
    "<p>未查證就指控可能反咬自己。查證費用即刻扣除，發布仍要安排主行程。</p>" +
      f.items
        .map(
          (d) =>
            `<article class="inline-note"><b>${esc(d.title)}</b><p>${esc(d.evidence || d.text)}${d.truthLabel ? " · " + esc(d.truthLabel) : ""}</p><div class="tabs"><button data-action="verify" data-id="${d.id}" ${!d.canVerify ? "disabled" : ""}>查證 · ${wan(d.verifyCost || 0)}</button><button data-action="publish" data-id="${d.id}" ${!d.ready || d.released ? "disabled" : ""}>${d.released ? "已發布" : "安排記者會"}</button></div></article>`,
        )
        .join("") +
      (f.items.length ? "" : '<p class="empty">目前沒有可公開的資料。</p>') +
      '<button data-action="select" data-id="dig">去挖小馬的料 · ' +
      wan(G.COSTS.dig) +
      '</button><p class="footnote">' +
      esc(f.dig.reason || "可能挖到、空手，或被反咬。") +
      "</p>",
    { text: "收好檔案", fn: closePanel },
  );
}
const CRISIS_KIND = {
  family: "家族土地爭議",
  car: "名車違停",
  fees: "助理費疑雲",
  kickback: "回扣錄音",
  driver: "主任酒駕關說",
  lounge: "建商招待所",
  romance: "深夜約會",
  past: "舊貼文",
  volunteer: "志工失言",
};
const crisisChoice = (c) =>
  ({
    pay: "發澄清文宣",
    apologize: "公開道歉切割",
    fight: c.won ? "硬槓反控成功" : "硬槓反控炎上",
  })[c.choice] || "等待處理";
const groupTitle = (g) => G.GROUPS?.[g]?.title || ["長輩", "中年", "青年"][g];
let alarmed = "";
function inbox() {
  if (s.phase !== "plan") return resume();
  closePanel();
  const c = G.campaignView(s),
    o = G.offerView(s),
    cr = s.crisis;
  if (cr?.status === "pending") {
    // Whoever came to the door waits there while the crisis is handled.
    if (visitorFor) visitorWait();
    staffTalk();
    const key = cr.round + ":" + cr.kind,
      first = alarmed !== key;
    alarmed = key;
    say(
      "staff",
      "選戰快報",
      cr.text,
      "出發前必須處理。三種做法都會掉票，差在掉多少。",
      [
        {
          text: "發澄清文宣",
          note:
            wan(G.COSTS.crisis) +
            " · 掉票最少" +
            (s.budget.available < G.COSTS.crisis ? "（錢不夠）" : ""),
          fn: () => handleCrisis("pay"),
          disabled: s.budget.available < G.COSTS.crisis,
        },
        {
          text: "公開道歉切割",
          note: "免費 · 被點名的那群掉票",
          fn: () => handleCrisis("apologize"),
        },
        {
          text: "硬槓反控" + (cr.by === "rival" ? "小馬" : ""),
          note: "免費 · 五五波：加票，或掉最多",
          fn: () => handleCrisis("fight"),
        },
      ],
      true,
      {
        type: "crisis",
        tag: "突發事件 · " + (CRISIS_KIND[cr.kind] || "爆料"),
        role: (cr.byName || "其他候選人") + "陣營爆料",
        alarm: first,
      },
    );
    return;
  }
  if (o) {
    visitorEnter(visitorItem());
    say(
      "visitor",
      o.name,
      dealLine(o),
      "答應就公開這個立場；之後改口，對方撤回支持。",
      [
        {
          text: "答應合作",
          fn: () => handleOffer("accept"),
          primary: true,
        },
        {
          text: "婉拒",
          note: "小馬可能接下",
          fn: () => handleOffer("decline"),
        },
      ],
      true,
      { type: "offer", role: o.org + " · 不占回合", rows: offerRows(o) },
    );
    return;
  }
  if (c.opportunity?.status === "open" && !cfg.campaignOpportunity) {
    visitorEnter(visitorItem());
    say(
      "visitor",
      "地方幹部",
      c.opportunity.text,
      "選一場就取代今天的主行程；也可以關掉，照自己的計畫走。",
      c.opportunity.choices.map((x) => ({
        text: x.title,
        note: x.gain + " " + x.cost,
        fn: () => {
          visitorLeave();
          choose(x.action, x.config);
        },
        disabled: !x.allowed,
        primary: x.id === "organization",
      })),
      true,
      { type: "invite", role: "兩場行程撞期" },
    );
    return;
  }
  if (c.followup && !cfg.campaignFollowup) {
    // A phone call: nobody walks in.
    say(
      "staff",
      "製作人",
      c.followup.text,
      "接下會改成本回合主行程，助手要留人控場。",
      [
        {
          text: "接續直播",
          fn: () => choose("online", c.followup.config),
          disabled: !c.followup.allowed,
          primary: true,
        },
        { text: "先照自己的安排", fn: hideTalk },
      ],
      true,
      { type: "invite", role: "來電 · 接續直播" },
    );
    return;
  }
  const ch = G.pendingChallenges(s);
  if (ch.length) {
    showPanel(
      "小馬的挑戰",
      ch
        .map(
          (x) =>
            `<p>${esc(x.text || x.title || "小馬對你的承諾提出質疑")} · ${TOPIC(x.topic)}</p>`,
        )
        .join("") +
        '<div class="rows"><button data-action="respond">安排上節目回應</button><button data-action="clarify">發澄清文宣 · ' +
        wan(G.COSTS.clarify) +
        "</button></div>",
    );
    return;
  }
  if (s.day === G.DEBATE_ROUND) {
    say(
      "staff",
      "小葉 · 今天的公開場合",
      "今天有政見發表會，小馬也會上台。",
      "可選擇出席，或照原行程做其他事。",
      [
        { text: "安排政見會", fn: () => choose("debate"), primary: true },
        { text: "維持我的安排", fn: hideTalk },
      ],
    );
    return;
  }
  toast("目前沒有待處理邀約。需要時仍可回來看。");
  hideTalk();
}
function queueVisitor() {
  if (
    s.phase !== "plan" ||
    !tutorialDone ||
    seenVisits.includes(s.day) ||
    !pending()
  )
    return;
  later(() => {
    if (
      s.phase !== "plan" ||
      $("sheet").open ||
      !$("dialogue").classList.contains("hidden")
    )
      return;
    seenVisits.push(s.day);
    save();
    inbox();
  }, 1200);
}
// Option-specific reactions in the office scene; each one matches what the candidate actually chose.
const REACTIONS = {
  pay: "react-leaflets",
  apologize: "react-bow",
  "fight-won": "react-counter",
  "fight-lost": "react-flame",
};
const REACT_MS = 1700;
function reactionMarkup(id, caption) {
  const cap = `<g class="react-cap"><rect x="${752 - 20 - caption.length * 15}" y="96" width="${40 + caption.length * 30}" height="48" rx="24"/><text x="752" y="130" text-anchor="middle">${esc(caption)}</text></g>`;
  if (id === "pay")
    return (
      [
        [-330, -40, -24, 0],
        [-250, -150, 18, 0.12],
        [-120, -210, -10, 0.24],
        [130, -200, 14, 0.18],
        [260, -120, -18, 0.3],
        [-400, 60, 26, 0.36],
      ]
        .map(
          ([dx, dy, r, d]) =>
            `<g class="leaf" style="--dx:${dx}px;--dy:${dy}px;--r:${r}deg;--d:${d}s"><rect x="728" y="380" width="48" height="62" rx="4"/><path d="M738 398H766M738 410H766M738 422H758"/><text x="752" y="394" text-anchor="middle">澄清</text></g>`,
        )
        .join("") + cap
    );
  if (id === "apologize")
    return (
      `<g class="bow-lines"><path d="M690 250q-18 10-26 28M814 250q18 10 26 28"/><path d="M700 300q-14 6-20 18M804 300q14 6 20 18"/></g>` +
      cap
    );
  if (id === "fight-won")
    return (
      `<g class="burst">${Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2;
        return `<path d="M${752 + Math.cos(a) * 120} ${270 + Math.sin(a) * 120}L${752 + Math.cos(a) * 175} ${270 + Math.sin(a) * 175}"/>`;
      }).join("")}</g><text class="bang" x="840" y="250">!</text>` + cap
    );
  return (
    [
      [640, 0],
      [700, 0.15],
      [760, 0.05],
      [820, 0.2],
      [870, 0.1],
    ]
      .map(
        ([x, d]) =>
          `<path class="flame" style="--d:${d}s" d="M${x} 430c-26-30-20-62 4-92c4 22 18 30 26 14c14 34 10 60-10 78c-6 4-14 4-20 0z"/>`,
      )
      .join("") +
    `<g class="smoke"><circle cx="700" cy="230" r="26"/><circle cx="790" cy="210" r="32"/><circle cx="840" cy="250" r="22"/></g>` +
    cap
  );
}
function clearReaction() {
  $("reaction-layer").innerHTML = "";
  $("reaction-layer").setAttribute("class", "reaction");
  for (const c of Object.values(REACTIONS))
    $("candidate").classList.remove(c);
}
function react(id, caption) {
  const cls = REACTIONS[id];
  clearReaction();
  if (!cls) return;
  $("reaction-layer").innerHTML = reactionMarkup(id, caption);
  $("reaction-layer").setAttribute("class", "reaction " + cls);
  $("candidate").classList.add(cls);
  later(clearReaction, REACT_MS);
}
function handleCrisis(choice) {
  if (!G.respondCrisis(s, choice)) return toast("目前不能這樣回應。");
  sync();
  const c = s.crisis,
    id = choice === "fight" ? (c.won ? "fight-won" : "fight-lost") : choice;
  $("dialogue").classList.add("hidden");
  dialogueKind = "";
  react(id, crisisChoice(c));
  later(() => crisisResult(c), REACT_MS);
}
// What the crisis response changed, straight from the engine's effect.
function crisisResult(c) {
  const e = c.effect || {};
  if (s.phase !== "plan" || $("sheet").open)
    return toast(crisisChoice(c) + " · 你 " + signed(e.votes) + " 票");
  say(
    "staff",
    "選戰快報",
    crisisChoice(c) + "。",
    "結果已記入本回合，出發前不用再處理。",
    [{ text: "回到辦公室", fn: hideTalk, primary: true }],
    true,
    {
      type: "crisis",
      resolved: true,
      tag: "突發事件 · 已處理",
      role: CRISIS_KIND[c.kind] || "",
      rows: [
        ["你的支持", signed(e.votes) + " 票（估計）", e.votes < 0 ? "loss" : "gain"],
        Math.abs(e.rival || 0) >= 1
          ? ["小馬", signed(e.rival) + " 票（估計）"]
          : null,
        ["處理支出", c.choice === "pay" ? wan(G.COSTS.crisis) : "免費"],
        [
          "各群",
          (e.byGroup || [])
            .map((v, g) => groupTitle(g) + " " + signed(v))
            .join("　"),
        ],
      ],
    },
  );
}
const dealLine = (o) =>
  String(o.pitch || "").replace(/^[^「]*(?=「)/, "") ||
  "「請你公開支持" + o.planText + "。」";
// The line says who asks for what; these rows say what you get and what it costs, as on the original deal card.
function offerRows(o) {
  const down = (o.faces || [])
      .map((f, g) => (f === "down" ? groupTitle(g) : ""))
      .filter(Boolean),
    known = (o.faces || []).some((f) => f !== "unknown"),
    gets = [
      o.money ? "捐款 " + wan(o.money) : "",
      o.bloc ? "組織票約 " + num(o.bloc) + " 票" : "",
      o.perk === "tv" ? "一次免費上節目" : "",
    ].filter(Boolean),
    costs = [
      G.BROKERS?.[o.id]?.cost ||
        (down.length
          ? "可能得罪" + down.join("、")
          : known
            ? ""
            : "可能得罪反對這個做法的人"),
      o.id === "developer" ? "之後容易爆黑料" : "",
      o.partyLine && !o.partyLine.keeps ? "違反黨的立場" : "",
      o.flip ? "等於改口（你說過「" + o.flip + "」）" : "",
    ].filter(Boolean);
  return [
    ["你得到", gets.join("、") || "對方支持"],
    ["代價", costs.join("；") || "看不出誰會不滿", "loss"],
  ];
}
function handleOffer(choice) {
  const o = G.offerView(s);
  if (!o || !G.respondOffer(s, choice)) return;
  sync();
  const rec = (s.offers || []).find(
      (x) => x.id === o.id && x.respondedDay === s.day,
    ),
    e = rec?.effect;
  visitorLeave();
  const rows =
    choice === "accept"
      ? [
          ["入帳", e?.money ? "+" + wan(e.money) : ""],
          ["組織票", e?.bloc ? "約 " + num(e.bloc) + " 票（守約才保得住）" : ""],
          ["上節目", o.perk === "tv" ? "多一次免費機會" : ""],
          ["估計支持", e ? signed(e.votes) + " 票" + (e.bloc ? "（含組織票）" : "") : "", e?.votes < 0 ? "loss" : "gain"],
          e?.cost?.text
            ? ["代價", e.cost.text + " " + signed(e.cost.votes) + " 票", "loss"]
            : null,
          e?.flip ? ["改口", signed(e.flip.votes) + " 票", "loss"] : null,
          e?.partyLine && !e.partyLine.kept
            ? ["黨的立場", "違反 " + signed(e.partyLine.votes) + " 票", "loss"]
            : null,
        ]
      : [
          [
            "對方",
            rec?.taker === 1
              ? "轉去找小馬：小馬多了組織票約 " + num(rec.bloc) + " 票"
              : "離開了，沒有找上小馬",
            rec?.taker === 1 ? "loss" : "",
          ],
          ["你", "立場不受約束，也沒有拿到捐款或組織票"],
        ];
  say(
    "staff",
    o.name,
    choice === "accept"
      ? "說定了：公開支持「" + o.planText + "」。"
      : "婉拒了" + o.org + "。",
    choice === "accept"
      ? "合作不占主行程，今天還能照常出門。"
      : "今天照原本的安排走。",
    [{ text: "知道了", fn: hideTalk, primary: true }],
    true,
    {
      type: "offer",
      resolved: true,
      tag: "合作邀約 · " + (choice === "accept" ? "已答應" : "已婉拒"),
      role: o.org,
      rows,
    },
  );
}
// The person at the door: who they are follows the pending item they came for.
let visitorFor = "";
function visitorItem() {
  if (s.phase !== "plan") return null;
  const o = G.offerView(s);
  if (o) {
    const m = o.name.match(/(老K|\S(?:董|主委|會長|理事長))$/),
      short = m ? m[1] : o.name;
    return {
      key: "offer:" + o.id,
      look: o.id,
      label: [short, m ? o.name.slice(0, -short.length) : o.org],
    };
  }
  const c = G.campaignView(s);
  if (c.opportunity?.status === "open" && !cfg.campaignOpportunity)
    return {
      key: "opportunity",
      look: "地方幹部",
      label: ["地方幹部", "邀你組隊"],
    };
  return null;
}
function visitorEnter(item) {
  if (!item) return;
  visitorArt(item.look, item.label);
  visitorFor = item.key;
  $("visitor").classList.remove("waiting");
  move("visitor", 350, 300, 0.8);
}
function visitorWait() {
  $("visitor").classList.add("waiting");
  move("visitor", 80, 262, 0.7);
}
function visitorLeave() {
  visitorFor = "";
  $("visitor").classList.remove("waiting");
  if (!$("visitor").classList.contains("gone"))
    move("visitor", -140, 262, 0.7, true);
}
// Handled visitors walk out; one still waiting for an answer stays at the door with a cue.
function settleVisitor() {
  if (visitorFor && visitorItem()?.key === visitorFor) visitorWait();
  else visitorLeave();
}
function depart() {
  if (s.phase !== "plan" || !action) return;
  if (conflict()) return team();
  if (s.crisis?.status === "pending") return inbox();
  if (!preview().allowed) return planDetail();
  begin();
}

function begin() {
  if (s.phase !== "plan" || conflict() || !G.begin(s, action, cfg)) {
    sync();
    return toast("條件已變動，請重新確認行程。");
  }
  closePanel();
  hideTalk();
  sync();
  save();
  sfx.play("depart");
  travel();
}
function travel() {
  clearTimers();
  audioScene();
  $("dialogue").classList.add("hidden");
  $("toast").classList.remove("show");
  $("room").classList.remove("field");
  $("venue-scene").hidden = true;
  const A = window.DayArt,
    p = s.pending;
  A.setCandidates({
    player: {
      identity: s.settings.background,
      outfit: G.BACKGROUNDS[s.settings.background].outfit,
      party: s.settings.affiliation,
      name: G.candidateName(s.settings),
    },
  });
  $("travel-scene").hidden = false;
  $("world-map").innerHTML =
    A.scene() +
    '<svg class="travel-path" viewBox="0 0 1200 650"></svg><div class="travel-player" id="map-walker"></div>' +
    mapChiefBadges(A);
  $("travel-caption").textContent = "從辦公室出發 · " + placeLabel(p);
  const route = A.visualRoute(p.id, p.venue),
    lengths = route
      .slice(1)
      .map((b, i) => Math.hypot(b.x - route[i].x, b.y - route[i].y)),
    total = lengths.reduce((a, b) => a + b, 0);
  document.querySelector(".travel-path").innerHTML =
    '<polyline points="' +
    route.map((v) => v.x + "," + v.y).join(" ") +
    '" fill="none" stroke="#d19643" stroke-width="5" stroke-linecap="round" stroke-dasharray="7 10"/>';
  const duration = matchMedia("(prefers-reduced-motion:reduce)").matches
      ? 0
      : Math.max(1800, Math.min(3600, total * 5)),
    started = performance.now(),
    e = epoch;
  let previous = route[0],
    lastFrame = null;
  function tick(now) {
    if (e !== epoch || s.phase !== "travel") return;
    let ratio = duration ? Math.min(1, (now - started) / duration) : 1,
      d = total * ratio,
      pos = route.at(-1);
    for (let i = 0; i < lengths.length; i++) {
      if (d <= lengths[i] && lengths[i]) {
        pos = {
          x: route[i].x + ((route[i + 1].x - route[i].x) * d) / lengths[i],
          y: route[i].y + ((route[i + 1].y - route[i].y) * d) / lengths[i],
        };
        break;
      }
      d -= lengths[i];
    }
    // Step in real seconds (as day-ui.js does) so a 120 Hz phone does not walk twice as fast.
    const dt = Math.max(0, Math.min((now - (lastFrame ?? now)) / 1000, 0.1));
    lastFrame = now;
    const turned = A.facing(pos.x - previous.x, pos.y - previous.y),
      stepped = A.walkStep(dt, ratio < 1);
    const actor = $("map-walker");
    actor.style.left = pos.x / 12 + "%";
    actor.style.top = pos.y / 6.5 + "%";
    if (turned || stepped || !actor.innerHTML) actor.innerHTML = A.avatar("player");
    previous = pos;
    if (ratio === 1) {
      later(finishTravel, 350);
      return;
    }
    travelFrame = requestAnimationFrame(tick);
  }
  travelFrame = requestAnimationFrame(tick);
}
function finishTravel() {
  if (s.phase !== "travel") return;
  clearTimers();
  $("travel-scene").hidden = true;
  G.arrive(s);
  save();
  audioScene();
  resume();
}

// Visitors use the original clay-toy looks: named residents keep their own look, brokers the look the original deal card gives them.
const BROKER_LOOK = {
    developer: "middle-office",
    temple: "elder-hat",
    chiefs: "elder-cart",
    merchants: "middle-polo",
    faction: "middle-mom",
    media: "host",
  },
  ROLE_LOOK = {
    小馬: ["rival", "對手"],
    主持人: ["host", "節目"],
    地方幹部: ["middle-polo", "地方"],
  };
function visitorArt(key, label) {
  const A = window.DayArt,
    look =
      BROKER_LOOK[key] ||
      A?.speakerLooks?.[key] ||
      ROLE_LOOK[key]?.[0] ||
      "middle-apron",
    [sheet, row, col] = A?.looks?.[look] || ["support3", 0, 0],
    f = A?.sheets?.[sheet]?.[row]?.[col] || { x: 186, y: 74, w: 253, h: 418 },
    el = document.querySelector("#visitor .body svg");
  el.setAttribute("viewBox", [f.x, f.y, f.w, f.h].join(" "));
  el.querySelector("image").setAttribute(
    "href",
    "assets/matte-toy-v1/" + (A?.files?.[sheet] || "game/support-v3.webp"),
  );
  $("visitor").dataset.look = look;
  const [name, role] = label || [key, ROLE_LOOK[key]?.[1] || ""];
  nameTag("visitor", name, role);
}
// Name tags sit on the character's feet: name, then a smaller role, on a pill sized to the text.
function nameTag(id, name, role) {
  document.querySelector("#" + id + " .tag-name").textContent = name;
  document.querySelector("#" + id + " .tag-role").textContent = role
    ? " " + role
    : "";
  $(id).setAttribute(
    "aria-label",
    id === "staff"
      ? "幕僚小葉：報告與助手分工"
      : "門口訪客 " + name + (role ? "（" + role + "）" : ""),
  );
  fitTag(id);
}
function fitTag(id) {
  const t = document.querySelector("#" + id + " .person-label"),
    bg = document.querySelector("#" + id + " .name-bg"),
    w = t.getComputedTextLength?.();
  if (!w) return;
  const cx = Number(t.getAttribute("x"));
  bg.setAttribute("x", cx - w / 2 - 12);
  bg.setAttribute("width", w + 24);
}
matchMedia("(max-width:900px)").addEventListener("change", () => {
  fitTag("staff");
  fitTag("visitor");
});
// The door shows what is waiting: a crisis is flagged differently from a visitor.
function doorCue() {
  const crisis = s.crisis?.status === "pending";
  $("knock").classList.toggle("alert", crisis);
  $("knock").querySelector("text").textContent = crisis
    ? "突發事件 ▸"
    : "來客的消息 ▸";
}
function knowledge() {
  const known = G.availableTopics(s).filter(
    (t) => s.player.known.includes(t.id) && t.id !== "tip",
  );
  showPanel(
    "小葉的研究筆記",
    known
      .map((t) => {
        const ins = s.player.insight?.[t.id];
        return (
          '<details class="inline-note"><summary>' +
          esc(t.title) +
          " · " +
          topicState(t.id) +
          "</summary><p>" +
          esc(t.ask || "") +
          "</p>" +
          t.plans
            .map(
              (p) =>
                "<p><b>" +
                esc(p.text) +
                "</b><br>" +
                G.answerReactions(s, t.id, p.id)
                  .map((x) => esc(x.text))
                  .join("／") +
                "</p>",
            )
            .join("") +
          "</details>"
        );
      })
      .join("") ||
      `<p class="empty">還沒有筆記。</p>${capacity() ? '<button data-open="team">派助手研究</button>' : ""}`,
    { text: "把筆記放回桌上", fn: closePanel },
  );
}

function field() {
  const A = window.DayArt,
    p = s.pending,
    id = p.id,
    kind = ["canvass", "rally"].includes(id)
      ? p.venue
      : id === "press"
        ? "tv"
        : id;
  A.setCandidates({
    player: {
      identity: s.settings.background,
      outfit: G.BACKGROUNDS[s.settings.background].outfit,
      party: s.settings.affiliation,
      name: G.candidateName(s.settings),
    },
  });
  const mix = G.crowdMix(s, p.venue || "market"),
    crowd = Array.from({ length: 8 }, (_, i) => ({
      group:
        (i + 0.5) / 8 < mix[0] ? 0 : (i + 0.5) / 8 < mix[0] + mix[1] ? 1 : 2,
    }));
  $("venue-scene").innerHTML = A.interior(kind, {
    crowd,
    speaker: id === "canvass" ? G.speakerFor(s, p.venue) : null,
    rain: G.weather(s).id === "rain",
    staff: capacity(),
    mode: id,
    topic: G.TOPICS[p.topic]?.title,
  });
  $("venue-scene").hidden = false;
  $("room").classList.add("field");
  sync();
}

// Each group's expected reaction as a face: like, dislike, "?" when the group is split, a dash when unknown.
const REACTION_TONE = { "＋＋": "up", "＋": "up", "−": "down", "−−": "down", 分歧: "unknown" };
function reactionFaces(list) {
  return (
    list
      .map((r, i) => {
        const tone = REACTION_TONE[r.mark],
          g = Number.isInteger(r.group) ? r.group : i;
        return `<span class="reaction-face" title="${esc(r.text)}"><b>${esc(groupTitle(g))}</b>${tone && window.DayArt?.faceIcon ? window.DayArt.faceIcon(tone) : '<i class="face-unknown">—</i>'}<span class="sr-only">${esc(r.text)}</span></span>`;
      })
      .join("")
  );
}
/* Hindsight, as in the original (day-ui.js): every other unlocked answer is replayed on a deep copy with the
   same draws, so the result card can say what a better answer was worth. The live state is answered once. */
function alternatives(id) {
  if (s.pending?.topic === "tip") return null;
  const base = JSON.stringify(s);
  return G.question(s)
    .options.filter((o) => o.unlocked && o.id !== id)
    .map((o) => {
      const t = JSON.parse(base);
      return G.answer(t, o.id)
        ? { text: o.text, total: t.recap.totalVotes, byGroup: t.recap.totalByGroup || null }
        : null;
    })
    .filter(Boolean);
}
function remember(alts, option, locked = 0) {
  if (!alts || !s.recap) return;
  const r = s.recap,
    best = [...alts].sort((a, b) => b.total - a.total)[0],
    gain = best ? best.total - r.totalVotes : 0;
  (s.hindsight ||= {})[s.day] = {
    chosen: option.text,
    locked,
    total: r.totalVotes,
    best:
      gain >= 1
        ? {
            text: best.text,
            gain,
            byGroup:
              best.byGroup && r.totalByGroup
                ? best.byGroup.map((v, k) => v - r.totalByGroup[k])
                : null,
          }
        : null,
  };
}
const HINDSIGHT_MIN = 30;
// One line: the better answer and the group that would have made the difference.
function hindsightLine(h) {
  if (!h) return null;
  if (!h.best || h.best.gain < HINDSIGHT_MIN) {
    // Only say "best" when it truly was: locked answers (not researched) or a loss mean there was room left.
    if (h.locked) return ["能選的答法裡這個最好；先研究這題，下次才答得出具體做法。", ""];
    if ((h.total ?? 0) < 0) return ["其他答法也一樣會掉票；這題不好答，換個地方或先研究再來。", ""];
    return ["這題你答得最好。", ""];
  }
  const k = h.best.byGroup ? h.best.byGroup.indexOf(Math.max(...h.best.byGroup)) : -1;
  return [
    "答「" +
      h.best.text +
      "」約多 " +
      num(h.best.gain) +
      " 票" +
      (k >= 0 && h.best.byGroup[k] >= 1
        ? "，差在" + groupTitle(k) + "（" + signed(h.best.byGroup[k]) + "）"
        : "") +
      "。",
    "warn",
  ];
}
// A resident recalls what you said only when it was this same person on this same issue.
function sameTopicMemory(q) {
  const topic = s.pending?.topic,
    m = Object.values(s.player.residents || {}).find((r) => r.name === q.speakerName && r.topic === topic && r.lastQuote);
  return m ? `${m.name}記得你上次說：「${m.lastQuote}」` : "";
}
// Residents speak their opinion, not the issue's name, so the dialogue names the issue and what is being decided.
function issueLine(q) {
  const t = G.TOPICS[s.pending?.topic];
  return t ? `議題：${t.title}。${t.ask || ""}` : "";
}
function ask() {
  field();
  sfx.play("question");
  const q = G.question(s);
  visitorArt(q.speaker?.includes("小馬") ? "小馬" : q.speakerName || "主持人");
  say(
    "field",
    q.speaker,
    q.text,
    issueLine(q) + (sameTopicMemory(q) ? "\n" + sameTopicMemory(q) : ""),
    q.options.map((o) => ({
      text: o.text,
      note:
        (o.unlocked ? o.detail : o.whyLocked) +
        (o.tags?.length ? " · " + o.tags.map((t) => t.text).join("；") : ""),
      reactions: o.unlocked ? o.reactions : null,
      disabled: !o.unlocked,
      fn: () => {
        if (s.phase !== "question") return;
        const alts = alternatives(o.id),
          locked = G.question(s).options.filter((x) => !x.unlocked).length;
        if (G.answer(s, o.id)) {
          remember(alts, o, locked);
          save();
          recap();
        }
      },
      primary: o.preselected,
    })),
    false,
  );
  $("actions").classList.add("answer-list");
  const opts = q.options;
  $("actions")
    .querySelectorAll("button")
    .forEach((b, i) => {
      b.classList.add("wide");
      if (opts[i]?.unlocked && opts[i].reactions?.length) {
        const row = document.createElement("span");
        row.className = "reaction-faces";
        row.innerHTML = reactionFaces(opts[i].reactions);
        b.append(row);
      }
    });
}
/* ---------- Round result: the reaction on the spot, then the next round ----------
   Mirrors the original recap (day-ui.js sceneView/dockRecap): the speaker reacts, the crowd's faces follow the
   votes, and one glanceable line says how the round went. No extra button: tap to continue, or it moves on. */
const GROUP_KEYS = ["elder", "middle", "young"],
  RESULT_MS = 4000,
  HOLD_MS = 350,
  FACE_VOTES = 8,
  signed = (n) => {
    const v = Math.round(Number(n || 0));
    return (v > 0 ? "+" : v < 0 ? "−" : "±") + Math.abs(v).toLocaleString("zh-TW");
  },
  toneOf = (n) =>
    Math.round(n || 0) > 0 ? "up" : Math.round(n || 0) < 0 ? "down" : "zero";
let resultClock = null;
function crowdCount(mix) {
  const raw = (mix || [1 / 3, 1 / 3, 1 / 3]).map((m) => m * 10),
    counts = raw.map(Math.floor);
  const left = 10 - counts.reduce((a, b) => a + b, 0);
  raw
    .map((r, g) => [r - counts[g], g])
    .sort((a, b) => b[0] - a[0])
    .slice(0, left)
    .forEach(([, g]) => counts[g]++);
  return counts;
}
function crowdOf(mix, key) {
  const list = [];
  crowdCount(mix).forEach((n, g) => {
    for (let j = 0; j < n; j++)
      list.push({
        group: g,
        variant: j % 2,
        k: G.rand(s.seed, "crowd-slot", key, g, j),
      });
  });
  return list.sort((a, b) => a.k - b.k).map(({ k, ...c }) => c);
}
// A group's faces follow its votes from the answer, as in the original venue scene.
function withReactions(list, groups) {
  const seen = [0, 0, 0],
    size = [0, 0, 0];
  for (const c of list) size[c.group]++;
  const counts = size.map((n, gi) => {
    const g = groups?.[gi];
    if (!g?.reached || !n) return { up: 0, down: 0 };
    const moved = Math.min(
      n,
      Math.max(
        Math.round((n * Math.abs(g.votes)) / g.reached / FACE_VOTES),
        Math.abs(g.votes) >= 30 ? 1 : 0,
      ),
    );
    const gain = Number.isFinite(g.gain) ? g.gain : Math.max(0, g.votes),
      loss = Math.max(0, gain - g.votes),
      up = gain + loss > 0 ? Math.round((moved * gain) / (gain + loss)) : 0;
    return { up, down: moved - up };
  });
  return list.map((c) => {
    const j = seen[c.group]++,
      k = counts[c.group];
    return {
      ...c,
      tone: j < k.up ? "up" : j < k.up + k.down ? "down" : "flat",
    };
  });
}
// Who reacts and where: the same choices as the original recap scene.
function resultView(r) {
  const p = r.player,
    team = s.player.team?.members || [],
    first = String(p.result || "").split("。")[0];
  if (["prepare", "recruit", "dig"].includes(p.action))
    return {
      kind: null,
      who:
        p.action === "recruit"
          ? (team.at(-1)?.name || "新夥伴") + " · 新夥伴"
          : (team[0]?.name || "小葉") + " · 幕僚",
      text: first ? first + "。" : "",
    };
  if (p.action === "fundraise")
    return {
      kind: "fundraise",
      crowd: [],
      who: "街坊募款",
      text: first ? first + "。" : "這次募款已記入競選預算。",
    };
  if (["canvass", "tv", "online", "debate", "rally"].includes(p.action)) {
    const c = p.conversation,
      kind = ["canvass", "rally"].includes(p.action) ? p.venue : p.action;
    return {
      kind,
      mode: p.action,
      crowd: withReactions(crowdOf(p.crowd, kind), p.effects?.groups),
      speaker: c
        ? { group: c.group ?? 0, variant: 1, tone: c.mood, name: c.name }
        : null,
      who: c
        ? c.name + " · " + (G.GROUPS?.[c.group]?.title || "居民")
        : p.action === "debate"
          ? "小馬 · 對手"
          : p.action === "rally"
            ? "造勢活動"
            : p.action === "online"
              ? "直播結束"
              : "主持人",
      text: c
        ? (c.reaction || c.lastReaction)?.replace(/^[^「]*「/, "").replace(/」$/, "") ||
          first + "。"
        : p.action === "debate"
          ? "「" + (r.rival?.quote || r.rival?.result || "") + "」"
          : p.action === "online"
            ? "本次觸及 " + num(p.effects?.contacts) + " 人。"
            : p.action === "rally"
              ? "現場 " + num(p.effects?.contacts) + " 人聽完你的政見。"
              : "「謝謝" + G.candidateName(s.settings) + "。」",
      mood: c?.mood,
    };
  }
  return {
    kind: p.action === "press" ? "tv" : null,
    mode: p.action,
    crowd: [],
    who: p.title || NAMES[p.action] || "這回合",
    text: first ? first + "。" : "",
  };
}
function hindsightMarkup(r) {
  const h = r.player?.topic ? hindsightLine(s.hindsight?.[r.day]) : null;
  return h ? `<p class="rr-hindsight ${h[1]}"><b>檢討</b>${esc(h[0])}</p>` : "";
}
function resultMarkup(r, v) {
  const sum = r.summary || {},
    before = sum.before || { rank: r.raceBefore?.rank },
    after = sum.after || { rank: r.race?.rank },
    gap = after.gap ?? (r.race?.line || 0) - (r.race?.you || 0),
    rankTone =
      before.rank && after.rank
        ? after.rank < before.rank
          ? "up"
          : after.rank > before.rank
            ? "down"
            : "zero"
        : "zero",
    chips = (sum.sources || [])
      .filter((x) => Math.abs(x.votes) >= 1)
      .sort(
        (a, b) =>
          (b.id === "answer") - (a.id === "answer") ||
          Math.abs(b.votes) - Math.abs(a.votes),
      )
      .slice(0, 3),
    mood = v.mood === "up" || v.mood === "down" ? v.mood : toneOf(r.totalVotes),
    last = r.day >= G.DAYS;
  return (
    `<div class="rr-voice ${mood}"><span class="rr-who">${esc(v.who)}</span><p>${esc(v.text)}</p></div>` +
    `<div class="rr-score ${toneOf(r.totalVotes)}"><strong>${signed(r.totalVotes)}</strong><span>票 · 第 ${r.day} 回合</span></div>` +
    `<p class="rr-rank ${rankTone}"><b>${before.rank && before.rank !== after.rank ? "第 " + before.rank + " 名 → " : before.rank ? "維持" : ""}第 ${after.rank || "—"} 名</b><small>${gap <= 0 ? "過線 " + num(-gap) + " 票" : "距當選線 " + num(gap) + " 票"}</small></p>` +
    (chips.length
      ? `<ul class="rr-chips">${chips.map((x) => `<li class="${toneOf(x.votes)}">${esc(x.label)} <b>${signed(x.votes)}</b></li>`).join("")}</ul>`
      : "") +
    hindsightMarkup(r) +
    `<div class="rr-next"><i class="rr-timer"></i><span>${last ? "點一下前往開票" : "點一下繼續 · 第 " + (r.day + 1) + " 回合"}</span></div>`
  );
}
function resultCard() {
  let el = document.getElementById("round-result");
  if (!el) {
    el = document.createElement("section");
    el.id = "round-result";
    $("room").append(el);
  }
  if (!el.dataset.ready) {
    el.dataset.ready = "1";
    el.className = "round-result";
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    el.setAttribute("tabindex", "0");
    // Press and hold to keep reading; a short tap moves on.
    el.addEventListener("pointerdown", () => {
      if (!resultClock) return;
      resultClock.down = performance.now();
      pauseResult();
    });
    el.addEventListener("pointerup", () => {
      if (!resultClock) return;
      const held = performance.now() - (resultClock.down ?? 0);
      resultClock.down = null;
      if (held < HOLD_MS) continueResult();
      else runResult();
    });
    el.addEventListener("pointercancel", () => {
      if (resultClock) resultClock.down = null;
      runResult();
    });
    el.addEventListener("pointerenter", (e) => {
      if (e.pointerType === "mouse") pauseResult();
    });
    el.addEventListener("pointerleave", (e) => {
      if (e.pointerType === "mouse" && resultClock?.down == null) runResult();
    });
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        continueResult();
      }
    });
  }
  return el;
}
function pauseResult() {
  if (!resultClock?.timer) return;
  clearTimeout(resultClock.timer);
  resultClock.left -= performance.now() - resultClock.at;
  resultClock.timer = null;
  $("round-result").classList.add("paused");
}
function runResult() {
  if (!resultClock || resultClock.timer || document.hidden) return;
  const e = epoch;
  resultClock.at = performance.now();
  resultClock.timer = setTimeout(
    () => {
      if (e === epoch) continueResult();
    },
    Math.max(0, resultClock.left),
  );
  timers.push(resultClock.timer);
  $("round-result").classList.remove("paused");
}
function hideResult() {
  if (resultClock?.timer) clearTimeout(resultClock.timer);
  resultClock = null;
  const el = document.getElementById("round-result");
  if (el) {
    el.hidden = true;
    el.innerHTML = "";
  }
}
function continueResult() {
  if (!resultClock || s.phase !== "recap") return;
  hideResult();
  advance();
}
// The result of a choice stays in the same scene until it has been seen.
function recap() {
  if (s.phase !== "recap") return;
  const r = s.recap;
  if (!r) return advance();
  playResultSound(r);
  office();
  const v = resultView(r);
  if (v.kind) {
    $("venue-scene").innerHTML = window.DayArt.interior(v.kind, {
      crowd: v.crowd,
      speaker: v.speaker,
      rain: G.weather(s).id === "rain",
      staff: capacity(),
      mode: v.mode,
      stage: "reaction",
      topic: G.TOPICS[r.player.topic]?.title,
    });
    $("venue-scene").hidden = false;
    $("room").classList.add("field");
  }
  const el = resultCard();
  el.innerHTML = resultMarkup(r, v);
  el.dataset.tone = toneOf(r.totalVotes);
  el.hidden = false;
  el.classList.remove("paused");
  resultClock = { left: RESULT_MS, timer: null, at: 0, down: null };
  runResult();
}
document.addEventListener("visibilitychange", () =>
  document.hidden ? pauseResult() : runResult(),
);

function recapDetail() {
  const r = s.recap || s.journal.at(-1);
  if (!r) return;
  showPanel(
    "上回合留下什麼",
    `<p><b>${esc(r.summary.headline)}</b></p><p>${esc(r.player.quote || r.player.result || r.player.title)}</p><div class="rows">${r.summary.sources.map((x) => `<div class="feature-row"><span>${esc(x.label)}</span><b>${x.votes >= 0 ? "+" : ""}${num(x.votes)} 票</b></div>`).join("")}</div><p>目前估計第 ${r.race.rank} 名。研究成果、走訪與公開承諾已更新。</p><button data-open="map">看地圖上的紀錄</button>`,
    {
      text: "收好紀錄，安排今天",
      fn: () => (action ? planDetail() : catalog()),
    },
  );
}
function advance() {
  if (s.phase !== "recap") return;
  hideResult();
  closePanel();
  G.next(s);
  cfg = { research: [] };
  action = null;
  // The vote count plays once; a reload mid-count continues from where it was.
  if (s.phase === "result")
    ending = matchMedia("(prefers-reduced-motion:reduce)").matches
      ? { status: "seen", elapsed: COUNT.end }
      : { status: "inprogress", elapsed: 0 };
  save();
  resume();
}

/* ---------- Ending: counting night, then the report card (ported from day-ui.js) ---------- */
const COUNT = { wait: 3.2, reveal: 11, end: 14 },
  VERDICT = {
    elected: "凍蒜！當選",
    refunded: "落選・退保證金",
    forfeited: "落選",
  },
  QUIET_WORD = {
    fundraise: "募款",
    recruit: "招募",
    prepare: "準備政見",
    dig: "挖黑料",
  },
  TITLE_ICONS = {
    "newcomer-upset": "✦",
    "tie-elected": "籤",
    "tie-lost": "籤",
    "promise-king": "票",
    "one-chief-short": "↗",
  };
let ending = null,
  countFrame = 0;
function endingLayer() {
  let el = document.getElementById("office-ending");
  if (!el) {
    el = document.createElement("section");
    el.id = "office-ending";
    document.body.append(el);
  }
  if (!el.dataset.ready) {
    el.dataset.ready = "1";
    el.className = "office-ending";
    el.setAttribute("aria-label", "開票與成績單");
  }
  return el;
}
function hideEnding() {
  cancelAnimationFrame(countFrame);
  const el = document.getElementById("office-ending");
  if (el) {
    el.hidden = true;
    el.innerHTML = "";
    el.dataset.view = "";
  }
}
const endingTitles = () => s.result.titles || G.reportTitles(s, s.result);
function partyBadge(id) {
  const p = G.PARTIES[id] || G.PARTIES.independent;
  return `<span class="party-badge" style="--party:${esc(p.color)}">${esc(p.short || p.title)}</span>`;
}
// Counted share for one candidate: uneven jumps fixed per game, so a reload replays the same night.
function countedShare(c, who) {
  if (c >= 1) return 1;
  if (c <= 0) return 0;
  const steps = 16,
    k = Math.min(steps, Math.floor(c * steps + (who === "rival" ? 0.5 : 0)));
  let done = 0,
    total = 0;
  for (let i = 0; i < steps; i++) {
    const w = 0.4 + G.rand(s.seed, "count-step", who, i);
    total += w;
    if (i < k) done += w;
  }
  return done / total;
}
function renderCounting() {
  const el = endingLayer(),
    r = s.result,
    name = G.candidateName(s.settings),
    t = ending.elapsed,
    titles = endingTitles(),
    tie = titles.some((x) => x.id === "tie-elected" || x.id === "tie-lost"),
    pauseAt = COUNT.reveal - 1.5,
    revealed = t >= COUNT.reveal,
    stage = revealed ? r.outcome : "count";
  sfx.loop("count", t >= COUNT.wait && !revealed && !(tie && t >= pauseAt));
  if (revealed) playEndingSound(r);
  if (el.dataset.view !== "count") {
    el.dataset.view = "count";
    el.innerHTML = `<div class="oc-stage"><div class="oc-intro" id="oc-intro"><p>投票日</p><h2>下午四點，投票所關門</h2><span>等開票<i>.</i><i>.</i><i>.</i></span></div><div class="oc-scene" id="oc-scene"></div><div class="count-screen"><h2 class="count-stage" id="oc-stage"></h2><div class="count-board" aria-hidden="true"><b>${esc(name)}</b><span class="count-track"><i id="oc-meter"></i></span><strong id="oc-votes">0</strong><i class="count-line" id="oc-line"><span id="oc-line-label"></span></i></div></div><strong class="count-verdict" id="oc-verdict" hidden></strong></div><button class="oc-skip" data-action="skip-count">略過開票 →</button>`;
  }
  el.hidden = false;
  const scene = $("oc-scene");
  if (scene.dataset.stage !== stage) {
    window.DayArt.setCandidates({
      player: {
        identity: s.settings.background,
        outfit: G.BACKGROUNDS[s.settings.background].outfit,
        party: s.settings.affiliation,
        name,
      },
    });
    scene.innerHTML = window.DayArt.countNight(stage, { elapsed: t, name });
    scene.dataset.stage = stage;
  }
  const c = Math.max(
      0,
      Math.min(
        1,
        (t - COUNT.wait) / ((tie ? pauseAt : COUNT.reveal) - COUNT.wait),
      ),
    ),
    you = revealed
      ? r.playerVotes
      : Math.round(r.playerVotes * countedShare(c, "you")),
    top = Math.max(r.playerVotes, r.lastSeat) * 1.12 || 1;
  $("oc-intro").hidden = t >= COUNT.wait;
  $("oc-stage").textContent =
    t < COUNT.wait
      ? "投票結束，開票開始"
      : !revealed
        ? tie && t >= pauseAt
          ? "同票，依法抽籤"
          : "開票中・已開 " + Math.round(c * 100) + "%"
        : "開票結果・第 " + r.rank + " 名";
  $("oc-votes").textContent = num(you);
  $("oc-meter").style.width = Math.min(100, (you / top) * 100).toFixed(1) + "%";
  $("oc-line").style.left =
    "calc(var(--name-col) + (100% - var(--name-col) - var(--num-col)) * " +
    Math.min(1, r.lastSeat / top).toFixed(4) +
    ")";
  $("oc-line-label").textContent = "當選線 " + num(r.lastSeat);
  $("oc-verdict").hidden = !revealed;
  $("oc-verdict").textContent = revealed
    ? VERDICT[r.outcome] +
      (titles.length ? "・" + titles.map((x) => x.title).join("・") : "")
    : "";
  $("oc-verdict").dataset.outcome = r.outcome;
}
function counting() {
  renderCounting();
  const e = epoch;
  let prev = performance.now();
  function tick(now) {
    if (e !== epoch || s.phase !== "result" || ending?.status !== "inprogress")
      return;
    const dt = Math.max(0, Math.min((now - prev) / 1000, 0.5)),
      before = ending.elapsed;
    prev = now;
    if (!document.hidden && !$("sheet").open)
      ending.elapsed = Math.min(COUNT.end, ending.elapsed + dt);
    if (ending.elapsed >= COUNT.end) return finishCounting();
    if (Math.floor(ending.elapsed) !== Math.floor(before)) save();
    renderCounting();
    countFrame = requestAnimationFrame(tick);
  }
  countFrame = requestAnimationFrame(tick);
}
function finishCounting() {
  if (s.phase !== "result" || ending?.status !== "inprogress") return;
  cancelAnimationFrame(countFrame);
  sfx.loop("count", false);
  playEndingSound(s.result);
  ending = { status: "seen", elapsed: COUNT.end };
  save();
  report();
}
function titlesMarkup() {
  const titles = endingTitles();
  return titles.length
    ? `<section class="report-titles" aria-label="本局稱號">${titles.map((t) => `<div class="report-title" data-title="${esc(t.id)}"><span class="report-title-badge"><span aria-hidden="true">${TITLE_ICONS[t.id] || "✦"}</span>${esc(t.title)}</span><p class="report-title-line">${esc(t.line)}</p>${t.detail ? `<small class="report-title-detail">${esc(t.detail)}</small>` : ""}</div>`).join("")}</section>`
    : "";
}
function platformMarkup() {
  const v = s.result?.platform || G.platformView(s);
  return `<section class="platform-summary"><h3>我公開承諾的政見</h3><p>${v.items.length ? "列出最近公開的 " + v.items.length + " 項" + (v.omitted ? "；本局共有 " + v.total + " 項。" : "。") : "這次沒有公開提出具體政見或保證。研究過的題目不算公開承諾。"}</p><ol>${v.items.map((x) => `<li><b>${esc(x.title)}${x.kind === "guarantee" ? "・保證" : ""}</b><blockquote>「${esc(x.quote)}」</blockquote><small>第 ${x.round} 回合・${esc(x.action === "offer" ? "接受合作並公開支持" : G.ACTIONS.find((a) => a.id === x.action)?.title || x.action)}${x.changed ? "・曾改口" : ""}</small></li>`).join("")}</ol></section>`;
}
function trendChart() {
  const r = s.result,
    LN = r.lastSeat,
    start = s.startRace || { you: 0, rival: 0 },
    points = [
      start,
      ...s.journal.map((j) => (j.race ? { you: j.race.you } : null)).filter(Boolean),
      { you: r.playerVotes, final: true },
    ],
    max = Math.max(LN * 1.15, ...points.map((p) => p.you)) || 1,
    W = 320,
    H = 120,
    x = (i) => 8 + (i * (W - 16)) / Math.max(1, points.length - 1),
    y = (v) => H - 10 - (v / max) * (H - 20);
  return `<svg class="trend" viewBox="0 0 ${W} ${H}" role="img" aria-label="${G.DAYS} 回合估票"><line x1="8" x2="${W - 8}" y1="${y(LN).toFixed(1)}" y2="${y(LN).toFixed(1)}" class="trend-line"/><text x="10" y="${(y(LN) - 5).toFixed(1)}" class="trend-label">今年當選線 ${num(LN)}</text><polyline points="${points.map((p, i) => x(i).toFixed(1) + "," + y(p.you).toFixed(1)).join(" ")}" class="trend-you"/>${points.map((p, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(p.you).toFixed(1)}" r="${p.final ? 4.2 : 2.6}" class="trend-dot${p.final ? " final" : ""}"/>`).join("")}</svg>`;
}
function roundParts(x) {
  const list = [],
    add = (label, v) => {
      if (Math.abs(v || 0) >= 1) list.push(label + " " + signed(v));
    },
    took = Math.round(-(x.byRival || 0));
  if (x.quiet)
    list.push(
      QUIET_WORD[x.action] +
        "不影響票數；沒拉票" +
        (took >= 1
          ? "，對手" + (x.attack ? "攻擊你 −" : "拉走 ") + num(took) + " 票"
          : ""),
    );
  else {
    if (x.dig)
      list.push(
        x.dig === "found"
          ? "挖到黑料"
          : x.dig === "nothing"
            ? "沒挖到黑料"
            : "挖黑料被反咬",
      );
    add("你", x.direct);
    add(x.attack ? "對手攻擊" : "對手拉走", x.byRival);
  }
  add("助手", x.team);
  add("看板", x.billboard);
  add("合作", x.offer);
  add(x.planTitle || "出發前", x.plan);
  add("回應小馬", x.rebuttal);
  add(x.eventsTitle || "事件", x.events);
  return list.join("・");
}
function roundWhat(x) {
  const t = TOPIC(x.topic);
  return x.action === "canvass"
    ? x.where + "・談" + t
    : x.action === "tv"
      ? "電視・談" + t
      : x.action === "online"
        ? "直播・談" + t
        : x.action === "debate"
          ? "政見會・談" + t
          : x.action === "rally"
            ? x.where + "・造勢"
            : x.action === "press"
              ? "記者會爆料"
              : G.ACTIONS.find((a) => a.id === x.action)?.title || x.action;
}
// The result in a few plain words instead of the seat arithmetic.
function marginWords(r) {
  const share = r.lastSeat ? r.gap / r.lastSeat : 1;
  if (r.outcome === "elected") return share <= 0.03 ? "壓線當選" : "穩穩當選";
  return share <= 0.05 ? "差一點就當選" : share <= 0.3 ? "還有一段距離" : "離當選還很遠";
}
function reportMarkup() {
  const r = s.result,
    bg = G.BACKGROUNDS[s.settings.background],
    party = G.PARTIES[s.settings.affiliation],
    ok = r.outcome === "elected",
    grade = r.grade || G.resultGrade(r),
    verdict = grade.title + "・第 " + r.rank + " 名",
    nextGrade = grade.next
      ? grade.next.votesNeeded == null
        ? "下一級是" + grade.next.title
        : "再多 " + num(grade.next.votesNeeded) + " 票就是" + grade.next.title
      : ok
        ? "已達最高當選等級"
        : "還差 " + num(r.gap) + " 票當選",
    name = G.candidateName(s.settings),
    key = [...(r.roundsSummary || [])]
      .sort((a, b) => Math.abs(b.votes) - Math.abs(a.votes))
      .slice(0, 3)
      .map((x) => x.day),
    rounds =
      (r.roundsSummary || [])
        .map(
          (x) =>
            `<li${key.includes(x.day) ? ' class="key-round"' : ""}><b>${x.day}</b><span>${esc(roundWhat(x))}</span><strong class="${x.votes >= 0 ? "up" : "down"}">${signed(x.votes)}</strong><small>${key.includes(x.day) ? '<em class="key-tag">影響最大前三</em>' : ""}${esc(roundParts(x))}</small></li>`,
        )
        .join("") +
      (r.unkept || [])
        .map(
          (u) =>
            `<li class="unkept"><b>✕</b><span>開票・被小馬拆穿的保證</span><strong class="down">${signed(u.votes)}</strong><small>「${esc(u.text)}」沒有更正，信的人改投別人</small></li>`,
        )
        .join(""),
    est = r.race.groups.reduce((n, g) => n + g.you, 0) || 1,
    groups = r.race.groups
      .map((g, k) => {
        const v = (r.playerVotes * g.you) / est;
        return `<div class="g-${GROUP_KEYS[k]}"><b>${esc(g.title)}</b><span>${num(v)} 票${r.groupTotals?.[k] ? "（" + ((v / r.groupTotals[k]) * 100).toFixed(1) + "%）" : ""}</span></div>`;
      })
      .join("");
  return `<article class="report-card"><header class="report-head"><span class="report-who">${esc(name)}｜${esc(bg.title)}・${partyBadge(s.settings.affiliation)}${esc(party.title)}</span><h2 class="report-verdict ${ok ? "win" : "lose"}">${esc(verdict)}</h2>${titlesMarkup()}<p class="result-next-grade">${esc(nextGrade)}</p></header><figure class="report-scene" aria-label="${esc(verdict + "的開票夜")}">${window.DayArt.countNight(r.outcome, { still: true, name, tally: { you: r.playerVotes, line: r.lastSeat, rank: r.rank, seats: r.seats } })}</figure><div class="report-numbers"><div><span>你的得票</span><strong>${num(r.playerVotes)}</strong><small>${esc(marginWords(r))}</small></div><div><span>當選線</span><strong>${num(r.lastSeat)}</strong><small>${ok ? "多 " : "還差 "}${num(r.gap)} 票</small></div><div><span>得票率</span><strong>${r.valid ? ((r.playerVotes / r.valid) * 100).toFixed(1) + "%" : "—"}</strong><small>有效票 ${num(r.valid)}</small></div></div>${platformMarkup()}<details class="report-rounds"><summary>每回合做了什麼 · 估票走勢</summary>${trendChart()}<div class="report-groups">${groups}</div><ol>${rounds}</ol></details></article>`;
}
function report() {
  const el = endingLayer();
  el.dataset.view = "report";
  el.innerHTML = `<div class="oe-report">${reportMarkup()}<div class="report-tools"><button class="primary" data-action="replay">換個人物，再玩一次</button><button data-open="map">回顧選戰足跡</button></div><p class="footnote">獨立試版，不覆寫正式遊戲存檔。${storageOK ? "進度保存在這個瀏覽器。" : "本次無法儲存，關頁後進度可能遺失。"}</p></div>`;
  el.hidden = false;
  el.scrollTop = 0;
}
function result() {
  office();
  if (!ending) ending = { status: "seen", elapsed: COUNT.end };
  if (ending.status === "inprogress") return counting();
  report();
}
function resume() {
  if (s.phase === "plan") {
    if (!(cfg.research || []).length) autoResearch();
    office();
    if (urgent() && s.day > 1 && !seenVisits.includes(s.day)) {
      if (s.crisis?.status !== "pending") visitorEnter(visitorItem());
      later(() => {
        if (
          s.phase !== "plan" ||
          $("sheet").open ||
          !$("dialogue").classList.contains("hidden")
        )
          return settleVisitor();
        seenVisits.push(s.day);
        save();
        inbox();
      }, 1200);
    } else {
      // Routine news (schedule clashes, producer calls, rival challenges, the debate reminder) waits at the door.
      if (pending() && s.day > 1) {
        visitorEnter(visitorItem());
        later(settleVisitor, 1200);
      }
      if (briefDue()) brief();
    }
  } else if (s.phase === "travel") travel();
  else if (s.phase === "question") ask();
  else if (s.phase === "recap") recap();
  else if (s.phase === "result") result();
}

const openers = {
  map: mapPanel,
  poll: polls,
  inbox,
  catalog,
  team,
  teamhub: teamHub,
  extras,
  files,
  network,
  strategy,
  knowledge,
};
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-action],[data-open]");
  if (!b || b.disabled) return;
  if (b.dataset.open) return openers[b.dataset.open]?.();
  const id = b.dataset.id;
  switch (b.dataset.action) {
    case "reroll-origin":
      nextSeed = Math.floor(Math.random() * 1000000);
      return characterPanel();
    case "identity":
      newSettings.background = id;
      characterPanel();
      break;
    case "party":
      newSettings.affiliation = id;
      characterPanel();
      break;
    case "category":
      category(id);
      break;
    case "select":
      choose(id);
      break;
    case "venue":
      cfg.venue = id;
      sync();
      planDetail();
      break;
    case "map-venue":
      if (s.phase === "plan") choose("canvass", { venue: id });
      else toast("已完成的走訪記錄：" + G.VENUES[id].title);
      break;
    case "personal":
      cfg.topic = id;
      cfg.research = (cfg.research || []).filter((t) => t !== id);
      sync();
      document
        .querySelectorAll('[data-action="personal"]')
        .forEach((x) => x.setAttribute("aria-pressed", x.dataset.id === id));
      toast("本人將研究「" + TOPIC(id) + "」");
      break;
    case "research": {
      const list = cfg.research || [],
        on = list.includes(id);
      if (!on && used() >= capacity())
        return toast("助手都派出去了，先取消一項。");
      cfg.research = on ? list.filter((t) => t !== id) : [...list, id];
      b.setAttribute("aria-pressed", !on);
      updateTeam();
      break;
    }
    case "donor":
      cfg.donor = id;
      sync();
      planDetail();
      break;
    case "brief-topic":
      cfg.brief = cfg.brief === id ? null : id;
      sync();
      extras();
      break;
    case "strategy":
      G.setCampaignPlan(s, id);
      choose(
        id === "organization" ? "canvass" : "prepare",
        id === "organization" ? { venue: "market" } : {},
      );
      break;
    case "verify":
      if (!G.verifyDirt(s, id)) toast("目前不能查證，可能費用不足。");
      sync();
      files();
      break;
    case "publish":
      choose("press", id === "tip" ? {} : { expose: id });
      break;
    case "respond":
      choose("tv", { respond: true });
      break;
    case "skip-count":
      finishCounting();
      break;
    case "replay":
      newGame();
      break;
    case "clarify": {
      const ch = G.pendingChallenges(s)[0];
      if (ch && !G.clarify(s, ch.id)) toast("目前無法澄清。");
      sync();
      inbox();
      break;
    }
  }
});
document.addEventListener("change", (e) => {
  const t = e.target;
  if (t.id === "booth") {
    if (t.checked && used() >= capacity()) {
      t.checked = false;
      return toast("助手都派出去了，先取消一項。");
    }
    cfg.booth = t.checked;
    updateTeam();
  }
  if (t.dataset.extra) {
    cfg[t.dataset.extra] = t.checked;
    sync();
    $("extra-total").textContent = "合計費用 " + wan(preview().totalCost);
  }
  if (t.id.startsWith("network-")) {
    G.setNetworkAssignment(s, {
      venue: $("network-venue").value,
      topic: $("network-topic").value,
    });
    sync();
  }
});
document.addEventListener("keydown", (e) => {
  const target = e.target.closest("[role=button]");
  if (target && (e.key === "Enter" || e.key === " ")) {
    e.preventDefault();
    target.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  }
  if (e.key === "Escape" && !$("sheet").open && !$("dismiss").hidden)
    hideTalk();
});
$("dismiss").onclick = hideTalk;
$("sheet-close").onclick = closePanel;
$("all-actions").onclick = catalog;
$("depart").onclick = () =>
  s.phase === "recap" ? advance() : s.phase === "result" ? result() : depart();
$("desk-hotspot").onclick = () => (action ? planDetail() : catalog());
$("wall-map").onclick = mapPanel;
$("poll-folder").onclick = polls;
$("staff").onclick = () => {
  if (s.phase !== "plan") return resume();
  say(
    "staff",
    "小葉",
    "要聽重點，還是派助手？",
    "",
    [
      { text: "聽本回合重點", fn: brief, primary: true },
      capacity()
        ? { text: `派助手研究（${freeHelpers()} 位可派）`, fn: team }
        : { text: "團隊與招募", fn: teamHub },
    ],
  );
};
$("aide-seat").onclick = () => {
  staffTalk();
  $("staff").onclick();
};
$("visitor").onclick = inbox;
$("knock").onclick = inbox;
$("restart").onclick = () => {
  $("settings").close();
  newGame();
};
$("skip-travel").onclick = finishTravel;
$("paper").onclick = recapDetail;

const compact = matchMedia("(max-width:900px)");
function frame() {
  $("scene").setAttribute(
    "viewBox",
    compact.matches ? "300 0 930 720" : "0 0 1536 870",
  );
  $("scene").setAttribute(
    "preserveAspectRatio",
    compact.matches ? "xMidYMin meet" : "xMidYMid slice",
  );
}
compact.addEventListener("change", frame);
frame();

/* Audio: one shared module (day-sound.js). Missing module or AudioContext
   leaves every helper a silent no-op, so the round stays playable. */
const sfx = {
  play(name, opts) {
    try {
      window.DaySound?.play(name, opts);
    } catch {}
  },
  loop(name, on) {
    try {
      on ? window.DaySound?.startLoop(name) : window.DaySound?.stopLoop(name);
    } catch {}
  },
  enabled() {
    try {
      return window.DaySound ? window.DaySound.enabled() : false;
    } catch {
      return false;
    }
  },
};
function audioScene() {
  if (!s) return;
  sfx.loop("steps", s.phase === "travel");
  sfx.loop("rain", G.weather(s).id === "rain" && s.phase !== "result");
}
function playResultSound(r) {
  if (!r || soundedRecap === r.day) return;
  soundedRecap = r.day;
  sfx.play(r.totalVotes >= 0 ? "positive" : "negative");
  if (r.rival?.attack || r.rival?.challenge) sfx.play("rival", { delay: 0.4 });
}
function playEndingSound(r) {
  if (!r || soundedEnding) return;
  soundedEnding = true;
  sfx.play(r.outcome === "elected" ? "win" : "lose", { seed: s.seed });
}
function settingsOpen() {
  syncSettings();
  if (!$("settings").open) $("settings").showModal();
}
function syncSettings() {
  const on = sfx.enabled();
  $("sound-toggle").setAttribute("aria-pressed", String(on));
  $("sound-state").textContent = on ? "開" : "關";
}
function sceneStatus() {
  const weather = G.weather(s),
    rain = weather.id === "rain";
  $("room").classList.toggle("rainy", rain);
  $("office-sign").textContent = G.candidateName(s.settings) + "競選辦公室";
  $("scene").setAttribute(
    "aria-label",
    G.candidateName(s.settings) + "坐在競選辦公室，小葉在桌旁協助",
  );
  $("hud-round").textContent =
    "第 " + s.day + " / " + G.DAYS + " 回合" + (rain ? " · 雨" : "");
  $("hud-funds").textContent = "競選經費 " + wan(s.budget.available);
  $("desk-plan").textContent = action
    ? NAMES[action] + " · 查看行程"
    : "今天做什麼？";
  document
    .querySelector("#candidate svg")
    .setAttribute(
      "viewBox",
      PORTRAITS[s.settings.background] || PORTRAITS.newcomer,
    );
  const last = s.journal.at(-1);
  // The round result is shown on the spot, so the old "上回合" strip stays hidden.
  $("round-change").hidden = true;
  if (last) {
    $("round-change").textContent =
      "上回合 " +
      NAMES[last.player.action] +
      "（" +
      (last.totalVotes >= 0 ? "+" : "") +
      num(last.totalVotes) +
      " 票） · " +
      (last.player.action === "prepare"
        ? "查好 " + TOPIC(last.player.topic)
        : last.player.result || last.summary.headline
      ).split("。")[0];
    $("round-change").onclick = recapDetail;
  }
  syncSettings();
  audioScene();
  syncDock();
}
$("settings-open").onclick = settingsOpen;
$("settings-close").onclick = () => $("settings").close();
$("settings").addEventListener("click", (e) => {
  if (e.target === $("settings")) $("settings").close();
});
$("sound-toggle").onclick = () => {
  try {
    window.DaySound?.setEnabled(!sfx.enabled());
  } catch {}
  syncSettings();
  audioScene();
};
// Tap feedback; DaySound unlocks its AudioContext in its own trusted click handler.
document.addEventListener("click", (e) => {
  if (e.target.closest?.("button") && e.isTrusted !== false) sfx.play("click");
});
nameTag("staff", "小葉", "幕僚");
document.fonts?.ready?.then(() => {
  fitTag("staff");
  fitTag("visitor");
});
try {
  const saved = JSON.parse(localStorage.getItem(STORE) || "null");
  if (saved?.s?.version === G.VERSION && saved.s.started) {
    s = saved.s;
    tutorialDone = saved.tutorialDone ?? s.day > 1;
    seenVisits = saved.seenVisits || [];
    action = saved.action;
    cfg = saved.cfg || {};
    ending =
      s.phase === "result" && saved.ending?.status === "inprogress"
        ? {
            status: "inprogress",
            elapsed: Math.max(
              0,
              Math.min(COUNT.end, Number(saved.ending.elapsed) || 0),
            ),
          }
        : s.phase === "result"
          ? { status: "seen", elapsed: COUNT.end }
          : null;
    G.upgrade(s);
    resume();
  } else {
    fresh();
    newGame();
  }
} catch {
  fresh();
  newGame();
}
