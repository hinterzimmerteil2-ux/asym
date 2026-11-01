const BUDGET = 60;
const MAX_CARDS = 6;
const KINDS = ['strike', 'burst', 'sprint'];
const registry = new Map();

function num(v, lo, hi, d) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d;
}

function sanitize(raw, i) {
  const kind = KINDS.includes(raw && raw.kind) ? raw.kind : 'strike';
  const p = {
    id: typeof (raw && raw.id) === 'string' ? raw.id.slice(0, 40) : `sk_${i}`,
    name: String((raw && raw.name) || `Skill ${i + 1}`).trim().slice(0, 28) || `Skill ${i + 1}`,
    kind,
    cooldownSec: num(raw && raw.cooldownSec, 8, 60, 30),
    reach: num(raw && raw.reach, 0.6, 2.4, 1.2),
    radius: kind === 'burst' ? num(raw && raw.radius, 1.2, 3, 2) : num(raw && raw.radius, 0.5, 1.6, 0.85),
    stunSec: num(raw && raw.stunSec, 0, 3, kind === 'sprint' ? 0 : 1.5),
    ragdollSec: num(raw && raw.ragdollSec, 0, 3, 0),
    hpLoss: num(raw && raw.hpLoss, 0, 40, 0),
    factor: num(raw && raw.factor, 1.1, 2, 1.4),
    durationSec: num(raw && raw.durationSec, 1, 6, 3),
    hpCost: num(raw && raw.hpCost, 0, 30, 0),
  };
  for (const k of ['cooldownSec', 'reach', 'radius', 'stunSec', 'ragdollSec', 'hpLoss', 'factor', 'durationSec', 'hpCost']) p[k] = Math.round(p[k] * 10) / 10;
  return p;
}

function power(p) {
  const scale = 30 / p.cooldownSec;
  if (p.kind === 'sprint') return Math.max(5, (p.factor - 1) * 10 * p.durationSec - p.hpCost * 0.2) * scale;
  const area = p.kind === 'burst' ? p.radius * 5 : p.reach * 4 + p.radius * 6;
  return (p.stunSec * 10 + p.ragdollSec * 12 + p.hpLoss * 0.8 + area) * scale;
}

function describe(p) {
  const parts = [];
  if (p.kind === 'sprint') {
    parts.push(`Corres x${p.factor} durante ${p.durationSec}s.`);
    if (p.hpCost) parts.push(`Pierdes ${p.hpCost} de HP, hasta un mínimo de 35.`);
    return parts.join(' ');
  }
  parts.push(p.kind === 'burst' ? `Golpe en área de ${p.radius} a tu alrededor.` : `Golpe corto desde la mano (alcance ${p.reach}).`);
  if (p.stunSec) parts.push(`Aturde ${p.stunSec}s al Curador.`);
  if (p.ragdollSec) parts.push(`Lo derriba ${p.ragdollSec}s.`);
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
    keywords: [p.kind === 'sprint' ? 'bonificadora' : 'ofensiva'],
    cooldownMs: Math.round(p.cooldownSec * 1000),
    corrupt: false,
  };
  if (p.kind === 'strike') {
    card.window = 380;
    card.reach = p.reach;
    card.hitRadius = p.radius;
  } else if (p.kind === 'burst') {
    card.hitRadius = p.radius;
  } else {
    card.sprintFactor = p.factor;
    card.durationMs = Math.round(p.durationSec * 1000);
    card.hpCost = p.hpCost;
  }
  if (p.kind !== 'sprint') {
    card.stunMs = Math.round(p.stunSec * 1000);
    card.ragdollMs = Math.round(p.ragdollSec * 1000);
    card.curatorHpLoss = p.hpLoss;
  }
  return card;
}

function normalizeList(list) {
  const out = (Array.isArray(list) ? list : []).slice(0, MAX_CARDS).map((raw, i) => sanitize(raw, i));
  for (const p of out) {
    const pw = power(p);
    if (pw > BUDGET + 0.001) throw new Error(`La skill "${p.name}" es demasiado fuerte (poder ${Math.round(pw)}/${BUDGET}). Sube la recarga o baja sus efectos.`);
  }
  return out;
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

module.exports = { BUDGET, MAX_CARDS, KINDS, sanitize, power, describe, normalizeList, registerAll, get };
