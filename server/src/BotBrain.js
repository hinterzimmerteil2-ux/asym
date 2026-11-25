const TYPES = [
  { id: 'valiente', bravery: 0.85, greed: 0.7, caution: 0.3, patience: 0.5, empathy: 0.5, temper: 0.45 },
  { id: 'miedoso', bravery: 0.15, greed: 0.45, caution: 0.9, patience: 0.4, empathy: 0.8, temper: 0.2 },
  { id: 'temerario', bravery: 0.95, greed: 0.95, caution: 0.1, patience: 0.2, empathy: 0.2, temper: 0.8 },
  { id: 'calculador', bravery: 0.5, greed: 0.6, caution: 0.7, patience: 0.9, empathy: 0.35, temper: 0.3 },
  { id: 'nervioso', bravery: 0.35, greed: 0.8, caution: 0.55, patience: 0.15, empathy: 0.7, temper: 0.65 },
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
    empathy: clamp(t.empathy + jitter()),
    temper: clamp(t.temper + jitter()),
    joy: 0,
    grief: 0,
    anger: 0,
    mood: null,
    lastFallen: null,
    fear: 0,
    confidence: 0.5,
    frustration: 0,
    lastHp: null,
    at: 0,
    quiet: 0,
    bias: [0, 0, 0],
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
      learn(m, 1, 0.05 * d);
      learn(m, 0, -0.03 * d);
      m.quiet = 0;
    } else if (d < -0.4) {
      m.confidence = clamp(m.confidence + 0.05 * -d);
      m.frustration = clamp(m.frustration - 0.03 * -d);
    }
  }
  m.lastHp = ctx.hp;
  if (ctx.fallen !== undefined) {
    if (m.lastFallen !== null) {
      const df = ctx.fallen - m.lastFallen;
      if (df > 0) {
        m.grief = clamp(m.grief + 0.5 * m.empathy * df);
        m.fear = clamp(m.fear + 0.25 * (1.1 - m.bravery) * df);
        m.confidence = clamp(m.confidence - 0.12 * df);
        m.joy = clamp(m.joy - 0.3);
      } else if (df < 0) {
        m.joy = clamp(m.joy + 0.55 * -df);
        m.grief = clamp(m.grief + 0.3 * df);
        m.confidence = clamp(m.confidence + 0.15 * -df);
      }
    }
    m.lastFallen = ctx.fallen;
  }
  if (m.fear < 0.12) {
    m.quiet += dt;
    if (m.quiet > 10) { m.quiet = 0; learn(m, 0, 0.1); learn(m, 1, -0.05); }
  } else if (m.fear > 0.6) m.quiet = 0;
  const bd = 1 - Math.min(1, 0.012 * dt);
  m.bias[0] *= bd;
  m.bias[1] *= bd;
  m.bias[2] *= bd;
  m.confidence += (0.5 - m.confidence) * 0.05 * dt;
  m.frustration = clamp(m.frustration - (0.08 + 0.1 * m.patience) * dt);
  m.anger = clamp(m.anger + (m.frustration * (0.4 + m.temper) - m.anger) * Math.min(1, 1.5 * dt));
  if (m.fear < 0.2 && m.confidence > 0.6) m.joy = clamp(m.joy + (m.confidence - 0.55) * 0.12 * dt);
  m.joy = clamp(m.joy - 0.05 * dt);
  m.grief = clamp(m.grief - (0.02 + 0.03 * (1 - m.empathy)) * dt);
  settleMood(m);
}

function learn(m, i, v) {
  const b = m.bias[i] + v;
  m.bias[i] = b > 1.2 ? 1.2 : b < -1.2 ? -1.2 : b;
}

function settleMood(m) {
  const score = { fear: m.fear, anger: m.anger, joy: m.joy, grief: m.grief };
  let best = null;
  let top = 0.5;
  for (const k of Object.keys(score)) if (score[k] > top) { top = score[k]; best = k; }
  if (m.mood && score[m.mood] > 0.32 && (!best || score[best] < score[m.mood] + 0.18)) return;
  m.mood = best;
}

function moodSpeed(m) {
  if (m.mood === 'grief') return 1 - 0.3 * m.grief;
  if (m.mood === 'joy') return 1 + 0.06 * m.joy;
  return 1;
}

function think(m, ctx) {
  const close = clamp(1 - ctx.dist / 14);
  const hp = clamp(ctx.hpFrac);
  const flo = clamp(ctx.flo);
  const crowd = clamp((ctx.crowd || 0) / 4);
  const allies = ctx.allyFrac === undefined ? 1 : clamp(ctx.allyFrac);
  const urgency = clamp(ctx.timeFrac || 0);
  const h0 = tanh(4 * close - 1);
  const h1 = tanh(3 * hp - 1.4);
  const h2 = tanh(2 * (1 - flo) - 0.6);
  const h3 = tanh(3 * m.fear + 2 * close - 2 - 0.8 * crowd);
  const h4 = tanh(3 * m.confidence - 1.5);
  const h5 = tanh(2 * m.frustration - 0.8);
  const h6 = tanh(2.4 * m.grief - 0.6);
  const h7 = tanh(2.2 * m.joy - 0.5);
  const h8 = tanh(2.4 * m.anger - 0.7);
  const h9 = tanh(2 * crowd - 0.6);
  const h10 = tanh(2.5 * (1 - allies) - 0.5);
  const h11 = tanh(3 * urgency - 1.5);
  const work = 0.3 + 1.2 * m.greed + 1.5 * h4 - 1.3 * h0 * (1.1 - m.bravery) - 1.1 * h3 - 0.5 * h2 - 0.7 * h6 + 0.8 * h7 + 0.5 * h8 + 0.4 * h9 + 0.9 * h11 * m.greed + m.bias[0];
  const evade = 1.7 * h0 * (1.2 - m.bravery) + 1.4 * h3 + 0.9 * h1 * m.caution - 0.6 * h4 * m.bravery - 0.6 * h8 * m.bravery - 0.5 * h9 * m.bravery + 0.7 * h10 * m.caution - 0.4 * h11 + m.bias[1];
  const rest = 1.4 * h2 + 0.9 * h5 * (1 - m.patience) - 0.9 * h0 + 1.0 * h6 - 0.4 * h7 - 0.6 * h11 + m.bias[2];
  const mx = Math.max(work, evade, rest);
  const a = Math.exp(work - mx);
  const b = Math.exp(evade - mx);
  const c = Math.exp(rest - mx);
  const s = a + b + c;
  const o = m.out;
  o[0] = 0.5 * o[0] + 0.5 * (a / s);
  o[1] = 0.5 * o[1] + 0.5 * (b / s);
  o[2] = 0.5 * o[2] + 0.5 * (c / s);
  return o;
}

module.exports = { createMind, feel, think, moodSpeed, learn, TYPES };
