/* Campaign v9 controller: one committed action per day, optional animation, no manual walking. */
(function () {
  'use strict';
  const G = window.DayGame, Art = window.DayArt, $ = id => document.getElementById(id);
  const KEY = 'wenshan-campaign-v9';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = n => Number(n || 0).toLocaleString('zh-TW') + ' 元';
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
  let state, selectedTopic = 'access', selectedAction = null, selectedAnswer = null, teamMode = 'together', responseMode = 'repeat', recoverySelected = false, optionsOpen = false, modal = null, lastFocus = null;
  let teamElapsed = 0;
  let position = { ...anchors.start }, motion = null, lastFrame = null, error = '', saveError = '', locked = false;
  const seed = () => window.crypto?.getRandomValues ? window.crypto.getRandomValues(new Uint32Array(1))[0] : (Date.now() ^ Math.floor(Math.random() * 4294967296)) >>> 0;
  if (!G) {
    $('panel').innerHTML = '<div class="panel-content"><h2>遊戲程式尚未載入</h2><p>請重新整理。原有版本的存檔不會被覆蓋。</p><a href="../legacy-v8/index.html">開啟保留的七回合 v8</a></div>';
    return;
  }
  function validSaved(s) {
    const array = x => Array.isArray(x);
    return s && s.version === G.VERSION && Number.isInteger(s.seed) && typeof s.started === 'boolean' && Number.isInteger(s.day) && s.day >= 1 && s.day <= G.DAYS && ['plan','travel','question','recap','result'].includes(s.phase) && s.player && s.rival && s.budget && ['committed','personalContribution','donations','deposit','available','spent'].every(k => Number.isFinite(s.budget[k]) && s.budget[k] >= 0) && array(s.player.known) && s.player.known.every(t => !!G.TOPICS[t]) && array(s.player.promises) && array(s.player.actions) && s.player.counts && Number.isFinite(s.player.recognition) && array(s.rival.known) && array(s.rival.promises) && array(s.rival.actions) && s.rival.counts && s.rival.budget && array(s.voters) && s.voters.length === G.POPULATION && s.voters.every(v => array(v.support) && v.support.length === 3 && v.support.every(Number.isFinite) && Number.isFinite(v.priority) && Number.isFinite(v.accuracy)) && array(s.polls) && s.polls.every(p => array(p.percentages) && p.percentages.length === 4 && p.percentages.every(Number.isFinite)) && array(s.journal) && array(s.ledger) && (!['travel','question'].includes(s.phase) || (s.pending && G.ACTIONS.some(a => a.id === s.pending.id) && !!G.TOPICS[s.pending.topic])) && (s.phase !== 'recap' || !!(s.recap?.player && s.recap?.rival && s.recap?.poll)) && (s.phase !== 'result' || (s.result && ['elected','refunded','forfeited'].includes(s.result.outcome) && array(s.result.tally) && s.result.tally.length === 19 && Number.isFinite(s.result.cash) && Number.isFinite(s.result.playerVotes) && Number.isFinite(s.result.rank)));
  }
  let recoveredTravel = false;
  try {
    const raw = window.localStorage.getItem(KEY), parsed = raw ? JSON.parse(raw) : null;
    if (validSaved(parsed)) {
      state = G.upgrade(parsed); selectedTopic = G.TOPICS[parsed._ui?.topic] ? parsed._ui.topic : 'access';
      selectedAction = G.ACTIONS.some(a=>a.id===parsed._ui?.action) ? parsed._ui.action : null;
      selectedAnswer = typeof parsed._ui?.answer==='string' ? parsed._ui.answer : null;
      teamMode = ['together','research','canvass','release'].includes(parsed._ui?.teamMode) ? parsed._ui.teamMode : 'together';
      responseMode = parsed._ui?.responseMode==='answer' ? 'answer' : 'repeat';
      recoverySelected = parsed._ui?.recoverySelected===true && selectedAction==='fundraise' && teamMode==='release';
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
  const availableTopics = () => typeof G.availableTopics === 'function' ? G.availableTopics(state) : Object.values(G.TOPICS);
  // Event display must only use the engine's player-visible projection, never the seeded event state.
  const eventView = () => typeof G.eventView === 'function' ? G.eventView(state) : {};
  const recordText = value => typeof value === 'string' ? value : value?.text || value?.quote || value?.summary || '';
  function topicStatus(id, events=eventView()) {
    if(id==='tip')return events.tip?.evidenceText || '線索尚未查證';
    return state.player.known.includes(id)?'已準備・具體方案已解鎖':'尚未準備';
  }
  const investigationStatus = e => e.canInvestigate===false ? (e.update?'後續核對已到，不再安排查證或收資料費。':'已達本局查證上限，不再收資料費。') : '';
  function eventCards() {
    const events=eventView();
    return '<section class="event-cards" aria-label="本局可選事件">'+['welfare','tip'].filter(id=>events[id]?.available).map(id=>{
      const e=events[id];
      return '<article class="event-card"><div class="event-card-label">本局虛構事件・可自由選擇</div><h3>'+esc(e.title)+'</h3><p>'+esc(e.request||e.summary)+'</p><p>'+esc(id==='tip'?e.evidenceText:(typeof e.npc==='string'?e.npc:e.npc?.name))+'</p>'+(id==='tip'&&investigationStatus(e)?'<p>'+esc(investigationStatus(e))+'</p>':'')+'<button data-action="topic" data-topic="'+id+'" aria-pressed="'+(selectedTopic===id)+'">'+(selectedTopic===id?'已選這個議題':'選擇這個議題')+'</button><button class="text-button" data-action="events" data-topic="'+id+'">查看事件紀錄 ↗</button></article>';
    }).join('')+'</section>';
  }
  function costBreakdown(r, preview=false) {
    const base=Number.isFinite(r.baseCost)?r.baseCost:0, team=Number(r.teamCost||0), extra=Number(r.eventCost||0), total=preview?r.totalCost:(r.cost??r.totalCost);
    return '<span class="'+(preview?'action-cost-breakdown':'cost-breakdown')+'">'+((r.id||r.action)==='recruit'?'擴編費':'主要行程')+' '+money(base)+' ＋ 團隊薪資 '+money(team)+(extra?' ＋ 查證資料費 '+money(extra):'')+' ＝ '+money(total)+'</span>';
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
      body+=(e.history?.length?'<div class="event-history"><h4>查證與發言的原始紀錄</h4>'+e.history.map(x=>eventRecord(x,x.quote?'當時留下的說法':'第 '+Number(x.stage||x.evidenceLevel||0)+' 次查證')).join('')+'</div>':eventRecord(e.publication,'你的公開處理'))+eventRecord(e.update,'後續查證紀錄')+(e.truthLabel?'<p class="verified-outcome"><b>目前可見的核對結論：</b>'+esc(e.truthLabel)+'</p>':'')+(e.responseDue?'<p class="followup-note">這筆公開紀錄有新資料待回應；下次選這個議題公開時，仍只會問一題。</p>':'')+'<p class="microcopy">每次查證資料費 '+money(e.investigationCost)+'，最多 '+Number(e.maxInvestigations||2)+' 次。'+esc(investigationStatus(e))+'主角準備占本回合主要行程；夥伴查資料占一人的工作，薪資另計。未查證也可選擇保留線索；公開說法由你決定。</p></section>';
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
    state._ui = { x: position.x, y: position.y, topic: selectedTopic, action: selectedAction, answer: selectedAnswer, teamMode, responseMode, recoverySelected };
    try { window.localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (_) { saveError = '瀏覽器無法儲存進度。這一頁仍可繼續玩，關閉或重新整理可能會失去進度。'; }
    $('save-warning').hidden = !saveError; $('save-warning').textContent = saveError;
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
    const labelPoints = { prepare: {x:468,y:178}, canvass:{x:278,y:286},tv:{x:887,y:307},fundraise:{x:586,y:491},recruit:{x:747,y:167} };
    $('map-labels').innerHTML = Object.keys(locations).map(id => '<span class="map-label" data-label="'+id+'" style="left:'+labelPoints[id].x/12+'%;top:'+labelPoints[id].y/6.5+'%">'+locations[id]+'</span>').join('');
    setPosition();
  }
  function header() {
    $('day-label').innerHTML = (state.phase === 'result' ? '開票結算' : '第 ' + state.day + ' 回合') + '<span>／ ' + G.DAYS + '</span>';
    $('day-dots').innerHTML = Array.from({length:G.DAYS},(_,i) => '<i class="'+(state.phase === 'result' || i+1 < state.day ? 'done' : i+1===state.day ? 'current':'')+'"></i>').join('');
    $('cash').textContent = wan(state.budget.available);
    $('recognition').innerHTML = esc(state.player.recognition) + '<span>%</span>';
    const poll = state.polls.at(-1);
    $('poll-you').textContent = poll ? '你 ' + pct(poll.percentages[0]) : '尚未抽樣';
    $('poll-rival').textContent = poll ? '周沐 ' + pct(poll.percentages[1]) + ' · ' + (poll.day ? '第 '+poll.day+' 回合' : '出發前') : '開始後顯示全選區樣本';
    $('journal-count').textContent = String(state.journal.length);
    $('knowledge').innerHTML = state.player.known.length ? state.player.known.map(id => '<button data-action="'+(id==='tip'?'events':'dossier')+'" data-topic="'+esc(id)+'">'+esc(topics[id])+' ↗</button>').join('') : '還沒準備議題';
    const crewCount=state.player.team?.members?.length||0;
    $('team-summary').textContent = '團隊 '+(crewCount+1)+' 人（含你）'+(crewCount?' · '+crewCount+' 位支薪夥伴':' · 獨自出發')+(crewCount>3?' · 場景僅顯示代表':'');
    $('day-kicker').textContent = state.started ? 'ROUND ' + String(state.day).padStart(2,'0') + ' / ' + String(G.DAYS).padStart(2,'0') + ' · '+period(state.day) : '臺北市文山區・木柵 / 示意街區';
    $('world-title').textContent = !state.started ? '從巷口，走進大家的日常。' : state.phase === 'plan' ? (state.day===G.DAYS?'最後一回合，你想留下什麼？':state.day===1?'本回合，把時間花在哪裡？':'第 '+state.day+' 回合，接著做一件重要的事。') : state.phase === 'result' ? '票已開出，說過的話仍會留下。' : (action(state.pending?.id)?.title || '本回合的行程') + '，出發。';
    const r = state.recap || state.journal.at(-1);
    $('news-label').textContent = r ? '第 '+r.day+' 回合 · 對手的行程' : '街角消息';
    $('town-news').textContent = r ? '周沐｜' + r.rival.title + '。' + r.rival.result : '你忙著準備的時候，對手也在安排自己的行程。';
    $('location-label').textContent = locations[state.pending?.id] || '競選辦公室';
    $('save-warning').hidden = !saveError; $('save-warning').textContent = saveError;
  }
  function panel(kicker, label, body, primary='', atTop=false) {
    const controls=primary?'<div class="panel-primary'+(atTop?' primary-top':'')+'">'+primary+'</div>':'';
    return '<div class="panel-kicker"><span>'+kicker+'</span><span>'+label+'</span></div>'+(atTop?controls:'')+'<div class="panel-content">'+(error?'<div class="error-message" role="alert">'+esc(error)+'</div>':'')+body+'</div>'+(!atTop?controls:'');
  }
  function intro() {
    return panel('競選到開票',(G.DAYS*roundDays)+' 天 · '+G.DAYS+' 回合','<span class="intro-tag">你是阿夏，第一次投入競選。</span><h2 class="intro-title">一次一件事。<br>一路，走到開票。</h2><p class="lead">選一個行動，確認後出發。<br>對手與團隊也會同步行動。</p><div class="intro-path"><b>選行動</b><span>→</span><b>確認出發</b><span>→</span><b>看結果</b></div><p class="microcopy">每回合代表 3 天，共 30 天。新局有你與兩位夥伴；每位夥伴每回合薪資 15,000 元。拜票與節目最多回答一題。既有存檔的團隊人數保持不變。</p><a class="legacy-version-link" href="../legacy-v8/index.html">繼續七回合 v8 舊存檔 ↗</a>','<button class="primary-button" data-action="start">開始競選 →</button>');
  }
  const planConfig = () => ({ topic:selectedTopic, teamMode, responseMode });
  const modeLabels = {together:'全體跟隨主要行動',research:'一位夥伴查資料',canvass:'一位夥伴代為拜訪',release:'解散全部支薪夥伴'};
  function selectedEvent(topic=selectedTopic) {
    const events=eventView(),e=events[topic];
    if(!e?.available)return '';
    return '<div class="selected-event"><b>'+esc(e.title)+'</b><p>'+esc(topic==='tip'?e.evidenceText:e.request)+'</p><button class="text-button" data-action="events" data-topic="'+topic+'">'+(topic==='tip'?'查看證據與原話':'查看請託紀錄')+' ↗</button></div>';
  }
  function plan() {
    const members=eligibleTeam(),config=planConfig(),p=selectedAction?G.preview(state,selectedAction,config):null;
    const current=G.preview(state,'fundraise',{topic:'access',teamMode:'together'}),roster=current.rosterSize??((state.player.team?.members?.length||0)+1);
    const needsRecovery=members.length>0 && !current.allowed;
    const title=p?(p.title||action(selectedAction).title):'先選擇一個主要行動';
    const cards='<div class="action-list compact-actions" aria-label="選擇一個主要行動">'+G.ACTIONS.map(a=>{
      const label=a.id==='recruit'?'招募團隊':a.title;
      return '<button class="day-action'+(selectedAction===a.id?' selected':'')+'" data-action="select-action" data-kind="'+a.id+'" aria-pressed="'+(selectedAction===a.id)+'" aria-label="'+esc(label+'，選擇後查看費用與詳情')+'">'+icon(a.id)+'<b>'+esc(label)+'</b></button>';
    }).join('')+'</div>';
    let detail='<div class="selected-placeholder"><b>① 選行動　② 看費用　③ 確認出發</b><p>選擇與調整設定不扣款。這回合尚未安排。</p><p>團隊 '+roster+' 人（含你），夥伴預設一起行動。</p></div>';
    if(p){
      const a=action(selectedAction),publicAction=['canvass','tv'].includes(selectedAction),description=selectedAction==='prepare'&&selectedTopic==='tip'?'核對線索，更新可引用的證據。':(shortActions[selectedAction]?.[0]||p.benefit||a.benefit);
      detail='<section class="selected-detail" aria-label="所選行動與全部費用"><div class="selected-title"><h3>'+esc(recoverySelected?'解散團隊並募款':title)+'</h3><strong>'+money(p.totalCost)+'</strong></div><p class="selection-benefit">'+esc(description)+'</p>'+costBreakdown(p,true)+'<p class="salary-note">'+(teamMode==='release'?'本回合不支付離隊夥伴薪資。':!p.teamCost?'目前沒有支薪夥伴，本回合團隊薪資 0 元。':'每位夥伴每回合 15,000 元，薪資已含總額；分工不另收一次薪資。')+'</p>'+(p.expectedIncome?'<p class="income-net">預計淨增加 '+(p.expectedIncome.min-p.totalCost).toLocaleString('zh-TW')+'–'+(p.expectedIncome.max-p.totalCost).toLocaleString('zh-TW')+' 元（募得款項減上述總支出）。</p>':'')+(selectedAction==='recruit'?'<p class="recruit-change">團隊 '+(p.rosterSize??roster)+' 人 → '+(p.nextRosterSize??roster)+' 人（含你）；新夥伴下回合開始計薪。</p>':'')+(publicAction&&p.expectedReach?'<p class="action-reach">估計接觸約 '+p.expectedReach.min+'–'+p.expectedReach.max+' 人 · '+esc(p.depthLabel)+'</p>':'')+(publicAction?'<p class="action-response">'+(p.willAsk?'會問一題：':'沿用答覆，不再提問：')+esc(p.responseReason)+'</p>':'')+(p.eventNote?'<p class="action-event">'+esc(p.eventNote)+'</p>':'')+(p.followup?'<details class="selected-followup"><summary>這次先回應「'+esc(topics[p.topic])+'」的先前保證</summary><p>「'+esc(p.followup.text)+'」</p></details>':'')+selectedEvent(p.topic)+(teamMode==='release'?'<p class="team-release-warning"><b>確認後永久移除全部支薪夥伴。</b>不收解散費；本回合照常消耗。之後要夥伴需重新招募。</p>':'')+'</section>';
    }
    const events=eventView(),availableEvents=['welfare','tip'].filter(id=>events[id]?.available);
    const settings='<details class="plan-options"'+(optionsOpen?' open':'')+'><summary>團隊 '+roster+' 人（含你） · '+esc(modeLabels[teamMode])+'<span>調整設定</span></summary><div class="options-content">'+(state.player.crewRules==='legacy'?'<p class="legacy-contract microcopy">沿用原局人數與單人增聘合約；未增加人數或改算既有費用。</p>':'')+(members.length?'<div class="team-picks" role="group" aria-label="團隊分工">'+Object.entries(modeLabels).map(([id,label])=>'<button data-action="team-mode" data-mode="'+id+'" aria-pressed="'+(teamMode===id)+'">'+label+'</button>').join('')+'</div><p class="microcopy">全體預設跟隨主要行動；也可分出一位夥伴查資料或代訪，其餘繼續跟隨。留任夥伴每回合皆計薪。主角查同一議題時，不會重複安排查證。</p>':'<p class="microcopy">目前獨自出發。選「招募團隊」可查看這份存檔的擴編人數與費用。</p>')+'<div class="response-choice"><p>'+(responseMode==='answer'?'本回合會重新選一次答覆。':'已有答覆就沿用；遇新資料或待回應保證才問一題。')+'</p><button data-action="response" aria-pressed="'+(responseMode==='answer')+'">'+(responseMode==='answer'?'改為沿用答覆':'調整本回合的答覆')+'</button></div>'+(availableEvents.length?'<details class="optional-events"><summary>居民請託與爆料紀錄（'+availableEvents.length+'）</summary>'+eventCards()+'</details>':'')+'<p class="microcopy">數字為本局遊戲設定。估計觸及的實際人數依本局抽選，重複行程觸及遞減；曝光不等於支持。</p></div></details>';
    const topicPicker='<div class="compact-topic"><span>議題</span><div class="topic-picks">'+availableTopics().map(({id,title})=>'<button class="topic-pick '+(selectedTopic===id?'selected':'')+'" data-action="topic" data-topic="'+id+'" aria-pressed="'+(selectedTopic===id)+'" title="'+esc(topicStatus(id))+'">'+esc(title)+'</button>').join('')+'</div></div>';
    const reason=!p?(needsRecovery?'現金不足以支付本回合團隊薪資。可選下方零元起步方案。':'請先選擇上方一個行動。'):!p.allowed?p.reason+(current.allowed&&p.totalCost>state.budget.available?' 可選「公開募款」保留團隊。':''):'確認才扣款並使用本回合；尚可更改選擇。';
    const recovery=needsRecovery&&!recoverySelected?'<button class="recovery-button" data-action="select-recovery">解散團隊並募款 <span>零元起步</span></button>':p&&!p.allowed&&current.allowed&&p.totalCost>state.budget.available?'<button class="recovery-button ordinary-fundraise" data-action="select-fundraise">改選公開募款 <span>保留團隊，全體同行</span></button>':'';
    const primary='<p id="commit-reason" class="commit-reason'+(p&&!p.allowed?' blocked':'')+'" role="status">'+esc(reason)+'</p>'+recovery+'<button class="primary-button" data-action="confirm-action" aria-describedby="commit-reason" '+(!p?.allowed?'disabled aria-disabled="true"':'')+'>'+(!p?'先選行動，再確認出發':recoverySelected?'確認解散團隊並募款 →':(teamMode==='release'?'確認解散並':'確認')+title+' →')+'</button>';
    return panel('第 '+state.day+'／'+G.DAYS+' 回合 · '+period(state.day),'安排中 · 尚未扣款','<div class="planning-head"><h2>這回合做什麼？</h2><span>只選一個主要行動</span></div>'+cards+topicPicker+detail+settings,primary);
  }
  function travelPanel() {
    const a={...action(state.pending.id),title:state.pending.title||action(state.pending.id).title}, stage=motion?.stage==='perform';
    return panel('ROUND '+String(state.day).padStart(2,'0'),'本回合行程已安排','<div class="travel-title">'+icon(a.id)+'<h2>'+esc(a.title)+'</h2></div><p class="lead">'+(stage?'已到現場，正在'+({prepare:'查閱資料',canvass:'和居民打招呼',tv:'準備開錄',fundraise:'收下捐款信封',recruit:'迎接新夥伴'}[a.id])+'。':'阿夏正在前往'+locations[a.id]+'。')+'</p><div class="stage-track"><span class="active"></span><span class="'+(stage?'active':'')+'"></span><span></span></div><p>'+esc(a.description)+'</p><div class="action-total"><span>本回合已扣款</span><strong>'+money(state.pending.cost)+'</strong></div>'+costBreakdown(state.pending)+(state.pending.eventNote?'<p class="action-event">'+esc(state.pending.eventNote)+'</p>':'')+'<p class="microcopy">'+(['canvass','tv'].includes(a.id)?state.pending.willAsk?'接著只問一題，等你自己選擇回答。':'本回合沿用先前答覆，沒有新提問，完成後直接看本回合結果。':'這個行動沒有對話選項，完成後直接看本回合結果。')+'</p>','<button class="primary-button" data-action="skip">略過動畫，繼續 →</button>');
  }
  function questionPanel() {
    const q=G.question(state);
    if(!q)return panel('本回合提問','進度已保留','<h2>對話尚未載入</h2><p>請重新整理，恢復目前行程。</p>');
    const role=state.pending.id==='tv'?'resident':state.pending.topic==='access'?'shop':'shop2',choice=q.options.find(o=>o.id===selectedAnswer&&o.unlocked);
    const body='<div class="speaker"><div class="speaker-portrait" aria-hidden="true">'+(Art?Art.avatar(role):'')+'</div><div><strong>'+esc(q.speaker)+'</strong><small>本回合只回答這一題</small></div></div>'+(q.reason?'<p class="question-reason">為什麼本回合會問：'+esc(q.reason)+'</p>':'')+(q.quote?'<div class="quoted-line"><small>你先前的原話</small>「'+esc(q.quote)+'」</div>':'')+'<div class="question-text">'+esc(q.text)+'</div><div class="answer-list" role="group" aria-label="選擇一個回答">'+q.options.map(o=>'<button class="answer-option'+(selectedAnswer===o.id?' selected':'')+'" data-answer="'+esc(o.id)+'" aria-pressed="'+(selectedAnswer===o.id)+'" '+(!o.unlocked?'disabled aria-disabled="true"':'')+'><span class="answer-line">'+esc(o.text)+'</span><small>'+esc(o.detail)+'</small>'+(Number.isFinite(o.extraCost)?'<small class="answer-extra-cost">此選擇額外費用 '+money(o.extraCost)+'</small>':'')+(!o.unlocked?'<small class="answer-tag">尚未解鎖：'+esc(o.whyLocked)+'</small>':'')+'</button>').join('')+'</div>';
    return panel('第 '+state.day+'／'+G.DAYS+' 回合 · '+esc(action(state.pending.id).title),'等待回答 · 1／1',body,'<p id="answer-reason" class="commit-reason" role="status">'+(choice?'已選回答，確認後直接看結果。':'請先選擇一個回答，再按確認。')+'</p><button class="primary-button" data-action="confirm-answer" aria-describedby="answer-reason" '+(!choice?'disabled aria-disabled="true"':'')+'>確認回答，看本回合結果 →</button>');
  }
  function effectMarkup(r) {
    const e=r.effects;
    if(!e?.before||!e?.after)return '';
    const rows=[['知名度',pct(e.before.recognition),pct(e.after.recognition)],['內部支持傾向',pct(e.before.support),pct(e.after.support)],['競選帳餘額',money(e.before.cash),money(e.after.cash)]];
    return '<div class="direct-effects"><h4>本回合的直接變化</h4>'+(e.contacts?'<p class="contact-total">主要行程接觸 <b>'+e.contacts+' 人</b> · '+esc(e.depthLabel)+'<small>肯定 '+e.positive+' 人／保留 '+e.reserved+' 人，不是實際票數。</small></p>':'<p class="contact-total">主要行程沒有對外接觸。</p>')+'<dl>'+rows.map(([name,before,after])=>'<div><dt>'+name+'</dt><dd>'+before+' <span>→</span> <b>'+after+'</b></dd></div>').join('')+'</dl>'+(e.after.known>e.before.known?'<p class="knowledge-change">已準備議題 '+e.before.known+' → '+e.after.known+' 個，'+(r.topic==='tip'?'查證紀錄已更新。':'具體方案已解鎖。')+'</p>':'')+'<p class="effect-caveat">知名度是遊戲曝光指標；內部支持傾向為遊戲模型內平均值，不是民調／選票。以上變化含本回合協作。</p>'+(e.groups?.length?'<details class="reaction-details"><summary>看議題偏好的不同回應</summary>'+e.groups.map(g=>'<p>'+esc(g.label)+'：肯定 '+g.positive+'／保留 '+g.reserved+'</p>').join('')+'<p class="microcopy">依虛構議題偏好分類，並非人口族群或真實民調。</p></details>':'')+'</div>';
  }
  function teamReportMarkup(r) {
    const items=r.teamReports||(r.teamReport?[r.teamReport]:[]);
    if(!items.length)return r.teamNote?'<p class="cause">'+esc(r.teamNote)+'</p>':'';
    return items.map(t=>'<div class="team-report"><h4>'+esc(t.name||t.memberName||'團隊成員')+'｜'+esc((t.title||'').replace((t.name||t.memberName||'')+' ',''))+'</h4><p>'+esc(t.result)+'</p>'+(t.task==='canvass'?'<p>協作接觸 '+(t.positive+t.reserved)+' 人：肯定 '+t.positive+'／保留 '+t.reserved+'<small>與主要行程分開計次；可能遇到同一人，不合計為新增選民。</small></p>':'')+'<small>'+(t.task==='release'?'結束合作，本回合薪資 ':'本回合薪資 ')+money(t.cost)+'，已含在總支出。</small></div>').join('');
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
  function recapPanel() {
    const r=state.recap,teams=r.player.teamReports||(r.player.teamReport?[r.player.teamReport]:[]),events=r.events||[],e=r.player.effects;
    const teamContacts=teams.reduce((n,t)=>n+(t.positive||0)+(t.reserved||0),0),teamIncome=teams.reduce((n,t)=>n+(t.income||0),0),research=teams.filter(t=>t.knowledge).length,deliveries=[teamContacts?'協作接觸 '+teamContacts+' 人次':'',research?'查證 '+research+' 份資料':'',teamIncome?'協助募得 '+money(teamIncome)+'（已含總收入）':''].filter(Boolean);
    const teamBrief=teams.length?(deliveries.join('；')||'沒有額外接觸或新資料')+'。固定薪資 '+money(r.player.teamCost)+(teams.some(t=>t.task==='release')?'；離隊已記錄':''):'本回合由你獨自完成';
    const brief='<div class="recap-overview"><article><span>你的主要行程</span><b>'+esc(r.player.title)+'</b><p>'+esc(r.player.result)+'</p></article><article><span>團隊</span><b>'+((state.player.team?.members?.length||0)+1)+' 人（含你）</b><p>'+esc(teamBrief)+'</p></article><article><span>對手・周沐</span><b>'+esc(r.rival.title)+'</b><p>'+esc(r.rival.result)+'</p></article><article><span>事件後續</span><b>'+(events.length?events.length+' 則新進展':'沒有新進展')+'</b><p>'+esc(events.map(x=>x.title).join('；')||'事件紀錄與先前原話都已保留。')+'</p></article></div>';
    const metrics='<div class="recap-quick-metrics"><span>本回合支出 <b>'+money(r.player.cost)+'</b></span>'+(r.player.income?'<span>競選獻金 <b>＋'+money(r.player.income)+'</b></span>':'')+'<span>可用款 <b>'+wan(state.budget.available)+'</b></span>'+(e?.before&&e?.after?'<span>知名度 <b>'+pct(e.before.recognition)+' → '+pct(e.after.recognition)+'</b></span>':'')+'</div>';
    const full='<details class="recap-details"><summary>展開完整回報、逐項費用與民調</summary>'+reportCard(r.player,'阿夏・你')+reportCard(r.rival,'周沐・對手',true)+eventReports(events)+(r.weather?.id==='rain'?'<p class="weather-note">'+esc(r.weather.title)+'：'+esc(r.weather.text)+'</p>':'')+briefPoll(r.poll,r.pollBefore||priorPoll(r.poll))+'</details>';
    const link=r.player.topic==='tip'?'<button class="text-button" data-action="events" data-topic="tip">查看查證紀錄 ↗</button>':r.player.action==='prepare'?'<button class="text-button" data-action="dossier" data-topic="'+esc(r.player.topic)+'">看看剛讀到的資料 ↗</button>':'';
    return panel('第 '+state.day+'／'+G.DAYS+' 回合 · 已完成','結果已儲存',brief+metrics+full+link,'<button class="primary-button" data-action="next">'+(state.day<G.DAYS?'開始第 '+(state.day+1)+' 回合 →':'進入開票結算 →')+'</button><p class="commit-reason">本回合已完成；按上方按鈕才繼續。</p>',true);
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
  function renderTeam() {
    const Team=window.DayTeamArt;
    if(!Team)return;
    const current=state.player.team?.members||[];
    let assignments=state.phase==='plan'?current.map(m=>({...m,task:'idle'})):[...(state.pending?.teamAssignments||[])];
    if(state.phase!=='plan')for(const m of current)if(!assignments.some(a=>a.id===m.id))assignments.push({...m,task:'idle'});
    $('team-actors').innerHTML=Team.render(assignments,state.phase==='travel'?teamElapsed:Team.duration,Art,{reducedMotion:reduced.matches});
  }
  function render() {
    if(state.phase==='plan'&&!availableTopics().some(t=>t.id===selectedTopic))selectedTopic='access';
    header();renderTeam();
    $('panel').innerHTML=!state.started?intro():state.phase==='plan'?plan():state.phase==='travel'?travelPanel():state.phase==='question'?questionPanel():state.phase==='recap'?recapPanel():resultPanel();
    $('world').dataset.phase=state.phase;
    $('interaction').dataset.phase=state.started?state.phase:'intro';
    $('skip-animation').hidden=!motion;
    $('skip-animation').textContent=motion?.stage==='perform'?'略過演出 →':'略過移動 →';
    if(!motion) $('walk-status').textContent=!state.started?'每回合選一個主要行動，角色會自己出發。':state.phase==='plan'?'選行動，再確認出發。選卡與設定不扣款。':state.phase==='question'?'已到現場。選一個回答，再按確認。':state.phase==='recap'?'本回合的結果已留下，按「'+(state.day<G.DAYS?'開始第 '+(state.day+1)+' 回合':'進入開票結算')+'」才會繼續。':'本局已結算，可以查看完整開票或重新安排。';
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
    const id=state.pending.id, destination=anchors[id]||anchors.start;
    let route=Art?.route ? Art.route(id) : [{...anchors.start},{...destination}];
    route=[{...position},...route.slice(1)];
    if(!route.length || route.at(-1).x!==destination.x || route.at(-1).y!==destination.y)route.push({...destination});
    motion={id,stage:'walk',route,index:1,elapsed:0};teamElapsed=0;
    $('world').dataset.action=id;
    $('destination-marker').hidden=false;actorPosition($('destination-marker'),destination);
    $('route-line').innerHTML='<svg viewBox="0 0 1200 650"><polyline points="'+route.map(p=>p.x+','+p.y).join(' ')+'"/></svg>';
    $('player').classList.add('walking');
    $('walk-status').textContent='正在前往'+locations[id]+'，不需操作移動。';
    render();
    if(!reduced.matches && window.innerWidth<1024) $('world').scrollIntoView?.({behavior:'smooth',block:'center'});
    if(reduced.matches) finishTravel();
  }
  function perform() {
    if(!motion)return;
    position={...(anchors[motion.id]||anchors.start)};setPosition();
    motion.stage='perform';motion.elapsed=0;
    $('player').classList.remove('walking');$('world').classList.add('performing');
    $('route-line').innerHTML='';$('destination-marker').hidden=true;
    $('action-effect').innerHTML=effect(motion.id);
    $('action-effect').style.left=position.x/12+'%';$('action-effect').style.top=position.y/6.5+'%';
    if(motion.id==='recruit'){ $('new-teammate').hidden=false;actorPosition($('new-teammate'),{x:position.x+72,y:position.y+11}); }
    $('walk-status').textContent=({prepare:'翻開資料，核對做法與限制。',canvass:'向攤商揮揮手，停下來聽問題。',tv:'燈光亮起，攝影機開始錄影。',fundraise:'捐款信封入帳，競選用途另列紀錄。',recruit:'小葉走過來，加入接下來的行程。'})[motion.id];
    render();
  }
  function clearMotion() {
    motion=null;$('player').classList.remove('walking');$('world').classList.remove('performing');
    $('destination-marker').hidden=true;$('route-line').innerHTML='';$('action-effect').innerHTML='';$('new-teammate').hidden=true;
    $('skip-animation').hidden=true;
  }
  function finishTravel() {
    if(modal||document.hidden||state.phase!=='travel')return;
    position={...(anchors[state.pending.id]||anchors.start)};setPosition();clearMotion();
    if(G.arrive(state)){save();render();focusPanel(true);announce(state.phase==='question'?'已到現場，請回答本回合唯一的一題。':'本回合的行動和對手結果都已記錄。');}
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
    if(G.answer(state,id)){save();render();focusPanel(true);announce('回答已記錄，直接進入本回合結果。');}
    locked=false;
  }
  function factsMarkup(items=[]) {
    return items.map(f=>'<div class="fact">'+(f.title?'<strong>'+esc(f.title)+'</strong>':'')+'<p>'+esc(typeof f==='string'?f:f.text)+'</p></div>').join('');
  }
  function facts(topic) { return factsMarkup(G.TOPICS[topic]?.facts||[]); }
  function budgetMarkup() {
    const b=state.budget, deposit=G.RULES.deposit;
    return '<p>完整競選的起點是 '+wan(b.committed)+'元，原先有 '+wan(deposit)+'元保證金鎖定，出發時可用 '+wan(b.committed-deposit)+'元。'+G.DAYS+' 回合壓縮呈現這場競選。</p><div class="budget-row"><span>自備競選款</span><strong>'+money(b.personalContribution)+'</strong></div><div class="budget-row"><span>模擬競選獻金</span><strong>＋'+money(b.donations)+'</strong></div><div class="budget-row"><span>原始繳納保證金</span><strong>−'+money(deposit)+'</strong></div><div class="budget-row"><span>累計行動與協作支出</span><strong>−'+money(b.spent)+'</strong></div>'+(b.refunded?'<div class="budget-row"><span>符合資格・本局返還</span><strong>＋'+money(b.refunded)+'</strong></div>':'')+'<div class="budget-row"><span>'+(b.forfeited?'已沒收保證金（不重複扣款）':'尚鎖定的保證金')+'</span><strong>'+money(b.forfeited||b.deposit)+'</strong></div><div class="budget-row total"><span>競選帳可用餘額</span><strong>'+money(b.available)+'</strong></div><p class="microcopy">獻金只能用於競選，不是個人收入。行動與協作費用為遊戲設定，不是實際支出或整月薪資；競選補貼未實作。未花款項不會因結局歸零。</p>'+(G.RULES?.depositSource?'<p class="microcopy"><a href="'+esc(G.RULES.depositSource)+'" target="_blank" rel="noopener noreferrer">保證金金額參考：中選會公告 ↗</a></p>':'');
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
    return '<p>'+esc(G.RULES.note)+'</p><p>每回合安排一個主要行程，角色自動前往。街訪或電視沿用已有答覆，遇到新議題、新資料或尚未回應的保證才問一題；也能主動調整答覆。已回應同一版本的保證不會天天重問，但原話與回應會保留。一般議題準備後解鎖兩種方案，並不保證選民支持。</p><p>居民請託與款項線索為本局虛構事件，可自行選擇是否處理。查證每次另加 30,000 遊戲元，最多兩次，需占主角的主要行程或一位夥伴的工作。查到資料後，仍由你在拜票／節目的一題中決定如何說；不會把查證費直接換成票數。</p><p>募款所得限競選使用；可用現金 = 自備款 + 獻金 − 保證金 − 支出 + 符合資格的返還。當選或達本局落選返還門檻時返還保證金，補貼未實作。</p><p class="microcopy"><a href="'+esc(G.RULES.refundSource)+'" target="_blank" rel="noopener noreferrer">公職人員選舉罷免法第 32 條 ↗</a></p>'+sourceMarkup()+(G.RULES.sceneSources?.length?'<div class="background-sources"><h3>木柵縮景的地標參考</h3><p class="microcopy">木柵意象縮景｜非實際地圖。地標以造型意象放在同一場景，並不代表彼此的距離、方位或實際營業狀態。</p>'+G.RULES.sceneSources.map(s=>'<p><a href="'+esc(s.url)+'" target="_blank" rel="noopener noreferrer">'+esc(s.title)+' ↗</a></p>').join('')+'</div>':'');
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
    if(type==='dossier'){title=G.TOPICS[extra].title;body='<p>已讀資料，之後可引用。兩種方案都有取捨，不是保證加票的標準答案。</p>'+facts(extra)+'<h3>已解鎖的具體方案</h3>'+(G.TOPICS[extra].plans||[]).map(p=>'<div class="fact"><strong>'+esc(p.text)+'</strong><p>'+esc(p.detail)+'</p></div>').join('')+sourceMarkup((G.RULES.contextSources||[]).filter((_,i)=>i===({access:0,drain:1,welfare:2}[extra])));}
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
    state=G.initial(newSeed);position={...anchors.start};selectedTopic='access';selectedAction=null;selectedAnswer=null;teamMode='together';responseMode='repeat';recoverySelected=false;optionsOpen=false;error='';lastFrame=null;
    setPosition();save();render();focusPanel();announce('新一局已重新準備，按開始再出發。');
  }
  function focusChoice(selector) { $('panel').querySelector?.(selector)?.focus({preventScroll:true}); }
  function dispatch(data) {
    const settings=$('panel').querySelector?.('.plan-options');if(settings)optionsOpen=settings.open;
    if(data.action==='close'){closeDialog();return;}
    if(data.action==='confirm-restart'&&modal?.type==='restart'&&['same','new'].includes(data.mode)){restart(data.mode);return;}
    if(modal)return;
    if(['budget','poll','journal','restart','dossier','events','tally','rules'].includes(data.action)){openDialog(data.action,data.topic);return;}
    if(data.answer&&state.phase==='question'){const option=G.question(state)?.options.find(o=>o.id===data.answer);if(option?.unlocked){selectedAnswer=data.answer;error='';save();render();focusChoice('[data-answer="'+selectedAnswer+'"]');announce('已選回答，按確認才會送出。');}return;}
    if(data.action==='confirm-answer'){if(selectedAnswer)answer(selectedAnswer);return;}
    if(data.action==='skip'){if(motion)finishTravel();return;}
    if(data.action==='start'&&!state.started){if(G.start(state)){save();render();focusPanel(true);announce('第一回合開始，選一個主要行動。');}return;}
    if(data.action==='topic'&&state.started&&state.phase==='plan'&&availableTopics().some(t=>t.id===data.topic)){selectedTopic=data.topic;recoverySelected=false;error='';save();render();focusChoice('[data-action="topic"][data-topic="'+selectedTopic+'"]');return;}
    if(data.action==='team-mode'&&state.phase==='plan'&&['together','research','canvass','release'].includes(data.mode)){teamMode=data.mode;optionsOpen=true;recoverySelected=false;error='';save();render();focusChoice('[data-action="team-mode"][data-mode="'+teamMode+'"]');return;}
    if(data.action==='response'&&state.phase==='plan'){responseMode=responseMode==='repeat'?'answer':'repeat';optionsOpen=true;error='';save();render();focusChoice('[data-action="response"]');return;}
    if(data.action==='select-action'&&state.started&&state.phase==='plan'&&action(data.kind)){selectedAction=data.kind;recoverySelected=false;error='';save();render();focusChoice('[data-action="select-action"][data-kind="'+selectedAction+'"]');announce('已選'+(G.preview(state,selectedAction,planConfig()).title||action(selectedAction).title)+'，查看費用後確認出發。');return;}
    if(data.action==='select-fundraise'&&state.started&&state.phase==='plan'){selectedAction='fundraise';teamMode='together';selectedTopic='access';recoverySelected=false;error='';save();render();focusChoice('[data-action="confirm-action"]');announce('已改選公開募款，保留團隊全體同行。查看費用後確認出發。');return;}
    if(data.action==='select-recovery'&&state.started&&state.phase==='plan'){selectedAction='fundraise';teamMode='release';selectedTopic='access';recoverySelected=true;error='';save();render();focusChoice('[data-action="confirm-action"]');announce('已選解散團隊並募款。請確認永久移除全部支薪夥伴，再按確認出發。');return;}
    if(data.action==='confirm-action'){if(selectedAction)begin(selectedAction);return;}
    if(data.action==='next'&&state.phase==='recap'){if(G.next(state)){selectedAction=null;selectedAnswer=null;teamMode='together';responseMode='repeat';recoverySelected=false;optionsOpen=false;if(state.phase==='plan'){position={...anchors.start};setPosition();}save();render();focusPanel(true);announce(state.phase==='result'?'本局虛構開票已結算。':'第 '+state.day+' 回合開始。');}return;}
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
  scene();render();
  if(recoveredTravel){position={...(anchors[state.pending.id]||anchors.start)};setPosition();if(G.arrive(state)){save();render();announce('已恢復本回合行程，沒有重複扣費。');}}
  if(window.requestAnimationFrame)window.requestAnimationFrame(frame);
  // Executes production event/state logic in the test harness; never bypasses engine validation.
  window.DayUI=Object.freeze({dispatch,tick,getState:()=>JSON.parse(JSON.stringify(state)),getPosition:()=>({...position}),getMotion:()=>motion?{id:motion.id,stage:motion.stage,index:motion.index}:null,storageKey:KEY});
})();
