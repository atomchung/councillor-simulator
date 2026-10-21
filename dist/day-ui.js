/* Campaign v13: the town map is the action surface, places open into scenes with three voter groups, every answer previews each group's reaction, the side panel tracks the race against 小馬, and the vote ends on a shareable report. */
(function () {
  'use strict';
  const G = window.DayGame, Art = window.DayArt, $ = id => document.getElementById(id);
  const KEY = 'wenshan-campaign-v13', LAST_KEY = KEY + '-last';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = n => Number(n || 0).toLocaleString('zh-TW') + ' 元';
  const wan = n => (Number(n || 0) / 10000).toLocaleString('zh-TW', { maximumFractionDigits: 1 }) + ' 萬';
  const pct = n => Number(n || 0).toLocaleString('zh-TW', { maximumFractionDigits: 1 }) + '%';
  const num = n => Math.round(Number(n || 0)).toLocaleString('zh-TW');
  const signedVotes = n => { const v = Math.round(Number(n || 0)); return (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(v).toLocaleString('zh-TW'); };
  const GROUP_KEYS = ['elder', 'middle', 'young'];
  // One wording for how a seat is won, used everywhere the seat line appears.
  const SEATS = G.ELECTION?.seats || 13, RULE_LINE = '票數前 ' + SEATS + ' 名當選，第 ' + SEATS + ' 名的票數就是當選線；你要贏過第 ' + (SEATS + 1) + ' 名（第一個落選的人）。';
  const groupTitle = g => G.GROUPS?.[g]?.title || ['長輩', '中年', '青年'][g];
  const short = t => G.TOPICS?.[t]?.short || G.TOPICS?.[t]?.title || '';
  const TONE_TEXT = { up: '會加分', slight: '小加分', flat: '沒反應', down: '會扣分', split: '兩邊接近', unknown: '還不知道' };
  // Fundraising, recruiting and preparing move no votes themselves; what you lose in such a round is 小馬 campaigning meanwhile.
  const QUIET_WORD = { fundraise: '募款', recruit: '招募', prepare: '準備政見', dig: '挖黑料' };
  const quietLine = (id, byRival, attacked) => { const took = Math.round(-(byRival || 0)); return QUIET_WORD[id] + '不影響票數；這回合你沒拉票，' + (took >= 1 ? (attacked ? '小馬拉票又攻擊你，你少了 ' : '小馬拉走 ') + num(took) + ' 票。' : '小馬沒拉走你的票。'); };
  const reduced = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  const fallback = { start: { x: 586, y: 331 }, prepare: { x: 534, y: 234 }, canvass: { x: 309, y: 355 }, tv: { x: 783, y: 374 }, fundraise: { x: 553, y: 432 }, recruit: { x: 713, y: 243 } };
  const anchors = Art?.anchors || fallback;
  const places = { prepare: '社區工作室', tv: '中立新聞台', press: '記者會', fundraise: '募款小廣場', recruit: '夥伴工作室', debate: '文山行政中心禮堂', online: '直播間' };
  // Where each destination's button sits on the 1200 × 650 map.
  const HOTSPOTS = { market: { x: 300, y: 402 }, temple: { x: 140, y: 322 }, street: { x: 668, y: 432 }, plaza: { x: 812, y: 268 }, river: { x: 400, y: 560 }, tv: { x: 900, y: 352 }, prepare: { x: 470, y: 182 }, fundraise: { x: 640, y: 512 }, recruit: { x: 700, y: 160 }, debate: { x: 935, y: 150 }, online: { x: 1080, y: 470 } };
  const icons = {
    prepare: '<path d="M4 4h6l2 2 2-2h6v15h-6l-2 2-2-2H4zM12 6v15M6 8h3M15 8h3M6 11h3M15 11h3"/>',
    canvass: '<path d="M3 7h18l-2-4H5zM4 7v13h16V7M8 20v-7h8v7M3 8c0 3 4 3 4 0 0 3 5 3 5 0 0 3 5 3 5 0 0 3 4 3 4 0"/>',
    rally: '<path d="M4 20V9l8-5 8 5v11M9 20v-6h6v6M3 9h18"/><path d="M12 4V1"/>',
    tv: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="m8 2 4 4 4-4M8 22h8M9 10l6 3-6 3z"/>',
    press: '<path d="M4 6h12v13H4zM16 9h4v10h-4M7 9h6M7 12h6M7 15h4"/>',
    fundraise: '<path d="M4 10h16v11H4zM3 10l4-5h10l4 5M9 14h6M12 3v5"/>',
    recruit: '<circle cx="9" cy="7" r="3"/><path d="M3 21v-5c0-5 12-5 12 0v5M18 7v8M14 11h8"/>',
    debate: '<path d="M4 20h16M6 20V11h4v9M14 20V11h4v9M3 8l9-5 9 5z"/>',
    online: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M10 9l5 3-5 3zM11 18h2"/>'
  };
  let state, selectedTopic = null, selectedVenue = null, selectedAction = null, gifts = false, billboard = false, modal = null, lastFocus = null;
  // Per-round choices in the dock: the issue to research (null = the suggestion, '' = none), deeper research, the stall, the background
  // check, the final push, the TV brief and a public reply to 小馬 on TV.
  // donor: null is a small public drive, otherwise the broker visited for money.
  let researchPick = [], deepOn = false, booth = false, investigateOn = false, gotvOn = false, brief = null, respondOn = false, donor = null;
  function resetToggles() { gifts = false; billboard = false; researchPick = []; deepOn = false; booth = false; investigateOn = false; gotvOn = false; brief = null; respondOn = false; donor = null; }
  let teamElapsed = 0, counting = null, dressed = '';
  // The count night runs on the round clock: a short wait, the count, then the result on stage; skipping only jumps to the end.
  const COUNT = { wait: 1.2, reveal: 9, end: 12 }, VERDICT = { elected: '凍蒜！當選', refunded: '落選・退保證金', forfeited: '落選' };
  // saveError is a storage failure and stays; saveNotice (an old save from another version) stays until the player starts, dismisses it or restarts.
  let position = { ...anchors.start }, motion = null, lastFrame = null, error = '', saveError = '', saveNotice = '', locked = false;
  const seed = () => window.crypto?.getRandomValues ? window.crypto.getRandomValues(new Uint32Array(1))[0] : (Date.now() ^ Math.floor(Math.random() * 4294967296)) >>> 0;
  if (!G) {
    $('panel').innerHTML = '<div class="panel-content"><h2>遊戲程式尚未載入</h2><p>請重新整理。</p></div>';
    return;
  }
  function validSaved(s) {
    const array = x => Array.isArray(x);
    return s && s.settings && !!(G.BACKGROUNDS?.[s.settings.background] || G.LEGACY_BACKGROUNDS?.[s.settings.background]) && !!G.PARTIES?.[s.settings.affiliation] && s.version === G.VERSION && s.revision === G.REVISION && Number.isInteger(s.seed) && typeof s.started === 'boolean' && Number.isInteger(s.day) && s.day >= 1 && s.day <= G.DAYS && ['plan', 'travel', 'question', 'recap', 'result'].includes(s.phase) && s.player && s.rival && s.budget && ['committed', 'personalContribution', 'donations', 'deposit', 'available', 'spent'].every(k => Number.isFinite(s.budget[k]) && s.budget[k] >= 0) && array(s.player.known) && s.player.known.every(t => !!G.TOPICS[t]) && array(s.player.promises) && array(s.player.actions) && s.player.counts && array(s.rival.actions) && s.rival.budget && array(s.voters) && s.voters.length === G.POPULATION && s.voters.every(v => array(v.support) && v.support.length === 2 && v.support.every(Number.isFinite) && Number.isInteger(v.g) && ['kmt', 'dpp', 'none'].includes(v.p) && array(v.cares) && typeof v.pref === 'string' && array(v.rec)) && !!s.landscape?.groups && array(s.offers) && array(s.polls) && array(s.journal) && array(s.ledger) && (!['travel', 'question'].includes(s.phase) || (s.pending && G.ACTIONS.some(a => a.id === s.pending.id))) && (s.phase !== 'recap' || !!(s.recap?.player && s.recap?.rival)) && (s.phase !== 'result' || (s.result && array(s.result.tally) && s.result.tally.length === G.ELECTION.candidates));
  }
  let recoveredTravel = false;
  try {
    const raw = window.localStorage.getItem(KEY), parsed = raw ? JSON.parse(raw) : null;
    if (validSaved(parsed)) {
      state = G.upgrade(parsed); selectedTopic = G.TOPICS[parsed._ui?.topic] ? parsed._ui.topic : null;
      selectedVenue = G.VENUES?.[parsed._ui?.venue] ? parsed._ui.venue : null;
      selectedAction = G.ACTIONS.some(a => a.id === parsed._ui?.action) ? parsed._ui.action : null;
      gifts = !!parsed._ui?.gifts; billboard = !!parsed._ui?.billboard; researchPick = Array.isArray(parsed._ui?.research) ? parsed._ui.research.filter(t => G.TOPICS[t]) : []; deepOn = !!parsed._ui?.deep; booth = !!parsed._ui?.booth; investigateOn = !!parsed._ui?.investigate; gotvOn = !!parsed._ui?.gotv; brief = G.TOPICS[parsed._ui?.brief] ? parsed._ui.brief : null; respondOn = !!parsed._ui?.respond; donor = G.BROKERS?.[parsed._ui?.donor] ? parsed._ui.donor : null;
      if (Number.isFinite(parsed._ui?.x) && Number.isFinite(parsed._ui?.y)) position = { x: Math.max(0, Math.min(1200, parsed._ui.x)), y: Math.max(0, Math.min(650, parsed._ui.y)) };
      recoveredTravel = state.phase === 'travel';
      if (state.phase === 'result') counting = parsed._ui?.counting?.status === 'inprogress' ? { status: 'inprogress', elapsed: Math.max(0, Math.min(COUNT.end, Number(parsed._ui.counting.elapsed) || 0)) } : { status: 'seen', elapsed: COUNT.end };
    } else {
      state = G.initial(seed());
      if (raw) saveNotice = '遊戲改版了，舊進度不能沿用，已開新局。';
    }
  } catch (_) { state = G.initial(seed()); saveError = '目前無法讀取本機存檔。'; }
  let dismissedFeedback = typeof state._ui?.dismissedFeedback === 'string' ? state._ui.dismissedFeedback : '';
  const roundDays = G.ROUND_DAYS || 3;
  const period = day => '第 ' + ((day - 1) * roundDays + 1) + '–' + (day * roundDays) + ' 天';
  const icon = id => '<span class="action-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' + (icons[id] || icons.prepare) + '</svg></span>';
  const action = id => G.ACTIONS.find(a => a.id === id);
  const venues = G.VENUES;
  const venueId = value => venues[value] ? value : 'market';
  const plannedVenue = () => venueId(selectedVenue || G.suggestVenue(state));
  const onSite = id => ['canvass', 'rally'].includes(id);
  // Rounds the candidate spends off the street; assistants can still research or canvass.
  const behind = id => ['recruit', 'fundraise', 'dig'].includes(id);
  const destinationFor = (id, venue) => onSite(id) ? venues[venueId(venue)].anchor : id === 'debate' ? { x: 935, y: 175 } : id === 'press' ? (anchors.tv || anchors.start) : id === 'online' ? (anchors.prepare || anchors.start) : (anchors[id] || anchors.start);
  const placeName = (id, venue) => onSite(id) ? venues[venueId(venue)].title : (places[id] || '競選辦公室');
  const isPublic = id => ['canvass', 'tv', 'debate', 'online'].includes(id);
  const asking = id => ['canvass', 'tv', 'debate', 'press', 'online'].includes(id);
  // Reuse the miniature's existing pedestrian junctions, with only the final branch varying.
  function routeFor(id, venue) {
    const destination = destinationFor(id, venue), routes = Art?.route;
    if (id === 'debate') { const route = routes ? Art.route('recruit') : [{ ...anchors.start }]; return [...route.slice(0, -1), { ...destination }]; }
    if (id === 'press') return routes ? Art.route('tv') : [{ ...anchors.start }, { ...destination }];
    if (id === 'online') return routes ? Art.route('prepare') : [{ ...anchors.start }, { ...destination }];
    if (!onSite(id)) return routes ? Art.route(id) : [{ ...anchors.start }, { ...destination }];
    const branch = ({ market: 'canvass', street: 'tv', plaza: 'recruit', river: 'fundraise', temple: 'temple' })[venueId(venue)] || 'canvass';
    const route = routes ? Art.route(branch) : [{ ...anchors.start }];
    return [...route.slice(0, -1), { ...destination }];
  }
  const stanceOf = topic => G.lastPlan(state.player, topic);
  const faceChip = (g, tone, label = true) => '<span class="face-chip g-' + GROUP_KEYS[g] + '" data-tone="' + esc(tone) + '" title="' + esc(groupTitle(g) + '：' + (TONE_TEXT[tone] || '')) + '">' + (label ? '<b>' + esc(groupTitle(g)) + '</b>' : '') + (Art?.faceIcon ? Art.faceIcon(tone) : '<i>' + esc(TONE_TEXT[tone]) + '</i>') + '<span class="sr-only">' + esc(TONE_TEXT[tone] || '') + '</span></span>';
  const faceRow = faces => '<span class="face-row">' + (faces || []).map((f, g) => faceChip(g, f)).join('') + '</span>';
  // Estimated votes per group beside each face, rounded to tens so they read as an estimate; the total adds an organisation's votes.
  const tens = n => Math.round(Number(n || 0) / 10) * 10;
  function estimateRow(faces, est) {
    if (!est) return faceRow(faces);
    const a = tens(est.total * .6), b = tens(est.total * 1.4), lo = Math.min(a, b), hi = Math.max(a, b);
    return '<span class="est-row">' + faceRow(faces) + '<span class="est-total">約 ' + signedVotes(lo) + '～' + signedVotes(hi) + ' 票</span></span>';
  }
  // Where each group stands between you and 小馬 right now, so an answer can be aimed at the group you are losing.
  // The one line that always sits on top of the dock: where you are against the last seat and 小馬.
  // What this choice costs and risks, in one line above the details.
  function costLine(id, p) {
    const pay = [p.totalCost ? wan(p.totalCost) : null, '一回合', id === 'prepare' ? (researchTopic()?.length ? researchTopic().length + ' 位助手查資料' : null) : null].filter(Boolean).join('・'), risk = action(id)?.risk || '';
    return '<p class="cost-line"><span class="cost-pay">付出：' + esc(pay) + '</span>' + (risk ? '<span class="cost-risk">風險：' + esc(risk) + '</span>' : '') + '</p>';
  }
  function statusBar() {
    const r = G.raceView(state), gap = r.you - r.line;
    return '<div class="status-bar ' + (gap >= 0 ? 'ahead' : 'behind') + '"><span>你 <b>' + num(r.you) + '</b> 票</span><span class="status-gap">' + (gap >= 0 ? '超過當選線 ' : '離當選線還差 ') + '<b>' + num(Math.abs(gap)) + '</b></span><span>小馬 <b>' + num(r.rival) + '</b></span><span class="status-round">第 ' + state.day + '／' + G.DAYS + ' 回合</span></div>';
  }
  // Each group's standing as of the latest poll; before the first poll there is nothing to show.
  function standingRow() {
    const r = G.pollView(state).latest;
    if (!r) return '';
    return '<div class="standing" role="group" aria-label="各群現況：你和小馬"><span class="pick-label">第 ' + r.day + ' 回合民調</span>' + r.groups.map((g, k) => { const gap = g.you - g.rival, tot = Math.max(1, g.you + g.rival); return '<span class="stand-chip g-' + GROUP_KEYS[k] + ' ' + (gap >= 0 ? 'ahead' : 'behind') + '" title="' + esc(g.title + '：你 ' + num(g.you) + ' 票、小馬 ' + num(g.rival) + ' 票') + '"><b>' + esc(g.title) + '</b>' + (gap >= 0 ? '你比小馬多 ' : '小馬比你多 ') + num(Math.abs(gap)) + '<i class="stand-bar"><i style="width:' + Math.round(g.you / tot * 100) + '%"></i></i></span>'; }).join('') + '</div>';
  }
  // The crowd as ten people, by group, instead of percentages.
  const crowdKnown = venue => state.player.actions.some(x => x.venue === venue && !x.record) || askPool().some(t => state.player.known.includes(t));
  function crowdCount(mix) { const raw = (mix || [1 / 3, 1 / 3, 1 / 3]).map(m => m * 10), counts = raw.map(Math.floor); let left = 10 - counts.reduce((a, b) => a + b, 0); raw.map((r, g) => [r - counts[g], g]).sort((a, b) => b[0] - a[0]).slice(0, left).forEach(([, g]) => counts[g]++); return counts; }
  // Until you have been here or researched what it asks about, the crowd shows as faces without group counts.
  function crowdLine(mix, label = '現場 10 人', hidden = false) { if (hidden) return '<div class="crowd-line unknown" role="img" aria-label="' + esc(label + '：組成未知') + '"><span class="crowd-label">' + esc(label) + '</span><span class="crowd-dots">' + '<i class="g-unknown"></i>'.repeat(10) + '</span><span class="crowd-text">組成未知・研究過這裡會問的題或來過一次就看得到</span></div>';  const counts = crowdCount(mix); return '<div class="crowd-line" role="img" aria-label="' + esc(label + '：' + counts.map((n, g) => groupTitle(g) + ' ' + n + ' 人').join('、')) + '"><span class="crowd-label">' + esc(label) + '</span><span class="crowd-dots">' + counts.map((n, g) => Array.from({ length: n }, () => '<i class="g-' + GROUP_KEYS[g] + '"></i>').join('')).join('') + '</span><span class="crowd-text">' + counts.map((n, g) => n ? '<b class="g-' + GROUP_KEYS[g] + '">' + esc(groupTitle(g)) + ' ' + n + '</b>' : '').filter(Boolean).join('・') + '</span></div>'; }
  function partyDot(id) { const p = G.PARTIES[id]; return p ? '<i class="party-dot" style="--party:' + esc(p.color) + '">' + esc(p.short) + '</i>' : ''; }
  function partyBadge(id) { const p = G.PARTIES[id] || G.PARTIES.independent; return '<span class="party-badge" style="--party:' + esc(p.color) + '">' + esc(p.short || p.title) + '</span>'; }

  /* ---------- records and dialogs ---------- */
  function eventRecord(value, label) {
    if (!value) return '';
    const text = typeof value === 'string' ? value : value.text || value.quote || '', round = typeof value === 'object' ? (value.round || value.day) : null;
    return '<div class="fact"><strong>' + esc(label) + (round ? '・第 ' + Number(round) + ' 回合' : '') + '</strong>' + (text ? '<p>' + esc(text) + '</p>' : '') + (value.evidenceText ? '<p class="microcopy">當時的證據：' + esc(value.evidenceText) + '</p>' : '') + '</div>';
  }
  function eventsMarkup() {
    const e = G.eventView(state).tip;
    if (!e?.available) return '<p>第 3 回合起才會有爆料資料。</p>';
    return '<section class="event-record"><h3>' + esc(e.title) + '</h3><p>' + esc(e.summary) + '</p><div class="event-evidence"><b>' + esc(e.evidenceText) + '</b><span>已核對 ' + Number(e.investigations || 0) + '／' + Number(e.maxInvestigations || 2) + ' 次</span></div>' + (e.history?.length ? e.history.map(x => eventRecord(x, x.quote ? '你說過' : '第 ' + Number(x.stage || x.evidenceLevel || 0) + ' 次核對')).join('') : '') + eventRecord(e.update, '核對結果') + '<p class="microcopy">核對：到社區工作室「準備政見」選這份資料（每次 ' + num(e.investigationCost) + ' 元，最多 2 次）。爆料：到電視台開記者會。</p></section>';
  }
  const crisisChoice = c => ({ pay: '花錢公關消毒', apologize: '公開道歉切割', fight: c.won ? '硬槓反控成功' : '硬槓反控炎上' })[c.choice] || '等待處理';
  const crisisKey = c => 'crisis-' + c.round + '-' + c.kind;
  // All timeline facts come from engine records; the UI only stores dismissal of the result card.
  function timelineEntries() {
    const entries = [];
    for (const j of state.journal) {
      for (const [i, e] of (j.planEffects || []).entries()) entries.push({ key: e.kind === 'crisis' ? 'crisis-day-' + j.day : 'plan-' + j.day + '-' + i, day: j.day, title: e.kind === 'crisis' ? crisisChoice(e) : e.title, text: e.text, votes: e.votes, tone: e.votes < 0 ? 'loss' : 'settled' });
      for (const [i, e] of (j.events || []).entries()) entries.push({ key: 'event-' + j.day + '-' + i, day: j.day, title: e.title, text: e.text, votes: e.effects?.votes, tone: 'settled' });
    }
    for (const o of state.offers || []) if (o.respondedDay) entries.push({ key: 'offer-' + o.id + '-' + o.respondedDay, day: o.respondedDay, title: o.status === 'breached' ? '合作破局' : o.effect ? '接受合作' : '婉拒合作', text: G.dealOf(state, o.id)?.org || '合作邀約', votes: o.effect?.votes, tone: 'settled' });
    for (const c of state.challenges || []) entries.push({ key: c.id, day: c.issuedDay, title: '小馬提出質疑', text: c.quote, tone: c.status === 'open' && !c.mitigatedDay ? 'pending' : 'settled' });
    const c = state.crisis;
    if (c && !entries.some(e => e.key === 'crisis-day-' + c.round)) entries.push({ key: 'crisis-day-' + c.round, day: c.round, title: c.status === 'resolved' ? crisisChoice(c) : '突發危機・等待處理', text: c.text, votes: c.effect?.votes, tone: c.status === 'pending' ? 'pending' : c.effect?.votes < 0 ? 'loss' : 'settled' });
    return entries.sort((a, b) => b.day - a.day);
  }
  function renderEvents() {
    const timeline = $('event-timeline'), card = $('event-feedback'), entries = timelineEntries();
    timeline.hidden = !state.started;
    const row = e => '<li data-event-key="' + esc(e.key) + '" data-tone="' + e.tone + '"><span class="event-round">R' + Number(e.day) + '</span><div><strong>' + esc(e.title) + '</strong><p>' + esc(e.text) + '</p></div>' + (Number.isFinite(e.votes) ? '<span class="event-votes">' + signedVotes(e.votes) + ' 票</span>' : '') + '</li>';
    timeline.innerHTML = '<div class="timeline-heading"><h2>選戰動態</h2><span>' + entries.length + ' 則紀錄</span></div>' + (entries.length ? '<ol>' + entries.slice(0, 3).map(row).join('') + '</ol>' + (entries.length > 3 ? '<details><summary>查看較早 ' + (entries.length - 3) + ' 則</summary><ol>' + entries.slice(3).map(row).join('') + '</ol></details>' : '') : '<p class="timeline-empty">選戰剛開始。危機、合作與質疑會記在這裡。</p>');
    const c = state.crisis;
    const show = state.started && c?.status === 'resolved' && c.resolvedDay === state.day && dismissedFeedback !== crisisKey(c);
    card.hidden = !show;
    if (!show) { card.innerHTML = ''; return; }
    const cost = state.ledger.find(l => l.day === c.resolvedDay && l.action === 'crisis')?.cost || 0;
    card.innerHTML = '<div class="event-card-top"><span>選戰快報 · R' + c.round + '</span><button type="button" data-action="dismiss-event" aria-label="關閉事件結果">×</button></div><h2>' + esc(crisisChoice(c)) + '</h2><p>' + esc(c.text) + '</p><div class="event-impact"><strong>' + signedVotes(c.effect.votes) + '<small>你的票數</small></strong><span>' + signedVotes(c.effect.rival) + '<small>小馬票數</small></span><span>' + money(cost) + '<small>處理支出</small></span></div><div class="event-groups">' + (c.effect.byGroup || []).map((v, i) => '<span>' + esc(groupTitle(i)) + ' <b>' + signedVotes(v) + '</b></span>').join('') + '</div><p class="microcopy">結果已記入選戰動態，可以繼續安排行程。</p>';
  }
  function save() {
    state._ui = { x: position.x, y: position.y, topic: selectedTopic, venue: selectedVenue, action: selectedAction, gifts, billboard, research: researchPick, deep: deepOn, booth, investigate: investigateOn, gotv: gotvOn, brief, respond: respondOn, donor, dismissedFeedback, counting: counting ? { ...counting } : null };
    try { window.localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (_) { saveError = '瀏覽器無法儲存進度；重新整理可能會失去進度。'; }
    showNotice();
  }
  // The last finished game is kept apart from the current one, so its report can still be read after a new game starts.
  function saveLast() {
    const r = state.result; if (!r) return;
    try { window.localStorage.setItem(LAST_KEY, JSON.stringify({ seed: state.seed, settings: state.settings, outcome: r.outcome, votes: r.playerVotes, rank: r.rank, lastSeat: r.lastSeat, rivalVotes: r.rivalVotes, keyFactors: r.keyFactors, rounds: r.roundsSummary })); } catch (_) { }
  }
  function showNotice() { $('save-warning').hidden = !(saveError || saveNotice); $('save-warning').innerHTML = saveError ? esc(saveError) : saveNotice ? esc(saveNotice) + ' <button class="text-button" data-action="dismiss-notice">知道了</button>' : ''; }
  function announce(text) { $('announcer').textContent = text; }
  function focusDock() { $('dock').focus({ preventScroll: true }); }
  function revealDock() { if (window.innerWidth < 1024) $('dock').scrollIntoView?.({ behavior: reduced.matches ? 'auto' : 'smooth', block: 'nearest' }); }
  function actorPosition(el, p, visual = false) { if (!visual && Art?.mapPoint) p = Art.mapPoint(p); el.style.left = p.x / 12 + '%'; el.style.top = p.y / 6.5 + '%'; el.style.zIndex = String(Math.round(p.y)); }
  function setPosition() { const p = motion && Art?.travelPoint ? Art.travelPoint(motion.route,motion.index,position,motion.id,motion.venue) : Art?.isToy?.() && state.pending && state.phase !== 'plan' ? Art.visualRoute(state.pending.id,state.pending.venue).at(-1) : Art?.mapPoint ? Art.mapPoint(position) : position; actorPosition($('player'), p, true); }
  // Both candidates dress for their identity and party; redraw only when that changes.
  function dress() {
    const key = state.settings.background + ':' + state.settings.affiliation + ':' + state.rival.party;
    if (key === dressed) return; dressed = key;
    Art?.setCandidates?.({ player: { identity:state.settings.background, outfit: G.BACKGROUNDS[state.settings.background]?.outfit || 'casual', party: state.settings.affiliation === 'independent' ? null : state.settings.affiliation }, rival: { party: state.rival.party } });
    $('player').innerHTML = Art ? Art.avatar('player') + '<span class="actor-name">小沈・你</span>' : '<span class="actor-name">小沈・你</span>';
    $('rival').innerHTML = Art ? Art.avatar('rival') + '<span class="actor-name">小馬</span>' : '';
  }
  function scene() {
    $('scene').innerHTML = Art ? Art.scene() : '<p class="blank-scene">小鎮圖像未能載入，下方操作仍可遊玩。</p>';
    actorPosition($('rival'), { x: 1030, y: 470 });
    $('new-teammate').innerHTML = Art ? Art.avatar('helper') + '<span class="actor-name">新夥伴</span>' : '';
    dressed = ''; dress(); setPosition();
  }

  /* ---------- header ---------- */
  function raceSummary() {
    if (!state.started) return '<span class="race-idle">選好身分就出發</span>';
    if (state.phase === 'result' && counting?.status === 'inprogress') return '<span class="race-idle">開票中</span>';
    if (state.phase === 'result' && state.result) return '<span>你 <b>' + num(state.result.playerVotes) + '</b></span><span>當選線 <b>' + num(state.result.lastSeat) + '</b></span><span>小馬' + partyDot(state.rival.party) + ' <b>' + num(state.result.rivalVotes) + '</b></span>';
    const r = G.raceView(state), gap = r.you - r.line;
    return '<span>你 第 <b>' + r.rank + '</b> 名</span><span>' + (gap >= 0 ? '過線 <b>' + num(gap) + '</b> 票' : '還差 <b>' + num(-gap) + '</b> 票') + '</span><span>當選線 <b>' + num(r.line) + '</b></span>';
  }
  function header() {
    $('day-label').innerHTML = (!state.started ? '準備參選' : state.phase === 'result' ? '開票' : '第 ' + state.day + ' 回合') + (state.started && state.phase !== 'result' ? '<span>／ ' + G.DAYS + '</span><em class="act-chip">' + ['', '第一幕', '第二幕', '第三幕'][G.actOf(state.day).id] + '</em>' : '');
    $('day-dots').innerHTML = Array.from({ length: G.DAYS }, (_, i) => '<i class="' + (state.phase === 'result' || i + 1 < state.day ? 'done' : i + 1 === state.day && state.started ? 'current' : '') + (i + 1 === G.DEBATE_ROUND ? ' debate' : '') + '"></i>').join('');
    $('cash').textContent = wan(state.budget.available);
    $('race-summary').innerHTML = raceSummary();
    $('journal-count').textContent = String(state.journal.length);
    $('day-kicker').textContent = state.started ? period(state.day) + '・' + G.actOf(state.day).title : '臺北市文山區・木柵';
    const pending = state.pending, located = pending || (state.phase === 'recap' ? state.recap?.player : null);
    $('world-title').textContent = !state.started ? '從巷口，走進大家的日常。' : state.phase === 'plan' ? '這回合要去哪裡？' : state.phase === 'question' ? placeName(pending.id, pending.venue) : state.phase === 'recap' ? '現場的反應' : state.phase === 'result' ? '開票' : (action(pending?.id)?.title || '') + '，出發。';
    $('location-label').textContent = located ? placeName(located.id || located.action, located.venue) : selectedAction ? placeName(selectedAction, plannedVenue()) : '競選辦公室';
    showNotice();
    const newGame = $('new-game'); newGame.hidden = !state.started; newGame.textContent = state.phase === 'result' ? '再玩一局' : '新的一局';
    document.body.dataset.phase = !state.started ? 'intro' : state.phase === 'result' && counting?.status !== 'inprogress' ? 'report' : state.phase;
  }
  function panel(kicker, label, body) {
    return '<div class="panel-kicker"><span>' + kicker + '</span><span>' + label + '</span></div><div class="panel-content">' + (error ? '<div class="error-message" role="alert">' + esc(error) + '</div>' : '') + body + '</div>';
  }

  /* ---------- opening ---------- */
  const myParty = () => state.settings.affiliation === 'independent' ? null : state.settings.affiliation;
  const pickMark = on => '<span class="pick-mark" aria-hidden="true">' + (on ? '✓' : '') + '</span>';
  function identityCards() {
    const value = state.settings?.background;
    return '<fieldset class="pick-group"><legend><span class="step">1</span>你是誰</legend><div class="identity-cards">' + Object.values(G.BACKGROUNDS).map(b => '<button type="button" class="identity-card pick-card" data-action="setting" data-setting="background" data-value="' + esc(b.id) + '" aria-pressed="' + (value === b.id) + '">' + pickMark(value === b.id) + '<span class="portrait">' + (Art?.portrait ? Art.portrait({ identity:b.id, outfit: b.outfit, party: myParty() }) : '') + '</span><b>' + esc(b.title) + ' <span class="difficulty d-' + esc(b.id) + '">' + esc(b.difficulty || '') + '</span></b><span class="identity-good">' + b.strengths.map(x => '＋ ' + esc(x)).join('<br>') + '</span><span class="identity-bad">' + b.weaknesses.map(x => '－ ' + esc(x)).join('<br>') + '</span></button>').join('') + '</div></fieldset>';
  }
  function partyFacts(p) {
    if (p.id === 'independent') return ['沒有黨部補助', '沒有黨的立場要顧', '沒有政黨傾向的選民好感 ×' + G.TUNING.party.receptive.swing];
    return ['這區約 ' + Math.round(G.PARTY_SHARES[p.id] * 100) + '% 選民，要分給幾位同黨候選人', '黨部補助 ' + wan(p.subsidy) + '・募款 ×' + p.fundraise, '黨的立場：' + Object.keys(G.PARTY_LINES[p.id]).map(short).join('、')];
  }
  function partyCards() {
    const value = state.settings?.affiliation;
    return '<fieldset class="pick-group"><legend><span class="step">2</span>政黨</legend><div class="party-cards">' + Object.values(G.PARTIES).map(p => '<button type="button" class="party-card pick-card" style="--party:' + esc(p.color) + '" data-action="setting" data-setting="affiliation" data-value="' + esc(p.id) + '" aria-pressed="' + (value === p.id) + '">' + pickMark(value === p.id) + '<span class="emblem">' + esc(p.id === 'independent' ? '無' : p.short) + '</span><b>' + esc(p.title) + '</b><span>' + partyFacts(p).map(esc).join('<br>') + '</span></button>').join('') + '</div></fieldset>';
  }
  function intro() {
    const preview = JSON.parse(JSON.stringify(state)); G.start(preview);
    const E = G.ELECTION, r = G.raceView(preview), bg = G.BACKGROUNDS[preview.settings.background], party = G.PARTIES[preview.settings.affiliation], his = G.PARTIES[preview.rival.party], lines = id => Object.entries(G.PARTY_LINES[id] || {}).map(([t, plan]) => short(t) + '「' + G.TOPICS[t].plans.find(x => x.id === plan).text + '」').join('、');
    const side = (who, look, role, title, sub, votes, extra) => '<div class="mu-side mu-' + role + '"><span class="portrait">' + (Art?.portrait ? Art.portrait(look, role === 'rival' ? 'rival' : 'player') : '') + '</span><b>' + who + '</b><small>' + esc(title) + '</small>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '<strong>' + num(votes) + ' 票</strong>' + (extra ? '<small>' + extra + '</small>' : '') + '</div>';
    const matchup = '<section class="matchup-card"><div class="card-head"><b>開局估票</b><span>依你選的身分與政黨</span></div><div class="matchup">' + side('小沈・你', { outfit: bg.outfit, party: myParty() }, 'you', party.title + '・' + bg.title, '', r.you, '可用 ' + wan(preview.budget.available)) + '<span class="vs">VS</span>' + side('小馬', { party: preview.rival.party }, 'rival', his.title, '上屆差一千多票落選', r.rival, '') + '</div><p class="matchup-note">小馬是' + esc(his.title) + '候選人，這次捲土重來。他跟你搶同一批游離選民，還會攻擊你。前 13 名才當選，你們兩個都可能落選。</p>' + (lines(myParty()) ? '<p class="matchup-note">你的黨的立場：' + esc(lines(myParty())) + '。照著說同黨選民加分，違反流失較多。</p>' : '') + '</section>';
    return panel('新的一局', '30 天 · 10 回合', '<h2 class="intro-title">讓三群人聽懂你，擠進前 13 名。</h2><p class="intro-goal">' + esc(RULE_LINE) + '上一屆當選線 ' + num(E.reference.lastSeat) + ' 票。</p>' + matchup + '<ul class="intro-reading"><li><b>點地圖出發</b>：每個地點的人群不同，他們會直接講他們要什麼。</li><li><b>看臉色回答</b>：答案旁有長輩、中年、青年三張臉。</li><li><b>小馬跟你搶票</b>：他會攻擊你，你可以回應，也可以點名反擊或爆料。</li></ul>');
  }
  function dockIntro() {
    const bg = G.BACKGROUNDS[state.settings.background], party = G.PARTIES[state.settings.affiliation];
    return '<div class="dock-intro">' + identityCards() + partyCards() + '<div class="start-row"><span class="step">3</span><p>你是<b>' + esc(party.title) + '・' + esc(bg.title) + '</b>。開始後不能再換。</p><button class="primary-button" data-action="start">開始競選 →</button></div></div>';
  }

  /* ---------- planning ---------- */
  const helpers = () => (state.player.team?.members || []).filter(m => m.hiredDay < state.day).length;
  // The issues this destination may ask about: a place's pool, TV's three, the debate's announced question.
  function askPool() { if (selectedAction === 'online') return G.onlinePool(state); if (onSite(selectedAction)) return selectedAction === 'rally' ? [] : (G.venueView(state).find(v => v.id === plannedVenue())?.pool || []); if (selectedAction === 'tv') return G.tvPool(state); if (selectedAction === 'debate') return state.debate ? [state.debate.topic] : []; return []; }
  // By default an assistant researches the likeliest issue you have not looked into; you can pick another one or none.
  // The issues the research row offers: the ones that may come up here first, then the hottest others, four in all.
  function researchChoices() { const pool = askPool(); return { pool, others: (G.landscapeView(state).ranking || []).map(r => r.topic).filter(t => G.topicsOf(state).includes(t) && !pool.includes(t)).slice(0, Math.max(0, 4 - pool.length)) }; }
  // Assistants research only on a preparation round; each free one takes one picked issue.
  function researchTopic() { return selectedAction === 'prepare' || onSite(selectedAction) || behind(selectedAction) ? researchPick.slice(0, helpers()) : null; }
  const planConfig = () => ({ donor: selectedAction === 'fundraise' ? donor : null, venue: plannedVenue(), ...(selectedAction === 'prepare' && selectedTopic ? { topic: selectedTopic } : {}), gifts: gifts && onSite(selectedAction), billboard: billboard && onSite(selectedAction), research: researchTopic(), deep: deepOn, booth, investigate: investigateOn, gotv: gotvOn, brief: selectedAction === 'tv' ? brief : null, respond: selectedAction === 'tv' && respondOn });
  // The candidates around the last seat: the 25 others at last election's totals, you and 小馬 at today's estimates.
  function ladderMarkup() {
    const rows = G.ladderView(state).filter(r => (r.rank >= 11 && r.rank <= 14) || r.id <= 1);
    let html = '', last = 0;
    for (const r of rows) { if (last && r.rank > last + 1) html += '<li class="lad-gap" aria-hidden="true">⋯</li>'; html += '<li class="' + [r.id === 0 ? 'lad-me' : r.id === 1 ? 'lad-rival' : '', r.elected ? 'lad-in' : '', r.rank === G.ELECTION.seats ? 'lad-last' : ''].filter(Boolean).join(' ') + '"><span>' + r.rank + '</span><b>' + esc(r.id === 0 ? '你' : r.name) + (r.id === 1 ? partyDot(state.rival.party) : '') + '</b><strong>' + num(r.votes) + '</strong></li>'; last = r.rank; }
    return '<ol class="ladder" aria-label="當選線附近的排名">' + html + '</ol><p class="ladder-note">虛線以上的 13 人現在會當選。小馬是領先者，你要搶的是虛線附近那幾席；他跟你搶同一批游離選民，你威脅到他時他會攻擊你。</p>';
  }
  // You against 小馬 in each group as a tug of war: the green part is your share of the two of you.
  function tugBars(r, before) {
    return '<div class="tug-legend"><span>● 你</span><span>● 小馬</span><small>兩人之間的票數比較</small></div><div class="tug" aria-label="三群：你和小馬">' + r.groups.map((g, k) => { const total = Math.max(1, g.you + g.rival), mine = g.you / total * 100, d = before?.groups?.[k] ? g.you - before.groups[k].you : null; return '<div class="tug-row g-' + GROUP_KEYS[k] + '"><span class="tug-name"><span class="dot"></span>' + esc(g.title) + '</span><span class="tug-bar"><i class="tug-you" style="width:' + mine.toFixed(1) + '%"></i><i class="tug-rival" style="width:' + (100 - mine).toFixed(1) + '%"></i></span><span class="tug-num"><b>' + num(g.you) + '</b>' + (d == null ? '' : '<small class="' + (d >= 0 ? 'up' : 'down') + '">' + signedVotes(d) + '</small>') + '<em>' + num(g.rival) + '</em></span><span class="tug-gap">' + (g.you >= g.rival ? '你領先 ' : '你落後 ') + num(Math.abs(g.you-g.rival)) + ' 票</span></div>'; }).join('') + '</div>';
  }
  // Your place against the line, the candidates around it and, from the latest poll, the three groups; the totals live in the header.
  function raceBoard(compact = false, before = null, ladder = false) {
    if (!state.started) return '';
    const r = G.raceView(state), gap = r.you - r.line, moved = before?.you == null ? '' : '<small class="' + (r.you - before.you >= 0 ? 'up' : 'down') + '">本回合 ' + signedVotes(r.you - before.you) + '</small>';
    const bloc = !compact && (r.bloc.you || r.bloc.rival) ? '<p class="race-bloc">組織票：你 ' + num(r.bloc.you) + '｜小馬 ' + num(r.bloc.rival) + '</p>' : '';
    const rivalNote = r.rival > r.line ? '小馬穩在線上；你搶的是線附近的那幾席。' : r.rival > r.line * .85 ? '小馬掉到線附近了，你們在搶同一席。' : '';
    return '<section class="race-board" aria-label="選情"><div class="race-head"><b>選情</b><span>當選線（估）：上一屆第 ' + SEATS + ' 名 ' + num(r.line) + ' 票</span></div>' + '<p class="race-gap ' + (gap >= 0 ? 'ahead' : 'behind') + '">現在開票：第 ' + r.rank + ' 名，' + (gap >= 0 ? '過線約 ' + num(gap) + ' 票' : '還差約 ' + num(-gap) + ' 票') + moved + '</p>' + (rivalNote ? '<p class="race-note">' + rivalNote + '</p>' : '') + (ladder ? ladderMarkup() : '') + (compact ? '' : pollBars()) + bloc + '</section>';
  }
  // The three groups as of the latest poll, the gap turned into points of each group, and where the weakest group gathers.
  function pollBars() {
    const pv = G.pollView(state), p = pv.latest;
    if (!p) { const r = G.raceView(state), need = Math.max(0, Math.round(r.line - r.you)), plan = G.gapPlan(state, need);
      return (need ? '<p class="poll-plan">還差約 ' + num(need) + ' 票，等於' + plan.map(g => esc(g.title) + '再多 ' + g.addPct + '%').join('，或') + '。</p>' : '') + '<p class="poll-wait">三群各有多少人挺你，要等民調：' + (pv.next ? '第 ' + pv.next + ' 回合有第一份' : '這局沒有民調') + '（' + (state.settings.affiliation === 'independent' ? '無黨籍' : '政黨候選人') + '共 ' + pv.total + ' 份）。</p>'; }
    const k = p.groups.findIndex(g => g.id === p.focus), focus = p.groups[k], places = G.venueView(state).filter(v => v.main === k).map(v => esc(v.title));
    return '<p class="poll-head">三群・第 ' + p.day + ' 回合民調' + (pv.next ? '（下一份第 ' + pv.next + ' 回合）' : '（最後一份）') + '</p>' + tugBars({ groups: p.groups }, null)
      + (p.need ? '<p class="poll-plan">那時還差約 ' + num(p.need) + ' 票，等於' + p.groups.map(g => esc(g.title) + '再多 ' + g.addPct + '%').join('，或') + '。</p>' : '<p class="poll-plan">那時已經過線。</p>')
      + (p.need && focus ? '<p class="poll-tip">你在' + esc(focus.title) + '最弱（' + focus.youPct + '%）' + (places.length ? '，' + places.join('、') + '這群人最多' : '') + '。</p>' : '');
  }
  function groupCard() {
    const v = G.groupView(state);
    return '<section class="group-card" aria-label="三群選民"><div class="card-head"><b>三群選民</b><span>誰比較多、最在意什麼</span></div>' + v.map((g, k) => '<div class="group-row g-' + GROUP_KEYS[k] + '"><span class="group-name"><span class="dot"></span>' + esc(g.title) + ' <small>' + Math.round(g.share * 100) + '%</small></span><span class="group-top">' + (g.top ? '最在意：' + esc(G.TOPICS[g.top].title) : '') + '</span><span class="group-trait">聽到你打包票：' + esc(g.promiseTitle) + '</span>' + (g.rule ? '<span class="group-rule">' + esc(g.rule === 'fresh' ? '想要新面孔，好感 ×' + g.lift : '覺得你靠家族，好感 ×' + g.lift) + '</span>' : '') + '</div>').join('') + '</section>';
  }
  function partyCard() {
    const p = G.partyView(state), def = G.PARTIES[p.party];
    return '<section class="party-card-side" style="--party:' + esc(p.color) + '" aria-label="政黨"><div class="card-head"><b>' + partyBadge(p.party) + esc(p.title) + '</b><span>' + (p.party === 'independent' ? '沒有政黨傾向的選民好感 ×' + G.TUNING.party.receptive.swing : '黨部補助 ' + wan(def.subsidy) + '・募款 ×' + def.fundraise) + '</span></div>' + (p.line.length ? '<p class="party-chips"><span>黨的立場</span>' + p.line.map(x => '<b title="' + esc(x.text) + '">' + esc(x.short) + '：' + esc(x.text) + '</b>').join('') + '</p><p class="party-note">只在這三題：照著說同黨選民加分，違反流失約兩倍。</p>' : '') + (p.aid ? '<p class="party-note party-aid">黨部還會給：第 ' + p.aid.subsidyDay + ' 回合撥 ' + wan(p.aid.subsidy) + '、第 ' + p.aid.mobilizeDay + ' 回合起動員約 ' + num(p.aid.mobilize) + ' 票。違反黨的立場 1 題打五折、2 題以上沒有' + (p.aid.breaks ? '；你現在違反 ' + p.aid.breaks + ' 題' : '') + '。</p>' : '') + '<p class="party-note rival-side">小馬是' + esc(p.rival.title) + '：' + esc(p.rival.line.map(x => x.short).join('・')) + '</p></section>';
  }
  // The offer spells out three things: it takes no round, what it ties you to, and what you get.
  function offerCard(o) {
    const line = o.partyLine ? '<p class="tag ' + (o.partyLine.keeps ? 'party' : 'breach') + '">' + (o.partyLine.keeps ? '符合' : '違反') + esc(G.PARTIES[state.settings.affiliation].title) + '的立場</p>' : '';
    const known = o.faces.some(f => f !== 'unknown'), reaction = known ? '<span class="offer-faces">公開後聽到的人：' + estimateRow(o.faces, o.estimate) + '</span>' : '<span class="offer-faces">還沒研究「' + esc(short(o.topic)) + '」，不知道三群怎麼看；接受後會知道。</span>';
    return '<article class="offer-card" id="offer-card"><div class="card-head"><b>合作邀約</b><span>只在這回合決定</span></div><h3>' + esc(o.name || o.org) + ' <small>' + esc(o.org) + '</small></h3><p class="offer-ask">' + esc(o.pitch) + '</p><dl class="offer-deal"><div><dt>不占回合</dt><dd>在這裡接受或婉拒，這回合照樣出發。</dd></div><div><dt>綁住什麼</dt><dd>接受就是現在公開支持「' + esc(o.planText) + '」。之後改說另一個做法，組織票會撤走，也算改口。</dd></div><div><dt>拿到什麼</dt><dd>' + esc([o.bloc ? '組織票約 ' + num(o.bloc) + ' 票' : '', o.money ? '捐款 ' + wan(o.money) : '', o.perk === 'tv' ? '一次免費上節目' : ''].filter(Boolean).join('、')) + '。' + reaction + '</dd></div></dl>' + line + (o.flip ? '<p class="tag flip">你說過「' + esc(o.flip) + '」，接受等於改口。</p>' : '') + '<p class="microcopy">婉拒的話，小馬可能接下。</p><div class="offer-actions"><button data-action="offer" data-choice="accept">接受</button><button data-action="offer" data-choice="decline">婉拒</button></div></article>';
  }
  // Everything here is visible information the player can act on this round; nothing reads hidden voter state.
  function crisisCard(c) {
    const can = state.budget.available >= G.COSTS.crisis;
    return '<article class="crisis-card" id="crisis-card"><div class="card-head"><b>突發危機</b><span>出發前要先處理</span></div><p class="crisis-text">' + esc(c.text) + '</p><div class="crisis-actions"><button data-action="crisis" data-choice="pay"' + (can ? '' : ' disabled aria-disabled="true"') + '><b>花錢公關消毒</b><small>' + wan(G.COSTS.crisis) + '・不掉票' + (can ? '' : '（錢不夠）') + '</small></button><button data-action="crisis" data-choice="apologize"><b>公開道歉切割</b><small>免費・你票最多的那群小掉票</small></button><button data-action="crisis" data-choice="fight"><b>硬槓反控小馬</b><small>免費・五五波：同黨或吃承諾的人力挺，或炎上掉兩倍</small></button></div></article>';
  }
  // Everything here is visible information the player can act on this round; nothing reads hidden voter state.
  function situationMarkup() {
    const f = G.forecast(state), lv = G.landscapeView(state), rumor = G.rumorView(state), due = G.pendingChallenges(state), rows = [], soon = G.upcomingOffer(state), tip = G.eventView(state).tip, act = G.actOf(state.day);
    const pollToday = G.pollView(state).latest;
    if (pollToday?.day === state.day) { const f = pollToday.groups.find(g => g.id === pollToday.focus); rows.push(['民調', '新民調：你第 ' + pollToday.rank + ' 名，' + (pollToday.need ? '還差約 ' + num(pollToday.need) + ' 票；' + f.title + '最弱。' : '已經過線。'), '']); }
    const aidToday = (state.partyAid || []).find(x => x.day === state.day);
    if (aidToday) rows.push(['黨部', aidToday.kind === 'subsidy' ? (aidToday.money ? '撥款 ' + wan(aidToday.money) : '你違反黨的立場太多題，這筆補助沒了') : (aidToday.votes ? '開始動員同黨選民，約 ' + num(aidToday.votes) + ' 票' : '你違反黨的立場太多題，黨部不幫你動員'), aidToday.breaks ? 'warn' : '']);
    if (act.from === state.day) rows.push(['新階段', act.title + '：' + ['', '摸清三群、找第一桶金。', '議題升溫；第 5 回合起可能爆出黑料，第 5–6 回合還有頭人來談。', '第 8 回合政見會，第 9–10 回合可以選前催票。'][act.id], '']);
    // Crisis handling, clarifying leaflets and the clean pledge take effect at once, so their result shows before setting out.
    const crisis = state.crisis?.resolvedDay === state.day ? state.crisis : null;
    if (crisis?.effect) rows.push(['危機', ({ pay: '花錢公關消毒', apologize: '公開道歉切割', fight: crisis.won ? '硬槓反控成功' : '硬槓反控炎上' })[crisis.choice] + ' → 你 ' + signedVotes(crisis.effect.votes) + ' 票' + (Math.abs(crisis.effect.rival || 0) >= 1 ? '；小馬 ' + signedVotes(crisis.effect.rival) + ' 票' : ''), crisis.effect.votes < 0 ? 'warn' : '']);
    for (const c of (state.challenges || []).filter(c => c.mitigatedDay === state.day && c.mitigation)) rows.push(['澄清', '發了澄清文宣，挽回一部分 → ' + signedVotes(c.mitigation.votes) + ' 票', '']);
    const pledged = state.events?.tip?.pledged;
    if (pledged?.day === state.day) rows.push(['宣示', '公開宣示乾淨選戰 → ' + signedVotes(pledged.votes) + ' 票', '']);
    for (const c of due) { const where = c.venues.map(v => venues[v]?.title).filter(Boolean).join('、'); rows.push(['要回應', '小馬' + (c.kind === 'guarantee' ? '說你的保證「' + c.quote + '」做不到' : '批評你的「' + c.quote + '」') + '，聽到的人 ' + signedVotes(c.hit) + ' 票。' + (c.deadline <= state.day ? '這回合' : '這回合或下回合') + '去' + where + '或上電視會被問到；也可以發澄清文宣，或不理他（逾期會再掉票）。', 'warn', '<button class="mini-button" data-action="clarify" data-id="' + esc(c.id) + '"' + (state.budget.available < c.clarifyCost ? ' disabled aria-disabled="true"' : '') + '>發澄清文宣・' + wan(c.clarifyCost) + '</button>']); }
    if (rumor) rows.push(['傳聞', rumor.text.replace(/。$/, '') + '（' + rumor.reliability + '）。', 'is-rival']);
    if (soon) rows.push(['下回合', soon.org + '要來談合作：希望你支持「' + soon.planText + '」。想先知道三群怎麼看，這回合可以研究「' + short(soon.topic) + '」。', '']);
    if (lv.debate && state.day < G.DEBATE_ROUND) rows.push(['政見會', '第 ' + lv.debate.round + ' 回合，題目「' + lv.debate.title + '」；深入研究或親自準備過這題，台上能壓制小馬。', '']);
    if (tip?.available && !tip.update && !tip.pledged) rows.push(['爆料', '小馬經費的資料：' + tip.evidenceText.replace(/。$/, '') + '。出發時可加碼查證（每次 ' + wan(tip.investigationCost) + '，最多 2 次，不占你的回合），或到電視台開記者會。', '']);
    if (tip?.canPledge) rows.push(['乾淨選戰', '查證結果不能爆。可以公開宣示不打烏賊戰，討厭空話的人會加分。', '', '<button class="mini-button" data-action="pledge">宣示乾淨選戰・免費</button>']);
    const record = state.player.actions.find(a => a.record === true);
    if (record && stanceOf(record.topic)?.record) rows.push(['你的紀錄', '上一屆你主張「' + record.quote + '」；改口的話，記得這句話的人會不滿。', '']);
    if (lv.surge) rows.push(['升溫', '「' + lv.surge.title + '」' + (lv.surge.status === 'announced' ? '下回合起變熱門。' : '正熱門，到第 ' + lv.surge.until + ' 回合。'), '']);
    if (f.now.id === 'rain') rows.push(['天氣', '下雨：街上的人少四分之一，電視不受影響。', '']);
    return rows.length ? '<section class="situation" aria-label="本回合局勢">' + rows.map(([k, t, cls, extra]) => '<p class="situation-row ' + (cls || '') + '"><b>' + k + '</b><span>' + esc(t) + (extra ? '<br>' + extra : '') + '</span></p>').join('') + '</section>' : '';
  }
  function carryRow() {
    const known = state.player.known.filter(t => t !== 'tip');
    return '<section class="carry"><b>查過的議題</b>' + (known.length ? known.map(id => '<button class="text-button" data-action="dossier" data-topic="' + esc(id) + '">' + esc(short(id)) + (state.player.insight?.[id]?.level === 'precise' ? '・親自' : '') + '</button>').join('') : '<span>還沒有</span>') + '<span class="team-line">團隊 ' + ((state.player.team?.members?.length || 0) + 1) + ' 人</span></section>';
  }
  function planPanel() {
    const offer = G.offerView(state);
    return panel('第 ' + state.day + '／' + G.DAYS + ' 回合', '還沒出發', (state.crisis?.status === 'pending' ? crisisCard(state.crisis) : '') + (offer ? offerCard(offer) : '') + situationMarkup() + raceBoard(false, null, true) + groupCard() + partyCard() + carryRow());
  }
  // Destinations as buttons on the map, and as a list under it.
  function destinations() {
    const list = [];
    const chiefs = Object.fromEntries((G.chiefView?.(state) || []).map(c => [c.venue, c]));
    // The map names each place's own issue (its strongest local theme among what it may ask), not the crowd's biggest concern everywhere.
    const theme = v => { const aff = G.VENUES[v.id]?.affinity || {}; return [...v.pool].sort((a, b) => (aff[b] || 1) - (aff[a] || 1))[0]; };
    for (const v of G.venueView(state)) list.push({ kind: 'canvass', venue: v.id, title: v.title, sub: v.mainTitle + '多・' + (v.challenged ? '問小馬的批評' : '常問' + short(theme(v))), group: v.main, boards: v.billboards, chief: chiefs[v.id] || null });
    list.push({ kind: 'tv', title: '中立新聞台', sub: '長輩、中年多・三選一' });
    list.push({ kind: 'online', title: '直播間', sub: '青年多・用助手、不花錢' });
    list.push({ kind: 'prepare', title: '社區工作室', sub: '準備政見' });
    list.push({ kind: 'fundraise', title: '募款', sub: '補競選款' });
    list.push({ kind: 'recruit', title: '招募', sub: '多一位助手' });
    if (state.day >= G.DEBATE_ROUND - 2 && state.day <= G.DEBATE_ROUND) list.push({ kind: 'debate', title: '政見發表會', sub: state.day === G.DEBATE_ROUND ? '這回合・談' + short(state.debate?.topic) : '第 ' + G.DEBATE_ROUND + ' 回合', disabled: state.day !== G.DEBATE_ROUND });
    return list;
  }
  const isSelected = d => (d.kind === 'canvass' ? onSite(selectedAction) && plannedVenue() === d.venue : d.kind === 'tv' ? ['tv', 'press'].includes(selectedAction) : d.kind === 'prepare' ? ['prepare', 'dig'].includes(selectedAction) : selectedAction === d.kind);
  function hotspots() {
    if (!state.started || state.phase !== 'plan') return '';
    const rumor = G.rumorView(state), due = G.pendingChallenges(state), rumorSpot = rumor ? (rumor.action === 'canvass' ? rumor.venue : rumor.action === 'tv' ? 'tv' : rumor.action === 'debate' ? 'debate' : null) : null;
    return destinations().map(d => {
      const key = d.venue || d.kind, p = Art?.isToy?.() ? Art.spot(key) : HOTSPOTS[key] || anchors.start, selected = isSelected(d), canAnswer = d.kind === 'tv' ? due.length > 0 : d.kind === 'canvass' && due.some(c => c.venues.includes(d.venue));
      return '<button class="hotspot' + (d.kind === 'canvass' ? ' venue g-' + GROUP_KEYS[d.group] : ' building') + (selected ? ' selected' : '') + '" style="left:' + (p.x / 12).toFixed(2) + '%;top:' + (p.y / 6.5).toFixed(2) + '%" data-action="select-action" data-kind="' + d.kind + '"' + (d.venue ? ' data-venue="' + d.venue + '"' : '') + ' aria-pressed="' + selected + '"' + (d.disabled ? ' disabled aria-disabled="true"' : '') + ' aria-label="' + esc(d.title + '：' + d.sub) + '"><span class="pin">' + icon(d.kind) + '</span><span class="hotspot-label"><b>' + esc(d.title) + '</b><small>' + esc(d.sub) + '</small></span>' + (canAnswer ? '<span class="badge warn">回應</span>' : '') + (rumorSpot === key ? '<span class="badge rival">小馬?</span>' : '') + (d.boards ? '<span class="badge board">看板 ' + d.boards + '</span>' : '') + (d.chief ? '<span class="badge chief' + (d.chief.broken ? ' won' : '') + '" title="' + esc(d.chief.name + (d.chief.broken ? '挺你' : '：去了 ' + d.chief.visits + '／' + d.chief.need + ' 次')) + '">' + (d.chief.broken ? '里長挺你' : '里長 ' + d.chief.visits + '/' + d.chief.need) + '</span>' : '') + '</button>';
    }).join('');
  }
  function dockAlerts() {
    const offer = G.offerView(state), due = G.pendingChallenges(state), items = [];
    if (state.crisis?.status === 'pending') items.push('<a href="#crisis-card">突發危機：出發前先處理 →</a>');
    if (offer) items.push('<a href="#offer-card">' + esc(offer.org) + '來談合作，這回合要決定 →</a>');
    for (const c of due) items.push('<span>小馬' + (c.kind === 'guarantee' ? '說你的保證做不到' : '批評你') + '：去' + esc(c.venues.map(v => venues[v]?.title).join('、')) + '或上電視回應，或發澄清文宣</span>');
    return items.length ? '<p class="dock-alerts">' + items.join('') + '</p>' : '';
  }
  // Where a chief holds the place: still a stranger, about to come round, or already on your side.
  function chiefLine(c) {
    if (!c) return '';
    return '<p class="dock-info chief-line' + (c.broken ? ' won' : '') + '">' + (c.broken ? esc(c.name) + '挺你：這裡的人比較願意聽，也不會因為你常來而膩。' : c.breaks ? '這次去，' + esc(c.name) + '就會點頭幫你，帶來約 ' + num(G.TUNING.chief.bloc) + ' 票組織票。' : esc(c.name) + '還不熟你（去過 ' + c.visits + '／' + c.need + ' 次）：這裡的人先保留，效果打折。') + '</p>';
  }
  // Raising money: a small drive with no strings, or a visit to a broker who pays for a public stance.
  function donorCards() {
    const list = G.donorView(state), card = (id, on, title, lines, extra, disabled) => '<button class="donor-card' + (on ? ' on' : '') + '" data-action="donor" data-id="' + esc(id) + '" aria-pressed="' + on + '"' + (disabled ? ' disabled aria-disabled="true"' : '') + '><b>' + title + '</b>' + lines.map((l, i) => '<small class="donor-' + (i === 0 ? 'condition' : 'benefit') + '">' + l + '</small>').join('') + (extra || '') + '</button>';
    const small = card('', !donor, '小額募款', ['不綁任何立場', '約 8–16 萬']);
    return '<div class="donor-cards" role="group" aria-label="找誰募款"><span class="pick-label">找誰</span>' + small + list.map(d => {
      const known = d.faces.some(f => f !== 'unknown'), taken = d.status !== 'open', gives = [d.money ? '捐款 ' + wan(d.money) : '', d.bloc ? '組織票約 ' + num(d.bloc) : '', d.perk === 'tv' ? '一次免費上節目' : ''].filter(Boolean).join('・');
      return card(d.id, donor === d.id, esc(d.name), ['要你公開支持「' + esc(d.planText) + '」', esc(gives)].concat(taken ? [d.status === 'his' ? '已被小馬拉走' : '已經談過'] : []), (known ? estimateRow(d.faces, d.estimate) : '<small class="tag">還沒研究「' + esc(short(d.topic)) + '」，不知道三群怎麼看</small>') + (d.flip ? '<small class="tag flip">你說過「' + esc(d.flip) + '」，答應等於改口</small>' : '') + (d.id === 'developer' ? '<small class="tag breach">拿了這筆錢，之後比較容易爆黑料</small>' : '') + (d.partyLine ? '<small class="tag ' + (d.partyLine.keeps ? 'party' : 'breach') + '">' + (d.partyLine.keeps ? '符合' : '違反') + '黨的立場</small>' : ''), taken);
    }).join('') + '</div>';
  }  // The studio: prepare an issue, or send people to dig for dirt on 小馬.
  function prepModes(dp = G.preview(state, 'dig', {})) { return modeButtons([['prepare', '準備政見', '免費・你和助手查資料'], ['dig', '挖黑料', dp.allowed ? wan(G.COSTS.dig) + '・可能挖到、空手或被反咬' : dp.reason, !dp.allowed]]); }
  function modeButtons(options) { return '<div class="mode-picks" role="group" aria-label="怎麼做">' + options.map(([id, label, note, disabled]) => '<button data-action="mode" data-kind="' + id + '" aria-pressed="' + (selectedAction === id) + '"' + (disabled ? ' disabled aria-disabled="true"' : '') + '><b>' + esc(label) + '</b><small>' + esc(note) + '</small></button>').join('') + '</div>'; }
  function toggle(name, on, label, note, disabled) { return '<button data-action="toggle" data-name="' + name + '" aria-pressed="' + !!on + '"' + (disabled ? ' disabled aria-disabled="true"' : '') + '><b>' + esc(label) + '</b><small>' + esc(note) + '</small></button>'; }
  const statusOf = t => state.player.insight?.[t]?.level === 'precise' ? '深入查過' : state.player.known.includes(t) ? '研究過' : '沒研究';
  // What may be asked here and which issue an assistant researches this round; researching the wrong one means being caught out.
  function researchNote(picks, free) {
    if (!free) return '還沒有助手；招募後，準備政見的回合每位助手可以多查一題。';
    if (!picks.length) return '點選議題，每位助手查一題（最多 ' + free + ' 題），下回合起用得到。已研究過的題再查一次會看到各群比例。';
    return '助手會查：' + picks.map(t => '「' + esc(G.TOPICS[t].title) + '」' + (state.player.known.includes(t) ? '（深入）' : '')).join('、') + '。剩 ' + (free - picks.length) + ' 位助手' + (onSite(selectedAction) ? '陪你出門。' : '跟你一起準備。');
  }
  // On a trip: what may be asked here and whether you are ready. Research itself happens on a preparation round, before the trip.
  function askRow() {
    const pool = askPool(), odds = onSite(selectedAction) ? (G.venueView(state).find(v => v.id === plannedVenue())?.odds || []) : [];
    if (!pool.length) return '';
    const ready = pool.filter(t => state.player.known.includes(t)).length;
    return '<div class="research-row ask-only" role="group" aria-label="這裡可能問"><span class="pick-label">可能問</span>' + pool.map((t, i) => '<span class="research-chip ' + (state.player.known.includes(t) ? 'ready' : 'risky') + '"><b>' + esc(short(t)) + (odds[i] ? ' ' + odds[i] + '%' : '') + '</b><small>' + statusOf(t) + '</small></span>').join('') + '</div><p class="research-note">' + (ready === pool.length ? '這裡會問的題你都準備過。' : '沒研究的題被問到會卡詞；要研究得先回社區工作室準備一回合。') + '</p>';
  }
  function researchRow() {
    const free = helpers(), picks = researchTopic() || [], ranking = (G.landscapeView(state).ranking || []).map(r => r.topic).filter(t => G.topicsOf(state).includes(t)), list = [...new Set([...ranking, ...G.topicsOf(state)])].filter(t => state.player.insight?.[t]?.level !== 'precise' && t !== selectedTopic);
    const chip = t => '<button class="research-chip ' + (state.player.known.includes(t) ? 'ready' : 'risky') + '" data-action="research" data-topic="' + t + '" aria-pressed="' + picks.includes(t) + '"' + (!free || (!picks.includes(t) && picks.length >= free) ? ' disabled aria-disabled="true"' : '') + '><b>' + esc(short(t)) + '</b><small>' + statusOf(t) + '</small></button>';
    return '<div class="research-row" role="group" aria-label="助手研究"><span class="pick-label research-heading">助手研究 <b>' + picks.length + '／' + free + ' 人已分配</b></span>' + list.map(chip).join('') + '</div><p class="research-note">' + researchNote(picks, free) + '</p>';
  }
  // Money buys reach and certainty; assistants can run a stall or dig into 小馬's money while you are out.
  function addonButtons(p) {
    const id = selectedAction, rows = [], boards = (state.player.billboards || []).length, full = boards >= G.MAX_BILLBOARDS, tip = G.eventView(state).tip, free = helpers();
    if (onSite(id)) { const est = G.billboardEstimate(state, p.venue); rows.push(toggle('gifts', gifts, '送小禮物', '+' + wan(G.COSTS.gifts) + '・現場多 25% 人；長輩最吃這套，中年普通，青年沒感覺')); rows.push(toggle('billboard', billboard && !full, '立看板', '+' + wan(G.COSTS.billboard) + '・之後每回合約 +' + num(est.perRound) + ' 票' + (est.fit > 1 ? '（你的立場合這裡人群最在意的題）' : est.fit < 1 ? '（你的立場跟這裡人群相反）' : '') + '・已立 ' + boards + '/' + G.MAX_BILLBOARDS, full)); }
    if (state.day >= G.GOTV_FROM && (onSite(id) || id === 'tv')) rows.push(toggle('gotv', gotvOn, '選前催票', '+' + wan(G.COSTS.gotv) + '・' + (id === 'tv' ? '三群' : '這裡的' + groupTitle(G.venueView(state).find(v => v.id === p.venue)?.main ?? 0)) + '裡傾向你的人確定出門投票，小馬挖不走'));
    const team = [];
    if (id !== 'press') team.push(toggle('booth', booth, '小額募款攤', '1 位助手去擺攤，+' + wan(G.TUNING.booth[0]) + '–' + wan(G.TUNING.booth[1]) + '，少 1 人跟你拉票', free < 1));
    if (tip?.available && tip.canInvestigate && id !== 'press') team.push(toggle('investigate', investigateOn, '查小馬經費', '+' + wan(tip.investigationCost) + '・第 ' + (tip.investigations + 1) + '/2 次，不占你的回合'));
    const crewNote = onSite(id) && p.crew !== null && p.crew !== undefined ? '<p class="research-note crew-note">陪你出門 ' + p.crew + ' 人：' + (p.crew < 2 ? '人手不夠，你自己拉票的效果打折' : p.crew === 2 ? '基本陣容' : '人多聲勢大，你自己拉票更有效') + '（×' + p.crewFactor.toFixed(2) + '）。留人做研究或擺攤，陪你的人就少；今天查的題下回合起才用得到。</p>' : '';
    return (id === 'prepare' || behind(id) ? researchRow() : id !== 'press' ? askRow() + (onSite(id) ? researchRow() : '') + crewNote : '') + (rows.length ? '<div class="addon-picks" role="group" aria-label="加碼"><span class="pick-label">加碼</span>' + rows.join('') + '</div>' : '') + (team.length ? '<div class="addon-picks team-picks" role="group" aria-label="後勤"><span class="pick-label">後勤</span>' + team.join('') + '</div>' : '');
  }
  // TV draws one of three issues; a bought brief picks the issue, a public reply to 小馬 makes it his attack.
  function tvCards(p) {
    const pool = p.pool || G.tvPool(state), due = G.pendingChallenges(state)[0];
    return '<div class="tv-cards" role="group" aria-label="買專訪指定題目"><span class="pick-label">買專訪</span>' + pool.map(t => '<button class="tv-card ' + (state.player.known.includes(t) ? 'ready' : 'risky') + '" data-action="brief" data-topic="' + t + '" aria-pressed="' + (brief === t) + '"' + (respondOn ? ' disabled aria-disabled="true"' : '') + '><b>' + esc(G.TOPICS[t].title) + '</b><em>' + (brief === t ? '已指定・+' + wan(G.COSTS.brief) : '指定這題 +' + wan(G.COSTS.brief)) + '</em></button>').join('') + '</div>' + (due ? '<div class="addon-picks" role="group" aria-label="回應小馬">' + toggle('respond', respondOn, '主動回應小馬', '免費・節目改談「' + short(due.topic) + '」') + '</div>' : '');
  }
  function topicPicks(current) {
    const lv = G.landscapeView(state), heat = id => lv.ranking.find(r => r.topic === id)?.share || 0, max = Math.max(1, ...lv.ranking.map(r => r.share)), pool = G.availableTopics(state).filter(t => t.id !== 'tip').sort((a, b) => heat(b.id) - heat(a.id));
    const status = id => state.player.insight?.[id]?.level === 'precise' ? '深入查過' : state.player.insight?.[id] ? '研究過' : '還沒查';
    return '<p class="dock-why">選一題自己查：之後被問到這題，回答效果約 ×' + G.TUNING.studied + '，也看得到三群各占幾成。越熱門的題越常被問。</p><div class="topic-picks" role="group" aria-label="查哪個議題"><span class="pick-label">查哪題</span>' + pool.map(t => '<button class="topic-pick" data-action="topic" data-topic="' + t.id + '" aria-pressed="' + (current === t.id) + '"><b>' + esc(t.short || t.title) + '</b><i class="heat" style="width:' + Math.round(heat(t.id) / max * 100) + '%"></i><small>' + esc(status(t.id)) + '</small></button>').join('') + '</div>';
  }
  function dockPlan() {
    const p = selectedAction ? G.preview(state, selectedAction, planConfig()) : null;
    if (!p) return dockAlerts() + '<p class="dock-hint"><b>點地圖上的地點出發。</b>每個地點的主要人潮不同，會從他們在意的三題挑一題問你。</p>';
    const id = selectedAction, venue = onSite(id) ? G.venueView(state).find(v => v.id === p.venue) : null, place = placeName(id, p.venue);
    let body = '';
    if (onSite(id)) {
      const stances = G.topicsOf(state).filter(t => stanceOf(t)).length;
      body = modeButtons([['canvass', '街頭拜訪', '免費・回答一題'], ['rally', '辦造勢活動', wan(G.COSTS.rally) + (stances < 2 ? '・先表態 2 題才能辦' : '・講你全部的立場'), stances < 2]]) + crowdLine(p.crowd, '現場 10 人', !crowdKnown(p.venue)) + '<p class="dock-info">' + (id === 'canvass' ? (venue.challenged ? '這裡的人都在問小馬對你的批評。' : esc(venue.mainTitle) + '多，會從下面三題挑一題問你。') : '你公開過 ' + stances + ' 個立場；合這裡人群的加分，不合的扣分。') + '</p>' + chiefLine(p.chief) + addonButtons(p);
    } else if (['tv', 'press'].includes(id)) {
      const tip = G.eventView(state).tip, tipReady = tip?.available;
      body = modeButtons([['tv', '上節目', (state.player.tvCredit ? '免費（老K 的節目）' : wan(G.COSTS.tv)) + '・長輩、中年多'], ['press', '開記者會爆料', tipReady ? '免費・公開小馬經費資料' : '第 3 回合起', !tipReady]]) + (id === 'tv' ? crowdLine(p.crowd, '電視觀眾 10 人') + '<p class="dock-info">' + (p.respond ? '你主動回應小馬，節目談「' + esc(G.TOPICS[p.topic].title) + '」。' : p.brief ? '你買了專訪時段，節目談「' + esc(G.TOPICS[p.brief].title) + '」，開錄前先打聽好。' : '主持人從下面三題抽一題；抽到沒研究的題會卡詞。') + '</p>' + addonButtons(p) + tvCards(p) : '<p class="dock-info">手上的資料：' + esc(tip.evidenceText) + ' 還沒查證就指控，可能當場被記者識破。</p>');
    } else if (id === 'dig') { const dp = G.preview(state, 'dig', {}); body = prepModes(dp) + '<p class="dock-info">花 ' + wan(G.COSTS.dig) + ' 派人挖小馬的黑料。結果三選一，出發前看不到：</p><ul class="dig-odds"><li class="good"><b>四成</b>挖到：小馬掉票</li><li><b>三成多</b>空手：錢花掉</li><li class="bad"><b>兩成多</b>被反咬：你掉票</li></ul><p class="dock-info quiet-note">這回合你不拉票，小馬照樣拉票。</p>'; }
    else if (id === 'prepare') body = prepModes() + topicPicks(p.topic) + '<p class="dock-info">親自查清楚「' + esc(G.TOPICS[p.topic]?.title || '') + '」：看到三群的比例，之後談這題說服力更強；也順便看清另一個熱門議題。</p><p class="dock-info quiet-note">這回合你不拉票，小馬照樣拉票；沒派去查資料的助手去拉票。</p>' + addonButtons(p);
    else if (id === 'fundraise') body = donorCards() + '<p class="dock-info">可能募得 ' + wan(p.expectedIncome.min) + '–' + wan(p.expectedIncome.max) + (p.expectedIncome.miss ? '；約 ' + Math.round(p.expectedIncome.miss * 10) + ' 成機會談不成' : '') + '。</p>' + (p.expectedIncome.ties ? '<p class="dock-info quiet-note">地方關係：你拜訪里長 ' + (p.expectedIncome.visits || 0) + ' 次，募款 ×' + p.expectedIncome.ties.toFixed(2) + '。跟里長越熟，開口越容易。</p>' : '') + '<p class="dock-info quiet-note">' + (p.deal ? '拜訪頭人：他的組織票和你公開的立場會影響票數；這回合你不拉票，小馬照樣拉票。' : '小額募款不影響票數，但這回合你不拉票，小馬照樣拉票。') + '</p>' + addonButtons(p);
    else if (id === 'online') body = crowdLine(p.crowd, '網友 10 人') + '<p class="dock-info">' + num(p.teamAssignments.filter(m => m.task === 'stream').length) + ' 位助手開直播。網友會從青年最在意的三題挑一題留言問你；觸及約 ' + num(p.expectedReach.min) + '–' + num(p.expectedReach.max) + ' 人，可能爆紅，也可能沒人看。</p>' + addonButtons(p);
    else if (id === 'recruit') body = '<p class="dock-info">' + esc(p.title) + '，預付 ' + wan(p.baseCost) + '。新助手下回合起跟你拉票。</p><p class="dock-info quiet-note">你這回合不拉票，小馬照樣拉票。舊助手可以去查資料；沒派工的助手會用你最近講過的立場自己去拉票。</p>' + addonButtons(p);
    else if (id === 'debate') body = crowdLine(p.crowd, '台下觀眾 10 人') + '<p class="dock-info">題目「' + esc(G.TOPICS[p.topic].title) + '」，小馬也上台。' + (state.player.insight?.[p.topic]?.level === 'precise' ? '你深入查過，台上能壓制他。' : '深入查過這題的話，台上能額外壓制他。') + '</p>' + addonButtons(p);
    return dockAlerts() + '<div class="dock-plan"><div class="dock-title">' + icon(id) + '<h2>' + esc(place) + '<small>' + esc(action(id).title) + '・' + (p.totalCost ? wan(p.totalCost) : '免費') + '</small></h2><button class="primary-button" data-action="confirm-action"' + (!p.allowed ? ' disabled aria-disabled="true"' : '') + '>出發 →</button></div>' + costLine(id, p) + body + (!p.allowed ? '<p class="commit-reason blocked" role="status">' + esc(p.reason) + '</p>' : '') + '</div>';
  }

  /* ---------- scene: venue interior, crowd and speech ---------- */
  // Ten people for the scene, by the crowd mix; the order is fixed per game and place so a revisit looks the same.
  function crowdOf(mix, key) {
    const counts = crowdCount(mix), list = [];
    counts.forEach((n, g) => { for (let j = 0; j < n; j++) list.push({ group: g, variant: j % 2, k: G.rand(state.seed, 'crowd-slot', key, g, j) }); });
    return list.sort((a, b) => a.k - b.k).map(({ k, ...c }) => c);
  }
  // After an answer each person shows a face: the share of a group that warmed to you smiles, the rest do not.
  function withReactions(list, groups) {
    const seen = [0, 0, 0], size = [0, 0, 0]; for (const c of list) size[c.group]++;
    return list.map(c => {
      const g = groups?.[c.group], j = seen[c.group]++;
      if (!g || !g.reached) return { ...c, tone: 'flat' };
      const warm = Math.round(g.up / g.reached * size[c.group]), avg = g.votes / g.reached;
      return { ...c, tone: j < warm ? (avg > 6 ? 'up' : 'flat') : (g.votes < 0 || g.down > g.up ? 'down' : 'flat') };
    });
  }
  function sceneView() {
    if(Art?.isToy?.() && state.phase === 'recap' && state.recap?.player?.action === 'fundraise') return {kind:'fundraise',crowd:[],speaker:null,bubble:{who:'街坊募款',text:state.recap.player.result || '這次募款已記入競選預算。',stage:'reaction'}};
    if (state.phase === 'question' && isPublic(state.pending?.id)) {
      const p = state.pending, q = G.question(state), kind = p.id === 'canvass' ? venueId(p.venue) : p.id;
      return { kind, crowd: crowdOf(q?.crowd, kind), speaker: p.id === 'canvass' ? { group: q?.speakerGroup ?? 0, variant: 1 } : null, bubble: { who: q?.speaker || '', text: q?.text || '', stage: 'question' } };
    }
    if (state.phase === 'recap' && ['canvass', 'tv', 'online', 'debate', 'rally'].includes(state.recap?.player?.action)) {
      const r = state.recap.player, kind = onSite(r.action) ? venueId(r.venue) : r.action, c = r.conversation;
      const line = c ? c.reaction.replace(/^[^「]*「/, '').replace(/」$/, '') : r.action === 'debate' ? '小馬：「' + (state.recap.rival.quote || state.recap.rival.result) + '」' : r.action === 'online' ? '本次觸及 ' + num(r.effects?.contacts) + ' 人。' : r.action === 'rally' ? '現場 ' + r.effects.contacts + ' 人聽完你的政見。' : '主持人：「謝謝小沈。」';
      return { kind, mode: r.action === 'rally' ? 'rally' : null, crowd: withReactions(crowdOf(r.crowd, kind), r.effects?.groups), speaker: c ? { group: c.group ?? 0, variant: 1, tone: c.mood } : null, bubble: { who: c ? c.name + '・' + c.groupTitle : r.action === 'debate' ? '小馬・對手' : r.action === 'rally' ? '造勢活動' : r.action === 'online' ? '直播結束' : '主持人・小安', text: line, stage: 'reaction' } };
    }
    return null;
  }
  function renderWorld() {
    const view = sceneView(), venue = $('venue-scene'), bubble = $('conversation-bubble');
    venue.hidden = !view; $('world').classList.toggle('in-venue', !!view);
    if (view) {
      const key = view.kind + ':' + state.day + ':' + state.phase;
      if (venue.dataset.key !== key) { venue.innerHTML = Art?.interior ? Art.interior(view.kind, { crowd: view.crowd, speaker: view.speaker, board: (state.player.billboards || []).some(b => b.venue === view.kind) ? { party: myParty() } : null, mode: view.mode, topic: state.pending?.topic && G.TOPICS[state.pending.topic] ? G.TOPICS[state.pending.topic].title : null }) : ''; venue.dataset.key = key; venue.dataset.kind = view.kind; }
      bubble.hidden = false; bubble.dataset.stage = view.bubble.stage; bubble.dataset.kind = view.kind;
      bubble.innerHTML = '<span class="bubble-speaker">' + esc(view.bubble.who) + '</span><p>' + esc(view.bubble.text) + '</p>';
    } else { bubble.hidden = true; venue.innerHTML = ''; venue.dataset.key = ''; }
    const destinations = view ? '' : hotspots();
    $('map-hotspots').innerHTML = destinations;
    $('mobile-destinations').innerHTML = destinations;
    $('map-boards').innerHTML = view || !state.started ? '' : boardsOnMap();
    $('world').classList.toggle('is-rainy', state.started && !view && G.forecast(state).now?.id === 'rain');
    document.body.dataset.act = state.started ? String(G.actOf(state.day).id) : '';
    placeRival();
  }
  // While planning, 小馬 stands where the rumour says he is going.
  function placeRival() {
    const r = state.started && state.phase === 'plan' ? G.rumorView(state) : null, spot = r ? HOTSPOTS[r.action === 'canvass' ? r.venue : r.action] : null;
    actorPosition($('rival'), spot ? { x: spot.x + 46, y: spot.y + 30 } : { x: 1030, y: 470 }); $('rival').classList.toggle('rumoured', !!spot);
  }
  function boardsOnMap() {
    return (state.player.billboards || []).map((b, i) => { const p = HOTSPOTS[b.venue] || anchors.start, x = p.x + 78 + (i % 2) * 34, y = p.y + 34; return '<span class="map-board" style="left:' + (x / 12).toFixed(2) + '%;top:' + (y / 6.5).toFixed(2) + '%;z-index:' + Math.round(y) + '" title="' + esc(venues[b.venue]?.title + '的看板') + '">' + (Art?.billboard ? Art.billboard(myParty()) : '') + '</span>'; }).join('');
  }

  /* ---------- question ---------- */
  const TAG_TEXT = { counter: '點名小馬：認同你的人少投他，認同他的人覺得你在吵', previous: '你之前也這樣說' };
  function tagLine(t) { return '<small class="tag ' + esc(t.kind) + '">' + esc(TAG_TEXT[t.kind] || t.text) + '</small>'; }
  function dockQuestion() {
    const q = G.question(state);
    if (!q) return '<p class="dock-hint">對話尚未載入，請重新整理。</p>';
    const who = q.speakerGroup !== undefined ? '<span class="face-chip g-' + GROUP_KEYS[q.speakerGroup] + '"><b>' + esc(groupTitle(q.speakerGroup)) + '</b></span>' : '', ready = state.player.known.includes(state.pending.topic), followup = (state.pending.drawn ? '<p class="dock-alerts"><span class="' + (ready ? 'drawn-ok' : '') + '">問到「' + esc(G.TOPICS[state.pending.topic]?.title || '') + '」' + (ready ? '：你研究過' : '：沒研究過，哪個做法都能說，但不知道大家會怎麼反應') + '</span></p>' : '') + (state.pending.followup ? '<p class="dock-alerts"><span>這一題就是回應小馬</span></p>' : '');
    return '<div class="dock-question">' + followup + '<div class="speaker-row"><p class="dock-speaker"><b>' + esc(q.speaker) + '</b>' + who + '</p>' + (state.pending.topic !== 'tip' ? standingRow() : '') + '</div><div class="answer-list" role="group" aria-label="選一句回應">' + q.options.map((o, i) => '<button class="answer-option' + (o.id === 'counter' ? ' counter' : '') + '" data-answer="' + esc(o.id) + '"' + (!o.unlocked ? ' disabled aria-disabled="true"' : '') + '><span class="answer-copy"><span class="answer-line"><span class="answer-number" aria-hidden="true">' + (i + 1) + '</span>' + esc(o.text) + '</span>' + (!o.unlocked ? '<small class="tag locked">' + esc(o.whyLocked) + '</small>' : o.estimate ? estimateRow(o.faces, o.estimate) : o.faces.some(f => f !== 'unknown') ? faceRow(o.faces) : '<small class="tag">' + esc(o.detail || '') + '</small>') + (o.tags || []).filter(t => t.kind !== 'promise').map(tagLine).join('') + '</span></button>').join('') + '</div></div>';
  }
  function questionPanel() {
    const q = G.question(state), p = state.pending, topic = G.TOPICS[p.topic], ins = state.player.insight?.[p.topic], rivalStance = G.lastPlan(state.rival, p.topic);
    if (!q) return panel('現場', '進度已保留', '<p>請重新整理，恢復目前行程。</p>');
    if (p.topic === 'tip') return panel('第 ' + state.day + ' 回合 · 記者會', '選一句', '<section class="issue-card">' + eventsMarkup() + '</section>' + raceBoard(true));
    const plans = topic.plans || [];
    const insight = !ins ? '<p>還沒查：不知道三群各要什麼。</p>' : '<table class="insight-table"><thead><tr><th></th>' + plans.map(x => '<th>' + esc(x.text) + '</th>').join('') + '</tr></thead><tbody>' + ins.groups.map((x, g) => '<tr><th><span class="dot g-' + GROUP_KEYS[g] + '"></span>' + esc(groupTitle(g)) + '</th>' + plans.map((_, k) => '<td>' + (Number.isFinite(x.share) ? (k === 0 ? x.share : 100 - x.share) + '%' : x.side === k ? (x.close ? '約 6–7 成' : '<b>約 8 成</b>') : (x.close ? '約 3–4 成' : '約 2 成')) + '</td>').join('') + '</tr>').join('') + '</tbody></table><div class="voices">' + ins.groups.map((x, g) => '<p class="voice g-' + GROUP_KEYS[g] + '"><b>' + esc(groupTitle(g)) + '</b>「' + esc(G.VOICES?.[p.topic]?.[GROUP_KEYS[g]]?.[x.side] || '') + '」</p>').join('') + '</div>';
    const line = q.issueCard?.partyLine, rivalLine = q.issueCard?.rivalLine;
    const body = '<section class="issue-card"><div class="issue-card-title"><b>' + esc(topic.title) + '</b></div>' + (q.crowd ? crowdLine(q.crowd, p.id === 'canvass' ? '現場 10 人' : '聽眾 10 人') : '') + '<div class="issue-row"><b>三群要什麼</b>' + insight + '</div>' + (line ? '<p class="issue-commitment"><b>黨的立場</b>' + esc(plans.find(x => x.id === line)?.text) + '</p>' : '') + '<p class="issue-commitment"><b>你說過</b>' + esc(q.issueCard?.commitment?.quote || '還沒表態。') + '</p>' + (rivalStance ? '<p class="issue-commitment"><b>小馬說過</b>「' + esc(rivalStance.quote) + '」' + (rivalLine ? '（他黨的立場）' : '') + '</p>' : '') + '<div class="issue-tradeoffs">' + plans.map(x => '<div><b>' + esc(x.text) + '</b><span>' + esc(x.detail) + '</span></div>').join('') + '</div></section>';
    const note = q.options.some(o => o.estimate) ? '<p class="estimate-note">深入研究過的題目才看得到大概的票數範圍；實際結果會有出入。</p>' : '';
    return panel('第 ' + state.day + '／' + G.DAYS + ' 回合 · 現場', '選一句回應', body + note + raceBoard());
  }

  /* ---------- recap ---------- */
  function groupDeltas(byGroup) { return byGroup ? '<span class="delta-row">' + byGroup.map((v, g) => '<span class="delta-chip g-' + GROUP_KEYS[g] + ' ' + (v >= 0 ? 'up' : 'down') + '"><b>' + esc(groupTitle(g)) + '</b>' + signedVotes(v) + '</span>').join('') + '</span>' : ''; }
  // One line per cause: what you did, who reacted, and the estimated votes; then the rival, offers and events.
  function causeLines(r) {
    const p = r.player, rv = r.rival, att = Object.fromEntries((r.attribution || []).map(a => [a.source, a])), rows = [];
    const where = p.action === 'tv' ? '上節目' : p.action === 'online' ? '開直播' : p.action === 'debate' ? '在政見發表會' : p.action === 'press' ? '開記者會' : '在' + p.venueTitle;
    for (const e of r.planEffects || []) rows.push([e.kind === 'clarify' ? '澄清' : e.kind === 'crisis' ? '危機' : '宣示', (e.kind === 'crisis' ? ({ pay: '花錢公關消毒', apologize: '公開道歉切割', fight: e.won ? '硬槓反控成功' : '硬槓反控炎上' })[e.choice] + '：' : e.title + '：') + e.text + ' → ' + signedVotes(e.votes) + ' 票', e.votes < 0 ? 'warn' : '', e.byGroup]);
    // The first row is the answer itself; stumbles, party lines, walk-backs and the like follow as their own rows, so the rows add up.
    const direct = p.direct || { votes: att.player?.votes, byGroup: p.byGroup };
    if (asking(p.action) && p.topic) rows.push(['你', where + (p.drawn ? '，被問到「' : '談「') + short(p.topic) + '」' + (p.quote ? '，說「' + p.quote + '」' : '') + ' → ' + signedVotes(direct.votes) + ' 票', '', direct.byGroup]);
    else if (p.action === 'rally') rows.push(['你', '在' + p.venueTitle + '辦造勢 → ' + signedVotes(direct.votes) + ' 票', '', direct.byGroup]);
    else if (p.dealt) rows.push(['頭人', '拜訪' + p.dealt.name + '：' + [p.dealt.money ? '捐款 ' + wan(p.dealt.money) : '', p.dealt.bloc ? '組織票約 ' + num(p.dealt.bloc) : '', p.dealt.perk === 'tv' ? '一次免費上節目' : ''].filter(Boolean).join('、') + '；你公開支持「' + (G.TOPICS[p.dealt.topic]?.plans.find(x => x.id === p.dealt.plan)?.text || '') + '」→ ' + signedVotes(p.dealt.votes) + ' 票', '']);
    else if (QUIET_WORD[p.action]) rows.push(['你', (p.title || '') + '：' + (p.action === 'prepare' && G.TOPICS[p.topic] ? '查清楚「' + G.TOPICS[p.topic].title + '」。' : p.result) + ' ' + quietLine(p.action, att.rival?.effectOnYou, !!rv.attack), '']);
    else rows.push(['你', (p.title || '') + '：' + p.result, '']);
    if (p.action === 'online' && p.effects) rows.push(['直播', '觸及 ' + num(p.effects.contacts) + ' 人' + (p.viral >= 1.8 ? '，這次爆紅' : p.viral <= .5 ? '，這次沒什麼人看' : ''), '']);
    if (p.chief) rows.push(['里長', p.chief.broke ? p.chief.name + '點頭了：帶來約 ' + num(p.chief.bloc) + ' 票組織票，之後這裡的人更願意聽你' : p.chief.broken ? p.chief.name + '挺你，這裡的人更願意聽' : p.chief.name + '還不熟你（' + p.chief.visits + '／' + p.chief.need + ' 次），這裡的人先保留', p.chief.broke ? '' : p.chief.broken ? '' : 'warn']);
    if (p.partyLine) rows.push(['黨', (p.partyLine.kept ? '照黨的立場說，同黨選民加分 ' : '違反黨的立場，同黨選民流失 ') + signedVotes(p.partyLine.votes) + ' 票', p.partyLine.kept ? '' : 'warn']);
    if (p.stumble) rows.push([p.stumble.caught ? '識破' : '卡詞', (p.stumble.caught ? '沒查證就指控，當場被記者識破' : p.stumble.promise ? '沒研究就開支票，被主持人追問細節答不出來' : '被問到沒研究的題，說不出具體做法') + ' → ' + signedVotes(p.stumble.votes) + ' 票', 'warn']);
    if (p.debateEdge) rows.push(['壓制', '你深入查過這題，台上壓制小馬 → 他 ' + signedVotes(p.debateEdge) + ' 票', '']);
    if (p.gotv) rows.push(['催票', p.gotv.people + ' 位傾向你的人確定出門投票 → ' + signedVotes(p.gotv.votes) + ' 票', '']);
    if (p.bonusTopic) rows.push(['順便', '也看清了「' + G.TOPICS[p.bonusTopic].title + '」三群怎麼想', '']);
    if (p.walkBack) rows.push(['更正', '收回「' + p.walkBack.quote + '」：當初相信的 ' + p.walkBack.people + ' 人失望 → ' + signedVotes(p.walkBack.votes) + ' 票', 'warn']);
    if (p.flip) rows.push(['改口', '聽過「' + p.flip.from + '」的 ' + p.flip.people + ' 人不滿 → ' + signedVotes(p.flip.votes) + ' 票', 'warn']);
    if (p.breach) rows.push(['毀約', p.breach.org + '撤回支持（組織票 −' + num(p.breach.bloc) + '）→ ' + signedVotes(p.breach.votes) + ' 票', 'warn']);
    if (p.counter) rows.push(['反擊', '點名小馬：他 ' + signedVotes(p.counter.rival) + ' 票；覺得你在吵的人讓你 ' + signedVotes(p.counter.you) + ' 票', '']);
    if (p.action === 'press' && p.rivalHit) rows.push(['爆料', '小馬 ' + signedVotes(p.rivalHit) + ' 票', '']);
    if (Math.abs(att.team?.votes || 0) >= 1) rows.push(['團隊', '助手拉票 → ' + signedVotes(att.team.votes) + ' 票', '']);
    if (Math.abs(att.billboard?.votes || 0) >= 1) rows.push(['看板', '看板讓人記得你 → ' + signedVotes(att.billboard.votes) + ' 票', '']);
    if (p.rivalLoss && p.rivalLoss <= -1) rows.push(['搶票', '你說服的人裡有些原本偏向小馬 → 小馬 ' + signedVotes(p.rivalLoss) + ' 票', '']);
    for (const o of r.offers || []) rows.push(['合作', o.status === 'accepted' && o.effect ? '接受' + o.org + '：組織票 +' + num(o.bloc) + '、捐款 ' + wan(o.money) + '；公開後 ' + signedVotes(o.effect.contact) + ' 票' : o.taker === 1 ? '小馬接下' + o.org + '：他多了約 ' + num(o.bloc) + ' 張組織票' : '你婉拒了' + o.org, o.taker === 1 ? 'warn' : '', o.effect ? o.effect.groups.map(g => g.votes) : null]);
    for (const e of (r.events || []).filter(e => e.rebuttal)) rows.push(['回應', e.title + ' → ' + signedVotes(e.effects?.votes) + ' 票', '', e.effects?.byGroup]);
    const rivalLine = (rv.title || '') + (asking(rv.action) && rv.topic ? '，談「' + short(rv.topic) + '」' : '') + ' → 他 ' + signedVotes(att.rival?.votes || 0) + ' 票' + (Math.abs(att.rival?.effectOnYou || 0) >= 1 ? '；你 ' + signedVotes(att.rival.effectOnYou) + ' 票' + (rv.attack ? '' : '（他拉走的人）') : '') + (rv.preempted ? '（你先講了同一題，他效果減半）' : '') + (rv.emptyChair ? '（你沒出席，他獨占舞台）' : '');
    rows.push(['小馬', rivalLine, rv.attack ? 'warn' : 'is-rival', rv.attack?.byGroup]);
    if (r.weather?.id === 'rain') rows.push(['天氣', '下雨，街上人少', '']);
    for (const e of (r.events || []).filter(e => !e.rebuttal)) rows.push(['事件', e.title + (Number.isFinite(e.effects?.votes) ? ' → ' + signedVotes(e.effects.votes) + ' 票' : ''), e.challengeId ? 'warn' : '']);
    if (rv.challenge) rows.push(['要回應', '下回合結束前去拉票或上電視，就會被問到這件事。', 'warn']);
    return '<section class="cause-lines" aria-label="這回合的因果"><h2>這回合的因果</h2>' + rows.map(([k, t, cls, groups]) => '<p class="cause-line ' + (cls || '') + '"><b>' + k + '</b><span>' + esc(t) + (groups ? groupDeltas(groups) : '') + '</span></p>').join('') + '</section>';
  }
  function reportCard(r, who) {
    return '<div class="recap-card"><div class="recap-person">' + esc(who) + '</div><h3>' + esc(r.title) + '</h3><p>' + esc(r.result) + '</p>' + (r.reason ? '<p class="cause">' + esc(r.reason) + '</p>' : '') + (r.teamReports || []).map(t => '<div class="team-report"><h4>' + esc(t.title || t.name) + '</h4><p>' + esc(t.result) + '</p></div>').join('') + '<div class="recap-cost"><span>支出 ' + money(r.cost) + '</span>' + (r.income ? '<span>募得 ' + money(r.income) + '</span>' : '') + '</div></div>';
  }
  function recapPanel() {
    const r = state.recap;
    const learned = r.player.action === 'prepare' && r.player.topic !== 'tip' ? '<section class="preparation-takeaway"><b>查清楚：' + esc(G.TOPICS[r.player.topic].title) + '</b><p>' + esc(G.insightLine(state, r.player.topic)) + '</p></section>' : '';
    const full = '<details class="recap-details"><summary>完整紀錄</summary>' + reportCard(r.player, '小沈・你') + reportCard(r.rival, '小馬・對手') + '</details>';
    return panel('第 ' + state.day + '／' + G.DAYS + ' 回合', '已完成', causeLines(r) + learned + raceBoard(false, r.raceBefore) + full);
  }
  function dockRecap() {
    const r = state.recap, p = r.player, att = Object.fromEntries((r.attribution || []).map(a => [a.source, a]));
    return '<div class="dock-recap"><p class="recap-total"><b>這回合你 ' + signedVotes(r.totalVotes) + ' 票</b>' + (p.byGroup ? groupDeltas(p.byGroup) : '') + '<span class="rival-total">小馬 ' + signedVotes((att.rival?.votes || 0) + (p.rivalLoss || 0) + (p.rivalHit || 0)) + '</span>' + (QUIET_WORD[p.action] && !p.dealt ? '<small class="recap-why">' + esc(quietLine(p.action, att.rival?.effectOnYou, !!r.rival.attack)) + '</small>' : '') + '</p><button class="primary-button" data-action="next">' + (state.day < G.DAYS ? '開始第 ' + (state.day + 1) + ' 回合 →' : '開票 →') + '</button></div>';
  }

  /* ---------- travel, result ---------- */
  function dockTravel() {
    const a = action(state.pending.id), stage = motion?.stage === 'perform';
    return '<div class="dock-travel">' + icon(a.id) + '<p>' + (stage ? '到了。' : '小沈正在前往' + esc(placeName(a.id, state.pending.venue)) + '。') + '</p><button class="primary-button" data-action="skip">略過 →</button></div>';
  }
  function travelPanel() { return panel('第 ' + state.day + ' 回合', '出發', '<p class="lead">' + esc(action(state.pending.id).description) + '</p>' + raceBoard(true)); }
  function keyFactors(r) {
    if (!r.keyFactors?.length) return '';
    return '<section class="key-factors" aria-label="影響最大的事"><h3>影響最大的三件事</h3><ol>' + r.keyFactors.map(f => '<li><b>' + esc(f.label) + '</b><span>' + signedVotes(f.votes) + ' 票</span></li>').join('') + '</ol></section>';
  }
  // The shareable report: who you were, the result, how the gap to 小馬 and the line moved, and what each round did.
  function trendChart() {
    const r = state.result, LN = r ? r.lastSeat : G.LINE, start = state.startRace || { you: 0, rival: 0 }, points = [start, ...state.journal.map(j => j.race ? { you: j.race.you, rival: j.race.rival } : null).filter(Boolean), ...(r ? [{ you: r.playerVotes, rival: r.rivalVotes, final: true }] : [])], max = Math.max(LN * 1.15, ...points.map(p => Math.max(p.you, p.rival))) || 1, W = 320, H = 120, x = i => 8 + i * (W - 16) / Math.max(1, points.length - 1), y = v => H - 10 - v / max * (H - 20);
    const line = key => points.map((p, i) => x(i).toFixed(1) + ',' + y(p[key]).toFixed(1)).join(' ');
    return '<svg class="trend" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="十回合估票：你和小馬"><line x1="8" x2="' + (W - 8) + '" y1="' + y(LN).toFixed(1) + '" y2="' + y(LN).toFixed(1) + '" class="trend-line"/><text x="10" y="' + (y(LN) - 5).toFixed(1) + '" text-anchor="start" class="trend-label">' + (r ? '今年當選線 ' : '上一屆當選線 ') + num(LN) + '</text><polyline points="' + line('you') + '" class="trend-you"/>' + points.map((p, i) => '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(p.you).toFixed(1) + '" r="' + (p.final ? 4.2 : 2.6) + '" class="trend-dot' + (p.final ? ' final' : '') + '"/>').join('') + '</svg><p class="trend-key"><span class="k-you">你</span><span>出發 → 第 10 回合估票 → 開票</span></p>' + (r && Math.abs(r.playerVotes - (points[points.length - 2]?.you || 0)) >= 100 ? '<p class="trend-note">最後一回合估 ' + num(points[points.length - 2].you) + ' 票，開票 ' + num(r.playerVotes) + ' 票：' + (r.playerVotes < points[points.length - 2].you && r.unkept?.length ? '差在被拆穿沒更正的保證（' + signedVotes(Math.round(r.unkept.reduce((n, u) => n + u.votes, 0))) + ' 票）和投票日的浮動。' : '差在投票日的浮動。') + '</p>' : '') + '';
  }
  // A round's total split by source, so a quiet round shows that 小馬, not the fundraising, cost the votes.
  function roundParts(x) {
    const list = [], add = (label, v) => { if (Math.abs(v || 0) >= 1) list.push(label + ' ' + signedVotes(v)); }, took = Math.round(-(x.byRival || 0));
    if (x.quiet) list.push(QUIET_WORD[x.action] + '不影響票數；沒拉票，' + (took >= 1 ? '小馬' + (x.attack ? '拉票又攻擊你 −' : '拉走 ') + num(took) + ' 票' : '小馬沒拉走你的票'));
    else if (x.dig) { list.push(x.dig === 'found' ? '挖到黑料' : x.dig === 'nothing' ? '挖黑料空手' : '挖黑料被反咬'); add('你', x.direct); add(x.attack ? '小馬攻擊' : '小馬', x.byRival); }
    else { add('你', x.direct); add(x.attack ? '小馬攻擊' : '小馬', x.byRival); }
    add('助手', x.team); add('看板', x.billboard); add('合作', x.offer); add(x.planTitle || '出發前', x.plan); add('回應小馬', x.rebuttal); add(x.eventsTitle || '事件', x.events);
    return list.join('・');
  }
  function reportMarkup() {
    const r = state.result, bg = G.BACKGROUNDS[state.settings.background], party = G.PARTIES[state.settings.affiliation], ok = r.outcome === 'elected';
    const verdict = ok ? '當選' : r.outcome === 'refunded' ? '落選・退保證金' : '落選';
    const key = [...(r.roundsSummary || [])].sort((a, b) => Math.abs(b.votes) - Math.abs(a.votes)).slice(0, 3).map(x => x.day);
    const rounds = (r.roundsSummary || []).map(x => '<li' + (key.includes(x.day) ? ' class="key-round"' : '') + '><b>' + x.day + '</b><span>' + esc(x.action === 'canvass' ? x.where + '・談' + short(x.topic) : x.action === 'tv' ? '電視・談' + short(x.topic) : x.action === 'online' ? '直播・談' + short(x.topic) : x.action === 'debate' ? '政見會・談' + short(x.topic) : x.action === 'rally' ? x.where + '・造勢' : x.action === 'press' ? '記者會爆料' : action(x.action)?.title || x.action) + '</span><strong class="' + (x.votes >= 0 ? 'up' : 'down') + '">' + signedVotes(x.votes) + '</strong><small>' + (key.includes(x.day) ? '<em class="key-tag">影響最大前三</em>' : '') + esc(roundParts(x)) + '</small></li>').join('') + (r.unkept || []).map(u => '<li class="unkept"><b>✕</b><span>開票・被小馬拆穿的保證</span><strong class="down">' + signedVotes(u.votes) + '</strong><small>「' + esc(u.text) + '」沒有更正，信的人改投別人</small></li>').join('');
    const pct = (v, t) => t ? '（' + Math.round(v / t * 100) + '%）' : '', groups = r.race.groups.map((g, k) => '<div class="g-' + GROUP_KEYS[k] + '"><span class="dot"></span><b>' + esc(g.title) + '</b><span>你 ' + num(g.you) + pct(g.you, r.groupTotals?.[k]) + '</span><span>小馬 ' + num(g.rival) + pct(g.rival, r.groupTotals?.[k]) + '</span></div>').join('');
    return '<article class="report-card"><header class="report-head"><div><span class="report-who">小沈｜' + esc(bg.title) + '・' + partyBadge(state.settings.affiliation) + esc(party.title) + '</span><h2 class="report-verdict ' + (ok ? 'win' : 'lose') + '">' + verdict + '</h2></div><span class="report-id">局號 ' + esc(state.seed.toString(36).toUpperCase()) + '</span></header><figure class="report-scene" aria-label="' + esc(verdict + '的開票夜') + '">' + (Art?.countNight ? Art.countNight(r.outcome, { still: true, name: state.player.name, tally: { you: r.playerVotes, rival: r.rivalVotes, line: r.lastSeat } }) : '') + '</figure><div class="report-grid"><section class="report-main"><div class="report-numbers"><div><span>你的得票</span><strong>' + num(r.playerVotes) + '</strong><small>第 ' + r.rank + ' 名（前 ' + r.seats + ' 名當選）</small></div><div><span>當選線</span><strong>' + num(r.lastSeat) + '</strong><small>今年第 ' + r.seats + ' 名的票數・' + (ok ? '你比第 ' + (r.seats + 1) + ' 名多 ' + num(r.gap) : '你還差 ' + num(r.gap)) + ' 票</small></div><div><span>小馬</span><strong>' + num(r.rivalVotes) + '</strong><small>' + (r.rivalElected ? '當選' : '落選') + '・' + esc(G.PARTIES[state.rival.party].title) + '</small></div></div>' + trendChart() + '<div class="report-groups">' + groups + '</div></section><section class="report-rounds"><h3>每回合做了什麼</h3><ol>' + rounds + '</ol></section></div></article>';
  }
  function dockResult() { return '<div class="dock-result"><p>投票結束，正在開票。</p><button class="primary-button" data-action="skip-count">略過演出 →</button></div>'; }
  function resultPanel() { return panel('開票', '計票中', '<p class="lead">票已經算好了，演出只是揭曉。</p>'); }
  function renderReport() {
    const show = state.phase === 'result' && counting?.status !== 'inprogress';
    $('report').hidden = !show;
    $('report-body').innerHTML = show ? reportMarkup() : '';
    if (!$('report-tools').innerHTML.includes('data-action="tally"')) $('report-tools').insertAdjacentHTML?.('afterbegin', '<button class="secondary-button" data-action="tally">看完整開票</button>');
  }
  // Counted share for one candidate: the count rises in uneven jumps fixed per game, so a reload replays the same night.
  function countedShare(c, who) {
    if (c >= 1) return 1; if (c <= 0) return 0;
    const steps = 16, k = Math.min(steps, Math.floor(c * steps + (who === 'rival' ? .5 : 0))); let done = 0, total = 0;
    for (let i = 0; i < steps; i++) { const w = .4 + G.rand(state.seed, 'count-step', who, i); total += w; if (i < k) done += w; }
    return done / total;
  }
  function renderCounting() {
    const active = state.phase === 'result' && counting?.status === 'inprogress', scene = $('count-scene');
    $('count-presentation').hidden = !active;
    if (!active) { if (scene.dataset.stage) { scene.innerHTML = ''; scene.dataset.stage = ''; } return; }
    const r = state.result, t = counting.elapsed, revealed = t >= COUNT.reveal, stage = revealed ? r.outcome : 'count';
    if (scene.dataset.stage !== stage) { scene.innerHTML = Art?.countNight ? Art.countNight(stage, { elapsed: t, name: state.player.name }) : ''; scene.dataset.stage = stage; }
    const c = Math.max(0, Math.min(1, (t - COUNT.wait) / (COUNT.reveal - COUNT.wait))), you = revealed ? r.playerVotes : Math.round(r.playerVotes * countedShare(c, 'you')), rival = revealed ? r.rivalVotes : Math.round(r.rivalVotes * countedShare(c, 'rival'));
    const top = Math.max(r.playerVotes, r.rivalVotes, r.lastSeat) * 1.12 || 1, width = v => Math.min(100, v / top * 100).toFixed(1) + '%';
    $('count-stage').textContent = t < COUNT.wait ? '投票結束，開票開始' : !revealed ? '開票中・已開 ' + Math.round(c * 100) + '%' + (you + rival ? '・你 ' + Math.round(you / (you + rival) * 100) + '% 對小馬 ' + Math.round(rival / (you + rival) * 100) + '%' : '') : '開票結果・第 ' + r.rank + ' 名';
    $('count-you-name').textContent = state.player.name;
    $('count-votes').textContent = num(you); $('count-rival').textContent = num(rival);
    $('count-meter').style.width = width(you); $('count-rival-meter').style.width = width(rival);
    $('count-line').style.left = 'calc(var(--name-col) + (100% - var(--name-col) - var(--num-col)) * ' + Math.min(1, r.lastSeat / top).toFixed(4) + ')';
    $('count-line-label').textContent = '當選線 ' + num(r.lastSeat);
    $('count-verdict').hidden = !revealed; $('count-verdict').textContent = revealed ? VERDICT[r.outcome] : ''; $('count-verdict').dataset.outcome = r.outcome;
  }
  function finishCounting() {
    if (state.phase !== 'result' || counting?.status !== 'inprogress') return;
    counting = { status: 'seen', elapsed: COUNT.end }; save(); render(); announce('開票完成，得票 ' + num(state.result.playerVotes) + ' 票，第 ' + state.result.rank + ' 名。');
  }
  function renderTeam() {
    const Team = window.DayTeamArt;
    if (!Team) return;
    const current = state.player.team?.members || [];
    let assignments = [...(state.pending?.teamAssignments || [])];
    for (const m of current) if (!assignments.some(a => a.id === m.id)) assignments.push({ ...m, task: 'idle' });
    const routeVenue = state.pending?.venue || state.recap?.player?.venue || 'market';
    const teamArt = Art ? { ...Art, anchors: { ...Art.anchors, canvass: destinationFor('canvass', routeVenue) }, route: id => routeFor(id, routeVenue) } : Art;
    if(Art?.isToy?.()){ $('team-actors').innerHTML = !state.started || ['question','recap','result'].includes(state.phase) ? '' : Art.toyTeam(assignments,state.phase==='plan'?3:teamElapsed,state.pending?.id||'recruit',routeVenue,reduced.matches); return; }
    $('team-actors').innerHTML = state.phase === 'plan' || !state.started ? '' : Team.render(assignments, state.phase === 'travel' ? teamElapsed : Team.duration, teamArt, { reducedMotion: reduced.matches });
  }
  // The one restart control moves rather than being duplicated: into an open dialog, onto the report, or back to the header.
  function placeRestart() {
    if (modal) return;
    const atResult = state.phase === 'result' && counting?.status !== 'inprogress', slot = atResult ? $('report-tools') : $('global-controls');
    if ($('new-game').parentNode !== slot) slot.appendChild($('new-game'));
    $('new-game').classList.toggle('primary-button', atResult);
  }
  function render() {
    if (selectedAction === 'prepare' && selectedTopic && !G.availableTopics(state).some(t => t.id === selectedTopic)) selectedTopic = null;
    dress(); header(); renderTeam(); renderWorld(); renderCounting(); renderReport(); renderEvents();
    document.body.dataset.art = Art?.getPack?.() || 'original';
    $('art-switch').textContent = Art?.isToy?.() ? '霧面玩具 ▾' : '原版方塊 ▾';
    $('art-switch').disabled = state.phase === 'travel' || counting?.status === 'inprogress';
    $('dock-body').innerHTML = !state.started ? dockIntro() : state.phase === 'plan' ? dockPlan() : state.phase === 'travel' ? dockTravel() : state.phase === 'question' ? dockQuestion() : state.phase === 'recap' ? dockRecap() : dockResult();
    $('dock').dataset.phase = state.started ? state.phase : 'intro';
    $('panel').innerHTML = !state.started ? intro() : state.phase === 'plan' ? planPanel() : state.phase === 'travel' ? travelPanel() : state.phase === 'question' ? questionPanel() : state.phase === 'recap' ? recapPanel() : resultPanel();
    placeRestart();
    $('world').dataset.phase = state.phase;
    $('interaction').dataset.phase = state.started ? state.phase : 'intro';
  }

  /* ---------- motion ---------- */
  function effect(id) {
    const shapes = {
      prepare: '<path d="M-24-24h23l5 5 5-5h23v31H9L4 12-1 7h-23z" fill="#fff9d9" stroke="#6e8360" stroke-width="2"/>',
      fundraise: '<path d="M13-6h34v27H13z" fill="#b49662"/><g class="donation-envelope"><path d="M21-20h24v15H21z" fill="#fff4cf" stroke="#b8a36d"/></g>',
      recruit: '<g class="join-mark"><circle cx="41" cy="-64" r="14" fill="#e7efdb" stroke="#7c9c73" stroke-width="2"/><path d="m35-64 5 5 8-10" stroke="#527d57" stroke-width="3" fill="none"/></g>'
    };
    return '<svg viewBox="-70 -110 140 150" xmlns="http://www.w3.org/2000/svg">' + (shapes[id] || '') + '</svg>';
  }
  function startMotion() {
    const id = state.pending.id, destination = destinationFor(id, state.pending.venue);
    let route = routeFor(id, state.pending.venue);
    route = [{ ...position }, ...route.slice(1)];
    if (!route.length || route.at(-1).x !== destination.x || route.at(-1).y !== destination.y) route.push({ ...destination });
    motion = { id, venue: state.pending.venue || 'market', destination: { ...destination }, stage: 'walk', route, index: 1, elapsed: 0 }; teamElapsed = 0;
    $('world').dataset.action = id;
    $('destination-marker').hidden = false; actorPosition($('destination-marker'), destination);
    $('route-line').innerHTML = '<svg viewBox="0 0 1200 650"><polyline points="' + (Art?.isToy?.() ? Art.visualRoute(id,state.pending.venue,Art.mapPoint(route[0])) : route).map(p => p.x + ',' + p.y).join(' ') + '"/></svg>';
    Art?.walkStep?.(0,true); $('player').classList.add('walking');
    render();
    if (reduced.matches) finishTravel();
  }
  function perform() {
    if (!motion) return;
    position = { ...motion.destination }; setPosition();
    motion.stage = 'perform'; motion.elapsed = 0; Art?.walkStep?.(0,false); $('player').innerHTML = Art ? Art.avatar('player') : '';
    $('player').classList.remove('walking'); $('world').classList.add('performing');
    $('route-line').innerHTML = ''; $('destination-marker').hidden = true;
    $('action-effect').innerHTML = effect(motion.id);
    actorPosition($('action-effect'),Art?.isToy?.()?Art.visualRoute(motion.id,motion.venue).at(-1):position,true);
    if (motion.id === 'recruit') { $('new-teammate').hidden = false; actorPosition($('new-teammate'), { x: position.x + 72, y: position.y + 11 }); }
    render();
  }
  function clearMotion() {
    motion = null; Art?.walkStep?.(0,false); $('player').innerHTML = Art ? Art.avatar('player') : ''; $('player').classList.remove('walking'); $('world').classList.remove('performing');
    $('destination-marker').hidden = true; $('route-line').innerHTML = ''; $('action-effect').innerHTML = ''; $('new-teammate').hidden = true;
  }
  function finishTravel() {
    if (modal || document.hidden || state.phase !== 'travel') return;
    position = { ...destinationFor(state.pending.id, state.pending.venue) }; setPosition(); clearMotion();
    if (G.arrive(state)) { save(); render(); focusDock(); revealDock(); announce(state.phase === 'question' ? '到了，選一句回應。' : '這回合完成了。'); }
  }
  function tick(dt) {
    if (counting?.status === 'inprogress' && state.phase === 'result') {
      if (modal || document.hidden) return;
      const prior = counting.elapsed; counting.elapsed = Math.min(COUNT.end, counting.elapsed + Math.max(0, Math.min(Number(dt) || 0, .1)));
      if (reduced.matches || counting.elapsed >= COUNT.end) { finishCounting(); return; }
      if (Math.floor(counting.elapsed) !== Math.floor(prior)) save();
      if (prior < COUNT.reveal && counting.elapsed >= COUNT.reveal) announce('開票結果：' + VERDICT[state.result.outcome] + '，' + num(state.result.playerVotes) + ' 票，第 ' + state.result.rank + ' 名。');
      renderCounting(); return;
    }
    if (!motion || modal || document.hidden || state.phase !== 'travel') return;
    dt = Math.max(0, Math.min(Number(dt) || 0, .1));
    teamElapsed += dt; renderTeam();
    if (reduced.matches) { finishTravel(); return; }
    if (motion.stage === 'perform') { motion.elapsed += dt; if (motion.elapsed >= (asking(motion.id) || motion.id === 'rally' ? .5 : 1.2)) finishTravel(); return; }
    let distance = dt * 260;
    while (distance > 0 && motion && motion.stage === 'walk') {
      const next = motion.route[motion.index];
      if (!next) { perform(); break; }
      const oldVisual = Art?.isToy?.() ? Art.travelPoint(motion.route,motion.index,position,motion.id,motion.venue) : position;
      const dx = next.x - position.x, dy = next.y - position.y, len = Math.hypot(dx, dy);
      if (len <= distance) { position = { ...next }; motion.index++; distance -= len; }
      else { position.x += dx / len * distance; position.y += dy / len * distance; distance = 0; }
      if(Art?.isToy?.()){const v=Art.travelPoint(motion.route,motion.index,position,motion.id,motion.venue), turned=Art.facing(v.x-oldVisual.x,v.y-oldVisual.y), stepped=Art.walkStep(dt,true);if(turned||stepped)$('player').innerHTML=Art.avatar('player');}
      setPosition();
    }
  }
  function frame(time) {
    const dt = lastFrame == null ? 0 : (time - lastFrame) / 1000; lastFrame = time; tick(dt);
    window.requestAnimationFrame(frame);
  }
  function begin(id) {
    if (modal || locked || !state.started || state.phase !== 'plan') return;
    const p = G.preview(state, id, planConfig());
    if (!p.allowed) { error = p.reason; render(); return; }
    locked = true;
    if (G.begin(state, id, planConfig())) { error = ''; resetToggles(); save(); startMotion(); focusDock(); announce('第 ' + state.day + ' 回合：' + p.title + '，花費 ' + money(p.totalCost) + '。'); }
    locked = false;
  }
  function answer(id) {
    if (modal || locked || state.phase !== 'question') return;
    const q = G.question(state), option = q?.options.find(o => o.id === id);
    if (!option?.unlocked) return;
    locked = true;
    if (G.answer(state, id)) { save(); render(); focusDock(); const c = state.recap?.player?.conversation; announce((c ? c.reaction + ' ' : '') + '這回合你 ' + signedVotes(state.recap.totalVotes) + ' 票。'); }
    locked = false;
  }

  /* ---------- dialogs ---------- */
  function budgetMarkup() {
    const b = state.budget, contracts = state.player.contracts || [], salary = Number(b.salarySpent || 0), activities = b.spent - salary;
    return '<div class="budget-row"><span>自備競選款</span><strong>' + money(b.personalContribution) + '</strong></div><div class="budget-row"><span>募款、黨部補助與捐款</span><strong>＋' + money(b.donations) + '</strong></div><div class="budget-row"><span>保證金</span><strong>−' + money(G.RULES.deposit) + '</strong></div><div class="budget-row"><span>助手薪水</span><strong>−' + money(salary) + '</strong></div><div class="budget-row"><span>行程、活動、看板、小禮物</span><strong>−' + money(activities) + '</strong></div>' + (b.refunded ? '<div class="budget-row"><span>保證金返還</span><strong>＋' + money(b.refunded) + '</strong></div>' : '') + '<div class="budget-row total"><span>可用餘額</span><strong>' + money(b.available) + '</strong></div>' + (contracts.length ? '<ul class="contract-history">' + contracts.map(c => '<li>' + (c.day === 0 ? '開始前' : '第 ' + c.day + ' 回合') + '：' + c.people + ' 人 × ' + c.days + ' 天，' + money(c.cost) + '</li>').join('') + '</ul>' : '');
  }
  function tallyMarkup() {
    const r = state.result;
    if (!r) return '<p>完成全部回合後才會開票。</p>';
    return '<p>' + r.candidates + ' 人搶 ' + r.seats + ' 席，投票率約 ' + r.turnout + '%，有效票 ' + num(r.valid) + '。</p><ol class="tally-list">' + r.tally.map(x => '<li class="' + (x.id === 0 ? 'tally-you' : x.id === 1 ? 'tally-rival' : '') + '"><span>' + x.rank + '</span><b>' + esc(x.name) + (x.id === 0 ? '・你' : x.id === 1 ? '・對手' : '') + '</b><strong>' + num(x.votes) + ' 票</strong><small>' + (x.elected ? '當選' : '') + '</small></li>').join('') + '</ol><p>落選但達 ' + num(r.refundThreshold) + ' 票可退保證金。你' + (r.refunded ? '拿回 ' + money(r.refunded) : '被沒收 ' + money(r.forfeited)) + '。</p>';
  }
  function pollMarkup(p) {
    if (!p) return '<p>開始後才有民調。</p>';
    const topicsList = G.topicsOf(state);
    return raceBoard() + '<h3>' + esc(p.label) + '</h3><div class="poll-bars">' + ['小沈・你', '小馬', '其他 25 位', '未決定'].map((name, i) => '<div class="poll-line"><span>' + name + '</span><div class="poll-track"><i style="width:' + Math.max(0, Math.min(100, p.percentages[i])) + '%"></i></div><strong>' + pct(p.percentages[i]) + '</strong></div>').join('') + '</div><h3>各群最在意的議題</h3><table class="race-groups"><thead><tr><th></th>' + topicsList.map(t => '<th>' + esc(short(t)) + '</th>').join('') + '</tr></thead><tbody>' + p.issuesByGroup.map((row, g) => '<tr><th><span class="dot g-' + GROUP_KEYS[g] + '"></span>' + esc(groupTitle(g)) + '</th>' + topicsList.map(t => '<td>' + pct(row[t]) + '</td>').join('') + '</tr>').join('') + '</tbody></table>';
  }
  function rulesMarkup() {
    return '<h3>怎麼贏</h3><p>' + esc(RULE_LINE) + '上一屆當選線 ' + num(G.LINE) + ' 票，今年的當選線開票才知道。小馬是你的主要對手，照常理他會選上；你要搶的是當選線附近那幾席。' + (state.settings.background === 'newcomer' ? '你是素人，一開始沒人認識你，小馬不會花力氣打你；等你追到當選線的八成，他才會開始攻擊。' : '他會攻擊你的保證和做法。') + '</p>'
      + '<h3>身分</h3><ul class="rules-list"><li>政二代（普通）：錢多、基本盤大，市場和廟口的里長一去就幫；但沒準備過議題，被問倒扣得更多，爆料也比較多。</li><li>現任議員（簡單）：有團隊，里長都認識你，開局熟悉 3 題但只知道大方向；但有上一屆的紀錄，小馬常拿來開刀，爆料也比較多。</li><li>全新素人（困難）：錢最少、里長不認識你，募款常談不成；但開局已查過 2 題，街訪效果較好，很少有黑料，小馬一開始也不打你。</li></ul>'
      + '<h3>三幕</h3><ul class="rules-list"><li>第 1–3 回合：摸清三群、找第一桶金。</li><li>第 4–7 回合：議題升溫；第 5 回合起每回合都可能爆出黑料，一局最多兩次。</li><li>第 8–10 回合：政見發表會，第 9–10 回合可以選前催票。</li></ul>'
      + '<h3>議題與三群人</h3><ul class="rules-list"><li>每回合沒接觸到的那群，挺你的人會冷掉一點：街訪和造勢看現場是哪群人，上電視主要接觸長輩和中年，直播主要接觸青年；募款、準備、招募的回合誰都沒接觸到。</li><li>表情只有三種：喜歡、沒感覺、不喜歡。喜歡到什麼程度，要深入研究後看票數範圍。</li><li>題庫有 16 題，每局抽 12 題；長輩最在意的健保、中年最在意的育兒、青年最在意的居住每局都有。</li><li>各群挺哪個做法有固定邏輯，只有強弱每局不同；每個做法至少有一群人支持。</li><li>白天街上以長輩和中年為主，青年大約一成；電視觀眾偏年長，青年要靠直播接觸。</li></ul>'
      + '<h3>研究與回答</h3><ul class="rules-list"><li>沒研究的題：哪個做法都可以說，但你不知道三群會怎麼反應。</li><li>研究過：看得到三群喜不喜歡。深入研究（兩人查同一題，或你親自準備）：再多一個大概的票數範圍，不會是精確數字。</li><li>答中在意這題的人想要的做法會加分，答反扣一樣多。</li><li>「先不答應」和「打包票」都一樣：前兩次沒事，第 3 次起每多說一次，三群的反應都更差。</li><li>助手研究的結果下回合起才用得到，當天到場還是不知道三群怎麼想；花錢買專訪題綱例外，節目開錄前就查好。</li><li>陪你出門的助手：2 人是基本陣容，3–4 人你自己拉票更有效，少於 2 人打折。留人研究或擺攤，陪你的人就少。</li><li>空頭保證：吃承諾的那群加分、討厭空話的那群扣分；被小馬拆穿又沒更正，開票前相信的人會轉走。</li><li>黨的立場：每黨三題。照著說同黨選民加分，違反流失約兩倍。</li></ul>'
      + '<h3>政黨</h3><ul class="rules-list"><li>國民黨、民進黨：開局黨部補助 ' + wan(G.PARTIES.kmt.subsidy) + '、募款 ×' + G.PARTIES.kmt.fundraise + '；第 ' + G.PARTY_AID.subsidyDay + ' 回合黨部再撥 ' + wan(G.PARTY_AID.subsidy) + '，第 ' + G.PARTY_AID.mobilizeDay + ' 回合起動員同黨選民（國民黨約 ' + num(G.PARTY_AID.mobilize.kmt) + ' 票、民進黨約 ' + num(G.PARTY_AID.mobilize.dpp) + ' 票，這區藍多綠少）。</li><li>這兩筆看你守不守黨的立場：全守拿全額，違反 1 題打五折，2 題以上沒有。改回黨的立場就算守住。</li><li>無黨籍沒有這些，但沒有黨的立場要顧，沒有政黨傾向的選民比較願意聽你說。</li></ul>'
      + '<h3>民調</h3><ul class="rules-list"><li>國民黨、民進黨候選人有 ' + G.POLL_DAYS.party.length + ' 份民調（第 ' + G.POLL_DAYS.party.join('、') + ' 回合），無黨籍只有 ' + G.POLL_DAYS.independent.length + ' 份（第 ' + G.POLL_DAYS.independent.join('、') + ' 回合）。</li><li>民調告訴你三群各有幾成挺你、還差多少票，以及這些票換成每群要多拉幾成。兩份民調之間，三群的數字停在上一份。</li></ul>'
      + '<h3>里長與頭人</h3><ul class="rules-list"><li>木柵市場、廟前廣場、社區廣場各有里長。里長還不熟你時，那裡的人先保留；里長點頭後帶來組織票，那裡的人也不會因為你常來而膩。</li><li>六位頭人：建商、宮廟、里長聯誼會、商圈協會、派系（有黨籍才有）、政論製作人。募款時可以去拜訪其中一位，或會在第 2–3、5–6 回合主動來談；他們給錢、組織票或免費上節目，換你公開支持他們要的做法。之後改口，他們會撤回支持。</li><li>拿建商的錢，比較容易爆出黑料。</li></ul>'
      + '<h3>直播</h3><ul class="rules-list"><li>用 1–2 位助手開直播，不花錢，主要接觸青年；網友從青年最在意的三題挑一題問你。觸及人數不穩定，可能爆紅，也可能沒人看。</li></ul>'
      + '<h3>小馬</h3><ul class="rules-list"><li>他攻擊你時，只有相關的兩個地點和電視會問這件事；可以去回應、花 ' + wan(G.COSTS.clarify) + ' 發澄清文宣，或不理他（逾期會再掉票）。</li><li>你可以點名反擊他，也可以加碼查他的經費（每次 ' + wan(G.COSTS.tipCheck) + '，不占回合）再開記者會；沒查證就指控，可能當場被識破。</li><li>第 8 回合政見發表會，不去的話他獨占舞台；深入查過題目，台上能壓制他。</li></ul>'
      + '<h3>花錢</h3><ul class="rules-list"><li>電視 ' + wan(G.COSTS.tv) + '、造勢 ' + wan(G.COSTS.rally) + '（至少表態 2 題）、小禮物 ' + wan(G.COSTS.gifts) + '（長輩最吃這套）、看板 ' + wan(G.COSTS.billboard) + '（最多 3 面；立場合當地人群效果加倍）。</li><li>第 9 回合起可以選前催票（' + wan(G.COSTS.gotv) + '）：傾向你的人確定出門投票。</li><li>助手可以擺小額募款攤；國民黨、民進黨候選人有黨部補助與較高的募款。</li></ul>';
  }
  function journalMarkup() { return state.journal.length ? state.journal.map(r => '<section class="journal-entry"><h3>第 ' + r.day + ' 回合</h3>' + causeLines(r) + '</section>').join('') : '<p>完成第一回合後，這裡會留下每回合的紀錄。</p>'; }
  function dossierMarkup(topic) { const t = G.TOPICS[topic]; return (state.player.insight?.[topic] ? '<p class="insight-line">' + esc(G.insightLine(state, topic)) + '</p>' : '') + (t.plans || []).map(p => '<div class="fact"><strong>' + esc(p.text) + '</strong><p>' + esc(p.detail) + '</p></div>').join(''); }
  function openDialog(type, extra) {
    if (type === 'dossier' && extra === 'tip') type = 'events';
    if (type === 'dossier' && (!G.TOPICS[extra] || !state.player.known.includes(extra))) return;
    const content = { budget: ['競選款', budgetMarkup], poll: ['選情與民調', () => pollMarkup(state.polls.at(-1))], rules: ['規則', rulesMarkup], tally: ['完整開票', tallyMarkup], events: ['小馬經費爆料', eventsMarkup], journal: ['每回合紀錄', journalMarkup], dossier: [G.TOPICS[extra]?.title || '', () => dossierMarkup(extra)] }[type];
    if (!content) return;
    if (!modal) lastFocus = document.activeElement;
    modal = { type, extra }; lastFrame = null;
    $('dialog-tools').appendChild($('new-game'));
    $('dialog-title').textContent = content[0]; $('dialog-body').innerHTML = content[1](); $('dialog-overlay').hidden = false;
    document.querySelector('main').inert = true; document.querySelector('.masthead').inert = true;
    $('world').classList.add('motion-paused'); $('dialog').focus({ preventScroll: true });
  }
  function closeDialog() {
    if (!modal) return;
    modal = null; $('dialog-overlay').hidden = true; placeRestart();
    document.querySelector('main').inert = false; document.querySelector('.masthead').inert = false;
    $('world').classList.remove('motion-paused'); lastFrame = null;
    const focus = lastFocus && document.contains(lastFocus) ? lastFocus : $('dock'); focus.focus?.({ preventScroll: true }); lastFocus = null;
    if (motion && reduced.matches) finishTravel();
    if (counting?.status === 'inprogress' && reduced.matches) finishCounting();
  }
  // A new game goes back to choosing who you are; the last choices stay selected.
  function restart() {
    counting = null; clearMotion(); closeDialog();
    let newSeed = seed(); if (newSeed === state.seed) newSeed = (newSeed + 1) >>> 0;
    state = G.initial(newSeed, state.settings); dismissedFeedback = '';
    position = { ...anchors.start }; selectedTopic = null; selectedVenue = null; selectedAction = null; resetToggles(); error = ''; saveError = ''; saveNotice = ''; lastFrame = null; teamElapsed = 0; locked = false;
    $('dialog-body').innerHTML = ''; $('world').dataset.action = ''; $('world').classList.remove('motion-paused');
    setPosition(); save(); render(); focusDock(); window.scrollTo?.(0, 0); announce('新的一局：先選身分和政黨。');
  }
  function focusChoice(selector) { ($('dock').querySelector?.(selector) || $('map-hotspots').querySelector?.(selector) || $('panel').querySelector?.(selector))?.focus({ preventScroll: true }); }
  function dispatch(data) {
    if (data.action === 'art-switch' && !modal && state.phase !== 'travel' && counting?.status !== 'inprogress') { Art?.setPack?.(Art.isToy() ? 'original' : 'matte-toy-v1'); dressed=''; $('venue-scene').dataset.key=''; scene(); render(); return; }
    if (data.action === 'dismiss-event' && !modal) { dismissedFeedback = state.crisis ? crisisKey(state.crisis) : ''; save(); renderEvents(); focusDock(); return; }
    if (data.action === 'close') { closeDialog(); return; }
    if (data.action === 'restart') { restart(); return; }
    if (data.action === 'dismiss-notice') { saveNotice = ''; showNotice(); return; }
    if (modal) return;
    if (['budget', 'poll', 'journal', 'dossier', 'events', 'tally', 'rules'].includes(data.action)) { openDialog(data.action, data.topic); return; }
    if (data.answer && state.phase === 'question') { answer(data.answer); return; }
    if (data.action === 'setting' && !state.started) {
      const records = { background: G.BACKGROUNDS, affiliation: G.PARTIES }[data.setting];
      if (!records?.[data.value]) return;
      if (G.configure(state, { [data.setting]: data.value })) { save(); render(); focusChoice('[data-action="setting"][data-setting="' + data.setting + '"][data-value="' + data.value + '"]'); } return;
    }
    if (data.action === 'skip-count') { finishCounting(); return; }
    if (data.action === 'skip') { if (motion) finishTravel(); return; }
    if (data.action === 'start' && !state.started) { if (G.start(state)) { saveNotice = ''; save(); render(); focusDock(); announce('第一回合開始，點地圖上的地點出發。'); } return; }
    if (data.action === 'next' && state.phase === 'recap') { nextRound(); return; }
    if (state.phase !== 'plan' || !state.started) return;
    if (data.action === 'topic' && G.availableTopics(state).some(t => t.id === data.topic)) { selectedTopic = data.topic; error = ''; save(); render(); focusChoice('[data-action="topic"][data-topic="' + selectedTopic + '"]'); return; }
    if (data.action === 'offer') { if (G.respondOffer(state, data.choice)) { save(); render(); announce(data.choice === 'accept' ? '已接受合作，立場已公開。' : '已婉拒合作。'); } return; }
    if (data.action === 'crisis') { if (G.respondCrisis(state, data.choice)) { save(); render(); $('event-feedback').querySelector?.('button')?.focus({preventScroll:true}); announce(crisisChoice(state.crisis) + '，你的票數 ' + signedVotes(state.crisis.effect.votes) + '。結果已加入選戰動態。'); } return; }
    if (data.action === 'clarify') { if (G.clarify(state, data.id)) { save(); render(); announce('已發澄清文宣。'); } return; }
    if (data.action === 'pledge') { if (G.cleanPledge(state)) { save(); render(); announce('已宣示乾淨選戰。'); } return; }
    if (data.action === 'research') { const t = data.topic; if (G.TOPICS[t]) researchPick = researchPick.includes(t) ? researchPick.filter(x => x !== t) : [...researchPick, t].slice(0, helpers()); error = ''; save(); render(); focusChoice('[data-action="research"][data-topic="' + (t || '') + '"]'); return; }
    if (data.action === 'toggle') { const n = data.name; if (n === 'gifts') gifts = !gifts; else if (n === 'billboard') billboard = !billboard; else if (n === 'deep') deepOn = !deepOn; else if (n === 'booth') booth = !booth; else if (n === 'investigate') investigateOn = !investigateOn; else if (n === 'gotv') gotvOn = !gotvOn; else if (n === 'respond') { respondOn = !respondOn; if (respondOn) brief = null; } error = ''; save(); render(); focusChoice('[data-action="toggle"][data-name="' + n + '"]'); return; }
    if (data.action === 'donor') { donor = data.id && G.BROKERS?.[data.id] ? data.id : null; error = ''; save(); render(); focusChoice('[data-action="donor"][data-id="' + (data.id || '') + '"]'); return; }
    if (data.action === 'brief' && G.TOPICS[data.topic]) { brief = brief === data.topic ? null : data.topic; respondOn = false; error = ''; save(); render(); focusChoice('[data-action="brief"][data-topic="' + data.topic + '"]'); return; }
    if (data.action === 'mode' && action(data.kind)) { selectedAction = data.kind; error = ''; save(); render(); focusChoice('[data-action="mode"][data-kind="' + data.kind + '"]'); return; }
    if (data.action === 'select-action' && action(data.kind)) {
      researchPick = []; deepOn = false; brief = null; respondOn = false;
      if (data.kind === 'canvass') { if (!(onSite(selectedAction) && data.venue === selectedVenue)) selectedAction = 'canvass'; if (venues[data.venue]) selectedVenue = data.venue; }
      else if (data.kind === 'tv') { if (!['tv', 'press'].includes(selectedAction)) selectedAction = 'tv'; }
      else selectedAction = data.kind;
      error = ''; save(); render(); revealDock(); focusChoice('[data-action="confirm-action"]');
      announce('已選' + placeName(selectedAction, plannedVenue()) + '，還沒出發。'); return;
    }
    if (data.action === 'confirm-action') { if (selectedAction) begin(selectedAction); return; }
  }
  function nextRound() {
    if (!G.next(state)) return;
    selectedAction = null; selectedTopic = null; selectedVenue = null; resetToggles();
    if (state.phase === 'plan') { position = { ...anchors.start }; setPosition(); } else if (state.phase === 'result') { counting = { status: reduced.matches ? 'seen' : 'inprogress', elapsed: reduced.matches ? COUNT.end : 0 }; saveLast(); }
    save(); render(); focusDock(); announce(state.phase === 'result' ? '開票。' : '第 ' + state.day + ' 回合開始。');
  }
  document.addEventListener('click', event => { const el = event.target.closest('[data-action],[data-answer]'); if (el && !el.disabled && !(el.dataset.action === 'restart' && event.detail > 1)) dispatch(el.dataset); });
  $('dialog-overlay').addEventListener('click', event => { if (event.target === $('dialog-overlay')) closeDialog(); });
  $('dialog').addEventListener('keydown', event => {
    if (!modal) return;
    if (event.key === 'Escape') { event.preventDefault(); closeDialog(); }
    if (event.key === 'Tab') {
      const nodes = [...$('dialog').querySelectorAll('button:not(:disabled),a[href],[tabindex="0"]')], first = nodes[0], last = nodes.at(-1);
      if (!nodes.length) { event.preventDefault(); $('dialog').focus(); }
      else if (event.shiftKey && (document.activeElement === first || document.activeElement === $('dialog'))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === $('dialog'))) { event.preventDefault(); first.focus(); }
    }
  });
  document.addEventListener('visibilitychange', () => { lastFrame = null; $('world').classList.toggle('motion-paused', document.hidden || !!modal); if (document.hidden) save(); else if (motion && reduced.matches && !modal) finishTravel(); });
  window.addEventListener('pagehide', save);
  reduced.addEventListener?.('change', () => { if (reduced.matches && !modal) { if (motion) finishTravel(); if (counting?.status === 'inprogress') finishCounting(); } });
  document.addEventListener('error', event => {
    if (!event.target?.getAttribute?.('data-art-image') || !Art?.isToy?.()) return;
    Art.setPack('original'); dressed=''; $('venue-scene').dataset.key=''; scene(); render();
    announce('部分美術素材無法載入，已切回原版外觀，遊戲進度保留。');
  }, true);
  scene();
  if (state.phase === 'result' && reduced.matches && counting?.status === 'inprogress') { counting = { status: 'seen', elapsed: COUNT.end }; save(); }
  render();
  if (recoveredTravel) { position = { ...destinationFor(state.pending.id, state.pending.venue) }; setPosition(); if (G.arrive(state)) { save(); render(); announce('已恢復這回合的行程，沒有重複扣款。'); } }
  if (window.requestAnimationFrame) window.requestAnimationFrame(frame);
  // Executes production event/state logic in the test harness; never bypasses engine validation.
  window.DayUI = Object.freeze({ dispatch, tick, getState: () => JSON.parse(JSON.stringify(state)), getPosition: () => ({ ...position }), getCounting: () => counting ? { ...counting } : null, getMotion: () => motion ? { id: motion.id, stage: motion.stage, index: motion.index } : null, storageKey: KEY });
})();
