// Матч: шахматы → (взятие) → покер → кубики → дуэль → результат взятия.
window.G = window.G || {};

G.Game = class {
  constructor() {
    this.chess = new G.Chess();
    this.state = 'chess'; // chess | poker | dice | duel | result
    this.turn = 0;
    this.qteBonus = 0;
    this.qte = null;
    this.qteT = G.U.rand(...G.CFG.qte.chessEvery);
    this.messages = [];
    this.captured = [[], []];
    this.botT = 0;
    this.selected = null;
    this.battle = null;
    this.duel = null;
    this.over = false;
    this.winner = -1;
    this.reason = '';
    this.t = 0;
    this.botPlaysPlayer = false; // для автотестов: бот управляет и стороной 0
    this.log('Ваш ход. Взятие фигуры = битва.');
  }

  log(text) {
    this.messages.unshift(text);
    if (this.messages.length > 10) this.messages.pop();
  }

  gameOver(winner, reason) {
    if (this.over) return;
    this.over = true;
    this.winner = winner;
    this.reason = reason;
  }

  qteActive() { return !!this.qte && this.qte.result === null; }

  // ---------- шахматы ----------
  clickBoard(c, r) {
    if (this.state !== 'chess' || this.turn !== 0 || this.qteActive()) return;
    if (this.selected) {
      const [sc, sr] = this.selected;
      if (this.chess.moves(sc, sr).some(([x, y]) => x === c && y === r)) {
        this.selected = null;
        this.makeMove(0, [sc, sr], [c, r]);
        return;
      }
    }
    const p = this.chess.at(c, r);
    this.selected = p && p.side === 0 ? [c, r] : null;
  }

  makeMove(side, from, to) {
    const att = this.chess.at(...from), def = this.chess.at(...to);
    if (def) { this.startBattle(side, from, to, att, def); return; }
    this.chess.move(from, to);
    this.endTurn();
  }

  endTurn() {
    this.turn = 1 - this.turn;
    if (this.turn === 1 || this.botPlaysPlayer) this.botT = G.U.rand(0.6, 1.1);
    if (!this.chess.allMoves(this.turn).length) this.gameOver(1 - this.turn, 'У соперника нет ходов');
  }

  // ---------- битва ----------
  startBattle(attSide, from, to, att, def) {
    const deck = G.newDeck();
    const deal = () => [deck.pop(), deck.pop(), deck.pop(), deck.pop(), deck.pop()];
    this.battle = {
      attSide, defSide: 1 - attSide, from, to,
      att: { ...att }, def: { ...def },
      types: attSide === 0 ? [att.type, def.type] : [def.type, att.type],
      deck, hands: [deal(), deal()], sel: [false, false, false, false, false],
      drawn: false, cats: null, pokerWinner: -1, dice: null,
    };
    this.state = 'poker';
    this.log(G.attackTitle(attSide, att.type, def.type));
  }

  toggleCard(i) {
    if (this.state === 'poker' && !this.battle.drawn) this.battle.sel[i] = !this.battle.sel[i];
  }

  pokerDraw() {
    const b = this.battle;
    if (this.state !== 'poker' || b.drawn) return;
    b.hands[0] = b.hands[0].map((c, i) => (b.sel[i] ? b.deck.pop() : c));
    const disc = G.botDiscard(b.hands[1]);
    disc.forEach((i) => (b.hands[1][i] = b.deck.pop()));
    b.botDiscarded = disc.length;
    const e0 = G.eval5(b.hands[0]), e1 = G.eval5(b.hands[1]);
    b.cats = [e0.cat, e1.cat];
    b.pokerWinner = e0.value > e1.value ? 0 : e1.value > e0.value ? 1 : -1;
    b.drawn = true;
    this.log(`Покер: ${G.HAND_NAMES[e0.cat]} против ${G.HAND_NAMES[e1.cat]}`);
  }

  toDice() {
    const b = this.battle, C = G.CFG.dice;
    if (this.state !== 'poker' || !b.drawn) return;
    b.dice = [0, 1].map((s) => {
      const n = b.pokerWinner === s ? 3 : 2;
      const rolls = Array.from({ length: n }, () => 1 + G.U.randi(6));
      const order = rolls.map((v, i) => i).sort((x, y) => rolls[y] - rolls[x]);
      const kept = order.slice(0, 2);
      const sum = rolls[kept[0]] + rolls[kept[1]];
      const qte = s === 0 ? this.qteBonus : 0;
      const total = Math.max(2, sum + b.cats[s] + qte);
      return { rolls, kept, sum, poker: b.cats[s], qte, total, dmgMul: C.dmgBase + total * C.dmgPer, hpBonus: total * C.hpPer };
    });
    this.qteBonus = 0;
    this.state = 'dice';
    this.diceT = 1.3;
  }

  toDuel() {
    if (this.state !== 'dice' || this.diceT > 0) return;
    this.duel = new G.Duel(this.battle, this.battle.dice);
    if (this.botPlaysPlayer) this.duel.autoplay[0] = true;
    this.state = 'duel';
    this.qteT = G.U.rand(...G.CFG.qte.duelEvery);
  }

  finishDuel() {
    const b = this.battle, w = this.duel.winner;
    b.duelWinner = w;
    b.endReason = this.duel.endReason;
    if (w === b.attSide) {
      this.captured[b.attSide].push(b.def.type);
      this.chess.remove(...b.to);
      this.chess.move(b.from, b.to);
      this.log(`${b.attSide === 0 ? 'Вы взяли' : 'Бот взял'} ${G.PIECE_ACC[b.def.type]} (${b.endReason})`);
    } else {
      this.captured[b.defSide].push(b.att.type);
      this.chess.remove(...b.from);
      this.log(`Атака отбита — погибает ${b.attSide === 0 ? 'ваша фигура' : 'фигура бота'}: ${G.PIECE_NAME[b.att.type]} (${b.endReason})`);
    }
    this.state = 'result';
    this.resultT = 2.2;
    if (!this.chess.hasKing(0)) this.gameOver(1, 'Ваш король пал в дуэли');
    else if (!this.chess.hasKing(1)) this.gameOver(0, 'Вражеский король пал в дуэли');
  }

  // Enter / главная кнопка
  advance() {
    if (this.qteActive()) return;
    if (this.state === 'poker') { if (this.battle.drawn) this.toDice(); else this.pokerDraw(); }
    else if (this.state === 'dice') this.toDuel();
  }

  // ---------- QTE ----------
  pressQTE() {
    if (!this.qteActive()) return false;
    this.qte.press();
    this.applyQTE();
    return true;
  }

  applyQTE() {
    const q = this.qte, ok = q.result, C = G.CFG.qte;
    if (q.ctx === 'duel') {
      if (!this.duel || this.duel.over) { q.msg = 'Дуэль уже закончилась'; return; }
      const f = this.duel.fighters[0];
      if (ok) { f.hp = Math.min(f.maxHp, f.hp + C.duelHeal); f.boostT = C.boostTime; q.msg = `Точно! +${C.duelHeal} HP и двойной урон`; }
      else { this.duel.damage(f, C.duelHurt); q.msg = `Мимо! −${C.duelHurt} HP`; }
    } else {
      this.qteBonus = G.U.clamp(this.qteBonus + (ok ? 1 : -1), C.bonusMin, C.bonusMax);
      q.msg = ok ? 'Точно! +1 к следующему броску кубиков' : 'Мимо! −1 к следующему броску';
    }
    this.log('QTE: ' + q.msg);
  }

  updateQTE(dt) {
    if (this.qte) {
      if (this.qte.result === null) {
        this.qte.update(dt);
        if (this.botPlaysPlayer && this.qte.rel() < this.qte.seg * 0.5 && Math.random() < 0.5) this.qte.press();
        if (this.qte.result !== null) this.applyQTE();
      } else {
        this.qte.showT -= dt;
        if (this.qte.showT <= 0) this.qte = null;
      }
      return;
    }
    if (this.state !== 'chess' && this.state !== 'duel') return;
    if (this.state === 'duel' && this.duel.over) return;
    this.qteT -= dt;
    if (this.qteT <= 0) {
      this.qte = new G.QTE(this.state);
      this.qteT = G.U.rand(...(this.state === 'duel' ? G.CFG.qte.duelEvery : G.CFG.qte.chessEvery));
    }
  }

  update(dt) {
    if (this.over) return;
    this.t += dt;
    this.updateQTE(dt);
    const qa = this.qteActive();
    switch (this.state) {
      case 'chess':
        if ((this.turn === 1 || this.botPlaysPlayer) && !qa) {
          this.botT -= dt;
          if (this.botT <= 0) {
            const m = G.botChooseMove(this.chess, this.turn);
            if (!m) this.gameOver(1 - this.turn, 'Нет ходов');
            else this.makeMove(this.turn, m.from, m.to);
          }
        }
        break;
      case 'dice':
        this.diceT -= dt;
        break;
      case 'duel':
        this.duel.update(dt * (qa ? G.CFG.qte.duelSlowmo : 1));
        if (this.duel.over && this.duel.overT <= 0) this.finishDuel();
        break;
      case 'result':
        this.resultT -= dt;
        if (this.resultT <= 0 && !this.over) {
          this.state = 'chess';
          this.battle = null;
          this.duel = null;
          this.endTurn();
        }
        break;
    }
  }
};
