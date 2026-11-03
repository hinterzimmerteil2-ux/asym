const MAX_CARDS = 12;
const MAX_HEALER = 4;
const KINDS = ['strike', 'burst', 'sprint', 'projectile', 'invisible'];
const HEALER_KINDS = ['pulse', 'stun', 'pull', 'boost', 'purge'];
const FX_WHEN = ['use', 'hit', 'miss'];
const FX_TARGET = ['self', 'enemy', 'allies'];
const FX_TYPES = ['stun', 'ragdoll', 'slow', 'endlag', 'reveal', 'hp', 'flojera', 'speed', 'exacerbacion', 'pereza', 'acetilcolina', 'fatiga', 'impulso', 'respiro', 'ayuno', 'paraguayizador'];
const MAX_FX = 8;
const registry = new Map();
const healerRegistry = new Map();

function num(v, lo, hi, d) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d;
}

function r1(n) {
  return Math.round(n * 10) / 10;
}

function sanitizeFx(list) {
  return (Array.isArray(list) ? list : []).slice(0, MAX_FX).map((f) => {
    const type = FX_TYPES.includes(f && f.type) ? f.type : 'stun';
    const out = {
      when: FX_WHEN.includes(f && f.when) ? f.when : 'hit',
      target: FX_TARGET.includes(f && f.target) ? f.target : 'enemy',
      type,
      amount: r1(num(f && f.amount, type === 'speed' ? 1 : -500, type === 'speed' ? 10 : 500, type === 'speed' ? 1.5 : 10)),
      durationSec: r1(num(f && f.durationSec, 0, 60, 2)),
      level: Math.round(num(f && f.level, 1, 3, 2)),
    };
    return out;
  });
}

function name(raw, fallback) {
  return String((raw && raw.name) || fallback).trim().slice(0, 28) || fallback;
}

function sanitize(raw, i) {
  const kind = KINDS.includes(raw && raw.kind) ? raw.kind : 'strike';
  const g = (k, lo, hi, d) => r1(num(raw && raw[k], lo, hi, d));
  return {
    id: typeof (raw && raw.id) === 'string' ? raw.id.slice(0, 40) : `sk_${i}`,
    name: name(raw, `Skill ${i + 1}`),
    kind,
    cooldownSec: g('cooldownSec', 1, 300, kind === 'projectile' ? 70 : 30),
    windowMs: Math.round(num(raw && raw.windowMs, 100, 1500, 380)),
    reach: g('reach', 0, 15, 1.2),
    radius: g('radius', 0.3, 20, kind === 'burst' ? 2 : 0.85),
    stunSec: g('stunSec', 0, 30, kind === 'sprint' || kind === 'invisible' ? 0 : kind === 'projectile' ? 4 : 1.5),
    ragdollSec: g('ragdollSec', 0, 30, 0),
    slowSec: g('slowSec', 0, 60, 0),
    knockback: g('knockback', 0, 40, 0),
    slowLevel: Math.round(num(raw && raw.slowLevel, 1, 3, 2)),
    revealHealerSec: g('revealHealerSec', 0, 60, 0),
    hpLoss: g('hpLoss', 0, 1000, 0),
    factor: g('factor', 1, 10, 1.4),
    durationSec: g('durationSec', 0.5, 90, kind === 'invisible' ? 8 : 3),
    hpCost: g('hpCost', 0, 100, 0),
    endlagSec: g('endlagSec', 0, 10, 0),
    chargeSec: g('chargeSec', 0.5, 30, 4),
    holdSec: g('holdSec', 0, 30, 5),
    fireDelaySec: g('fireDelaySec', 0, 30, 7),
    throwEndlagSec: g('throwEndlagSec', 0, 10, 1.8),
    projSpeed: g('projSpeed', 2, 80, 20),
    projRadius: g('projRadius', 0.2, 3, 0.8),
    flySec: g('flySec', 1, 30, 7),
    startSec: g('startSec', 0, 10, 0.9),
    fx: sanitizeFx(raw && raw.fx),
  };
}

function describe(p) {
  const parts = [];
  if (p.kind === 'invisible') {
    return `Endlag ${p.startSec}s y luego ${p.durationSec}s invisible: el Healer no te ve y las detecciones no te revelan. Gastas el doble de Flojera sin regenerar. Si te golpean, se cancela.`;
  }
  if (p.kind === 'projectile') {
    const out = [`Empuñas la esfera: endlag ${p.holdSec}s mientras se carga hasta ${p.chargeSec}s (100%).`, 'Saltar o curarte te saca de la carga y conservas lo cargado.', `Tras ${p.fireDelaySec}s puedes lanzarla en línea recta (${p.projSpeed} de velocidad, ${p.flySec}s de vuelo).`];
    if (p.stunSec) out.push(`Si choca con el Healer lo aturde hasta ${p.stunSec}s según la carga.`);
    if (p.hpLoss) out.push(`Le quita hasta ${p.hpLoss} HP.`);
    out.push(`Lanzarla da ${p.throwEndlagSec}s de endlag.`);
    return out.join(' ');
  }
  if (p.kind === 'sprint') {
    parts.push(`Corres x${p.factor} durante ${p.durationSec}s.`);
    if (p.hpCost) parts.push(`Pierdes ${p.hpCost} de HP, hasta un mínimo de 35.`);
    return parts.join(' ');
  }
  parts.push(p.kind === 'burst' ? `Golpe en área de ${p.radius} a tu alrededor.` : `Golpe corto desde la mano (alcance ${p.reach}).`);
  if (p.stunSec) parts.push(`Aturde ${p.stunSec}s al Healer.`);
  if (p.ragdollSec) parts.push(`Lo derriba ${p.ragdollSec}s.`);
  if (p.slowSec) parts.push(`Lo ralentiza ${p.slowSec}s.`);
  if (p.knockback) parts.push(`Lo empuja (${p.knockback}).`);
  if (p.hpLoss) parts.push(`Le quita ${p.hpLoss} HP.`);
  parts.push('Si fallas, quedas en endlag.');
  return parts.join(' ');
}

function build(p, id) {
  const card = {
    id,
    custom: true,
    customKind: p.kind,
    displayName: p.name,
    description: describe(p),
    rarity: 'uncommon',
    weight: 25,
    keywords: [p.kind === 'sprint' ? 'bonificadora' : p.kind === 'invisible' ? 'escapista' : 'ofensiva'],
    cooldownMs: Math.round(p.cooldownSec * 1000),
    corrupt: false,
    endlagMs: Math.round(p.endlagSec * 1000),
    fx: p.fx,
  };
  if (p.kind === 'strike') {
    card.window = p.windowMs;
    card.reach = p.reach;
    card.hitRadius = p.radius;
  } else if (p.kind === 'burst') {
    card.hitRadius = p.radius;
  } else if (p.kind === 'projectile') {
    card.astral = { chargeMs: Math.round(p.chargeSec * 1000), holdMs: Math.round(p.holdSec * 1000), fireDelayMs: Math.round(p.fireDelaySec * 1000), throwEndlagMs: Math.round(p.throwEndlagSec * 1000), speed: p.projSpeed, radius: p.projRadius, hit: 1, flyMs: Math.round(p.flySec * 1000) };
  } else if (p.kind === 'invisible') {
    card.paraStartMs = Math.round(p.startSec * 1000);
    card.paraMs = Math.round(p.durationSec * 1000);
  } else {
    card.sprintFactor = p.factor;
    card.durationMs = Math.round(p.durationSec * 1000);
    card.hpCost = p.hpCost;
  }
  if (p.kind === 'strike' || p.kind === 'burst' || p.kind === 'projectile') {
    card.stunMs = Math.round(p.stunSec * 1000);
    card.ragdollMs = Math.round(p.ragdollSec * 1000);
    card.slowMs = Math.round(p.slowSec * 1000);
    card.slowLevel = p.slowLevel;
    card.revealHealerMs = Math.round(p.revealHealerSec * 1000);
    card.knockback = p.knockback;
    card.curatorHpLoss = p.hpLoss;
  }
  return card;
}

function normalizeList(list) {
  return (Array.isArray(list) ? list : []).slice(0, MAX_CARDS).map((raw, i) => sanitize(raw, i));
}

function registerAll(mapId, list) {
  for (const key of [...registry.keys()]) if (key.startsWith(`mc|${mapId}|`)) registry.delete(key);
  return list.map((p, i) => {
    const card = build(p, `mc|${p.kind}|${mapId}|${i}`);
    registry.set(card.id, card);
    return card;
  });
}

function get(id) {
  return registry.get(id) || null;
}

function sanitizeHealer(raw, i) {
  const kind = HEALER_KINDS.includes(raw && raw.kind) ? raw.kind : 'pulse';
  const g = (k, lo, hi, d) => r1(num(raw && raw[k], lo, hi, d));
  return {
    name: name(raw, `Skill ${i + 1}`),
    kind,
    cooldownSec: g('cooldownSec', 1, 300, 30),
    windowMs: Math.round(num(raw && raw.windowMs, 100, 1500, 700)),
    radius: g('radius', 0.5, 60, 6),
    reach: g('reach', 0, 8, 0),
    cureAmount: g('cureAmount', 0, 500, 8),
    revealSec: g('revealSec', 0, 120, 0),
    selfHeal: g('selfHeal', 0, 1000, 0),
    durationSec: g('durationSec', 0.5, 90, 3),
    strength: g('strength', 0.5, 40, 4),
    factor: g('factor', 1, 12, 2),
    flojeraDrain: g('flojeraDrain', 0, 500, 30),
    fx: sanitizeFx(raw && raw.fx).filter((f) => f.target !== 'allies'),
    stunSec: g('stunSec', 0, 30, 0),
    slowSec: g('slowSec', 0, 60, 0),
    slowLevel: Math.round(num(raw && raw.slowLevel, 1, 3, 2)),
  };
}

function describeHealer(p) {
  const t = {
    pulse: `Cura ${p.cureAmount} a los Pacientes en radio ${p.radius}.${p.revealSec ? ` Los revela ${p.revealSec}s.` : ''}${p.selfHeal ? ` Te curas ${p.selfHeal} por Paciente.` : ''}`,
    stun: `Aturde ${p.durationSec}s a los Pacientes en radio ${p.radius}.`,
    pull: `Arrastra a los Pacientes en radio ${p.radius} hacia ti.`,
    boost: `Tus curaciones valen x${p.factor} por ${p.durationSec}s.${p.selfHeal ? ` Te curas ${p.selfHeal} HP.` : ''}`,
    purge: `Purga a los Pacientes en radio ${p.radius} y baja su flojera ${p.flojeraDrain}.`,
  };
  return t[p.kind];
}

function buildHealer(p, id) {
  const s = {
    id,
    type: p.kind,
    custom: true,
    name: p.name,
    description: describeHealer(p),
    keywords: [p.kind === 'pulse' || p.kind === 'boost' || p.kind === 'purge' ? 'bonificadora' : 'ofensiva'],
    cooldownMs: Math.round(p.cooldownSec * 1000),
    radius: p.radius,
    fx: p.fx,
  };
  if (p.kind === 'pulse' || p.kind === 'purge') {
    s.stunMs = Math.round(p.stunSec * 1000);
    s.slowMs = Math.round(p.slowSec * 1000);
    s.slowLevel = p.slowLevel;
  }
  if (p.kind === 'pulse') {
    s.cureAmount = p.cureAmount;
    s.revealMs = Math.round(p.revealSec * 1000);
    s.selfHeal = p.selfHeal;
  } else if (p.kind === 'stun') {
    s.windowMs = p.windowMs;
    s.durationMs = Math.round(p.durationSec * 1000);
  } else if (p.kind === 'pull') {
    s.windowMs = p.windowMs;
    s.strength = p.strength;
  } else if (p.kind === 'boost') {
    s.factor = p.factor;
    s.durationMs = Math.round(p.durationSec * 1000);
    s.selfHeal = p.selfHeal;
  } else {
    s.flojeraDrain = p.flojeraDrain;
  }
  return s;
}

function normalizeHealer(list) {
  return (Array.isArray(list) ? list : []).slice(0, MAX_HEALER).map((raw, i) => sanitizeHealer(raw, i));
}

function registerHealer(mapId, list) {
  healerRegistry.set(mapId, list.map((p, i) => buildHealer(p, `mh|${p.kind}|${mapId}|${i}`)));
}

function healerSkills(mapId) {
  return healerRegistry.get(mapId) || null;
}

module.exports = {
  MAX_CARDS, MAX_HEALER, FX_WHEN, FX_TARGET, FX_TYPES, MAX_FX, KINDS, HEALER_KINDS,
  sanitize, describe, normalizeList, registerAll, get,
  sanitizeHealer, normalizeHealer, registerHealer, healerSkills,
};
