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
  soundedCrisis = "",
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
  s = G.initial(Math.floor(Math.random() * 1000000));
  G.configure(s, settings);
  G.start(s);
  action = null;
  cfg = { research: [] };
  ending = null;
  tutorialDone = false;
  seenVisits = [];
  soundedRecap = 0;
  soundedEnding = false;
  soundedCrisis = "";
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
    r = G.raceView(s);
  const pages = [
    {
      line: `${name}，我們有 ${G.DAYS} 回合，把支持拉過當選線。`,
      sub: `目前估計差 ${num(Math.max(0, r.line - r.you))} 票。先抓住願意聽你的街坊，再讓更多人知道你想做什麼。牆上地圖會記下我們跑過的地方。`,
      next: "我要怎麼開始？",
    },
    {
      line: "你每天親自做一件事，我們同時幫你查資料。",
      sub: "研究讓你說得出具體做法；街訪讓人認識你、聽見需求。先查再講，或先去聽，都能開始。助手研究要到下一回合才有成果。",
      next: "先決定我的第一步",
    },
  ];
  if (step < 2) {
    const p = pages[step];
    say("staff", "小葉 · 選戰第一天", p.line, p.sub, [
      { text: p.next, fn: () => tutorial(step + 1), primary: true },
      {
        text: "我熟悉了，直接排行程",
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
    "小葉 · 選戰第一天",
    "這次，先從哪裡打開局面？",
    "地方路線先跑熟街坊；宣傳路線先備好議題，再去節目。之後隨時可以調整。",
    [
      {
        text: "先跑地方",
        note: "安排市場街訪",
        fn: () => {
          G.setCampaignPlan(s, "organization");
          choose("canvass", { venue: "market" });
        },
        primary: true,
      },
      {
        text: "先備議題，再做宣傳",
        note: "安排本人研究",
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
  move("staff", 1010, 300, 0.75);
  $("dialogue").classList.add("hidden");
  sync();
}
function brief() {
  if (s.phase !== "plan") return resume();
  if (s.day === 1 && !tutorialDone) return tutorial(0);
  move("staff", 1010, 300, 0.75);
  let title,
    sub,
    choices = [];
  const last = s.journal.at(-1),
    known = s.player.known.filter((t) => t !== "tip");
  if (s.crisis?.status === "pending") {
    title = "有人爆料，出發前得先回應。";
    sub = s.crisis.text;
    choices.push({ text: "聽小葉說明", fn: inbox, primary: true });
  } else if (s.day === 1 && !action) {
    title = "先挑一條能講清楚的政見，再決定去哪裡說。";
    sub = "本人研究占主行程；也能派助手查資料，下回合帶著成果出門。";
    const t = G.venueView(s).find((x) => x.id === "market").pool[0];
    choices = [
      {
        text: "先準備，再搶曝光",
        note: "安排研究，下回合上節目",
        primary: true,
        fn: () => {
          G.setCampaignPlan(s, "media");
          choose("prepare", {
            topic: G.tvPool(s).find((x) => !s.player.studied?.[x]) || t,
          });
        },
      },
      {
        text: "先從市場累積支持",
        note: "安排街訪；沒研究的題先聽需求",
        fn: () => {
          G.setCampaignPlan(s, "organization");
          choose("canvass", { venue: "market" });
        },
      },
    ];
  } else {
    title =
      last?.player.action === "prepare"
        ? TOPIC(last.player.topic) + "資料已備妥，這回合可以帶去現場。"
        : last
          ? (last.player.result || last.summary.headline).split("。")[0]
          : "今天只親自跑一個行程。";
    const p = G.preview(s, action || "canvass", cfg),
      pool = p.pool || [];
    const researched = [
      ...new Set(
        (last?.player.teamReports || [])
          .filter((r) => r.task === "research" && r.knowledge)
          .map((r) => r.knowledge),
      ),
    ];
    sub = researched.length
      ? `我們查好了${researched.map(TOPIC).join("、")}，今天就能帶去談。可以先看筆記，再挑人潮合適的地方。`
      : action && pool.length
        ? `這個行程可能問到${pool.map(TOPIC).join("、")}。${pool.some((t) => !known.includes(t)) ? "還有沒準備的題，助手今天查、下回合用。" : "這幾題已有資料。"}`
        : "先選今天要接觸誰，再安排主行程。我們可以同時查資料、擺募款攤或陪你出門。";
    choices = [
      { text: "打開桌上行程", fn: catalog, primary: true },
      researched.length
        ? { text: "看看剛查好的資料", fn: knowledge }
        : { text: "團隊與招募", fn: teamHub },
    ];
  }
  say("staff", "小葉 · 本回合只說重點", title, sub, choices);
  const b = button("知道了，先讓我看看辦公室", hideTalk);
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
    "今天，把力氣放在哪裡？",
    `<p>選一個主行程，助手和地方小隊同步出動。</p><div class="rows"><button data-action="select" data-id="canvass"><strong>跑地方</strong><small>拜訪街坊，累積地方支持</small></button><button data-action="category" data-id="publicity"><strong>做宣傳</strong><small>造勢・電視・直播${s.day === G.DEBATE_ROUND ? "・政見會" : ""}</small></button><button data-action="category" data-id="preparation"><strong>做準備</strong><small>研究議題・籌募經費</small></button><button data-open="teamhub"><strong>帶團隊</strong><small>助手分工・招募・地方小隊</small></button><button data-action="category" data-id="intel"><strong>做情報</strong><small>挖料・查證・爆料</small></button></div>`,
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
        ? '<button data-open="files"><strong>查證手上的資料</strong><small>查證不占主行程，發布時再選場合</small></button>'
        : "") +
      '</div><div class="tabs"><button data-open="catalog">換個方向</button></div>',
  );
}
function teamHub() {
  if (s.phase !== "plan") return resume();
  const n = G.networkView(s);
  showPanel(
    "我們的團隊",
    `<div class="rows"><button data-open="team"><strong>安排 ${capacity()} 位助手</strong><small>研究、募款攤、跟你出門；每人一份工作</small></button><button data-action="select" data-id="recruit"><strong>招募一位助手</strong><small>你花本回合找人，新人下回合開始幫忙</small></button><button data-open="network"><strong>地方小隊 · ${n.active ? "已成立" : "累積地方關係中"}</strong><small>支持你的街坊，留在當地替你跑；不用占助手名額</small></button></div>`,
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
      '<div class="section-label">找誰 · 所得與代價一起看</div><div class="rows"><button data-action="donor" data-id="small" aria-pressed="' +
      (!cfg.donor || cfg.donor === "small") +
      '"><strong>街坊小額募款</strong><small>不綁立場 · 這回合不親自拉票</small></button>' +
      G.donorView(s)
        .filter((d) => d.status === "open")
        .map(
          (d) =>
            `<button data-action="donor" data-id="${d.id}" aria-pressed="${cfg.donor === d.id}"><strong>${d.name} · ${wan(d.money)}</strong><small>${esc(d.pitch)}<br>接受就得公開這個立場，與既有承諾可能衝突。</small></button>`,
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
    ? `<p class="choice-note">準備：${p.pool.filter((t) => known.includes(t)).length} / ${p.pool.length} 題已有資料；現場仍可能被問時事。</p>`
    : "";
  showPanel(
    "出發準備 · " + NAMES[action],
    `<p>${esc(p.description)}</p><div class="inline-note">費用 ${wan(p.totalCost || 0)}${p.expectedIncome ? ` · 募得約 ${wan(p.expectedIncome.min)}–${wan(p.expectedIncome.max)}` : ""}<br>${esc(p.risk || "")}${action === "recruit" ? `<br>本次招募 ${p.recruitCount} 人 · 新人下回合起可派工` : ""}</div>${prep}${extra}<div class="confirm-strip">${esc(assignmentText())}</div>${pending() ? `<p class="choice-note">門口還有 ${pending()} 件消息。<button data-open="inbox">先聽來客</button></p>` : ""}<div class="tabs"><button data-open="team">助手分工</button><button data-open="extras">加碼與後勤</button><button data-open="catalog">換行程</button></div>${!p.allowed || conflict() ? `<p class="danger">${esc(conflict() || p.reason)}</p>` : ""}`,
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
        return `<button data-action="${kind}" data-id="${t.id}" aria-pressed="${on}" ${done || (kind === "research" && action === "prepare" && cfg.topic === t.id) ? "disabled" : ""}><b>${esc(t.short || t.title)}</b><small>${done ? "已完成" : s.player.known.includes(t.id) ? "有資料" : "還沒查"}</small></button>`;
      })
      .join("") +
    "</div>"
  );
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
    "小葉 · 助手分工",
    `<p>和你的主行程同步。每人只做一件事；研究成果下回合可用。</p><div class="inline-note" id="team-summary">${esc(assignmentText())}</div><p class="confirm-strip" id="team-count">已安排 ${used()} / ${capacity()} 人，其他助手自動${["prepare", "dig", "recruit"].includes(action) ? "拉票" : "同行"}。</p><div class="section-label">選議題派人研究 · 可連點</div>${topicGrid("research")}<div class="feature-row"><label for="booth">留 1 人擺小額募款攤</label><input type="checkbox" id="booth" ${cfg.booth ? "checked" : ""}></div><p class="danger" id="team-warning">${conflict()}</p><div class="tabs"><button data-open="teamhub">團隊與招募</button><button data-open="extras">加碼與後勤</button><button data-open="knowledge">研究成果</button></div>`,
    {
      text: action ? "分工好了，回行程出發" : "分工好了，選主行程",
      fn: () => (action ? planDetail() : catalog()),
    },
  );
}
function updateTeam() {
  sync();
  if ($("team-summary")) $("team-summary").textContent = assignmentText();
  if ($("team-count"))
    $("team-count").textContent =
      `已安排 ${used()} / ${capacity()} 人，其他助手自動同行或拉票。`;
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
    `<p>這些和主行程一起執行，不多占回合。</p>${items.map(([id, t, c]) => `<div class="feature-row"><label for="extra-${id}">${t} · ${wan(c)}</label><input id="extra-${id}" data-extra="${id}" type="checkbox" ${cfg[id] ? "checked" : ""}></div>`).join("")}${!items.length ? '<p class="empty">這個行程目前沒有現場加碼。</p>' : ""}${
      action === "tv"
        ? '<div class="section-label">付費指定節目議題 · ' +
          wan(G.COSTS.brief) +
          '</div><div class="rows">' +
          G.tvPool(s)
            .map(
              (t) =>
                `<button data-action="brief-topic" data-id="${t}" aria-pressed="${cfg.brief === t}">${TOPIC(t)}<small>${s.player.known.includes(t) ? "已有資料" : "沒研究，指定題目也不會自動學會"}</small></button>`,
            )
            .join("") +
          "</div>"
        : ""
    }<div class="tabs"><button data-open="team">研究與募款攤派工</button><button data-open="files">爆料檔案</button></div><div class="confirm-strip" id="extra-total">合計費用 ${wan(p.totalCost)}</div>`,
    { text: "保留安排，回行程出發", fn: planDetail },
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
    `<p>${esc(c.plan ? c.hint : "先安排今天的第一步，做過的事會留在地圖上。")}</p>${mapMarkup()}<p class="key">圓點數字＝本人已跑的次數。點地點可安排下一次街訪。</p><div class="tabs"><button data-open="strategy">調整選戰方向</button><button data-open="teamhub">團隊與招募</button></div><div class="section-label">目前走到哪裡</div>${c.progress.map((p) => `<p style="margin:6px 0">${p.done ? "✓" : "○"} ${esc(p.label)}</p>`).join("")}<div class="section-label">已公開的承諾</div>${platform.items.length ? platform.items.map((p) => `<p>${esc(p.quote || p.text || p.title)}<small>第 ${p.day || p.round || "?"} 回合</small></p>`).join("") : '<p class="empty">還沒公開具體政見。研究完成不等於對外承諾。</p>'}<details><summary>行動足跡 · ${s.journal.length} 回合</summary><ol class="route-history">${s.journal.map((j) => `<li>第 ${j.day} 回合 · ${esc(placeLabel({ id: j.player.action, venueTitle: j.player.venueTitle }) || "辦公室")} · ${NAMES[j.player.action]}<br>${esc(j.player.quote || j.player.result || j.summary.headline)}</li>`).join("") || "<li>還沒出發。</li>"}</ol></details>`,
    { text: "看完了，回辦公室", fn: closePanel },
  );
}
function strategy() {
  if (s.phase !== "plan")
    return toast("選戰已結束；可以回顧，下一局再調整方向。");
  const c = G.campaignView(s);
  showPanel(
    "把方向排進行程",
    `<p>把方向變成今天的第一步：地方路線先跑街坊，宣傳路線先備議題。</p><div class="rows">${G.CAMPAIGN_PLANS.map((p) => `<button data-action="strategy" data-id="${p.id}" aria-pressed="${c.plan === p.id}"><strong>${p.title}</strong><small>${p.pitch}</small></button>`).join("")}</div>`,
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
    crisisCue();
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
  audioScene();
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
          (s.player.studied?.[t.id] ? " · 本人查過" : " · 已有資料") +
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
      .join("") || "<p>還沒有資料，先安排本人或助手研究。</p>",
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
  sfx.play("question");
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
const COUNT = { wait: 1.2, reveal: 9, end: 12 },
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
    el.innerHTML = `<div class="oc-stage"><div class="oc-scene" id="oc-scene"></div><div class="count-screen"><h2 class="count-stage" id="oc-stage"></h2><div class="count-board" aria-hidden="true"><b>${esc(name)}</b><span class="count-track"><i id="oc-meter"></i></span><strong id="oc-votes">0</strong><i class="count-line" id="oc-line"><span id="oc-line-label"></span></i></div></div><strong class="count-verdict" id="oc-verdict" hidden></strong></div><button class="oc-skip" data-action="skip-count">略過開票 →</button>`;
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
  return `<article class="report-card"><header class="report-head"><span class="report-who">${esc(name)}｜${esc(bg.title)}・${partyBadge(s.settings.affiliation)}${esc(party.title)}</span><h2 class="report-verdict ${ok ? "win" : "lose"}">${esc(verdict)}</h2>${titlesMarkup()}<p class="result-next-grade">${esc(nextGrade)}</p></header><figure class="report-scene" aria-label="${esc(verdict + "的開票夜")}">${window.DayArt.countNight(r.outcome, { still: true, name, tally: { you: r.playerVotes, line: r.lastSeat, rank: r.rank, seats: r.seats } })}</figure><div class="report-numbers"><div><span>你的得票</span><strong>${num(r.playerVotes)}</strong><small>第 ${r.rank} 名（前 ${r.seats} 名當選）</small></div><div><span>當選線</span><strong>${num(r.lastSeat)}</strong><small>${ok ? "多 " : "還差 "}${num(r.gap)} 票</small></div><div><span>得票率</span><strong>${r.valid ? ((r.playerVotes / r.valid) * 100).toFixed(1) + "%" : "—"}</strong><small>有效票 ${num(r.valid)}</small></div></div>${platformMarkup()}<details class="report-rounds"><summary>每回合做了什麼 · 估票走勢</summary>${trendChart()}<div class="report-groups">${groups}</div><ol>${rounds}</ol></details></article>`;
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
        return toast("助手已安排完，先取消一題或募款攤。");
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
      return toast("沒有空閒助手，先取消一題研究。");
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
    "小葉 · 在這裡",
    "要聽重點，還是改今天的分工？",
    "研究和募款攤共用助手，分工會跟本人行程一起執行。",
    [
      { text: "聽本回合重點", fn: brief, primary: true },
      { text: "團隊與招募", fn: teamHub },
    ],
  );
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
function crisisCue() {
  const key = s.day + ":" + (s.crisis?.id || s.crisis?.text || "");
  if (soundedCrisis === key) return;
  soundedCrisis = key;
  sfx.play("crisis");
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
  syncSettings();
  audioScene();
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
