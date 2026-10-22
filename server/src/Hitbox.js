const { STEP_UP, GROUND_Y, PLAYER_HALF, PLAYER_HEIGHT, FOOTPRINT } = require('./Constants');

function euclid(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function platformTop(p, x, z) {
  if (Math.abs(x - p.x) > p.hx || Math.abs(z - p.z) > p.hz) return null;
  if (!p.ramp) return p.h;
  const t = p.ramp === '-x' ? (p.x + p.hx - x) / (2 * p.hx) : (x - (p.x - p.hx)) / (2 * p.hx);
  return Math.max(0, Math.min(1, t)) * p.h;
}


function groundAt(platforms, x, z, y, stepUp = STEP_UP) {
  let g = GROUND_Y;
  for (const p of platforms) {
    for (const [ox, oz] of FOOTPRINT) {
      const top = platformTop(p, x + ox, z + oz);
      if (top !== null && top <= y + stepUp && top > g) g = top;
    }
  }
  return g;
}

function blockedAt(platforms, x, z, y, stepUp = STEP_UP) {
  for (const p of platforms) {
    for (const [ox, oz] of FOOTPRINT) {
      const top = platformTop(p, x + ox, z + oz);
      if (top !== null && top > y + stepUp) return true;
    }
  }
  return false;
}

function extentOf(o) {
  return o.input ? { half: PLAYER_HALF, height: PLAYER_HEIGHT } : { half: 0, height: 0 };
}

function distanceBetween(a, b) {
  const ea = extentOf(a);
  const eb = extentOf(b);
  const reach = ea.half + eb.half;
  const ay = a.y || 0;
  const by = b.y || 0;
  return Math.max(
    Math.max(0, Math.abs(a.x - b.x) - reach),
    Math.max(0, Math.abs(a.z - b.z) - reach),
    Math.max(0, ay - (by + eb.height), by - (ay + ea.height))
  );
}

function reachPoint(entity, reach) {
  return { x: entity.x + (entity.faceX || 0) * reach, y: entity.y || 0, z: entity.z + (entity.faceZ || 0) * reach };
}

module.exports = { reachPoint, platformTop, groundAt, blockedAt, extentOf, distanceBetween, euclid, FOOTPRINT };
