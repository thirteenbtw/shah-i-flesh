// Отрисовка на Canvas 2D. Только читает состояние игры.
window.G = window.G || {};

G.COL = {
  bg: '#12141c', panel: '#1a1d28', line: '#2c3142', text: '#e6e8ef', dim: '#8a90a3',
  cellA: '#2b3040', cellB: '#232734',
  me: '#36d1dc', bot: '#ff9f1c', gold: '#ffd166', danger: '#ff4d6d', ok: '#6cd96c',
};

G.Render = class {
  constructor(ctx) {
    this.ctx = ctx;
    this.ui = { buttons: [] };
  }

  // ---------- примитивы ----------
  font(px, weight = 500) { this.ctx.font = `${weight} ${px}px "Segoe UI", system-ui, sans-serif`; }

  text(s, x, y, color = G.COL.text, px = 14, align = 'left', weight = 500) {
    const c = this.ctx;
    this.font(px, weight);
    c.fillStyle = color;
    c.textAlign = align;
    c.textBaseline = 'middle';
    c.fillText(s, x, y);
  }

  rect(x, y, w, h, fill, stroke) {
    const c = this.ctx;
    if (fill) { c.fillStyle = fill; c.fillRect(x, y, w, h); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = 1; c.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1); }
  }

  roundRect(x, y, w, h, r, fill, stroke, lw = 1) {
    const c = this.ctx;
    c.beginPath();
    c.roundRect(x, y, w, h, r);
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.stroke(); }
  }

  bar(x, y, w, h, frac, color, bg = '#0c0e14') {
    this.rect(x, y, w, h, bg);
    this.rect(x, y, Math.max(0, Math.min(1, frac)) * w, h, color);
  }

  cell(x, y, cs, color) {
    this.rect(x + 1, y + 1, cs - 2, cs - 2, color);
    this.rect(x + 1, y + 1, cs - 2, 3, 'rgba(255,255,255,0.25)');
  }

  button(x, y, w, h, label, kind, enabled, primary = false) {
    this.roundRect(x, y, w, h, 8, enabled ? (primary ? '#3a4a8a' : '#2d3550') : '#1f2230', enabled ? '#7c9cff' : G.COL.line, primary ? 2 : 1);
    this.text(label, x + w / 2, y + h / 2, enabled ? G.COL.text : '#555b6e', 15, 'center', 700);
    this.ui.buttons.push({ x, y, w, h, kind, enabled });
  }

  glyph(type, x, y, px, color) {
    const c = this.ctx;
    c.font = `${px}px "Segoe UI Symbol", "Noto Sans Symbols 2", serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = color;
    c.fillText(G.PIECE_GLYPH[type], x, y);
  }

  drawCard(x, y, card, hidden, w = 64, h = 90) {
    if (hidden) {
      this.roundRect(x, y, w, h, 6, '#3a2f5c', '#8b7fd1');
      this.roundRect(x + 6, y + 6, w - 12, h - 12, 4, null, 'rgba(255,255,255,0.25)');
      return;
    }
    const red = card.s === 1 || card.s === 2;
    this.roundRect(x, y, w, h, 6, '#f5f3ee', '#999');
    const col = red ? '#d43c3c' : '#1c1c24';
    this.text(G.rankStr(card.r), x + 8, y + 16, col, 20, 'left', 700);
    this.text(G.SUITS[card.s], x + w / 2, y + h * 0.62, col, 34, 'center');
  }

  drawDie(x, y, s, v, color, dim) {
    this.ctx.globalAlpha = dim ? 0.35 : 1;
    this.roundRect(x, y, s, s, 9, '#f5f3ee', color, dim ? 1 : 3);
    const P = {
      1: [[0.5, 0.5]], 2: [[0.25, 0.25], [0.75, 0.75]], 3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
      4: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]],
      5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]],
      6: [[0.25, 0.22], [0.75, 0.22], [0.25, 0.5], [0.75, 0.5], [0.25, 0.78], [0.75, 0.78]],
    };
    for (const [px, py] of P[v]) {
      this.ctx.beginPath();
      this.ctx.arc(x + px * s, y + py * s, s * 0.09, 0, Math.PI * 2);
      this.ctx.fillStyle = '#1c1c24';
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1;
  }

  // ---------- кадр ----------
  draw(game, input) {
    this.ui.buttons = [];
    this.rect(0, 0, G.CFG.W, G.CFG.H, G.COL.bg);
    this.drawLeft(game);
    this.drawRight(game);
    if (game.state === 'duel' || (game.state === 'result' && game.duel)) this.drawDuel(game);
    else this.drawBoard(game, input);
    if (game.state === 'poker') this.drawPoker(game);
    if (game.state === 'dice') this.drawDice(game);
    if (game.state === 'result') this.drawResult(game);
    if (game.qte) this.drawQTE(game.qte);
  }

  // ---------- левая панель ----------
  drawLeft(game) {
    this.rect(0, 0, 340, G.CFG.H, G.COL.panel);
    this.text('ШАХ И ФЛЕШ', 20, 30, G.COL.gold, 22, 'left', 800);
    const st = {
      chess: game.turn === 0 ? 'Ваш ход' : 'Ход бота…',
      poker: 'Битва · 1/3 · покер', dice: 'Битва · 2/3 · кубики', duel: 'Битва · 3/3 · дуэль', result: 'Итог битвы',
    }[game.state];
    this.text(st, 20, 70, game.state === 'chess' && game.turn === 0 ? G.COL.me : G.COL.text, 18, 'left', 700);
    const qb = game.qteBonus;
    this.text(`Бонус к кубикам (QTE): ${qb > 0 ? '+' : ''}${qb}`, 20, 102, qb > 0 ? G.COL.ok : qb < 0 ? G.COL.danger : G.COL.dim, 14, 'left', 600);

    this.text('Вы взяли:', 20, 140, G.COL.dim, 13);
    game.captured[0].forEach((t, i) => this.glyph(t, 100 + (i % 10) * 22, 140 + Math.floor(i / 10) * 24, 22, G.COL.bot));
    this.text('Бот взял:', 20, 196, G.COL.dim, 13);
    game.captured[1].forEach((t, i) => this.glyph(t, 100 + (i % 10) * 22, 196 + Math.floor(i / 10) * 24, 22, G.COL.me));

    this.text('Журнал', 20, 260, G.COL.dim, 12, 'left', 700);
    game.messages.forEach((m, i) => {
      this.ctx.globalAlpha = Math.max(0.3, 1 - i * 0.08);
      this.wrapText(m, 20, 284 + i * 40, 300, 17, 13);
      this.ctx.globalAlpha = 1;
    });
  }

  wrapText(s, x, y, maxW, lh, px) {
    this.font(px);
    const words = s.split(' ');
    let line = '', ly = y;
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (this.ctx.measureText(test).width > maxW && line) { this.text(line, x, ly, G.COL.text, px); line = w; ly += lh; }
      else line = test;
    }
    if (line) this.text(line, x, ly, G.COL.text, px);
  }

  // ---------- правая панель ----------
  drawRight(game) {
    const x0 = 945;
    this.rect(x0 - 5, 0, G.CFG.W - x0 + 5, G.CFG.H, G.COL.panel);
    let lines;
    if (game.state === 'duel') {
      lines = ['УПРАВЛЕНИЕ В ДУЭЛИ', 'A / D — бег', 'W — прыжок', 'Мышь — прицел, ЛКМ — огонь',
        'Пробел — QTE', '', 'Блоки падают сверху: красная', 'полоса показывает, куда.', 'Блок на голову — урон.',
        'Пули разбивают блоки.', 'Время вышло — победа по % HP,', 'при равенстве — защитнику.'];
    } else {
      lines = ['КАК ИГРАТЬ', '1. Ходите фигурами (клик → клик).', '2. Взятие = битва:',
        '   покер → кубики → дуэль.', '3. Покерная комбинация даёт бонус', '   к кубикам; победитель покера', '   бросает 3 кубика вместо 2.',
        '4. Кубики решают урон и HP в дуэли.', '5. Проиграл дуэль атакующий —', '   погибает он сам.',
        '6. QTE: пробел, когда стрелка', '   в зелёном сегменте.', '7. Победа — король соперника', '   пал в дуэли.'];
    }
    lines.forEach((l, i) => this.text(l, x0 + 10, 30 + i * 22, i === 0 ? G.COL.gold : G.COL.text, i === 0 ? 14 : 13, 'left', i === 0 ? 800 : 500));

    const y0 = 360;
    this.text('БОЙЦЫ В ДУЭЛИ', x0 + 10, y0, G.COL.gold, 14, 'left', 800);
    this.text('HP', x0 + 130, y0 + 26, G.COL.dim, 12, 'center');
    this.text('урон', x0 + 180, y0 + 26, G.COL.dim, 12, 'center');
    this.text('выстр/с', x0 + 240, y0 + 26, G.COL.dim, 12, 'center');
    ['K', 'Q', 'R', 'B', 'N', 'P'].forEach((t, i) => {
      const s = G.CFG.fighter[t], y = y0 + 52 + i * 26;
      this.glyph(t, x0 + 22, y, 20, G.COL.text);
      this.text(G.PIECE_NAME[t], x0 + 40, y, G.COL.text, 13);
      this.text(String(s.hp), x0 + 130, y, G.COL.text, 13, 'center');
      this.text(String(s.dmg), x0 + 180, y, G.COL.text, 13, 'center');
      this.text((1 / s.rate).toFixed(1), x0 + 240, y, G.COL.text, 13, 'center');
    });
    this.text('Кубики: урон ×(0,6 + 0,05·итог),', x0 + 10, y0 + 222, G.COL.dim, 12);
    this.text('HP + 4·итог.', x0 + 10, y0 + 240, G.COL.dim, 12);
  }

  // ---------- шахматная доска ----------
  drawBoard(game, input) {
    const c = this.ctx, B = G.CFG.board, cs = B.cell, ch = game.chess;
    c.save();
    c.translate(B.x, B.y);
    for (let r = 0; r < 8; r++)
      for (let col = 0; col < 8; col++) this.rect(col * cs, r * cs, cs, cs, (r + col) % 2 ? G.COL.cellB : G.COL.cellA);
    if (ch.lastMove) {
      for (const [x, y] of [ch.lastMove.from, ch.lastMove.to]) this.rect(x * cs, y * cs, cs, cs, 'rgba(255,209,102,0.12)');
    }
    this.rect(-2, -2, 8 * cs + 4, 8 * cs + 4, null, game.turn === 0 && game.state === 'chess' ? G.COL.me : G.COL.line);

    const sel = game.selected;
    let hoverChance = null;
    if (sel) {
      this.roundRect(sel[0] * cs + 2, sel[1] * cs + 2, cs - 4, cs - 4, 8, null, G.COL.gold, 3);
      const me = ch.at(...sel);
      for (const [mc, mr] of ch.moves(...sel)) {
        const t = ch.at(mc, mr);
        c.beginPath();
        if (t) {
          c.arc((mc + 0.5) * cs, (mr + 0.5) * cs, 31, 0, Math.PI * 2);
          c.strokeStyle = G.COL.danger; c.lineWidth = 3; c.stroke();
          if (input.boardCell && input.boardCell[0] === mc && input.boardCell[1] === mr) {
            hoverChance = { x: (mc + 0.5) * cs, y: mr * cs, p: G.winProb(me.type, t.type) };
          }
        } else {
          c.arc((mc + 0.5) * cs, (mr + 0.5) * cs, 8, 0, Math.PI * 2);
          c.fillStyle = 'rgba(108,217,108,0.7)'; c.fill();
        }
      }
    }

    for (let i = 0; i < 64; i++) {
      const p = ch.b[i];
      if (!p) continue;
      const x = (i % 8 + 0.5) * cs, y = (Math.floor(i / 8) + 0.5) * cs;
      c.beginPath();
      c.arc(x, y, 27, 0, Math.PI * 2);
      c.fillStyle = p.side === 0 ? '#ece6d6' : '#2a2433';
      c.fill();
      c.strokeStyle = p.side === 0 ? G.COL.me : G.COL.bot;
      c.lineWidth = 2.5;
      c.stroke();
      this.glyph(p.type, x, y + 2, 36, p.side === 0 ? '#2a2433' : '#f2e9e4');
    }

    if (hoverChance) {
      const t = `Шанс в дуэли ~${Math.round(hoverChance.p * 100)}% (без удачи)`;
      this.roundRect(hoverChance.x - 130, hoverChance.y - 34, 260, 26, 6, 'rgba(12,14,22,0.92)', G.COL.danger);
      this.text(t, hoverChance.x, hoverChance.y - 21, G.COL.text, 12, 'center', 600);
    }
    c.restore();
    if (game.state === 'chess') {
      this.text(game.turn === 0 ? 'Ваш ход: выберите фигуру' : 'Бот думает…', B.x + 4 * cs, 36, game.turn === 0 ? G.COL.me : G.COL.bot, 18, 'center', 700);
    }
  }

  overlayPanel() {
    const B = G.CFG.board;
    this.roundRect(B.x, B.y, 8 * B.cell, 8 * B.cell, 10, 'rgba(14,16,24,0.95)', G.COL.line);
  }

  battleTitle(game) {
    const b = game.battle;
    this.text(`⚔ ${G.attackTitle(b.attSide, b.att.type, b.def.type)}`, 640, 36, G.COL.gold, 20, 'center', 800);
  }

  // ---------- покер ----------
  drawPoker(game) {
    const b = game.battle;
    this.overlayPanel();
    this.battleTitle(game);
    this.text('ПОКЕР — определяет удачу в кубиках', 640, 100, G.COL.text, 17, 'center', 700);
    this.text(b.drawn ? 'Вскрытие' : 'Отметьте карты для обмена (один раз) и нажмите кнопку', 640, 124, G.COL.dim, 13, 'center');

    this.text('Бот', 640, 156, G.COL.bot, 14, 'center', 700);
    b.hands[1].forEach((card, i) => this.drawCard(460 + i * 74, 170, card, !b.drawn));
    if (b.drawn) {
      this.text(`${G.HAND_NAMES[b.cats[1]]} (бонус +${b.cats[1]}) · сбросил карт: ${b.botDiscarded}`, 640, 278, G.COL.bot, 14, 'center', 600);
      const v = b.pokerWinner === 0 ? 'Вы выиграли покер — бросаете 3 кубика'
        : b.pokerWinner === 1 ? 'Бот выиграл покер — бросает 3 кубика' : 'Ничья — оба бросают по 2 кубика';
      this.text(v, 640, 330, b.pokerWinner === 0 ? G.COL.ok : b.pokerWinner === 1 ? G.COL.danger : G.COL.text, 18, 'center', 800);
    }

    this.text('Вы', 640, 380, G.COL.me, 14, 'center', 700);
    b.hands[0].forEach((card, i) => {
      const x = 460 + i * 74, y = b.sel[i] && !b.drawn ? 382 : 400;
      this.drawCard(x, y, card, false);
      if (b.sel[i] && !b.drawn) { this.roundRect(x, y, 64, 90, 6, 'rgba(255,77,109,0.25)', G.COL.danger, 3); this.text('сброс', x + 32, y + 104, G.COL.danger, 12, 'center', 700); }
      if (b.sel[i] && b.drawn) { this.roundRect(x, y, 64, 90, 6, null, G.COL.ok, 3); this.text('новая', x + 32, y + 104, G.COL.ok, 12, 'center', 700); }
      if (!b.drawn) this.ui.buttons.push({ x, y, w: 64, h: 90, kind: 'card' + i, enabled: true });
    });
    const myCat = G.eval5(b.hands[0]).cat;
    this.text(`${G.HAND_NAMES[myCat]} (бонус +${myCat})`, 640, 525, G.COL.me, 15, 'center', 700);

    const nSel = b.sel.filter(Boolean).length;
    const label = b.drawn ? 'Бросить кубики (Enter)' : nSel ? `Обменять ${nSel} (Enter)` : 'Оставить все (Enter)';
    this.button(640 - 140, 570, 280, 46, label, 'advance', true, true);
  }

  // ---------- кубики ----------
  drawDice(game) {
    const b = game.battle;
    this.overlayPanel();
    this.battleTitle(game);
    this.text('БРОСОК КУБИКОВ — сила в дуэли', 640, 100, G.COL.text, 17, 'center', 700);
    const rolling = game.diceT > 0;
    [0, 1].forEach((s) => {
      const d = b.dice[s], y = s === 0 ? 150 : 370;
      const col = s === 0 ? G.COL.me : G.COL.bot;
      this.text(`${s === 0 ? 'Вы' : 'Бот'} · ${G.PIECE_NAME[b.types[s]]}`, 400, y, col, 16, 'left', 700);
      d.rolls.forEach((v, i) => {
        const face = rolling ? 1 + Math.floor((performance.now() / 70 + i * 3 + s * 5) % 6) : v;
        this.drawDie(400 + i * 72, y + 20, 58, face, col, !rolling && !d.kept.includes(i));
      });
      if (!rolling) {
        const parts = `Кубики ${d.sum} + покер ${d.poker}${s === 0 ? ` + QTE ${d.qte}` : ''} = ${d.total}`;
        this.text(parts, 400, y + 104, G.COL.text, 15, 'left', 600);
        const hp = Math.round(G.CFG.fighter[b.types[s]].hp + d.hpBonus);
        this.text(`Урон ×${d.dmgMul.toFixed(2)} · HP ${hp}`, 400, y + 128, col, 15, 'left', 700);
      }
    });
    this.button(640 - 140, 570, 280, 46, rolling ? 'Бросаем…' : 'В бой! (Enter)', 'advance', !rolling, true);
  }

  // ---------- дуэль ----------
  drawDuel(game) {
    const d = game.duel, A = G.CFG.arena, c = this.ctx, cs = d.cs;
    c.save();
    c.beginPath();
    c.rect(A.x, A.y, A.w, A.h);
    c.clip();
    const grad = c.createLinearGradient(0, A.y, 0, A.y + A.h);
    grad.addColorStop(0, '#1b2140');
    grad.addColorStop(1, '#0e1020');
    c.fillStyle = grad;
    c.fillRect(A.x, A.y, A.w, A.h);
    c.translate(A.x, A.y);

    c.strokeStyle = 'rgba(255,255,255,0.03)';
    c.lineWidth = 1;
    for (let i = 1; i < d.cols; i++) { c.beginPath(); c.moveTo(i * cs + 0.5, 0); c.lineTo(i * cs + 0.5, A.h); c.stroke(); }

    // предупреждения о падающих блоках
    for (const b of d.falling) {
      const xs = b.cells.map(([cx]) => (b.col + cx) * cs);
      const x0 = Math.min(...xs), x1 = Math.max(...xs) + cs;
      c.fillStyle = 'rgba(255,77,109,0.10)';
      c.fillRect(x0, 0, x1 - x0, A.h);
      c.fillStyle = 'rgba(255,77,109,0.8)';
      c.fillRect(x0, 0, x1 - x0, 4);
    }

    for (let r = 0; r < d.rows; r++)
      for (let col = 0; col < d.cols; col++) {
        const cell = d.grid[r][col];
        if (!cell) continue;
        c.globalAlpha = cell.hp < G.CFG.duel.blockHp ? 0.55 : 1;
        this.cell(col * cs, r * cs, cs, G.BLOCK_COLORS[cell.type]);
        c.globalAlpha = 1;
      }

    for (const b of d.falling) {
      const by = d.blockY(b);
      for (const [cx, cy] of b.cells) this.cell((b.col + cx) * cs, by + cy * cs, cs, G.BLOCK_COLORS[b.type]);
    }

    for (const f of d.fighters) this.drawFighter(f);

    for (const b of d.bullets) {
      c.beginPath();
      c.arc(b.x, b.y, 4, 0, Math.PI * 2);
      c.fillStyle = b.side === 0 ? '#bff4f8' : '#ffd9a8';
      c.fill();
    }

    for (const f of d.fx) {
      const k = f.t / f.life;
      c.globalAlpha = 1 - k;
      if (f.kind === 'spark') { c.beginPath(); c.arc(f.x, f.y, 3 + 6 * k, 0, Math.PI * 2); c.fillStyle = f.color; c.fill(); }
      else if (f.kind === 'text') this.text(f.text, f.x, f.y - 10 - k * 30, f.color, 14, 'center', 700);
      else if (f.kind === 'line') { c.fillStyle = '#fff'; c.fillRect(0, f.y - cs / 2, A.w, cs); }
      c.globalAlpha = 1;
    }
    c.restore();
    this.rect(A.x - 2, A.y - 2, A.w + 4, A.h + 4, null, G.COL.line);

    // HUD
    const [a, b] = d.fighters;
    this.text(`Вы · ${G.PIECE_NAME[a.type]}`, A.x, 18, G.COL.me, 14, 'left', 700);
    this.text(`${Math.max(0, Math.ceil(a.hp))}/${a.maxHp}`, A.x + 230, 18, G.COL.text, 13, 'right');
    this.bar(A.x, 32, 230, 12, a.hp / a.maxHp, G.COL.me);
    this.text(`Бот · ${G.PIECE_NAME[b.type]}`, A.x + A.w, 18, G.COL.bot, 14, 'right', 700);
    this.text(`${Math.max(0, Math.ceil(b.hp))}/${b.maxHp}`, A.x + A.w - 230, 18, G.COL.text, 13, 'left');
    this.bar(A.x + A.w - 230, 32, 230, 12, b.hp / b.maxHp, G.COL.bot);
    this.text(String(Math.max(0, Math.ceil(d.t))), A.x + A.w / 2, 34, d.t < 10 ? G.COL.danger : G.COL.text, 24, 'center', 800);
    if (game.battle) {
      const role = game.battle.attSide === 0 ? 'Вы атакуете' : 'Вы защищаетесь';
      this.text(role, A.x + A.w / 2, 60, G.COL.dim, 12, 'center');
    }
    if (d.over && game.state === 'duel') {
      this.roundRect(A.x + 138, A.y + 240, 300, 70, 10, 'rgba(12,14,22,0.9)', G.COL.gold, 2);
      this.text(d.winner === 0 ? 'Дуэль выиграна!' : 'Дуэль проиграна', A.x + 288, A.y + 266, d.winner === 0 ? G.COL.ok : G.COL.danger, 22, 'center', 800);
      this.text(d.endReason, A.x + 288, A.y + 292, G.COL.dim, 13, 'center');
    }
  }

  drawFighter(f) {
    const c = this.ctx;
    if (f.hp <= 0) c.globalAlpha = 0.35;
    const col = f.side === 0 ? G.COL.me : G.COL.bot;
    const cx = f.x + f.w / 2, gy = f.y + 12;
    c.beginPath(); c.moveTo(cx, gy); c.lineTo(cx + Math.cos(f.aim) * 22, gy + Math.sin(f.aim) * 22);
    c.strokeStyle = '#d0d4e0'; c.lineWidth = 5; c.stroke();
    if (f.boostT > 0) this.roundRect(f.x - 4, f.y - 4, f.w + 8, f.h + 8, 9, null, G.COL.gold, 2);
    this.roundRect(f.x, f.y, f.w, f.h, 7, f.hitT > 0 ? '#fff' : col, '#0c0e14', 2);
    this.glyph(f.type, cx, f.y + f.h / 2 + 2, 22, '#14161f');
    this.bar(f.x - 4, f.y - 10, f.w + 8, 4, f.hp / f.maxHp, f.hp / f.maxHp > 0.35 ? G.COL.ok : G.COL.danger);
    c.globalAlpha = 1;
  }

  drawResult(game) {
    const b = game.battle;
    if (!b) return;
    const B = G.CFG.board, cx = B.x + 4 * B.cell, cy = B.y + 4 * B.cell;
    const won = b.duelWinner === b.attSide;
    const mine = (b.attSide === 0) === won;
    this.roundRect(cx - 240, cy - 50, 480, 100, 12, 'rgba(12,14,22,0.92)', mine ? G.COL.ok : G.COL.danger, 2);
    const title = won ? `${G.PIECE_NAME[b.att.type]} берёт ${G.PIECE_ACC[b.def.type]}` : `${G.PIECE_NAME[b.def.type]} отбивает атаку`;
    this.text(title, cx, cy - 14, mine ? G.COL.ok : G.COL.danger, 24, 'center', 800);
    this.text(won ? 'Взятие состоялось' : 'Атакующая фигура погибла', cx, cy + 20, G.COL.text, 14, 'center');
  }

  // ---------- QTE ----------
  drawQTE(q) {
    const c = this.ctx, B = G.CFG.board;
    const cx = B.x + 4 * B.cell, cy = B.y + 4 * B.cell, R = 80;
    c.save();
    c.fillStyle = 'rgba(8,10,16,0.55)';
    c.fillRect(B.x, B.y, 8 * B.cell, 8 * B.cell);
    c.beginPath(); c.arc(cx, cy, R + 34, 0, Math.PI * 2); c.fillStyle = 'rgba(14,16,24,0.95)'; c.fill();
    c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.strokeStyle = '#3a4060'; c.lineWidth = 16; c.stroke();
    c.beginPath(); c.arc(cx, cy, R, q.segStart, q.segStart + q.seg);
    c.strokeStyle = q.result === false ? G.COL.danger : G.COL.ok; c.lineWidth = 18; c.stroke();
    c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(q.angle) * (R + 14), cy + Math.sin(q.angle) * (R + 14));
    c.strokeStyle = G.COL.gold; c.lineWidth = 5; c.lineCap = 'round'; c.stroke();
    c.beginPath(); c.arc(cx, cy, 8, 0, Math.PI * 2); c.fillStyle = G.COL.gold; c.fill();
    c.restore();
    if (q.result === null) {
      this.text('QTE! ПРОБЕЛ', cx, cy - R - 52, G.COL.gold, 22, 'center', 800);
      const hint = q.ctx === 'duel' ? `успех: +${G.CFG.qte.duelHeal} HP и двойной урон · провал: −${G.CFG.qte.duelHurt} HP` : 'успех: +1 к кубикам · провал: −1';
      this.text(hint, cx, cy + R + 52, G.COL.text, 13, 'center', 600);
    } else {
      this.text(q.result ? 'ТОЧНО!' : 'МИМО!', cx, cy - R - 52, q.result ? G.COL.ok : G.COL.danger, 26, 'center', 800);
      this.text(q.msg, cx, cy + R + 52, G.COL.text, 14, 'center', 600);
    }
  }

  // ---------- экраны ----------
  drawOverlay(title, lines, sub) {
    this.rect(0, 0, G.CFG.W, G.CFG.H, 'rgba(8,10,16,0.88)');
    this.text(title, G.CFG.W / 2, 140, G.COL.gold, 44, 'center', 800);
    lines.forEach((l, i) => this.text(l, G.CFG.W / 2, 220 + i * 28, i === 0 ? G.COL.text : G.COL.dim, 16, 'center'));
    this.text(sub, G.CFG.W / 2, 220 + lines.length * 28 + 40, G.COL.me, 18, 'center', 700);
  }
};
