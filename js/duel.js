// Дуэль: шутер с видом сбоку между двумя фигурами. Сверху падают блоки —
// они становятся укрытиями и бьют по голове. Координаты — пиксели арены.
window.G = window.G || {};

G.Duel = class {
  // battle: {types:[тип стороны 0, тип стороны 1], defSide}; mods[side]: {dmgMul, hpBonus}
  constructor(battle, mods) {
    const A = G.CFG.arena, D = G.CFG.duel;
    this.cs = A.cell;
    this.cols = A.w / A.cell;
    this.rows = A.h / A.cell;
    this.W = A.w;
    this.H = A.h;
    this.defSide = battle.defSide;
    this.grid = [];
    for (let r = 0; r < this.rows; r++) this.grid.push(new Array(this.cols).fill(null));
    this.falling = [];
    this.bullets = [];
    this.fx = [];
    this.blockT = 1.2;
    this.t = D.timeLimit;
    this.over = false;
    this.winner = -1;
    this.overT = 1.2;
    this.input = { left: false, right: false, jump: false, fire: false, aimX: 0, aimY: 0 };
    this.ai = [this.newAI(), this.newAI()];
    this.autoplay = [false, true]; // сторона 1 — бот

    for (let i = 0; i < D.startBlocks; i++) {
      const b = this.makeBlock(G.U.rand(0.25, 0.75));
      while (this.fits(b, b.col, b.row + 1)) b.row++;
      this.land(b);
    }
    this.fighters = [0, 1].map((side) => this.makeFighter(side, battle.types[side], mods[side]));
    for (const f of this.fighters) this.unstick(f);
  }

  newAI() { return { strafe: 1, strafeT: 0 }; }

  makeFighter(side, type, mod) {
    const S = G.CFG.fighter[type];
    const hp = Math.round(S.hp + mod.hpBonus);
    return {
      side, type, w: 26, h: 38,
      x: side === 0 ? 40 : this.W - 66, y: this.H - 38 - 0.01,
      vx: 0, vy: 0, onGround: true,
      hp, maxHp: hp, dmg: S.dmg * mod.dmgMul, rate: S.rate, speed: S.speed, jumpV: S.jump,
      fireCd: 0.6, aim: side === 0 ? 0 : Math.PI, boostT: 0, hitT: 0,
    };
  }

  // ---------- сетка ----------
  solid(c, r) {
    if (c < 0 || c >= this.cols || r >= this.rows) return true;
    if (r < 0) return false;
    return !!this.grid[r][c];
  }

  solidAtPx(x, y) { return this.solid(Math.floor(x / this.cs), Math.floor(y / this.cs)); }

  overlapsSolid(x, y, w, h) {
    const cs = this.cs;
    const c0 = Math.floor(x / cs), c1 = Math.floor((x + w - 0.001) / cs);
    const r0 = Math.floor(y / cs), r1 = Math.floor((y + h - 0.001) / cs);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (this.solid(c, r)) return true;
    return false;
  }

  unstick(f) {
    let guard = 30;
    while (this.overlapsSolid(f.x, f.y, f.w, f.h) && guard--) f.y -= this.cs;
  }

  // ---------- падающие блоки ----------
  makeBlock(colFrac) {
    const types = Object.keys(G.BLOCK_DEFS);
    const type = G.U.choice(types);
    let mat = G.BLOCK_DEFS[type];
    for (let k = G.U.randi(4); k > 0; k--) mat = G.rotateMat(mat);
    const cells = G.matCells(mat);
    const minX = Math.min(...cells.map((c) => c[0])), maxX = Math.max(...cells.map((c) => c[0]));
    const maxY = Math.max(...cells.map((c) => c[1]));
    const lo = -minX, hi = this.cols - 1 - maxX;
    const col = G.U.clamp(Math.round(lo + colFrac * (hi - lo)), lo, hi);
    return { type, cells, col, row: -(maxY + 1), sub: 0, hit: [false, false], landed: false };
  }

  spawnBlock() {
    // половина блоков целится в одного из бойцов
    let frac = Math.random();
    if (Math.random() < 0.5) {
      const f = G.U.choice(this.fighters);
      frac = G.U.clamp((f.x + f.w / 2) / this.W + G.U.rand(-0.06, 0.06), 0, 1);
    }
    this.falling.push(this.makeBlock(frac));
  }

  fits(b, col, row) {
    for (const [cx, cy] of b.cells) {
      const c = col + cx, r = row + cy;
      if (c < 0 || c >= this.cols || r >= this.rows) return false;
      if (r >= 0 && this.grid[r][c]) return false;
    }
    return true;
  }

  land(b) {
    b.landed = true;
    for (const [cx, cy] of b.cells) {
      const r = b.row + cy;
      if (r >= 0) this.grid[r][b.col + cx] = { type: b.type, hp: G.CFG.duel.blockHp };
    }
    this.clearRows();
    if (this.fighters) for (const f of this.fighters) this.unstick(f);
  }

  clearRows() {
    for (let r = this.rows - 1; r >= 0; r--) {
      if (this.grid[r].every(Boolean)) {
        this.grid.splice(r, 1);
        this.grid.unshift(new Array(this.cols).fill(null));
        this.fx.push({ kind: 'line', y: (r + 0.5) * this.cs, t: 0, life: 0.5 });
        r++;
      }
    }
  }

  blockY(b) { return (b.row + (this.fits(b, b.col, b.row + 1) ? b.sub : 0)) * this.cs; }

  updateFalling(dt) {
    const D = G.CFG.duel, cs = this.cs;
    for (const b of this.falling) {
      b.sub += (D.blockFallSpeed * dt) / cs;
      while (b.sub >= 1) {
        if (this.fits(b, b.col, b.row + 1)) { b.row++; b.sub -= 1; }
        else { this.land(b); break; }
      }
      if (b.landed) continue;
      const by = this.blockY(b);
      for (const f of this.fighters) {
        if (b.hit[f.side]) continue;
        for (const [cx, cy] of b.cells) {
          const x = (b.col + cx) * cs, y = by + cy * cs;
          if (x < f.x + f.w && x + cs > f.x && y < f.y + f.h && y + cs > f.y) {
            b.hit[f.side] = true;
            this.damage(f, D.blockDmg);
            this.fx.push({ kind: 'text', x: f.x + f.w / 2, y: f.y, text: `−${D.blockDmg} блоком!`, color: '#ffd166', t: 0, life: 1 });
            break;
          }
        }
      }
    }
    this.falling = this.falling.filter((b) => !b.landed);
  }

  // ---------- бойцы ----------
  damage(f, dmg) {
    if (this.over) return;
    f.hp -= dmg;
    f.hitT = 0.12;
  }

  fire(f) {
    const sp = G.CFG.duel.bulletSpeed;
    const cx = f.x + f.w / 2, cy = f.y + 12;
    const ca = Math.cos(f.aim), sa = Math.sin(f.aim);
    this.bullets.push({
      x: cx + ca * 16, y: cy + sa * 16, vx: ca * sp, vy: sa * sp,
      side: f.side, dmg: f.dmg * (f.boostT > 0 ? 2 : 1), life: 1.2,
    });
    f.fireCd = f.rate;
  }

  moveFighter(f, dt) {
    const D = G.CFG.duel, cs = this.cs;
    f.vy = Math.min(f.vy + D.gravity * dt, 1200);
    if (f.vx) {
      const nx = f.x + f.vx * dt;
      if (!this.overlapsSolid(nx, f.y, f.w, f.h)) f.x = nx;
      else if (f.onGround && !this.overlapsSolid(nx, f.y - cs - 0.5, f.w, f.h)) {
        f.x = nx; f.y -= cs + 0.5; // ступенька в одну клетку
      }
    }
    const ny = f.y + f.vy * dt;
    if (!this.overlapsSolid(f.x, ny, f.w, f.h)) {
      f.y = ny;
      f.onGround = false;
    } else {
      if (f.vy > 0) {
        const snapped = Math.floor((ny + f.h) / cs) * cs - f.h - 0.01;
        if (!this.overlapsSolid(f.x, snapped, f.w, f.h)) f.y = snapped;
        f.onGround = true;
      } else {
        const snapped = (Math.floor(ny / cs) + 1) * cs + 0.01;
        if (!this.overlapsSolid(f.x, snapped, f.w, f.h)) f.y = snapped;
      }
      f.vy = 0;
    }
    if (f.y < -60) { f.y = -60; f.vy = Math.max(0, f.vy); }
  }

  los(a, b) {
    const x0 = a.x + a.w / 2, y0 = a.y + 12, x1 = b.x + b.w / 2, y1 = b.y + b.h / 2;
    const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 8);
    for (let i = 1; i < n; i++) {
      const x = x0 + ((x1 - x0) * i) / n, y = y0 + ((y1 - y0) * i) / n;
      if (y >= 0 && this.solidAtPx(x, y)) return false;
    }
    return true;
  }

  controlHuman(f) {
    const inp = this.input;
    f.vx = ((inp.right ? 1 : 0) - (inp.left ? 1 : 0)) * f.speed;
    if (inp.jump && f.onGround) { f.vy = -f.jumpV; f.onGround = false; }
    f.aim = Math.atan2(inp.aimY - (f.y + 12), inp.aimX - (f.x + f.w / 2));
    if (inp.fire && f.fireCd <= 0) this.fire(f);
  }

  controlAI(f, en, ai, dt) {
    const dx = en.x - f.x, dist = Math.abs(dx), toward = Math.sign(dx) || 1;
    ai.strafeT -= dt;
    if (ai.strafeT <= 0) { ai.strafe = Math.random() < 0.5 ? -1 : 1; ai.strafeT = G.U.rand(0.6, 1.4); }
    let dir = dist > 300 ? toward : dist < 140 ? -toward : ai.strafe;
    // уклонение от блока над головой
    for (const b of this.falling) {
      const bx0 = (b.col + Math.min(...b.cells.map((c) => c[0]))) * this.cs;
      const bx1 = (b.col + Math.max(...b.cells.map((c) => c[0])) + 1) * this.cs;
      if (bx0 < f.x + f.w + 10 && bx1 > f.x - 10 && this.blockY(b) < f.y && this.blockY(b) > f.y - 260) {
        dir = (bx0 + bx1) / 2 < f.x + f.w / 2 ? 1 : -1;
      }
    }
    f.vx = dir * f.speed * 0.9;
    const aheadX = dir > 0 ? f.x + f.w + 4 : f.x - 4;
    const blocked = this.solidAtPx(aheadX, f.y + f.h - 6) && this.solidAtPx(aheadX, f.y + f.h - 6 - this.cs);
    if (f.onGround && (blocked || Math.random() < 0.008 || en.y + en.h < f.y - 30)) { f.vy = -f.jumpV; f.onGround = false; }
    const ex = en.x + en.w / 2, ey = en.y + en.h / 2;
    f.aim = Math.atan2(ey - (f.y + 12), ex - (f.x + f.w / 2)) + G.U.rand(-0.09, 0.09);
    if (f.fireCd <= 0 && (this.los(f, en) || Math.random() < 0.03)) this.fire(f);
  }

  updateBullets(dt) {
    const keep = [];
    for (const b of this.bullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0 || b.x < 0 || b.x >= this.W || b.y >= this.H || b.y < -80) continue;
      const c = Math.floor(b.x / this.cs), r = Math.floor(b.y / this.cs);
      const cell = r >= 0 ? this.grid[r][c] : null;
      if (cell) {
        cell.hp--;
        if (cell.hp <= 0) this.grid[r][c] = null;
        this.fx.push({ kind: 'spark', x: b.x, y: b.y, color: '#cfd8dc', t: 0, life: 0.15 });
        continue;
      }
      const en = this.fighters[1 - b.side];
      if (b.x > en.x && b.x < en.x + en.w && b.y > en.y && b.y < en.y + en.h) {
        this.damage(en, b.dmg);
        this.fx.push({ kind: 'spark', x: b.x, y: b.y, color: '#fff3b0', t: 0, life: 0.15 });
        continue;
      }
      keep.push(b);
    }
    this.bullets = keep;
  }

  update(dt) {
    if (this.over) { this.overT -= dt; return; }
    const D = G.CFG.duel;
    this.t -= dt;
    const [a, b] = this.fighters;
    for (const f of this.fighters) {
      f.fireCd -= dt; f.boostT -= dt; f.hitT -= dt;
      const en = this.fighters[1 - f.side];
      if (this.autoplay[f.side]) this.controlAI(f, en, this.ai[f.side], dt);
      else this.controlHuman(f);
      this.moveFighter(f, dt);
    }
    this.blockT -= dt;
    if (this.blockT <= 0) { this.spawnBlock(); this.blockT = G.U.rand(...D.blockEvery); }
    this.updateFalling(dt);
    this.updateBullets(dt);
    for (const f of this.fx) f.t += dt;
    this.fx = this.fx.filter((f) => f.t < f.life);

    if (a.hp <= 0 || b.hp <= 0) {
      this.over = true;
      this.winner = a.hp <= 0 && b.hp <= 0 ? this.defSide : a.hp <= 0 ? 1 : 0;
      this.endReason = 'нокаут';
    } else if (this.t <= 0) {
      this.over = true;
      const fa = a.hp / a.maxHp, fb = b.hp / b.maxHp;
      this.winner = fa === fb ? this.defSide : fa > fb ? 0 : 1;
      this.endReason = 'по очкам (время вышло)';
    }
  }
};
