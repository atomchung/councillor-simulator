/* Campaign v13: the town map is the action surface, places open into scenes with three voter groups, every answer previews each group's reaction, the side panel tracks the race against 小馬, and the vote ends on a shareable report. */
(function () {
  'use strict';
  const G = window.DayGame, Art = window.DayArt, $ = id => document.getElementById(id);
  const KEY = 'wenshan-campaign-v13', LAST_KEY = KEY + '-last', BEST_KEY = KEY + '-bests';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = n => Number(n || 0).toLocaleString('zh-TW') + ' 元';
  const wan = n => (Number(n || 0) / 10000).toLocaleString('zh-TW', { maximumFractionDigits: 1 }) + ' 萬';
  const pct = n => Number(n || 0).toLocaleString('zh-TW', { maximumFractionDigits: 1 }) + '%';
  const num = n => Math.round(Number(n || 0)).toLocaleString('zh-TW');
  const signedVotes = n => { const v = Math.round(Number(n || 0)); return (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(v).toLocaleString('zh-TW'); };
  const GROUP_KEYS = ['elder', 'middle', 'young'];
  const fixed1 = n => Number(n || 0).toFixed(1);
  // One wording for how a seat is won, used everywhere the seat line appears.
  const SEATS = G.ELECTION?.seats || 13, RULE_LINE = '票數前 ' + SEATS + ' 名當選，第 ' + SEATS + ' 名的票數就是當選線；你要贏過第 ' + (SEATS + 1) + ' 名（第一個落選的人）。';
  const groupTitle = g => G.GROUPS?.[g]?.title || ['長輩', '中年', '青年'][g];
  const short = t => G.TOPICS?.[t]?.short || G.TOPICS?.[t]?.title || '';
  const TONE_TEXT = { up: '會加分', slight: '小加分', flat: '沒反應', down: '會扣分', split: '兩邊接近', unknown: '還不知道' };
  // Fundraising, recruiting and preparing move no votes themselves; what you lose in such a round is 小馬 campaigning meanwhile.
  const QUIET_WORD = { fundraise: '募款', recruit: '招募', prepare: '準備政見', dig: '挖黑料' };
  const quietLine = (id, byRival, attacked, dig) => { const took = Math.round(-(byRival || 0)); return (id === 'dig' ? { found: '挖到的料放進黑料檔案，還沒公開；', nothing: '錢花掉了；' }[dig] || '' : QUIET_WORD[id] + '不影響票數；') + '這回合你沒拉票，' + (took >= 1 ? (attacked ? '小馬拉票又攻擊你，你少了 ' : '小馬拉走 ') + num(took) + ' 票。' : '小馬沒拉走你的票。'); };
  const reduced = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  const fallback = { start: { x: 586, y: 331 }, prepare: { x: 534, y: 234 }, canvass: { x: 309, y: 355 }, tv: { x: 783, y: 374 }, fundraise: { x: 553, y: 432 }, recruit: { x: 713, y: 243 } };
  const anchors = Art?.anchors || fallback;
  const places = { prepare: '競選工作室', tv: '中立新聞台', press: '記者會', fundraise: '募款小廣場', recruit: '夥伴工作室', debate: '文山行政中心禮堂', online: '直播間' };
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
    online: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M10 9l5 3-5 3zM11 18h2"/>',
    file: '<path d="M3 6h6l2 2h10v11H3z"/><circle cx="11" cy="13.5" r="2.5"/><path d="m13 15.5 2.5 2.5"/>'
  };
  let state, selectedTopic = null, selectedVenue = null, selectedAction = null, gifts = false, billboard = false, modal = null, lastFocus = null;
  // Per-round choices in the dock: the issue to research (null = the suggestion, '' = none), deeper research, the stall, the background
  // check, the final push, the TV brief and a public reply to 小馬 on TV.
  // donor: null is a small public drive, otherwise the broker visited for money.
  // expose: the dirt-file lead to release on a press conference, TV or a stream (null at a press conference is the anonymous tip).
  let researchPick = [], deepOn = false, booth = false, investigateOn = false, gotvOn = false, brief = null, respondOn = false, donor = null, exposePick = null, campaignPick = null, researchOpen = false, extrasOpen = false, topicOpen = false;
  function resetToggles() { mapExpanded = false; gifts = false; billboard = false; researchPick = []; deepOn = false; booth = false; investigateOn = false; gotvOn = false; brief = null; respondOn = false; donor = null; exposePick = null; campaignPick = null; researchOpen = false; extrasOpen = false; topicOpen = false; }
  let mapExpanded = false;
  let mapTipDismissed = false, openingPick = null, bestRecordStatus = null;
  let teamElapsed = 0, counting = null, dressed = '', answerGuard = 0;
  // Old reaction saves remain compatible; new rounds wait for explicit settlement acknowledgement.
  const AFTERGLOW = 2.5;
  let afterglow = null;
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
    return s && s.settings && !!(G.BACKGROUNDS?.[s.settings.background] || G.LEGACY_BACKGROUNDS?.[s.settings.background]) && !!G.PARTIES?.[s.settings.affiliation] && s.version === G.VERSION && s.revision === G.REVISION && (s.rounds ?? 10) === G.DAYS && Number.isInteger(s.seed) && typeof s.started === 'boolean' && Number.isInteger(s.day) && s.day >= 1 && s.day <= G.DAYS && ['plan', 'travel', 'question', 'recap', 'result'].includes(s.phase) && s.player && s.rival && s.budget && ['committed', 'personalContribution', 'donations', 'deposit', 'available', 'spent'].every(k => Number.isFinite(s.budget[k]) && s.budget[k] >= 0) && array(s.player.known) && s.player.known.every(t => !!G.TOPICS[t]) && array(s.player.promises) && array(s.player.actions) && s.player.counts && array(s.rival.actions) && s.rival.budget && array(s.voters) && s.voters.length === G.POPULATION && s.voters.every(v => array(v.support) && v.support.length === 2 && v.support.every(Number.isFinite) && Number.isInteger(v.g) && ['kmt', 'dpp', 'none'].includes(v.p) && array(v.cares) && typeof v.pref === 'string' && array(v.rec)) && !!s.landscape?.groups && array(s.offers) && array(s.polls) && array(s.journal) && array(s.ledger) && (!['travel', 'question'].includes(s.phase) || (s.pending && G.ACTIONS.some(a => a.id === s.pending.id))) && (s.phase !== 'recap' || !!(s.recap?.player && s.recap?.rival)) && (s.phase !== 'result' || (s.result && array(s.result.tally) && s.result.tally.length === G.ELECTION.candidates));
  }
  let recoveredTravel = false;
  try {
    const raw = window.localStorage.getItem(KEY), parsed = raw ? JSON.parse(raw) : null;
    if (validSaved(parsed)) {
      state = G.upgrade(parsed); selectedTopic = G.TOPICS[parsed._ui?.topic] ? parsed._ui.topic : null;
      selectedVenue = G.VENUES?.[parsed._ui?.venue] ? parsed._ui.venue : null;
      selectedAction = G.ACTIONS.some(a => a.id === parsed._ui?.action) ? parsed._ui.action : null;
      gifts = !!parsed._ui?.gifts; billboard = !!parsed._ui?.billboard; researchPick = Array.isArray(parsed._ui?.research) ? parsed._ui.research.filter(t => G.TOPICS[t]) : []; deepOn = !!parsed._ui?.deep; booth = !!parsed._ui?.booth; investigateOn = !!parsed._ui?.investigate; gotvOn = !!parsed._ui?.gotv; brief = G.TOPICS[parsed._ui?.brief] ? parsed._ui.brief : null; respondOn = !!parsed._ui?.respond; donor = G.BROKERS?.[parsed._ui?.donor] ? parsed._ui.donor : null; exposePick = typeof parsed._ui?.expose === 'string' ? parsed._ui.expose : null;
      bestRecordStatus = parsed._ui?.bestRecord || null;
      mapTipDismissed = !!parsed._ui?.mapTipDismissed || parsed.journal.length > 0;
      openingPick = ['canvass', 'prepare', 'online'].includes(parsed._ui?.openingPick) ? parsed._ui.openingPick : null;
      campaignPick = typeof parsed._ui?.campaign === 'string' ? parsed._ui.campaign : null;
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
  const period = day => '第 ' + (Math.floor((day - 1) * roundDays) + 1) + '–' + Math.floor(day * roundDays) + ' 天';
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
  // Vote estimates are rounded to tens so they read as an estimate.
  const tens = n => Math.round(Number(n || 0) / 10) * 10;
  // The one line that always sits on top of the dock: where you are against the last seat and 小馬.
  function statusBar() {
    const r = G.raceView(state), gap = r.you - r.line;
    return '<div class="status-bar ' + (gap >= 0 ? 'ahead' : 'behind') + '"><span>你 <b>' + num(r.you) + '</b> 票</span><span class="status-gap">' + (gap >= 0 ? '超過當選線 ' : '離當選線還差 ') + '<b>' + num(Math.abs(gap)) + '</b></span><span>小馬 <b>' + num(r.rival) + '</b></span><span class="status-round">第 ' + state.day + '／' + G.DAYS + ' 回合</span></div>';
  }
  // The crowd as ten people, by group, instead of percentages.
  const crowdKnown = venue => state.player.actions.some(x => x.venue === venue && !x.record) || askPool().some(t => state.player.known.includes(t));
  function crowdCount(mix) { const raw = (mix || [1 / 3, 1 / 3, 1 / 3]).map(m => m * 10), counts = raw.map(Math.floor); let left = 10 - counts.reduce((a, b) => a + b, 0); raw.map((r, g) => [r - counts[g], g]).sort((a, b) => b[0] - a[0]).slice(0, left).forEach(([, g]) => counts[g]++); return counts; }
  // Until you have been here or researched what it asks about, the crowd shows as faces without group counts.
  function crowdLine(mix, label = '現場 10 人', hidden = false) { if (hidden) return '<div class="crowd-line unknown" role="img" aria-label="' + esc(label + '：組成未知') + '"><span class="crowd-label">' + esc(label) + '</span><span class="crowd-dots">' + '<i class="g-unknown"></i>'.repeat(10) + '</span><span class="crowd-text">組成未知' + info('研究過這裡會問的題，或來過一次，就看得到。') + '</span></div>';  const counts = crowdCount(mix); return '<div class="crowd-line" role="img" aria-label="' + esc(label + '：' + counts.map((n, g) => groupTitle(g) + ' ' + n + ' 人').join('、')) + '"><span class="crowd-label">' + esc(label) + '</span><span class="crowd-dots">' + counts.map((n, g) => Array.from({ length: n }, () => '<i class="g-' + GROUP_KEYS[g] + '"></i>').join('')).join('') + '</span><span class="crowd-text">' + counts.map((n, g) => n ? '<b class="g-' + GROUP_KEYS[g] + '">' + esc(groupTitle(g)) + ' ' + n + '</b>' : '').filter(Boolean).join('・') + '</span></div>'; }
  function partyDot(id) { const p = G.PARTIES[id]; return p ? '<i class="party-dot" style="--party:' + esc(p.color) + '">' + esc(p.short) + '</i>' : ''; }
  function partyBadge(id) { const p = G.PARTIES[id] || G.PARTIES.independent; return '<span class="party-badge" style="--party:' + esc(p.color) + '">' + esc(p.short || p.title) + '</span>'; }

  /* ---------- records and dialogs ---------- */
  function eventRecord(value, label) {
    if (!value) return '';
    const text = typeof value === 'string' ? value : value.text || value.quote || '', round = typeof value === 'object' ? (value.round || value.day) : null;
    return '<div class="fact"><strong>' + esc(label) + (round ? '・第 ' + Number(round) + ' 回合' : '') + '</strong>' + (text ? '<p>' + esc(text) + '</p>' : '') + (value.evidenceText ? '<p class="microcopy">當時的證據：' + esc(value.evidenceText) + '</p>' : '') + '</div>';
  }
  // The anonymous tip's record: evidence so far, what you said about it and the check.
  function tipMarkup() {
    const e = G.eventView(state).tip;
    if (!e?.available) return '<p>第 3 回合起才會有爆料資料。</p>';
    return '<section class="event-record"><h3>' + esc(e.title) + '</h3><p>' + esc(e.summary) + '</p><div class="event-evidence"><b>' + esc(e.evidenceText) + '</b><span>已核對 ' + Number(e.investigations || 0) + '／' + Number(e.maxInvestigations || 2) + ' 次</span></div>' + (e.history?.length ? e.history.map(x => eventRecord(x, x.quote ? '你說過' : '第 ' + Number(x.stage || x.evidenceLevel || 0) + ' 次核對')).join('') : '') + eventRecord(e.update, '核對結果') + '</section>';
  }
  const DIRT_STATUS = { unverified: '未查證', checking: '查證中', solid: '已查證・站得住', debunked: '已查證・站不住', released: '已爆' };
  const OUTLET = { press: '記者會', tv: '電視', online: '直播' };
  const leadEstimate = (x, o) => x.estimate?.[o] ? (x.status === 'solid' ? '約 ' + signedVotes(x.estimate[o].gain) : '真 ' + signedVotes(x.estimate[o].gain) + '／假 ' + signedVotes(x.estimate[o].loss)) : '';
  const OUTCOME = { release: '站得住', hit: '打到小馬', backfire: '料不實，反咬你', flat: '沒人追', caught: '被記者識破' };
  const fileActionConfig = id => ({ expose: id || null, research: [] });
  function fileGoButton(kind, id, label, estimate = '') {
    const p = G.preview(state, kind, fileActionConfig(id));
    return '<button class="mini-button go" data-action="file-go" data-kind="' + kind + '" data-id="' + esc(id) + '"' + (p.allowed ? '' : ' disabled aria-disabled="true"') + '>' + esc(label) + '<small>' + (p.totalCost ? wan(p.totalCost) : '免費') + '・占 1 回合</small>' + (estimate ? '<small>' + esc(estimate) + '</small>' : '') + (!p.allowed && p.reason ? '<small>' + esc(p.reason) + '</small>' : '') + '</button>';
  }
  // One lead: how solid it is, what checking costs, and a button per outlet where it can go off; once released, when, where and how it
  // went, with no button to release it again (a tip you accused on can still be corrected once).
  function leadMarkup(x, actions = true) {
    const plan = actions && state.started && state.phase === 'plan', buttons = [], go = !x.released && (x.source === 'dig' ? x.ready : x.ready && x.status !== 'debunked');
    if (plan && x.canVerify) buttons.push('<button class="mini-button" data-action="verify" data-id="' + esc(x.id) + '">查證・' + wan(x.verifyCost) + (x.maxChecks > 1 ? '（' + (x.checks + 1) + '/' + x.maxChecks + '）' : '') + '</button>');
    if (plan && go) for (const o of x.outlets) buttons.push(fileGoButton(o, x.source === 'dig' ? x.id : '', OUTLET[o] + '爆', leadEstimate(x, o)));
    if (plan && x.correct) buttons.push(fileGoButton('press', '', '開記者會更正'));
    const status = x.released ? '已爆' + (x.truthLabel ? '・' + x.truthLabel : '') : (x.truthLabel ? '已查證・' + x.truthLabel : DIRT_STATUS[x.status] || '') + (x.source === 'tip' && x.status === 'checking' ? '（' + x.checks + '/' + x.maxChecks + '）' : '') + (x.leaked ? '・小馬已先發聲明，殺傷力剩一半' : '');
    const o = x.outcome, outcome = o ? '第 ' + o.round + ' 回合・' + OUTLET[o.outlet] + '爆：' + (OUTCOME[o.kind] || '') + (o.leak ? '（小馬先撇清，打折）' : '') + ' → 你 ' + signedVotes(o.votes) + ' 票' + (o.rival ? '，小馬 ' + signedVotes(o.rival) : '') : '';
    return '<article class="lead status-' + esc(x.status) + '"><div class="lead-head"><b>' + esc(x.title) + '</b><span class="lead-status">' + esc(status) + '</span></div><p>' + esc(x.source === 'tip' ? x.evidence || x.text : x.text) + '</p>' + (outcome ? '<p class="lead-outcome ' + esc(o.kind || '') + '">' + esc(outcome) + '</p>' : '') + (x.source === 'tip' && plan && go ? '<p class="microcopy">只能在記者會爆；查兩次才知道真假。</p>' : '') + (buttons.length ? '<div class="lead-actions">' + buttons.join('') + '</div>' : '') + '</article>';
  }
  function fileMarkup() {
    const f = G.fileView(state), plan = state.started && state.phase === 'plan', odds = f.dig.odds, p = n => Math.round(n * 100) + '%';
    const against = (state.crises || []).map(c => { const e = state.journal.flatMap(j => j.planEffects || []).find(x => x.kind === 'crisis' && x.text === G.SCANDALS?.[c.kind]?.text) || (state.crisis?.kind === c.kind ? state.crisis.effect : null); return '<li>第 ' + c.round + ' 回合・' + esc((c.byName || '其他候選人') + '陣營') + '：' + esc(G.SCANDALS?.[c.kind]?.text || '') + (e && Number.isFinite(e.votes) ? ' → 你 ' + signedVotes(e.votes) + ' 票' : '') + '</li>'; });
    return '<section class="dirt-file"><p class="dirt-lead">挖到料 → 查證 → 挑時機爆。站得住的料，讓不信小馬的人轉向你。' + info('查證花錢、不占回合。站得住的料爆出去，小馬掉的票轉到你身上，當選線不會因此變高。沒查證就爆：料是真的效果打折，料不實會反咬你。') + '</p>'
      + (f.items.length ? f.items.map(x => leadMarkup(x)).join('') : '<p class="microcopy">檔案還是空的。</p>')
      + '<div class="dirt-dig"><p><b>挖料</b>' + wan(f.dig.cost) + '・占一回合・這局還能挖 ' + f.dig.left + ' 次<br><small>挖到 ' + p(odds.found) + '・沒挖到 ' + p(odds.nothing) + '・被小馬抓到反咬 ' + p(odds.backfire) + '</small></p>' + (plan ? fileGoButton('dig', '', '去挖黑料') : '') + (f.digs?.length ? '<ul class="dig-log">' + f.digs.map(d => '<li class="' + esc(d.outcome) + '">第 ' + d.round + ' 回合・' + esc(DIG_LABEL[d.outcome] || '') + (d.outcome === 'backfire' ? '，你 ' + signedVotes(d.votes) + ' 票' : d.outcome === 'found' && f.items.find(i => i.id === d.lead) ? '：' + esc(f.items.find(i => i.id === d.lead).title) : '') + '</li>').join('') + '</ul>' : '') + '</div>'
      + '<ul class="rules-list dirt-outlets"><li><b>記者會</b>免費、占一回合；全區都看，最可信。</li><li><b>電視</b>長輩、中年看，順便上節目回答一題。</li><li><b>直播</b>青年看，看流量；沒查證的料被起底，反咬更重。</li></ul>'
      + '<p class="dirt-risk"><b>風險</b>料放著不爆，小馬可能先發聲明撇清。你爆他、或挖料被抓到，他更可能爆你的料' + (state.day > f.scandalWindow[1] ? '。' : '：' + (state.day < f.scandalWindow[0] ? '第 ' + f.scandalWindow[0] + ' 回合起' : '現在') + '每回合約 ' + p(f.scandalChance) + '。') + info('被爆料時可以發澄清文宣（只救回一部分）、公開道歉或硬槓。') + '</p>'
      + (against.length ? '<div class="dirt-against"><b>被爆的料</b><ul>' + against.join('') + '</ul></div>' : '') + '</section>';
  }
  const crisisChoice = c => ({ pay: '發澄清文宣', apologize: '公開道歉切割', fight: c.won ? '硬槓反控成功' : '硬槓反控炎上' })[c.choice] || '等待處理';
  const crisisKey = c => 'crisis-' + c.round + '-' + c.kind;
  // Who broke a scandal, for the timeline and the recap.
  const exposedBy = day => { const c = (state.crises || []).find(x => x.round === day); return c?.byName ? c.byName + '陣營爆料：' : ''; };
  // All timeline facts come from engine records; the UI only stores dismissal of the result card.
  function timelineEntries() {
    const entries = [];
    for (const j of state.journal) {
      for (const [i, e] of (j.planEffects || []).entries()) entries.push({ key: e.kind === 'crisis' ? 'crisis-day-' + j.day : 'plan-' + j.day + '-' + i, day: j.day, title: e.kind === 'crisis' ? crisisChoice(e) : e.title, text: (e.kind === 'crisis' ? exposedBy(j.day) : '') + e.text, votes: e.votes, tone: e.votes < 0 ? 'loss' : 'settled' });
      for (const [i, e] of (j.events || []).entries()) entries.push({ key: 'event-' + j.day + '-' + i, day: j.day, title: e.title, text: e.text, votes: e.effects?.votes, tone: 'settled' });
    }
    for (const o of state.offers || []) if (o.respondedDay) entries.push({ key: 'offer-' + o.id + '-' + o.respondedDay, day: o.respondedDay, title: o.status === 'breached' ? '合作破局' : o.effect ? '接受合作' : '婉拒合作', text: G.dealOf(state, o.id)?.org || '合作邀約', votes: o.effect?.votes, tone: 'settled' });
    for (const c of state.challenges || []) entries.push({ key: c.id, day: c.issuedDay, title: '小馬提出質疑', text: c.quote, tone: c.status === 'open' && !c.mitigatedDay ? 'pending' : 'settled' });
    const c = state.crisis;
    if (c && !entries.some(e => e.key === 'crisis-day-' + c.round)) entries.push({ key: 'crisis-day-' + c.round, day: c.round, title: c.status === 'resolved' ? crisisChoice(c) : '突發危機・等待處理', text: exposedBy(c.round) + c.text, votes: c.effect?.votes, tone: c.status === 'pending' ? 'pending' : c.effect?.votes < 0 ? 'loss' : 'settled' });
    for (const n of G.pollNews(state)) entries.push({ key: 'poll-' + n.day, day: n.day, title: '第 ' + n.day + ' 回合民調出爐', text: pollNewsText(n), tone: 'settled', poll: true });
    return entries.sort((a, b) => b.day - a.day);
  }
  function renderEvents() {
    const timeline = $('event-timeline'), card = $('event-feedback'), entries = timelineEntries();
    timeline.hidden = !state.started;
    const row = e => '<li data-event-key="' + esc(e.key) + '" data-tone="' + e.tone + '"><span class="event-round">R' + Number(e.day) + '</span><div><strong>' + esc(e.title) + '</strong><p>' + esc(e.text) + '</p></div>' + (Number.isFinite(e.votes) ? '<span class="event-votes">' + signedVotes(e.votes) + ' 票</span>' : '') + '</li>';
    const now = lastRound(), older = now ? entries.filter(e => e.day !== now.day || e.poll) : entries;
    timeline.innerHTML = '<div class="timeline-heading"><h2>選戰動態</h2><span>' + entries.length + ' 則紀錄</span></div>' + (now ? lastRoundMarkup(now) : '') + (older.length ? '<ol>' + older.slice(0, 3).map(row).join('') + '</ol>' + (older.length > 3 ? '<details><summary>查看較早 ' + (older.length - 3) + ' 則</summary><ol>' + older.slice(3).map(row).join('') + '</ol></details>' : '') : now ? '' : '<p class="timeline-empty">還沒有紀錄。</p>');
    const c = state.crisis;
    // The news flash sits on the map's top-right corner; collapsing it leaves a one-line chip there.
    const show = state.started && state.phase === 'plan' && c?.status === 'resolved' && c.resolvedDay === state.day, folded = show && dismissedFeedback === crisisKey(c);
    card.hidden = !show; card.classList?.toggle('folded', !!folded);
    if (!show) { card.innerHTML = ''; return; }
    const cost = state.ledger.find(l => l.day === c.resolvedDay && l.action === 'crisis')?.cost || 0;
    if (folded) { card.innerHTML = '<button type="button" class="event-chip" data-action="expand-event" aria-expanded="false">選戰快報 · R' + c.round + '：' + esc(crisisChoice(c)) + ' <b>' + signedVotes(c.effect.votes) + ' 票</b> ▾</button>'; return; }
    card.innerHTML = '<div class="event-card-top"><span>選戰快報 · R' + c.round + '</span><button type="button" data-action="dismiss-event" aria-expanded="true" aria-label="收起選戰快報">收起 ▴</button></div><h2>' + esc(crisisChoice(c)) + '</h2><p>' + esc(exposedBy(c.round) + c.text) + '</p><div class="event-impact"><strong>' + signedVotes(c.effect.votes) + '<small>你的票數</small></strong><span>' + money(cost) + '<small>處理支出</small></span></div><div class="event-groups">' + (c.effect.byGroup || []).map((v, i) => '<span>' + esc(groupTitle(i)) + ' <b>' + signedVotes(v) + '</b></span>').join('') + '</div>';
  }
  function save() {
    state._ui = { x: position.x, y: position.y, topic: selectedTopic, venue: selectedVenue, action: selectedAction, gifts, billboard, research: researchPick, deep: deepOn, booth, investigate: investigateOn, gotv: gotvOn, brief, respond: respondOn, donor, expose: exposePick, campaign: campaignPick, mapTipDismissed, openingPick, bestRecord: bestRecordStatus, dismissedFeedback, counting: counting ? { ...counting } : null };
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
  function revealDock() { for (const scroller of [$('dock'), $('dock-body'), $('dock').querySelector?.('.dock-options-body')]) if (scroller) scroller.scrollTop = 0; }
  function actorPosition(el, p, visual = false) { if (!visual && Art?.mapPoint) p = Art.mapPoint(p); el.style.left = p.x / 12 + '%'; el.style.top = p.y / 6.5 + '%'; el.style.zIndex = String(Math.round(p.y)); }
  function setPosition() { const p = motion && Art?.travelPoint ? Art.travelPoint(motion.route,motion.index,position,motion.id,motion.venue) : Art?.isToy?.() && state.pending && state.phase !== 'plan' ? Art.visualRoute(state.pending.id,state.pending.venue).at(-1) : Art?.mapPoint ? Art.mapPoint(position) : position; actorPosition($('player'), p, true); }
  // Both candidates dress for their identity and party; redraw only when that changes.
  function dress() {
    const key = state.settings.background + ':' + state.settings.affiliation + ':' + state.rival.party + ':' + state.player.name;
    if (key === dressed) return; dressed = key;
    Art?.setCandidates?.({ player: { name: state.player.name || G.candidateName(state.settings), identity:state.settings.background, outfit: G.BACKGROUNDS[state.settings.background]?.outfit || 'casual', party: state.settings.affiliation === 'independent' ? null : state.settings.affiliation }, rival: { party: state.rival.party } });
    const me = esc(state.player.name || G.candidateName(state.settings)) + '・你';
    $('player').innerHTML = Art ? Art.avatar('player') + '<span class="actor-name">' + me + '</span>' : '<span class="actor-name">' + me + '</span>';
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
    if (state.phase === 'result' && state.result) return '<span>你 第 <b>' + state.result.rank + '</b> 名</span><span><b>' + num(state.result.playerVotes) + '</b> 票</span><span>當選線 <b>' + num(state.result.lastSeat) + '</b></span>';
    const r = G.raceView(state), gap = r.you - r.line;
    return '<span>你 第 <b>' + r.rank + '</b> 名</span><span>' + (gap >= 0 ? '過線 <b>' + num(gap) + '</b> 票' : '還差 <b>' + num(-gap) + '</b> 票') + '</span><span>當選線 <b>' + num(r.line) + '</b></span>';
  }
  function header() {
    $('day-label').innerHTML = (!state.started ? '準備參選' : state.phase === 'result' ? '開票' : '第 ' + state.day + ' 回合') + (state.started && state.phase !== 'result' ? '<span>／ ' + G.DAYS + '</span><em class="act-chip">' + ['', '第一幕', '第二幕', '第三幕'][G.actOf(state.day).id] + '</em>' : '');
    $('day-dots').innerHTML = Array.from({ length: G.DAYS }, (_, i) => '<i class="' + (state.phase === 'result' || i + 1 < state.day ? 'done' : i + 1 === state.day && state.started ? 'current' : '') + (i + 1 === G.DEBATE_ROUND ? ' debate' : '') + '"></i>').join('');
    $('cash').textContent = wan(state.budget.available);
    $('race-summary').innerHTML = raceSummary();
    $('journal-count').textContent = String(state.journal.length);
    $('day-kicker').textContent = state.started ? period(state.day) + '・' + G.actOf(state.day).title : '臺北市大安文山區';
    const pending = state.pending, located = pending || (state.phase === 'recap' ? state.recap?.player : afterglow ? state.journal.at(-1)?.player : null);
    $('world-title').textContent = !state.started ? '從巷口，走進大家的日常。' : state.phase === 'plan' ? (afterglow ? '現場的反應' : '這回合要去哪裡？') : state.phase === 'question' ? placeName(pending.id, pending.venue) : state.phase === 'recap' ? '現場的反應' : state.phase === 'result' ? '開票' : (action(pending?.id)?.title || '') + '，出發。';
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
  // Opening cards: one line of character, numbers as meters; the full rule text stays in the tooltip.
  const meter = (label, value, max, text) => '<span class="pick-meter"><i>' + esc(label) + '</i><span class="pick-bar"><b style="width:' + Math.round(Math.max(0, Math.min(1, value / max)) * 100) + '%"></b></span><em>' + esc(text) + '</em></span>';
  const IDENTITY_LINE = { newcomer: '最懂議題、街訪最強，有人就愛新面孔。', heir: '家族錢多、里長熟，怕的是上台失言。', incumbent: '有團隊、有人脈，舊立場常被翻出來。' };
  const CHIEF_TIES = { newcomer: [1, '生'], heir: [2, '半熟'], incumbent: [3, '都熟'] };
  // This game's origin preset on each identity card: a name, one strength and one weakness; the details sit in the card's tooltip.
  const originTip = id => { const o = G.originView?.(state, id), b = G.baseView?.(state, id); return (o ? ['本局出身：' + o.title, o.info] : []).concat(b ? ['基本盤：' + b.title, b.perk + '：' + b.perkText] : []); };
  // The vote bank follows the identity and its origin: one short line, the group and where it gathers.
  const baseMarkup = b => b ? '<span class="base-line g-' + GROUP_KEYS[b.group] + '"><i>基本盤</i><b>' + esc(b.title) + '</b></span>' : '';
  const originMarkup = o => o ? '<span class="origin-tag"><i>本局出身</i><b>' + esc(o.title) + '</b></span><span class="origin-line"><em class="og">＋' + esc(o.good) + '</em><em class="ob">－' + esc(o.bad) + '</em></span>' : '';
  let bestRecords = null;
  function readBestRecords() {
    if (bestRecords) return bestRecords;
    bestRecords = {};
    try { const raw = JSON.parse(window.localStorage.getItem(BEST_KEY) || '{}'); for (const bg of Object.keys(G.BACKGROUNDS)) for (const party of Object.keys(G.PARTIES)) { const key = bg + ':' + party, r = raw?.[key]; if (r && Number.isInteger(r.rank) && r.rank > 0 && r.rank <= G.ELECTION.candidates && Number.isFinite(r.votes) && r.votes >= 0) bestRecords[key] = { rank: r.rank, votes: r.votes, title: String(r.title || '') }; } } catch (_) { /* Records are optional; an unavailable store must not block play. */ }
    return bestRecords;
  }
  function gradeOf(r) { return G.resultGrade?.(r) || r.grade || { id: r.rank <= 10 ? 'high' : r.rank <= 11 ? 'steady' : r.rank <= SEATS ? 'narrow' : 'lost', title: r.rank <= 10 ? '高票當選' : r.rank <= 11 ? '穩上' : r.rank <= SEATS ? '險勝' : '落選', next: null }; }
  function bestLine(bg) { const b = readBestRecords()[bg + ':' + state.settings.affiliation]; return b ? '<span class="identity-best">最佳：第 ' + b.rank + ' 名・' + esc(gradeOf({ rank: b.rank, playerVotes: b.votes }).title) + '</span>' : ''; }
  function rememberBestResult() {
    const r = state.result; if (!r || bestRecordStatus) return;
    const records = readBestRecords(), key = state.settings.background + ':' + state.settings.affiliation, previous = records[key], better = !previous || r.rank < previous.rank || r.rank === previous.rank && r.playerVotes > previous.votes;
    bestRecordStatus = { isNew: better, first: !previous, previousRank: previous?.rank || null, stored: false };
    if (!better) return;
    records[key] = { rank: r.rank, votes: r.playerVotes, title: gradeOf(r).title };
    try { window.localStorage.setItem(BEST_KEY, JSON.stringify(records)); bestRecordStatus.stored = true; } catch (_) { /* The result remains playable when browser storage is blocked. */ }
  }
  function identityCards() {
    const value = state.settings?.background, all = Object.values(G.BACKGROUNDS), money = Object.fromEntries(all.map(b => { const t = G.initial(state.seed, { background: b.id, affiliation: state.settings?.affiliation }); G.start(t); return [b.id, t.budget.available]; })), cash = Math.max(...Object.values(money)), base = Math.max(...all.map(b => b.supportBoost));
    return '<fieldset class="pick-group"><legend><span class="step">1</span>你是誰</legend><div class="identity-cards">' + all.map(b => '<button type="button" class="identity-card pick-card" data-action="setting" data-setting="background" data-value="' + esc(b.id) + '" aria-pressed="' + (value === b.id) + '" title="' + esc(b.strengths.map(x => '＋ ' + x).concat(b.weaknesses.map(x => '－ ' + x)).concat(originTip(b.id)).join('\n')) + '">' + pickMark(value === b.id) + '<span class="portrait">' + (Art?.portrait ? Art.portrait({ identity:b.id, outfit: b.outfit, party: myParty() }) : '') + '</span><b>' + esc(b.title) + ' <span class="difficulty d-' + esc(b.id) + '">' + esc(b.difficulty || '') + '</span></b><span class="identity-good pick-line">' + esc(IDENTITY_LINE[b.id] || b.strengths[0]) + '</span>' + originMarkup(G.originView?.(state, b.id)) + baseMarkup(G.baseView?.(state, b.id)) + bestLine(b.id) + '<span class="identity-bad pick-meters">' + meter('資金', money[b.id], cash, wan(money[b.id])) + meter('起始票', b.supportBoost, base, b.supportBoost >= base ? '高' : b.supportBoost >= base * .85 ? '中' : '低') + meter('里長', CHIEF_TIES[b.id]?.[0] || 1, 3, CHIEF_TIES[b.id]?.[1] || '') + meter('助手', b.helpers, 3, b.helpers + ' 人') + '</span></button>').join('') + '</div></fieldset>';
  }
  const PARTY_LINE = { independent: '沒包袱，中間選民比較願意聽你說。', kmt: '票倉最大，但同黨候選人多、票分得薄；要守黨的立場。', dpp: '票倉較小，但同黨選民最死忠；要守黨的立場。' };
  function partyCards() {
    const value = state.settings?.affiliation;
    return '<fieldset class="pick-group"><legend><span class="step">2</span>政黨</legend><div class="party-cards">' + Object.values(G.PARTIES).map(p => { const share = p.id === 'independent' ? G.PARTY_SHARES.none : G.PARTY_SHARES[p.id]; return '<button type="button" class="party-card pick-card" style="--party:' + esc(p.color) + '" data-action="setting" data-setting="affiliation" data-value="' + esc(p.id) + '" aria-pressed="' + (value === p.id) + '" title="' + esc(p.description) + '">' + pickMark(value === p.id) + '<span class="emblem">' + esc(p.id === 'independent' ? '無' : p.short) + '</span><b>' + esc(p.title) + '</b><span class="pick-line">' + esc(PARTY_LINE[p.id] || '') + '</span><span class="pick-meters">' + meter(p.id === 'independent' ? '中間選民' : '同黨選民', share, .5, Math.round(share * 100) + '%') + meter('黨部補助', p.subsidy, 150000, p.subsidy ? wan(p.subsidy) : '無') + '</span></button>'; }).join('') + '</div></fieldset>';
  }
  function intro() {
    const preview = JSON.parse(JSON.stringify(state)); G.start(preview);
    const E = G.ELECTION, r = G.raceView(preview), bg = G.BACKGROUNDS[preview.settings.background], party = G.PARTIES[preview.settings.affiliation], his = G.PARTIES[preview.rival.party], lines = id => Object.entries(G.PARTY_LINES[id] || {}).map(([t, plan]) => short(t) + '「' + G.TOPICS[t].plans.find(x => x.id === plan).text + '」').join('、');
    const side = (who, look, role, title, sub, votes, extra) => '<div class="mu-side mu-' + role + '"><span class="portrait">' + (Art?.portrait ? Art.portrait(look, role === 'rival' ? 'rival' : 'player') : '') + '</span><b>' + who + '</b><small>' + esc(title) + '</small>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '<strong>' + num(votes) + ' 票</strong>' + (extra ? '<small>' + extra + '</small>' : '') + '</div>';
    const matchup = '<section class="matchup-card"><div class="card-head"><b>開局估票</b><span>主要對手：小馬（' + esc(his.title) + '）</span></div><div class="matchup">' + side(esc(G.candidateName(preview.settings)) + '・你', { outfit: bg.outfit, party: myParty() }, 'you', party.title + '・' + bg.title, '', r.you, '可用 ' + wan(preview.budget.available)) + '<span class="vs">→</span><div class="mu-side mu-line"><b>當選線</b><small>上屆第 ' + E.seats + ' 名</small><strong>' + num(E.reference.lastSeat) + ' 票</strong><small>還差 ' + num(Math.max(0, E.reference.lastSeat - r.you)) + ' 票</small></div></div></section>';
    return panel('新的一局', G.DAYS * roundDays + ' 天 · ' + G.DAYS + ' 回合', '<h2 class="intro-title">從公館商圈到貓空茶園，搶下大安文山區一席。</h2><p class="intro-goal">票數前 ' + SEATS + ' 名當選。去對的地方、說對的話，票就是你的。</p>' + matchup + routePlan(preview) + '<ul class="intro-reading"><li><b>點地圖出發</b>：每個地點的人群不同，他們會直接講要什麼。</li><li><b>看研究回應</b>：＋／− 表示三群反應；沒研究時看不到。</li></ul>');
  }
  // The vote bank as three vote targets that add up to the seat line.
  function routePlan(s) {
    const r = G.routeView?.(s);
    return r ? '<section class="route-plan"><div class="card-head"><b>基本盤目標</b><span>' + esc(r.title) + '</span></div><p class="route-goals">' + [r.group, r.partner, 3 - r.group - r.partner].map(k => { const t = r.targets[k]; return '<span class="g-' + GROUP_KEYS[k] + (t.focus ? ' focus' : '') + '"><i class="dot"></i>' + esc(t.title) + (k === r.group ? '★' : '') + ' <b>' + num(t.votes) + '</b></span>'; }).join('') + '</p><p class="route-sum">加起來 ' + num(r.targets.reduce((n, t) => n + t.votes, 0)) + ' 票＝當選線</p></section>' : '';
  }
  function openingChoices() {
    const choices = [['canvass', '先跑地方', '跑熟地方取得里長支持，讓小隊留守，再去別處拓票。'], ['prepare', '先準備政見', '先研究一題，再帶政見上節目，爭取接續曝光。'], ['online', '先做直播', '先接觸青年，再看反應調整議題；需要助手控場。']];
    return '<section class="opening-picks" aria-label="第一回合先做什麼"><h3>第一回合先做什麼？</h3><p>先安排首站，出發前仍能改行程。</p>' + choices.map(([id, title, note]) => '<button data-action="opening" data-kind="' + id + '" aria-pressed="' + (openingPick === id) + '"><b>' + title + '</b><small>' + note + '</small></button>').join('') + '</section>';
  }
  function dockIntro() {
    const bg = G.BACKGROUNDS[state.settings.background], party = G.PARTIES[state.settings.affiliation];
    return '<div class="dock-intro">' + identityCards() + partyCards() + openingChoices() + '<div class="start-row"><span class="step">3</span><p>你是<b>' + esc(G.candidateName(state.settings)) + '</b>（' + esc(party.title) + '・' + esc(bg.title) + '）。開始後不能再換。</p><button class="primary-button" data-action="start">開始競選 →</button></div></div>';
  }

  /* ---------- planning ---------- */
  const helpers = () => (state.player.team?.members || []).filter(m => m.hiredDay < state.day).length;
  const researchCapacity = () => Math.max(0, helpers() - (booth ? 1 : 0));
  function staffSummary(p) {
    const count = task => p.teamAssignments.filter(x => x.task === task).length;
    const parts = [[count('research'), '研究'], [count('booth'), '募款攤'], [count('stream'), '直播'], [count('follow'), selectedAction === 'fundraise' ? '陪同募款' : '同行'], [count('canvass'), '自行拉票']].filter(([n]) => n).map(([n, label]) => label + ' ' + n + ' 人');
    return '<p class="staff-summary"><b>本回合人力 ' + p.teamAssignments.length + ' 人</b>・' + (parts.join('／') || '沒有可派遣的助手') + '<small>同一人只能做一件事；研究成果下回合可用。</small>' + (p.staffingNote ? '<small>' + esc(p.staffingNote) + '</small>' : '') + '</p>';
  }
  // The issues this destination may ask about: a place's pool, TV's three, the debate's announced question.
  function askPool() { if (!['canvass', 'tv', 'online', 'debate'].includes(selectedAction)) return []; const route = G.itinerary(state, selectedAction, planConfig()); return route.topic ? [route.topic] : route.pool || []; }
  // By default an assistant researches the likeliest issue you have not looked into; you can pick another one or none.
  // The issues the research row offers: the ones that may come up here first, then the hottest others, four in all.
  function researchChoices() { const pool = askPool(); return { pool, others: (G.landscapeView(state).ranking || []).map(r => r.topic).filter(t => G.topicsOf(state).includes(t) && !pool.includes(t)).slice(0, Math.max(0, 4 - pool.length)) }; }
  // Assistants research only on a preparation round; each free one takes one picked issue.
  function researchTopic() { return selectedAction === 'prepare' || onSite(selectedAction) || behind(selectedAction) ? researchPick.slice(0, helpers()) : null; }
  const planConfig = () => ({ donor: selectedAction === 'fundraise' ? donor : null, venue: plannedVenue(), ...(selectedAction === 'prepare' && selectedTopic ? { topic: selectedTopic } : {}), gifts: gifts && onSite(selectedAction), billboard: billboard && onSite(selectedAction), research: researchTopic(), deep: deepOn, booth, investigate: investigateOn, gotv: gotvOn, brief: selectedAction === 'tv' ? brief : null, respond: selectedAction === 'tv' && respondOn, expose: ['tv', 'online', 'press'].includes(selectedAction) ? exposePick : null, ...(campaignSelection()?.config || {}), revise: true });
  // Four candidates tell where you stand: first place, the last seat, you and 小馬; the 25 others are at last election's totals, you and 小馬 at today's estimates.
  function ladderMarkup() {
    const rows = G.ladderView(state).filter(r => r.rank === 1 || r.rank === SEATS || r.id <= 1);
    let html = '', last = 0;
    for (const r of rows) { if (last && r.rank > last + 1) html += '<li class="lad-gap" aria-hidden="true">⋯</li>'; html += '<li class="' + [r.id === 0 ? 'lad-me' : '', r.elected ? 'lad-in' : '', r.rank === G.ELECTION.seats ? 'lad-last' : ''].filter(Boolean).join(' ') + '"><span>' + r.rank + '</span><b>' + esc(r.id === 0 ? '你' : r.name) + '</b><strong>' + num(r.votes) + '</strong></li>'; last = r.rank; }
    return '<ol class="ladder" aria-label="第一名、當選線、你和小馬的名次">' + html + '</ol>';
  }
  // The share of every group a seat needs if all three gave you the same.
  const validVotes = () => G.ELECTION.registered * G.ELECTION.turnout * (1 - G.ELECTION.invalid), linePct = () => G.LINE / validVotes() * 100;
  // Your place against the line, the four candidates that matter and the staff's estimate for the three groups; the totals live in the header.
  function raceBoard(compact = false, before = null, ladder = false) {
    if (!state.started) return '';
    const r = G.raceView(state), gap = r.you - r.line, moved = before?.you == null ? '' : '<small class="' + (r.you - before.you >= 0 ? 'up' : 'down') + '">本回合 ' + signedVotes(r.you - before.you) + '</small>';
    const bloc = !compact && (r.bloc.you || r.bloc.rival) ? '<p class="race-bloc">組織票：你 ' + num(r.bloc.you) + '｜小馬 ' + num(r.bloc.rival) + '</p>' : '';
    return '<section class="race-board" aria-label="選情"><div class="race-head"><b>選情</b><span>當選線（估）：上一屆第 ' + SEATS + ' 名 ' + num(r.line) + ' 票</span></div>' + '<p class="race-gap ' + (gap >= 0 ? 'ahead' : 'behind') + '">現在開票：第 ' + r.rank + ' 名，' + (gap >= 0 ? '過線約 ' + num(gap) + ' 票' : '還差約 ' + num(-gap) + ' 票') + moved + '</p>' + (ladder ? ladderMarkup() : '') + (compact ? '' : estimateBars()) + bloc + '</section>';
  }
  // Staff's guess at your support in each group as a range, against the share a seat needs; a poll round's range is narrow and says 民調.
  const rangeText = g => { const f = n => Number(n).toLocaleString('zh-TW', { maximumFractionDigits: 1 }); return (f(g.lo) === f(g.hi) ? f(g.lo) : f(g.lo) + '–' + f(g.hi)) + '%'; };
  function estimateBars() {
    // With a vote bank each group is measured against its own target, and the shortfall points at that group's home places.
    const e = G.supportEstimate(state), r = G.routeView?.(state), need = linePct(), goal = k => r ? r.targets[k].pct : need, max = Math.max(...e.groups.map((g, k) => goal(k) * 1.4), ...e.groups.map(g => g.hi)) || 1, at = v => Math.min(100, v / max * 100);
    const gap = (g, k) => (goal(k) - (g.lo + g.hi) / 2) / goal(k), short = r ? e.groups.map((g, k) => ({ g, k })).filter(x => r.targets[x.k].focus && r.targets[x.k].status !== 'ahead').sort((a, b) => gap(b.g, b.k) - gap(a.g, a.k))[0] : null;
    const weak = r ? short?.g || null : (e.poll && e.groups.find(g => g.id === G.pollView(state).latest?.focus)) || e.groups.reduce((a, g) => g.lo + g.hi < a.lo + a.hi ? g : a), wk = weak ? e.groups.indexOf(weak) : -1;
    const places = wk < 0 ? [] : wk === 2 && r ? ['直播間'] : G.venueView(state).filter(v => v.main === wk).map(v => v.title), behind = weak && weak.lo < goal(wk);
    const tip = r ? '幕僚按你的行程估各群挺你的比例，離上次民調越久範圍越寬。黑線是基本盤（' + r.title + '）給各群的目標，三群都到就剛好過當選線。在' + r.homeTitles.join('、') + '拉票，接觸的人更多。' : '幕僚按你的行程估各群挺你的比例。離上次民調越久，範圍越寬；民調當回合最準。黑線是當選約需的比例。';
    return '<div class="sup-est"' + (r ? ' data-route="' + esc(r.id) + '"' : '') + ' role="group" aria-label="幕僚估計"><div class="sup-head"><b>幕僚估計</b>' + (e.poll ? '<span class="sup-tag">民調</span>' : '') + info(tip) + '<span>' + (r ? '基本盤：' + esc(r.title) : '當選約需 ' + need.toFixed(1) + '%') + '</span></div>'
      + e.groups.map((g, k) => { const status = r ? r.targets[k].status : g.lo >= need ? 'ahead' : g.hi < need ? 'behind' : 'near'; return '<div class="sup-row g-' + GROUP_KEYS[k] + ' ' + status + (r && r.group === k ? ' main' : '') + (r && !r.targets[k].focus ? ' minor' : '') + '"><span class="sup-name"><span class="dot"></span>' + esc(g.title) + (r && r.group === k ? '<i class="sup-star" aria-label="主力">★</i>' : '') + '</span><span class="sup-bar"><i class="sup-range" style="left:' + at(g.lo).toFixed(1) + '%;width:' + Math.max(1.5, at(g.hi) - at(g.lo)).toFixed(1) + '%"></i><i class="need-mark" style="left:' + at(goal(k)).toFixed(1) + '%"></i></span><b class="sup-num">' + rangeText(g) + '</b>' + (r ? '<span class="sup-goal">目標 ' + fixed1(goal(k)) + '%</span>' : '') + '</div>'; }).join('')
      + (behind || e.next ? '<div class="sup-foot">' + (behind ? '<span>最缺' + esc(weak.title) + (places.length ? (r ? '，去' : '，多在') + places.map(esc).join('、') : '') + '</span>' : '') + (e.next ? '<span>下次民調：第 ' + e.next + ' 回合</span>' : '') + '</div>' : '') + '</div>';
  }
  // The district, its three groups of voters, who you are and your party's three issues; the rules behind them show up where they bite.
  // The origin in play, under the candidate's name.
  function profileOrigin() {
    const o = G.originView?.(state);
    return o ? '<p class="profile-origin"><b>出身</b><span>' + esc(o.title) + '</span><em class="og">＋' + esc(o.good) + '</em><em class="ob">－' + esc(o.bad) + '</em>' + info(o.info) + '</p>' : '';
  }
  // The vote bank in play: its group and places, the perk behind (i).
  function profileBase() {
    const b = G.baseView?.(state);
    return b ? '<p class="profile-origin profile-base g-' + GROUP_KEYS[b.group] + '"><b>基本盤</b><span>' + esc(b.title) + '</span><em class="og">＋' + esc(b.perk) + '</em>' + info(b.perk + '：' + b.perkText) + '</p>' : '';
  }
  function profileCard() {
    const E = G.ELECTION, bg = G.BACKGROUNDS[state.settings.background], p = G.partyView(state), [, place, areas] = /^(.+?)（(.+)）$/.exec(E.district) || [, E.district, ''];
    const groups = G.groupView(state).map((g, k) => '<div class="group-row g-' + GROUP_KEYS[k] + '"><span class="group-name"><span class="dot"></span>' + esc(g.title) + ' <small>' + Math.round(g.share * 100) + '%</small></span><span class="group-top">' + (g.top ? '最在意：' + esc(short(g.top)) : '') + '</span><span class="group-trait">打包票：' + esc(g.promiseTitle) + '</span>' + (g.rule ? '<span class="group-rule">' + esc(g.rule === 'fresh' ? '想要新面孔，好感 ×' + g.lift : '覺得你靠家族，好感 ×' + g.lift) + '</span>' : '') + '</div>').join('');
    const line = p.line.length ? '<p class="party-chips"><span>黨的立場</span>' + p.line.map(x => '<b title="' + esc(x.text) + '">' + esc(x.short) + '</b>').join('') + '</p>' : '';
    return '<section class="profile-card" style="--party:' + esc(p.color) + '" aria-label="選區與你"><div class="card-head"><b>' + esc(place) + '</b><span>' + esc([areas, E.seats + ' 席', '選民 ' + Math.round(E.registered / 10000) + ' 萬'].filter(Boolean).join('・')) + '</span></div><p class="profile-me">' + partyBadge(p.party) + '<b>' + esc(state.player.name) + '</b><span>' + esc(bg.title) + '・團隊 ' + ((state.player.team?.members?.length || 0) + 1) + ' 人</span></p>' + profileOrigin() + profileBase() + groups + line + '</section>';
  }
  // Breaking the party line also cuts party aid still to come; said on the answer that breaks it and in the recap.
  function aidAtStake(breaks) {
    const a = G.partyView(state).aid, left = a ? [a.subsidyDay > state.day ? '補助' : '', a.mobilizeDay > state.day ? '動員' : ''].filter(Boolean) : [];
    return left.length && breaks ? '黨部' + left.join('和') + (breaks >= 2 ? '都沒了' : '打五折') : '';
  }
  function breachesAfter(topic) { const line = G.partyLine(state, 0, topic), last = G.lastPlan(state.player, topic); return G.partyView(state).aid?.breaks + (line && !(last && last.answer !== line) ? 1 : 0); }
  // Who each broker looks like when they come to ask.
  const BROKER_LOOK = { developer: 'middle', temple: 'elder', chiefs: 'elder2', merchants: 'shop2', faction: 'middle2', media: 'host' };
  const brokerFace = id => Art?.avatar ? '<span class="deal-face" aria-hidden="true">' + Art.avatar(BROKER_LOOK[id] || 'resident') + '</span>' : '';
  const dealLine = d => esc(String(d.pitch || '').replace(/^[^「]*(?=「)/, '') || '「請你公開支持' + d.planText + '。」');
  // A deal in two columns: what you get, and what it costs as one plain line on whom it may upset, plus the party line or a flip.
  function dealFacts(d, stake = '') {
    const down = d.faces.map((f, g) => f === 'down' ? groupTitle(g) : '').filter(Boolean), known = d.faces.some(f => f !== 'unknown');
    const gets = [d.money ? '捐款 ' + wan(d.money) : '', d.bloc ? '組織票約 ' + num(d.bloc) + ' 票' : '', d.perk === 'tv' ? '一次免費上節目' : ''].filter(Boolean);
    const costs = [G.BROKERS[d.id]?.cost || (down.length ? '可能得罪' + down.join('、') : known ? '' : '可能得罪反對這個做法的人'), d.id === 'developer' ? '之後容易爆黑料' : '', d.partyLine && !d.partyLine.keeps ? '違反黨的立場' + (stake ? '：' + stake : '') : '', d.flip ? '等於改口' : ''].filter(Boolean);
    return { gets, costs: costs.length ? costs : ['看不出誰會不滿'] };
  }
  function dealColumns(d, stake = '') {
    const { gets, costs } = dealFacts(d, stake);
    const col = (cls, title, list) => '<span class="deal-col ' + cls + '"><b>' + title + '</b>' + (list.length ? list : ['看不出誰會不滿']).map(x => '<span>' + esc(x) + '</span>').join('') + '</span>';
    return '<span class="deal-cols">' + col('deal-get', '拿到', gets) + col('deal-cost', '代價', costs) + '</span>';
  }
  // A broker asks in person: one line from them, what you get and what it costs, then accept or decline; deciding takes no round.
  function offerCard(o) {
    const stake = o.partyLine && !o.partyLine.keeps ? aidAtStake(breachesAfter(o.topic)) : '';
    return '<article class="offer-card deal-card" id="offer-card"><div class="deal-head">' + brokerFace(o.id) + '<span class="deal-who"><b>' + esc(o.name || o.org) + '</b><small>' + esc(o.org) + '</small></span><span class="deal-when">不占回合</span></div><p class="deal-line">' + dealLine(o) + '</p>' + dealColumns(o, stake) + '<div class="offer-actions"><button data-action="offer" data-choice="accept">收下</button><button data-action="offer" data-choice="decline">婉拒<small>小馬可能接下</small></button></div></article>';
  }
  // Everything here is visible information the player can act on this round; nothing reads hidden voter state.
  function crisisCard(c) {
    const can = state.budget.available >= G.COSTS.crisis;
    const rival = c.by === 'rival', who = (c.byName || '其他候選人') + '陣營';
    return '<article class="crisis-card" id="crisis-card"><div class="card-head"><b>對手爆料・' + esc(who) + '</b><span>出發前要先處理</span></div><p class="crisis-text">' + esc(c.text) + '</p><div class="crisis-actions"><button data-action="crisis" data-choice="pay"' + (can ? '' : ' disabled aria-disabled="true"') + '><b>發澄清文宣</b><small>' + wan(G.COSTS.crisis) + '・救回一部分' + (can ? '' : '（錢不夠）') + '</small></button><button data-action="crisis" data-choice="apologize"><b>公開道歉切割</b><small>免費・你票最多的那群掉票</small></button><button data-action="crisis" data-choice="fight"><b>硬槓反控' + (rival ? '小馬' : '') + '</b><small>免費・五五波：同黨或吃承諾的人力挺，或炎上掉更多</small></button></div><p class="crisis-note">三種都會掉票' + info('澄清文宣只救回一部分，仍掉道歉的三分之一左右；硬槓贏了反而加票' + (rival ? '，小馬也掉票' : '') + '，輸了掉得比道歉多。' + (rival && c.grudge ? '你爆過他的料，他這是回擊。' : '')) + '</p></article>';
  }
  // Everything here is visible information the player can act on this round; nothing reads hidden voter state.
  function situationMarkup() {
    const f = G.forecast(state), lv = G.landscapeView(state), rumor = G.rumorView(state), due = G.pendingChallenges(state), rows = [], soon = G.upcomingOffer(state), tip = G.eventView(state).tip, act = G.actOf(state.day);
    const aidToday = (state.partyAid || []).find(x => x.day === state.day);
    if (aidToday) rows.push(['黨部', aidToday.kind === 'subsidy' ? (aidToday.money ? '撥款 ' + wan(aidToday.money) : '違反黨的立場太多題，補助沒了') : (aidToday.votes ? '動員同黨選民，約 ' + num(aidToday.votes) + ' 票' : '違反黨的立場太多題，黨部不動員'), aidToday.breaks ? 'warn' : '']);
    if (act.from === state.day) rows.push(['新階段', act.title + '：' + ['', '摸清三群、找第一桶金', '議題升溫、可能被爆料、頭人來談', '政見會、選前催票'][act.id], '', '', ['', '', '這一幕可能被爆料；頭人也會來談合作。', '第 ' + G.DEBATE_ROUND + ' 回合政見會；第 ' + G.GOTV_FROM + ' 回合起可以選前催票。'][act.id]]);
    // Crisis handling, clarifying leaflets and the clean pledge take effect at once, so their result shows before setting out.
    const crisis = state.crisis?.resolvedDay === state.day ? state.crisis : null;
    if (crisis?.effect) rows.push(['危機', ({ pay: '發澄清文宣', apologize: '公開道歉切割', fight: crisis.won ? '硬槓反控成功' : '硬槓反控炎上' })[crisis.choice] + ' → 你 ' + signedVotes(crisis.effect.votes) + ' 票' + (Math.abs(crisis.effect.rival || 0) >= 1 ? '；小馬 ' + signedVotes(crisis.effect.rival) + ' 票' : ''), crisis.effect.votes < 0 ? 'warn' : '']);
    for (const c of (state.challenges || []).filter(c => c.mitigatedDay === state.day && c.mitigation)) rows.push(['澄清', '澄清文宣挽回一部分 → ' + signedVotes(c.mitigation.votes) + ' 票', '']);
    const pledged = state.events?.tip?.pledged;
    if (pledged?.day === state.day) rows.push(['宣示', '宣示乾淨選戰 → ' + signedVotes(pledged.votes) + ' 票', '']);
    for (const c of due) { const where = c.venues.map(v => venues[v]?.title).filter(Boolean).join('、'); rows.push(['要回應', '小馬' + (c.kind === 'guarantee' ? '說你的保證「' + c.quote + '」做不到' : '批評你的「' + c.quote + '」') + '（' + signedVotes(c.hit) + ' 票）。' + (c.deadline <= state.day ? '這回合' : '兩回合內') + '去' + where + '或上電視回應', 'warn', '<button class="mini-button" data-action="clarify" data-id="' + esc(c.id) + '"' + (state.budget.available < c.clarifyCost ? ' disabled aria-disabled="true"' : '') + '>發澄清文宣・' + wan(c.clarifyCost) + '</button>', '澄清文宣只救回一部分；不理他，逾期會再掉票。']); }
    if (rumor) rows.push(['傳聞', rumor.text.replace(/。$/, '') + '（' + rumor.reliability + '）。', 'is-rival']);
    if (soon) rows.push(['下回合', soon.org + '來談合作，要你支持「' + soon.planText + '」', '']);
    if (lv.debate && state.day < G.DEBATE_ROUND) rows.push(['政見會', '第 ' + lv.debate.round + ' 回合，題目「' + lv.debate.title + '」', '']);
    const file = G.fileView(state), unchecked = file.items.some(x => ['unverified', 'checking'].includes(x.status) && x.ready !== false);
    if (file.items.length || file.dig.allowed) rows.push(['黑料', file.ready ? file.ready + ' 份料站得住，可以爆' : unchecked ? '有料還沒查證' : '可以派人挖小馬的料', file.ready ? 'good' : '', '<button class="mini-button" data-action="file">打開黑料檔案</button>', unchecked && !file.ready ? '沒查證就爆，料不實會反咬你。' : '']);
    if (tip?.canPledge) rows.push(['乾淨選戰', '料站不住。宣示不打烏賊戰，討厭空話的人加分', '', '<button class="mini-button" data-action="pledge">宣示乾淨選戰・免費</button>']);
    const record = state.player.actions.find(a => a.record === true);
    if (record && stanceOf(record.topic)?.record) rows.push(['你的紀錄', '上一屆你主張「' + record.quote + '」', '', '', '改口的話，記得這句話的人會不滿。']);
    if (lv.surge) rows.push(['升溫', '「' + lv.surge.title + '」' + (lv.surge.status === 'announced' ? '下回合起變熱門。' : '正熱門，到第 ' + lv.surge.until + ' 回合。'), '']);
    if (f.now.id === 'rain') rows.push(['天氣', '下雨：街上人少四分之一，電視照常', '']);
    return rows.length ? '<section class="situation" aria-label="本回合局勢">' + rows.map(([k, t, cls, extra, more]) => '<p class="situation-row ' + (cls || '') + '"><b>' + k + '</b><span>' + esc(t) + info(more) + (extra ? '<br>' + extra : '') + '</span></p>').join('') + '</section>' : '';
  }
  // The poll as news: your rank, and the group that moved most since the poll before (the first poll names the weakest group).
  function pollNewsText(n) {
    return '你第 ' + n.rank + ' 名' + (n.rankBefore != null && n.rankBefore !== n.rank ? '（上次第 ' + n.rankBefore + ' 名）' : '') + '・' + (n.moved ? n.moved.title + '變動最大（' + pct(n.moved.from) + ' → ' + pct(n.moved.to) + '）' : n.weakest.title + '最弱（' + pct(n.weakest.pct) + '）');
  }
  function pollNewsRow() {
    const n = G.pollNews(state).find(x => x.day === state.day);
    return n ? '<div class="poll-news" role="status"><b>第 ' + n.day + ' 回合民調出爐</b><span>' + esc(pollNewsText(n)) + '</span></div>' : '';
  }
  function carryRow() {
    const known = state.player.known.filter(t => t !== 'tip');
    return '<section class="carry"><b>查過的議題</b>' + (known.length ? known.map(id => '<button class="text-button" data-action="dossier" data-topic="' + esc(id) + '">' + esc(short(id)) + (state.player.insight?.[id]?.level === 'precise' ? '・深入' : '・方向') + '</button>').join('') : '<span>還沒有</span>') + '</section>';
  }
  // Invitations appear when actionable and use the ordinary outing and its one-round cost.
  function campaignSelection() {
    if (!campaignPick || !G.campaignView) return null;
    const c = G.campaignView(state);
    if (campaignPick === 'followup') return c.followup?.allowed ? c.followup : null;
    return c.opportunity?.status === 'open' ? c.opportunity.choices.find(x => campaignPick === 'opportunity:' + x.id && x.allowed) || null : null;
  }
  function campaignCard(actionableOnly = false) {
    const c = G.campaignView?.(state); if (!c) return '';
    const o = c.opportunity, opportunity = o?.status === 'open' ? '<section class="campaign-clash" aria-label="撞期邀約"><h3>今天兩場邀約，只能親自去一場</h3><p>' + esc(o.text) + '</p><div class="campaign-options">' + o.choices.map(x => '<article class="campaign-option' + (campaignPick === 'opportunity:' + x.id ? ' selected' : '') + '"><h4>' + esc(x.title) + '</h4><p class="campaign-gain">拿到：' + esc(x.gain) + '</p><p class="campaign-cost">代價：' + esc(x.cost) + '</p><button class="mini-button" data-action="campaign-opportunity" data-id="' + esc(x.id) + '"' + (!x.allowed ? ' disabled aria-disabled="true"' : '') + '>' + (campaignPick === 'opportunity:' + x.id ? '已排入行程' : '選這場 →') + '</button>' + (!x.allowed && x.reason ? info(x.reason) : '') + '</article>').join('') + '</div></section>' : o?.status === 'missed' || o?.status === 'taken' ? '<p class="campaign-missed">' + esc(o.text) + '</p>' : '';
    const assets = c.assets?.length ? '<div class="campaign-assets">' + c.assets.map(a => '<p data-campaign-asset="' + esc(a.id) + '"><b>' + esc(a.title) + '</b>' + info(a.text) + '</p>').join('') + '</div>' : '';
    const f = c.followup, followup = f ? '<div class="campaign-followup"><b>' + esc(f.title) + '</b><p class="followup-fit">' + esc(f.text) + '</p><button class="mini-button" data-action="campaign-followup"' + (!f.allowed ? ' disabled aria-disabled="true"' : '') + '>接續直播 →</button>' + (!f.allowed && f.reason ? '<small>' + esc(f.reason) + '</small>' : '') + '</div>' : '';
    return opportunity || assets || followup || c.latest ? '<section class="campaign-card">' + (actionableOnly && o?.status !== 'open' ? '' : opportunity) + (actionableOnly ? '' : assets) + followup + (!actionableOnly && c.latest ? '<p class="campaign-latest">第 ' + c.latest.round + ' 回合・' + esc(c.latest.title) + info(c.latest.text) + '</p>' : '') + '</section>' : '';
  }
  // The command desk shows consequences before the player chooses the next outing.
  function roundBriefing() {
    const race = G.raceView(state), rumor = G.rumorView(state), gap = race.you - race.line;
    const advisor = window.CampaignAdvisor?.render(G, state, { opening: openingPick, selectedAction, selectedVenue }) || '<p class="round-objective">每回合只能親自安排一個行程；助手可以分頭研究、募款或拉票。</p>';
    return '<section class="round-briefing"><div class="card-head"><b>第 ' + state.day + ' 回合／' + G.DAYS + '</b><span>還有 ' + (G.DAYS - state.day + 1) + ' 次行程</span></div>' + advisor + (!window.CampaignAdvisor && rumor ? '<p class="rival-intel"><b>本回合情報</b> ' + esc(rumor.text) + ' <small>' + esc(rumor.reliability) + '</small></p>' : '') + '<button class="briefing-intel" data-action="intel">選情與情報：你第 ' + race.rank + ' 名・' + (gap < 0 ? '距當選線 ' : '超過當選線 ') + num(Math.abs(gap)) + ' 票 ▸</button></section>';
  }
  function networkOrders() {
    const n = G.networkView?.(state); if (!n?.active) return '';
    const choices = (list, chosen) => list.map(x => '<option value="' + esc(x.id) + '"' + (x.id === chosen ? ' selected' : '') + '>' + esc(x.title) + '</option>').join('');
    const destination = n.venues.find(x => x.id === n.venue)?.title || '未安排地點', policy = n.topics.find(x => x.id === n.topic);
    return '<details class="network-orders" aria-label="地方小隊安排"><summary>地方小隊：' + esc(destination) + '・' + esc(policy ? short(policy.id) + '政見' : '待公開政見') + '</summary>' + (n.topics.length ? '<label>地點<select data-network="venue">' + choices(n.venues, n.venue) + '</select></label><label>公開政見<select data-network="topic">' + choices(n.topics, n.topic) + '</select></label><p>' + esc(n.topics.find(x => x.id === n.topic)?.quote || '') + '</p>' : '<p>先公開一條具體政見，小隊才有內容替你說。</p>') + '<small>你跑其他行程，小隊照這個安排拉票。</small></details>';
  }
  function debateReminder() {
    if (state.day !== G.DEBATE_ROUND || state.phase !== 'plan') return '';
    const p = G.preview(state, 'debate', { research: [] });
    return '<section class="debate-reminder"><b>本回合：政見發表會</b><p>小馬也在台上。這次機會過了就沒有了。</p><button class="primary-button" data-action="debate-now"' + (!p.allowed ? ' disabled aria-disabled="true"' : '') + '>去政見會 →</button>' + (!p.allowed ? '<small>' + esc(p.reason) + '</small>' : '') + '</section>';
  }
  function pendingDecisions() {
    const offer = G.offerView(state), c = G.campaignView(state), due = G.pendingChallenges(state);
    const challenges = due.map(x => '<article class="challenge-decision"><b>小馬質疑「' + esc(short(x.topic)) + '」</b><p>「' + esc(x.quote) + '」・' + (x.deadline <= state.day ? '這回合最後期限' : '下回合結束前回應') + '</p><div>' + x.venues.map(v => '<button data-action="respond-challenge" data-kind="canvass" data-venue="' + esc(v) + '">到' + esc(venues[v]?.title || v) + '回應</button>').join('') + '<button data-action="respond-challenge" data-kind="tv">上電視回應</button></div></article>').join('');
    const scheduled = campaignSelection();
    const invitation = c.opportunity?.status === 'open' || c.followup ? (scheduled ? '<details class="briefing-disclosure"><summary>已排入' + esc(scheduled.title) + '・更換邀約</summary>' + campaignCard(true) + '</details>' : campaignCard(true)) : '';
    const content = (state.crisis?.status === 'pending' ? crisisCard(state.crisis) : '') + debateReminder() + challenges + (offer ? offerCard(offer) : '') + invitation;
    const crisis = state.crisis, receipt = crisis?.status === 'resolved' && crisis.resolvedDay === state.day ? '<p class="mobile-crisis-result" role="status"><b>' + esc(crisisChoice(crisis)) + '</b>・' + signedVotes(crisis.effect.votes) + ' 票' + info('處理支出：' + money(state.ledger.find(l => l.day === crisis.resolvedDay && l.action === 'crisis')?.cost || 0)) + '</p>' : '';
    return receipt + (content ? '<details class="pending-decisions"' + (!selectedAction || state.crisis?.status === 'pending' ? ' open' : '') + '><summary>臨時邀約與事件・' + (due.length + Number(!!offer) + Number(!!invitation) + Number(state.crisis?.status === 'pending') + Number(state.day === G.DEBATE_ROUND)) + ' 件待看</summary><p class="decision-guide">行程邀約與到場回應會取代主行程。合作提案不占回合；危機的代價另列。</p>' + content + '</details>' : '');
  }
  function planPanel() {
    return '';
  }
  function intelMarkup() {
    const offer = G.offerView(state), c = G.campaignView?.(state);
    return (state.crisis?.status === 'pending' ? crisisCard(state.crisis) : '') + (offer ? offerCard(offer) : '') + pollNewsRow() + campaignCard() + raceBoard(false, null, true) + (c?.rival?.text ? '<p class="campaign-rival"><b>' + esc(c.rival.title) + '</b> ' + esc(c.rival.text) + '</p>' : '') + situationMarkup() + profileCard() + carryRow();
  }
  // Destinations as buttons on the map, and as a list under it.
  function destinations() {
    const list = [];
    const chiefs = Object.fromEntries((G.chiefView?.(state) || []).map(c => [c.venue, c]));
    // The map names each place's own issue (its strongest local theme among what it may ask), not the crowd's biggest concern everywhere.
    const theme = v => { const aff = G.VENUES[v.id]?.affinity || {}; return [...v.pool].sort((a, b) => (aff[b] || 1) - (aff[a] || 1))[0]; };
    for (const v of G.venueView(state)) list.push({ kind: 'canvass', venue: v.id, title: v.id === 'plaza' && state.day === G.DEBATE_ROUND ? v.title + '・政見會' : v.title, sub: v.mainTitle + '多・' + (v.challenged ? '問小馬的批評' : '常問' + short(theme(v))), group: v.main, boards: v.billboards, chief: chiefs[v.id] || null });
    list.push({ kind: 'tv', title: '中立新聞台', sub: '長輩、中年多・三選一' });
    list.push({ kind: 'online', title: '直播間', sub: '青年多・用助手、不花錢' });
    list.push({ kind: 'prepare', title: '競選工作室', sub: '研究・招募・募款・檔案' });
    return list;
  }
  const isSelected = d => (d.kind === 'canvass' ? onSite(selectedAction) && plannedVenue() === d.venue : d.kind === 'tv' ? ['tv', 'press'].includes(selectedAction) : d.kind === 'prepare' ? ['prepare', 'dig', 'fundraise', 'recruit'].includes(selectedAction) : selectedAction === d.kind);
  // The dirt file at the campaign office: one place to see what you hold on 小馬 and to dig, check or release it.
  function officeActions() {
    return '<nav class="office-actions" aria-label="工作室行程">' + [['prepare','研究'],['fundraise','募款'],['recruit','招募'],['dig','挖料']].map(([id,title]) => '<button data-action="select-action" data-kind="' + id + '" aria-pressed="' + (selectedAction === id) + '">' + title + '</button>').join('') + '<button data-action="file">黑料檔案</button></nav>';
  }
  // On the map: whether the main crowd at a place (the young, on the stream) is one the route counts on, and how far along it is.
  const CUE_TEXT = { ahead: '達標', near: '接近', behind: '落後' };
  const routeCue = c => c?.focus && c.status ? '<span class="route-cue ' + c.status + (c.main ? ' main' : '') + '" title="' + esc('基本盤' + (c.main ? '主力' : '') + '：' + c.title + '目標 ' + fixed1(c.pct) + '%，幕僚估計' + CUE_TEXT[c.status]) + '"><i aria-hidden="true">' + (c.main ? '★' : '◆') + '</i>' + esc(c.title + CUE_TEXT[c.status]) + '</span>' : '';
  function hotspots() {
    if (!state.started || state.phase !== 'plan') return '';
    const cues = G.routeCues?.(state) || {}, rumor = G.rumorView(state), due = G.pendingChallenges(state), rumorSpot = rumor ? (rumor.action === 'canvass' ? rumor.venue : rumor.action === 'tv' ? 'tv' : rumor.action === 'debate' ? 'debate' : null) : null;
    return destinations().map(d => {
      const key = d.venue || d.kind, p = Art?.isToy?.() ? Art.spot(key) : HOTSPOTS[key] || anchors.start, selected = isSelected(d), canAnswer = d.kind === 'tv' ? due.length > 0 : d.kind === 'canvass' && due.some(c => c.venues.includes(d.venue));
      return '<button class="hotspot' + (d.kind === 'canvass' ? ' venue g-' + GROUP_KEYS[d.group] : ' building') + (selected ? ' selected' : '') + '" style="left:' + (p.x / 12).toFixed(2) + '%;top:' + (p.y / 6.5).toFixed(2) + '%" data-action="select-action" data-kind="' + d.kind + '"' + (d.venue ? ' data-venue="' + d.venue + '"' : '') + ' aria-pressed="' + selected + '"' + (d.disabled ? ' disabled aria-disabled="true"' : '') + ' aria-label="' + esc(d.title + '：' + d.sub + (cues[key]?.focus && cues[key].status ? '；基本盤' + cues[key].title + CUE_TEXT[cues[key].status] : '')) + '"><span class="pin">' + icon(d.kind) + '</span><span class="hotspot-label"><b data-short="' + esc(({market:'市場',temple:'廟口',street:'路口',plaza:'社區',river:'河濱',tv:'電視',online:'直播',prepare:'工作室',fundraise:'募款',recruit:'招募',file:'檔案',debate:'政見會'})[d.venue || d.kind] || d.title) + '">' + esc(d.title) + '</b><small>' + esc(d.sub) + '</small></span>' + (canAnswer ? '<span class="badge warn">回應</span>' : '') + (rumorSpot === key ? '<span class="badge rival">小馬?</span>' : '') + routeCue(cues[key]) + (d.boards ? '<span class="badge board">看板 ' + d.boards + '</span>' : '') + (d.chief ? '<span class="badge chief' + (d.chief.broken ? ' won' : '') + '" title="' + esc(d.chief.name + (d.chief.broken ? '挺你' : '：去了 ' + d.chief.visits + '／' + d.chief.need + ' 次')) + '">' + (d.chief.broken ? '里長挺你' : '里長 ' + d.chief.visits + '/' + d.chief.need) + '</span>' : '') + '</button>';
    }).join('');
  }
  // Where a chief holds the place: still a stranger, about to come round, or already on your side.
  function chiefLine(c) {
    if (!c) return '';
    return '<p class="dock-info chief-line' + (c.broken ? ' won' : '') + '">' + (c.broken ? esc(c.name) + '挺你：這裡的人更願意聽' + info('也不會因為你常來而膩。') : c.breaks ? '這次去，' + esc(c.name) + '會點頭：組織票約 ' + num(G.TUNING.chief.bloc) : esc(c.name) + '還不熟你（' + c.visits + '／' + c.need + ' 次）：效果打折' + info('去滿 ' + c.need + ' 次，里長點頭幫你，帶來組織票。')) + '</p>';
  }
  // Raising money: a small drive with no strings, or a visit to a broker who pays for a public stance; each card reads like the offer card.
  function donorCards() {
    const card = (id, title, gets, terms, costs, status = '') => '<button class="donor-card donor-row" data-action="donor" data-id="' + esc(id) + '" aria-pressed="' + ((donor || '') === id) + '"' + (status ? ' disabled aria-disabled="true"' : '') + '><span class="donor-heading"><b>' + esc(title) + '</b><span class="donor-benefit">' + esc(gets) + '</span></span>' + (status ? '<small class="donor-status">' + esc(status) + '</small>' : '') + '<span class="donor-terms"><b>條件</b><span>' + esc(terms) + '</span></span><span class="donor-cost"><b>代價</b><span>' + esc(costs) + '</span></span></button>';
    const range = G.preview(state, 'fundraise', {...planConfig(), donor:null}).expectedIncome, estimate = '約 ' + wan(range.min) + '–' + wan(range.max);
    const small = card('', '小額募款', estimate, '不綁任何立場', '占一回合，這回合你不拉票');
    return '<div class="donor-cards" role="group" aria-label="找誰募款"><span class="pick-label">選一個募款對象</span>' + small + G.donorView(state).map(d => {
      const { gets, costs } = dealFacts(d), status = d.status === 'open' ? '' : d.status === 'his' ? '已被小馬拉走' : '已經談過';
      return card(d.id, d.name, gets.join('・'), '公開支持' + d.planText, costs.join('；'), status);
    }).join('') + '</div>';
  }
  // The studio: prepare an issue, or send people to dig for dirt on 小馬.
  const allStudied = () => G.topicsOf(state).every(t => state.player.studied?.[t]);
  function prepModes(dp = G.preview(state, 'dig', {})) { return modeButtons([['prepare', '準備政見', allStudied() ? '議題都親自研讀過了' : '免費・你和助手查資料', allStudied()], ['dig', '挖黑料', dp.allowed ? wan(G.COSTS.dig) + '・可能挖到、空手或被反咬' : dp.reason, !dp.allowed]]); }
  function modeButtons(options) { return '<div class="mode-picks" role="group" aria-label="怎麼做">' + options.map(([id, label, note, disabled]) => '<button data-action="mode" data-kind="' + id + '" aria-pressed="' + (selectedAction === id) + '"' + (disabled ? ' disabled aria-disabled="true"' : '') + '><b>' + esc(label) + '</b><small>' + esc(note) + '</small></button>').join('') + '</div>'; }
  // Explanations sit behind an (i) that shows them on hover or focus, so the dock shows choices first.
  const info = text => text ? '<i class="info" tabindex="0" role="note" aria-label="' + esc(text) + '" data-tip="' + esc(text) + '">i</i>' : '';
  function toggle(name, on, label, note, disabled, more) { return '<button data-action="toggle" data-name="' + name + '" aria-pressed="' + !!on + '"' + (disabled ? ' disabled aria-disabled="true"' : '') + '><b>' + esc(label) + info(more) + '</b><small>' + esc(note) + '</small></button>'; }
  const statusOf = t => state.player.studied?.[t] ? '摸清楚' : state.player.known.includes(t) ? '知道方向' : '沒研究';
  const depthClass = t => state.player.insight?.[t]?.level === 'precise' ? 'deep' : state.player.known.includes(t) ? 'ready' : 'risky';
  // What may be asked here and which issue an assistant researches this round; researching the wrong one means being caught out.
  function researchNote(picks, free) {
    if (!free) return '還沒有助手，招募後才能派人查。';
    return '';
  }
  // On a trip: what may be asked here and whether you are ready. Research itself happens on a preparation round, before the trip.
  function askRow() {
    const pool = askPool(), place = onSite(selectedAction) ? G.venueView(state).find(v => v.id === plannedVenue()) : null, odds = pool.length > 1 ? place?.odds || [] : [];
    // A passer-by may ask a current event instead; the place's own odds are scaled so the chips add up to the whole chance.
    const news = selectedAction === 'canvass' && pool.length > 1 ? place?.news || null : null, keep = news ? 1 - news.chance / 100 : 1, newsChip = news ? '<span class="research-chip other"><b>時事 ' + news.chance + '%</b><small>' + news.topics.map(t => esc(short(t))).join('、') + '</small></span>' : '';
    if (!pool.length) return '';
    const interviewBrief = selectedAction === 'tv' && !!G.itinerary(state, 'tv', planConfig()).brief, ready = pool.filter(t => state.player.known.includes(t) || interviewBrief).length;
    const questions = '<details class="possible-questions"><summary>可能問：' + pool.map(t => esc(short(t))).join('、') + (news ? '／時事' : '') + '</summary><div class="research-row ask-only" role="group" aria-label="這裡可能問">' + pool.map((t, i) => '<span class="research-chip ' + depthClass(t) + '"><b>' + esc(short(t)) + (odds[i] ? ' ' + Math.round(odds[i] * keep) + '%' : '') + '</b><small>' + statusOf(t) + '</small></span>').join('') + newsChip + '</div></details>';
    return '<div class="readiness-note"><b>出發準備：' + ready + '／' + pool.length + (interviewBrief ? ' 題有專訪資料</b>' : ' 題已研究</b>') + (ready === pool.length ? '<p>' + (interviewBrief ? '專訪費包含指定題目資料，出發後取得。' : '這些題目能提出具體方案。') + (news ? '路人仍可能問時事。' : '') + '</p>' : '<p>未研究就不知道各群反應，可能掉票。' + (G.BACKGROUNDS[state.settings.background]?.answerBlind ? '你能靠議會經驗作答，但不保證合民意。' : '具體新方案通常要先查資料。') + '助手今天查，下一回合才用得到。</p><button class="mini-button" data-action="prepare-before-trip">改成先研究一回合 →</button>') + questions + '</div>';
  }
  function researchRow() {
    const free = researchCapacity(), picks = researchTopic() || [], list = G.topicsOf(state), ownTopic = selectedAction === 'prepare' ? (selectedTopic || G.preview(state, 'prepare', planConfig()).topic) : null;
    if (!list.length) return '';
    const chip = t => { const own = t === ownTopic, done = state.player.insight?.[t]?.level === 'precise'; return '<button class="research-chip ' + depthClass(t) + '" data-action="research" data-topic="' + t + '" aria-pressed="' + picks.includes(t) + '"' + (own || done || !free || (!picks.includes(t) && picks.length >= free) ? ' disabled aria-disabled="true"' : '') + '><b>' + esc(short(t)) + '</b><small>' + (own ? '本人研究' : statusOf(t)) + '</small></button>'; };
    const names = picks.length ? picks.map(short).join('、') : '未分配';
    return '<details class="research-disclosure"' + (researchOpen ? ' open' : '') + '><summary>助手研究 <b>' + picks.length + '／' + free + ' 人</b><span>' + esc(names) + '</span></summary><div class="research-row" role="group" aria-label="助手研究">' + list.map(chip).join('') + '</div>' + info('每位助手查一題，下回合起知道反應方向；本人研究才能摸清強弱並提高說服力。沒派研究的人會陪你拉票。') + (researchNote(picks, free) ? '<p class="research-note">' + researchNote(picks, free) + '</p>' : '') + '</details>';
  }
  // Assistants who walk with you: only the first few add to your pull, so the dots stop at the cap and extras show as a count.
  const CREW_CAP = (G.TUNING.crew?.length || 5) - 1, TEAM_CAP = G.MAX_HELPERS || 4;
  const crewDots = n => '<span class="crew-dots" aria-hidden="true">' + Array.from({ length: CREW_CAP }, (_, i) => '<i' + (i < n ? ' class="on"' : '') + '></i>').join('') + (n > CREW_CAP ? '<em>+' + (n - CREW_CAP) + '</em>' : '') + '</span>';
  // The team as slots up to its cap: who you have, who this round hires, and the first slots that can walk with you.
  function teamMeter(p) {
    const have = (state.player.team?.members || []).length, add = p.recruitCount || 0;
    return '<div class="team-meter" role="img" aria-label="' + esc('助手 ' + have + ' 人' + (add ? '，這次加 ' + add + ' 人' : '') + '，上限 ' + TEAM_CAP + ' 人；陪你拉票最多 ' + CREW_CAP + ' 人有效') + '"><span class="pick-label">助手</span><span class="tm-slots">' + Array.from({ length: TEAM_CAP }, (_, i) => '<i class="' + [i < have ? 'on' : i < have + add ? 'new' : '', i === CREW_CAP - 1 ? 'limit' : ''].filter(Boolean).join(' ') + '"></i>').join('') + '</span><span class="tm-text"><b>' + have + (add ? ' → ' + (have + add) : '') + '</b>／' + TEAM_CAP + ' 人</span><small class="tm-note">陪你拉票最多 ' + CREW_CAP + ' 人有效（×' + G.TUNING.crew.at(-1).toFixed(2) + '），多的人去研究、擺攤或開直播</small></div>';
  }
  // Money buys reach and certainty; assistants can run a stall or dig into 小馬's money while you are out.
  function addonButtons(p) {
    const id = selectedAction, rows = [], boards = (state.player.billboards || []).length, full = boards >= G.MAX_BILLBOARDS, tip = G.eventView(state).tip, free = p.teamAssignments.filter(x => !['research', 'stream'].includes(x.task)).length;
    if (onSite(id)) { const est = G.billboardEstimate(state, p.venue); rows.push(toggle('gifts', gifts, '送小禮物', '+' + wan(G.COSTS.gifts), false, '現場多 25% 人；長輩最吃這套，中年普通，青年沒感覺。')); rows.push(toggle('billboard', billboard && !full, '立看板', '+' + wan(G.COSTS.billboard) + '・已立 ' + boards + '/' + G.MAX_BILLBOARDS, full, '之後每回合約 +' + num(est.perRound) + ' 票' + (est.fit > 1 ? '；你的立場合這裡人群最在意的題。' : est.fit < 1 ? '；你的立場跟這裡人群相反。' : '。'))); }
    if (state.day >= G.GOTV_FROM && (onSite(id) || id === 'tv')) rows.push(toggle('gotv', gotvOn, '選前催票', '+' + wan(G.COSTS.gotv), false, (id === 'tv' ? '三群' : '這裡的' + groupTitle(G.venueView(state).find(v => v.id === p.venue)?.main ?? 0)) + '裡傾向你的人確定出門投票，不會被別人挖走。'));
    const team = [];
    if (id !== 'press') team.push(toggle('booth', booth, '小額募款攤', free < 1 ? (booth ? '未分配到人，取消或減少研究' : '人手已用完，先減少研究') : '占 1 人・+' + wan(G.TUNING.booth[0]) + '–' + wan(G.TUNING.booth[1]), free < 1 && !booth, '每回合最多一個攤位。和研究、同行共用助手，不能重複派人。'));
    const crewNote = onSite(id) && p.crew !== null && p.crew !== undefined ? '<p class="research-note crew-note">陪你出門 ' + p.crew + ' 人・拉票 ×' + p.crewFactor.toFixed(2) + crewDots(p.crew) + info((p.crew < 2 ? '人手不夠，你自己拉票的效果打折。' : '2 人是基本陣容；') + '最多 ' + (G.TUNING.crew.length - 1) + ' 人有效（×' + G.TUNING.crew.at(-1).toFixed(2) + '），再多也一樣。留人研究或擺攤，陪你的人就少。') + '</p>' : '';
    const extras = (rows.length ? '<div class="addon-picks" role="group" aria-label="加碼"><span class="pick-label">加碼</span><div class="addon-list">' + rows.join('') + '</div></div>' : '') + (team.length ? '<div class="addon-picks team-picks" role="group" aria-label="後勤"><span class="pick-label">後勤</span><div class="addon-list">' + team.join('') + '</div></div>' : '');
    return (id !== 'prepare' && !behind(id) && id !== 'press' ? askRow() : '') + '<section class="routine-work" aria-label="例行安排"><h3>例行安排・助手分工與加碼</h3><p class="decision-guide">與主行程同步，不另外占回合。</p>' + staffSummary(p) + (id === 'prepare' || behind(id) || onSite(id) ? researchRow() : '') + crewNote + (extras ? '<details class="extras-disclosure"' + (extrasOpen ? ' open' : '') + '><summary>加碼與後勤 <span>' + ([gifts ? '小禮物' : '', billboard ? '看板' : '', gotvOn ? '催票' : '', booth ? '募款攤' : ''].filter(Boolean).join('、') || '未加碼') + '</span></summary>' + extras + '</details>' : '') + '</section>';
  }
  // A press conference, TV slot or stream can set off one lead from the file; at a press conference the default is the tip.
  function exposeRow(id) {
    const f = G.fileView(state), leads = f.items.filter(x => x.source === 'dig' && x.ready), tip = f.items.find(x => x.id === 'tip');
    if (id !== 'press' && !leads.length) return '';
    const chip = (key, on, title, note, cls, off) => '<button class="expose-chip ' + cls + '" data-action="expose" data-id="' + esc(key) + '" aria-pressed="' + on + '"' + (off ? ' disabled aria-disabled="true"' : '') + '><b>' + esc(title) + '</b><small>' + esc(note) + '</small></button>';
    const first = id === 'press' ? chip('', !exposePick, tip?.title || '經費重複請款', !tip ? '' : tip.released ? (tip.correct ? '已爆・只能更正' : '已爆過') : tip.truthLabel ? '已查證・' + tip.truthLabel : '未查證・可能被識破', tip?.status === 'solid' ? 'solid' : tip?.released ? 'hold' : 'risky', tip?.released && !tip.correct) : chip('', !exposePick, '這次不爆', '留著之後再用', 'hold');
    return '<div class="expose-row" role="group" aria-label="爆料"><span class="pick-label">爆料' + info('站得住的料讓不信小馬的人轉向你；沒查證的料效果打折，料不實會反咬你。' + (id === 'online' ? '直播看流量，反咬也更重。' : id === 'tv' ? '電視主要是長輩、中年。' : '記者會全區都看。')) + '</span>' + [first].concat(leads.map(x => chip(x.id, exposePick === x.id, x.title, (DIRT_STATUS[x.status] || '') + '・' + leadEstimate(x, id) + ' 票' + (x.leaked ? '・已被撇清' : ''), x.status === 'solid' ? 'solid' : 'risky'))).join('') + '</div>';
  }
  // TV draws one of three issues; a bought brief picks the issue, a public reply to 小馬 makes it his attack.
  function tvCards(p) {
    const pool = p.pool || G.tvPool(state), due = G.pendingChallenges(state)[0];
    return '<div class="tv-cards" role="group" aria-label="買專訪指定題目"><span class="pick-label">買專訪</span>' + pool.map(t => '<button class="tv-card ' + (state.player.known.includes(t) ? 'ready' : 'risky') + '" data-action="brief" data-topic="' + t + '" aria-pressed="' + (brief === t) + '"' + (respondOn ? ' disabled aria-disabled="true"' : '') + '><b>' + esc(G.TOPICS[t].title) + '</b><em>' + (brief === t ? '已指定・+' + wan(G.COSTS.brief) : '指定這題 +' + wan(G.COSTS.brief)) + '</em></button>').join('') + '</div>' + (due ? '<div class="addon-picks" role="group" aria-label="回應小馬">' + toggle('respond', respondOn, '主動回應小馬', '免費・節目改談「' + short(due.topic) + '」') + '</div>' : '');
  }
  function topicPicks(current) {
    // Personal study adds speaking practice even when assistants already gathered precise research.
    const lv = G.landscapeView(state), heat = id => lv.ranking.find(r => r.topic === id)?.share || 0, max = Math.max(1, ...lv.ranking.map(r => r.share)), pool = G.availableTopics(state).filter(t => t.id !== 'tip').sort((a, b) => G.topicsOf(state).indexOf(a.id) - G.topicsOf(state).indexOf(b.id));
    const status = id => state.player.studied?.[id] ? '已完成' : state.player.insight?.[id]?.level === 'precise' ? '資料齊全・可練習' : state.player.insight?.[id] ? '研究過' : '還沒查';
    return '<details class="topic-disclosure"' + (topicOpen ? ' open' : '') + '><summary>本人研究 <b>' + esc(short(current)) + '</b></summary><div class="topic-picks" role="group" aria-label="查哪個議題"><span class="pick-label">查哪題' + info('之後被問到這題，回答效果約 ×' + G.TUNING.studied + '，也能分辨三群反應強弱。越熱門的題越常被問。') + '</span>' + pool.map(t => '<button class="topic-pick" data-action="topic" data-topic="' + t.id + '" aria-pressed="' + (current === t.id) + '"' + (state.player.studied?.[t.id] ? ' disabled aria-disabled="true"' : '') + '><b>' + esc(t.short || t.title) + '</b><i class="heat" style="width:' + Math.round(heat(t.id) / max * 100) + '%"></i><small>' + esc(status(t.id)) + '</small></button>').join('') + '</div></details>';
  }
  function dockPlan() {
    const p = selectedAction ? G.preview(state, selectedAction, planConfig()) : null;
    if (p && booth && !p.booth) { p.allowed = false; p.reason = '人手已用完：請取消募款攤，或減少一位研究助手。'; }
    if (p && selectedAction === 'prepare' && allStudied()) { p.allowed = false; p.reason = '議題都親自研讀過了，換個行程。'; }
    if (!p) return '<div class="planning-briefing">' + pendingDecisions() + roundBriefing() + networkOrders() + '</div>';
    const id = selectedAction, venue = onSite(id) ? G.venueView(state).find(v => v.id === p.venue) : null, place = placeName(id, p.venue);
    let body = '';
    if (onSite(id)) {
      const stances = G.topicsOf(state).filter(t => stanceOf(t)).length;
      body = modeButtons([['canvass', '街頭拜訪', '免費・回答一題'], ['rally', '辦造勢活動', wan(G.COSTS.rally) + (stances < 2 ? '・先表態 2 題才能辦' : '・講你全部的立場'), stances < 2]]) + crowdLine(p.crowd, '現場 10 人', !crowdKnown(p.venue)) + '<p class="dock-info">' + (id === 'canvass' ? (venue.challenged ? '這裡的人都在問小馬對你的批評。' : esc(venue.mainTitle) + '多' + info('會從下面三題挑一題問你；路人也可能改問時事。')) : '你公開過 ' + stances + ' 個立場' + info('造勢會講你全部公開過的立場：合這裡人群的加分，不合的扣分。連續辦，來的人會越來越少。')) + '</p>' + chiefLine(p.chief) + addonButtons(p);
    } else if (['tv', 'press'].includes(id)) {
      const tip = G.eventView(state).tip, tipReady = tip?.available;
      body = modeButtons([['tv', '上節目', (state.player.tvCredit ? '免費（老K 的節目）' : wan(G.COSTS.tv)) + '・長輩、中年多'], ['press', '開記者會爆料', tipReady ? '免費・公開黑料' : '第 3 回合起', !tipReady]]) + (id === 'tv' ? crowdLine(p.crowd, '電視觀眾 10 人') + '<p class="dock-info">' + (p.respond ? '你主動回應小馬，節目談「' + esc(G.TOPICS[p.topic].title) + '」。' : p.brief ? '節目談「' + esc(G.TOPICS[p.brief].title) + '」' + info('你買了專訪時段，開錄前先打聽好。') : '主持人從下面三題抽一題' + info('抽到沒研究的題會卡詞；買專訪可以指定題目。')) + '</p>' + exposeRow('tv') + addonButtons(p) + tvCards(p) : exposeRow('press') + '<p class="dock-info">' + (p.exposing ? '記者會全區都看得到；沒查證的料被追問會穿幫。' : '手上的資料：' + esc(tip.evidenceText) + ' 還沒查證就指控，可能當場被記者識破。') + '</p>');
    } else if (id === 'dig') { const dp = G.preview(state, 'dig', {}), f = G.fileView(state), odds = f.dig.odds, pc = n => Math.round(n * 100) + '%', held = f.items.filter(x => x.source === 'dig' && x.ready).length; body = '' + '<p class="dock-info">結果三選一，出發前看不到：</p><ul class="dig-odds"><li class="good"><b>' + pc(odds.found) + '</b>挖到：放進黑料檔案，查證後再挑時機爆</li><li><b>' + pc(odds.nothing) + '</b>空手：錢花掉</li><li class="bad"><b>' + pc(odds.backfire) + '</b>被反咬：你掉票，小馬也更想爆你</li></ul><p class="dock-info quiet-note">這回合你不拉票' + info('助手照常去拉票。') + '</p>' + (held ? '<p class="dock-info">黑料檔案裡已有 ' + held + ' 份料還沒爆。</p>' : '') + addonButtons(p); }
    else if (id === 'prepare') body = '' + (topicPicks(p.topic) + '<p class="dock-info">親自深入研究「' + esc(G.TOPICS[p.topic]?.title || '') + '」' + info('分辨三群反應強弱，之後談這題說服力更強，也順便看清另一個熱門議題。這回合你不拉票；沒派去查資料的助手去拉票。') + '</p>') + addonButtons(p);
    else if (id === 'fundraise') body = donorCards() + '<p class="dock-info">可能募得 ' + wan(p.expectedIncome.min) + '–' + wan(p.expectedIncome.max) + (p.expectedIncome.miss ? '（約 ' + Math.round(p.expectedIncome.miss * 10) + ' 成談不成）' : '') + info((p.expectedIncome.ties ? '你拜訪里長 ' + (p.expectedIncome.visits || 0) + ' 次，募款 ×' + p.expectedIncome.ties.toFixed(2) + '；跟里長越熟，開口越容易。' : '') + (p.deal ? '拜訪頭人：他的組織票和你公開的立場會影響票數；這回合你不拉票。' : '小額募款不影響票數，但這回合你不拉票。')) + '</p>' + addonButtons(p);
    else if (id === 'online') body = crowdLine(p.crowd, '網友 10 人') + '<p class="dock-info">觸及約 ' + num(p.expectedReach.min) + '–' + num(p.expectedReach.max) + ' 人，可能爆紅' + info(num(p.teamAssignments.filter(m => m.task === 'stream').length) + ' 位助手開直播。網友會從青年最在意的三題挑一題留言問你；也可能沒人看。') + '</p>' + exposeRow('online') + addonButtons(p);
    else if (id === 'recruit') body = teamMeter(p) + '<p class="dock-info">' + (p.recruitCount ? '每人月薪 ' + wan(p.contractRate || 50000) + '，按剩下 ' + p.contractDays + ' 天預付 ' + wan(p.baseCost) : esc(p.title)) + info('新助手下回合起幫你。這回合你不拉票；舊助手可以去查資料，沒派工的助手會用你最近講過的立場自己去拉票。') + '</p>' + addonButtons(p);
    else if (id === 'debate') body = crowdLine(p.crowd, '台下觀眾 10 人') + '<p class="dock-info">題目「' + esc(G.TOPICS[p.topic].title) + '」，小馬也上台。' + (state.player.insight?.[p.topic]?.level === 'precise' ? '你深入查過，台上能壓制他。' : '深入查過這題的話，台上能額外壓制他。') + '</p>' + addonButtons(p);
    const campaign = campaignSelection();
    if (campaign) body = '<p class="dock-info campaign-selected"><b>' + esc(campaign.title) + '</b>' + info(campaign.text || campaign.gain) + '</p>' + (p.topic && G.TOPICS[p.topic] ? '<p class="dock-info">談「' + esc(short(p.topic)) + '」</p>' : '') + (campaign.cost ? '<p class="dock-info">代價：' + esc(campaign.cost) + '</p>' : '') + addonButtons(p);
    if (['prepare', 'fundraise', 'recruit', 'dig'].includes(id)) body = officeActions() + body;
    if ((onSite(id) && p.venue === 'plaza') || id === 'debate') { if (state.day >= G.DEBATE_ROUND - 2 && state.day <= G.DEBATE_ROUND) body = '<div class="venue-occasion"><button data-action="select-action" data-kind="debate"' + (state.day !== G.DEBATE_ROUND ? ' disabled aria-disabled="true"' : '') + '>政見發表會・' + (state.day === G.DEBATE_ROUND ? '這回合開場' : '第 ' + G.DEBATE_ROUND + ' 回合開場') + '</button></div>' + body; }
    if (p.mediaFatigue < 1) body = '<p class="dock-info media-fatigue">這局已多次上節目，觀眾開始疲乏。</p>' + body;
    return '<div class="dock-plan"><div class="dock-title">' + icon(id) + '<h2>' + esc(place) + '<small>' + esc(action(id).title) + '・' + (p.totalCost ? wan(p.totalCost) : '免費') + info(p.campaignFollowup ? '占用直播助手；這次觸及依題目和青年關注度決定。' : id === 'tv' && p.freeTv ? '本次免節目費；有準備的題目才能清楚表態。' : action(id).risk) + '</small></h2><button class="primary-button" data-action="confirm-action"' + (!p.allowed ? ' disabled aria-disabled="true"' : '') + '>出發 →</button></div><div class="dock-options-body">' + (window.CampaignAdvisor?.selected?.(G, state, { opening: openingPick, selectedAction, selectedVenue, selectedTopic, preview: p }) ? '<p class="staff-context">幕僚小葉：' + esc(window.CampaignAdvisor.selected(G, state, { opening: openingPick, selectedAction, selectedVenue, selectedTopic, preview: p })) + '</p>' : '') + pendingDecisions() + '<p class="main-action-guide">你的主行程・本回合只能選一個</p>' + body + networkOrders() + '<details class="briefing-disclosure"><summary>幕僚建議與選情</summary>' + roundBriefing() + '</details>' + (!p.allowed ? '<p class="commit-reason blocked" role="status">' + esc(p.reason) + '</p>' : '') + '</div></div>';
  }

  /* ---------- scene: venue interior, crowd and speech ---------- */
  // Ten people for the scene, by the crowd mix; the order is fixed per game and place so a revisit looks the same.
  function crowdOf(mix, key) {
    const counts = crowdCount(mix), list = [];
    counts.forEach((n, g) => { for (let j = 0; j < n; j++) list.push({ group: g, variant: j % 2, k: G.rand(state.seed, 'crowd-slot', key, g, j) }); });
    return list.sort((a, b) => a.k - b.k).map(({ k, ...c }) => c);
  }
  // After an answer a group's faces follow its votes from the answer: how many react grows with the votes per person reached (every face
  // at FACE_VOTES), and they split into smiles and frowns by votes won and lost, so a group that gained never shows more frowns.
  const FACE_VOTES = 8;
  function reactionCounts(g, n) {
    if (!g?.reached || !n) return { up: 0, down: 0 };
    const moved = Math.min(n, Math.max(Math.round(n * Math.abs(g.votes) / g.reached / FACE_VOTES), Math.abs(g.votes) >= 30 ? 1 : 0));
    const gain = Number.isFinite(g.gain) ? g.gain : Math.max(0, g.votes), loss = Math.max(0, gain - g.votes), up = gain + loss > 0 ? Math.round(moved * gain / (gain + loss)) : 0;
    return { up, down: moved - up };
  }
  function withReactions(list, groups) {
    const seen = [0, 0, 0], size = [0, 0, 0]; for (const c of list) size[c.group]++;
    const counts = size.map((n, g) => reactionCounts(groups?.[g], n));
    return list.map(c => { const j = seen[c.group]++, k = counts[c.group]; return { ...c, tone: j < k.up ? 'up' : j < k.up + k.down ? 'down' : 'flat' }; });
  }
  function sceneView() {
    const rec = state.phase === 'recap' ? state.recap : afterglow && state.phase === 'plan' ? state.journal.at(-1) : null;
    // Matte-toy only: rounds at the campaign office show the candidate with the staff, one of them reporting back.
    if (Art?.isToy?.() && ['prepare', 'recruit', 'dig'].includes(rec?.player?.action)) { const r = rec.player, team = state.player.team?.members || [], first = String(r.result || '').split('。')[0]; return { kind: 'office', crowd: [], speaker: null, bubble: { who: r.action === 'recruit' ? (team.at(-1)?.name || '新夥伴') + '・新夥伴' : (team[0]?.name || '小葉') + '・幕僚', text: first ? first + '。' : '', stage: 'reaction' } }; }
    if(Art?.isToy?.() && rec?.player?.action === 'fundraise') return {kind:'fundraise',crowd:[],speaker:null,bubble:{who:'街坊募款',text:rec.player.result || '這次募款已記入競選預算。',stage:'reaction'}};
    if (state.phase === 'question' && isPublic(state.pending?.id)) {
      const p = state.pending, q = G.question(state), kind = p.id === 'canvass' ? venueId(p.venue) : p.id;
      return { kind, crowd: crowdOf(q?.crowd, kind), speaker: p.id === 'canvass' ? { group: q?.speakerGroup ?? 0, variant: 1, name: q?.speakerName } : null, bubble: { who: q?.speaker || '', text: q?.text || '', stage: 'question' } };
    }
    if (['canvass', 'tv', 'online', 'debate', 'rally'].includes(rec?.player?.action)) {
      const r = rec.player, kind = onSite(r.action) ? venueId(r.venue) : r.action, c = r.conversation;
      const line = c ? c.reaction.replace(/^[^「]*「/, '').replace(/」$/, '') : r.action === 'debate' ? '小馬：「' + (rec.rival.quote || rec.rival.result) + '」' : r.action === 'online' ? '本次觸及 ' + num(r.effects?.contacts) + ' 人。' : r.action === 'rally' ? '現場 ' + r.effects.contacts + ' 人聽完你的政見。' : '主持人：「謝謝' + state.player.name + '。」';
      return { kind, mode: r.action === 'rally' ? 'rally' : null, crowd: withReactions(crowdOf(r.crowd, kind), r.effects?.groups), speaker: c ? { group: c.group ?? 0, variant: 1, tone: c.mood, name: c.name } : null, bubble: { who: c ? c.name + '・' + c.groupTitle : r.action === 'debate' ? '小馬・對手' : r.action === 'rally' ? '造勢活動' : r.action === 'online' ? '直播結束' : '主持人・小安', text: line, stage: 'reaction' } };
    }
    return null;
  }
  function renderWorld() {
    const view = sceneView(), venue = $('venue-scene'), bubble = $('conversation-bubble');
    venue.hidden = !view; $('world').classList.toggle('in-venue', !!view);
    if (view) {
      const key = view.kind + ':' + state.day + ':' + state.phase;
      if (venue.dataset.key !== key) { venue.innerHTML = Art?.interior ? Art.interior(view.kind, { crowd: view.crowd, speaker: view.speaker, board: (state.player.billboards || []).some(b => b.venue === view.kind) ? { party: myParty() } : null, mode: view.mode, stage: view.bubble.stage, rain: state.started && G.forecast(state).now?.id === 'rain', staff: (state.player.team?.members || []).length, topic: state.pending?.topic && G.TOPICS[state.pending.topic] ? G.TOPICS[state.pending.topic].title : null }) : ''; venue.dataset.key = key; venue.dataset.kind = view.kind; }
      bubble.hidden = false; bubble.dataset.stage = view.bubble.stage; bubble.dataset.kind = view.kind; bubble.dataset.mode = view.mode || '';
      bubble.innerHTML = bubbleMarkup(view);
    } else { bubble.hidden = true; venue.innerHTML = ''; venue.dataset.key = ''; }
    const destinations = view ? '' : hotspots();
    $('map-hotspots').innerHTML = destinations + (!view && state.started && state.phase === 'plan' && !mapTipDismissed ? '<button class="map-tip" data-action="dismiss-map-tip">點地圖上的地點，安排本回合行程 ×</button>' : '');
    $('mobile-destinations').innerHTML = '';
    $('map-boards').innerHTML = view || !state.started ? '' : boardsOnMap();
    $('world').classList.toggle('is-rainy', state.started && !view && G.forecast(state).now?.id === 'rain');
    document.body.dataset.act = state.started ? String(G.actOf(state.day).id) : '';
    placeRival();
  }
  // While planning, 小馬 stands where the rumour says he is going.
  function placeRival() {
    const r = state.started && state.phase === 'plan' ? G.rumorView(state) : null, spot = r ? HOTSPOTS[r.action === 'canvass' ? r.venue : r.action] : null;
    const key = r ? (r.action === 'canvass' ? r.venue : r.action) : null;
    if (Art?.isToy?.()) actorPosition($('rival'), Art.rivalSpot(spot ? key : null), true);
    else actorPosition($('rival'), spot ? { x: spot.x + 46, y: spot.y + 30 } : { x: 1030, y: 470 });
    $('rival').classList.toggle('rumoured', !!spot);
    const label = $('rival').querySelector?.('.actor-name');
    if (label) label.textContent = spot ? '傳聞：小馬' : '小馬';
    $('rival').setAttribute('aria-label', spot ? '傳聞小馬可能在這裡，並非保證碰面' : '小馬');
  }
  function boardsOnMap() {
    return (state.player.billboards || []).map((b, i) => { const p = HOTSPOTS[b.venue] || anchors.start, toy = Art?.isToy?.() ? Art.boardSpot(b.venue, (state.player.billboards || []).slice(0, i).filter(o => o.venue === b.venue).length) : null, x = toy ? toy.x : p.x + 78 + (i % 2) * 34, y = toy ? toy.y : p.y + 34; return '<span class="map-board" style="left:' + (x / 12).toFixed(2) + '%;top:' + (y / 6.5).toFixed(2) + '%;z-index:' + Math.round(y) + '" title="' + esc(venues[b.venue]?.title + '的看板') + '">' + (Art?.billboard ? Art.billboard(myParty()) : '') + '</span>'; }).join('');
  }

  /* ---------- question ---------- */
  // An answer is a line you say plus small chips; what it costs or risks in words sits in one preview line above the answers.
  const CHIP = { party: '合黨意', breach: '逆黨意', deal: '守約定', flip: '改口', previous: '說過', walkback: '收回保證', counter: '點名小馬', fatigue: '說太多次', unprepared: '沒準備' };
  const chipOf = t => t.kind === 'breach' && /約定/.test(t.text) ? '毀約' : CHIP[t.kind] || '';
  function tagText(t) { const party = t.kind === 'breach' && !/約定/.test(t.text), stake = party && state.pending?.topic ? aidAtStake(breachesAfter(state.pending.topic)) : ''; return ['previous', 'party', 'deal', 'counter'].includes(t.kind) ? '' : party && stake ? t.text.replace(/：.*$/, '') + '；' + stake : t.text; }
  // The plan 小馬 holds in public, for the call-out answer.
  const hisPlan = topic => { const his = G.lastPlan(state.rival, topic); return his ? G.TOPICS[topic]?.plans?.find(x => x.id === his.answer)?.text || his.quote : ''; };
  function reactionMarkup(o) {
    if (o.reactions?.length) return '<span class="answer-reactions">' + o.reactions.map((r, i) => '<span class="reaction-mark g-' + GROUP_KEYS[Number.isInteger(r.group) ? r.group : i] + '" title="' + esc(r.text || '') + '"><b>' + esc(groupTitle(Number.isInteger(r.group) ? r.group : i)) + '</b><strong>' + esc(r.mark) + '</strong></span>').join('') + '</span>';
    return o.faces?.some(f => f !== 'unknown') ? faceRow(o.faces) : '<span class="a-chip k-unknown">反應未知</span>';
  }
  function answerButton(o, i, topic) {
    const tags = (o.tags || []).filter(t => t.kind !== 'promise'), mine = o.id === 'counter' ? G.counterPlan(state, topic) : null;
    const faces = topic === 'tip' ? '' : !o.unlocked ? '<span class="a-chip k-locked">要先研究</span>' : reactionMarkup(o);
    const previous = !!o.preselected, chips = (previous ? '<span class="a-chip k-previous">上次的立場・按下確認沿用</span>' : '') + tags.map(t => chipOf(t) ? '<span class="a-chip k-' + esc(t.kind) + '">' + esc(chipOf(t)) + '</span>' : '').join('');
    const warn = [o.id === 'counter' && hisPlan(topic) ? '小馬主張「' + hisPlan(topic) + '」，認同他的人會覺得你在吵' : '', ...tags.map(tagText)].filter(Boolean).join('｜');
    const more = (warn ? '<span class="am-warn">' + esc(warn) + '</span>' : '') + (o.detail && o.unlocked ? '<span class="am-detail">' + esc(o.detail) + '</span>' : '');
    return '<button class="answer-option' + (o.id === 'counter' ? ' counter' : '') + (previous ? ' previous-stance' : '') + '" data-answer="' + esc(o.id) + '" aria-pressed="' + previous + '"' + (!o.unlocked ? ' disabled aria-disabled="true"' : '') + '><span class="answer-copy"><span class="answer-line"><span class="answer-number" aria-hidden="true">' + (i + 1) + '</span>「' + esc(mine ? mine.text : o.text) + '」</span>' + (faces + chips ? '<span class="answer-chips">' + faces + chips + '</span>' : '') + (more ? '<span class="answer-more">' + more + '</span>' : '') + '</span></button>';
  }
  // The scene bubble asks; the dock holds only the answers, with one status line on how well you know the issue.
  function dockQuestion() {
    const q = G.question(state);
    if (!q) return '<p class="dock-hint">對話尚未載入，請重新整理。</p>';
    const topic = state.pending.topic, level = state.player.insight?.[topic]?.level, ready = state.player.known.includes(topic), locked = [...new Set(q.options.filter(o => !o.unlocked && o.whyLocked).map(o => o.whyLocked))];
    const status = topic === 'tip' ? '' : '<span class="q-status ' + (level === 'precise' ? 'deep' : ready ? 'ready' : 'risky') + '">' + esc(short(topic) || G.TOPICS[topic]?.title || '') + '・' + (state.player.studied?.[topic] ? '摸清楚' + info('＋＋／＋／−／−− 表示反應強弱；票數在結算揭曉。') : ready ? '知道方向' + info('＋／− 表示大致方向；分歧表示意見接近。親自研究後可分辨強弱。') : (locked[0] || '沒研究') + info('不知道大家會怎麼反應。')) + '</span>';
    const alerts = status + (q.previousAnswer ? '<span class="q-status prior">可以確認原立場，也可以改口</span>' : '') + (state.pending.followup ? '<span class="q-status warn">這一題就是回應小馬</span>' : '');
    // A press conference has no scene, so its question sits on top of the answers.
    const ask = isPublic(state.pending.id) ? '' : '<p class="q-ask"><b>' + esc(String(q.speaker || '').split('｜')[0]) + '</b>' + esc(q.text) + '</p>';
    return '<div class="dock-question">' + ask + (alerts ? '<p class="q-head">' + alerts + '</p>' : '') + '<div class="answer-list" role="group" aria-label="選一句回應" data-hint="選一句回應，票數在結算揭曉">' + q.options.map((o, i) => answerButton(o, i, topic)).join('') + '</div></div>';
  }
  // The question side panel is a small cheat-sheet: your party's line, any deal on this issue and what research found, by answer number.
  function questionPanel() {
    const q = G.question(state), p = state.pending, topic = G.TOPICS[p.topic], ins = state.player.insight?.[p.topic];
    if (!q) return panel('現場', '進度已保留', '<p>請重新整理，恢復目前行程。</p>');
    if (p.topic === 'tip') { const lead = p.exposing ? G.fileView(state).items.find(x => x.id === p.exposing) : null; return panel('第 ' + state.day + ' 回合 · 記者會', '選一句', '<section class="issue-card">' + (lead ? leadMarkup(lead, false) : tipMarkup()) + '</section>' + raceBoard(true)); }
    const plans = topic.plans || [], no = id => { const i = q.options.findIndex(o => o.id === id); return i >= 0 ? '<i class="ref-no">' + (i + 1) + '</i>' : ''; };
    // Columns follow the answer numbers, so the table reads the same way as the buttons.
    const at = k => { const i = q.options.findIndex(o => o.id === plans[k].id); return i < 0 ? 99 + k : i; }, cols = plans.map((_, k) => k).sort((a, b) => at(a) - at(b));
    const reactionFor = (k, g) => { const o = q.options.find(x => x.id === plans[k].id); return o?.reactions?.[g]?.mark || (o?.faces?.[g] === 'unknown' ? '未知' : o?.faces?.[g] === 'split' ? '分歧' : ['up', 'slight'].includes(o?.faces?.[g]) ? '＋' : o?.faces?.[g] === 'down' ? '−' : '—'); };
    const research = !ins ? '<span class="cheat-none">反應未知</span>' : '<table class="insight-table"><thead><tr><th></th>' + cols.map(k => '<th>' + (no(plans[k].id) || esc(plans[k].text)) + '</th>').join('') + '</tr></thead><tbody>' + ins.groups.map((x, g) => '<tr><th><span class="dot g-' + GROUP_KEYS[g] + '"></span>' + esc(groupTitle(g)) + '</th>' + cols.map(k => '<td>' + esc(reactionFor(k, g)) + '</td>').join('') + '</tr>').join('') + '</tbody></table>';
    const line = q.issueCard?.partyLine, party = G.PARTIES[state.settings.affiliation];
    const deal = (state.offers || []).filter(o => o.status === 'accepted').map(o => G.dealOf(state, o.id)).find(d => d?.topic === p.topic);
    const row = (k, v) => '<div class="cheat-row"><dt>' + k + '</dt><dd>' + v + '</dd></div>';
    const body = '<section class="issue-card cheat-sheet"><div class="issue-card-title"><b>' + esc(topic.title) + '</b><span>小抄</span></div>' + (q.crowd ? crowdLine(q.crowd, p.id === 'canvass' ? '現場 10 人' : '聽眾 10 人') : '')
      + '<dl class="cheat-rows">' + row('黨', line ? no(line) + esc(plans.find(x => x.id === line)?.text) : '<span class="cheat-none">' + (myParty() ? esc(party.title) + '對這題沒立場' : '無黨籍，沒有包袱') + '</span>') + row('約定', deal ? no(deal.plan) + '答應' + esc(deal.org) + '：' + esc(plans.find(x => x.id === deal.plan)?.text) : '<span class="cheat-none">沒有</span>') + row('研究', research) + '</dl></section>';
    return panel('第 ' + state.day + '／' + G.DAYS + ' 回合 · 現場', '選一句回應', body + raceBoard());
  }
  // The bubble names who is speaking with their face and group colour, and sets their words apart.
  function bubbleMarkup(view) {
    const [name, role] = String(view.bubble.who || '').split(/[｜・]/), g = view.speaker?.group, host = /主持人/.test(name || '');
    const face = Art?.avatar && (g !== undefined || host) ? '<span class="bubble-face' + (g !== undefined ? ' g-' + GROUP_KEYS[g] : '') + '" aria-hidden="true">' + Art.avatar(g !== undefined ? (Art.GROUP_ROLES?.[g]?.[view.speaker.variant ?? 1] || 'resident') : 'host') + '</span>' : '';
    return '<span class="bubble-speaker">' + face + '<b>' + esc(name || '') + '</b>' + (role ? '<small>' + esc(role) + '</small>' : '') + '</span><p>' + esc(view.bubble.text) + '</p>';
  }

  /* ---------- recap ---------- */
  function groupDeltas(byGroup) { return byGroup ? '<span class="delta-row">' + byGroup.map((v, g) => '<span class="delta-chip g-' + GROUP_KEYS[g] + ' ' + (v >= 0 ? 'up' : 'down') + '"><b>' + esc(groupTitle(g)) + '</b>' + signedVotes(v) + '</span>').join('') + '</span>' : ''; }
  // The round as capsules that add up to its total: what you did, then its parts (party line, flip, stumble…), your team, billboards,
  // deals, events and 小馬; each opens to say why. Facts without votes (a chief still cold, a reply due) are capsules without a number.
  // A dig names its outcome; being caught is its own votes, not a separate stumble.
  const DIG_LABEL = { found: '挖到料', nothing: '沒挖到', backfire: '被反咬' };
  const MAIN_LABEL = { canvass: '現場表態', tv: '上節目', online: '直播', debate: '政見會', press: '記者會', rally: '造勢', fundraise: '募款', recruit: '招募', prepare: '準備', dig: '挖料' };
  function recapItems(r) {
    const p = r.player, rv = r.rival, att = Object.fromEntries((r.attribution || []).map(a => [a.source, a])), items = [], notes = [];
    const add = (label, votes, text, groups, main) => items.push({ label, votes: Number(votes) || 0, text, groups: groups || null, main: !!main });
    const note = (label, text, warn) => notes.push({ label, text, warn: !!warn });
    for (const e of r.planEffects || []) add(e.kind === 'clarify' ? '澄清' : e.kind === 'crisis' ? '危機' : '宣示', e.votes, (e.kind === 'crisis' ? crisisChoice(e) + '：' + exposedBy(r.day) : e.title + '：') + e.text, e.byGroup);
    const parts = [];
    if (p.partyLine) { const stake = p.partyLine.kept ? '' : aidAtStake(G.partyView(state).aid?.breaks); parts.push(['黨', p.partyLine.votes, (p.partyLine.kept ? '照黨的立場說，同黨選民加分' : '違反黨的立場，同黨選民流失') + (stake ? '；' + stake : '')]); }
    if (p.stumble && p.action !== 'dig') parts.push([p.stumble.caught ? '識破' : '卡詞', p.stumble.votes, p.stumble.caught ? '沒查證就指控，當場被記者識破' : p.stumble.promise ? '沒研究就開支票，被追問細節答不出來' : '被問到沒研究的題，說不出具體做法']);
    if (p.walkBack) parts.push(['更正', p.walkBack.votes, '收回「' + p.walkBack.quote + '」：當初相信的 ' + p.walkBack.people + ' 人失望']);
    if (p.flip) parts.push(['改口', p.flip.votes, '聽過「' + p.flip.from + '」的 ' + p.flip.people + ' 人不滿']);
    if (p.breach) parts.push(['毀約', p.breach.votes, p.breach.org + '撤回支持（組織票 −' + num(p.breach.bloc) + '）']);
    if (p.counter) parts.push(['點名', p.counter.you, '點名小馬：他 ' + signedVotes(p.counter.rival) + ' 票；認同你的人 ' + signedVotes(p.counter.gained ?? 0) + '，覺得你在吵的人 ' + signedVotes(p.counter.lost ?? p.counter.you)]);
    if (p.exposed) { const x = p.exposed, what = '爆「' + (x.title || '黑料') + '」'; parts.push(x.kind === 'backfire' ? ['反咬', x.votes, what + '：料不實，' + (x.outlet === 'online' ? '被網友起底' : '被追問穿幫') + '；小馬 ' + signedVotes(x.rival) + ' 票'] : x.kind === 'flat' ? ['揭弊', x.votes, what + '：只放了風聲，沒人追'] : ['揭弊', x.votes, what + (x.verified ? '' : '（沒查證，打折）') + (x.leak ? '（小馬先撇清，打折）' : '') + '：小馬 ' + signedVotes(x.rival) + ' 票，不信他的人轉向你']); }
    if (p.gotv) parts.push(['催票', p.gotv.votes, p.gotv.people + ' 位傾向你的人確定出門投票']);
    if (p.chief?.broke) parts.push(['里長', p.chief.bloc, p.chief.name + '點頭了：帶來組織票，之後這裡的人更願意聽你']);
    if (p.dealt) parts.push(['頭人', p.dealt.votes, '拜訪' + p.dealt.name + '：' + [p.dealt.money ? '捐款 ' + wan(p.dealt.money) : '', p.dealt.bloc ? '組織票約 ' + num(p.dealt.bloc) : '', p.dealt.perk === 'tv' ? '一次免費上節目' : ''].filter(Boolean).join('、') + '；你公開支持「' + (G.TOPICS[p.dealt.topic]?.plans.find(x => x.id === p.dealt.plan)?.text || '') + '」' + (p.dealt.cost ? '；' + p.dealt.cost.text + ' ' + signedVotes(p.dealt.cost.votes) + ' 票' : '')]);
    // What you did is the player's share minus its listed parts, so the capsules add up exactly.
    const own = (att.player?.votes || 0) - parts.reduce((n, x) => n + (Number(x[1]) || 0), 0), where = p.action === 'tv' ? '上節目' : p.action === 'online' ? '開直播' : p.action === 'debate' ? '在政見發表會' : p.action === 'press' ? '開記者會' : '在' + p.venueTitle;
    const ownText = asking(p.action) && p.topic ? where + (p.drawn ? '，被問到「' : '談「') + short(p.topic) + '」' + (p.quote ? '，說「' + p.quote + '」' : '') + (p.action === 'online' && p.effects ? '；觸及 ' + num(p.effects.contacts) + ' 人' + (p.viral >= 1.8 ? '，這次爆紅' : p.viral <= .5 ? '，這次沒什麼人看' : '') : '')
      : p.action === 'rally' ? '在' + p.venueTitle + '辦造勢' : QUIET_WORD[p.action] ? (p.action === 'prepare' && G.TOPICS[p.topic] ? '查清楚「' + G.TOPICS[p.topic].title + '」。' : (p.result || '') + ' ') + quietLine(p.action, att.rival?.effectOnYou, !!rv.attack, p.dig) : (p.title || '') + '：' + (p.result || '');
    if (!p.dealt || Math.abs(own) >= 1) add((p.action === 'dig' && DIG_LABEL[p.dig]) || MAIN_LABEL[p.action] || p.title || '行動', own, ownText, p.direct?.byGroup || (asking(p.action) || p.action === 'rally' || p.action === 'dig' ? p.byGroup : null), true);
    for (const [label, votes, text] of parts) add(label, votes, text);
    add('地方小隊', p.network?.votes, p.network?.result || '地方小隊拉票');
    add('助手', (att.team?.votes || 0) - (p.network?.votes || 0), '助手拉票');
    add('看板', att.billboard?.votes, '看板讓人記得你');
    add('回應', att.rebuttal?.votes, (r.events || []).filter(e => e.rebuttal).map(e => e.title).join('、') || '回應小馬');
    const took = (r.offers || []).filter(o => o.status === 'accepted' && o.effect);
    add('合作', att.offer?.votes, took.map(o => '接受' + o.org + '：組織票 +' + num(o.bloc) + '、捐款 ' + wan(o.money) + '；公開後 ' + signedVotes(o.effect.contact) + ' 票' + (o.effect.cost ? '；' + o.effect.cost.text + ' ' + signedVotes(o.effect.cost.votes) + ' 票' : '')).join('。') || '合作');
    const events = (r.events || []).filter(e => !e.rebuttal);
    add(events.length && events.every(e => e.effects?.byGroup && /冷掉|趁虛/.test(e.title)) ? '冷掉' : '事件', att.events?.votes, events.map(e => e.title + '：' + (e.text || '')).join(' ') || '事件', events.length === 1 ? events[0].effects?.byGroup : null);
    add('對手', att.rival?.effectOnYou, rv.attack ? '小馬' + (rv.title || '攻擊你') : '小馬拉走一些支持你的人', rv.attack?.byGroup);
    // Rounded capsules add up to the rounded total; the remainder goes to the biggest capsule.
    const shown = items.filter(x => x.main || Math.abs(x.votes) >= 1).map(x => ({ ...x, v: Math.round(x.votes) })), gap = Math.round(r.totalVotes || 0) - shown.reduce((n, x) => n + x.v, 0);
    if (gap && shown.length) shown.reduce((a, x) => Math.abs(x.v) > Math.abs(a.v) ? x : a).v += gap;
    // What you did comes first, so the faces in the scene and the first number read the same way; the rest follow in order.
    shown.sort((a, b) => b.main - a.main);
    if (p.chief && !p.chief.broke) note('里長', p.chief.broken ? p.chief.name + '挺你，這裡的人更願意聽' : p.chief.name + '還不熟你（' + p.chief.visits + '／' + p.chief.need + ' 次），這裡的人先保留', !p.chief.broken);
    if (p.debateEdge) note('壓制', '你深入查過這題，台上壓制小馬：他 ' + signedVotes(p.debateEdge) + ' 票');
    if (p.action === 'press' && p.rivalHit && !p.exposed) note('爆料', '小馬 ' + signedVotes(p.rivalHit) + ' 票');
    if (p.bonusTopic) note('順便', '也看清了「' + G.TOPICS[p.bonusTopic].title + '」三群怎麼想');
    for (const o of (r.offers || []).filter(o => !(o.status === 'accepted' && o.effect))) note('合作', o.taker === 1 ? '小馬接下' + o.org + '：他多了約 ' + num(o.bloc) + ' 張組織票' : '你婉拒了' + o.org, o.taker === 1);
    if (r.weather?.id === 'rain') note('天氣', '下雨，街上人少');
    if (rv.challenge) note('要回應', '小馬質疑你：下回合結束前去拉票或上電視，就會被問到。', true);
    return { items: shown, notes };
  }
  function capsuleRow(r) {
    const { items, notes } = recapItems(r), pop = (text, groups) => '<span class="cap-pop">' + esc(text) + (groups ? groupDeltas(groups) : '') + '</span>';
    return '<div class="cap-row" aria-label="這回合的票從哪來">' + items.map(x => '<details class="cap ' + (x.v > 0 ? 'up' : x.v < 0 ? 'down' : 'zero') + (x.main ? ' main' : '') + '"><summary><b>' + esc(x.label) + '</b><span class="cap-v">' + signedVotes(x.v) + '</span></summary>' + pop(x.text, x.groups) + '</details>').join('') + notes.map(n => '<details class="cap note' + (n.warn ? ' warn' : '') + '"><summary><b>' + esc(n.label) + '</b></summary>' + pop(n.text) + '</details>').join('') + '</div>';
  }
  function hindsightMarkup(r) { const h = asking(r.player.action) && r.player.topic ? hindsightLine(state.hindsight?.[r.day]) : null; return h ? '<p class="recap-hindsight ' + h[2] + '"><b>檢討</b>' + esc(h[1]) + '</p>' : ''; }
  function reportCard(r, who) {
    return '<div class="recap-card"><div class="recap-person">' + esc(who) + '</div><h3>' + esc(r.title) + '</h3><p>' + esc(r.result) + '</p>' + (r.reason ? '<p class="cause">' + esc(r.reason) + '</p>' : '') + (r.teamReports || []).map(t => '<div class="team-report"><h4>' + esc(t.title || t.name) + '</h4><p>' + esc(t.result) + '</p></div>').join('') + '<div class="recap-cost"><span>支出 ' + money(r.cost) + '</span>' + (r.income ? '<span>募得 ' + money(r.income) + '</span>' : '') + '</div></div>';
  }
  function learnedLine(r) { return r.player.action === 'prepare' && r.player.topic !== 'tip' ? '<section class="preparation-takeaway"><b>查清楚：' + esc(G.TOPICS[r.player.topic].title) + '</b><p>' + esc(G.insightLine(state, r.player.topic)) + '</p></section>' : ''; }
  // The round just played, shown on the next round's plan until you set out; every round stays in 紀錄.
  const lastRound = () => state.phase === 'recap' ? state.recap : state.phase === 'plan' && state.journal.at(-1)?.day === state.day - 1 ? state.journal.at(-1) : null;
  // Top of 選戰動態: the capsules (what you did first), the hindsight line and, folded, the full record of both campaigns.
  function lastRoundMarkup(r) {
    const full = '<details class="recap-details"><summary>完整紀錄</summary>' + reportCard(r.player, state.player.name + '・你') + reportCard(r.rival, '小馬・對手') + '</details>';
    const answer = asking(r.player.action) && r.player.topic && r.player.action !== 'press' ? '<p class="answer-gain">你的回答 <b>' + signedVotes(r.player.direct?.votes || 0) + ' 票</b>' + info('現場的臉反映這句回答。助手、黨意、卡詞、對手與事件另外計入回合合計。') + '</p>' : '';
    return '<section class="last-round" aria-label="第 ' + r.day + ' 回合結果"><h3>第 ' + r.day + ' 回合<small>合計 ' + signedVotes(r.totalVotes) + ' 票</small></h3>' + answer + capsuleRow(r) + hindsightMarkup(r) + learnedLine(r) + full + '</section>';
  }
  // Top of the plan dock: one line, what you did and the round's total.
  function lastLine(r) { const main = recapItems(r).items.find(x => x.main); return '<p class="last-line"><span>第 ' + r.day + ' 回合</span>' + (main ? '<b class="' + (main.v > 0 ? 'up' : main.v < 0 ? 'down' : 'zero') + '">' + esc(asking(r.player.action) && r.player.action !== 'press' ? '你的回答' : main.label) + ' ' + signedVotes(main.v) + '</b>' : '') + '<span>合計 ' + signedVotes(r.totalVotes) + ' 票</span></p>'; }

  function rivalRoundText(r) {
    const rv = r.rival; if (!rv) return '';
    const where = rv.action === 'canvass' ? '到' + (rv.venueTitle || '街頭') : rv.action === 'tv' ? '上電視' : rv.action === 'debate' ? '在政見會' : '';
    const event = rv.attack ? '小馬' + where + (rv.title || '攻擊你的說法') + (rv.quote ? '，引用你說的「' + rv.quote + '」。' : '。') : rv.quote ? '小馬' + where + '談' + short(rv.topic) + '：「' + rv.quote + '」。' : '小馬這回合' + (rv.title || action(rv.action)?.title || '跑行程') + '。';
    return event + (rv.preempted ? '你先說清楚同一題，他的效果減半。' : rv.emptyChair ? '你沒出席，他獨占舞台。' : '') + (rv.challenge ? '第 ' + rv.challenge.deadline + ' 回合結束前可回應。' : '');
  }

  function dockRecap() {
    const r = state.recap; if (!r) return '';
    const p = r.player, summary = r.summary, items = recapItems(r).items, largest = [...items].sort((a, b) => Math.abs(b.v) - Math.abs(a.v))[0], headline = summary?.headline || (largest ? largest.label + ' ' + signedVotes(largest.v) + ' 票' : p.result);
    const sources = summary?.sources || items.map(x => ({ id: x.main ? 'answer' : x.label, label: x.label, votes: x.v, byGroup: x.groups }));
    const other = sources.filter(x => x.id !== 'answer' && Math.abs(x.votes) >= 1), before = summary?.before || { rank: r.raceBefore?.rank, gap: (r.raceBefore?.line || 0) - (r.raceBefore?.you || 0) }, after = summary?.after || { rank: r.race?.rank, gap: (r.race?.line || 0) - (r.race?.you || 0) };
    const gapText = gap => gap <= 0 ? '過線 ' + num(-gap) + ' 票' : '還差 ' + num(gap) + ' 票';
    const groups = p.direct?.byGroup, result = p.quote ? '「' + p.quote + '」' : p.result, opportunity = summary?.opportunity ? (summary.opportunity === 'organization' ? '你選擇地方成立會，成立或擴編小隊；錯過免費專訪。' : summary.opportunity === 'media' ? '你選擇免費專訪，省下 18 萬；錯過這次小隊成立或擴編。' : summary.opportunity) + (p.campaign?.text ? ' ' + p.campaign.text : '') : p.campaign?.text || '';
    const team = (p.teamReports || []).filter(x => x.knowledge || x.income).map(x => x.knowledge ? x.name + '查了' + short(x.knowledge) : x.name + '募得 ' + wan(x.income)).join('；');
    return '<section class="round-settlement" aria-label="第 ' + r.day + ' 回合結算"><header><span>第 ' + r.day + '／' + G.DAYS + ' 回合結算</span><h2>' + esc(headline) + '</h2></header><div class="settlement-lines"><section><h3>' + (p.quote ? '你的回答' : esc(p.title || '你的行動')) + '</h3><p>' + esc(result) + '</p>' + (groups ? groupDeltas(groups) : '') + (team ? '<small>' + esc(team) + '</small>' : '') + '</section><section><h3>其他影響</h3><p>' + (other.length ? other.map(x => esc(x.label) + ' <b>' + signedVotes(x.votes) + '</b>').join('・') + ' 票' : '沒有其他票數變化') + '</p><p class="settlement-rival">' + esc(rivalRoundText(r)) + '</p>' + (opportunity ? '<p class="settlement-choice">' + esc(typeof opportunity === 'string' ? opportunity : opportunity.text || opportunity.title || '') + '</p>' : '') + '</section><section class="settlement-standing"><h3>合計 ' + signedVotes(r.totalVotes) + ' 票</h3><p>第 ' + (before.rank || '—') + ' 名 → 第 ' + (after.rank || '—') + ' 名</p><small>' + esc(gapText(before.gap) + ' → ' + gapText(after.gap)) + '</small></section></div><details class="settlement-details"><summary>完整來源與對手動作</summary>' + capsuleRow(r) + reportCard(r.rival, '小馬・對手') + '</details><button class="primary-button" data-action="next-round">' + (r.day === G.DAYS ? '前往開票 →' : '開始第 ' + (r.day + 1) + ' 回合 →') + '</button></section>';
  }

  /* ---------- travel, result ---------- */
  function dockTravel() {
    const a = action(state.pending.id), stage = motion?.stage === 'perform';
    return '<div class="dock-travel">' + icon(a.id) + '<p>' + (stage ? '到了。' : esc(state.player.name) + '正在前往' + esc(placeName(a.id, state.pending.venue)) + '。') + '</p><button class="primary-button" data-action="skip">略過 →</button></div>';
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
    return '<svg class="trend" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + G.DAYS + ' 回合估票"><line x1="8" x2="' + (W - 8) + '" y1="' + y(LN).toFixed(1) + '" y2="' + y(LN).toFixed(1) + '" class="trend-line"/><text x="10" y="' + (y(LN) - 5).toFixed(1) + '" text-anchor="start" class="trend-label">' + (r ? '今年當選線 ' : '上一屆當選線 ') + num(LN) + '</text><polyline points="' + line('you') + '" class="trend-you"/>' + points.map((p, i) => '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(p.you).toFixed(1) + '" r="' + (p.final ? 4.2 : 2.6) + '" class="trend-dot' + (p.final ? ' final' : '') + '"/>').join('') + '</svg><p class="trend-key"><span class="k-you">你</span><span>出發 → 第 ' + G.DAYS + ' 回合估票 → 開票</span></p>' + (r && Math.abs(r.playerVotes - (points[points.length - 2]?.you || 0)) >= 100 ? '<p class="trend-note">最後一回合估 ' + num(points[points.length - 2].you) + ' 票，開票 ' + num(r.playerVotes) + ' 票：' + (r.playerVotes < points[points.length - 2].you && r.unkept?.length ? '差在被拆穿沒更正的保證（' + signedVotes(Math.round(r.unkept.reduce((n, u) => n + u.votes, 0))) + ' 票）和投票日的浮動。' : '差在投票日的浮動。') + '</p>' : '') + '';
  }
  // A round's total split by source, so a quiet round shows that 小馬, not the fundraising, cost the votes.
  function roundParts(x) {
    const list = [], add = (label, v) => { if (Math.abs(v || 0) >= 1) list.push(label + ' ' + signedVotes(v)); }, took = Math.round(-(x.byRival || 0));
    if (x.quiet) list.push(QUIET_WORD[x.action] + '不影響票數；沒拉票' + (took >= 1 ? '，對手' + (x.attack ? '攻擊你 −' : '拉走 ') + num(took) + ' 票' : ''));
    else if (x.dig) { list.push(x.dig === 'found' ? '挖到黑料' : x.dig === 'nothing' ? '沒挖到黑料' : '挖黑料被反咬'); add('你', x.direct); add(x.attack ? '對手攻擊' : '對手拉走', x.byRival); }
    else { add('你', x.direct); add(x.attack ? '對手攻擊' : '對手拉走', x.byRival); }
    add('助手', x.team); add('看板', x.billboard); add('合作', x.offer); add(x.planTitle || '出發前', x.plan); add('回應小馬', x.rebuttal); add(x.eventsTitle || '事件', x.events);
    const choice = state.journal.find(j => j.day === x.day)?.player?.campaignOpportunity;
    if (choice === 'organization') list.push('選地方成立會：留下或擴編小隊，錯過免費專訪');
    if (choice === 'media') list.push('選免費專訪：省下 18 萬，錯過地方小隊成立或擴編');
    return list.join('・');
  }
  function platformMarkup() {
    const v = state.result?.platform || G.platformView(state);
    return '<section class="platform-summary"><h3>我公開承諾的政見</h3><p>' + (v.items.length ? '列出最近公開的 ' + v.items.length + ' 項' + (v.omitted ? '；本局共有 ' + v.total + ' 項。' : '。') : '這次沒有公開提出具體政見或保證。研究過的題目不算公開承諾。') + '</p><ol>' + v.items.map(x => '<li><b>' + esc(x.title) + (x.kind === 'guarantee' ? '・保證' : '') + '</b><blockquote>「' + esc(x.quote) + '」</blockquote><small>第 ' + x.round + ' 回合・' + esc(x.action === 'offer' ? '接受合作並公開支持' : action(x.action)?.title || x.action) + (x.changed ? '・曾改口' : '') + '</small>' + (x.previous.length ? '<details><summary>查看先前說法</summary>' + x.previous.map(y => '<p>第 ' + y.round + ' 回合：「' + esc(y.quote) + '」' + (y.status === 'withdrawn' ? '（已撤回）' : '（已更改）') + '</p>').join('') + '</details>' : '') + '</li>').join('') + '</ol></section>';
  }
  function reportMarkup() {
    const r = state.result, bg = G.BACKGROUNDS[state.settings.background], party = G.PARTIES[state.settings.affiliation], ok = r.outcome === 'elected';
    const grade = gradeOf(r), verdict = grade.title + '・第 ' + r.rank + ' 名', nextGrade = grade.next ? '再多 ' + num(grade.next.votesNeeded) + ' 票就是' + grade.next.title : ok ? '已達最高當選等級' : '還差 ' + num(r.gap) + ' 票當選';
    const key = [...(r.roundsSummary || [])].sort((a, b) => Math.abs(b.votes) - Math.abs(a.votes)).slice(0, 3).map(x => x.day);
    const rounds = (r.roundsSummary || []).map(x => '<li' + (key.includes(x.day) ? ' class="key-round"' : '') + '><b>' + x.day + '</b><span>' + esc(x.action === 'canvass' ? x.where + '・談' + short(x.topic) : x.action === 'tv' ? '電視・談' + short(x.topic) : x.action === 'online' ? '直播・談' + short(x.topic) : x.action === 'debate' ? '政見會・談' + short(x.topic) : x.action === 'rally' ? x.where + '・造勢' : x.action === 'press' ? '記者會爆料' : action(x.action)?.title || x.action) + '</span><strong class="' + (x.votes >= 0 ? 'up' : 'down') + '">' + signedVotes(x.votes) + '</strong><small>' + (key.includes(x.day) ? '<em class="key-tag">影響最大前三</em>' : '') + esc(roundParts(x)) + (state.hindsight?.[x.day]?.best?.gain >= HINDSIGHT_MIN ? '<em class="miss-tag">答「' + esc(state.hindsight[x.day].best.text) + '」約多 ' + num(state.hindsight[x.day].best.gain) + ' 票</em>' : '') + '</small></li>').join('') + (r.unkept || []).map(u => '<li class="unkept"><b>✕</b><span>開票・被小馬拆穿的保證</span><strong class="down">' + signedVotes(u.votes) + '</strong><small>「' + esc(u.text) + '」沒有更正，信的人改投別人</small></li>').join('');
    // Your final votes split by group in proportion to the support model, so the three add up to the count.
    const est = r.race.groups.reduce((n, g) => n + g.you, 0) || 1, split = r.race.groups.map(g => r.playerVotes * g.you / est), pct = (v, t) => t ? '（' + (v / t * 100).toFixed(1) + '%）' : '', groups = r.race.groups.map((g, k) => '<div class="g-' + GROUP_KEYS[k] + '"><span class="dot"></span><b>' + esc(g.title) + '</b><span>' + num(split[k]) + ' 票' + pct(split[k], r.groupTotals?.[k]) + '</span></div>').join('');
    return '<article class="report-card"><header class="report-head"><div><span class="report-who">' + esc(state.player.name) + '｜' + esc(bg.title) + '・' + partyBadge(state.settings.affiliation) + esc(party.title) + '</span><h2 class="report-verdict ' + (ok ? 'win' : 'lose') + '">' + esc(verdict) + '</h2><p class="result-next-grade">' + esc(nextGrade) + '</p>' + (bestRecordStatus?.isNew ? '<p class="result-best">' + (bestRecordStatus.first ? '首次完成這個身分與政黨的選戰' : '刷新這個身分與政黨的最佳紀錄') + (bestRecordStatus.stored ? '' : '（本機紀錄未儲存）') + '</p>' : '') + '</div></header><figure class="report-scene" aria-label="' + esc(verdict + '的開票夜') + '">' + (Art?.countNight ? Art.countNight(r.outcome, { still: true, name: state.player.name, tally: { you: r.playerVotes, line: r.lastSeat, rank: r.rank, seats: r.seats } }) : '') + '</figure>' + platformMarkup() + '<div class="report-grid"><section class="report-main"><div class="report-numbers"><div><span>你的得票</span><strong>' + num(r.playerVotes) + '</strong><small>第 ' + r.rank + ' 名（前 ' + r.seats + ' 名當選）</small></div><div><span>當選線</span><strong>' + num(r.lastSeat) + '</strong><small>' + (ok ? '多 ' : '還差 ') + num(r.gap) + ' 票</small></div><div><span>得票率</span><strong>' + (r.valid ? (r.playerVotes / r.valid * 100).toFixed(1) + '%' : '—') + '</strong><small>有效票 ' + num(r.valid) + '</small></div></div>' + trendChart() + '<div class="report-groups">' + groups + '</div></section><section class="report-rounds"><h3>每回合做了什麼</h3><ol>' + rounds + '</ol></section></div></article>';
  }
  function dockResult() { return '<div class="dock-result"><p>投票結束，正在開票。</p><button class="primary-button" data-action="skip-count">略過演出 →</button></div>'; }
  function resultPanel() { return panel('開票', '計票中', ''); }
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
    const c = Math.max(0, Math.min(1, (t - COUNT.wait) / (COUNT.reveal - COUNT.wait))), you = revealed ? r.playerVotes : Math.round(r.playerVotes * countedShare(c, 'you'));
    const top = Math.max(r.playerVotes, r.lastSeat) * 1.12 || 1, width = v => Math.min(100, v / top * 100).toFixed(1) + '%';
    $('count-stage').textContent = t < COUNT.wait ? '投票結束，開票開始' : !revealed ? '開票中・已開 ' + Math.round(c * 100) + '%' : '開票結果・第 ' + r.rank + ' 名';
    $('count-you-name').textContent = state.player.name;
    $('count-votes').textContent = num(you);
    $('count-meter').style.width = width(you);
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
  // The one restart control moves rather than being duplicated: into the full count, onto the report, or back to the header.
  function placeRestart() {
    if (modal) return;
    const atResult = state.phase === 'result' && counting?.status !== 'inprogress', slot = atResult ? $('report-tools') : $('global-controls');
    if ($('new-game').parentNode !== slot) slot.appendChild($('new-game'));
    $('new-game').classList.toggle('primary-button', atResult);
  }
  function render() {
    if (selectedAction === 'prepare' && selectedTopic && (!G.availableTopics(state).some(t => t.id === selectedTopic) || state.player.studied?.[selectedTopic])) selectedTopic = null;
    dress(); header(); renderTeam(); renderWorld(); renderCounting(); renderReport(); renderEvents();
    document.body.dataset.art = Art?.getPack?.() || 'original';
    document.body.dataset.map = Art?.isToy?.() ? Art.getMap?.() || '' : '';
    $('art-switch').textContent = Art?.isToy?.() ? '霧面玩具 ▾' : '原版方塊 ▾';
    $('art-switch').disabled = state.phase === 'travel' || counting?.status === 'inprogress';
    $('dock-body').innerHTML = !state.started ? dockIntro() : state.phase === 'plan' ? dockPlan() : state.phase === 'travel' ? dockTravel() : state.phase === 'question' ? dockQuestion() : state.phase === 'recap' ? dockRecap() : dockResult();
    $('dock').dataset.phase = state.started ? state.phase : 'intro';
    document.body.dataset.mapExpanded = String(mapExpanded);
    $('map-toggle').setAttribute('aria-expanded', String(mapExpanded));
    $('map-toggle').textContent = mapExpanded ? '收起地圖・回到行程 ▴' : '查看地圖・' + (selectedAction ? '更換地點' : '選擇地點') + ' ▾';
    $('panel').innerHTML = !state.started ? intro() : state.phase === 'plan' ? planPanel() : state.phase === 'travel' ? travelPanel() : state.phase === 'question' ? '<button class="notes-entry" data-action="notes">現場小抄・研究與約定 ▸</button>' : state.phase === 'recap' ? '' : resultPanel();
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
    $('destination-marker').hidden = false; actorPosition($('destination-marker'), Art?.isToy?.() ? Art.visualRoute(id, state.pending.venue).at(-1) : destination, !!Art?.isToy?.());
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
    if (motion.id === 'recruit') { $('new-teammate').hidden = false; actorPosition($('new-teammate'), Art?.isToy?.() ? Art.slot('recruit', 1) : { x: position.x + 72, y: position.y + 11 }, !!Art?.isToy?.()); }
    render();
  }
  function clearMotion() {
    motion = null; Art?.walkStep?.(0,false); $('player').innerHTML = Art ? Art.avatar('player') : ''; $('player').classList.remove('walking'); $('world').classList.remove('performing');
    $('destination-marker').hidden = true; $('route-line').innerHTML = ''; $('action-effect').innerHTML = ''; $('new-teammate').hidden = true;
  }
  function finishTravel() {
    if (modal || document.hidden || state.phase !== 'travel') return;
    position = { ...destinationFor(state.pending.id, state.pending.venue) }; setPosition(); clearMotion();
    if (G.arrive(state)) { if (state.phase === 'recap') { finishRound(); return; } answerGuard = .5; save(); render(); focusDock(); revealDock(); announce('到了，選一句回應。'); }
  }
  // Only an explicit acknowledgement leaves settlement for planning or the vote count.
  function advance() {
    if (state.phase !== 'recap') return false;
    if (!G.next(state)) return false;
    selectedAction = null; selectedTopic = null; selectedVenue = null; resetToggles();
    if (state.phase === 'plan') { position = { ...anchors.start }; setPosition(); afterglow = null; for (const id of ['world', 'scene', 'map-hotspots', 'venue-scene']) { $(id).scrollLeft = 0; $(id).scrollTop = 0; } }
    else if (state.phase === 'result') { rememberBestResult(); afterglow = null; counting = { status: reduced.matches ? 'seen' : 'inprogress', elapsed: reduced.matches ? COUNT.end : 0 }; saveLast(); }
    return true;
  }
  function roundNews(r) { const main = recapItems(r).items.find(x => x.main); return '第 ' + r.day + ' 回合' + (main ? main.label + ' ' + signedVotes(main.v) + '，' : '') + '合計 ' + signedVotes(r.totalVotes) + ' 票。'; }
  function finishRound(prefix = '') {
    if (state.phase !== 'recap') return;
    afterglow = null; save(); render(); focusDock(); revealDock();
    announce(prefix + roundNews(state.recap) + '確認結算後再繼續。');
  }
  function endAfterglow() { if (!afterglow) return; afterglow = null; header(); renderWorld(); }
  function tick(dt) {
    if (state.phase === 'question' && !modal && !document.hidden && answerGuard > 0) answerGuard = Math.max(0, answerGuard - Math.max(0, Math.min(Number(dt) || 0, .1)));
    if (afterglow) {
      if (state.phase !== 'plan') afterglow = null;
      else if (!modal && !document.hidden) { afterglow.elapsed += Math.max(0, Math.min(Number(dt) || 0, .1)); if (afterglow.elapsed >= AFTERGLOW) endAfterglow(); }
      return;
    }
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
  function begin(id, config = planConfig()) {
    if (modal || locked || !state.started || state.phase !== 'plan') return;
    config = { ...config, revise: true };
    const p = G.preview(state, id, config);
    if (id === 'prepare' && allStudied()) { error = '議題都親自研讀過了，換個行程。'; render(); return; }
    if (config.booth && !p.booth) { error = '人手已用完，請先調整研究或募款攤。'; render(); return; }
    if (!p.allowed) { error = p.reason; render(); return; }
    locked = true;
    if (G.begin(state, id, config)) { error = ''; resetToggles(); save(); announce('第 ' + state.day + ' 回合：' + p.title + '，花費 ' + money(p.totalCost) + '。'); startMotion(); focusDock(); }
    locked = false;
  }
  // Each other answer replayed on a copy with the same draws, so the recap can say what a better answer was worth.
  function alternatives(id) {
    if (state.pending?.topic === 'tip') return null;
    const base = JSON.stringify(state);
    return G.question(state).options.filter(o => o.unlocked && o.id !== id).map(o => { const t = JSON.parse(base); return G.answer(t, o.id) ? { id: o.id, text: o.text, total: t.recap.totalVotes, byGroup: t.recap.totalByGroup || null } : null; }).filter(Boolean);
  }
  function remember(alts, option) {
    if (!alts) return;
    const r = state.recap, best = [...alts].sort((a, b) => b.total - a.total)[0], gain = best ? best.total - r.totalVotes : 0;
    (state.hindsight ||= {})[state.day] = { chosen: option.text, best: gain >= 1 ? { text: best.text, gain, byGroup: best.byGroup && r.totalByGroup ? best.byGroup.map((v, k) => v - r.totalByGroup[k]) : null } : null };
  }
  const HINDSIGHT_MIN = 30;
  // One line: the better answer and the group that would have made the difference.
  function hindsightLine(h) {
    if (!h) return null;
    if (!h.best || h.best.gain < HINDSIGHT_MIN) return ['檢討', '這題你答得最好。', ''];
    const k = h.best.byGroup ? h.best.byGroup.indexOf(Math.max(...h.best.byGroup)) : -1;
    return ['檢討', '答「' + h.best.text + '」約多 ' + num(h.best.gain) + ' 票' + (k >= 0 && h.best.byGroup[k] >= 1 ? '，差在' + groupTitle(k) + '（' + signedVotes(h.best.byGroup[k]) + '）' : '') + '。', 'warn'];
  }
  function answer(id) {
    if (modal || locked || state.phase !== 'question' || answerGuard > 0) return;
    const q = G.question(state), option = q?.options.find(o => o.id === id);
    if (!option?.unlocked) return;
    locked = true;
    const alts = alternatives(id);
    if (G.answer(state, id)) { remember(alts, option); const c = state.recap?.player?.conversation; finishRound(c ? c.reaction + ' ' : ''); }
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
    return raceBoard() + '<h3>' + esc(p.label) + '</h3><div class="poll-bars">' + [[esc(state.player.name) + '・你', p.percentages[0]], ['其他 ' + (G.ELECTION.candidates - 1) + ' 位', p.percentages[1] + p.percentages[2]], ['未決定', p.percentages[3]]].map(([name, v]) => '<div class="poll-line"><span>' + name + '</span><div class="poll-track"><i style="width:' + Math.max(0, Math.min(100, v)) + '%"></i></div><strong>' + pct(v) + '</strong></div>').join('') + '</div><h3>各群最在意的議題</h3><table class="race-groups"><thead><tr><th></th>' + topicsList.map(t => '<th>' + esc(short(t)) + '</th>').join('') + '</tr></thead><tbody>' + p.issuesByGroup.map((row, g) => '<tr><th><span class="dot g-' + GROUP_KEYS[g] + '"></span>' + esc(groupTitle(g)) + '</th>' + topicsList.map(t => '<td>' + pct(row[t]) + '</td>').join('') + '</tr>').join('') + '</tbody></table>';
  }
  // The rules on one screen: what a player needs at the start, in the game's cards; details come up where they bite, behind (i).
  function rulesMarkup() {
    const card = (title, body, cls) => '<section class="rule-card' + (cls ? ' ' + cls : '') + '"><h3>' + esc(title) + '</h3>' + body + '</section>';
    const faces = [['up', '喜歡'], ['flat', '沒感覺'], ['down', '不喜歡']].map(([t, w]) => '<span class="rule-face">' + (Art?.faceIcon ? Art.faceIcon(t) : '') + '<small>' + w + '</small></span>').join('');
    const acts = [];
    for (let d = 1; d <= G.DAYS; d++) { const a = G.actOf(d); if (!acts.length || acts.at(-1).id !== a.id) acts.push({ id: a.id, title: String(a.title).split('・')[1] || a.title, days: [] }); acts.at(-1).days.push(d); }
    const mark = d => d === G.DEBATE_ROUND ? '政見會' : d === G.GOTV_FROM ? '催票' : '';
    const timeline = '<ol class="rule-acts">' + acts.map(a => '<li style="--n:' + a.days.length + '"><span class="rule-days">' + a.days.map(d => '<i' + (mark(d) ? ' class="mark" title="' + mark(d) + '"' : '') + '>' + d + '</i>').join('') + '</span><small>' + esc(a.title) + '</small></li>').join('') + '</ol>';
    return '<div class="rules-grid">'
      + card('怎麼贏', '<p>票數前 <b>' + SEATS + '</b> 名當選。上屆第 ' + SEATS + ' 名 <b>' + num(G.LINE) + '</b> 票。</p>', 'rule-win')
      + card('每回合', '<ol class="rule-steps"><li>點地圖選地點</li><li>回答一題</li><li>看票從哪來</li></ol>')
      + card('三群人', '<p class="rule-faces">' + faces + '</p><p>長輩、中年、青年的臉色。沒去顧的那群會冷掉。</p>')
      + card('研究與回答', '<p>助手研究看方向；本人研究看強弱、提高說服力。實際票數在結算揭曉。</p>')
      + card('錢與助手', '<p>電視、造勢、看板要錢；募款或找頭人補。助手幫你研究、陪你拉票。</p>')
      + card('怎麼安排行程', '<p>常去同一個地方，居民會逐漸認得你；先研究再上節目，回答更有把握。臨時邀約出現時，再決定要不要改行程。</p>')
      + card('小馬', '<p>主要對手，會挑你的保證和做法。可以回應、澄清，或爆他的料。</p>', 'rule-rival')
      + card('三幕・' + G.DAYS + ' 回合', timeline + '<p class="rule-legend"><i aria-hidden="true"></i>第 ' + G.DEBATE_ROUND + ' 回合政見會，第 ' + G.GOTV_FROM + ' 回合起可以催票</p>', 'rule-wide') + '</div>';
  }
  function journalMarkup() { return state.journal.length ? state.journal.map(r => '<section class="journal-entry"><h3>第 ' + r.day + ' 回合<small>' + signedVotes(r.totalVotes) + ' 票</small></h3>' + capsuleRow(r) + hindsightMarkup(r) + '</section>').join('') : '<p>完成第一回合後，這裡會留下每回合的紀錄。</p>'; }
  function dossierMarkup(topic) { const t = G.TOPICS[topic]; return (state.player.insight?.[topic] ? '<p class="insight-line">' + esc(G.insightLine(state, topic)) + '</p>' : '') + (t.plans || []).map(p => '<div class="fact"><strong>' + esc(p.text) + '</strong><p>' + esc(p.detail) + '</p></div>').join(''); }
  function openDialog(type, extra) {
    if (type === 'dossier' && extra === 'tip') type = 'events';
    if (type === 'dossier' && (!G.TOPICS[extra] || !state.player.known.includes(extra))) return;
    const content = { campaign: ['本回合邀約', campaignCard], intel: ['選情與情報', intelMarkup], notes: ['現場小抄', questionPanel], budget: ['競選款', budgetMarkup], poll: ['選情與民調', () => pollMarkup(state.polls.at(-1))], rules: ['規則', rulesMarkup], tally: ['完整開票', tallyMarkup], events: ['黑料檔案', fileMarkup], file: ['黑料檔案', fileMarkup], journal: ['每回合紀錄', journalMarkup], dossier: [G.TOPICS[extra]?.title || '', () => dossierMarkup(extra)] }[type];
    if (!content) return;
    if (!modal) lastFocus = document.activeElement;
    // Only the full count carries the restart; any other dialog leaves it in the masthead or under the report.
    if (type === 'tally') $('dialog-tools').appendChild($('new-game')); else if ($('new-game').parentNode === $('dialog-tools')) { modal = null; placeRestart(); }
    modal = { type, extra }; lastFrame = null;
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
    counting = null; afterglow = null; clearMotion(); closeDialog();
    let newSeed = seed(); if (newSeed === state.seed) newSeed = (newSeed + 1) >>> 0;
    state = G.initial(newSeed, state.settings); dismissedFeedback = ''; mapTipDismissed = false; openingPick = null; bestRecordStatus = null;
    position = { ...anchors.start }; selectedTopic = null; selectedVenue = null; selectedAction = null; resetToggles(); error = ''; saveError = ''; saveNotice = ''; lastFrame = null; teamElapsed = 0; locked = false;
    $('dialog-body').innerHTML = ''; $('world').dataset.action = ''; $('world').classList.remove('motion-paused');
    setPosition(); save(); render(); focusDock(); window.scrollTo?.(0, 0); announce('新的一局：先選身分和政黨。');
  }
  function focusChoice(selector) { ($('dock').querySelector?.(selector) || $('map-hotspots').querySelector?.(selector) || $('panel').querySelector?.(selector))?.focus({ preventScroll: true }); }
  function dispatch(data) {
    endAfterglow();
    if (data.action === 'art-switch' && !modal && state.phase !== 'travel' && counting?.status !== 'inprogress') { Art?.setPack?.(Art.isToy() ? 'original' : 'matte-toy-v1'); dressed=''; $('venue-scene').dataset.key=''; scene(); render(); return; }
    if (data.action === 'dismiss-event' && !modal) { dismissedFeedback = state.crisis ? crisisKey(state.crisis) : ''; save(); renderEvents(); focusDock(); return; }
    if (data.action === 'expand-event' && !modal) { dismissedFeedback = ''; save(); renderEvents(); return; }
    if (data.action === 'close') { closeDialog(); return; }
    if (data.action === 'restart') { if (!modal || modal.type === 'tally') restart(); return; }
    if (data.action === 'dismiss-notice') { saveNotice = ''; showNotice(); return; }
    // From the dirt file: check a lead in place, or close it and set out to dig or release.
    if (data.action === 'verify' && modal?.type === 'file' && state.phase === 'plan') { if (G.verifyDirt(state, data.id)) { save(); render(); $('dialog-body').innerHTML = fileMarkup(); const x = G.fileView(state).items.find(i => i.id === data.id); announce('查證完成：' + (x?.truthLabel ? '已查證・' + x.truthLabel : DIRT_STATUS[x?.status] || '') + '。'); } return; }
    // The file's buttons already say what happens and what it costs, so they set out at once; if the round cannot start, the dock says why.
    if (data.action === 'file-go' && modal?.type === 'file' && state.phase === 'plan' && action(data.kind)) { closeDialog(); resetToggles(); selectedAction = data.kind; selectedTopic = null; exposePick = data.id || null; error = ''; begin(selectedAction, fileActionConfig(data.id)); if (state.phase === 'plan') { save(); render(); revealDock(); focusChoice('[data-action="confirm-action"]'); } return; }
    if (['campaign', 'intel'].includes(modal?.type) && ['campaign-opportunity', 'campaign-followup'].includes(data.action)) closeDialog();
    if (modal?.type === 'intel' && ['crisis', 'offer', 'clarify', 'pledge', 'events', 'file', 'dossier'].includes(data.action)) closeDialog();
    if (modal) return;
    if (['campaign', 'intel', 'notes', 'budget', 'poll', 'journal', 'dossier', 'events', 'tally', 'rules', 'file'].includes(data.action)) { openDialog(data.action, data.topic); return; }
    if (data.answer && state.phase === 'question') { answer(data.answer); return; }
    if (data.action === 'setting' && !state.started) {
      const records = { background: G.BACKGROUNDS, affiliation: G.PARTIES }[data.setting];
      if (!records?.[data.value]) return;
      if (G.configure(state, { [data.setting]: data.value })) { save(); render(); focusChoice('[data-action="setting"][data-setting="' + data.setting + '"][data-value="' + data.value + '"]'); } return;
    }
    if (data.action === 'opening' && !state.started && ['canvass', 'prepare', 'online'].includes(data.kind)) { openingPick = openingPick === data.kind ? null : data.kind; save(); render(); focusChoice('[data-action="opening"][data-kind="' + data.kind + '"]'); return; }
    if (data.action === 'dismiss-map-tip') { mapTipDismissed = true; save(); renderWorld(); return; }
    if (data.action === 'next-round' && state.phase === 'recap') { mapExpanded = false; if (advance()) { save(); render(); focusDock(); revealDock(); announce(state.phase === 'result' ? '投票結束，開始開票。' : '第 ' + state.day + ' 回合開始。'); } return; }
    if (data.action === 'skip-count') { finishCounting(); return; }
    if (data.action === 'skip') { if (motion) finishTravel(); return; }
    if (data.action === 'start' && !state.started) { if (G.start(state)) { saveNotice = ''; if (openingPick) { selectedAction = openingPick; selectedVenue = openingPick === 'canvass' ? G.venueView(state).find(v => v.main === G.routeView(state).group)?.id || 'market' : null; } save(); render(); focusDock(); announce('第一回合開始，' + (openingPick ? '首站已排好，檢查後出發。' : '點地圖上的地點出發。')); } return; }
    if (state.phase !== 'plan' || !state.started) return;
    if (data.action === 'toggle-map') { mapExpanded = !mapExpanded; render(); $('map-toggle').focus({ preventScroll: true }); return; }
    if (data.action === 'prepare-before-trip') { const topic = askPool().find(t => !state.player.known.includes(t) && G.availableTopics(state).some(x => x.id === t)); if (!topic) return; if (!openingPick && selectedAction === 'canvass') openingPick = 'canvass'; resetToggles(); selectedAction = 'prepare'; selectedVenue = null; selectedTopic = topic; error = ''; save(); render(); revealDock(); focusChoice('[data-action="confirm-action"]'); return; }
    if (data.action === 'advisor-select') {
      const pick = window.CampaignAdvisor?.resolve(G, state, data.id, { opening: openingPick }); if (!pick || !action(pick.action)) return;
      const config = pick.config || {}; resetToggles(); selectedAction = pick.action; selectedVenue = config.venue || null; selectedTopic = config.topic || null; brief = config.brief || null; respondOn = !!config.respond;
      campaignPick = config.campaignFollowup ? 'followup' : config.campaignOpportunity ? 'opportunity:' + config.campaignOpportunity : null; mapTipDismissed = true;
      error = ''; save(); render(); revealDock(); focusChoice('[data-action="confirm-action"]'); announce('已排入' + placeName(selectedAction, selectedVenue) + '，檢查安排後出發。'); return;
    }
    if (data.action === 'network-order' && ['venue', 'topic'].includes(data.field)) { const n = G.networkView?.(state); if (n?.active && G.setNetworkAssignment?.(state, { venue: data.field === 'venue' ? data.value : n.venue, topic: data.field === 'topic' ? data.value : n.topic })) { save(); render(); const disclosure = $('dock').querySelector?.('.network-orders'); if (disclosure) disclosure.open = true; $('dock').querySelector?.('[data-network="' + data.field + '"]')?.focus({ preventScroll: true }); announce('已更新地方小隊安排。'); } return; }
    if (data.action === 'debate-now' && state.day === G.DEBATE_ROUND) { resetToggles(); selectedAction = 'debate'; selectedVenue = null; selectedTopic = null; mapTipDismissed = true; begin('debate'); return; }
    if (data.action === 'respond-challenge') {
      const due = G.pendingChallenges(state);
      if (!due.length || (data.kind !== 'tv' && !due.some(c => c.venues.includes(data.venue)))) return;
      resetToggles(); selectedAction = data.kind === 'tv' ? 'tv' : 'canvass'; selectedVenue = selectedAction === 'canvass' ? data.venue : null; selectedTopic = null; respondOn = selectedAction === 'tv'; mapTipDismissed = true;
      error = ''; save(); render(); revealDock(); focusChoice('[data-action="confirm-action"]'); return;
    }
    if (data.action === 'campaign-opportunity' || data.action === 'campaign-followup') {
      const c = G.campaignView?.(state), pick = data.action === 'campaign-followup' ? c?.followup : c?.opportunity?.status === 'open' ? c.opportunity.choices.find(x => x.id === data.id) : null;
      if (!pick?.allowed || !action(pick.action)) return;
      resetToggles(); selectedAction = pick.action; selectedVenue = pick.config?.venue || null; selectedTopic = null; campaignPick = data.action === 'campaign-followup' ? 'followup' : 'opportunity:' + pick.id; error = ''; save(); render(); revealDock(); focusChoice('[data-action="confirm-action"]'); announce('已排入' + pick.title + '，出發會占一回合。'); return;
    }
    if (data.action === 'topic' && G.availableTopics(state).some(t => t.id === data.topic) && !state.player.studied?.[data.topic]) { selectedTopic = data.topic; researchPick = researchPick.filter(t => t !== selectedTopic); error = ''; save(); render(); focusChoice('[data-action="topic"][data-topic="' + selectedTopic + '"]'); return; }
    if (data.action === 'offer') { if (G.respondOffer(state, data.choice)) { save(); render(); announce(data.choice === 'accept' ? '已接受合作，立場已公開。' : '已婉拒合作。'); } return; }
    if (data.action === 'crisis') { if (G.respondCrisis(state, data.choice)) { save(); render(); focusDock(); announce(crisisChoice(state.crisis) + '，你的票數 ' + signedVotes(state.crisis.effect.votes) + '。結果已加入選戰動態。'); } return; }
    if (data.action === 'clarify') { if (G.clarify(state, data.id)) { save(); render(); announce('已發澄清文宣。'); } return; }
    if (data.action === 'pledge') { if (G.cleanPledge(state)) { save(); render(); announce('已宣示乾淨選戰。'); } return; }
    if (data.action === 'research') { const t = data.topic, own = selectedAction === 'prepare' ? (selectedTopic || G.preview(state, 'prepare', planConfig()).topic) : null; if (G.TOPICS[t] && t !== own && state.player.insight?.[t]?.level !== 'precise') researchPick = researchPick.includes(t) ? researchPick.filter(x => x !== t) : [...researchPick, t].slice(0, researchCapacity()); error = ''; save(); render(); focusChoice('[data-action="research"][data-topic="' + (t || '') + '"]'); return; }
    if (data.action === 'toggle') { const n = data.name; if (n === 'gifts') gifts = !gifts; else if (n === 'billboard') billboard = !billboard; else if (n === 'deep') deepOn = !deepOn; else if (n === 'booth') { const p = G.preview(state, selectedAction, planConfig()); if (booth || p.teamAssignments.some(x => !['research', 'stream'].includes(x.task))) booth = !booth; } else if (n === 'investigate') investigateOn = !investigateOn; else if (n === 'gotv') gotvOn = !gotvOn; else if (n === 'respond') { respondOn = !respondOn; if (respondOn) brief = null; } error = ''; save(); render(); focusChoice('[data-action="toggle"][data-name="' + n + '"]'); return; }
    if (data.action === 'expose') { exposePick = data.id || null; error = ''; save(); render(); focusChoice('[data-action="expose"][data-id="' + (data.id || '') + '"]'); return; }
    if (data.action === 'donor') { const scroll = $('dock').querySelector?.('.dock-options-body')?.scrollTop || 0; donor = data.id && G.BROKERS?.[data.id] ? data.id : null; error = ''; save(); render(); const options = $('dock').querySelector?.('.dock-options-body'); if (options) options.scrollTop = scroll; focusChoice('[data-action="donor"][data-id="' + (data.id || '') + '"]'); return; }
    if (data.action === 'brief' && G.TOPICS[data.topic]) { brief = brief === data.topic ? null : data.topic; respondOn = false; error = ''; save(); render(); focusChoice('[data-action="brief"][data-topic="' + data.topic + '"]'); return; }
    if (data.action === 'mode' && action(data.kind)) { campaignPick = null; selectedAction = data.kind; error = ''; save(); render(); focusChoice('[data-action="mode"][data-kind="' + data.kind + '"]'); return; }
    if (data.action === 'select-action' && action(data.kind)) {
      mapExpanded = false;
      mapTipDismissed = true;
      campaignPick = null; researchOpen = false; researchPick = []; deepOn = false; brief = null; respondOn = false;
      if (data.kind === 'canvass') { if (!(onSite(selectedAction) && data.venue === selectedVenue)) selectedAction = 'canvass'; if (venues[data.venue]) selectedVenue = data.venue; }
      else if (data.kind === 'tv') { if (!['tv', 'press'].includes(selectedAction)) selectedAction = 'tv'; }
      else selectedAction = data.kind;
      error = ''; save(); render(); revealDock(); focusChoice('[data-action="confirm-action"]');
      announce('已選' + placeName(selectedAction, plannedVenue()) + '，還沒出發。'); return;
    }
    if (data.action === 'confirm-action') { if (selectedAction) begin(selectedAction); return; }
  }

  document.addEventListener('change', event => { const field = event.target?.dataset?.network; if (field) dispatch({ action: 'network-order', field, value: event.target.value }); });
  $('world').addEventListener('click', endAfterglow);
  document.addEventListener('click', event => { const el = event.target.closest('[data-action],[data-answer]'); if (el && !el.disabled && !(el.dataset.action === 'restart' && event.detail > 1)) dispatch(el.dataset); });
  document.addEventListener('toggle', event => { if (event.target?.isConnected === false) return; if (event.target?.classList?.contains('research-disclosure')) researchOpen = event.target.open; if (event.target?.classList?.contains('extras-disclosure')) extrasOpen = event.target.open; if (event.target?.classList?.contains('topic-disclosure')) topicOpen = event.target.open; }, true);
  // One recap capsule open at a time in a row.
  document.addEventListener('toggle', event => { const d = event.target; if (d?.classList?.contains('cap') && d.open) for (const x of d.parentNode?.querySelectorAll?.('details.cap[open]') || []) if (x !== d) x.open = false; }, true);
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
    if (!event.target?.getAttribute?.('data-art-image') || !Art?.isToy?.() || event.target.isConnected === false) return;
    console.warn('Artwork load failed:', event.target.getAttribute('src') || event.target.getAttribute('href'));
    // A missing rain backdrop falls back to the dry one.
    const dry = event.target.getAttribute('data-art-fallback'); if (dry) { event.target.removeAttribute('data-art-fallback'); event.target.setAttribute('href', dry); return; }
    // A transient failed request must not replace the whole new map. Retry the piece once first.
    if (event.target.getAttribute('data-art-map') === 'kit') {
      if (!event.target.getAttribute('data-art-retried')) { const attr = event.target.getAttribute('src') ? 'src' : 'href', url = event.target.getAttribute(attr); event.target.setAttribute('data-art-retried', '1'); event.target.setAttribute(attr, url + (url.includes('?') ? '&' : '?') + 'art_retry=1'); return; }
      if (Art.useDistrictMap?.()) { scene(); render(); announce('簡化地圖素材重試後仍無法載入，暫用備用地圖。重新整理可重試，遊戲進度保留。'); return; }
    }
    Art.setPack('original'); dressed=''; $('venue-scene').dataset.key=''; scene(); render();
    announce('部分美術素材無法載入，已切回原版外觀，遊戲進度保留。');
  }, true);
  scene();
  if (state.phase === 'result' && reduced.matches && counting?.status === 'inprogress') { counting = { status: 'seen', elapsed: COUNT.end }; save(); }
  // A saved settlement waits for the same explicit acknowledgement after reload.
  if (state.phase === 'result') { rememberBestResult(); save(); }
  render();
  if (recoveredTravel) { position = { ...destinationFor(state.pending.id, state.pending.venue) }; setPosition(); if (G.arrive(state)) { if (state.phase === 'recap') finishRound('已恢復這回合的行程，沒有重複扣款。'); else { answerGuard = .5; save(); render(); announce('已恢復這回合的行程，沒有重複扣款。'); } } }
  if (window.requestAnimationFrame) window.requestAnimationFrame(frame);
  // Executes production event/state logic in the test harness; never bypasses engine validation.
  window.DayUI = Object.freeze({ dispatch, tick, getState: () => JSON.parse(JSON.stringify(state)), getPosition: () => ({ ...position }), getCounting: () => counting ? { ...counting } : null, getMotion: () => motion ? { id: motion.id, stage: motion.stage, index: motion.index } : null, storageKey: KEY });
})();
