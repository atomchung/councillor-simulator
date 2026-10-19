/* Quick-day v8 controller: one committed action per day, optional animation, no manual walking. */
(function () {
  'use strict';
  const G = window.DayGame, Art = window.DayArt, $ = id => document.getElementById(id);
  const KEY = 'wenshan-quick-days-v8';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = n => Number(n || 0).toLocaleString('zh-TW') + ' 元';
  const wan = n => (Number(n || 0) / 10000).toLocaleString('zh-TW', { maximumFractionDigits: 2 }) + ' 萬';
  const pct = n => Number(n || 0).toLocaleString('zh-TW', { maximumFractionDigits: 2 }) + '%';
  const reduced = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  const fallback = { start: { x: 586, y: 331 }, prepare: { x: 534, y: 234 }, canvass: { x: 309, y: 355 }, tv: { x: 783, y: 374 }, fundraise: { x: 553, y: 432 }, recruit: { x: 713, y: 243 } };
  const anchors = Art?.anchors || fallback;
  const locations = { prepare: '資料桌', canvass: '早市街口', tv: '地方電視台', fundraise: '募款小廣場', recruit: '夥伴工作室' };
  const topics = Object.fromEntries(Object.entries(G?.TOPICS || {}).map(([id,topic]) => [id,topic.title]));
  const shortActions = {
    prepare: ['讀懂限制，解鎖兩種具體方案', '花一天準備，今天不增加曝光'],
    canvass: ['接觸居民，回答一個現場問題', '停留人數受天氣影響'],
    tv: ['更多曝光，回答一個節目提問', '原話更容易被引用，曝光不等於支持'],
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
  let state, selectedTopic = 'access', teamTask = 'off', modal = null, lastFocus = null;
  let position = { ...anchors.start }, motion = null, lastFrame = null, error = '', saveError = '', locked = false;
  const seed = () => window.crypto?.getRandomValues ? window.crypto.getRandomValues(new Uint32Array(1))[0] : (Date.now() ^ Math.floor(Math.random() * 4294967296)) >>> 0;
  if (!G) {
    $('panel').innerHTML = '<div class="panel-content"><h2>遊戲程式尚未載入</h2><p>請重新整理。原有版本的存檔不會被覆蓋。</p><a href="legacy-v7/index.html">開啟保留的市場日 v7</a></div>';
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
      state = parsed; selectedTopic = G.TOPICS[parsed._ui?.topic] ? parsed._ui.topic : 'access';
      if (Number.isFinite(parsed._ui?.x) && Number.isFinite(parsed._ui?.y)) position = { x: Math.max(0,Math.min(1200,parsed._ui.x)), y: Math.max(0,Math.min(650,parsed._ui.y)) };
      recoveredTravel = state.phase === 'travel';
    } else {
      state = G.initial(seed());
      if (raw) saveError = '這份競選存檔無法讀取，已開啟新局；更早版本的存檔不受影響。';
    }
  } catch (_) { state = G.initial(seed()); saveError = '目前無法讀取本機存檔。仍可遊玩，請勿依賴重新整理後續玩。'; }
  const icon = id => '<span class="action-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' + (icons[id] || icons.prepare) + '</svg></span>';
  const action = id => G.ACTIONS.find(a => a.id === id);
  function save() {
    state._ui = { x: position.x, y: position.y, topic: selectedTopic };
    try { window.localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (_) { saveError = '瀏覽器無法儲存進度。這一頁仍可繼續玩，關閉或重新整理可能會失去進度。'; }
    $('save-warning').hidden = !saveError; $('save-warning').textContent = saveError;
  }
  function announce(text) { $('announcer').textContent = text; }
  function focusPanel(reveal=false) { $('interaction').focus({ preventScroll: true }); if(reveal && window.innerWidth<=850) $('interaction').scrollIntoView?.({behavior:reduced.matches?'auto':'smooth',block:'start'}); }
  function actorPosition(el, p) { el.style.left = p.x / 12 + '%'; el.style.top = p.y / 6.5 + '%'; el.style.zIndex = String(Math.round(p.y)); }
  function setPosition() { actorPosition($('player'), position); }
  function scene() {
    $('scene').innerHTML = Art ? Art.scene() : '<p class="blank-scene">小鎮圖像未能載入，右側行動仍可正常遊玩。</p>';
    $('player').innerHTML = Art ? Art.avatar('player') + '<span class="actor-name">阿夏・你</span>' : '<span class="actor-name">阿夏・你</span>';
    $('rival').innerHTML = Art ? Art.avatar('rival') + '<span class="actor-name">周沐</span>' : '';
    actorPosition($('rival'), { x: 690, y: 354 });
    $('new-teammate').innerHTML = Art ? Art.avatar('helper') + '<span class="actor-name">小葉</span>' : '';
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
    $('poll-rival').textContent = poll ? '周沐 ' + pct(poll.percentages[1]) + ' · ' + (poll.day ? '第 '+poll.day+' 天' : '出發前') : '開始後顯示全選區樣本';
    $('journal-count').textContent = String(state.journal.length);
    $('knowledge').innerHTML = state.player.known.length ? state.player.known.map(id => '<button data-action="dossier" data-topic="'+esc(id)+'">'+esc(topics[id])+' ↗</button>').join('') : '還沒準備議題';
    $('team-summary').textContent = state.player.team ? '小葉已加入' : '獨自出發';
    $('day-kicker').textContent = state.started ? 'WENSHAN · ROUND ' + String(state.day).padStart(2,'0') + ' / ' + String(G.DAYS).padStart(2,'0') : '臺北市文山區・木柵 / 示意街區';
    $('world-title').textContent = !state.started ? '從巷口，走進大家的日常。' : state.phase === 'plan' ? (state.day===G.DAYS?'最後一回合，你想留下什麼？':state.day===1?'今天，把時間花在哪裡？':'第 '+state.day+' 回合，接著做一件重要的事。') : state.phase === 'result' ? '票已開出，說過的話仍會留下。' : (action(state.pending?.id)?.title || '今天的行程') + '，出發。';
    const r = state.recap || state.journal.at(-1);
    $('news-label').textContent = r ? '第 '+r.day+' 天 · 對手的行程' : '街角消息';
    $('town-news').textContent = r ? '周沐｜' + r.rival.title + '。' + r.rival.result : '你忙著準備的時候，對手也在安排自己的行程。';
    $('location-label').textContent = locations[state.pending?.id] || '競選辦公室';
    $('save-warning').hidden = !saveError; $('save-warning').textContent = saveError;
  }
  function panel(kicker, label, body) {
    return '<div class="panel-kicker"><span>'+kicker+'</span><span>'+label+'</span></div><div class="panel-content">'+(error?'<div class="error-message" role="alert">'+esc(error)+'</div>':'')+body+'</div>';
  }
  function intro() {
    return panel('競選到開票',G.DAYS+' 個壓縮回合','<span class="intro-tag">你是阿夏，第一次投入競選。</span><h2 class="intro-title">一次一件事。<br>一路，走到開票。</h2><p class="lead">先查資料，或直接走進市場？<br>把 '+G.DAYS+' 個回合排成你的樣子，對手也會行動。</p><div class="intro-path"><b>選行動</b><span>→</span><b>自動出發</b><span>→</span><b>看結果</b></div><button class="primary-button" data-action="start">開始競選 →</button><p class="microcopy">每回合代表一個主要行程。拜票與節目最多回答一題，其他直接看結果。最後有當選、落選退保證金、落選沒收三種結局。</p>');
  }
  function plan() {
    const owed = state.player.promises.find(p => ['pending','unresolved'].includes(p.status));
    const availableTeam = state.player.team && state.player.team.hiredDay < state.day;
    return panel('ROUND '+String(state.day).padStart(2,'0'),'今天選一項','<div class="planning-head"><h2>今天做什麼？</h2><span>一回合・一個主要行動</span></div><div class="topic-caption"><span>準備／公開行程的議題</span><span>先選議題，再點行動</span></div><div class="topic-picks">'+Object.entries(topics).map(([id,title])=>'<button class="topic-pick '+(selectedTopic===id?'selected':'')+'" data-action="topic" data-topic="'+id+'" aria-pressed="'+(selectedTopic===id)+'"><b>'+title+'</b><small>'+(state.player.known.includes(id)?'已準備・具體方案已解鎖':'尚未準備')+'</small></button>').join('')+'</div>'+(owed?'<p class="microcopy">下次公開行程會先問你先前的保證：「'+esc(owed.text)+'」</p>':'')+'<div class="action-list">'+G.ACTIONS.map(a=>{
      const p=G.preview(state,a.id,{topic:selectedTopic,teamTask}), text=shortActions[a.id]||[a.benefit,a.risk];
      return '<button class="day-action" data-action="begin" data-kind="'+a.id+'" '+(!p.allowed?'disabled aria-disabled="true"':'')+' aria-label="'+esc(a.title+'，花一天，費用 '+money(p.totalCost))+'">'+icon(a.id)+'<span><span class="action-heading"><b>'+esc(a.title)+'</b><em>'+money(p.totalCost)+'</em></span><span class="action-description">'+esc(p.allowed?text[0]:p.reason)+'</span><span class="action-risk">'+esc(p.teamCost?'含查證 '+money(p.teamCost)+'；'+text[1]:text[1])+'</span></span></button>';
    }).join('')+'</div>'+(availableTeam?'<div class="team-switch"><p>請小葉同時查這個議題<small>實際加價列在卡片；已讀議題不重收費</small></p><button data-action="team" aria-pressed="'+(teamTask==='research')+'">'+(teamTask==='research'?'已開啟':'未派工')+'</button></div>':'')+'<p class="microcopy">點行動即扣顯示費用並出發。準備會解鎖選項，沒有保證加票的答案。</p>');
  }
  function travelPanel() {
    const a=action(state.pending.id), stage=motion?.stage==='perform';
    return panel('ROUND '+String(state.day).padStart(2,'0'),'今日行程已安排','<div class="travel-title">'+icon(a.id)+'<h2>'+esc(a.title)+'</h2></div><p class="lead">'+(stage?'已到現場，正在'+({prepare:'查閱資料',canvass:'和居民打招呼',tv:'準備開錄',fundraise:'收下捐款信封',recruit:'迎接新夥伴'}[a.id])+'。':'阿夏正在前往'+locations[a.id]+'。')+'</p><div class="stage-track"><span class="active"></span><span class="'+(stage?'active':'')+'"></span><span></span></div><p>'+esc(a.description)+'</p><div class="action-total"><span>今天已扣款</span><strong>'+money(state.pending.cost)+'</strong></div><p class="microcopy">'+(['canvass','tv'].includes(a.id)?'接著只問一題，等你自己選擇回答。':'這個行動沒有對話選項，完成後直接看今日結果。')+'</p><button class="text-button" data-action="skip">略過動畫，繼續 →</button>');
  }
  function questionPanel() {
    const q=G.question(state);
    if(!q)return panel('今日提問','進度已保留','<h2>對話尚未載入</h2><p>請重新整理，恢復目前行程。</p>');
    const role=state.pending.id==='tv'?'resident':state.pending.topic==='access'?'shop':'shop2';
    return panel('ROUND '+String(state.day).padStart(2,'0')+' · '+esc(action(state.pending.id).title),'只回答這一題','<div class="speaker"><div class="speaker-portrait" aria-hidden="true">'+(Art?Art.avatar(role):'')+'</div><div><strong>'+esc(q.speaker)+'</strong><small>今天的關鍵問題</small></div></div>'+(q.quote?'<div class="quoted-line"><small>你先前的原話</small>「'+esc(q.quote)+'」</div>':'')+'<div class="question-text">'+esc(q.text)+'</div><div class="answer-list">'+q.options.map(o=>'<button class="answer-option" data-answer="'+esc(o.id)+'" '+(!o.unlocked?'disabled aria-disabled="true"':'')+'><small class="answer-tag">'+(!o.unlocked?'尚未解鎖':G.TOPICS[state.pending.topic].plans.some(p=>p.id===o.id)?'已讀資料解鎖':'可以這樣回答')+'</small>'+esc(o.text)+'<small>'+esc(o.detail)+'</small>'+(!o.unlocked?'<small>'+esc(o.whyLocked)+'</small>':'')+'</button>').join('')+'</div><p class="microcopy">回答後直接看結果，不會再跳第二題，也不會重複扣費。</p>');
  }
  function reportCard(r,who,opponent=false) {
    return '<div class="recap-card '+(opponent?'rival-recap':'')+'"><div class="recap-person"><i aria-hidden="true"></i>'+esc(who)+'</div><h3>'+esc(r.title)+'</h3><p>'+esc(r.result)+'</p><p class="cause">'+esc(r.reason)+'</p>'+(r.reactions?'<p class="reaction-note">本次議題回應：肯定 '+r.reactions.positive+'／保留 '+r.reactions.reserved+'<small>虛構交流回應，不是實際票數。</small></p>':'')+(r.teamNote?'<p class="cause">'+esc(r.teamNote)+'</p>':'')+'<div class="recap-cost"><span>支出 '+money(r.cost)+'</span>'+(r.income?'<span>競選獻金 +'+money(r.income)+'</span>':'')+'</div></div>';
  }
  function briefPoll(p) {
    if(!p)return '';
    return '<div class="brief-poll">第 '+p.day+' 天 · 虛構全選區抽樣<div class="poll-pair"><span>阿夏 <b>'+pct(p.percentages[0])+'</b></span><span>周沐 <b>'+pct(p.percentages[1])+'</b></span></div><small>n = '+p.n+'；其餘包含其他 17 位候選人與未表態。抽樣起伏不等於今天新增票數。</small></div>';
  }
  function recapPanel() {
    const r=state.recap;
    return panel('ROUND '+String(state.day).padStart(2,'0')+' · 今日收尾','結果已記錄','<h2>今天，各自向前一步。</h2>'+reportCard(r.player,'阿夏・你')+reportCard(r.rival,'周沐・對手',true)+(r.weather?.id==='rain'?'<p class="weather-note">'+esc(r.weather.title)+'：'+esc(r.weather.text)+'</p>':'')+briefPoll(r.poll)+(r.player.action==='prepare'?'<button class="text-button" data-action="dossier" data-topic="'+esc(r.player.topic)+'">看看剛讀到的 3 則資料 ↗</button>':'')+'<button class="primary-button" data-action="next">'+(state.day<G.DAYS?'開始第 '+(state.day+1)+' 天 →':'進入開票結算 →')+'</button><p class="microcopy">'+(state.day<G.DAYS?'按下才進入下一天。':'接著結算本局虛構票數、席次與保證金。')+'</p>');
  }
  function promises(items) {
    return items.length?items.map(p=>'<div class="fact"><strong>'+esc(({unresolved:'待說明',pending:'待回覆',corrected:'已更正・原話保留',kept:'已回覆'})[p.status]||p.status)+' · '+esc(topics[p.topic]||'')+'</strong><p>「'+esc(p.text)+'」</p><p class="microcopy">'+esc(p.recipient||'')+' · '+esc(p.due||'')+'</p></div>').join(''):'<p class="no-pending">沒有尚待說明的工期保證。</p>';
  }
  function resultPanel() {
    const r=state.result;
    const endings={elected:['你當選了。','進入本局 '+r.seats+' 席名單，保證金返還。'],refunded:['落選，但保證金返還。','得票達本局返還門檻，保留下一次的可能。'],forfeited:['落選，保證金沒收。','得票未達本局返還門檻；未花完的競選款仍留在帳上。']};
    const ending=endings[r.outcome]||['本局已開票。','查看完整票數與資金結算。'];
    return panel(G.DAYS+' 回合 · 開票結算','虛構縮小情境','<span class="ending-tag '+esc(r.outcome)+'">'+({elected:'當選',refunded:'落選・退保證金',forfeited:'落選・沒收保證金'}[r.outcome]||'已結算')+'</span><h2>'+ending[0]+'</h2><p>'+ending[1]+'</p><div class="result-stats"><div>本局得票<strong>'+r.playerVotes+' 票</strong></div><div>19 人中排名<strong>第 '+r.rank+' 名</strong></div><div>競選帳餘額<strong>'+wan(r.cash)+'</strong></div><div>'+(r.refunded?'返還保證金':'沒收保證金')+'<strong>'+wan(r.refunded||r.forfeited)+'</strong></div></div><p class="microcopy">'+r.eligible.toLocaleString('zh-TW')+' 名合成選民、19 名虛構候選人競逐 '+r.seats+' 席。本局未當選者返還門檻 '+r.refundThreshold+' 票。</p><button class="primary-button" data-action="tally">看完整開票與結算依據 →</button><p class="reflection">'+esc(r.reflection)+'</p>'+(r.pending?.length?'<h3>還要交代的事</h3>'+promises(r.pending):'')+'<button class="secondary-button" data-action="journal">回看各回合行動</button><button class="text-button" data-action="restart">再試一種安排</button><p class="microcopy">遊戲即時返還不代表現實入帳時間。性別保障、競選補貼未模擬；獻金不是私人利潤。</p>');
  }
  function render() {
    header();
    $('panel').innerHTML=!state.started?intro():state.phase==='plan'?plan():state.phase==='travel'?travelPanel():state.phase==='question'?questionPanel():state.phase==='recap'?recapPanel():resultPanel();
    $('world').dataset.phase=state.phase;
    $('skip-animation').hidden=!motion;
    $('skip-animation').textContent=motion?.stage==='perform'?'略過演出 →':'略過移動 →';
    if(!motion) $('walk-status').textContent=!state.started?'每天選一個主要行動，角色會自己出發。':state.phase==='plan'?'選一個行動就出發，今天的時間只花一次。':state.phase==='question'?'已到現場。請選一個回答，再看今天的結果。':state.phase==='recap'?'今天的結果已留下，按「'+(state.day<G.DAYS?'開始第 '+(state.day+1)+' 天':'進入開票結算')+'」才會繼續。':'本局已結算，可以查看完整開票或重新安排。';
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
    motion={id,stage:'walk',route,index:1,elapsed:0};
    $('world').dataset.action=id;
    $('destination-marker').hidden=false;actorPosition($('destination-marker'),destination);
    $('route-line').innerHTML='<svg viewBox="0 0 1200 650"><polyline points="'+route.map(p=>p.x+','+p.y).join(' ')+'"/></svg>';
    $('player').classList.add('walking');
    $('walk-status').textContent='正在前往'+locations[id]+'，不需操作移動。';
    render();
    if(!reduced.matches && window.innerWidth<=850) $('world').scrollIntoView?.({behavior:'smooth',block:'center'});
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
    if(G.arrive(state)){save();render();focusPanel(true);announce(state.phase==='question'?'已到現場，請回答今天唯一的一題。':'今天的行動和對手結果都已記錄。');}
  }
  function tick(dt) {
    if(!motion||modal||document.hidden||state.phase!=='travel')return;
    dt=Math.max(0,Math.min(Number(dt)||0,.1));
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
    const p=G.preview(state,id,{topic:selectedTopic,teamTask});
    if(!p.allowed){error=p.reason;render();return;}
    locked=true;
    if(G.begin(state,id,{topic:selectedTopic,teamTask})){error='';save();startMotion();focusPanel();announce('第 '+state.day+' 天安排'+p.title+'，已扣 '+money(p.totalCost)+'。');}
    locked=false;
  }
  function answer(id) {
    if(modal||locked||state.phase!=='question')return;
    const q=G.question(state),option=q?.options.find(o=>o.id===id);
    if(!option?.unlocked)return;
    locked=true;
    if(G.answer(state,id)){save();render();focusPanel(true);announce('回答已記錄，直接進入今日結果。');}
    locked=false;
  }
  function facts(topic) {
    return G.TOPICS[topic].facts.map(f=>'<div class="fact"><strong>'+esc(f.title)+'</strong><p>'+esc(f.text)+'</p></div>').join('');
  }
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
    return p?'<p>'+esc(p.label)+'；n = '+p.n+'。這是遊戲內全選區樣本，並非真實民調。</p><div class="poll-bars">'+['阿夏・你','周沐・對手','其他 17 位','未表態'].map((name,i)=>'<div class="poll-line"><span>'+name+'</span><div class="poll-track"><i style="width:'+Math.max(0,Math.min(100,p.percentages[i]))+'%"></i></div><strong>'+pct(p.percentages[i])+'</strong></div>').join('')+'</div><p class="microcopy">開啟視窗不會重新抽樣。日與日的差異包含抽樣起伏；不能把差額當成某個答案固定換到的票數。最終票數另外模擬投票，不會直接照民調換算。</p>':'<p>開始遊戲後才有第一份虛構抽樣。</p>';
  }
  function sourceMarkup(items=G.RULES.contextSources||[]) {
    return '<div class="background-sources"><h3>地方背景來源</h3><p class="microcopy">官方資料用來交代地方背景。NPC、問題情境、支持度與選情為遊戲虛構；歷史紀錄不代表現況仍未改善，地圖也不是實測配置。</p>'+items.map(s=>'<p class="microcopy"><a href="'+esc(s.url)+'" target="_blank" rel="noopener noreferrer">'+esc(s.title)+' ↗</a></p>').join('')+'</div>';
  }
  function rulesMarkup() {
    return '<p>'+esc(G.RULES.note)+'</p><p>每回合安排一個主要行程，角色自動前往。街訪或電視最多回答一題，其餘行動直接結算；前一段公開保證可能優先被追問。準備解鎖兩種方案，並不保證選民支持。</p><p>募款所得限競選使用；可用現金 = 自備款 + 獻金 − 保證金 − 支出 + 符合資格的返還。當選或達本局落選返還門檻時返還保證金，補貼未實作。</p><p class="microcopy"><a href="'+esc(G.RULES.refundSource)+'" target="_blank" rel="noopener noreferrer">公職人員選舉罷免法第 32 條 ↗</a></p>'+sourceMarkup();
  }
  function journalMarkup() {
    return (state.journal.length?state.journal.map(r=>'<section class="journal-entry"><h3>第 '+r.day+' 天</h3>'+reportCard(r.player,'阿夏・你')+(r.player.quote?'<div class="quoted-line"><small>你當天說的原話</small>「'+esc(r.player.quote)+'」</div>':'')+reportCard(r.rival,'周沐・對手',true)+briefPoll(r.poll)+'</section>').join(''):'<p>完成第一天的行程後，這裡會留下雙方的行動、支出與原因。</p>')+'<h3>公開保證與更正</h3>'+promises(state.player.promises);
  }
  function openDialog(type, extra) {
    if(type==='dossier'&&(!G.TOPICS[extra]||!state.player.known.includes(extra)))return;
    if(!modal)lastFocus=document.activeElement;
    modal={type,extra};lastFrame=null;
    let title='',body='';
    if(type==='budget'){title='這筆競選款，怎麼算？';body=budgetMarkup();}
    if(type==='poll'){title='最新虛構民調';body=pollMarkup(state.polls.at(-1));}
    if(type==='rules'){title='情境與遊戲規則';body=rulesMarkup();}
    if(type==='tally'){title='本局完整開票';body=tallyMarkup();}
    if(type==='journal'){title=G.DAYS+' 回合的行動紀錄';body=journalMarkup();}
    if(type==='dossier'){title=G.TOPICS[extra].title;body='<p>已讀資料，之後可引用。兩種方案都有取捨，不是保證加票的標準答案。</p>'+facts(extra)+'<h3>已解鎖的具體方案</h3>'+G.TOPICS[extra].plans.map(p=>'<div class="fact"><strong>'+esc(p.text)+'</strong><p>'+esc(p.detail)+'</p></div>').join('')+sourceMarkup((G.RULES.contextSources||[]).filter((_,i)=>i===(extra==='access'?0:1)));}
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
    state=G.initial(newSeed);position={...anchors.start};selectedTopic='access';teamTask='off';error='';lastFrame=null;
    setPosition();save();render();focusPanel();announce('新一局已重新準備，按開始再出發。');
  }
  function dispatch(data) {
    if(data.action==='close'){closeDialog();return;}
    if(data.action==='confirm-restart'&&modal?.type==='restart'&&['same','new'].includes(data.mode)){restart(data.mode);return;}
    if(modal)return;
    if(['budget','poll','journal','restart','dossier','tally','rules'].includes(data.action)){openDialog(data.action,data.topic);return;}
    if(data.answer){answer(data.answer);return;}
    if(data.action==='skip'){if(motion)finishTravel();return;}
    if(data.action==='start'&&!state.started){if(G.start(state)){save();render();focusPanel(true);announce('第一天開始，選一個主要行動。');}return;}
    if(data.action==='topic'&&state.started&&state.phase==='plan'&&G.TOPICS[data.topic]){selectedTopic=data.topic;error='';save();render();return;}
    if(data.action==='team'&&state.phase==='plan'&&state.player.team&&state.player.team.hiredDay<state.day){teamTask=teamTask==='off'?'research':'off';render();return;}
    if(data.action==='begin'){begin(data.kind);return;}
    if(data.action==='next'&&state.phase==='recap'){if(G.next(state)){teamTask='off';if(state.phase==='plan'){position={...anchors.start};setPosition();}save();render();focusPanel(true);announce(state.phase==='result'?'本局虛構開票已結算。':'第 '+state.day+' 天開始。');}return;}
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
  if(recoveredTravel){position={...(anchors[state.pending.id]||anchors.start)};setPosition();if(G.arrive(state)){save();render();announce('已恢復今日行程，沒有重複扣費。');}}
  if(window.requestAnimationFrame)window.requestAnimationFrame(frame);
  // Executes production event/state logic in the test harness; never bypasses engine validation.
  window.DayUI=Object.freeze({dispatch,tick,getState:()=>JSON.parse(JSON.stringify(state)),getPosition:()=>({...position}),getMotion:()=>motion?{id:motion.id,stage:motion.stage,index:motion.index}:null,storageKey:KEY});
})();
