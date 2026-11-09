// QTE: стрелка бежит по кругу, нужно нажать пробел, пока она в сегменте.
window.G = window.G || {};

G.QTE = class {
  constructor(ctx) {
    const C = G.CFG.qte;
    this.ctx = ctx; // 'chess' | 'duel'
    this.seg = (C.segDeg[ctx] * Math.PI) / 180;
    this.segStart = Math.random() * Math.PI * 2;
    this.angle = this.segStart + Math.PI + G.U.rand(-0.6, 0.6);
    this.speed = C.revPerSec * Math.PI * 2 * (ctx === 'duel' ? 1.2 : 1);
    this.t = 0;
    this.maxT = (C.maxRevs * Math.PI * 2) / this.speed;
    this.result = null; // null — ждём, true/false — итог
    this.showT = 1.2;
    this.msg = '';
  }

  rel() {
    const TAU = Math.PI * 2;
    let a = (this.angle - this.segStart) % TAU;
    if (a < 0) a += TAU;
    return a;
  }

  update(dt) {
    if (this.result !== null) return;
    this.angle += this.speed * dt;
    this.t += dt;
    if (this.t >= this.maxT) this.result = false;
  }

  press() {
    if (this.result === null) this.result = this.rel() <= this.seg;
  }
};
