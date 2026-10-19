/* Three-day campaign interface. All game outcomes belong to campaign-engine.js. */
(function () {
  'use strict';
  const G = window.CampaignGame;
  const ART = window.CityArt || window.TownArt;
  const KEY = 'qingchuan-campaign-v6';
  const $ = id => document.getElementById(id);
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num = value => Number.isFinite(Number(value)) ? Number(value) : 0;
  const money = value => num(value).toLocaleString('zh-TW');
  const signed = value => (num(value) > 0 ? '+' : '') + num(value);
  const clone = value => JSON.parse(JSON.stringify(value));
  const safeText = value => Array.isArray(value) ? value.join('；') : typeof value === 'string' ? value : '';
  let s, modalKind = '', activeAction = '', actionConfig = {teamTask:'off', mode:'clear'}, busy = false, toastTimer, lastFocus;
  let saveAvailable = true, loadNote = '';
  if (!G || !ART) {
    $('intro').innerHTML = '<div class="fatal"><h1>遊戲檔案還沒載入完成。</h1><p>請重新整理再試一次。若仍然出現這則訊息，可以先繼續舊版。</p><a href="legacy-v5/index.html">繼續舊版小城 →</a></div>';
    return;
  }
  const avatar = (kind, color) => ART.avatar(kind, color);
  const partyName = id => G.PARTIES[id] ? G.PARTIES[id].name : '無黨籍';
  const days = G.DAYS;
  const playerName = () => s.player.name || '阿夏';
  const rivalName = () => s.rival.name || '對手';
  const rivalAvatar = () => avatar(s.rival.species || 'rabbit','#7b919c');
  const seed = () => {
    if (window.crypto && window.crypto.getRandomValues) return window.crypto.getRandomValues(new Uint32Array(1))[0] || 1;
    return ((Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0) || 1;
  };
  function validState(v) {
    return v && v.version === G.VERSION && Number.isFinite(v.seed) && Number.isInteger(v.day) && v.day >= 1 && v.day <= days &&
      ['play','recap','result'].includes(v.phase) && v.player && v.rival && Array.isArray(v.polls) && Array.isArray(v.player.known) &&
      Number.isFinite(v.player.cash) && Number.isFinite(v.player.recognition) && G.PARTIES[v.player.party] &&
      (v.phase !== 'recap' || v.recap) && (v.phase !== 'result' || v.result);
  }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (validState(data)) return data;
        loadNote = '這個瀏覽器的三日版存檔無法讀取。按下「開始三天」會建立新局；舊版存檔仍可從下方連結繼續。';
      }
    } catch (error) {
      if (error instanceof SyntaxError) loadNote = '三日版存檔格式無法讀取。按下「開始三天」會建立新局；舊版存檔仍然保留。';
      else saveAvailable = false;
    }
    return G.initial(seed(), 'independent');
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(s)); saveAvailable = true; }
    catch (_) { saveAvailable = false; }
    $('save-status').textContent = saveAvailable ? '本機自動存檔 · v6' : '無法自動存檔 · 請保持此頁開啟';
  }
  function can(actionId, config) {
    const check = G.canAct(s, actionId, config);
    if (typeof check === 'boolean') return {ok:check, reason:''};
    if (check && typeof check === 'object') return {ok:check.ok === true || check.allowed === true, reason:safeText(check.reason || check.error)};
    return {ok:false, reason:'目前無法進行這個行動。'};
  }
  function notify(message) {
    clearTimeout(toastTimer); $('toast').textContent = message; $('toast').hidden = false;
    toastTimer = setTimeout(() => { $('toast').hidden = true; }, 4300);
  }
  function openModal(title, content, kind) {
    if ($('modal-overlay').hidden) lastFocus = document.activeElement;
    modalKind = kind;
    $('modal').innerHTML = '<button type="button" class="modal-close" data-do="close" aria-label="關閉視窗">×</button><h2 id="modal-title">'+esc(title)+'</h2>'+content;
    $('modal-overlay').hidden = false;
    $('app-shell').inert = true;
    document.body.style.overflow = 'hidden';
    $('modal').scrollTop = 0;
    $('modal').focus({preventScroll:true});
  }
  function closeModal(restoreFocus = true) {
    $('modal-overlay').hidden = true; $('app-shell').inert = false; document.body.style.overflow = '';
    modalKind = ''; activeAction = '';
    if (restoreFocus && lastFocus && lastFocus.isConnected) lastFocus.focus({preventScroll:true});
  }
  function focusSection(id) {
    const element = $(id);
    requestAnimationFrame(() => { element.focus({preventScroll:true}); element.scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'}); });
  }
  function tutorial() {
    return '<div class="step-strip" aria-label="每天的流程"><span><b>1</b>選行動</span><span class="arrow" aria-hidden="true">→</span><span><b>2</b>對手行動</span><span class="arrow" aria-hidden="true">→</span><span><b>3</b>看民調</span><span class="arrow" aria-hidden="true">→</span><span><b>4</b>下一天</span></div>';
  }
  function renderIntro() {
    $('intro').innerHTML = '<div class="intro-layout"><div><p class="eyebrow">一場小小的回合策略遊戲</p><h1 id="intro-heading">三天，五種選擇。<br>你會把時間花在哪裡？</h1><p class="subcopy">你是第一次參選的'+esc(playerName())+'。帶著 '+money(s.player.cash)+' 元遊戲現金，和一位新手對手走過選前最後三天。</p><span class="chip">每天只做 1 件事 · 約 3–5 分鐘一局</span>'+tutorial()+'<fieldset class="party-fieldset"><legend>選一個角色標籤</legend><div class="party-options">'+Object.entries(G.PARTIES).map(([id,p])=>'<label class="radio-option"><input type="radio" name="party" value="'+esc(id)+'" '+(s.player.party===id?'checked':'')+'><span>'+esc(p.name)+'</span></label>').join('')+'</div><p class="field-note">三個標籤的規則與起始條件相同；不設定真實政黨的能力或立場。</p></fieldset><button type="button" class="primary wide" data-do="start">開始三天 <span aria-hidden="true">→</span></button><div class="intro-links"><a href="legacy-v5/index.html">繼續舊版小城（保留舊存檔） ↗</a><span class="fineprint">三日版使用獨立存檔</span></div>'+(loadNote?'<p class="session-note">'+esc(loadNote)+'</p>':'')+'</div><div class="intro-art">'+ART.town()+'<div class="intro-portrait">'+avatar('fox','#648979')+'</div><span class="intro-caption">小城不大，每一天都算數。</span></div></div><div class="intro-guide"><div><strong>01 / 選擇，有機會成本</strong><p>準備、拜票、電視、募款、招募。每個行動都用掉一天，現金費用先說清楚。</p></div><div><strong>02 / 對手，也會行動</strong><p>本局只有一位整體較弱的對手。雙方用相同規則，對手仍可能把握機會。</p></div><div><strong>03 / 看結果，也看原因</strong><p>每天都有行動回報與固定樣本民調。第三天之後，才另外計算正式選票。</p></div></div>';
  }
  function pollMarkup(poll) {
    const p = poll && Array.isArray(poll.percentages) ? poll.percentages : [0,0,0];
    return '<div class="poll-top"><span class="stat-label">'+(poll && poll.day > 0?'第 '+esc(poll.day)+' 天民調':'開局民調')+'</span><small>'+ (poll?'虛構樣本 n='+esc(poll.n):'等待開局')+'</small></div><div class="poll-values"><span><i class="poll-key" aria-hidden="true"></i>你<b>'+ (poll?esc(p[0])+'%':'—')+'</b></span><span><i class="poll-key rival" aria-hidden="true"></i>對手<b>'+ (poll?esc(p[1])+'%':'—')+'</b></span><span><i class="poll-key undecided" aria-hidden="true"></i>未決<b>'+ (poll?esc(p[2])+'%':'—')+'</b></span></div><div class="poll-bar" aria-hidden="true">'+p.map(v=>'<i style="width:'+Math.max(0,Math.min(100,num(v)))+'%"></i>').join('')+'</div><p class="fineprint">每日樣本估計，與最後正式選票分開計算。</p>';
  }
  function renderCandidates() {
    $('town-art').innerHTML = ART.town()+'<div class="map-player">'+avatar('fox','#648979')+'</div><div class="map-rival">'+rivalAvatar()+'</div>';
    $('player-card').innerHTML = '<div class="portrait">'+avatar('fox','#648979')+'</div><div class="candidate-info"><b>'+esc(playerName())+'<span class="role">你</span></b><small>'+esc(partyName(s.player.party))+' · 初次參選</small></div>';
    $('rival-card').innerHTML = '<div class="portrait">'+rivalAvatar()+'</div><div class="candidate-info"><b>'+esc(rivalName())+'<span class="role">唯一對手</span></b><small>'+esc(partyName(s.rival.party))+' · 知名度 '+esc(s.rival.recognition)+'</small><small>遊戲現金 '+money(s.rival.cash)+'</small></div>';
    $('rival-note').textContent = '新手對局：對手整體較弱，仍用相同規則行動。'+(s.rival.strength?(s.rival.profileTitle?s.rival.profileTitle+'：':'')+'「'+s.rival.strength+'」。':'')+'對手與事件由本局種子固定。';
    const obligations = (s.player.promises || []).map(p => p.text+'：'+(p.status==='corrected'?'已更正，原紀錄保留':p.status==='unresolved'?'待說明':p.due>days?'投票後仍需交代':'第 '+p.due+' 天需回應'));
    $('obligations').innerHTML = obligations.length ? '<ul class="obligation-list">'+obligations.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>' : '<p class="empty-note">目前沒有待交代的承諾。</p>';
    $('facts-button').textContent = '已知資料 '+s.player.known.length;
    $('helper-status').textContent = s.phase==='result' ? '這一局已結束，沒有背景自動行動。' : !s.player.team ? '還沒有隊友。招募後，從下一天起才可選擇是否請他協助。' : s.player.team.hiredDay >= s.day ? (s.day===days?'隊友今天加入，但這局已沒有投票前的下一天。':'隊友今天剛加入，下一天起才能協助。') : '隊友可以協助：每次在行動確認視窗另選任務與費用，預設不出勤。';
  }
  const iconPaths = {
    prepare:'<path d="M5 4h11l4 4v15H5z"/><path d="M15 4v5h5M8 13h9M8 17h7"/>',
    canvass:'<path d="M3 12 13 4l10 8M6 10v13h14V10M11 23v-8h5v8"/>',
    tv:'<rect x="3" y="7" width="20" height="15" rx="2"/><path d="m9 2 4 5 5-5M8 25h10M18 12h1M18 16h1"/>',
    fundraise:'<path d="m3 13 5-4 6 3 7-3 3 4-12 10-9-5zM7 14l5 3 7-6"/><circle cx="12" cy="5" r="3"/>',
    recruit:'<circle cx="10" cy="8" r="4"/><path d="M3 23v-3a7 7 0 0 1 14 0v3M21 8v10M16 13h10"/>'
  };
  function renderActions() {
    $('actions-section').hidden = s.phase === 'result';
    $('actions-note').textContent = s.phase === 'recap' ? '今天已完成 · 先看回報，再到下一天' : '花 1 天 · 確認後才出發';
    $('action-grid').innerHTML = G.ACTIONS.map(action => {
      const p = G.preview(s,action.id,{teamTask:'off',mode:'clear'});
      const check = can(action.id,{teamTask:'off',mode:'clear'});
      const unavailable = s.phase !== 'play' || !check.ok;
      let note = s.phase==='recap' ? '今天已完成' : !check.ok ? check.reason || (num(p.totalCost)>s.player.cash?'現金不足':'目前不可選') : '查看並確認';
      return '<button type="button" class="action-card" data-action="'+esc(action.id)+'" '+(unavailable?'disabled':'')+'><span class="action-top"><span class="action-icon" aria-hidden="true"><svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'+(iconPaths[action.id]||'')+'</svg></span><span class="action-title">'+esc(action.title)+'</span><span class="action-cost">'+money(p.totalCost)+' 元 · 1 天</span></span><span class="action-desc">'+esc(p.description || action.description)+'</span><span class="action-benefit">可能收穫：'+esc(p.benefit || action.benefit)+'</span><span class="action-risk">代價／風險：'+esc(p.risk || action.risk)+'</span><span class="action-cta"><span>'+esc(note)+' '+(!unavailable?'→':'')+'</span><span class="action-meta">'+(action.id==='recruit' && s.day===days?'本局已無下一天':action.id==='fundraise'?'不需預付現金':'費用先確認')+'</span></span></button>';
    }).join('');
  }
  function recapPerson(who, data, isRival) {
    if (!data) return '';
    return '<article class="report-person '+(isRival?'rival':'')+'"><h3>'+esc(who)+' · '+esc(data.title)+'</h3><p>'+esc(data.result)+'</p><div class="receipt"><span>支出 '+money(data.cost)+'</span>'+(num(data.income)?'<span>收入 +'+money(data.income)+'</span>':'')+'<span>知名度 '+signed(data.recognitionDelta)+'</span></div><p class="reason">'+esc(data.reason)+'</p>'+(data.teamNote?'<p class="reason">'+esc(data.teamNote)+'</p>':'')+'</article>';
  }
  function renderRecap() {
    const r = s.recap;
    $('turn-report').hidden = s.phase!=='recap';
    if (s.phase!=='recap' || !r) return;
    $('turn-report').innerHTML = '<span class="report-kicker">DAY '+esc(r.day)+' / 已完成</span><h2 id="report-title">今天的選擇，留下了什麼？</h2><div class="report-grid">'+recapPerson('你',r.player,false)+recapPerson(rivalName(),r.rival,true)+'</div>'+(r.weather?'<div class="weather-note"><strong>'+esc(r.weather.title)+'</strong><br>'+esc(r.weather.text)+'</div>':'')+(Array.isArray(r.callbacks)&&r.callbacks.length?'<ul class="callback-list">'+r.callbacks.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':'')+'<div class="weather-note"><strong>今日民調</strong>　你 '+esc(r.poll.percentages[0])+'% · 對手 '+esc(r.poll.percentages[1])+'% · 未決 '+esc(r.poll.percentages[2])+'%<br>樣本 n='+esc(r.poll.n)+'。這是今天的樣本，不是正式開票。</div><div class="report-bottom"><p>'+(s.day===days?'三天已走完。接著另外計算正式選票。':'下一天開始前，可以先回看資料與尚未交代的承諾。')+'</p><button type="button" class="primary" data-do="next">'+(s.day===days?'進入正式開票':'前往第 '+(s.day+1)+' 天')+' <span aria-hidden="true">→</span></button></div>';
  }
  function renderResult() {
    const r = s.result;
    $('final-report').hidden = s.phase!=='result';
    if (s.phase!=='result' || !r) return;
    const headline = r.winner==='player'?'這一次，你當選了。':r.winner==='rival'?'這一次，對手當選了。':'這一次，雙方平手。';
    const count = v => Array.isArray(v) ? v.length : num(v);
    $('final-report').innerHTML = '<div class="final-banner"><p class="eyebrow">投票日 / 正式開票</p><h2 id="final-title">'+headline+'</h2><p>民調只是途中拍下的照片。這裡才是這一局的正式選票。</p></div><div class="ballots"><div class="ballot '+(r.winner==='player'?'winner':'')+'"><span>'+esc(playerName())+' · 你</span><strong>'+money(r.tally[0])+'<small>票</small></strong></div><div class="ballot '+(r.winner==='rival'?'winner':'')+'"><span>'+esc(rivalName())+'</span><strong>'+money(r.tally[1])+'<small>票</small></strong></div></div><p class="final-meta">虛構選民共 '+money(r.total)+' 位 · 未投票／未選擇任一候選人 '+money(r.abstain)+' 位。選票與每日樣本民調分開計算。</p><div class="final-reflection">'+esc(safeText(r.reflection))+'</div><div class="final-facts"><span>剩餘遊戲現金 '+money(r.cash)+'</span><span>已知資料 '+count(r.knowledge)+' 筆</span><span>尚待交代 '+count(r.pending)+' 件</span></div><div class="button-row"><button type="button" class="primary" data-do="same-seed">同一局，再試一次</button><button type="button" class="secondary" data-do="new-seed">開新局</button></div><p class="fineprint" style="margin-top:12px">「同一局」保留種子與角色標籤，讓你比較不同選擇；「開新局」更換種子。</p>';
  }
  function render() {
    $('intro').hidden = !!s.started; $('game').hidden = !s.started;
    if (!s.started) renderIntro();
    else {
      $('day-heading').textContent = s.phase==='result'?'三天之後，小城投下選票。':s.phase==='recap'?'今天告一段落，看看雙方結果。':'今天，把力氣花在哪裡？';
      $('day-subtitle').textContent = s.phase==='result'?'帶著結果回頭看看，每一天的取捨。':s.phase==='recap'?'你的行動與對手回合已一起結算，不會因重新整理而重抽。':'還有 '+(days-s.day+1)+' 天行動機會。五個行動選一個，確認後才會用掉今天。';
      $('day-value').textContent = s.phase==='result'?'投票日':s.day+' / '+days;
      $('day-note').textContent = s.phase==='result'?'正式選票已計算':s.phase==='recap'?'今天已完成':'每天只選一個行動';
      $('cash-value').innerHTML = money(s.player.cash)+' <small>元</small>';
      $('recognition-value').innerHTML = esc(s.player.recognition)+' <small>/ 100</small>';
      $('poll-card').innerHTML = pollMarkup(s.polls[s.polls.length-1]);
      renderCandidates(); renderActions(); renderRecap(); renderResult();
      $('journey-history').innerHTML = s.journal.length ? s.journal.map(r=>'<section class="journey-day"><h3>第 '+esc(r.day)+' 天</h3><div class="report-grid">'+recapPerson('你',r.player,false)+recapPerson(rivalName(),r.rival,true)+'</div>'+(r.callbacks&&r.callbacks.length?'<ul class="callback-list">'+r.callbacks.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':'')+'</section>').join('') : '<p class="empty-note">完成第一天後，這裡會保留雙方的行動回報。</p>';
      $('poll-history').innerHTML = s.polls.map(p=>'<div><b>'+(p.day>0?'第 '+esc(p.day)+' 天':'開局')+'</b><span>你 '+esc(p.percentages[0])+'% · 對手 '+esc(p.percentages[1])+'% · 未決 '+esc(p.percentages[2])+'%</span></div>').join('');
    }
    $('save-status').textContent = saveAvailable ? '本機自動存檔 · v6' : '無法自動存檔 · 請保持此頁開啟';
  }
  function actionModal(id) {
    if (!s.started || s.phase!=='play') return;
    const action = G.ACTIONS.find(a=>a.id===id);
    if (!action) return;
    activeAction=id; actionConfig={teamTask:'off',mode:'clear'};
    const p = G.preview(s,id,actionConfig);
    const helpPreview = G.preview(s,id,{teamTask:'research',mode:'clear'});
    let config = '';
    if (id==='tv') config += '<fieldset class="config-fieldset"><legend>這次上電視，你要怎麼說？</legend><div class="config-options"><label class="radio-option"><input type="radio" name="tv-mode" value="clear" checked><span><strong>把範圍說清楚</strong><small>引用已有資料；也能承認無法保證，明確撤回先前的保證。</small></span></label><label class="radio-option"><input type="radio" name="tv-mode" value="guarantee"><span><strong>先給一個保證</strong><small>可能短期吸引注意，也會留下之後必須交代的承諾。</small></span></label></div></fieldset>';
    if (p.teamAvailable) config += '<fieldset class="config-fieldset"><legend>隊友這次要協助嗎？</legend><div class="config-options"><label class="radio-option"><input type="radio" name="team-task" value="off" checked><span><strong>不出勤 · 加 0 元</strong><small>這次只進行你選的主要行動。</small></span></label><label class="radio-option"><input type="radio" name="team-task" value="research"><span><strong>協助查資料 · 加 '+money(helpPreview.teamCost)+' 元</strong><small>有限的資料支援，與主要行動同一天結算。</small></span></label><label class="radio-option"><input type="radio" name="team-task" value="canvass"><span><strong>協助拜訪 · 加 '+money(G.preview(s,id,{teamTask:'canvass',mode:'clear'}).teamCost)+' 元</strong><small>有限的接觸支援，與主要行動同一天結算。</small></span></label></div></fieldset>';
    else if (s.player.team) config += '<p class="fineprint">隊友今天剛加入，下一天才可以出勤。</p>';
    const content = '<p class="eyebrow">第 '+s.day+' 天 / 確認前不會扣款或用掉今天</p><p class="modal-description">'+esc(p.description||action.description)+'</p><div class="effect-panel"><div><strong>可能收穫</strong><br><span id="preview-benefit">'+esc(p.benefit||action.benefit)+'</span></div><div class="effect-risk"><strong>代價與風險</strong><br><span id="preview-risk">'+esc(p.risk||action.risk)+'</span></div></div>'+(id==='recruit' && s.day===days?'<p class="warning">今天已是最後一天。現在招募的隊友，無法在投票前再協助任何一天。</p>':'')+config+'<div class="cost-breakdown" aria-live="polite"><div class="cost-line"><span>主要行動</span><span id="base-cost"></span></div><div class="cost-line"><span>隊友協助</span><span id="team-cost"></span></div><div class="cost-line total"><span>這次總共花費</span><span id="total-cost"></span></div><p id="cash-after" class="cost-foot"></p><p id="team-note" class="cost-foot"></p><p id="commit-error" class="cost-error" hidden></p></div><div class="modal-actions"><button type="button" class="secondary" data-do="close">再想一下</button><button type="button" class="primary" id="commit-button" data-do="commit">確認，使用今天 <span aria-hidden="true">→</span></button></div><p class="fineprint" style="margin-top:13px;margin-bottom:0">確認後會一起結算你的行動、對手行動與今日民調。關閉視窗不會發生任何行動。</p>';
    openModal(action.title,content,'action'); updatePreview();
  }
  function updatePreview() {
    if (modalKind!=='action' || !activeAction) return;
    const p = G.preview(s,activeAction,actionConfig), check=can(activeAction,actionConfig);
    $('base-cost').textContent = money(p.baseCost == null ? p.cost : p.baseCost)+' 元';
    $('team-cost').textContent = money(p.teamCost)+' 元';
    $('total-cost').textContent = money(p.totalCost)+' 元 + 1 天';
    $('cash-after').textContent = '目前有 '+money(s.player.cash)+' 元；付款後剩 '+money(s.player.cash-num(p.totalCost))+' 元'+(activeAction==='fundraise'?'。募款收入會在行動結算後入帳。':'。');
    $('team-note').textContent = p.teamNote || '';
    $('preview-benefit').textContent = p.benefit || G.ACTIONS.find(a=>a.id===activeAction).benefit;
    $('preview-risk').textContent = p.risk || G.ACTIONS.find(a=>a.id===activeAction).risk;
    $('commit-error').hidden = check.ok;
    $('commit-error').textContent = check.reason || (num(p.totalCost)>s.player.cash?'遊戲現金不足，請換一個行動或讓隊友不出勤。':'目前無法確認這個行動。');
    $('commit-button').disabled = !check.ok || busy;
  }
  function commit() {
    if (busy || modalKind!=='action' || s.phase!=='play') return;
    const id=activeAction, config={...actionConfig};
    G.preview(s,id,config);
    if (!can(id,config).ok) { updatePreview(); return; }
    busy=true; $('commit-button').disabled=true;
    try {
      const draft=clone(s); G.play(draft,id,config);
      if (draft.phase!=='recap') throw new Error('Turn did not resolve');
      s=draft; save(); closeModal(false); render(); focusSection('turn-report');
    } catch (_) { notify('這次行動沒有完成，也沒有存入新結果。請再試一次。'); }
    finally { busy=false; if(modalKind==='action') updatePreview(); }
  }
  function next() {
    if (busy || s.phase!=='recap') return;
    busy=true;
    try { const draft=clone(s); G.next(draft); s=draft; save(); render(); focusSection(s.phase==='result'?'final-report':'main'); }
    catch (_) { notify('下一天尚未開始，請再試一次。'); }
    finally { busy=false; }
  }
  function resetModal() {
    openModal('要從哪裡重新開始？','<p>會替換這個三日版存檔。舊版小城的存檔不受影響。</p><div class="facts-list"><div class="fact"><h3>同一局，再試一次</h3><p>使用相同種子與「'+esc(partyName(s.player.party))+'」標籤。相同決定可重現，適合比較不同選擇。</p></div><div class="fact"><h3>開新局</h3><p>更換種子，回到開始畫面重新選擇角色標籤。</p></div></div><div class="button-row" style="margin-top:20px"><button type="button" class="primary" data-do="same-seed">同一局，再試一次</button><button type="button" class="secondary" data-do="new-seed">開新局</button></div><button type="button" class="text-button wide" data-do="close">保留目前進度</button>','reset');
  }
  function restart(same) {
    if (busy) return;
    const currentSeed=s.seed, currentParty=s.player.party;
    let nextSeed=same?currentSeed:seed();
    if(!same && nextSeed===currentSeed)nextSeed=(nextSeed+1)>>>0;
    s=G.initial(nextSeed,currentParty);
    if (same) G.start(s);
    loadNote=''; save(); closeModal(false); render(); focusSection('main');
    notify(same?'已用相同種子與角色標籤重新開始。':'新局已準備好，選好標籤再開始。');
  }
  function factsModal() {
    const facts = G.FACTS.filter(f=>s.player.known.includes(f.id));
    openModal('你目前知道的事','<p>這些是這一局已取得的虛構資料。資料需要透過行動取得，打開視窗不會增加。</p>'+(facts.length?'<div class="facts-list">'+facts.map(f=>'<article class="fact"><h3>'+esc(f.title)+'</h3><p>'+esc(f.text)+'</p></article>').join('')+'</div>':'<p class="warning">目前還沒有取得資料。「準備」或隊友的資料支援，可以讓你進一步了解小城。</p>')+'<button type="button" class="secondary wide" data-do="close" style="margin-top:20px">回到小城</button>','facts');
  }
  function helpModal() {
    openModal('三天，這樣玩。','<p>你與一位整體較弱的新手對手，在虛構小城裡各做三天決定。</p><ol class="help-steps"><li><strong>每天五選一。</strong>每個行動都使用一天，費用在確認前顯示。募款不需預付，但也會用掉一天。</li><li><strong>對手接著行動。</strong>雙方採用相同規則；每天一起結算。回報會說明各自做了什麼、改變了什麼。</li><li><strong>看看每日民調。</strong>每天有固定樣本的估計，未決者不會自動全算給你。重新整理不重抽。</li><li><strong>最後另算選票。</strong>第三天回報後，按「進入正式開票」。知名度、民調與選票是不同數字。</li></ol><div class="effect-panel"><div><strong>關於隊友</strong><br>招募當天不協助，下一天起才可在每個確認視窗選任務。預設不出勤；選擇協助會另收費，總額在出發前列清楚。</div><div><strong>關於承諾</strong><br>電視行動可選說明範圍或給保證。保證可能留下待交代的事情，可從左側狀態確認。</div></div><p class="fineprint">角色標籤只有名稱不同，規則與起始條件對稱。這是虛構遊戲，不是現實政治模型或競選建議。進度存在目前瀏覽器，v6 與舊版分開。</p><a href="legacy-v5/index.html">繼續舊版小城 ↗</a><button type="button" class="primary wide" data-do="close" style="margin-top:18px">知道了</button>','help');
  }
  document.addEventListener('click',event=>{
    const button=event.target.closest('button');
    if (!button || button.disabled) return;
    if (button.dataset.action) { actionModal(button.dataset.action); return; }
    switch(button.dataset.do) {
      case 'start': if(!s.started){G.start(s); loadNote=''; save(); render(); focusSection('main');} break;
      case 'help': helpModal(); break;
      case 'reset': resetModal(); break;
      case 'facts': factsModal(); break;
      case 'close': closeModal(); break;
      case 'commit': commit(); break;
      case 'next': next(); break;
      case 'same-seed': restart(true); break;
      case 'new-seed': restart(false); break;
    }
  });
  document.addEventListener('change',event=>{
    const input=event.target;
    if (input.name==='party' && !s.started && G.PARTIES[input.value]) { s=G.initial(s.seed,input.value); if(!loadNote) save(); }
    if (modalKind==='action') {
      if(input.name==='team-task' && ['off','research','canvass'].includes(input.value)) actionConfig.teamTask=input.value;
      if(input.name==='tv-mode' && ['clear','guarantee'].includes(input.value)) actionConfig.mode=input.value;
      updatePreview();
    }
  });
  $('modal-overlay').addEventListener('click',event=>{if(event.target===$('modal-overlay'))closeModal();});
  document.addEventListener('keydown',event=>{
    if($('modal-overlay').hidden)return;
    if(event.key==='Escape'){event.preventDefault();closeModal();return;}
    if(event.key==='Tab'){
      const items=Array.from($('modal').querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),[tabindex="0"]')).filter(el=>!el.hidden && el.getClientRects().length);
      if(!items.length){event.preventDefault();$('modal').focus();return;}
      const first=items[0],last=items[items.length-1];
      if(event.shiftKey && (document.activeElement===first || document.activeElement===$('modal'))){event.preventDefault();last.focus();}
      else if(!event.shiftKey && (document.activeElement===last || document.activeElement===$('modal'))){event.preventDefault();first.focus();}
    }
  });
  s=load(); render(); if(!loadNote)save();
})();
