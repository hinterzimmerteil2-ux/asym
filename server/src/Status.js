const { SLOW_BY_LEVEL } = require('./Constants');

const KINDS = {
  stun: { blocksMove: true, blocksSkills: true, id: 'aturdido' },
  ragdoll: { blocksMove: true, blocksSkills: true, id: 'ragdoll' },
  slow: { blocksMove: false, blocksSkills: false, id: 'ralentizado' },
  reveal: { blocksMove: false, blocksSkills: false, id: 'revelado' },
  emote: { blocksMove: false, blocksSkills: true, id: 'emote', hidden: true },
};

function fx(entity) {
  if (!entity.fx) entity.fx = {};
  return entity.fx;
}

function until(entity, kind) {
  return (entity.fx && entity.fx[kind] && entity.fx[kind].until) || 0;
}

function active(entity, kind, now) {
  return until(entity, kind) > now;
}

function level(entity, kind, now) {
  return active(entity, kind, now) ? entity.fx[kind].level : 0;
}

function apply(entity, kind, ms, now, opts = {}) {
  const store = fx(entity);
  if ((kind === 'stun' || kind === 'ragdoll') && entity.size > 2) return store[kind] || { until: 0, level: 1 };
  if (kind === 'stun' || kind === 'ragdoll') {
    delete store.emote;
    entity.emote = null;
  }
  const cur = store[kind];
  const live = Boolean(cur) && cur.until > now;
  const base = opts.chain && live ? cur.until : now;
  store[kind] = {
    until: Math.max(live ? cur.until : 0, base + ms),
    level: kind === 'slow' ? Math.max(live ? cur.level : 0, opts.level || 1) : 1,
    tag: opts.tag || (live ? cur.tag : undefined),
  };
  return store[kind];
}

function clear(entity, ...kinds) {
  if (!entity.fx) return;
  if (kinds.length === 0) entity.fx = {};
  else for (const kind of kinds) delete entity.fx[kind];
}

function blocksMove(entity, now) {
  return Object.keys(KINDS).some((k) => KINDS[k].blocksMove && active(entity, k, now));
}

function blocksSkills(entity, now) {
  return Object.keys(KINDS).some((k) => KINDS[k].blocksSkills && active(entity, k, now));
}

function speedFactor(entity, now) {
  const lv = level(entity, 'slow', now);
  return (lv ? SLOW_BY_LEVEL[Math.min(3, lv)] : 1) * (active(entity, 'emote', now) ? 0.92 : 1);
}

function push(entity, dx, dz, speed, ms, now) {
  if (entity.size > 2) return;
  entity.kbX = dx * speed;
  entity.kbZ = dz * speed;
  entity.kbUntil = now + ms;
}

function list(entity, now) {
  const out = [];
  for (const kind of Object.keys(KINDS)) {
    if (KINDS[kind].hidden || !active(entity, kind, now)) continue;
    const f = entity.fx[kind];
    out.push({ id: kind === 'slow' && f.tag === 'endlag' ? 'endlag' : KINDS[kind].id, level: f.level, ms: f.until - now });
  }
  return out;
}

module.exports = { until, active, level, apply, clear, blocksMove, blocksSkills, speedFactor, push, list };
