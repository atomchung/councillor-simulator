/* Campaign v10 monthly-budget controller: one committed action per day, optional animation, no manual walking. */
(function () {
  'use strict';
  const G = window.DayGame, Art = window.DayArt, $ = id => document.getElementById(id);
  const KEY = 'wenshan-campaign-v10-1', LEGACY_KEY = 'wenshan-campaign-v10';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = n => Number(n || 0).toLocaleString('zh-TW') + ' 遊戲元';
  const wan = n => (Number(n || 0) / 10000).toLocaleString('zh-TW', { maximumFractionDigits: 2 }) + ' 萬';
  const pct = n => Number(n || 0).toLocaleString('zh-TW', { maximumFractionDigits: 2 }) + '%';
  const reduced = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  const fallback = { start: { x: 586, y: 331 }, prepare: { x: 534, y: 234 }, canvass: { x: 309, y: 355 }, tv: { x: 783, y: 374 }, fundraise: { x: 553, y: 432 }, recruit: { x: 713, y: 243 } };
  const anchors = Art?.anchors || fallback;
  const locations = { prepare: '資料工作室', canvass: '木柵市場', tv: '地方電視台', fundraise: '募款小廣場', recruit: '夥伴工作室' };
  const topics = Object.fromEntries(Object.entries(G?.TOPICS || {}).map(([id,topic]) => [id,topic.title]));
  const shortActions = {
    prepare: ['讀懂限制，解鎖兩種具體方案', '花一回合準備，本回合不增加曝光'],
    canvass: ['面對面說明，交流較深入', '停留人數受天氣影響'],
    tv: ['傳達給更多人，交流較淺', '原話容易被引用；曝光不等於支持'],
    fundraise: null,
    recruit: null
  };
  const icons = {
    prepare: '<path d="M4 4h6l2 2 2-2h6v15h-6l-2 2-2-2H4zM12 6v15M6 8h3M15 8h3M6 11h3M15 11h3"/>',
    canvass: '<path d="M3 7h18l-2-4H5zM4 7v13h16V7M8 20v-7h8v7M3 8c0 3 4 3 4 0 0 3 5 3 5 0 0 3 5 3 5 0 0 3 4 3 4 0"/>',
    tv: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="m8 2 4 4 4-4M8 22h8M9 10l6 3-6 3z"/>',
    fundraise: '<path d="M4 10h16v11H4zM3 10l4-5h10l4 5M9 14h6M12 3v5"/><path d="M15 3c0-3-3-1-3 0 0-1-3-3-3 0 0 2 3 4 3 4s3-2 3-4"/>',
    recruit: '<circle cx="9" cy="7" r="3"/><path d="M3 21v-5c0-5 12-5 12 0v5M18 7v8M14 11h8"/>'
  };
  let state, selectedTopic = null, selectedVenue = null, topicOptionsOpen = false, selectedAction = null, selectedAnswer = null, teamMode = 'together', responseMode = 'repeat', optionsOpen = false, modal = null, lastFocus = null;
  let teamElapsed = 0;
  let position = { ...anchors.start }, motion = null, lastFrame = null, error = '', saveError = '', locked = false;
  const seed = () => window.crypto?.getRandomValues ? window.crypto.getRandomValues(new Uint32Array(1))[0] : (Date.now() ^ Math.floor(Math.random() * 4294967296)) >>> 0;
  if (!G) {
    $('panel').innerHTML = '<div class="panel-content"><h2>遊戲程式尚未載入</h2><p>請重新整理。原有版本的存檔不會被覆蓋。</p><a href="legacy-v9/index.html">開啟保留的舊規則 v9</a></div>';
    return;
  }
  function validSaved(s) {
    const array = x => Array.isArray(x);
    return s && s.version === G.VERSION && Number.isInteger(s.seed) && typeof s.started === 'boolean' && Number.isInteger(s.day) && s.day >= 1 && s.day <= G.DAYS && ['plan','travel','question','recap','result'].includes(s.phase) && s.player && s.rival && s.budget && ['committed','personalContribution','donations','deposit','available','spent'].every(k => Number.isFinite(s.budget[k]) && s.budget[k] >= 0) && array(s.player.known) && s.player.known.every(t => !!G.TOPICS[t]) && array(s.player.promises) && array(s.player.actions) && s.player.counts && Number.isFinite(s.player.recognition) && array(s.rival.known) && array(s.rival.promises) && array(s.rival.actions) && s.rival.counts && s.rival.budget && array(s.voters) && s.voters.length === G.POPULATION && s.voters.every(v => array(v.support) && v.support.length === 3 && v.support.every(Number.isFinite) && Number.isFinite(v.priority) && Number.isFinite(v.accuracy)) && array(s.polls) && s.polls.every(p => array(p.percentages) && p.percentages.length === 4 && p.percentages.every(Number.isFinite)) && array(s.journal) && array(s.ledger) && (!['travel','question'].includes(s.phase) || (s.pending && G.ACTIONS.some(a => a.id === s.pending.id) && !!G.TOPICS[s.pending.topic])) && (s.phase !== 'recap' || !!(s.recap?.player && s.recap?.rival && s.recap?.poll)) && (s.phase !== 'result' || (s.result && ['elected','refunded','forfeited'].includes(s.result.outcome) && array(s.result.tally) && s.result.tally.length === 19 && Number.isFinite(s.result.cash) && Number.isFinite(s.result.playerVotes) && Number.isFinite(s.result.rank)));
  }
  let recoveredTravel = false, migratedLegacy = false, migrationNotice = '';
  try {
    const currentRaw = window.localStorage.getItem(KEY), raw = currentRaw === null ? window.localStorage.getItem(LEGACY_KEY) : currentRaw, parsed = raw ? JSON.parse(raw) : null;
    if (validSaved(parsed)) {
      migratedLegacy = currentRaw === null;
      state = G.upgrade(parsed); selectedTopic = parsed._ui?.topicMode === 'manual' && G.TOPICS[parsed._ui?.topic] ? parsed._ui.topic : null;
      selectedVenue = G.VENUES?.[parsed._ui?.venue] ? parsed._ui.venue : null;
      selectedAction = G.ACTIONS.some(a=>a.id===parsed._ui?.action) ? parsed._ui.action : null;
      selectedAnswer = typeof parsed._ui?.answer==='string' ? parsed._ui.answer : null;
      teamMode = ['together','research','canvass'].includes(parsed._ui?.teamMode) ? parsed._ui.teamMode : 'together';
      responseMode = parsed._ui?.responseMode==='answer' ? 'answer' : 'repeat';
      if (Number.isFinite(parsed._ui?.x) && Number.isFinite(parsed._ui?.y)) position = { x: Math.max(0,Math.min(1200,parsed._ui.x)), y: Math.max(0,Math.min(650,parsed._ui.y)) };
      recoveredTravel = state.phase === 'travel';
    } else {
      state = G.initial(seed());
      if (raw) saveError = '這份競選存檔無法讀取，已開啟新局；更早版本的存檔不受影響。';
    }
  } catch (_) { state = G.initial(seed()); saveError = '目前無法讀取本機存檔。仍可遊玩，請勿依賴重新整理後續玩。'; }
  const roundDays = G.ROUND_DAYS || 3;
  const period = day => '第 '+((day-1)*roundDays+1)+'–'+(day*roundDays)+' 天';
  const eligibleTeam = () => (state.player.team?.members || []).filter(m=>m.hiredDay<state.day);
  const icon = id => '<span class="action-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' + (icons[id] || icons.prepare) + '</svg></span>';
  const action = id => G.ACTIONS.find(a => a.id === id);
  const venues = G.VENUES || { market: { id:'market', title:'木柵市場', topics:['access','drain'], anchor:anchors.canvass, description:'和攤商、買菜居民聊聊。' } };
  const venueId = value => venues[value] ? value : 'market';
  const suggestedVenue = () => venueId(typeof G.suggestVenue === 'function' ? G.suggestVenue(state) : 'market');
  const plannedVenue = () => venueId(selectedVenue || suggestedVenue());
  const destinationFor = (id, venue) => id === 'canvass' ? venues[venueId(venue)].anchor : (anchors[id] || anchors.start);
  const placeName = (id, venue) => id === 'canvass' ? venues[venueId(venue)].title : (locations[id] || '競選辦公室');
  // Reuse the miniature's existing pedestrian junctions, with only the final branch varying.
  function routeFor(id, venue) {
    const destination=destinationFor(id,venue),routes=Art?.route;
    if(id!=='canvass')return routes ? Art.route(id) : [{...anchors.start},{...destination}];
    if(venueId(venue)==='market'){const route=routes?Art.route(id):[{...anchors.start},{...destination}];return [...route.slice(0,-1),{...destination}];}
    const branch={street:'tv',plaza:'recruit',river:'fundraise'}[venueId(venue)]||'canvass';
    const route=routes ? Art.route(branch) : [{...anchors.start}];
    return [...route.slice(0,-1),{...destination}];
  }
  const previousPosition = topic => [...state.player.actions].reverse().find(a=>a.topic===topic&&a.answer&&['canvass','tv'].includes(a.action));
  const availableTopics = () => typeof G.availableTopics === 'function' ? G.availableTopics(state) : Object.values(G.TOPICS);
  // Event display must only use the engine's player-visible projection, never the seeded event state.
  const eventView = () => typeof G.eventView === 'function' ? G.eventView(state) : {};
  const recordText = value => typeof value === 'string' ? value : value?.text || value?.quote || value?.summary || '';
  function topicStatus(id, events=eventView()) {
    if(id==='tip')return (events.tip?.evidenceText || '線索尚未查證')+'・'+(previousPosition(id)?'已回答':'尚未回答');
    return (state.player.known.includes(id)?'已準備':'尚未準備')+'・'+(previousPosition(id)?'已回答':'尚未回答');
  }
  const investigationStatus = e => e.canInvestigate===false ? (e.update?'後續核對已到，不再安排查證或收資料費。':'已達本局查證上限，不再收資料費。') : '';
  function eventCards(choose=true) {
    const events=eventView();
    return '<section class="event-cards" aria-label="本局可選事件">'+['welfare','tip'].filter(id=>events[id]?.available).map(id=>{
      const e=events[id];
      return '<article class="event-card"><div class="event-card-label">本局虛構事件・可自由選擇</div><h3>'+esc(e.title)+'</h3><p>'+esc(e.request||e.summary)+'</p><p>'+esc(id==='tip'?e.evidenceText:(typeof e.npc==='string'?e.npc:e.npc?.name))+'</p>'+(id==='tip'&&investigationStatus(e)?'<p>'+esc(investigationStatus(e))+'</p>':'')+(choose?'<button data-action="topic" data-topic="'+id+'" aria-pressed="'+(selectedTopic===id)+'">'+(selectedTopic===id?'已追蹤這個議題':'追蹤這個議題')+'</button>':'')+'<button class="text-button" data-action="events" data-topic="'+id+'">查看事件紀錄 ↗</button></article>';
    }).join('')+'</section>';
  }
  function costBreakdown(r, preview=false) {
    const base=Number.isFinite(r.baseCost)?r.baseCost:0, extra=Number(r.eventCost||0), total=preview?r.totalCost:(r.cost??r.totalCost), recruit=(r.id||r.action)==='recruit';
    return '<span class="'+(preview?'action-cost-breakdown':'cost-breakdown')+'">'+(recruit?'新人剩餘月薪':'主要行程')+' '+money(base)+(extra?' ＋ 查證資料費 '+money(extra):'')+' ＝ '+money(total)+'</span>';
  }
  function eventEffects(e) {
    if(!e||!Number.isFinite(e.supportBefore)||!Number.isFinite(e.supportAfter))return '';
    return '<div class="event-effects"><p>本段事件後續的內部支持傾向：<b>'+pct(e.supportBefore)+' → '+pct(e.supportAfter)+'</b></p><p>接觸 '+Number(e.contacts||0)+' 人：肯定 '+Number(e.positive||0)+'／保留 '+Number(e.reserved||0)+'</p><p class="microcopy">這是遊戲模型的局部反應，不是新增選票；與上方主要行程、團隊工作分開記錄。</p></div>';
  }
  function eventReports(items) {
    if(!Array.isArray(items)||!items.length)return '';
    return '<section class="event-followups"><h3>事件後續</h3>'+items.map(e=>'<article class="event-report"><h4>'+esc(e.title)+'</h4><p>'+esc(e.text)+'</p>'+(e.reason?'<p class="cause">'+esc(e.reason)+'</p>':'')+(e.quote?'<div class="quoted-line"><small>保留當時的原話</small>「'+esc(e.quote)+'」</div>':'')+eventEffects(e.effects)+(Number(e.cost)>0?'<p class="microcopy">本段已記錄費用 '+money(e.cost)+'；不會因查看紀錄再次扣款。</p>':'')+'</article>').join('')+'</section>';
  }
  function eventSummary(items=state.result?.eventSummary) {
    return Array.isArray(items)&&items.length?'<section class="event-retrospective"><h3>這場競選的事件回顧</h3><ul>'+items.map(text=>'<li>'+esc(text)+'</li>').join('')+'</ul></section>':'';
  }
  function eventRecord(value, label) {
    if(!value)return '';
    const text=recordText(value), reason=typeof value==='object'?value.reason:'', round=typeof value==='object'?(value.round||value.day):null;
    return '<div class="fact"><strong>'+esc(label)+(round?'・第 '+Number(round)+' 回合':'')+'</strong>'+(text?'<p>'+esc(text)+'</p>':'')+(reason?'<p class="microcopy">'+esc(reason)+'</p>':'')+(value.evidenceText?'<p class="microcopy">當時掌握的證據：'+esc(value.evidenceText)+'</p>':'')+'</div>';
  }
  function eventsMarkup(topic) {
    const events=eventView();let body='<p class="microcopy">NPC、請託、線索與查證結果都是本局虛構情境。這裡只顯示目前已得知的紀錄；開啟不會花錢或推進回合。</p>';
    if(events.tip?.available&&topic!=='welfare'){
      const e=events.tip;
      body+='<section class="event-record"><h3>'+esc(e.title)+'</h3><p>'+esc(e.summary)+'</p><div class="event-evidence"><b>'+esc(e.evidenceText)+'</b><span>已查證 '+Number(e.investigations||0)+'／'+Number(e.maxInvestigations||2)+' 次</span></div>';
      const research=state.journal.filter(r=>r.player.topic==='tip');
      body+=research.map(r=>{const items=[...(r.player.facts||[]),...(r.player.teamReports||[]).filter(t=>t.task==='research'&&t.knowledge==='tip').map(t=>({title:t.name+'・查證回報',text:t.result}))];return items.length?'<h4>第 '+r.day+' 回合・查到的資料</h4>'+factsMarkup(items):'';}).join('');
      body+=(e.history?.length?'<div class="event-history"><h4>查證與發言的原始紀錄</h4>'+e.history.map(x=>eventRecord(x,x.quote?'當時留下的說法':'第 '+Number(x.stage||x.evidenceLevel||0)+' 次查證')).join('')+'</div>':eventRecord(e.publication,'你的公開處理'))+eventRecord(e.update,'後續查證紀錄')+(e.truthLabel?'<p class="verified-outcome"><b>目前可見的核對結論：</b>'+esc(e.truthLabel)+'</p>':'')+(e.responseDue?'<p class="followup-note">這筆公開紀錄有新資料待回應；下次選這個議題公開時，仍只會問一題。</p>':'')+'<p class="microcopy">每次查證資料費 '+money(e.investigationCost)+'，最多 '+Number(e.maxInvestigations||2)+' 次。'+esc(investigationStatus(e))+'主角準備占本回合主要行程；夥伴查資料占一人的工作，已付月薪不再加收。未查證也可選擇保留線索；公開說法由你決定。</p></section>';
    }
    if(events.welfare?.available&&topic!=='tip'){
      const e=events.welfare,npc=typeof e.npc==='string'?e.npc:[e.npc?.name,e.npc?.role].filter(Boolean).join('・');
      body+='<section class="event-record"><h3>'+esc(e.title)+'</h3>'+(npc?'<p class="event-card-label">'+esc(npc)+'</p>':'')+'<p>'+esc(e.request)+'</p>'+eventRecord(e.reply,'你留下的回覆')+(e.promise?promises([e.promise]):'')+'</section>';
    }
    const entries=state.journal.flatMap(r=>(r.events||[]).filter(e=>!topic||!e.topic||e.topic===topic).map(e=>({...e,title:'第 '+r.day+' 回合・'+e.title})));
    body+=eventReports(entries)+eventSummary();
    return body;
  }
  function save() {
    state._ui = { x: position.x, y: position.y, topic: selectedTopic, topicMode: selectedTopic ? 'manual' : 'auto', venue: selectedVenue, action: selectedAction, answer: selectedAnswer, teamMode, responseMode };
    try { window.localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (_) { saveError = '瀏覽器無法儲存進度。這一頁仍可繼續玩，關閉或重新整理可能會失去進度。'; }
    $('save-warning').hidden = !(saveError||migrationNotice); $('save-warning').textContent = saveError||migrationNotice;
  }
  function announce(text) { $('announcer').textContent = text; }
  function focusPanel(reveal=false) { $('interaction').focus({ preventScroll: true }); if(reveal && window.innerWidth<1024) $('interaction').scrollIntoView?.({behavior:reduced.matches?'auto':'smooth',block:'start'}); }
  function actorPosition(el, p) { el.style.left = p.x / 12 + '%'; el.style.top = p.y / 6.5 + '%'; el.style.zIndex = String(Math.round(p.y)); }
  function setPosition() { actorPosition($('player'), position); }
  function scene() {
    $('scene').innerHTML = Art ? Art.scene() : '<p class="blank-scene">小鎮圖像未能載入，右側行動仍可正常遊玩。</p>';
    $('player').innerHTML = Art ? Art.avatar('player') + '<span class="actor-name">阿夏・你</span>' : '<span class="actor-name">阿夏・你</span>';
    $('rival').innerHTML = Art ? Art.avatar('rival') + '<span class="actor-name">周沐</span>' : '';
    actorPosition($('rival'), { x: 690, y: 354 });
    $('new-teammate').innerHTML = Art ? Art.avatar('helper') + '<span class="actor-name">新夥伴</span>' : '';
    const venueLabels={market:{x:309,y:397},street:{x:664,y:428},plaza:{x:808,y:277},river:{x:473,y:532}};
    const labelPoints = { prepare: {x:468,y:178}, canvass:{x:278,y:286},tv:{x:887,y:307},fundraise:{x:586,y:491},recruit:{x:747,y:167} };
    $('map-labels').innerHTML = Object.keys(locations).filter(id=>id!=='canvass').map(id => '<span class="map-label" data-label="'+id+'" style="left:'+labelPoints[id].x/12+'%;top:'+labelPoints[id].y/6.5+'%">'+locations[id]+'</span>').join('')+Object.values(venues).map(v=>'<span class="map-label venue-label" data-label="'+v.id+'" style="left:'+(venueLabels[v.id]?.x||v.anchor.x)/12+'%;top:'+(venueLabels[v.id]?.y||v.anchor.y+37)/6.5+'%">'+esc(v.title)+'</span>').join('');
    setPosition();
  }
  function header() {
    $('day-label').innerHTML = (state.phase === 'result' ? '開票結算' : '第 ' + state.day + ' 回合') + '<span>／ ' + G.DAYS + '</span>';
    $('day-dots').innerHTML = Array.from({length:G.DAYS},(_,i) => '<i class="'+(state.phase === 'result' || i+1 < state.day ? 'done' : i+1===state.day ? 'current':'')+'"></i>').join('');
    $('cash').textContent = wan(state.budget.available);
    $('prepared-count').innerHTML = state.player.known.length + '<span>個議題</span>';
    const poll = state.polls.at(-1);
    $('poll-you').textContent = poll ? '你 ' + pct(poll.percentages[0]) : '尚未抽樣';
    $('poll-rival').textContent = poll ? '周沐 ' + pct(poll.percentages[1]) + ' · ' + (poll.day ? '第 '+poll.day+' 回合' : '出發前') : '開始後顯示全選區樣本';
    $('journal-count').textContent = String(state.journal.length);
    $('knowledge').innerHTML = state.player.known.length ? state.player.known.map(id => '<button data-action="'+(id==='tip'?'events':'dossier')+'" data-topic="'+esc(id)+'">'+esc(topics[id])+' ↗</button>').join('') : '還沒準備議題';
    const crewCount=state.player.team?.members?.length||0;
    $('team-summary').textContent = '團隊 '+(crewCount+1)+' 人（含你）'+(crewCount?' · '+crewCount+' 位夥伴'+(state.started?'本月合約已付':'待付本月合約'):' · 獨自出發')+(crewCount>3?' · 場景僅顯示代表':'');
    $('day-kicker').textContent = state.started ? 'ROUND ' + String(state.day).padStart(2,'0') + ' / ' + String(G.DAYS).padStart(2,'0') + ' · '+period(state.day) : '臺北市文山區・木柵 / 示意街區';
    $('world-title').textContent = !state.started ? '從巷口，走進大家的日常。' : state.phase === 'plan' ? (state.day===G.DAYS?'最後一回合，你想留下什麼？':state.day===1?'本回合，把時間花在哪裡？':'第 '+state.day+' 回合，接著做一件重要的事。') : state.phase === 'result' ? '票已開出，說過的話仍會留下。' : (action(state.pending?.id)?.title || '本回合的行程') + '，出發。';
    const r = state.recap || state.journal.at(-1);
    $('news-label').textContent = r ? '第 '+r.day+' 回合 · 對手的行程' : '街角消息';
    $('town-news').textContent = r ? '周沐｜' + r.rival.title + '。' + r.rival.result : '你忙著準備的時候，對手也在安排自己的行程。';
    const located=state.pending||((state.phase==='recap')?state.recap?.player:null);
    $('location-label').textContent = located ? placeName(located.id||located.action,located.venue) : selectedAction ? placeName(selectedAction,plannedVenue()) : '競選辦公室';
    $('save-warning').hidden = !(saveError||migrationNotice); $('save-warning').textContent = saveError||migrationNotice;
  }
  function panel(kicker, label, body, primary='', atTop=false) {
    const controls=primary?'<div class="panel-primary'+(atTop?' primary-top':'')+'">'+primary+'</div>':'';
    return '<div class="panel-kicker"><span>'+kicker+'</span><span>'+label+'</span></div>'+(atTop?controls:'')+'<div class="panel-content">'+(error?'<div class="error-message" role="alert">'+esc(error)+'</div>':'')+body+'</div>'+(!atTop?controls:'');
  }
  function intro() {
    return panel('競選到開票',(G.DAYS*roundDays)+' 天 · '+G.DAYS+' 回合','<span class="intro-tag">你是阿夏，第一次投入競選。</span><h2 class="intro-title">走進街區，聊一聊。<br>一路，走到開票。</h2><p class="lead">居民記得你說過的話。<br>走近、回答，看他們當場的反應。</p><div class="intro-path"><b>選行動</b><span>→</span><b>自動出發</b><span>→</span><b>聊一聊</b></div><div class="monthly-intro"><b>30 天的團隊，月初一次付薪</b><p>你不領薪。本局假設月薪 50,000 遊戲元。兩位夥伴開始時預付共 100,000 遊戲元；可用款由 84 萬變為 74 萬。之後拜票、一般準備與募款不另收薪資。</p></div><a class="legacy-version-link" href="legacy-v10/index.html"><b>繼續原本 v10 進度 ↗</b><span>原局與原存檔保留；新版使用獨立進度。</span></a><a class="legacy-version-link" href="legacy-v9/index.html"><b>想接著玩舊局？開啟 v9 舊存檔 ↗</b><span>新規則另開新競選，舊存檔保持不變。</span></a>','<button class="primary-button" data-action="start">支付本月薪資，開始競選 →</button>');
  }
  const planConfig = () => ({ ...(selectedTopic&&['prepare','canvass','tv'].includes(selectedAction)?{topic:selectedTopic}:{}), venue:plannedVenue(), teamMode, responseMode });
  const modeLabels = {together:'全體跟隨主要行動',research:'一位夥伴查資料',canvass:'一位夥伴代為拜訪'};
  function selectedEvent(topic=selectedTopic) {
    const events=eventView(),e=events[topic];
    if(!e?.available)return '';
    return '<div class="selected-event"><b>'+esc(e.title)+'</b><p>'+esc(topic==='tip'?e.evidenceText:e.request)+'</p><button class="text-button" data-action="events" data-topic="'+topic+'">'+(topic==='tip'?'查看證據與原話':'查看請託紀錄')+' ↗</button></div>';
  }
  function topicDetail(p) {
    if(!p||!['prepare','canvass','tv'].includes(selectedAction))return '';
    const prior=p.stance||previousPosition(p.topic),publicAction=['canvass','tv'].includes(selectedAction),label=selectedAction==='prepare'?'這次查資料':'這次會談到';
    return '<div class="topic-context" data-current-topic="'+esc(p.topic)+'"><b>'+label+'：'+esc(topics[p.topic])+'</b>'+(G.TOPICS[p.topic]?.scope?'<span class="topic-scope">'+esc(G.TOPICS[p.topic].scope)+'</span>':'')+'<p>'+esc(p.topicReason||'依照這次的行程安排。')+'</p><p class="stored-position">'+(prior?.quote?'已存立場：'+esc(sceneLine(prior.quote))+(prior.status?'（'+esc(({unresolved:'尚未實現',pending:'尚未實現',corrected:'已更正'}[prior.status]||prior.status))+'）':''):'尚未留下公開答覆。')+'</p>'+(publicAction?'<p class="action-response">'+(p.willAsk?'現場聊一題：':'沿用答覆，不再提問：')+esc(p.questionReason||p.responseReason)+'</p>':'')+'</div>';
  }
  function topicOptions(p) {
    if(!p||!['prepare','canvass','tv'].includes(selectedAction))return '';
    const prepare=selectedAction==='prepare',summary=prepare?'改查其他資料':'追蹤已談議題／調整立場';
    return '<details class="topic-options"'+(topicOptionsOpen?' open':'')+'><summary>'+summary+(selectedTopic?' · 已指定':'')+'</summary><div class="topic-options-content"><p class="microcopy">'+(prepare?'已替這回合安排建議資料，也可改查下列議題。':'平常依地點與現場狀況安排。想接著談同一件事，再指定議題。')+'</p><button class="topic-auto" data-action="topic-auto" aria-pressed="'+(!selectedTopic)+'">'+(prepare?'採用建議資料':'依這次行程安排')+'</button><div class="topic-picks">'+availableTopics().map(({id,title})=>'<button class="topic-pick '+(selectedTopic===id?'selected':'')+'" data-action="topic" data-topic="'+id+'" aria-pressed="'+(selectedTopic===id)+'"><b>'+esc(title)+'</b><small>'+esc(topicStatus(id))+'</small></button>').join('')+'</div>'+(!prepare?'<div class="response-choice"><p>'+(responseMode==='answer'?'本回合會重新選一次答覆。':'已有答覆就沿用；遇新資料或尚未回應的新質疑才問一題。')+'</p><button data-action="response" aria-pressed="'+(responseMode==='answer')+'">'+(responseMode==='answer'?'改為沿用答覆':'調整本回合的答覆')+'</button></div>':'')+'</div></details>';
  }
  function plan() {
    const members=eligibleTeam(),config=planConfig(),p=selectedAction?G.preview(state,selectedAction,config):null;
    const current=G.preview(state,'fundraise',{teamMode:'together'}),roster=current.rosterSize??((state.player.team?.members?.length||0)+1);
    const title=p?(p.title||action(selectedAction).title):'先選擇一個主要行動';
    const cards='<div class="action-list compact-actions" aria-label="選擇一個主要行動">'+G.ACTIONS.map(a=>{
      const label=a.id==='recruit'?'招募團隊':a.title;
      return '<button class="day-action'+(selectedAction===a.id?' selected':'')+'" data-action="select-action" data-kind="'+a.id+'" aria-pressed="'+(selectedAction===a.id)+'" aria-label="'+esc(label+'，選擇後查看費用與詳情')+'">'+icon(a.id)+'<b>'+esc(label)+'</b></button>';
    }).join('')+'</div>';
    const venuePicker=selectedAction==='canvass'?'<section class="venue-picker" aria-label="選擇拜票地點"><div class="venue-heading"><b>這次去哪裡？</b><span>確認前可免費更改</span></div><div class="venue-picks">'+Object.values(venues).map(v=>'<button class="venue-pick'+(plannedVenue()===v.id?' selected':'')+'" data-action="venue" data-venue="'+v.id+'" aria-pressed="'+(plannedVenue()===v.id)+'" title="'+esc(v.description)+'"><b>'+esc(v.title)+'</b><small>'+(v.id===suggestedVenue()?'建議行程':({market:'市場日常',street:'生活動線',plaza:'居民交流',river:'休憩散步'})[v.id])+'</small></button>').join('')+'</div></section>':'';
    let detail='<div class="selected-placeholder"><b>① 選行動　② 看行程　③ 確認出發</b><p>拜票可選市場、巷弄、廣場或河濱；議題由現場安排。</p><p>團隊 '+roster+' 人（含你），本月合約已付。已有答覆就沿用。</p></div>';
    if(p){
      const a=action(selectedAction),publicAction=['canvass','tv'].includes(selectedAction),description=selectedAction==='prepare'&&p.topic==='tip'?'核對線索，更新可引用的證據。':(shortActions[selectedAction]?.[0]||p.benefit||a.benefit);
      const contract=selectedAction==='recruit'?'<p class="contract-note">'+Number(p.recruitCount||0)+' 位新人 × '+money(p.contractRate??50000)+' × 剩餘 '+Number(p.contractDays??Math.max(0,30-state.day*roundDays))+'／30 天，逐人進位；本次預付 '+money(p.contractCost??p.baseCost)+'，無設定費。</p><p class="recruit-change">團隊 '+(p.rosterSize??roster)+' 人 → '+(p.nextRosterSize??roster)+' 人（含你）；新夥伴下回合開始工作。</p>':'<p class="salary-note">本月薪資已付，這次不再扣薪。</p>';
      detail='<section class="selected-detail" aria-label="所選行動與全部費用"><div class="selected-title"><h3>'+esc(title)+(selectedAction==='canvass'?'<span class="chosen-place">'+esc(p.venueTitle||placeName('canvass',plannedVenue()))+'</span>':'')+'</h3><strong>'+money(p.totalCost)+'</strong></div><p class="selection-benefit">'+esc(description)+'</p>'+costBreakdown(p,true)+contract+(p.expectedIncome?'<p class="income-net">預計淨增加 '+(p.expectedIncome.min-p.totalCost).toLocaleString('zh-TW')+'–'+(p.expectedIncome.max-p.totalCost).toLocaleString('zh-TW')+' 遊戲元。</p>':'')+(publicAction&&p.expectedReach?'<p class="action-reach">約接觸 '+p.expectedReach.min+'–'+p.expectedReach.max+' 人 · '+esc(p.depthLabel)+'</p>':'')+topicDetail(p)+(p.teamTask==='research'&&!['prepare','canvass','tv'].includes(selectedAction)?'<p class="action-helper">夥伴查資料：'+esc(topics[p.topic])+'</p>':'')+(p.eventNote?'<p class="action-event">'+esc(p.eventNote)+'</p>':'')+(p.followup?'<details class="selected-followup"><summary>這次先回應「'+esc(topics[p.topic])+'」的先前保證</summary><p>「'+esc(p.followup.text)+'」</p></details>':'')+(['prepare','canvass','tv'].includes(selectedAction)?selectedEvent(p.topic):'')+'</section>';
    }
    const events=eventView(),availableEvents=['welfare','tip'].filter(id=>events[id]?.available);
    const settings='<details class="plan-options"'+(optionsOpen?' open':'')+'><summary>團隊 '+roster+' 人（含你） · '+esc(modeLabels[teamMode])+'<span>調整設定</span></summary><div class="options-content">'+(members.length?'<div class="team-picks" role="group" aria-label="團隊分工">'+Object.entries(modeLabels).map(([id,label])=>'<button data-action="team-mode" data-mode="'+id+'" aria-pressed="'+(teamMode===id)+'">'+label+'</button>').join('')+'</div><p class="microcopy">可分出一位夥伴查資料或代訪，其餘繼續同行。分工不加收薪資；查證爆料才另收資料費。</p>':'<p class="microcopy">目前獨自出發。選「招募團隊」可查看擴編人數與剩餘月薪。</p>')+(availableEvents.length?'<details class="optional-events"><summary>居民請託與爆料紀錄（'+availableEvents.length+'）</summary>'+eventCards(false)+'</details>':'')+'<p class="microcopy">接觸不等於支持，重複行程觸及遞減。數字為本局遊戲設定。</p></div></details>';
    const reason=!p?'請先選擇上方一個行動。':!p.allowed?p.reason+(current.allowed&&p.totalCost>state.budget.available?' 可零元出發「公開募款」，團隊照常同行。':''):'確認才扣款並使用本回合；尚可更改選擇。';
    const fundraise=p&&!p.allowed&&current.allowed&&p.totalCost>state.budget.available?'<button class="fundraise-alternative" data-action="select-fundraise">改選公開募款 <span>零元出發，團隊同行</span></button>':'';
    const primary='<p id="commit-reason" class="commit-reason'+(p&&!p.allowed?' blocked':'')+'" role="status">'+esc(reason)+'</p>'+fundraise+'<button class="primary-button" data-action="confirm-action" aria-describedby="commit-reason" '+(!p?.allowed?'disabled aria-disabled="true"':'')+'>'+(!p?'先選行動，再確認出發':'確認'+title+(selectedAction==='canvass'?'・'+esc(p.venueTitle||placeName('canvass',plannedVenue())):'')+' →')+'</button>';
    return panel('第 '+state.day+'／'+G.DAYS+' 回合 · '+period(state.day),'安排中 · 尚未扣款','<div class="planning-head"><h2>這回合做什麼？</h2><span>只選一個主要行動</span></div>'+cards+venuePicker+detail+topicOptions(p)+settings,primary);
  }
  function travelPanel() {
    const a={...action(state.pending.id),title:state.pending.title||action(state.pending.id).title}, stage=motion?.stage==='perform';
    return panel('ROUND '+String(state.day).padStart(2,'0'),'本回合行程已安排','<div class="travel-title">'+icon(a.id)+'<h2>'+esc(a.title)+'</h2></div><p class="lead">'+(stage?'已到現場，正在'+({prepare:'查閱資料',canvass:'和居民打招呼',tv:'準備開錄',fundraise:'收下捐款信封',recruit:'迎接新夥伴'}[a.id])+'。':'阿夏正在前往'+esc(placeName(a.id,state.pending.venue))+'。')+'</p><div class="stage-track"><span class="active"></span><span class="'+(stage?'active':'')+'"></span><span></span></div><p>'+esc(a.description)+'</p><div class="action-total"><span>本回合已扣款</span><strong>'+money(state.pending.cost)+'</strong></div>'+costBreakdown(state.pending)+(state.pending.eventNote?'<p class="action-event">'+esc(state.pending.eventNote)+'</p>':'')+'<p class="microcopy">'+(['canvass','tv'].includes(a.id)?state.pending.willAsk?'接著只問一題，等你自己選擇回答。':'本回合沿用先前答覆，沒有新提問，完成後直接看本回合結果。':'這個行動沒有對話選項，完成後直接看本回合結果。')+'</p>','<button class="primary-button" data-action="skip">略過動畫，繼續 →</button>');
  }
  function questionPanel() {
    const q=G.question(state);
    if(!q)return panel('本回合提問','進度已保留','<h2>對話尚未載入</h2><p>請重新整理，恢復目前行程。</p>');
    const role=state.pending.id==='tv'?'resident':npcRole(state.pending.topic),body='<div class="speaker"><div class="speaker-portrait" aria-hidden="true">'+(Art?Art.avatar(role):'')+'</div><div><strong>'+esc(q.speaker)+'</strong><small>'+esc(q.memoryHint||'停下腳步，聽他說完。')+'</small></div></div>'+(q.reason?'<p class="question-reason">'+esc(q.reason)+'</p>':'')+(q.preparationHint?'<p class="preparation-hint">'+esc(q.preparationHint)+'</p>':'')+'<div class="question-text">'+esc(q.text)+'</div>'+(q.quote?'<details class="conversation-context"><summary>上次留下的原話</summary><p>「'+esc(q.quote)+'」</p></details>':'');
    const choices='<p class="commit-reason">點選回答，立刻看現場反應。</p><div class="answer-list" role="group" aria-label="選一句回應，立即回答">'+q.options.slice(0,3).map((o,i)=>'<button class="answer-option" data-answer="'+esc(o.id)+'" '+(!o.unlocked?'disabled aria-disabled="true"':'')+'><span class="answer-number" aria-hidden="true">'+(i+1)+'</span><span class="answer-copy"><span class="answer-line">'+esc(o.text)+'</span><small>'+esc(!o.unlocked?o.whyLocked:o.detail)+'</small>'+(Number(o.extraCost)>0?'<small class="answer-extra-cost">額外費用 '+money(o.extraCost)+'</small>':'')+'</span></button>').join('')+'</div>';
    return panel('第 '+state.day+'／'+G.DAYS+' 回合 · 現場對話','一句回應就繼續',body,choices);
  }
  function effectMarkup(r) {
    const e=r.effects;
    if(!e?.before||!e?.after)return '';
    const rows=[['已準備議題',e.before.known+' 個',e.after.known+' 個'],['競選帳餘額',money(e.before.cash),money(e.after.cash)]];
    return '<div class="direct-effects"><h4>這趟具體做了什麼</h4>'+(e.contacts?'<p class="contact-total">主要行程接觸 <b>'+e.contacts+' 人</b><small>肯定 '+e.positive+' 人／保留 '+e.reserved+' 人，並非實際票數。</small></p>':'<p class="contact-total">主要行程沒有對外接觸。</p>')+'<dl>'+rows.map(([name,before,after])=>'<div><dt>'+name+'</dt><dd>'+before+' <span>→</span> <b>'+after+'</b></dd></div>').join('')+'</dl>'+(e.groups?.length?'<details class="reaction-details"><summary>不同議題偏好的回應</summary>'+e.groups.map(g=>'<p>'+esc(g.label)+'：肯定 '+g.positive+'／保留 '+g.reserved+'</p>').join('')+'</details>':'')+'</div>';
  }
  function teamReportMarkup(r) {
    const items=r.teamReports||(r.teamReport?[r.teamReport]:[]);
    if(!items.length)return r.teamNote?'<p class="cause">'+esc(r.teamNote)+'</p>':'';
    return items.map(t=>'<div class="team-report"><h4>'+esc(t.name||t.memberName||'團隊成員')+'｜'+esc((t.title||'').replace((t.name||t.memberName||'')+' ',''))+'</h4><p>'+esc(t.result)+'</p>'+(t.task==='canvass'?'<p>協作接觸 '+(t.positive+t.reserved)+' 人：肯定 '+t.positive+'／保留 '+t.reserved+'<small>與主要行程分開計次；可能遇到同一人。</small></p>':'')+'<small>本月合約已付，這次不再扣薪。</small></div>').join('');
  }
  function reportCard(r,who,opponent=false) {
    return '<div class="recap-card '+(opponent?'rival-recap':'')+'"><div class="recap-person"><i aria-hidden="true"></i>'+esc(who)+'</div><h3>'+esc(r.title)+'</h3><p>'+esc(r.result)+'</p><p class="cause">'+esc(r.reason)+'</p>'+(!opponent?effectMarkup(r):'')+(!r.effects&&r.reactions?'<p class="reaction-note">本次議題回應：肯定 '+r.reactions.positive+'／保留 '+r.reactions.reserved+'<small>虛構交流回應，不是實際票數。</small></p>':'')+teamReportMarkup(r)+(r.quote?'<div class="quoted-line"><small>當回合說的原話</small>「'+esc(r.quote)+'」</div>':'')+(r.facts?.length?'<details class="report-facts"><summary>本回合查到的資料</summary>'+factsMarkup(r.facts)+'</details>':'')+'<div class="recap-cost"><span>支出 '+money(r.cost)+'</span>'+(r.income?'<span>競選獻金 +'+money(r.income)+'</span>':'')+'</div>'+(!opponent?costBreakdown(r):'')+'</div>';
  }
  function pollChange(before,after) {
    const difference=Math.round((after-before)*100)/100;
    return (difference>0?'+':'')+difference.toLocaleString('zh-TW',{maximumFractionDigits:2})+' 個百分點';
  }
  function priorPoll(p) { return p?state.polls.filter(x=>x.day<p.day).at(-1):null; }
  function briefPoll(p,before=priorPoll(p)) {
    if(!p)return '';
    const recent=state.polls.filter(x=>x.day<=p.day).slice(-3);
    return '<div class="brief-poll"><b class="poll-title">'+(p.day?'第 '+p.day+' 回合':'出發前')+' · 虛構全選區抽樣</b><div class="poll-comparison">'+['阿夏','周沐'].map((name,i)=>'<div><span>'+name+'</span><strong>'+(before?pct(before.percentages[i])+' → ':'')+pct(p.percentages[i])+'</strong>'+(before?'<small>'+pollChange(before.percentages[i],p.percentages[i])+'</small>':'')+'</div>').join('')+'</div>'+(recent.length>1?'<p class="poll-trend">你的近 '+recent.length+' 次：'+recent.map(x=>(x.day?'第 '+x.day+' 回合':'出發前')+' '+pct(x.percentages[0])).join(' → ')+'</p>':'')+'<small>每回合從 1,000 名合成選民重新抽 n = '+p.n+'；包含其他 17 位候選人與未表態。即使直接效果上升，新樣本與對手行動仍可能讓民調下降；差額不是新增票數。</small></div>';
  }
  function preparationTakeaway(r) {
    if(r.topic==='tip'){
      const e=eventView().tip;
      if(!e?.available)return '';
      const next=e.responseDue?'新資料已到。下一步可在拜票或節目追蹤這條線索，選擇怎麼回應。':e.canInvestigate?'可再準備一次，核對資料費 '+money(e.investigationCost)+'；也可在拜票或節目說明目前限制。':'已取得本局可查的資料，不再收核對費。下一步可在拜票或節目公開目前證據與限制。';
      return '<section class="preparation-takeaway"><b>目前查到的證據</b><p>'+esc(e.evidenceText)+'</p><p class="next-step"><b>下一步：</b>'+esc(next)+'</p></section>';
    }
    if(r.action!=='prepare')return '';
    const topic=G.TOPICS[r.topic],place=Object.values(venues).find(v=>v.topics.includes(r.topic));
    return '<section class="preparation-takeaway"><b>查到：'+esc(topic?.title)+'</b><p>'+esc(topic?.facts?.[0]?.text||r.result)+'</p><b>已解鎖的說法</b><ul>'+(topic?.plans||[]).slice(0,2).map(p=>'<li>'+esc(p.text)+'</li>').join('')+'</ul><p>準備只解鎖回答；之後在街訪或節目引用，才會出現居民反應。</p><p class="next-step"><b>下一步：</b>可到'+esc(place?.title||'街區')+'拜票或上節目，選用剛準備的說法；可展開追蹤選項指定這個議題。</p></section>';
  }
  function recapPanel() {
    const r=state.recap,teams=r.player.teamReports||(r.player.teamReport?[r.player.teamReport]:[]),events=r.events||[],e=r.player.effects,c=r.player.conversation||r.conversation;
    const contacts=Number(e?.contacts||0),learned=Math.max(0,(e?.after?.known||0)-(e?.before?.known||0)),pending=state.player.promises.filter(p=>['pending','unresolved'].includes(p.status)).length;
    const reaction=c?'<article class="resident-reaction"><div class="speaker"><div class="speaker-portrait" aria-hidden="true">'+(Art?Art.avatar(npcRole(c.topic||r.player.topic)):'')+'</div><div><strong>'+esc(c.name)+'</strong><small>'+esc(c.memoryHint||(c.visits>1?'他記得你上次來過。':'第一次打照面。'))+'</small></div></div><p class="reaction-quote">'+esc(c.reaction)+'</p>'+(c.quote?'<p class="your-short-quote"><span>你說</span>「'+esc(c.quote)+'」</p>':'')+'</article>':'<div class="round-result"><span class="eyebrow">這趟完成了</span><h2>'+esc(r.player.title)+'</h2><p>'+esc(r.player.result)+'</p></div>';
    const outcomes='<div class="concrete-outcomes"><span>主要行程接觸 <b>'+contacts+' 人</b></span><span>新準備 <b>'+learned+' 個議題</b></span><span>待交代保證 <b>'+pending+' 件</b></span></div>';
    const teamContacts=teams.reduce((n,t)=>n+(t.positive||0)+(t.reserved||0),0),research=teams.filter(t=>t.knowledge).length,teamIncome=teams.reduce((n,t)=>n+(t.income||0),0),deliveries=[teamContacts?'協作接觸 '+teamContacts+' 人次':'',research?'查證 '+research+' 份資料':'',teamIncome?'協助募得 '+money(teamIncome)+'（已含總收入）':''].filter(Boolean);
    const delayedUpdate=events.length&&r.player.topic!=='tip'?'<section class="preparation-takeaway delayed-update"><b>新資料已回來</b>'+events.map(x=>'<p>'+esc(x.text||x.title)+'</p>').join('')+'<p class="next-step"><b>下一步（可選）：</b>'+esc(eventView().tip?.responseDue?'街訪或節目時，展開「追蹤已談議題」選擇虛構款項線索，可回應這份新資料；不會自動替你改說法。':'核對紀錄已更新，無須再答同一題，也不再收核對費。')+'</p></section>':'';
    const summary='<p class="round-crew"><b>團隊 '+((state.player.team?.members?.length||0)+1)+' 人（含你）</b> · '+esc(deliveries.join('；')||(teams.length?'這趟同行，沒有額外接觸或新資料':'這趟由你完成'))+'</p>'+(events.length?'<p class="round-event">新進展：'+esc(events.map(x=>x.title).join('；'))+'</p>':'');
    const metrics='<div class="recap-quick-metrics"><span>這趟支出 <b>'+money(r.player.cost)+'</b></span>'+(r.player.income?'<span>募得 <b>＋'+money(r.player.income)+'</b></span>':'')+'<span>可用款 <b>'+wan(state.budget.available)+'</b></span></div>';
    const full='<details class="recap-details"><summary>看完整行程、團隊與事件紀錄</summary>'+reportCard(r.player,'阿夏・你')+reportCard(r.rival,'周沐・對手',true)+eventReports(events)+(r.weather?.id==='rain'?'<p class="weather-note">'+esc(r.weather.title)+'：'+esc(r.weather.text)+'</p>':'')+'</details><button class="text-button" data-action="poll">另看本回合虛構民調 ↗</button>';
    const link=r.player.topic==='tip'?'<button class="text-button" data-action="events" data-topic="tip">查看查證紀錄 ↗</button>':r.player.action==='prepare'?'<button class="text-button" data-action="dossier" data-topic="'+esc(r.player.topic)+'">看看剛讀到的資料 ↗</button>':'';
    return panel('第 '+state.day+'／'+G.DAYS+' 回合 · 已完成','結果已儲存',reaction+preparationTakeaway(r.player)+delayedUpdate+outcomes+summary+metrics+full+link,'<button class="primary-button" data-action="next">'+(state.day<G.DAYS?'開始第 '+(state.day+1)+' 回合 →':'進入開票結算 →')+'</button>',true);
  }
  function promises(items) {
    return items.length?items.map(p=>{
      const reviewed=Number(p.reviewedVersion||0)>=Number(p.version||1);
      const label=p.status==='corrected'?'已更正・原話保留':p.status==='unresolved'&&reviewed?'已回應，保證仍未實現':p.status==='unresolved'||p.status==='pending'?'尚待回應':p.status==='kept'?'已回應':p.status;
      return '<div class="fact"><strong>'+esc(label)+' · '+esc(topics[p.topic]||'')+'</strong><p>原話：「'+esc(p.text)+'」</p><p class="microcopy">'+esc(p.recipient||'')+(reviewed?'':' · '+esc(p.due||''))+'</p>'+(p.responses?.length?'<div class="promise-history">'+p.responses.map(r=>'<p>第 '+r.day+' 回合回應：「'+esc(r.quote||r.answer)+'」</p>').join('')+'</div>':'')+'</div>';
    }).join(''):'<p class="no-pending">沒有尚待說明的公開保證。</p>';
  }
  function resultPanel() {
    const r=state.result;
    const endings={elected:['你當選了。','進入本局 '+r.seats+' 席名單，保證金返還。'],refunded:['落選，但保證金返還。','得票達本局返還門檻，保留下一次的可能。'],forfeited:['落選，保證金沒收。','得票未達本局返還門檻；未花完的競選款仍留在帳上。']};
    const ending=endings[r.outcome]||['本局已開票。','查看完整票數與資金結算。'];
    return panel(G.DAYS+' 回合 · 開票結算','虛構縮小情境','<span class="ending-tag '+esc(r.outcome)+'">'+({elected:'當選',refunded:'落選・退保證金',forfeited:'落選・沒收保證金'}[r.outcome]||'已結算')+'</span><h2>'+ending[0]+'</h2><p>'+ending[1]+'</p><div class="result-stats"><div>本局得票<strong>'+r.playerVotes+' 票</strong></div><div>19 人中排名<strong>第 '+r.rank+' 名</strong></div><div>競選帳餘額<strong>'+wan(r.cash)+'</strong></div><div>'+(r.refunded?'返還保證金':'沒收保證金')+'<strong>'+wan(r.refunded||r.forfeited)+'</strong></div></div><p class="microcopy">'+r.eligible.toLocaleString('zh-TW')+' 名合成選民、19 名虛構候選人競逐 '+r.seats+' 席。本局未當選者返還門檻 '+r.refundThreshold+' 票。</p><button class="primary-button" data-action="tally">看完整開票與結算依據 →</button><p class="reflection">'+esc(r.reflection)+'</p>'+eventSummary(r.eventSummary)+(r.pending?.length?'<h3>還要交代的事</h3>'+promises(r.pending):'')+'<button class="secondary-button" data-action="journal">回看各回合行動</button><button class="text-button" data-action="restart">再試一種安排</button><p class="microcopy">遊戲即時返還不代表現實入帳時間。性別保障、競選補貼未模擬；獻金不是私人利潤。</p>');
  }
  function sceneLine(text) {
    const raw=String(text||''),quote=raw.includes('「')?raw.slice(raw.indexOf('「')+1).replace(/」$/,''):raw,chars=Array.from(quote);
    return chars.length>42?chars.slice(0,41).join('')+'…':quote;
  }
  function npcRole(topic) { return ({access:'shop',drain:'shop2',welfare:'resident',tip:'resident'})[topic]||'resident'; }
  function renderConversation() {
    const q=state.phase==='question'?G.question(state):null,r=state.phase==='recap'?state.recap:null,c=r?.player?.conversation||r?.conversation;
    const p=state.pending,travel=state.phase==='travel'&&['canvass','tv'].includes(p?.id),visible=!!(q||c||travel);
    $('conversation-npc').hidden=!visible;$('conversation-bubble').hidden=!visible;
    $('world').classList.toggle('has-conversation',visible);
    if(!visible)return;
    const topic=c?.topic||p?.topic||'access',id=p?.id||r?.player?.action||'canvass',venue=p?.venue||r?.player?.venue||'market',base=destinationFor(id,venue);
    const left=id==='tv'||base.x>680,point={x:base.x+(left?-76:83),y:base.y-14},role=id==='tv'?'resident':npcRole(topic),name=c?.name||q?.speaker||(topic==='welfare'?eventView().welfare?.npc:G.TOPICS[topic]?.npc?.name)||'居民';
    $('conversation-npc').innerHTML=(Art?Art.avatar(role):'')+'<span class="actor-name">'+esc(name)+'</span>';
    $('conversation-npc').dataset.role=role;$('conversation-npc').dataset.venue=id==='canvass'?venueId(venue):id;actorPosition($('conversation-npc'),point);
    const bubble=$('conversation-bubble'),edge=point.x+(left?-46:46),maxWidth=window.innerWidth<=560?(left?50:58):51;
    bubble.dataset.side=left?'left':'right';bubble.style.left=edge/12+'%';bubble.style.width=Math.min(maxWidth,(left?edge-16:1184-edge)/12)+'%';bubble.style.top=(point.y-175)/6.5+'%';bubble.dataset.stage=q?'question':c?'reaction':'approach';
    const hint=id==='tv'?'現場訪談':c?.visits>1||state.player.npcMemory?.[topic]&&q?'記得上回的說法，也記下這次回應。':'第一次正式聊這個議題。';
    bubble.innerHTML='<span class="bubble-speaker">'+esc(name)+'</span><p>'+esc(sceneLine(q?.text||c?.reaction||(motion?.stage==='perform'?'你來啦，聊一下？':'他抬起頭，向你招手。')))+'</p>'+((q||c)?'<small>'+esc(hint)+'</small>':'');
  }
  function renderTeam() {
    const Team=window.DayTeamArt;
    if(!Team)return;
    const current=state.player.team?.members||[];
    let assignments=state.phase==='plan'?current.map(m=>({...m,task:'idle'})):[...(state.pending?.teamAssignments||[])];
    if(state.phase!=='plan')for(const m of current)if(!assignments.some(a=>a.id===m.id))assignments.push({...m,task:'idle'});
    const routeVenue=state.pending?.venue||state.recap?.player?.venue||'market';
    const teamArt=Art ? {...Art,anchors:{...Art.anchors,canvass:destinationFor('canvass',routeVenue)},route:id=>routeFor(id,routeVenue)} : Art;
    $('team-actors').innerHTML=Team.render(assignments,state.phase==='travel'?teamElapsed:Team.duration,teamArt,{reducedMotion:reduced.matches});
  }
  function render() {
    if(state.phase==='plan'&&selectedTopic&&!availableTopics().some(t=>t.id===selectedTopic))selectedTopic=null;
    $('world').dataset.venue=state.pending?.id==='canvass'?venueId(state.pending.venue):state.phase==='recap'&&state.recap?.player?.action==='canvass'?venueId(state.recap.player.venue):state.phase==='plan'&&selectedAction==='canvass'?plannedVenue():'';
    header();renderTeam();renderConversation();
    $('panel').innerHTML=!state.started?intro():state.phase==='plan'?plan():state.phase==='travel'?travelPanel():state.phase==='question'?questionPanel():state.phase==='recap'?recapPanel():resultPanel();
    $('world').dataset.phase=state.phase;
    $('interaction').dataset.phase=state.started?state.phase:'intro';
    $('skip-animation').hidden=!motion;
    $('skip-animation').textContent=motion?.stage==='perform'?'略過演出 →':'略過移動 →';
    if(!motion) $('walk-status').textContent=!state.started?'每回合選一個主要行動，角色會自己出發。':state.phase==='plan'?'選行動，再確認出發。選卡與設定不扣款。':state.phase==='question'?'已到現場。選一句回應，就能看到他的反應。':state.phase==='recap'?'本回合的結果已留下，按「'+(state.day<G.DAYS?'開始第 '+(state.day+1)+' 回合':'進入開票結算')+'」才會繼續。':'本局已結算，可以查看完整開票或重新安排。';
  }
  function effect(id) {
    const shapes={
      prepare:'<path d="M-24-24h23l5 5 5-5h23v31H9L4 12-1 7h-23z" fill="#fff9d9" stroke="#6e8360" stroke-width="2"/><path d="M4-19v31M-17-14h13M-17-7h13M11-14h13M11-7h13" stroke="#a0a785" stroke-width="2"/><path class="book-page" d="M4-20 26-29v27L4 8z" fill="#f5e3b4" stroke="#9d9b79"/>',
      canvass:'<g class="greeting"><path d="M-32-80h44v25H-9l-11 10v-10h-12z" fill="#fff9dc" stroke="#9bae8a" stroke-width="2"/><circle cx="-21" cy="-67" r="2.5" fill="#618a66"/><circle cx="-10" cy="-67" r="2.5" fill="#618a66"/><circle cx="1" cy="-67" r="2.5" fill="#618a66"/></g>',
      tv:'<path class="tv-beam" d="M55-88-30-8 33 5z" fill="#ffed9d" opacity=".55"/><g transform="translate(32,-21)"><path d="M0 0h22v17H0zM22 5l10-5v17l-10-5z" fill="#4e635b"/><circle class="camera-light" cx="5" cy="5" r="3" fill="#ef835b"/><path d="m10 17-8 25m8-25 8 25m-8-25v25" stroke="#5d6a60" stroke-width="3"/></g>',
      fundraise:'<path d="M13-6h34v27H13z" fill="#b49662"/><path d="m13-6 9-7h34l-9 7z" fill="#d3ba82"/><path d="m47-6 9-7v27l-9 7z" fill="#8b7c50"/><path d="M24-7h17" stroke="#596b50" stroke-width="2"/><g class="donation-envelope"><path d="M21-20h24v15H21z" fill="#fff4cf" stroke="#b8a36d"/><path d="m21-20 12 9 12-9" fill="none" stroke="#b8a36d"/></g>',
      recruit:'<g class="join-mark"><circle cx="41" cy="-64" r="14" fill="#e7efdb" stroke="#7c9c73" stroke-width="2"/><path d="m35-64 5 5 8-10" stroke="#527d57" stroke-width="3" fill="none"/></g>'
    };
    return '<svg viewBox="-70 -110 140 150" xmlns="http://www.w3.org/2000/svg">'+shapes[id]+'</svg>';
  }
  function startMotion() {
    const id=state.pending.id, destination=destinationFor(id,state.pending.venue);
    let route=routeFor(id,state.pending.venue);
    route=[{...position},...route.slice(1)];
    if(!route.length || route.at(-1).x!==destination.x || route.at(-1).y!==destination.y)route.push({...destination});
    motion={id,venue:state.pending.venue||'market',destination:{...destination},stage:'walk',route,index:1,elapsed:0};teamElapsed=0;
    $('world').dataset.action=id;
    $('destination-marker').hidden=false;actorPosition($('destination-marker'),destination);
    $('route-line').innerHTML='<svg viewBox="0 0 1200 650"><polyline points="'+route.map(p=>p.x+','+p.y).join(' ')+'"/></svg>';
    $('player').classList.add('walking');
    $('walk-status').textContent='正在前往'+placeName(id,state.pending.venue)+'，不需操作移動。';
    render();
    if(!reduced.matches && window.innerWidth<1024) $('world').scrollIntoView?.({behavior:'smooth',block:'center'});
    if(reduced.matches) finishTravel();
  }
  function perform() {
    if(!motion)return;
    position={...motion.destination};setPosition();
    motion.stage='perform';motion.elapsed=0;
    $('player').classList.remove('walking');$('world').classList.add('performing');
    $('route-line').innerHTML='';$('destination-marker').hidden=true;
    $('action-effect').innerHTML=effect(motion.id);
    $('action-effect').style.left=position.x/12+'%';$('action-effect').style.top=position.y/6.5+'%';
    if(motion.id==='recruit'){ $('new-teammate').hidden=false;actorPosition($('new-teammate'),{x:position.x+72,y:position.y+11}); }
    $('walk-status').textContent=({prepare:'翻開資料，核對做法與限制。',canvass:'向居民揮揮手，停下來聽問題。',tv:'燈光亮起，攝影機開始錄影。',fundraise:'捐款信封入帳，競選用途另列紀錄。',recruit:'小葉走過來，加入接下來的行程。'})[motion.id];
    render();
  }
  function clearMotion() {
    motion=null;$('player').classList.remove('walking');$('world').classList.remove('performing');
    $('destination-marker').hidden=true;$('route-line').innerHTML='';$('action-effect').innerHTML='';$('new-teammate').hidden=true;
    $('skip-animation').hidden=true;
  }
  function finishTravel() {
    if(modal||document.hidden||state.phase!=='travel')return;
    position={...destinationFor(state.pending.id,state.pending.venue)};setPosition();clearMotion();
    if(G.arrive(state)){save();render();focusPanel();if(window.innerWidth<1024&&['question','recap'].includes(state.phase))$('world').scrollIntoView?.({behavior:reduced.matches?'auto':'smooth',block:'start'});announce(state.phase==='question'?'已到現場，選一句回應。':'本回合的行動和居民反應都已記錄。');}
  }
  function tick(dt) {
    if(!motion||modal||document.hidden||state.phase!=='travel')return;
    dt=Math.max(0,Math.min(Number(dt)||0,.1));
    teamElapsed+=dt;renderTeam();
    if(reduced.matches){finishTravel();return;}
    if(motion.stage==='perform') {motion.elapsed+=dt;if(motion.elapsed>=1.35)finishTravel();return;}
    let distance=dt*225;
    while(distance>0&&motion&&motion.stage==='walk'){
      const next=motion.route[motion.index];
      if(!next){perform();break;}
      const dx=next.x-position.x,dy=next.y-position.y,len=Math.hypot(dx,dy);
      if(len<=distance){position={...next};motion.index++;distance-=len;}
      else{position.x+=dx/len*distance;position.y+=dy/len*distance;distance=0;}
      setPosition();
    }
  }
  function frame(time) {
    const dt=lastFrame==null?0:(time-lastFrame)/1000;lastFrame=time;tick(dt);
    window.requestAnimationFrame(frame);
  }
  function begin(id) {
    if(modal||locked||!state.started||state.phase!=='plan')return;
    const p=G.preview(state,id,planConfig());
    if(!p.allowed){error=p.reason;render();return;}
    locked=true;
    if(G.begin(state,id,planConfig())){error='';selectedAnswer=null;save();startMotion();focusPanel();announce('第 '+state.day+' 回合安排'+p.title+'，已扣 '+money(p.totalCost)+'。');}
    locked=false;
  }
  function answer(id) {
    if(modal||locked||state.phase!=='question')return;
    const q=G.question(state),option=q?.options.find(o=>o.id===id);
    if(!option?.unlocked)return;
    locked=true;
    if(G.answer(state,id)){save();render();focusPanel();const c=state.recap?.player?.conversation||state.recap?.conversation;announce(c?c.name+'：'+c.reaction:'回答已記錄，本回合結果已儲存。');}
    locked=false;
  }
  function factsMarkup(items=[]) {
    return items.map(f=>'<div class="fact">'+(f.title?'<strong>'+esc(f.title)+'</strong>':'')+'<p>'+esc(typeof f==='string'?f:f.text)+'</p></div>').join('');
  }
  function facts(topic) { return factsMarkup(G.TOPICS[topic]?.facts||[]); }
  function budgetMarkup() {
    const b=state.budget,deposit=G.RULES.deposit,contracts=state.player.contracts||[],initial=contracts.filter(c=>c.day===0).reduce((n,c)=>n+c.cost,0),salary=Number(b.salarySpent||0),later=salary-initial,activities=b.spent-salary;
    return '<p>本局自備 100 萬遊戲元，先鎖定 16 萬保證金，剩 84 萬。開始時預付兩位夥伴共 100,000 遊戲元的本月薪資，可用款為 74 萬。候選人不領薪。</p><div class="budget-row"><span>自備競選款</span><strong>'+money(b.personalContribution)+'</strong></div><div class="budget-row"><span>模擬競選獻金</span><strong>＋'+money(b.donations)+'</strong></div><div class="budget-row"><span>原始繳納保證金</span><strong>−'+money(deposit)+'</strong></div><div class="budget-row"><span>開局兩位夥伴・整月薪資'+(!state.started?'（尚未支付）':'')+'</span><strong>−'+money(initial)+'</strong></div><div class="budget-row"><span>後續招募・剩餘天數合約</span><strong>−'+money(later)+'</strong></div><div class="budget-row"><span>行程與查證資料費</span><strong>−'+money(activities)+'</strong></div>'+(b.refunded?'<div class="budget-row"><span>符合資格・本局返還</span><strong>＋'+money(b.refunded)+'</strong></div>':'')+'<div class="budget-row"><span>'+(b.forfeited?'已沒收保證金（不重複扣款）':'尚鎖定的保證金')+'</span><strong>'+money(b.forfeited||b.deposit)+'</strong></div><div class="budget-row total"><span>競選帳可用餘額</span><strong>'+money(b.available)+'</strong></div>'+(contracts.length?'<h3>已付的團隊合約</h3><ul class="contract-history">'+contracts.map(c=>'<li><b>'+(c.day===0?'開始前':'第 '+c.day+' 回合增聘')+'</b>：'+c.people+' 人 × 每月 '+money(c.monthlyRate)+' × '+c.days+'／30 天，逐人進位，共 '+money(c.cost)+(c.startsDay?'；第 '+c.startsDay+' 天開始工作':'')+'。</li>').join('')+'</ul>':'')+'<p class="microcopy">本局假設月薪 50,000 遊戲元，非真實薪資行情。整月 30 天；增聘只預付本回合結束後的剩餘天數，不收設定費，也不逐回合扣薪。獻金只限競選用途，未花款項不會因結局歸零；競選補貼未實作。</p>'+(G.RULES?.depositSource?'<p class="microcopy"><a href="'+esc(G.RULES.depositSource)+'" target="_blank" rel="noopener noreferrer">保證金金額參考：中選會公告 ↗</a></p>':'');
  }
  function tallyMarkup() {
    const r=state.result;
    if(!r)return '<p>完成全部回合後才會開票。</p>';
    return '<p>'+r.eligible.toLocaleString('zh-TW')+' 名合成選民，19 名虛構候選人，'+r.seats+' 席。以下是本局最終票數，與日間民調分開產生。</p><ol class="tally-list">'+r.tally.map(x=>'<li class="'+(x.id===0?'tally-you':'')+'"><span>'+x.rank+'</span><b>'+esc(x.name)+(x.id===0?'・你':'')+'</b><strong>'+x.votes+' 票</strong><small>'+(x.elected?'當選':'未當選')+'</small></li>').join('')+'</ol><h3>保證金怎麼結算？</h3><p>本局落選者返還門檻：'+r.eligible+' ÷ '+r.seats+' × 10%，無條件進位為 '+r.refundThreshold+' 票。當選或得票達門檻即返還 '+wan(G.RULES.deposit)+'元；未達門檻則沒收。</p><p>你的保證金'+(r.refunded?'返還 '+money(r.refunded):'沒收 '+money(r.forfeited))+'，競選帳餘額為 '+money(r.cash)+'。未花款項仍保留，獻金不是私人利潤。</p><p class="microcopy">'+esc(G.RULES.note)+'</p><p class="microcopy"><a href="'+esc(G.RULES.refundSource)+'" target="_blank" rel="noopener noreferrer">公職人員選舉罷免法第 32 條：返還規則 ↗</a></p>';
  }
  function pollMarkup(p) {
    return p?briefPoll(p)+'<p>'+esc(p.label)+'；n = '+p.n+'。這是遊戲內全選區樣本，並非真實民調。</p><div class="poll-bars">'+['阿夏・你','周沐・對手','其他 17 位','未表態'].map((name,i)=>'<div class="poll-line"><span>'+name+'</span><div class="poll-track"><i style="width:'+Math.max(0,Math.min(100,p.percentages[i]))+'%"></i></div><strong>'+pct(p.percentages[i])+'</strong></div>').join('')+'</div><p class="microcopy">開啟視窗不會重新抽樣。回合間的差異包含新樣本和對手行動；不能把差額當成某個答案固定換到的票數。最終票數另外模擬投票，不會直接照民調換算。</p>':'<p>開始遊戲後才有第一份虛構抽樣。</p>';
  }
  function sourceMarkup(items=G.RULES.contextSources||[]) {
    return '<div class="background-sources"><h3>地方背景來源</h3><p class="microcopy">官方資料用來交代地方背景。NPC、問題情境、支持度與選情為遊戲虛構；歷史紀錄不代表現況仍未改善，地圖也不是實測配置。</p>'+items.map(s=>'<p class="microcopy"><a href="'+esc(s.url)+'" target="_blank" rel="noopener noreferrer">'+esc(s.title)+' ↗</a></p>').join('')+'</div>';
  }
  function rulesMarkup() {
    return '<p>'+esc(G.RULES.note)+'</p><p>本局假設夥伴月薪 50,000 遊戲元，並非真實行情。開始預付兩位整月薪資共 100,000 遊戲元；增聘只付本回合後剩餘天數的合約款。主角不領薪、行程不逐回合扣薪，拜票、一般準備與募款的主要費用為零。</p><p>每回合安排一個主要行程，拜票再選市場、巷弄、廣場或河濱，角色自動前往。議題依現場與近況安排，準備資料優先補上最近未釐清的問題；也可展開選項追蹤指定議題。街訪或電視沿用已有答覆，遇到新議題、新資料或尚未回應的新質疑才問一題；也能主動調整答覆。已回應同一版本的保證不會天天重問，但原話與回應會保留。一般議題準備後解鎖兩種方案，並不保證選民支持。</p><p>居民請託與款項線索為本局虛構事件，可自行選擇是否處理。查證每次另加 30,000 遊戲元，最多兩次，需占主角的主要行程或一位夥伴的工作。查到資料後，仍由你在拜票／節目的一題中決定如何說；不會把查證費直接換成票數。</p><p>募款所得限競選使用；可用現金 = 自備款 + 獻金 − 保證金 − 支出 + 符合資格的返還。當選或達本局落選返還門檻時返還保證金，補貼未實作。</p><p class="microcopy"><a href="'+esc(G.RULES.refundSource)+'" target="_blank" rel="noopener noreferrer">公職人員選舉罷免法第 32 條 ↗</a></p>'+sourceMarkup()+(G.RULES.sceneSources?.length?'<div class="background-sources"><h3>木柵縮景的地標參考</h3><p class="microcopy">木柵意象縮景｜非實際地圖。地標以造型意象放在同一場景，並不代表彼此的距離、方位或實際營業狀態。</p>'+G.RULES.sceneSources.map(s=>'<p><a href="'+esc(s.url)+'" target="_blank" rel="noopener noreferrer">'+esc(s.title)+' ↗</a></p>').join('')+'</div>':'');
  }
  function journalMarkup() {
    return (state.journal.length?state.journal.map(r=>'<section class="journal-entry"><h3>第 '+r.day+' 回合 · '+period(r.day)+'</h3>'+reportCard(r.player,'阿夏・你')+reportCard(r.rival,'周沐・對手',true)+eventReports(r.events)+briefPoll(r.poll,r.pollBefore||priorPoll(r.poll))+'</section>').join(''):'<p>完成第一回合的行程後，這裡會留下雙方的行動、支出與原因。</p>')+eventSummary()+'<h3>公開保證與更正</h3>'+promises(state.player.promises);
  }
  function openDialog(type, extra) {
    if(type==='dossier'&&extra==='tip')type='events';
    if(type==='dossier'&&(!G.TOPICS[extra]||!state.player.known.includes(extra)))return;
    if(!modal)lastFocus=document.activeElement;
    modal={type,extra};lastFrame=null;
    let title='',body='';
    if(type==='budget'){title='這筆競選款，怎麼算？';body=budgetMarkup();}
    if(type==='poll'){title='最新虛構民調';body=pollMarkup(state.polls.at(-1));}
    if(type==='rules'){title='情境與遊戲規則';body=rulesMarkup();}
    if(type==='tally'){title='本局完整開票';body=tallyMarkup();}
    if(type==='events'){title=extra==='tip'?'線索與查證紀錄':'本局事件紀錄';body=eventsMarkup(extra);}
    if(type==='journal'){title=G.DAYS+' 回合的行動紀錄';body=journalMarkup();}
    if(type==='dossier'){title=G.TOPICS[extra].title;body='<p>已讀資料，之後可引用。兩種方案都有取捨，不是保證加票的標準答案。</p>'+facts(extra)+'<h3>已解鎖的具體方案</h3>'+(G.TOPICS[extra].plans||[]).map(p=>'<div class="fact"><strong>'+esc(p.text)+'</strong><p>'+esc(p.detail)+'</p></div>').join('')+sourceMarkup((G.RULES.contextSources||[]).filter((_,i)=>i===({access:0,drain:1,welfare:2,sanitation:3,senior:4}[extra])));}
    if(type==='restart'){title=state.started&&state.phase!=='result'?'重新開始這場競選？':'再排一次競選行程';body='<p>'+(state.started&&state.phase!=='result'?'這一局還沒結束。重玩會覆蓋這一局的競選進度；更早版本的存檔不變。':'選同一情境，比較不同安排；或換一個新的虛構情境。')+'</p><button class="primary-button" data-action="confirm-restart" data-mode="same">'+(state.started&&state.phase!=='result'?'確定重玩，同一情境':'同一情境重玩')+'</button><button class="secondary-button" data-action="confirm-restart" data-mode="new">'+(state.started&&state.phase!=='result'?'確定重玩，換新情境':'換一個新情境')+'</button><button class="text-button" data-action="close">取消，保留這一局</button>';}
    $('dialog-title').textContent=title;$('dialog-body').innerHTML=body;$('dialog-overlay').hidden=false;
    document.querySelector('main').inert=true;document.querySelector('.masthead').inert=true;
    $('world').classList.add('motion-paused');$('dialog').focus({preventScroll:true});
  }
  function closeDialog() {
    if(!modal)return;
    modal=null;$('dialog-overlay').hidden=true;
    document.querySelector('main').inert=false;document.querySelector('.masthead').inert=false;
    $('world').classList.remove('motion-paused');lastFrame=null;
    const focus=lastFocus&&document.contains(lastFocus)?lastFocus:$('interaction');focus.focus?.({preventScroll:true});lastFocus=null;
    if(motion&&reduced.matches)finishTravel();
  }
  function restart(mode) {
    // Cancel old animation before closing a modal; reduced-motion cannot finish an abandoned day.
    clearMotion();closeDialog();
    let newSeed=mode==='same'?state.seed:seed();if(mode==='new'&&newSeed===state.seed)newSeed=(newSeed+1)>>>0;
    state=G.initial(newSeed);position={...anchors.start};selectedTopic=null;selectedVenue=null;topicOptionsOpen=false;selectedAction=null;selectedAnswer=null;teamMode='together';responseMode='repeat';optionsOpen=false;error='';lastFrame=null;
    setPosition();save();render();focusPanel();announce('新一局已重新準備，按開始再出發。');
  }
  function focusChoice(selector) { $('panel').querySelector?.(selector)?.focus({preventScroll:true}); }
  function dispatch(data) {
    const settings=$('panel').querySelector?.('.plan-options');if(settings)optionsOpen=settings.open;
    const topicSettings=$('panel').querySelector?.('.topic-options');if(topicSettings)topicOptionsOpen=topicSettings.open;
    if(data.action==='close'){closeDialog();return;}
    if(data.action==='confirm-restart'&&modal?.type==='restart'&&['same','new'].includes(data.mode)){restart(data.mode);return;}
    if(modal)return;
    if(['budget','poll','journal','restart','dossier','events','tally','rules'].includes(data.action)){openDialog(data.action,data.topic);return;}
    if(data.answer&&state.phase==='question'){answer(data.answer);return;}
    if(data.action==='skip'){if(motion)finishTravel();return;}
    if(data.action==='start'&&!state.started){if(G.start(state)){save();render();focusPanel(true);announce('本月兩位夥伴薪資已付，剩餘 74 萬。第一回合開始。');}return;}
    if(data.action==='topic'&&state.started&&state.phase==='plan'&&availableTopics().some(t=>t.id===data.topic)){selectedTopic=data.topic;topicOptionsOpen=true;error='';save();render();focusChoice('[data-action="topic"][data-topic="'+selectedTopic+'"]');return;}
    if(data.action==='topic-auto'&&state.started&&state.phase==='plan'){selectedTopic=null;topicOptionsOpen=true;error='';save();render();focusChoice('[data-action="topic-auto"]');return;}
    if(data.action==='venue'&&state.started&&state.phase==='plan'&&selectedAction==='canvass'&&venues[data.venue]){selectedVenue=data.venue;error='';save();render();focusChoice('[data-action="venue"][data-venue="'+selectedVenue+'"]');announce('已改往'+venues[selectedVenue].title+'，尚未扣款。');return;}
    if(data.action==='team-mode'&&state.phase==='plan'&&['together','research','canvass'].includes(data.mode)){teamMode=data.mode;optionsOpen=true;error='';save();render();focusChoice('[data-action="team-mode"][data-mode="'+teamMode+'"]');return;}
    if(data.action==='response'&&state.phase==='plan'){responseMode=responseMode==='repeat'?'answer':'repeat';topicOptionsOpen=true;error='';save();render();focusChoice('[data-action="response"]');return;}
    if(data.action==='select-action'&&state.started&&state.phase==='plan'&&action(data.kind)){selectedAction=data.kind;error='';save();render();focusChoice('[data-action="select-action"][data-kind="'+selectedAction+'"]');announce('已選'+(G.preview(state,selectedAction,planConfig()).title||action(selectedAction).title)+'，查看費用後確認出發。');return;}
    if(data.action==='select-fundraise'&&state.started&&state.phase==='plan'){selectedAction='fundraise';teamMode='together';selectedTopic=null;topicOptionsOpen=false;error='';save();render();focusChoice('[data-action="confirm-action"]');announce('已改選公開募款，保留團隊全體同行。查看費用後確認出發。');return;}
    if(data.action==='confirm-action'){if(selectedAction)begin(selectedAction);return;}
    if(data.action==='next'&&state.phase==='recap'){if(G.next(state)){selectedAction=null;selectedAnswer=null;selectedTopic=null;selectedVenue=null;topicOptionsOpen=false;teamMode='together';responseMode='repeat';optionsOpen=false;if(state.phase==='plan'){position={...anchors.start};setPosition();}save();render();focusPanel(true);announce(state.phase==='result'?'本局虛構開票已結算。':'第 '+state.day+' 回合開始。');}return;}
  }
  document.addEventListener('click',event=>{const el=event.target.closest('[data-action],[data-answer]');if(el&&!el.disabled)dispatch(el.dataset);});
  $('dialog-overlay').addEventListener('click',event=>{if(event.target===$('dialog-overlay'))closeDialog();});
  $('dialog').addEventListener('keydown',event=>{
    if(!modal)return;
    if(event.key==='Escape'){event.preventDefault();closeDialog();}
    if(event.key==='Tab'){
      const nodes=[...$('dialog').querySelectorAll('button:not(:disabled),a[href],[tabindex="0"]')],first=nodes[0],last=nodes.at(-1);
      if(!nodes.length){event.preventDefault();$('dialog').focus();}
      else if(event.shiftKey&&(document.activeElement===first||document.activeElement===$('dialog'))){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&(document.activeElement===last||document.activeElement===$('dialog'))){event.preventDefault();first.focus();}
    }
  });
  document.addEventListener('visibilitychange',()=>{lastFrame=null;$('world').classList.toggle('motion-paused',document.hidden||!!modal);if(document.hidden)save();else if(motion&&reduced.matches&&!modal)finishTravel();});
  window.addEventListener('pagehide',save);
  reduced.addEventListener?.('change',()=>{if(reduced.matches&&motion&&!modal)finishTravel();});
  scene();
  if(migratedLegacy){save();if(!saveError)migrationNotice='已複製原 v10 進度；舊版入口仍保留原局。';}
  render();
  if(recoveredTravel){position={...destinationFor(state.pending.id,state.pending.venue)};setPosition();if(G.arrive(state)){save();render();announce('已恢復本回合行程，沒有重複扣費。');}}
  if(window.requestAnimationFrame)window.requestAnimationFrame(frame);
  // Executes production event/state logic in the test harness; never bypasses engine validation.
  window.DayUI=Object.freeze({dispatch,tick,getState:()=>JSON.parse(JSON.stringify(state)),getPosition:()=>({...position}),getMotion:()=>motion?{id:motion.id,stage:motion.stage,index:motion.index}:null,storageKey:KEY});
})();
