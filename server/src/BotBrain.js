const TYPES = [
  { id: 'valiente', bravery: 0.85, greed: 0.7, caution: 0.3, patience: 0.5 },
  { id: 'miedoso', bravery: 0.15, greed: 0.45, caution: 0.9, patience: 0.4 },
  { id: 'temerario', bravery: 0.95, greed: 0.95, caution: 0.1, patience: 0.2 },
  { id: 'calculador', bravery: 0.5, greed: 0.6, caution: 0.7, patience: 0.9 },
  { id: 'nervioso', bravery: 0.35, greed: 0.8, caution: 0.55, patience: 0.15 },
];

const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const tanh = Math.tanh;

function createMind() {
  const t = TYPES[Math.floor(Math.random() * TYPES.length)];
  const jitter = () => (Math.random() - 0.5) * 0.2;
  return {
    type: t.id,
    bravery: clamp(t.bravery + jitter()),
    greed: clamp(t.greed + jitter()),
    caution: clamp(t.caution + jitter()),
    patience: clamp(t.patience + jitter()),
    fear: 0,
    confidence: 0.5,
    frustration: 0,
    lastHp: null,
    at: 0,
    out: [0.6, 0.3, 0.1],
  };
}

function feel(m, ctx, now) {
  const dt = m.at ? Math.min(0.5, (now - m.at) / 1000) : 0.1;
  m.at = now;
  const close = clamp(1 - ctx.dist / 14);
  const fearTarget = clamp(close * close * 1.3 * (1.25 - m.bravery) + ctx.fallen * 0.08 * m.caution);
  const rise = fearTarget > m.fear ? 5 : 0.5;
  m.fear += (fearTarget - m.fear) * Math.min(1, rise * dt);
  if (m.lastHp !== null) {
    const d = ctx.hp - m.lastHp;
    if (d > 0.4) {
      m.frustration = clamp(m.frustration + 0.04 * d);
      m.fear = clamp(m.fear + 0.03 * d);
      m.confidence = clamp(m.confidence - 0.02 * d);
    } else if (d < -0.4) {
      m.confidence = clamp(m.confidence + 0.05 * -d);
      m.frustration = clamp(m.frustration - 0.03 * -d);
    }
  }
  m.lastHp = ctx.hp;
  m.confidence += (0.5 - m.confidence) * 0.05 * dt;
  m.frustration = clamp(m.frustration - (0.08 + 0.1 * m.patience) * dt);
}

function think(m, ctx) {
  const close = clamp(1 - ctx.dist / 14);
  const hp = clamp(ctx.hpFrac);
  const flo = clamp(ctx.flo);
  const h0 = tanh(4 * close - 1);
  const h1 = tanh(3 * hp - 1.4);
  const h2 = tanh(2 * (1 - flo) - 0.6);
  const h3 = tanh(3 * m.fear + 2 * close - 2);
  const h4 = tanh(3 * m.confidence - 1.5);
  const h5 = tanh(2 * m.frustration - 0.8);
  const work = 0.3 + 1.2 * m.greed + 1.5 * h4 - 1.3 * h0 * (1.1 - m.bravery) - 1.1 * h3 - 0.5 * h2;
  const evade = 1.7 * h0 * (1.2 - m.bravery) + 1.4 * h3 + 0.9 * h1 * m.caution - 0.6 * h4 * m.bravery;
  const rest = 1.4 * h2 + 0.9 * h5 * (1 - m.patience) - 0.9 * h0;
  const mx = Math.max(work, evade, rest);
  const a = Math.exp(work - mx);
  const b = Math.exp(evade - mx);
  const c = Math.exp(rest - mx);
  const s = a + b + c;
  m.out[0] = a / s;
  m.out[1] = b / s;
  m.out[2] = c / s;
  return m.out;
}

module.exports = { createMind, feel, think, TYPES };
