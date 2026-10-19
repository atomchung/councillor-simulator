/* Collision-safe, frame-rate independent walking on the town's 1000 x 700 map. */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.TownWalk = factory();
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const WIDTH = 1000, HEIGHT = 700, SPEED = 175, MAX_DT = 0.05;
  const GROUND_INSET = 6, PADDING = 1, EPSILON = 1e-7;
  const OBSTACLES = [
    { id: 'home', u0: 60, u1: 138, v0: 55, v1: 124 },
    { id: 'school', u0: 303, u1: 428, v0: 67, v1: 133 },
    { id: 'market', u0: 77, u1: 203, v0: 310, v1: 382 },
    { id: 'pond', u0: 283, u1: 347, v0: 324, v1: 375 },
    { id: 'construction', u0: 454, u1: 520, v0: 291, v1: 386 }
  ].map(function (r) { return Object.freeze(r); });
  const SOLIDS = OBSTACLES.map(function (r) {
    return { u0: r.u0 - PADDING, u1: r.u1 + PADDING, v0: r.v0 - PADDING, v1: r.v1 + PADDING };
  });
  function project(u, v) {
    if (typeof u === 'object' && u) { v = u.v; u = u.u; }
    return { x: 500 + (u - v) * 0.82, y: 105 + (u + v) * 0.44 };
  }
  function unproject(x, y) {
    if (typeof x === 'object' && x) { y = x.y; x = x.x; }
    const a = (x - 500) / 0.82, b = (y - 105) / 0.44;
    return { u: (a + b) / 2, v: (b - a) / 2 };
  }
  function finitePoint(p) { return !!p && Number.isFinite(p.x) && Number.isFinite(p.y); }
  function copy(p) { return { x: p.x, y: p.y }; }
  function distance(a, b) { return Math.hypot(b.x - a.x, b.y - a.y); }
  function validPosition(point) {
    if (!finitePoint(point)) return false;
    const p = unproject(point);
    if (p.u < GROUND_INSET - EPSILON || p.v < GROUND_INSET - EPSILON || p.u > 550 - GROUND_INSET + EPSILON || p.v > 550 - GROUND_INSET + EPSILON) return false;
    return !SOLIDS.some(function (r) {
      return p.u >= r.u0 - EPSILON && p.u <= r.u1 + EPSILON && p.v >= r.v0 - EPSILON && p.v <= r.v1 + EPSILON;
    });
  }
  // Swept segment/AABB test: a long frame or a diagonal can never tunnel through a corner.
  function intersects(a, b, r) {
    let enter = 0, leave = 1;
    for (const axis of ['u', 'v']) {
      const delta = b[axis] - a[axis], low = r[axis + '0'], high = r[axis + '1'];
      if (Math.abs(delta) < EPSILON) {
        if (a[axis] < low - EPSILON || a[axis] > high + EPSILON) return false;
      } else {
        let lo = (low - a[axis]) / delta, hi = (high - a[axis]) / delta;
        if (lo > hi) { const temp = lo; lo = hi; hi = temp; }
        enter = Math.max(enter, lo); leave = Math.min(leave, hi);
        if (enter > leave + EPSILON) return false;
      }
    }
    return leave >= -EPSILON && enter <= 1 + EPSILON;
  }
  function clearSegment(from, to) {
    if (!validPosition(from) || !validPosition(to)) return false;
    // The inset ground is convex, so valid endpoints also keep the segment on the ground.
    const a = unproject(from), b = unproject(to);
    return !SOLIDS.some(function (r) { return intersects(a, b, r); });
  }
  // Direction is in screen axes. dt is seconds, with long frames capped at 50 ms.
  function stepPosition(position, direction, dt, speed) {
    if (!validPosition(position)) return null;
    let dx = direction && (direction.x === undefined ? direction.dx : direction.x);
    let dy = direction && (direction.y === undefined ? direction.dy : direction.y);
    if (!Number.isFinite(dx) || !Number.isFinite(dy) || !Number.isFinite(dt) || dt <= 0) return copy(position);
    const length = Math.hypot(dx, dy);
    if (!length) return copy(position);
    speed = speed === undefined ? SPEED : speed;
    if (!Number.isFinite(speed) || speed <= 0) return copy(position);
    const travel = speed * Math.min(dt, MAX_DT), count = Math.max(1, Math.ceil(travel / 2));
    dx = dx / length * travel / count; dy = dy / length * travel / count;
    let p = copy(position);
    for (let i = 0; i < count; i++) {
      const next = { x: p.x + dx, y: p.y + dy };
      if (clearSegment(p, next) && clearSegment(position, next)) { p = next; continue; }
      // Sliding along a free screen axis keeps diagonal movement useful at a wall.
      const horizontal = { x: p.x + dx, y: p.y }, vertical = { x: p.x, y: p.y + dy };
      if (Math.abs(dx) > EPSILON && clearSegment(p, horizontal) && clearSegment(position, horizontal)) p = horizontal;
      else if (Math.abs(dy) > EPSILON && clearSegment(p, vertical) && clearSegment(position, vertical)) p = vertical;
    }
    return p;
  }
  // A visibility graph around expanded rectangle corners gives exact, deterministic routes.
  // Returned points include the starting point and exact destination; null means unreachable.
  function findPath(from, to) {
    if (!validPosition(from) || !validPosition(to)) return null;
    if (distance(from, to) < EPSILON) return [copy(from)];
    if (clearSegment(from, to)) return [copy(from), copy(to)];
    const nodes = [copy(from), copy(to)], clearance = 8;
    SOLIDS.forEach(function (r) {
      [r.u0 - clearance, r.u1 + clearance].forEach(function (u) {
        [r.v0 - clearance, r.v1 + clearance].forEach(function (v) {
          const point = project(u, v);
          if (validPosition(point)) nodes.push(point);
        });
      });
    });
    const costs = nodes.map(function () { return Infinity; });
    const previous = nodes.map(function () { return -1; });
    const visited = new Set(); costs[0] = 0;
    for (let pass = 0; pass < nodes.length; pass++) {
      let current = -1;
      for (let i = 0; i < nodes.length; i++) {
        if (!visited.has(i) && (current < 0 || costs[i] < costs[current])) current = i;
      }
      if (current < 0 || !Number.isFinite(costs[current])) return null;
      if (current === 1) break;
      visited.add(current);
      for (let j = 0; j < nodes.length; j++) {
        if (visited.has(j) || j === current) continue;
        const candidate = costs[current] + distance(nodes[current], nodes[j]);
        if (candidate < costs[j] && clearSegment(nodes[current], nodes[j])) {
          costs[j] = candidate; previous[j] = current;
        }
      }
    }
    if (!Number.isFinite(costs[1])) return null;
    const result = []; let index = 1;
    while (index !== -1) { result.push(copy(nodes[index])); index = previous[index]; }
    return result.reverse();
  }
  function anchor(value) {
    if (!value) return null;
    if (Number.isFinite(value.ax) && Number.isFinite(value.ay)) return { x: value.ax * WIDTH / 100, y: value.ay * HEIGHT / 100 };
    return finitePoint(value) ? copy(value) : null;
  }
  function nearest(position, positions, radius) {
    if (!finitePoint(position)) return null;
    radius = radius === undefined ? 60 : radius;
    let found = null;
    Object.keys(positions || {}).forEach(function (id) {
      const point = anchor(positions[id]);
      if (!point) return;
      const d = distance(position, point);
      if (d <= radius && (!found || d < found.distance)) found = { id: id, distance: d };
    });
    return found;
  }
  function create(options) {
    options = options || {};
    const town = options.town, avatar = options.avatar, positions = options.positions || {};
    if (!town || !avatar) throw new TypeError('TownWalk.create requires town and avatar elements.');
    const doc = town.ownerDocument || (typeof document !== 'undefined' ? document : null);
    const host = (doc && doc.defaultView) || (typeof window !== 'undefined' ? window : null);
    const held = new Set(), removers = [];
    let mobile = { x: 0, y: 0 }, route = [], arrival = null, destination = null;
    let destroyed = false, frame = null, previousTime = null, lastNear;
    let position = anchor(positions.home) || project(235, 235);
    if (!validPosition(position)) position = project(235, 235);
    const originalTabIndex = town.getAttribute ? town.getAttribute('tabindex') : null;
    const addedTabIndex = !(town.tabIndex >= 0);
    if (addedTabIndex) town.tabIndex = 0;
    function paused() { return destroyed || !!(options.isPaused && options.isPaused()); }
    function moving(value) { if (avatar.classList) avatar.classList.toggle('walking', value); }
    function render() {
      avatar.style.left = position.x / WIDTH * 100 + '%';
      avatar.style.top = position.y / HEIGHT * 100 + '%';
    }
    function updateNear(force) {
      const current = nearest(position, positions);
      const changed = force || lastNear === undefined || (current && !lastNear) || (!current && lastNear) ||
        (current && lastNear && (current.id !== lastNear.id || Math.abs(current.distance - lastNear.distance) >= 0.5));
      if (changed) { lastNear = current; if (options.onNear) options.onNear(current); }
      return current;
    }
    function clearInputs() { held.clear(); mobile = { x: 0, y: 0 }; }
    function cancelRoute() { route = []; arrival = null; destination = null; }
    function stop() { clearInputs(); cancelRoute(); moving(false); }
    function add(target, event, listener) {
      if (target && target.addEventListener) {
        target.addEventListener(event, listener);
        removers.push(function () { target.removeEventListener(event, listener); });
      }
    }
    function focused() { return !doc || doc.activeElement === town; }
    function focus() { if (!destroyed && town.focus) town.focus({ preventScroll: true }); }
    function key(event) {
      const code = event.code || '';
      if (/^Key[WASDE]$/.test(code)) return code.slice(3).toLowerCase();
      if (code === 'Space') return ' ';
      return (event.key || code).toLowerCase();
    }
    const directions = { arrowup: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1], arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0] };
    function keydown(event) {
      if (!focused() || event.altKey || event.ctrlKey || event.metaKey || paused()) return;
      const name = key(event);
      if (directions[name]) {
        event.preventDefault();
        const beginning = !held.has(name);
        cancelRoute(); held.add(name);
        if (beginning && options.onMove) options.onMove(copy(position), { manual: true, inputOnly: true });
        return;
      }
      if ((name === 'enter' || name === ' ' || name === 'e') && !event.repeat) {
        event.preventDefault();
        const near = updateNear();
        if (near && options.onInteract) { stop(); options.onInteract(near.id); }
      } else if (name === 'enter' || name === ' ' || name === 'e') event.preventDefault();
    }
    function keyup(event) { held.delete(key(event)); }
    function setDirection(dx, dy) {
      if (paused()) { clearInputs(); return false; }
      if (!Number.isFinite(dx) || !Number.isFinite(dy)) { mobile = { x: 0, y: 0 }; return false; }
      const length = Math.hypot(dx, dy);
      if (length) {
        cancelRoute(); held.clear(); focus();
        if (options.onMove) options.onMove(copy(position), { manual: true, inputOnly: true });
      }
      mobile = length ? { x: dx / length, y: dy / length } : { x: 0, y: 0 };
      return true;
    }
    function tick(dt) {
      if (paused()) { stop(); return copy(position); }
      dt = Number.isFinite(dt) ? Math.max(0, Math.min(dt, MAX_DT)) : 0;
      let dx = mobile.x, dy = mobile.y;
      held.forEach(function (name) { dx += directions[name][0]; dy += directions[name][1]; });
      const manual = !!(dx || dy), before = copy(position);
      let completed = null, completedId = null;
      if (manual) position = stepPosition(position, { x: dx, y: dy }, dt) || position;
      else if (route.length && dt > 0) {
        let remaining = SPEED * dt;
        while (route.length && remaining > EPSILON) {
          const target = route[0], d = distance(position, target);
          if (d <= remaining + EPSILON) {
            if (!clearSegment(position, target)) { cancelRoute(); break; }
            position = copy(target); route.shift(); remaining = Math.max(0, remaining - d);
          } else {
            const next = { x: position.x + (target.x - position.x) / d * remaining, y: position.y + (target.y - position.y) / d * remaining };
            if (clearSegment(position, next)) position = next;
            else cancelRoute();
            remaining = 0;
          }
        }
        if (!route.length && destination) { completed = arrival; completedId = destination; arrival = null; destination = null; }
      }
      const changed = distance(before, position) > EPSILON;
      moving(changed);
      if (changed) {
        render(); updateNear();
        if (options.onMove) options.onMove(copy(position), { manual: manual });
      }
      if (completed && !paused()) completed(completedId);
      return copy(position);
    }
    function goTo(id, callback) {
      stop();
      if (paused()) return false;
      const target = anchor(positions[id]), path = target && findPath(position, target);
      if (!path) return false;
      clearInputs(); route = path.slice(1); destination = id; arrival = typeof callback === 'function' ? callback : null;
      if (!route.length) {
        const done = arrival; destination = null; arrival = null;
        if (done && !paused()) done(id);
      }
      return true;
    }
    function setPosition(value) {
      if (destroyed || !validPosition(value)) return false;
      stop(); position = copy(value); render(); updateNear(true); return true;
    }
    function animate(time) {
      if (destroyed) return;
      const dt = previousTime === null ? 0 : (time - previousTime) / 1000;
      previousTime = time; tick(dt);
      if (!destroyed && host && host.requestAnimationFrame) frame = host.requestAnimationFrame(animate);
    }
    add(town, 'keydown', keydown); add(host, 'keyup', keyup);
    add(town, 'blur', function () { clearInputs(); moving(false); });
    add(host, 'blur', function () { stop(); previousTime = null; });
    add(doc, 'visibilitychange', function () { if (doc.hidden) { stop(); previousTime = null; } });
    add(town, 'pointerdown', function (event) {
      const target = event.target;
      if (paused() || (target && target.closest && target.closest('button,a,input,textarea,select,[contenteditable="true"],[role="button"]'))) return;
      focus();
    });
    render(); updateNear(true);
    if (host && host.requestAnimationFrame) frame = host.requestAnimationFrame(animate);
    return {
      setPosition: setPosition, getPosition: function () { return copy(position); },
      goTo: goTo, stop: stop, focus: focus, setDirection: setDirection, tick: tick,
      destroy: function () {
        if (destroyed) return;
        stop(); destroyed = true;
        if (frame !== null && host && host.cancelAnimationFrame) host.cancelAnimationFrame(frame);
        removers.forEach(function (remove) { remove(); });
        if (addedTabIndex && town.removeAttribute) {
          if (originalTabIndex === null) town.removeAttribute('tabindex');
          else town.setAttribute('tabindex', originalTabIndex);
        }
      }
    };
  }
  return Object.freeze({ create: create, project: project, unproject: unproject, validPosition: validPosition,
    stepPosition: stepPosition, findPath: findPath, nearest: nearest, clearSegment: clearSegment,
    SPEED: SPEED, MAX_DT: MAX_DT, OBSTACLES: Object.freeze(OBSTACLES) });
});
