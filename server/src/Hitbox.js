const { STEP_UP, GROUND_Y, PLAYER_HALF, PLAYER_HEIGHT, FOOTPRINT } = require('./Constants');

function euclid(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

const RAMP_SLAB = 0.4;

function pitDepth(p, x, z) {
  if (Math.abs(x - p.x) > p.hx || Math.abs(z - p.z) > p.hz) return 0;
  if (!p.ramp) return p.h;
  const t = p.ramp === '-x' ? (p.x + p.hx - x) / (2 * p.hx) : (x - (p.x - p.hx)) / (2 * p.hx);
  return (1 - Math.max(0, Math.min(1, t))) * p.h;
}

function baseAt(platforms, x, z) {
  let d = 0;
  for (const p of platforms) if (p.kind === 'pit') d = Math.max(d, pitDepth(p, x, z));
  return -d;
}

function platformTop(p, x, z) {
  if (p.kind === 'pit') return null;
  if (Math.abs(x - p.x) > p.hx || Math.abs(z - p.z) > p.hz) return null;
  const y0 = p.y0 || 0;
  if (!p.ramp) return y0 + p.h;
  const t = p.ramp === '-x' ? (p.x + p.hx - x) / (2 * p.hx) : (x - (p.x - p.hx)) / (2 * p.hx);
  return y0 + Math.max(0, Math.min(1, t)) * p.h;
}


function groundAt(platforms, x, z, y, stepUp = STEP_UP) {
  let g = -Infinity;
  for (const [ox, oz] of FOOTPRINT) g = Math.max(g, baseAt(platforms, x + ox, z + oz));
  for (const p of platforms) {
    for (const [ox, oz] of FOOTPRINT) {
      const top = platformTop(p, x + ox, z + oz);
      if (top !== null && top <= y + stepUp && top > g) g = top;
    }
  }
  return g;
}

function blockedAt(platforms, x, z, y, stepUp = STEP_UP) {
  for (const [ox, oz] of FOOTPRINT) if (baseAt(platforms, x + ox, z + oz) > y + stepUp) return true;
  for (const p of platforms) {
    for (const [ox, oz] of FOOTPRINT) {
      const top = platformTop(p, x + ox, z + oz);
      if (top !== null && top > y + stepUp && (p.ramp || p.slab ? top - (p.slab || RAMP_SLAB) : p.y0 || 0) < y + PLAYER_HEIGHT) return true;
    }
  }
  return false;
}

function extentOf(o) {
  return o.input && !o.corpse ? { half: PLAYER_HALF, height: PLAYER_HEIGHT } : { half: 0, height: 0 };
}

const ATTACK_VERTICAL_PAD = 1.5;

function distanceBetween(a, b) {
  const ea = extentOf(a);
  const eb = extentOf(b);
  const reach = ea.half + eb.half;
  const ay = a.y || 0;
  const by = b.y || 0;
  return Math.max(
    Math.max(0, Math.abs(a.x - b.x) - reach),
    Math.max(0, Math.abs(a.z - b.z) - reach),
    Math.max(0, ay - (by + eb.height) - ATTACK_VERTICAL_PAD, by - (ay + ea.height) - ATTACK_VERTICAL_PAD)
  );
}

function reachPoint(entity, reach) {
  return { x: entity.x + (entity.faceX || 0) * reach, y: entity.y || 0, z: entity.z + (entity.faceZ || 0) * reach };
}

module.exports = { baseAt, reachPoint, platformTop, groundAt, blockedAt, extentOf, distanceBetween, euclid, FOOTPRINT };
