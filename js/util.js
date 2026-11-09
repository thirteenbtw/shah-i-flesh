window.G = window.G || {};

G.U = {
  clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
  rand: (a, b) => a + Math.random() * (b - a),
  randi: (n) => Math.floor(Math.random() * n),
  choice: (arr) => arr[Math.floor(Math.random() * arr.length)],
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  },
  dist: (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by),
  // Окружность против прямоугольника: вектор выталкивания или null
  circleRect(cx, cy, r, rx, ry, rw, rh) {
    const nx = G.U.clamp(cx, rx, rx + rw);
    const ny = G.U.clamp(cy, ry, ry + rh);
    const dx = cx - nx, dy = cy - ny;
    const d2 = dx * dx + dy * dy;
    if (d2 >= r * r) return null;
    if (d2 === 0) {
      // центр внутри прямоугольника — выталкиваем по ближайшей стороне
      const left = cx - rx, right = rx + rw - cx, top = cy - ry, bottom = ry + rh - cy;
      const m = Math.min(left, right, top, bottom);
      if (m === left) return [-(left + r), 0];
      if (m === right) return [right + r, 0];
      if (m === top) return [0, -(top + r)];
      return [0, bottom + r];
    }
    const d = Math.sqrt(d2);
    return [(dx / d) * (r - d), (dy / d) * (r - d)];
  },
};

// Простая шина событий: модули не знают друг о друге.
G.Bus = {
  handlers: {},
  on(name, fn) { (this.handlers[name] = this.handlers[name] || []).push(fn); },
  emit(name, data) { (this.handlers[name] || []).forEach((fn) => fn(data)); },
  clear() { this.handlers = {}; },
};
