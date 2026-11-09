// Покер: колода, оценка руки, стратегия обмена для бота (5-карточный дро).
window.G = window.G || {};

G.SUITS = ['♠', '♥', '♦', '♣'];
G.RANK_STR = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
G.rankStr = (r) => G.RANK_STR[r] || String(r);

G.newDeck = function () {
  const d = [];
  for (let s = 0; s < 4; s++) for (let r = 2; r <= 14; r++) d.push({ r, s });
  return G.U.shuffle(d);
};

// Оценка ровно 5 карт -> {cat, value}; cat — индекс в G.HAND_NAMES
G.eval5 = function (cards) {
  const ranks = cards.map((c) => c.r).sort((a, b) => b - a);
  const flush = cards.every((c) => c.s === cards[0].s);
  const uniq = [...new Set(ranks)];
  let straightHigh = 0;
  if (uniq.length === 5) {
    if (uniq[0] - uniq[4] === 4) straightHigh = uniq[0];
    else if (uniq[0] === 14 && uniq[1] === 5) straightHigh = 5;
  }
  const counts = {};
  ranks.forEach((r) => (counts[r] = (counts[r] || 0) + 1));
  const groups = Object.keys(counts).map(Number).sort((a, b) => counts[b] - counts[a] || b - a);
  const gc = groups.map((r) => counts[r]);

  let cat, tb;
  if (straightHigh && flush) { cat = 8; tb = [straightHigh]; }
  else if (gc[0] === 4) { cat = 7; tb = groups; }
  else if (gc[0] === 3 && gc[1] === 2) { cat = 6; tb = groups; }
  else if (flush) { cat = 5; tb = ranks; }
  else if (straightHigh) { cat = 4; tb = [straightHigh]; }
  else if (gc[0] === 3) { cat = 3; tb = groups; }
  else if (gc[0] === 2 && gc[1] === 2) { cat = 2; tb = groups; }
  else if (gc[0] === 2) { cat = 1; tb = groups; }
  else { cat = 0; tb = ranks; }
  let value = cat;
  for (let i = 0; i < 5; i++) value = value * 15 + (tb[i] || 0);
  return { cat, value };
};

// Какие карты (индексы) бот сбрасывает
G.botDiscard = function (hand) {
  const e = G.eval5(hand);
  if (e.cat >= 4) return [];
  const counts = {};
  hand.forEach((c) => (counts[c.r] = (counts[c.r] || 0) + 1));
  if (e.cat >= 1) return hand.map((c, i) => (counts[c.r] >= 2 ? -1 : i)).filter((i) => i >= 0);
  // четыре карты к флешу
  for (let s = 0; s < 4; s++) {
    const idx = hand.map((c, i) => (c.s === s ? i : -1)).filter((i) => i >= 0);
    if (idx.length === 4) return [0, 1, 2, 3, 4].filter((i) => !idx.includes(i));
  }
  // четыре карты к стриту
  const order = [0, 1, 2, 3, 4].sort((a, b) => hand[a].r - hand[b].r);
  for (let skip = 0; skip < 5; skip++) {
    const rs = order.filter((_, k) => k !== skip).map((i) => hand[i].r);
    if (new Set(rs).size === 4 && rs[3] - rs[0] <= 4) return [order[skip]];
  }
  // иначе оставляем две старшие
  return order.slice(0, 3);
};
