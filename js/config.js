// Все числа баланса — в одном месте.
window.G = window.G || {};

G.CFG = {
  W: 1280,
  H: 720,

  board: { x: 352, y: 72, cell: 72, n: 8 },
  arena: { x: 352, y: 72, w: 576, h: 576, cell: 24 },

  // Дуэль (шутер, вид сбоку)
  duel: {
    gravity: 1500,
    bulletSpeed: 680,
    timeLimit: 45,
    blockEvery: [1.4, 2.6],   // как часто падают блоки (с)
    blockFallSpeed: 240,      // px/с
    blockDmg: 18,             // урон, если блок упал на голову
    blockHp: 2,               // сколько пуль выдерживает клетка блока
    startBlocks: 3,
  },

  // Бойцы: характеристики фигур в дуэли
  fighter: {
    P: { hp: 60, dmg: 7, rate: 0.42, speed: 230, jump: 600 },
    N: { hp: 80, dmg: 8, rate: 0.38, speed: 250, jump: 720 },
    B: { hp: 80, dmg: 9, rate: 0.38, speed: 240, jump: 620 },
    R: { hp: 110, dmg: 14, rate: 0.55, speed: 200, jump: 560 },
    Q: { hp: 130, dmg: 10, rate: 0.28, speed: 245, jump: 640 },
    K: { hp: 120, dmg: 9, rate: 0.36, speed: 215, jump: 600 },
  },

  pieceValue: { P: 1, N: 3, B: 3, R: 5, Q: 9, K: 100 },

  // Кубики: итог = 2 лучших кубика + номер покерной комбинации + бонус QTE
  dice: { dmgBase: 0.6, dmgPer: 0.05, hpPer: 4 },

  // QTE: стрелка бежит по кругу, нажать пробел в сегменте
  qte: {
    chessEvery: [12, 24],
    duelEvery: [6, 11],
    revPerSec: 0.85,
    maxRevs: 2,
    segDeg: { chess: 55, duel: 40 },
    duelHeal: 20,
    duelHurt: 15,
    boostTime: 3,
    bonusMin: -2,
    bonusMax: 3,
    duelSlowmo: 0.25,
  },
};

G.PIECE_GLYPH = { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟' };
G.PIECE_NAME = { K: 'Король', Q: 'Ферзь', R: 'Ладья', B: 'Слон', N: 'Конь', P: 'Пешка' };
G.PIECE_ACC = { K: 'Короля', Q: 'Ферзя', R: 'Ладью', B: 'Слона', N: 'Коня', P: 'Пешку' };
G.PIECE_MY = { K: 'Ваш Король', Q: 'Ваш Ферзь', R: 'Ваша Ладья', B: 'Ваш Слон', N: 'Ваш Конь', P: 'Ваша Пешка' };
G.PIECE_MY_ACC = { K: 'вашего Короля', Q: 'вашего Ферзя', R: 'вашу Ладью', B: 'вашего Слона', N: 'вашего Коня', P: 'вашу Пешку' };
// «Ваша Ладья атакует Слона» / «Бот: Ферзь атакует вашу Пешку»
G.attackTitle = (attSide, att, def) => attSide === 0
  ? `${G.PIECE_MY[att]} атакует ${G.PIECE_ACC[def]}`
  : `Бот: ${G.PIECE_NAME[att]} атакует ${G.PIECE_MY_ACC[def]}`;
G.HAND_NAMES = ['Старшая карта', 'Пара', 'Две пары', 'Сет', 'Стрит', 'Флеш', 'Фулл-хаус', 'Каре', 'Стрит-флеш'];
