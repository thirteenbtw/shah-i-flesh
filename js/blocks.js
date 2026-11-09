// Формы падающих блоков (тетрамино).
window.G = window.G || {};

G.BLOCK_DEFS = {
  I: ['....', 'IIII', '....', '....'],
  O: ['OO', 'OO'],
  T: ['.T.', 'TTT', '...'],
  S: ['.SS', 'SS.', '...'],
  Z: ['ZZ.', '.ZZ', '...'],
  J: ['J..', 'JJJ', '...'],
  L: ['..L', 'LLL', '...'],
};

G.BLOCK_COLORS = {
  I: '#4fd1c5', O: '#f6c445', T: '#b07cf0', S: '#6cd96c', Z: '#f0656a', J: '#5b8def', L: '#f59a45',
};

G.rotateMat = function (m) {
  const n = m.length;
  const out = [];
  for (let r = 0; r < n; r++) {
    let row = '';
    for (let c = 0; c < n; c++) row += m[n - 1 - c][r];
    out.push(row);
  }
  return out;
};

G.matCells = function (m) {
  const cells = [];
  for (let r = 0; r < m.length; r++)
    for (let c = 0; c < m[r].length; c++) if (m[r][c] !== '.') cells.push([c, r]);
  return cells;
};
