/* Original helper performances. Pure presentation: the controller owns time and all game state. */
(function () {
  'use strict';

  const duration = 1.8;
  const W = 1200, H = 650;
  const colors = ['#7c98a2', '#9a9980', '#a88f83'];
  const offsets = [{ x: -46, y: 12 }, { x: 7, y: 31 }, { x: 57, y: 7 }];
  const fallback = {
    start: { x: 585.9, y: 330.95 }, prepare: { x: 534.2, y: 234.2 },
    canvass: { x: 308.6, y: 354.6 }, recruit: { x: 712.8, y: 242.8 },
    tv: { x: 783.3, y: 373.95 }
  };
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const num = n => String(Math.round(n * 1000) / 1000);
  const validPoint = p => p && Number.isFinite(p.x) && Number.isFinite(p.y);
  const copyPoint = p => ({ x: clamp(p.x, 0, W), y: clamp(p.y, 0, H) });

  function anchor(Art, name) {
    return copyPoint(validPoint(Art.anchors?.[name]) ? Art.anchors[name] : fallback[name]);
  }

  function waypoint(Art, name, index, backup) {
    const p = Art.paths?.[name]?.[index];
    return validPoint(p) ? copyPoint(p) : backup;
  }

  function route(Art, task, activity) {
    const recruit = anchor(Art, 'recruit');
    // Follow the pedestrian network rather than cutting through the office.
    const junction = waypoint(Art, 'recruit', 1, { x: 745.7, y: 257.85 });
    if(task==='follow'&&typeof Art.route==='function'&&Art.anchors?.[activity])return [recruit,junction,anchor(Art,'start'),...Art.route(activity).slice(1)];
    if (task === 'research') return [recruit, junction,
      waypoint(Art, 'prepare', 1, { x: 665.8, y: 294.4 }), anchor(Art, 'prepare')];
    if (task === 'canvass') return [recruit, junction, anchor(Art, 'start'),
      waypoint(Art, 'canvass', 1, { x: 421.4, y: 406.2 }), anchor(Art, 'canvass')];
    return [anchor(Art, 'tv')];
  }

  function along(points, progress) {
    if (points.length === 1 || progress >= 1) return { ...points[points.length - 1] };
    const lengths = points.slice(1).map((p, i) => Math.hypot(p.x - points[i].x, p.y - points[i].y));
    let remaining = lengths.reduce((sum, n) => sum + n, 0) * progress;
    for (let i = 0; i < lengths.length; i++) {
      if (remaining <= lengths[i] && lengths[i] > 0) {
        const t = remaining / lengths[i];
        return { x: points[i].x + (points[i + 1].x - points[i].x) * t,
          y: points[i].y + (points[i + 1].y - points[i].y) * t };
      }
      remaining -= lengths[i];
    }
    return { ...points[points.length - 1] };
  }

  function prop(task, walking, pulse) {
    if (task === 'idle') return '';
    const paper = '<g transform="translate(50 78) rotate(' + num(walking ? -8 : pulse * 4) + ')">' +
      '<path d="M-16-5L0-1 16-5V18L0 22-16 18Z" fill="#fff2d2" stroke="#8b9b82" stroke-width="1.4"/>' +
      '<path d="M0-1V22M-11 2L-4 4M-11 7L-4 9M4 4L11 2M4 9L11 7" fill="none" stroke="#a4b19a" stroke-width="1.3"/>' +
      '<path d="M1 0L' + num(10 + pulse * 3) + ' -3V17L1 21Z" fill="#e5e8cc" opacity=".85"/></g>';
    if(task==='follow'&&typeof Art.route==='function'&&Art.anchors?.[activity])return [recruit,junction,anchor(Art,'start'),...Art.route(activity).slice(1)];
    if (task === 'research') return paper;
    const greeting = walking ? '' : '<g transform="translate(75 ' + num(25 - pulse * 3) + ')" opacity="' + num(.8 + pulse * .15) + '">' +
      '<path d="M-10-6H10V6H0L-5 11V6H-10Z" fill="#f9f0d8" stroke="#7e9b88" stroke-width="1.5"/>' +
      '<path d="M-5 0H5" stroke="#78927e" stroke-width="1.5"/></g>';
    return '<g transform="translate(23 87) rotate(-9)"><rect width="16" height="22" fill="#f5e8c4" stroke="#a3a88d"/><path d="M4 6H12M4 10H12M4 14H9" stroke="#8b9b82"/></g>' + greeting;
  }

  function human(Art, index, task, walking, phase) {
    const stride = walking ? Math.sin(phase * 11) * 10 : 0;
    const pulse = Math.sin(phase * 3);
    let markup = Art.avatar('helper', colors[index]);
    if (typeof markup !== 'string') return '';
    // All movement is driven by the supplied clock. There are no independent
    // CSS/SMIL animations to keep running behind a modal or in a hidden tab.
    markup = markup.replace('<svg ', '<svg style="display:block;width:100%;height:auto;overflow:visible" ')
      .replace('<g class="leg-left">', '<g class="leg-left" transform="rotate(' + num(stride) + ' 37 96)">')
      .replace('<g class="leg-right">', '<g class="leg-right" transform="rotate(' + num(-stride) + ' 58 96)">');
    if (!walking && task === 'canvass') markup = markup.replace('<g class="arm-right">',
      '<g class="arm-right" transform="rotate(' + num(-68 + pulse * 14) + ' 73 65)">');
    if (!walking && task === 'research') markup = markup.replace('<g class="head">',
      '<g class="head" transform="rotate(' + num(2 + pulse * 2) + ' 48 54)">');
    const props = prop(task, walking, pulse);
    return markup + (props ? '<svg aria-hidden="true" focusable="false" viewBox="0 0 100 140" style="position:absolute;inset:0;width:100%;height:100%;overflow:visible">' + props + '</svg>' : '');
  }

  function render(assignments, elapsedSeconds, Art, options = {}) {
    if (!Array.isArray(assignments) || !Art || typeof Art.avatar !== 'function') return '';
    const reduced = options?.reducedMotion === true;
    const elapsed = Number.isFinite(elapsedSeconds) ? Math.max(0, elapsedSeconds) : 0;
    const progress = reduced ? 1 : Math.min(1, elapsed / duration);
    const phase = reduced ? 0 : elapsed % 60;
    const visible = assignments.filter(a => a && typeof a === 'object' && a.task !== 'release').slice(0, 3);
    return visible.map((a, index) => {
      const task = ['research', 'canvass','follow'].includes(a.task) ? a.task : 'idle';
      const walking = task !== 'idle' && progress < 1;
      const p = along(route(Art, task,a.activity), task === 'idle' ? 1 : progress);
      p.x = clamp(p.x + offsets[index].x, 36, W - 36);
      p.y = clamp(p.y + offsets[index].y, 112, H - 28);
      const caption = task === 'follow' ? '隨隊' : task === 'research' ? '查資料' : task === 'canvass' ? '代為拜訪' : '待命';
      const name = esc(String(a.name || '夥伴').slice(0, 24));
      const bob = walking && !reduced ? Math.abs(Math.sin(phase * 11 + index)) * -2 : 0;
      return '<div class="day-team-helper" aria-hidden="true" data-helper-id="' + esc(a.id ?? index) + '" data-task="' + task + '" data-state="' + (walking ? 'walking' : 'working') + '" data-x="' + num(p.x) + '" data-y="' + num(p.y) + '" style="position:absolute;pointer-events:none;left:' + num(p.x / W * 100) + '%;top:' + num(p.y / H * 100) + '%;width:4.5%;aspect-ratio:100/140;transform:translate(-50%,-92.857%);z-index:' + Math.round(p.y) + '">' +
        '<div style="position:relative;width:100%;transform:translateY(' + num(bob) + 'px)">' + human(Art, index, task==='follow'?(a.activity==='prepare'?'research':'canvass'):task, walking, phase + (reduced ? 0 : index * .6)) + '</div>' +
        '<span style="position:absolute;left:50%;top:-9%;transform:translate(-50%,-100%);font:600 clamp(7px,.65vw,10px)/1.4 Arial,sans-serif;white-space:nowrap;color:#466155;background:#fff8e6ed;border:1px solid #a6b49a88;border-radius:4px;padding:2px 4px">' + name + '・' + caption + '</span></div>';
    }).join('');
  }

  window.DayTeamArt = Object.freeze({ render, duration });
})();
