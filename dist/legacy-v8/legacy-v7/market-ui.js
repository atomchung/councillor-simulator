/* Market-day controller. Engine state is committed before any visual flourish. */
(function () {
  'use strict';
  const G = window.MarketGame, Art = window.MarketArt;
  const $ = id => document.getElementById(id);
  const KEY = 'wenshan-market-v7';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = amount => Number(amount || 0).toLocaleString('zh-TW') + ' 元';
  const wan = amount => (Number(amount || 0) / 10000).toLocaleString('zh-TW', { maximumFractionDigits: 2 }) + ' 萬';
  const reduced = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  const places = {
    desk: { title: '資料桌', subtitle: '讀資料・準備回答', labelY: 282 },
    access: { title: '蔬菜攤・美姐', subtitle: '通道與卸貨', labelY: 240 },
    drain: { title: '雜貨攤・阿仁', subtitle: '雨天積水', labelY: 240 },
    exit: { title: '市場出口', subtitle: '結束今天・看紀錄', labelY: 615 }
  };
  const fallbackAnchors = { desk: { x: 150, y: 430 }, access: { x: 430, y: 430 }, drain: { x: 740, y: 430 }, exit: { x: 900, y: 535 }, player: { x: 120, y: 535 } };
  const anchors = Art?.anchors || fallbackAnchors;
  let state, selectedTopic = 'access', selectedPlace = 'desk', modal = null, lastFocus = null;
  let position = { ...anchors.player }, travel = null, animation = null, held = new Set(), lastFrame = null, raf = null, inputTimer = null, inputEpoch = 0;
  let error = '', saveError = '', activeCommit = false;
  const seed = () => {
    if (window.crypto?.getRandomValues) return window.crypto.getRandomValues(new Uint32Array(1))[0];
    return (Date.now() ^ Math.floor(Math.random() * 4294967296)) >>> 0;
  };
  if (!G) {
    $('panel').innerHTML = '<div class="panel-content"><h2>遊戲尚未載入</h2><p>遊戲程式沒有成功載入。請重新整理；原有版本的存檔不會被覆蓋。</p><a href="legacy-v6/index.html">開啟保留的 v6</a></div>';
    return;
  }
  function validSaved(s) {
    return s && s.version === G.VERSION && Array.isArray(s.known) && Array.isArray(s.journal) && Array.isArray(s.choices) && Array.isArray(s.promises) && Array.isArray(s.polls) && Array.isArray(s.voters) && s.voters.length === G.POPULATION && s.budget && s.player && s.rival && s.visits && Number.isFinite(s.timeLeft) && s.timeLeft >= 0 && s.timeLeft <= 4 && ['roam', 'question', 'followup', 'reaction', 'report'].includes(s.phase) && (!['question', 'followup'].includes(s.phase) || !!G.TOPICS[s.pending?.topic]);
  }
  try {
    const raw = window.localStorage.getItem(KEY), parsed = raw ? JSON.parse(raw) : null;
    if (validSaved(parsed)) {
      state = parsed;
      if (parsed._ui && Number.isFinite(parsed._ui.x) && Number.isFinite(parsed._ui.y)) position = { x: clamp(parsed._ui.x, 90, 920), y: clamp(parsed._ui.y, 390, 555) };
      else position = { ...(anchors[parsed.location] || anchors.player) };
      selectedTopic = G.TOPICS[parsed._ui?.topic] ? parsed._ui.topic : 'access';
      selectedPlace = places[parsed.location] ? parsed.location : 'desk';
    } else {
      state = G.initial(seed());
      if (raw) saveError = '這份市場日存檔無法讀取，已開啟新局；v6 與更早版本的存檔未變更。';
    }
  } catch (_) {
    state = G.initial(seed());
    saveError = '目前無法讀取本機存檔。仍可遊玩，但請勿依賴重新整理後續玩。';
  }
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
  function save() {
    state._ui = { x: position.x, y: position.y, topic: selectedTopic };
    try { window.localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (_) { saveError = '瀏覽器無法儲存進度。這一頁仍可繼續玩，關閉或重新整理可能會失去進度。'; }
    $('save-warning').hidden = !saveError;
    $('save-warning').textContent = saveError;
  }
  function announce(text) { $('announcer').textContent = text; }
  function movable() { return state.started && state.phase === 'roam' && !modal; }
  function clearHeld() {
    held.clear(); inputEpoch++;
    if (inputTimer) window.clearTimeout(inputTimer);
    inputTimer = null;
    $('player').classList.remove('walking');
  }
  function stopTravel() { travel = null; $('destination-marker').hidden = true; updateSkip(); }
  function stopMovement() { clearHeld(); stopTravel(); }
  function updatePosition(moving = false) {
    $('player').style.left = position.x / 10 + '%';
    $('player').style.top = position.y / 6.5 + '%';
    $('player').classList.toggle('walking', !!moving && !reduced.matches);
    $('player').style.zIndex = String(Math.round(position.y));
  }
  function renderWorld() {
    $('scene').innerHTML = Art ? Art.scene() : '<p class="blank-scene">市場圖像未能載入。地點按鈕與鍵盤仍可操作。</p>';
    $('player').innerHTML = Art ? Art.avatar('player') : '<span class="fallback-person">阿夏</span>';
    // The art scene already contains three adult stallholders. Only the rival is added here.
    $('world-people').innerHTML = Art ? '<div class="actor rival" style="left:58%;top:80%;width:7%;z-index:510">' + Art.avatar('rival') + '<span class="actor-name">周沐・另一位候選人</span></div>' : '';
    $('world-labels').innerHTML = Object.entries(places).map(([id, p]) => '<button class="place-label" data-place="' + id + '" style="left:' + anchors[id].x / 10 + '%;top:' + p.labelY / 6.5 + '%"><b>' + p.title + '</b><span>' + p.subtitle + '</span></button>').join('');
    updatePosition();
  }
  function updateHeader() {
    $('time-left').textContent = String(state.timeLeft);
    $('time-slots').innerHTML = Array.from({ length: 4 }, (_, i) => '<i class="' + (i >= state.timeLeft ? 'used' : '') + '"></i>').join('');
    $('campaign-budget').textContent = wan(state.budget.committed);
    $('deposit').textContent = wan(state.budget.deposit);
    $('available').textContent = wan(state.budget.available);
    $('spent').textContent = '今日支出 ' + money(state.budget.spent);
    $('journal-count').textContent = String(state.journal.length + state.choices.length);
    $('location-label').textContent = places[selectedPlace]?.title || '市場街區';
    $('knowledge-summary').innerHTML = state.known.length ? state.known.map(t => '<span class="knowledge-tag">' + escape(G.TOPICS[t]?.title) + '</span>').join('') : '還沒讀過資料';
    $('finish-day').disabled = !state.started || !['roam', 'report'].includes(state.phase);
    $('finish-day').textContent = state.phase === 'report' ? '重看今天的紀錄 ↗' : state.timeLeft ? '提早結束這一天 ↗' : '四個時段已用完，回顧今天 ↗';
    const news = state.rival.news;
    $('rival-news').innerHTML = '<span class="news-tag">街角消息</span><p>' + (news ? '<strong>' + escape(news.title) + '</strong> ' + escape(news.text) + (news.quote ? '<br>他引用：「' + escape(news.quote) + '」' : '') + (news.response ? '<br><strong>後續：</strong>' + escape(news.response) : '') : '其他候選人也在走市場。你的每句回答，都可能被記住。') + '</p>';
    $('save-warning').hidden = !saveError; $('save-warning').textContent = saveError;
    for (const el of document.querySelectorAll('[data-place]')) {
      el.classList.toggle('selected', el.dataset.place === selectedPlace);
      el.disabled = !state.started || state.phase !== 'roam' || !!modal;
    }
    for (const el of document.querySelectorAll('[data-direction]')) el.disabled = !movable();
  }
  function panel(kicker, phase, contents) {
    return '<div class="panel-kicker"><span>' + kicker + '</span><span class="phase-label">' + phase + '</span></div><div class="panel-content">' + (error ? '<div class="error-message" role="alert">' + escape(error) + '</div>' : '') + contents + '</div>';
  }
  function costPreview(p) {
    return '<div class="cost-strip"><span>時間 <b>−' + p.time + ' 時段</b></span><span>現金 <b>−' + money(p.cost) + '</b></span></div><p class="microcopy">本項行動費用為遊戲設定。按下確認才會扣除。</p>';
  }
  function factsMarkup(facts) {
    return (facts || []).map(f => '<div class="fact"><strong>' + escape(f.title) + '</strong><p>' + escape(f.text) + '</p></div>').join('');
  }
  function startPanel() {
    return panel('第一天・市場早晨', '四時段短篇', '<div class="intro-badge" aria-hidden="true">早</div><h2>你是阿夏，<br>今天第一次來拜票。</h2><p class="lead">攤商想知道的，是你打算怎麼做。先花時間查資料，還是直接走進人群？</p><ol class="flow-steps"><li><span>01</span>到資料桌，準備一個議題</li><li><span>02</span>走到攤位，聽對方真正的問題</li><li><span>03</span>自己選回答，面對追問和反應</li></ol><button class="primary-button" data-action="start">開始市場的一天 →</button><p class="microcopy">約 5–10 分鐘。只有四個行動時段；移動免費。這次體驗不會產生選舉勝負。</p>');
  }
  function deskPanel() {
    const topic = G.TOPICS[selectedTopic], known = state.known.includes(selectedTopic), p = G.preview(state, 'prepare', selectedTopic), atDesk = Math.hypot(position.x - anchors.desk.x, position.y - anchors.desk.y) <= 86;
    return panel('01 / 資料桌', '先準備，再回答', '<h2>帶著依據，<br>再走進人群。</h2><p>兩個議題都有人在意。今天的時間有限，你先查哪一份？</p><div class="topic-picks">' + Object.entries(G.TOPICS).map(([id, t]) => '<button class="topic-pick ' + (id === selectedTopic ? 'selected' : '') + '" data-action="topic" data-topic="' + id + '"><b>' + escape(t.title) + '</b><span>' + (state.known.includes(id) ? '已準備・可重看' : '未準備・3 則關鍵資料') + '</span></button>').join('') + '</div><div class="dossier-preview"><h3>' + escape(topic.title) + '</h3><ul>' + topic.facts.map(f => '<li>' + escape(f.title) + '</li>').join('') + '</ul></div>' + (known ? '<p>你已讀完這份資料。對話中的兩種具體方案已解鎖，但每種都有代價。</p><button class="primary-button" data-place="' + selectedTopic + '">走到' + escape(topic.npc.name) + '的攤位 →</button><button class="secondary-button" data-action="dossier" data-topic="' + selectedTopic + '">重看這份資料（免費）</button>' : costPreview(p) + (atDesk ? '<button class="primary-button" data-action="commit" data-kind="prepare" data-topic="' + selectedTopic + '" ' + (!p.allowed ? 'disabled' : '') + '>花 1 時段，讀完資料 →</button>' : '<button class="primary-button" data-place="desk">先走到資料桌 →</button>') + (!p.allowed ? '<p class="microcopy">' + escape(p.reason) + '</p>' : '')) + '<p class="microcopy">看過資料會增加可選的回答；不會直接換成固定票數。</p>' + (!state.timeLeft ? '<button class="secondary-button" data-action="finish">回顧這一天</button>' : ''));
  }
  function visitPanel(topicId) {
    const topic = G.TOPICS[topicId], p = G.preview(state, 'visit', topicId), known = state.known.includes(topicId), revisit = state.visits[topicId] > 0;
    return panel((topicId === 'access' ? '02' : '03') + ' / ' + escape(places[topicId].title), known ? '資料已準備' : '資料未準備', '<div class="speaker"><div class="speaker-avatar">' + (Art ? Art.avatar(topicId === 'access' ? 'shop' : 'resident') : '') + '</div><div><strong>' + escape(topic.npc.name) + '</strong><small>' + escape(topic.npc.role) + '</small></div></div><h2>' + (revisit ? '還記得上次的約定嗎？' : topicId === 'access' ? '「入口好走，<br>那貨要怎麼搬？」' : '「雨一下，<br>這裡又淹了。」') + '</h2><p>' + (known ? '你讀過相關資料，能談具體做法、限制和代價。仍然要由你選擇怎麼回答。' : '你還沒有讀這個議題的資料。可以坦白說明，也可以直接回答；沒有依據的保證可能被追問。') + '</p>' + costPreview(p) + '<button class="primary-button" data-action="commit" data-kind="visit" data-topic="' + topicId + '" ' + (!p.allowed ? 'disabled' : '') + '>' + (revisit ? '花 1 時段，回來交代' : '花 1 時段，開始拜訪') + ' →</button>' + (!p.allowed ? '<p class="microcopy">' + escape(p.reason) + '</p>' : '') + '<p class="no-cost">拜訪內的提問與追問，不再另扣時段或現金。</p>' + (!known && state.timeLeft > 0 ? '<button class="secondary-button" data-place="desk">先回資料桌準備</button>' : known ? '<button class="secondary-button" data-action="dossier" data-topic="' + topicId + '">重看資料（免費）</button>' : '') + (!state.timeLeft ? '<button class="secondary-button" data-action="finish">回顧這一天</button>' : ''));
  }
  function questionPanel() {
    const q = G.question(state);
    if (!q) return panel('對話未能載入', '進度已保留', '<h2>這段對話需要重新載入。</h2><p>請重新整理頁面，恢復已儲存的進度。</p>');
    return panel(state.phase === 'followup' ? '追問 / 原話仍在' : '拜訪 / 請你回答', '不再扣時段', '<div class="speaker"><div class="speaker-avatar">' + (Art ? Art.avatar(state.phase === 'followup' && state.pending.initial?.id === 'guarantee' ? 'rival' : state.pending.topic === 'access' ? 'shop' : 'resident') : '') + '</div><div><strong>' + escape(q.speaker) + '</strong><small>' + (state.phase === 'followup' ? '對方正在等一個有依據的說明' : '停下腳步，先把問題聽完') + '</small></div></div>' + (q.quote ? '<div class="result-quote"><small>你先前的原話</small><br>「' + escape(q.quote) + '」</div>' : '') + '<div class="question-quote">' + escape(q.text) + '</div><div class="answer-options">' + q.options.map((o, i) => '<button class="answer-option" data-answer="' + escape(o.id) + '" ' + (!o.unlocked ? 'disabled aria-disabled="true"' : '') + '><span class="answer-number">' + (!o.unlocked ? '尚未解鎖' : '回答 ' + String(i + 1).padStart(2, '0')) + '</span>' + escape(o.text) + '<small>' + escape(o.detail) + '</small>' + (!o.unlocked ? '<small>' + escape(o.whyLocked) + '</small>' : ['window', 'alternate', 'maintenance', 'survey', 'evidence'].includes(o.id) ? '<span class="unlock">已讀資料解鎖</span>' : '') + '</button>').join('') + '</div><p class="microcopy">選擇後會立即記錄原句與後續回應。沒有自動代選。</p>');
  }
  function reactionPanel() {
    const r = state.reaction || { title: '這段互動已記錄', body: '', lines: [], facts: [] };
    return panel(r.npc ? '現場回應 / 結果已記錄' : '資料桌 / 準備完成', '已儲存', '<h2>' + escape(r.title) + '</h2>' + (r.quote ? '<div class="result-quote"><small>你的原話</small><br>「' + escape(r.quote) + '」</div>' : '') + '<p class="lead">' + escape(r.body) + '</p>' + factsMarkup(r.facts) + (r.lines?.length ? '<ul class="consequence-list">' + r.lines.map(line => '<li>' + escape(line) + '</li>').join('') + '</ul>' : '') + '<button class="primary-button" data-action="continue">' + (state.timeLeft ? '記下來，繼續走 →' : '四個時段用完了，準備收尾 →') + '</button><button class="text-button" data-action="journal">查看完整原話與承諾紀錄</button>');
  }
  function exitPanel() {
    return panel('04 / 市場出口', '一天，不是一場選舉', '<h2>走了一圈，<br>留下了什麼？</h2><p>今天還有 ' + state.timeLeft + ' 個時段。你可以繼續逛，也可以收尾，回看說過的話、待交代的約定與剩餘預算。</p><button class="primary-button" data-action="finish">回顧這一天 →</button><button class="secondary-button" data-place="desk">再去資料桌看看</button><p class="microcopy">日終只有一次虛構全選區抽樣。這不是開票，也不會判定當選。</p>');
  }
  function promiseMarkup(items) {
    const statusText = { pending: '待回覆', unresolved: '待說明', kept: '已回覆', corrected: '已更正・原話保留' };
    return items.length ? items.map(p => '<div class="fact"><strong>' + escape(statusText[p.status] || p.status) + '・' + escape(G.TOPICS[p.topic]?.title || '') + '</strong><p>「' + escape(p.text) + '」</p><p class="microcopy">' + '對象：' + escape(p.recipient || G.TOPICS[p.topic]?.npc.name || '未記名') + ' · 期限：' + escape(p.due || '') + '</p></div>').join('') : '<p>沒有尚待說明的承諾。</p>';
  }
  function reportPanel() {
    const r = state.report;
    if (!r) return panel('日終', '紀錄', '<h2>今天已收尾</h2><button class="primary-button" data-action="journal">查看紀錄</button>');
    return panel('市場收尾 / 今日紀錄', '未進行正式開票', '<h2>市場的一天，<br>先到這裡。</h2><div class="report-summary"><div>完整競選可用現金<strong>' + wan(state.budget.available) + '</strong></div><div>今日行動支出<strong>' + money(state.budget.spent) + '</strong></div></div><p>' + escape(r.reflection) + '</p><h3>還需要交代</h3>' + promiseMarkup(r.unresolved || []) + '<button class="primary-button" data-action="report">看日終完整回顧 →</button><button class="secondary-button" data-action="journal">重看回答原句與資料</button><button class="text-button" data-action="restart">用同一情境重玩，試試不同回答</button>');
  }
  function render() {
    const speakingRole = ['question', 'followup'].includes(state.phase) ? (state.phase === 'followup' && state.pending?.initial?.id === 'guarantee' ? 'rival' : state.pending?.topic === 'access' ? 'shop' : 'resident') : state.phase === 'reaction' && state.reaction?.npc ? (state.location === 'access' ? 'shop' : 'resident') : '';
    $('world').dataset.speaker = speakingRole;
    updateHeader();
    const contents = !state.started ? startPanel() : state.phase === 'question' || state.phase === 'followup' ? questionPanel() : state.phase === 'reaction' ? reactionPanel() : state.phase === 'report' ? reportPanel() : selectedPlace === 'desk' ? deskPanel() : selectedPlace === 'exit' ? exitPanel() : visitPanel(selectedPlace);
    $('panel').innerHTML = contents;
    updateSkip();
  }
  function focusInteraction() { $('interaction').focus({ preventScroll: true }); }
  function pulse() {
    if (animation) window.clearTimeout(animation);
    animation = null;
    if (reduced.matches) return;
    $('player').classList.add('talking'); $('world').classList.add('performing');
    animation = window.setTimeout(() => { animation = null; $('panel').classList.remove('motion-flash'); $('player').classList.remove('talking'); $('world').classList.remove('performing'); updateSkip(); }, 900);
    $('panel').classList.add('motion-flash'); updateSkip();
  }
  function updateSkip() {
    $('skip-animation').hidden = !travel && !animation;
    $('skip-animation').textContent = travel ? '略過移動' : '略過演出';
  }
  function skip() {
    if (travel) arrive();
    if (animation) { window.clearTimeout(animation); animation = null; $('panel').classList.remove('motion-flash'); $('player').classList.remove('talking'); $('world').classList.remove('performing'); }
    updateSkip();
  }
  function arrive() {
    if (!travel) return;
    const target = travel; position = { ...anchors[target.id] };
    stopTravel(); clearHeld(); selectedPlace = target.id; state.location = target.id;
    if (G.TOPICS[target.id]) selectedTopic = target.id;
    updatePosition(); save(); render();
    $('walk-status').textContent = '已到' + places[target.id].title + '。在互動欄確認行動才會扣資源。';
    announce('已到' + places[target.id].title + '。只移動，沒有花費時段或現金。');
    focusInteraction();
  }
  function go(id) {
    if (!movable() || !places[id]) return false;
    clearHeld(); error = '';
    travel = { id };
    $('destination-marker').hidden = false;
    $('destination-marker').style.left = anchors[id].x / 10 + '%';
    $('destination-marker').style.top = anchors[id].y / 6.5 + '%';
    $('walk-status').textContent = '正走向' + places[id].title + '…移動不花時段';
    $('world').focus({ preventScroll: true });
    updateSkip();
    if (reduced.matches || Math.hypot(position.x - anchors[id].x, position.y - anchors[id].y) < 3) arrive();
    return true;
  }
  function nearest() {
    let found = null, distance = 86;
    for (const [id, a] of Object.entries(anchors)) if (places[id]) {
      const d = Math.hypot(position.x - a.x, position.y - a.y);
      if (d < distance) { distance = d; found = id; }
    }
    return found;
  }
  function interact() {
    if (!movable()) return;
    const id = nearest();
    if (!id) { $('walk-status').textContent = '再靠近一個地點，按 E / Enter 互動。'; announce('附近沒有可互動地點。點地點標籤可以自動走過去。'); return; }
    stopMovement(); selectedPlace = id; state.location = id;
    if (G.TOPICS[id]) selectedTopic = id;
    save(); render(); focusInteraction();
    $('walk-status').textContent = '正在查看' + places[id].title + '。確認後才會扣資源。';
  }
  function tick(dt) {
    if (!movable()) { clearHeld(); return; }
    dt = clamp(dt, 0, 0.08);
    let dx = 0, dy = 0, moving = false;
    if (held.size) {
      dx = (held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0);
      dy = (held.has('down') ? 1 : 0) - (held.has('up') ? 1 : 0);
      const n = Math.hypot(dx, dy) || 1; dx = dx / n * 230 * dt; dy = dy / n * 230 * dt;
    } else if (travel) {
      const a = anchors[travel.id], x = a.x - position.x, y = a.y - position.y, d = Math.hypot(x, y), step = 250 * dt;
      if (d <= step) { arrive(); return; }
      dx = x / d * step; dy = y / d * step;
    }
    if (dx || dy) {
      const old = { ...position };
      position.x = clamp(position.x + dx, 90, 920); position.y = clamp(position.y + dy, 390, 555);
      moving = old.x !== position.x || old.y !== position.y;
      if (dx) $('world').dataset.direction = dx < 0 ? 'left' : 'right';
      if (!travel && moving) {
        for (const el of document.querySelectorAll('.place-label')) el.classList.toggle('nearby', el.dataset.place === nearest());
      }
      if (!travel && moving) $('walk-status').textContent = nearest() ? '附近有互動地點。按 E / Enter 查看，不會自動花費。' : '自由走動中・點地點或靠近後按 E / Enter';
    }
    updatePosition(moving);
  }
  function frame(time) {
    tick(lastFrame == null ? 0 : (time - lastFrame) / 1000); lastFrame = time;
    raf = window.requestAnimationFrame(frame);
  }
  function commit(kind, topic) {
    if (activeCommit || !movable()) return;
    const requiredPlace = kind === 'prepare' ? 'desk' : topic;
    if (selectedPlace !== requiredPlace || Math.hypot(position.x - anchors[requiredPlace]?.x, position.y - anchors[requiredPlace]?.y) > 86) {
      error = '先走到這個地點，再確認行動。'; render(); return;
    }
    const p = G.preview(state, kind, topic);
    if (!p.allowed) { error = p.reason; render(); return; }
    activeCommit = true; stopMovement();
    const outcome = kind === 'prepare' ? G.prepare(state, topic) : G.visit(state, topic);
    if (outcome) {
      // Persist synchronously before CSS/timers: reload and skip cannot repeat a charge.
      error = ''; save(); render(); pulse(); focusInteraction(); announce(kind === 'prepare' ? '資料準備完成，具體回答已解鎖。' : '拜訪開始，請選擇自己的回答。');
    }
    activeCommit = false;
  }
  function answer(id) {
    if (modal || activeCommit || !['question', 'followup'].includes(state.phase)) return;
    const option = G.question(state)?.options.find(o => o.id === id);
    if (!option?.unlocked) return;
    activeCommit = true; clearHeld();
    if (G.answer(state, id)) { save(); error = ''; render(); pulse(); focusInteraction(); announce(state.phase === 'followup' ? '對方追問了。你的原話已記錄。' : '回答與現場反應已記錄。'); }
    activeCommit = false;
  }
  function budgetMarkup() {
    return '<p>這是整個競選的預算起點，今天只使用其中一小部分。金額均為新臺幣。</p><div class="budget-grid"><div class="budget-row"><span>完整競選預算</span><strong>' + money(state.budget.committed) + '</strong></div><div class="budget-row"><span>自備競選款</span><strong>' + money(state.budget.personalContribution) + '</strong></div><div class="budget-row"><span>政治獻金收入（本段未開放）</span><strong>' + money(state.budget.donations) + '</strong></div><div class="budget-row"><span>登記保證金・已鎖定</span><strong>−' + money(state.budget.deposit) + '</strong></div><div class="budget-row"><span>今日行動費用・遊戲設定</span><strong>−' + money(state.budget.spent) + '</strong></div><div class="budget-row total"><span>可用現金</span><strong>' + money(state.budget.available) + '</strong></div></div><p>準備一份資料 1,000 元、拜訪或回訪一次 2,000 元，均為本遊戲的情境費用；走路與重看資料免費。</p><p>保證金參考<a href="' + escape(G.RULES.depositSource) + '" target="_blank" rel="noopener noreferrer">' + escape(G.RULES.depositSourceTitle || '中選會公告') + '</a>。已鎖定的 16 萬元不能拿來支付今天的行動。</p><p class="microcopy">完整競選預算／這只是市場一天，未進行正式開票；補貼與保證金返還未計入可用現金。沒有把未收到的補貼當收入。</p>';
  }
  function pollMarkup() {
    const names = [state.player.name + '（你）', state.rival.name, '其他 17 位候選人', '尚未表態'];
    return '<p>虛構的全選區背景抽樣，不是攤位好感度，也不是兩人對決。兩次調查之間不會因打開視窗而重新抽樣。</p>' + (state.polls.length ? state.polls.map(p => '<div class="poll-card"><h3>' + escape(p.label) + '</h3>' + p.percentages.map((pct, i) => '<div class="poll-row"><span>' + escape(names[i]) + '</span><div class="poll-track"><div class="poll-fill" style="width:' + clamp(Number(pct) || 0, 0, 100) + '%"></div></div><span class="poll-number">' + Number(pct).toLocaleString('zh-TW', { maximumFractionDigits: 2 }) + '%</span></div>').join('') + '<p class="microcopy">虛構樣本 n = ' + escape(p.n) + '；百分比可能有四捨五入差異。</p></div>').join('') : '<p class="journal-empty">開始遊戲後，才會建立出發前的抽樣。</p>') + '<p class="microcopy">單一市場拜訪只觸及少數人。抽樣變動不能直接等同於你今天多得到或失去的實際選票；此處沒有真正選民資料。</p>';
  }
  function journalMarkup() {
    const statuses = G.status(state);
    return '<p>回答原句、補充說明與更正會並列保留。讀過的資料可以免費重看。</p><h3>目前狀態</h3><ul class="report-facts">' + statuses.map(s => '<li>' + escape(s) + '</li>').join('') + '</ul><h3>對話原句</h3>' + (state.choices.length ? state.choices.map((c, i) => '<article class="journal-entry"><span class="entry-number">' + String(i + 1).padStart(2, '0') + ' / ' + (c.stage === 'followup' ? '追問後回答' : '初次回答') + '</span><h3>' + escape(G.TOPICS[c.topic]?.title) + '</h3><div class="journal-quote">「' + escape(c.text) + '」</div><p>' + escape(c.detail) + '</p></article>').join('') : '<p>還沒有回答過問題。</p>') + '<h3>約定與保留的說法</h3>' + promiseMarkup(state.promises) + '<h3>今天的行動</h3>' + (state.journal.length ? state.journal.map((j, i) => '<article class="journal-entry"><span class="entry-number">行動 ' + String(i + 1).padStart(2, '0') + '</span><h3>' + escape(j.title) + '</h3><p>' + escape(j.text) + '</p>' + (j.quote ? '<div class="journal-quote">你說：「' + escape(j.quote) + '」</div>' : '') + (j.lines?.length ? '<ul class="report-facts">' + j.lines.map(l => '<li>' + escape(l) + '</li>').join('') + '</ul>' : '') + '<span class="journal-meta">' + j.time + ' 時段・' + money(j.cost) + '</span></article>').join('') : '<p>還沒花費任何行動時段。</p>') + '<h3>已讀資料</h3>' + (state.known.length ? state.known.map(t => '<h3>' + escape(G.TOPICS[t].title) + '</h3>' + factsMarkup(G.TOPICS[t].facts)).join('') : '<p>先到資料桌準備，這裡就會留下完整資料。</p>');
  }
  function fullReportMarkup() {
    const r = state.report;
    return r ? '<p class="lead">' + escape(r.reflection) + '</p><h3>今天帶走的依據</h3>' + (r.facts.length ? '<ul class="report-facts">' + r.facts.map(f => '<li>' + escape(f) + '</li>').join('') + '</ul>' : '<p>這次沒有先查資料。</p>') + '<h3>還待交代</h3>' + promiseMarkup(r.unresolved || []) + (r.rival ? '<h3>' + escape(r.rival.title) + '</h3><p>' + escape(r.rival.text) + '</p>' + (r.rival.quote ? '<div class="journal-quote">他引用你的原話：「' + escape(r.rival.quote) + '」</div><p>' + escape(r.rival.evidence) + '</p>' : '') + (r.rival.response ? '<p><strong>後續：</strong>' + escape(r.rival.response) + '</p>' : '') + '<p class="microcopy">對手本次行動也用了 ' + r.rival.time + ' 時段與 ' + money(r.rival.cost) + '。</p>' : '') + '<h3>完整競選預算仍在繼續</h3>' + budgetMarkup() + '<h3>兩次虛構抽樣</h3>' + pollMarkup() + '<button class="secondary-button" data-action="journal">查看原句與完整行動紀錄</button>' : '<p>今天還沒有收尾。</p>';
  }
  function openDialog(type, extra) {
    clearHeld(); stopTravel(); save();
    if (!modal) lastFocus = document.activeElement;
    modal = { type, extra };
    let title = '', body = '';
    if (type === 'budget') { title = '100 萬，是完整競選的預算'; body = budgetMarkup(); }
    if (type === 'poll') { title = '虛構全選區民調'; body = pollMarkup(); }
    if (type === 'journal') { title = '阿夏的隨身筆記'; body = journalMarkup(); }
    if (type === 'dossier') { title = G.TOPICS[extra]?.title || '資料'; body = state.known.includes(extra) ? factsMarkup(G.TOPICS[extra].facts) + '<p class="microcopy">重看不花時間，也不扣款。</p>' : '<p>這份資料尚未準備。請先到資料桌，確認花費一個時段讀完。</p>'; }
    if (type === 'report') { title = '市場日・完整回顧'; body = fullReportMarkup(); }
    if (type === 'finish') {
      title = state.timeLeft ? '要在這裡結束今天嗎？' : '四個時段，走到這裡';
      body = '<p>' + (state.timeLeft ? '你還有 ' + state.timeLeft + ' 個時段可用。現在收尾，今天的市場行程就結束了。' : '今天沒有剩餘行動時段。現在可以整理回答、約定與預算。') + '</p>' + (state.promises.some(p => ['pending', 'unresolved'].includes(p.status)) ? '<p>還有約定或說法待交代，會保留在日終紀錄裡。</p>' : '') + '<button class="primary-button" data-action="confirm-finish">結束市場的一天，查看紀錄</button><button class="secondary-button" data-action="close">先留在市場</button><p class="microcopy">只結束這個試玩片段，不是正式投票或開票。</p>';
    }
    if (type === 'restart') {
      title = '再走一次市場';
      body = '<p>同一情境會保留相同的模擬起點，方便比較不同選擇。新情境會重新產生虛構抽樣與背景。</p><button class="primary-button" data-action="restart-pick" data-mode="same">同一情境，從早上重玩</button><button class="secondary-button" data-action="restart-pick" data-mode="new">換一個新情境</button><p class="small-seed">情境編號 ' + escape(state.seed) + '</p><p class="microcopy">只重設市場日 v7 進度。保留的舊版遊戲與舊版存檔仍在。</p>';
    }
    if (type === 'restart-confirm') {
      title = '這一天還沒結束';
      body = '<p>重玩會替換目前這局的市場日進度與紀錄。你還有 ' + state.timeLeft + ' 個時段，確定要從頭開始嗎？</p><button class="primary-button" data-action="confirm-restart" data-mode="' + escape(extra) + '">確定，' + (extra === 'same' ? '同一情境重玩' : '換一個新情境') + '</button><button class="secondary-button" data-action="close">取消，繼續這一局</button>';
    }
    $('dialog-title').textContent = title; $('dialog-body').innerHTML = body;
    $('dialog-overlay').hidden = false; $('dialog').focus({ preventScroll: true });
    document.querySelector('main').inert = true; document.querySelector('.masthead').inert = true;
    updateHeader();
  }
  function closeDialog() {
    if (!modal) return;
    modal = null; $('dialog-overlay').hidden = true;
    document.querySelector('main').inert = false; document.querySelector('.masthead').inert = false;
    clearHeld(); updateHeader();
    const focus = lastFocus && document.contains(lastFocus) ? lastFocus : $('world');
    focus.focus({ preventScroll: true }); lastFocus = null;
  }
  function restart(mode) {
    let nextSeed = mode === 'same' ? state.seed : seed();
    if (mode !== 'same' && nextSeed === state.seed) nextSeed = (nextSeed + 1) >>> 0;
    closeDialog(); stopMovement(); skip(); state = G.initial(nextSeed); position = { ...anchors.player };
    selectedPlace = 'desk'; selectedTopic = 'access'; error = '';
    save(); updatePosition(); render(); focusInteraction();
    $('walk-status').textContent = '選一個地點，走過去看看'; announce('新的一天已準備好。按開始才會建立初始抽樣。');
  }
  function dispatch(data) {
    if (data.answer) { answer(data.answer); return; }
    if (data.place) { go(data.place); return; }
    const a = data.action;
    if (a === 'close') { closeDialog(); return; }
    if (a === 'skip') { skip(); return; }
    if (['journal', 'budget', 'poll', 'restart', 'report'].includes(a)) { openDialog(a); return; }
    if (a === 'dossier') { openDialog('dossier', data.topic); return; }
    if (a === 'restart-pick' && modal?.type === 'restart') { if (state.started && state.phase !== 'report') openDialog('restart-confirm', data.mode); else restart(data.mode); return; }
    if (a === 'confirm-restart' && modal?.type === 'restart-confirm' && modal.extra === data.mode) { restart(data.mode); return; }
    if (a === 'finish') {
      if (state.phase === 'report') openDialog('report');
      else if (state.started && state.phase === 'roam') openDialog('finish');
      return;
    }
    if (a === 'confirm-finish' && modal?.type === 'finish' && state.phase === 'roam') {
      closeDialog(); stopMovement(); if (G.finish(state)) { save(); render(); pulse(); focusInteraction(); announce('市場日已結束，完整紀錄已儲存。'); } return;
    }
    if (modal) return;
    if (a === 'start' && !state.started) {
      if (G.start(state)) { save(); render(); $('world').focus({ preventScroll: true }); announce('市場日開始。點資料桌可先準備議題。'); }
      return;
    }
    if (a === 'topic' && movable() && selectedPlace === 'desk' && G.TOPICS[data.topic]) { selectedTopic = data.topic; error = ''; save(); render(); return; }
    if (a === 'commit') { commit(data.kind, data.topic); return; }
    if (a === 'continue' && state.phase === 'reaction') {
      clearHeld(); if (G.continue(state)) { save(); render(); $('world').focus({ preventScroll: true }); announce(state.timeLeft ? '可以繼續自由移動。' : '今日時段已用完，可以收尾回顧。'); } return;
    }
    if (a === 'interact') interact();
  }
  document.addEventListener('click', event => {
    const el = event.target.closest('[data-action], [data-place], [data-answer]');
    if (!el || el.disabled) return;
    dispatch(el.dataset);
  });
  const keyDirection = key => ({ ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', W: 'up', a: 'left', A: 'left', s: 'down', S: 'down', d: 'right', D: 'right' }[key]);
  $('world').addEventListener('keydown', event => {
    if (event.target !== $('world') || !movable()) return;
    const direction = keyDirection(event.key);
    if (direction) { event.preventDefault(); if (inputTimer) clearHeld(); stopTravel(); held.add(direction); return; }
    if (event.key === 'e' || event.key === 'E' || event.key === 'Enter') { event.preventDefault(); if (!event.repeat) interact(); }
  });
  window.addEventListener('keyup', event => { const direction = keyDirection(event.key); if (direction) { held.delete(direction); updatePosition(held.size > 0); save(); } });
  $('world').addEventListener('blur', () => { clearHeld(); save(); });
  window.addEventListener('blur', () => { clearHeld(); stopTravel(); save(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { clearHeld(); stopTravel(); save(); } lastFrame = null; });
  for (const button of document.querySelectorAll('[data-direction]')) {
    button.addEventListener('pointerdown', event => {
      if (!movable()) return;
      event.preventDefault(); clearHeld(); stopTravel(); $('world').focus({ preventScroll: true }); held.add(button.dataset.direction);
      if (button.setPointerCapture && event.pointerId != null) button.setPointerCapture(event.pointerId);
    });
    const release = () => { clearHeld(); save(); };
    button.addEventListener('pointerup', release); button.addEventListener('pointercancel', release); button.addEventListener('lostpointercapture', release);
    button.addEventListener('click', event => {
      if (event.detail !== 0 || !movable()) return;
      event.preventDefault(); clearHeld(); stopTravel(); $('world').focus({ preventScroll: true }); held.add(button.dataset.direction);
      const epoch = ++inputEpoch;
      inputTimer = window.setTimeout(() => { if (inputEpoch === epoch) { clearHeld(); save(); } }, 160);
    });
  }
  $('dialog-overlay').addEventListener('click', event => { if (event.target === $('dialog-overlay')) closeDialog(); });
  $('dialog').addEventListener('keydown', event => {
    if (!modal) return;
    if (event.key === 'Escape') { event.preventDefault(); closeDialog(); }
    if (event.key === 'Tab') {
      const focusable = [...$('dialog').querySelectorAll('button:not(:disabled),a[href],[tabindex="0"]')];
      if (!focusable.length) { event.preventDefault(); $('dialog').focus(); return; }
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === $('dialog'))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === $('dialog'))) { event.preventDefault(); first.focus(); }
    }
  });
  reduced.addEventListener?.('change', () => { if (reduced.matches) { skip(); clearHeld(); } });
  renderWorld(); render();
  if (state.started && state.phase !== 'roam') $('walk-status').textContent = state.phase === 'report' ? '市場日已收尾。可以查看紀錄或重玩。' : '先完成右側的對話，再繼續走。';
  raf = window.requestAnimationFrame(frame);
  // Deterministic controller hooks support the DOM harness, without bypassing engine rules.
  window.MarketUI = Object.freeze({ tick, dispatch, getPosition: () => ({ ...position }), getState: () => JSON.parse(JSON.stringify(state)), getTravel: () => travel?.id || null, storageKey: KEY });
})();
