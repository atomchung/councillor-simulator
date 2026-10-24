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
  soundEnabled = true,
  seenVisits = [],
  travelFrame = 0,
  selectingCharacter = false;
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
        soundEnabled,
        seenVisits,
      }),
    );
  } catch {
    storageOK = false;
  }
}
function fresh(settings = newSettings) {
  clearTimers();
  s = G.initial(Math.floor(Math.random() * 1000000));
  G.configure(s, settings);
  G.start(s);
  action = null;
  cfg = { research: [] };
  tutorialDone = false;
  seenVisits = [];
  save();
  office();
  tutorial(0);
}
const PORTRAITS = {
  newcomer: "223 22 199 356",
  heir: "676 24 213 349",
  incumbent: "1076 35 254 341",
};
function newGame() {
  clearTimers();
  selectingCharacter = true;
  newSettings = {
    ...(s?.settings || { background: "newcomer", affiliation: "independent" }),
  };
  characterPanel();
}
function characterPanel() {
  showPanel(
    "這次，由誰來打選戰？",
    `<p>選定人物與政黨後，再開始這一局。</p><div class="character-list">${Object.values(
      G.BACKGROUNDS,
    )
      .map(
        (b) =>
          `<button data-action="identity" data-id="${b.id}" aria-pressed="${newSettings.background === b.id}"><svg viewBox="${PORTRAITS[b.id]}" aria-hidden="true"><image href="assets/matte-toy-v1/game/candidates.webp" width="1536" height="1024"/></svg><span><strong>${G.candidateName({ ...newSettings, background: b.id })} · ${b.title}</strong><small>${b.id === "newcomer" ? "擅長街訪、議題熟；經費少。" : b.id === "heir" ? "家族有人脈、經費多；議題要從頭準備。" : "有團隊與基本盤；舊承諾會被追問。"}</small></span></button>`,
      )
      .join(
        "",
      )}</div><div class="section-label">政黨</div><div class="rows party-list">${Object.values(
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
  move("staff", 1010, 300, 0.75);
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
        note: "市場街訪",
        fn: () => {
          G.setCampaignPlan(s, "organization");
          choose("canvass", { venue: "market" });
        },
        primary: true,
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
function move(id, x, y, scale = 1, away = false) {
  const el = $(id);
  el.classList.remove("gone");
  el.classList.add("walking");
  el.style.setProperty("--x", x + "px");
  el.style.setProperty("--y", y + "px");
  el.style.setProperty("--scale", scale);
  later(() => {
    el.classList.remove("walking");
    if (away) el.classList.add("gone");
  }, 650);
}
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
  const kind = dialogueKind;
  $("dialogue").classList.add("hidden");
  dialogueKind = "";
  if (kind === "visitor") move("visitor", 80, 260, 0.7, true);
  if (s.phase === "plan") move("staff", 1120, 315, 0.7);
  $("staff").focus();
  if (s.phase === "plan" && !$("sheet").open) queueVisitor();
}
function say(kind, who, line, sub, choices, closable = true) {
  $("knock").style.display =
    kind === "visitor" ? "none" : pending() ? "block" : "none";
  $("candidate").classList.toggle("direction-left", kind === "visitor");
  if ($("sheet").open) $("sheet").close();
  dialogueKind = kind;
  $("speaker").textContent = who;
  $("line").textContent = line;
  $("sub").textContent = sub || "";
  $("details").replaceChildren();
  $("actions").replaceChildren(
    ...choices.map((x) => button(x.text, x.fn, x.note, x.primary, x.disabled)),
  );
  $("dismiss").hidden = !closable;
  $("dialogue").classList.remove("hidden");
}
function showPanel(title, html, footer) {
  $("sheet-status").textContent = "";
  hideTalk();
  focusReturn = document.activeElement;
  activePanel = title;
  $("sheet-title").textContent = title;
  $("sheet-body").innerHTML = html;
  $("sheet-foot").replaceChildren();
  $("sheet-foot").hidden = !footer;
  if (footer)
    $("sheet-foot").append(
      button(footer.text, footer.fn, "", true, !!footer.disabled),
    );
  if (!$("sheet").open) $("sheet").showModal();
  $("sheet-body").scrollTop = 0;
  $("sheet").scrollTop = 0;
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
  $("paper").setAttribute("opacity", s.journal.length ? "1" : "0");
  renderPins();
  sceneStatus();
  save();
}
function office() {
  $("travel-scene").hidden = true;
  $("venue-scene").hidden = true;
  visitorArt("來訪代表");
  clearTimers();
  $("toast").classList.remove("show");
  $("toast").textContent = "";
  $("room").classList.remove("field", "arriving");
  $("field-backdrop").style.display = "none";
  $("visitor").classList.add("gone");
  move("staff", 1010, 300, 0.75);
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
function researchEntry() {
  if (!capacity()) return "";
  const picked = (cfg.research || []).map(TOPIC);
  return `<button class="research-entry" data-open="team"><strong>派助手研究 · ${freeHelpers()} 位可派</strong><small>${picked.length ? "已派：" + esc(picked.join("、")) : "不占你的行程"}</small></button>`;
}
// Staff advice picks from current state: last result, rounds left, unread issues, race gap.
function advice() {
  const last = s.journal.at(-1),
    r = G.raceView(s),
    gap = num(Math.max(0, r.line - r.you)),
    left = G.DAYS - s.day + 1,
    free = freeHelpers(),
    hot = hotUnknownTopic(),
    standing = `估計第 ${r.rank} 名，差 ${gap} 票。`;
  const researched = [
    ...new Set(
      (last?.player.teamReports || [])
        .filter((x) => x.task === "research" && x.knowledge)
        .map((x) => x.knowledge),
    ),
  ];
  const title =
    last?.player.action === "prepare"
      ? `「${TOPIC(last.player.topic)}」查好了，今天能帶去現場。`
      : last
        ? (last.player.result || last.summary.headline).split("。")[0] + "。"
        : standing;
  let sub = last ? standing : "先選今天的主行程。";
  if (researched.length)
    sub = `助手查好「${researched.map(TOPIC).join("、")}」，今天能用。`;
  else if (left <= 2)
    sub = `只剩 ${left} 回合，帶已公開的政見去拉票。`;
  else if (free && hot)
    sub = `「${TOPIC(hot)}」最多人關心還沒查，${free} 位助手可派。`;
  return { title, sub, researched, free, hot };
}
function brief() {
  if (s.phase !== "plan") return resume();
  if (s.day === 1 && !tutorialDone) return tutorial(0);
  move("staff", 1010, 300, 0.75);
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
    sub = a.sub;
    choices = [
      { text: action ? "回到今天的行程" : "排今天的行程", fn: () => (action ? planDetail() : catalog()), primary: true },
      a.researched.length
        ? { text: "看研究筆記", fn: knowledge }
        : a.free && a.hot
          ? {
              text: `派助手查「${TOPIC(a.hot)}」`,
              note: `${a.free} 位可派`,
              fn: () => {
                cfg.research = [...new Set([...(cfg.research || []), a.hot])];
                sync();
                team();
              },
            }
          : { text: "團隊與招募", fn: teamHub },
    ];
  }
  say("staff", `小葉 · 第 ${s.day} 回合`, title, sub, choices);
  const b = button("先看看辦公室", hideTalk);
  b.className = "optional";
  $("details").append(b);
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
            `<button data-action="venue" data-id="${v.id}" aria-pressed="${(cfg.venue || "market") === v.id}"><strong>${v.title}</strong><small>${v.mainTitle}多 · ${v.pool.map(TOPIC).join("、")}</small></button>`,
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
    `<p>${esc(p.description)}</p><div class="inline-note">費用 ${wan(p.totalCost || 0)}${p.expectedIncome ? ` · 募得約 ${wan(p.expectedIncome.min)}–${wan(p.expectedIncome.max)}` : ""}<br>${esc(p.risk || "")}${action === "recruit" ? `<br>招募 ${p.recruitCount} 人，下回合起可派` : ""}</div>${prep}${researchEntry()}${extra}<div class="confirm-strip">${esc(assignmentText())}</div>${pending() ? `<p class="choice-note">門口還有 ${pending()} 件消息。<button data-open="inbox">先聽來客</button></p>` : ""}<div class="tabs"><button data-open="extras">加碼與後勤</button><button data-open="catalog">換行程</button></div>${!p.allowed || conflict() ? `<p class="danger">${esc(conflict() || p.reason)}</p>` : ""}`,
    { text: startLabel(), fn: depart, disabled: !p.allowed || !!conflict() },
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
    `<p>一人查一題，下回合起可用。</p><div class="inline-note" id="team-summary">${esc(assignmentText())}</div><p class="confirm-strip" id="team-count">${teamCountText()}</p><div class="section-label">點議題派一人</div>${topicGrid("research")}<div class="feature-row"><label for="booth">留 1 人擺小額募款攤</label><input type="checkbox" id="booth" ${cfg.booth ? "checked" : ""}></div><p class="danger" id="team-warning">${conflict()}</p><div class="tabs"><button data-open="teamhub">團隊與招募</button><button data-open="extras">加碼與後勤</button><button data-open="knowledge">研究筆記</button></div>`,
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
        const n = journals.filter((j) => j.player.venue === id).length;
        return `<g class="map-site ${n ? "visited" : ""}" role="button" tabindex="0" data-action="map-venue" data-id="${id}" aria-label="${G.VENUES[id].title}，跑過 ${n} 次"><rect x="${x - 57}" y="${y - 33}" width="114" height="65" rx="10"/><circle cx="${x}" cy="${y - 15}" r="12"/><text class="count" x="${x}" y="${y - 11}" text-anchor="middle">${n || "·"}</text><text x="${x}" y="${y + 20}" text-anchor="middle">${G.VENUES[id].title}</text></g>`;
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
    `<p>${esc(c.plan ? c.hint : "跑過的地方會記在這裡。")}</p>${mapMarkup()}<p class="key">數字＝你跑過的次數；點地點排街訪。</p><div class="tabs"><button data-open="strategy">調整選戰方向</button><button data-open="teamhub">團隊與招募</button></div><div class="section-label">目前走到哪裡</div>${c.progress.map((p) => `<p style="margin:6px 0">${p.done ? "✓" : "○"} ${esc(p.label)}</p>`).join("")}<div class="section-label">已公開的承諾</div>${platform.items.length ? platform.items.map((p) => `<p>${esc(p.quote || p.text || p.title)}<small>第 ${p.day || p.round || "?"} 回合</small></p>`).join("") : '<p class="empty">還沒公開具體政見；研究不算承諾。</p>'}<details><summary>行動足跡 · ${s.journal.length} 回合</summary><ol class="route-history">${s.journal.map((j) => `<li>第 ${j.day} 回合 · ${esc(placeLabel({ id: j.player.action, venueTitle: j.player.venueTitle }) || "辦公室")} · ${NAMES[j.player.action]}<br>${esc(j.player.quote || j.player.result || j.summary.headline)}</li>`).join("") || "<li>還沒出發。</li>"}</ol></details>`,
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
    rumor = G.rumorView(s);
  showPanel(
    "選情夾 · " + (e.poll ? "本回合民調" : "幕僚估計"),
    `<div class="statline"><span>目前估計<b>第 ${r.rank} 名</b></span><span>距當選線<b>${num(Math.max(0, r.line - r.you))} 票</b></span></div><p>${s.pollReports?.length ? "依最新民調與後續訪查估計" : "選前初估，街坊回報還少"}。黑線是我們的基本盤目標。</p>${e.groups.map((g, i) => `<div class="poll-row"><b>${g.title}</b><div class="poll-track"><i class="poll-range" style="left:${Math.min((g.lo / 12) * 100, 95)}%;width:${Math.max(2, Math.min(((g.hi - g.lo) / 12) * 100, 100 - (g.lo / 12) * 100))}%"></i><i class="poll-target" style="left:${Math.min((route.targets[i].pct / 12) * 100, 98)}%"></i></div><span>${g.lo}–${g.hi}%</span></div>`).join("")}<div class="section-label">小馬的動向</div><p>${esc(rumor.text || "目前沒有新消息。")} <span class="badge">${esc(rumor.reliability || "傳聞")}</span></p><div class="tabs"><button data-open="files">查證與爆料檔案</button><button data-open="map">看走過的地方</button></div>`,
    { text: "闔上選情夾", fn: closePanel },
  );
}
function network() {
  const n = G.networkView(s);
  showPanel(
    "地方小隊",
    n.active
      ? `<p>小隊和受薪助手分開，只能去實際支持你的地方、講已公開政見。</p><label>地點 <select id="network-venue">${n.venues.map((v) => `<option value="${v.id}" ${v.id === n.venue ? "selected" : ""}>${v.title}</option>`).join("")}</select></label><p><label>政見 <select id="network-topic">${n.topics.map((t) => `<option value="${t.id}" ${t.id === n.topic ? "selected" : ""}>${esc(t.title)}</option>`).join("")}</select></label></p>${!n.topics.length ? "<p>還沒有可交給小隊講的具體政見。</p>" : ""}`
      : "<p>還沒成立地方小隊。先公開具體政見，跑熟一個地方，讓當地人願意替你繼續跑。</p>",
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
function inbox() {
  if (s.phase !== "plan") return resume();
  closePanel();
  const c = G.campaignView(s),
    o = G.offerView(s),
    cr = s.crisis;
  if (cr?.status === "pending") {
    move("staff", 1010, 300, 0.75);
    say(
      "staff",
      "小葉 · 出發前必須處理",
      cr.text,
      "這些選擇會影響支持；危機不會因關掉對話而消失。",
      [
        {
          text: "發澄清文宣",
          note: wan(G.COSTS.crisis),
          fn: () => handleCrisis("pay"),
          disabled: s.budget.available < G.COSTS.crisis,
        },
        { text: "公開道歉切割", fn: () => handleCrisis("apologize") },
        {
          text: "硬槓反控",
          note: "可能反彈，也可能炎上",
          fn: () => handleCrisis("fight"),
        },
      ],
    );
    return;
  }
  if (o) {
    move("visitor", 350, 300, 0.8);
    say(
      "visitor",
      o.name,
      o.pitch,
      `得到：${o.gives}${o.money ? "、" + wan(o.money) : ""}。代價：公開承諾「${o.planText}」。合作不占主行程。`,
      [
        {
          text: "答應這個合作",
          fn: () => handleOffer("accept"),
          primary: true,
        },
        {
          text: "婉拒",
          note: "對方可能找小馬",
          fn: () => handleOffer("decline"),
        },
      ],
    );
    return;
  }
  if (c.opportunity?.status === "open" && !cfg.campaignOpportunity) {
    move("visitor", 350, 300, 0.8);
    say(
      "visitor",
      "來客 · 兩場行程撞期",
      c.opportunity.text,
      "選一場就會取代今天原本的主行程；也可以關掉，照自己的計畫走。",
      c.opportunity.choices.map((x) => ({
        text: x.title,
        note: x.gain + " " + x.cost,
        fn: () => {
          move("visitor", 80, 260, 0.7, true);
          choose(x.action, x.config);
        },
        disabled: !x.allowed,
        primary: x.id === "organization",
      })),
    );
    return;
  }
  if (c.followup && !cfg.campaignFollowup) {
    move("visitor", 350, 300, 0.8);
    say(
      "visitor",
      "製作人來電",
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
function handleCrisis(choice) {
  if (!G.respondCrisis(s, choice)) return toast("目前不能這樣回應。");
  sync();
  hideTalk();
  toast("危機已處理，結果記入本回合。");
}
function handleOffer(choice) {
  if (!G.respondOffer(s, choice)) return;
  sync();
  move("visitor", 80, 260, 0.7, true);
  hideTalk();
  toast(
    choice === "accept"
      ? "合作承諾已留下，今天還能跑主行程。"
      : "已婉拒，來客離開。",
  );
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
  travel();
}
function travel() {
  clearTimers();
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
    '<svg class="travel-path" viewBox="0 0 1200 650"></svg><div class="travel-player" id="map-walker"></div>';
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
  let previous = route[0];
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
    A.facing(pos.x - previous.x, pos.y - previous.y);
    A.walkStep(0.04, ratio < 1);
    const actor = $("map-walker");
    actor.style.left = pos.x / 12 + "%";
    actor.style.top = pos.y / 6.5 + "%";
    actor.innerHTML = A.avatar("player");
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
  resume();
}

function visitorArt(name) {
  const frames = {
    林伯: ["support-v3", 186, 74, 253, 418],
    月娥阿嬤: ["support-v3", 650, 72, 296, 422],
    秀琴阿姨: ["support-v3", 1136, 96, 230, 398],
    陳伯: ["support", 162, 13, 280, 351],
    阿桃姨: ["support", 656, 18, 209, 346],
    美姐: ["support", 1088, 16, 285, 347],
    阿仁: ["support-v2", 654, 120, 273, 359],
    許晴: ["support-v2", 1168, 126, 245, 355],
    淑芬: ["support-v2", 1168, 126, 245, 355],
    建志: ["support-v2", 114, 128, 239, 352],
    小汀: ["support-v2", 134, 587, 215, 344],
    阿寧: ["support-v3", 649, 563, 220, 416],
    佳穎: ["support", 641, 373, 239, 332],
    阿祺: ["support-v3", 176, 563, 231, 416],
    小禾: ["support-v3", 1107, 566, 359, 411],
    小馬: ["support-v2", 646, 588, 297, 342],
    主持人: ["support", 1130, 711, 224, 311],
  };
  const a = frames[name] || frames["林伯"],
    el = document.querySelector("#visitor .body svg");
  el.setAttribute("viewBox", a.slice(1).join(" "));
  el.querySelector("image").setAttribute(
    "href",
    "assets/matte-toy-v1/game/" + a[0] + ".webp",
  );
  document.querySelector("#visitor .person-label").textContent = frames[name]
    ? name
    : "來訪代表";
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

function ask() {
  field();
  const q = G.question(s);
  visitorArt(q.speaker?.includes("小馬") ? "小馬" : q.speakerName || "主持人");
  say(
    "field",
    q.speaker,
    q.text,
    q.memoryHint || "選一個回答；研究讓你知道反應，也讓具體答法說得出口。",
    q.options.map((o) => ({
      text: o.text,
      note:
        (o.unlocked ? o.detail : o.whyLocked) +
        (o.unlocked && o.reactions?.length
          ? " · " + o.reactions.map((x) => x.text).join("／")
          : "") +
        (o.tags?.length ? " · " + o.tags.map((t) => t.text).join("；") : ""),
      disabled: !o.unlocked,
      fn: () => {
        if (s.phase !== "question") return;
        if (G.answer(s, o.id)) {
          save();
          recap();
        }
      },
      primary: o.preselected,
    })),
    false,
  );
  $("actions").classList.add("answer-list");
  $("actions")
    .querySelectorAll("button")
    .forEach((b) => b.classList.add("wide"));
}
function recap() {
  if (s.phase !== "recap") return;
  advance();
}

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
  closePanel();
  G.next(s);
  cfg = { research: [] };
  action = null;
  save();
  resume();
}
function result() {
  office();
  const r = s.result,
    platform = G.platformView(s);
  showPanel(
    "開票 · 你留下的承諾",
    `<div class="statline"><span>結果<b>${esc(r.grade?.title || r.outcome || "開票完成")}</b></span><span>得票<b>${num(r.playerVotes)} 票</b></span></div><p>${esc(r.grade?.text || "選戰結束。再看一次自己的行程與承諾。")}</p>${r.titles?.map((t) => `<p class="badge">${esc(t.title)}</p>`).join("") || ""}<p>第 ${r.rank} 名 · ${esc(r.reflection || "")}</p><div class="section-label">這局公開承諾 · ${platform.total} 項</div>${platform.items.length ? platform.items.map((p) => `<p>${esc(p.quote || p.text || p.title)}</p>`).join("") : "<p>這局沒有公開具體政見。</p>"}<button data-open="map">回顧選戰足跡</button><p class="footnote">獨立試版，不覆寫正式遊戲存檔。${storageOK ? "進度保存在這個瀏覽器。" : "本次無法儲存，關頁後進度可能遺失。"}</p>`,
    { text: "換個人物，再玩一次", fn: newGame },
  );
}
function resume() {
  if (s.phase === "plan") {
    office();
    if (pending() && s.day > 1 && !seenVisits.includes(s.day)) {
      move("visitor", 350, 300, 0.8);
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
    } else brief();
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
$("visitor").onclick = inbox;
$("knock").onclick = inbox;
$("restart").onclick = newGame;
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

let rainContext = null,
  rainGain = null,
  rainSource = null;
function rainAudio(unlock = false) {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (unlock && soundEnabled && !rainContext) {
      rainContext = new AC();
      const buf = rainContext.createBuffer(
          1,
          rainContext.sampleRate * 3,
          rainContext.sampleRate,
        ),
        data = buf.getChannelData(0);
      let v = 0;
      for (let i = 0; i < data.length; i++) {
        v = (v + (Math.random() * 2 - 1) * 0.025) / 1.025;
        data[i] = v * 4;
      }
      rainSource = rainContext.createBufferSource();
      rainSource.buffer = buf;
      rainSource.loop = true;
      const filter = rainContext.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 1600;
      rainGain = rainContext.createGain();
      rainGain.gain.value = 0;
      rainSource
        .connect(filter)
        .connect(rainGain)
        .connect(rainContext.destination);
      rainSource.start();
    }
    if (!rainContext) return;
    if (unlock && soundEnabled && rainContext.state === "suspended")
      rainContext.resume().catch(() => {});
    const audible =
      s &&
      G.weather(s).id === "rain" &&
      soundEnabled &&
      !document.hidden &&
      s.phase !== "result";
    rainGain.gain.setTargetAtTime(
      audible ? 0.2 : 0,
      rainContext.currentTime,
      0.3,
    );
  } catch {
    /* Audio unavailable: the round remains playable. */
  }
}
function sceneStatus() {
  const weather = G.weather(s),
    rain = weather.id === "rain";
  $("room").classList.toggle("rainy", rain);
  $("weather-label").textContent = rain ? "午後陣雨" : "晴朗";
  $("office-sign").textContent = G.candidateName(s.settings) + "競選辦公室";
  $("scene").setAttribute(
    "aria-label",
    G.candidateName(s.settings) + "坐在競選辦公室，小葉在桌旁協助",
  );
  $("calendar-round").textContent = "第 " + s.day + " / " + G.DAYS + " 回合";
  $("ledger-money").textContent = wan(s.budget.available);
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
  $("round-change").hidden = !last || s.phase !== "plan";
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
  $("sound-toggle").textContent = soundEnabled ? "雨聲 開" : "雨聲 關";
  $("sound-toggle").setAttribute("aria-pressed", String(soundEnabled));
  rainAudio();
}
$("sound-toggle").onclick = () => {
  soundEnabled = !soundEnabled;
  rainAudio(true);
  sceneStatus();
  save();
};
document.addEventListener("pointerdown", () => rainAudio(true), {
  passive: true,
});
document.addEventListener("keydown", () => rainAudio(true));
document.addEventListener("visibilitychange", () => rainAudio());
try {
  const saved = JSON.parse(localStorage.getItem(STORE) || "null");
  if (saved?.s?.version === G.VERSION && saved.s.started) {
    s = saved.s;
    tutorialDone = saved.tutorialDone ?? s.day > 1;
    soundEnabled = saved.soundEnabled !== false;
    seenVisits = saved.seenVisits || [];
    action = saved.action;
    cfg = saved.cfg || {};
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
