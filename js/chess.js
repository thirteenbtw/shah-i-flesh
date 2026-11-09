// Шахматы: доска, ходы (без шаха/рокировки/взятия на проходе), ИИ бота.
// Сторона 0 — игрок (белые, внизу), сторона 1 — бот (чёрные, вверху).
window.G = window.G || {};

G.DIRS = {
  R: [[1, 0], [-1, 0], [0, 1], [0, -1]],
  B: [[1, 1], [1, -1], [-1, 1], [-1, -1]],
  Q: [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]],
  K: [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]],
  N: [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]],
};
G.SLIDING = { R: true, B: true, Q: true };

G.Chess = class {
  constructor() {
    this.b = new Array(64).fill(null);
    this.nextId = 1;
    this.lastMove = null;
    const back = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
    for (let c = 0; c < 8; c++) {
      this.put(1, back[c], c, 0);
      this.put(1, 'P', c, 1);
      this.put(0, 'P', c, 6);
      this.put(0, back[c], c, 7);
    }
  }

  put(side, type, c, r) { this.b[r * 8 + c] = { id: this.nextId++, side, type }; }
  inside(c, r) { return c >= 0 && r >= 0 && c < 8 && r < 8; }
  at(c, r) { return this.inside(c, r) ? this.b[r * 8 + c] : null; }
  set(c, r, p) { this.b[r * 8 + c] = p; }
  remove(c, r) { this.set(c, r, null); }
  hasKing(side) { return this.b.some((p) => p && p.side === side && p.type === 'K'); }

  moves(c, r) {
    const p = this.at(c, r);
    if (!p) return [];
    const res = [];
    if (p.type === 'P') {
      const d = p.side === 0 ? -1 : 1;
      const start = p.side === 0 ? 6 : 1;
      if (this.inside(c, r + d) && !this.at(c, r + d)) {
        res.push([c, r + d]);
        if (r === start && !this.at(c, r + 2 * d)) res.push([c, r + 2 * d]);
      }
      for (const dc of [-1, 1]) {
        const t = this.at(c + dc, r + d);
        if (t && t.side !== p.side) res.push([c + dc, r + d]);
      }
      return res;
    }
    for (const [dc, dr] of G.DIRS[p.type]) {
      let x = c + dc, y = r + dr;
      while (this.inside(x, y)) {
        const t = this.at(x, y);
        if (t) { if (t.side !== p.side) res.push([x, y]); break; }
        res.push([x, y]);
        if (!G.SLIDING[p.type]) break;
        x += dc; y += dr;
      }
    }
    return res;
  }

  // Бьёт ли фигура на (c,r) клетку (tc,tr)
  attacks(c, r, tc, tr) {
    const p = this.at(c, r);
    if (p.type === 'P') return tr === r + (p.side === 0 ? -1 : 1) && Math.abs(tc - c) === 1;
    for (const [dc, dr] of G.DIRS[p.type]) {
      let x = c + dc, y = r + dr;
      while (this.inside(x, y)) {
        if (x === tc && y === tr) return true;
        if (this.at(x, y) || !G.SLIDING[p.type]) break;
        x += dc; y += dr;
      }
    }
    return false;
  }

  isAttacked(bySide, tc, tr) {
    for (let i = 0; i < 64; i++) {
      const p = this.b[i];
      if (p && p.side === bySide && this.attacks(i % 8, Math.floor(i / 8), tc, tr)) return true;
    }
    return false;
  }

  allMoves(side) {
    const res = [];
    for (let i = 0; i < 64; i++) {
      const p = this.b[i];
      if (!p || p.side !== side) continue;
      const c = i % 8, r = Math.floor(i / 8);
      for (const to of this.moves(c, r)) res.push({ from: [c, r], to, piece: p, target: this.at(...to) });
    }
    return res;
  }

  move(from, to) {
    const p = this.at(...from);
    this.set(...to, p);
    this.set(...from, null);
    if (p.type === 'P' && (to[1] === 0 || to[1] === 7)) p.type = 'Q';
    this.lastMove = { from, to };
  }
};

// Сила бойца в дуэли — для оценки шансов
G.fighterPower = (t) => { const s = G.CFG.fighter[t]; return (s.hp * s.dmg) / s.rate; };
G.winProb = (att, def) => { const a = G.fighterPower(att), d = G.fighterPower(def); return a / (a + d); };

// ИИ бота: один полуход вперёд + риск взятия
G.botChooseMove = function (chess, side) {
  const V = G.CFG.pieceValue;
  let best = null;
  for (const m of chess.allMoves(side)) {
    const me = m.piece;
    let s = Math.random() * 0.3;
    if (m.target) {
      const p = G.winProb(me.type, m.target.type);
      s += V[m.target.type] * p - V[me.type] * (1 - p) * 0.8;
    }
    if (chess.isAttacked(1 - side, m.to[0], m.to[1])) s -= Math.min(V[me.type], 9) * 0.35;
    if (chess.isAttacked(1 - side, m.from[0], m.from[1])) s += Math.min(V[me.type], 9) * 0.3;
    if (me.type === 'P') s += 0.1 + (m.to[0] >= 2 && m.to[0] <= 5 ? 0.1 : 0);
    if (me.type === 'K') s -= 0.4;
    s += (3.5 - Math.abs(m.to[0] - 3.5)) * 0.03 + (3.5 - Math.abs(m.to[1] - 3.5)) * 0.03;
    if (!best || s > best.s) best = { ...m, s };
  }
  return best;
};
