// Точка входа: холст, ввод, игровой цикл.
(function () {
  const C = G.CFG;
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const render = new G.Render(ctx);

  let game = null;
  let state = 'menu'; // menu | play | over
  const keys = {};
  const input = { mx: 0, my: 0, boardCell: null, firing: false };

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const scale = Math.min(window.innerWidth / C.W, window.innerHeight / C.H);
    canvas.style.width = C.W * scale + 'px';
    canvas.style.height = C.H * scale + 'px';
    canvas.width = C.W * dpr;
    canvas.height = C.H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  function start() {
    game = new G.Game();
    state = 'play';
    window.__game = game; // для отладки из консоли
  }

  function toLocal(e) {
    const r = canvas.getBoundingClientRect();
    input.mx = ((e.clientX - r.left) * C.W) / r.width;
    input.my = ((e.clientY - r.top) * C.H) / r.height;
    const bx = input.mx - C.board.x, by = input.my - C.board.y, size = 8 * C.board.cell;
    input.boardCell = bx >= 0 && by >= 0 && bx < size && by < size
      ? [Math.floor(bx / C.board.cell), Math.floor(by / C.board.cell)] : null;
  }

  function uiHit() {
    for (const b of render.ui.buttons) {
      if (input.mx >= b.x && input.mx <= b.x + b.w && input.my >= b.y && input.my <= b.y + b.h) {
        if (!b.enabled) return true;
        if (b.kind.startsWith('card')) game.toggleCard(Number(b.kind[4]));
        else if (b.kind === 'advance') game.advance();
        return true;
      }
    }
    return false;
  }

  window.addEventListener('keydown', (e) => {
    if (['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    if (state !== 'play') {
      if (e.code === 'Enter') start();
      return;
    }
    keys[e.code] = true;
    if (e.code === 'Space' && !e.repeat) game.pressQTE();
    else if ((e.code === 'Enter' || e.code === 'NumpadEnter') && !e.repeat) game.advance();
    else if (e.code === 'Escape') game.selected = null;
    else if (game.state === 'poker' && /^Digit[1-5]$/.test(e.code)) game.toggleCard(Number(e.code[5]) - 1);
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; input.firing = false; });

  canvas.addEventListener('mousemove', toLocal);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('mousedown', (e) => {
    toLocal(e);
    if (state !== 'play') { start(); return; }
    if (e.button !== 0) return;
    if (uiHit()) return;
    if (game.state === 'chess' && input.boardCell) game.clickBoard(...input.boardCell);
    else if (game.state === 'duel') input.firing = true;
  });
  window.addEventListener('mouseup', (e) => { if (e.button === 0) input.firing = false; });

  function applyDuelInput() {
    if (game.state !== 'duel') return;
    const di = game.duel.input;
    di.left = !!(keys.KeyA || keys.ArrowLeft);
    di.right = !!(keys.KeyD || keys.ArrowRight);
    di.jump = !!(keys.KeyW || keys.ArrowUp);
    di.fire = input.firing;
    di.aimX = input.mx - C.arena.x;
    di.aimY = input.my - C.arena.y;
  }

  const STEP = 1 / 60;
  let acc = 0, last = performance.now();
  function frame(now) {
    acc += Math.min(0.1, (now - last) / 1000);
    last = now;
    if (state === 'play') {
      while (acc >= STEP) { applyDuelInput(); game.update(STEP); acc -= STEP; }
      if (game.over) state = 'over';
    } else acc = 0;

    if (game) render.draw(game, input);
    else render.rect(0, 0, C.W, C.H, G.COL.bg);

    if (state === 'menu') {
      render.drawOverlay('ШАХ И ФЛЕШ', [
        'Шахматы, где каждое взятие решается битвой.',
        'Взятие → покер (5 карт, один обмен) → бросок кубиков → дуэль-шутер.',
        'Покерная комбинация даёт бонус к кубикам, победитель покера бросает 3 кубика.',
        'Кубики решают урон и HP бойца. Сверху в дуэли падают блоки — укрытия и угроза.',
        'Если атакующий проигрывает дуэль, погибает он сам.',
        'В любой момент может выскочить QTE — жмите пробел, когда стрелка в зелёном сегменте.',
        'Победа — вражеский король пал в дуэли.',
      ], 'Клик или Enter — начать');
    } else if (state === 'over') {
      render.drawOverlay(game.winner === 0 ? 'ПОБЕДА' : 'ПОРАЖЕНИЕ', [game.reason], 'Клик или Enter — ещё раз');
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
