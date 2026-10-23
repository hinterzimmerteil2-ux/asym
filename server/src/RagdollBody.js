const K = 0.36;
const GRAVITY = 22;
const PARTICLE_R = 0.16;
const BOUNCE = 0.2;
const FRICTION = 0.25;
const SUBSTEPS = 4;
const ITERATIONS = 6;
const TORSO = [0, 1, 2, 3, 4];
const LINKS = [[5, 0], [5, 1], [5, 4], [0, 6], [1, 7], [2, 8], [3, 9]];
for (let i = 0; i < TORSO.length; i++) for (let j = i + 1; j < TORSO.length; j++) LINKS.push([TORSO[i], TORSO[j]]);
const UPPER = new Set([0, 1, 5, 6, 7]);
const LIMBS = new Set([6, 7, 8, 9]);

function create(entity, now = Date.now()) {
  let fx = entity.faceX || 0;
  let fz = entity.faceZ || 1;
  const fl = Math.hypot(fx, fz) || 1;
  fx /= fl; fz /= fl;
  const rx = fz;
  const rz = -fx;
  const cx = entity.x;
  const cy = (entity.y || 0) + 3 * K + PARTICLE_R;
  const cz = entity.z;
  const at = (r, u, f) => [cx + rx * r + fx * f, cy + u, cz + rz * r + fz * f];
  const pts = [
    at(-K, K, 0), at(K, K, 0), at(-K / 2, -K, 0), at(K / 2, -K, 0), at(0, 0, K),
    at(0, 1.5 * K, 0),
    at(-K, K - 2 * K, 0), at(K, K - 2 * K, 0), at(-K / 2, -K - 2 * K, 0), at(K / 2, -K - 2 * K, 0),
  ];
  let dx = 0;
  let dz = 0;
  if ((entity.kbUntil || 0) > now && Math.hypot(entity.kbX || 0, entity.kbZ || 0) > 0.5) { dx = entity.kbX; dz = entity.kbZ; }
  else if ((entity.dashUntil || 0) > now) { dx = entity.dashVX || 0; dz = entity.dashVZ || 0; }
  else { dx = -fx; dz = -fz; }
  const dl = Math.hypot(dx, dz) || 1;
  dx /= dl; dz /= dl;
  const H = 0.05 / SUBSTEPS;
  const x = []; const y = []; const z = []; const px = []; const py = []; const pz = [];
  pts.forEach((p, i) => {
    const push = UPPER.has(i) ? 2.6 : 0.4;
    const noise = LIMBS.has(i) ? 2.6 : 1.2;
    const vx = dx * push + (Math.random() - 0.5) * noise;
    const vz = dz * push + (Math.random() - 0.5) * noise;
    const vy = 1.6 + (Math.random() - 0.5) * (LIMBS.has(i) ? 1.5 : 0.6);
    x.push(p[0]); y.push(p[1]); z.push(p[2]);
    px.push(p[0] - vx * H); py.push(p[1] - vy * H); pz.push(p[2] - vz * H);
  });
  const links = LINKS.map(([a, b]) => [a, b, Math.hypot(x[a] - x[b], y[a] - y[b], z[a] - z[b])]);
  return { x, y, z, px, py, pz, links, lastX: entity.x, lastZ: entity.z };
}

function step(body, entity, floorY, dt) {
  const n = body.x.length;
  const sx = entity.x - body.lastX;
  const sz = entity.z - body.lastZ;
  body.lastX = entity.x;
  body.lastZ = entity.z;
  for (let i = 0; i < n; i++) { body.x[i] += sx; body.px[i] += sx; body.z[i] += sz; body.pz[i] += sz; }
  const H = dt / SUBSTEPS;
  const limit = floorY + PARTICLE_R;
  for (let s = 0; s < SUBSTEPS; s++) {
    for (let i = 0; i < n; i++) {
      const vx = (body.x[i] - body.px[i]) * 0.995;
      const vy = (body.y[i] - body.py[i]) * 0.995;
      const vz = (body.z[i] - body.pz[i]) * 0.995;
      body.px[i] = body.x[i]; body.py[i] = body.y[i]; body.pz[i] = body.z[i];
      body.x[i] += vx;
      body.y[i] += vy - GRAVITY * H * H;
      body.z[i] += vz;
    }
    for (let it = 0; it < ITERATIONS; it++) {
      for (const [a, b, len] of body.links) {
        const ddx = body.x[b] - body.x[a];
        const ddy = body.y[b] - body.y[a];
        const ddz = body.z[b] - body.z[a];
        const dist = Math.hypot(ddx, ddy, ddz) || 1e-6;
        const k = ((dist - len) / dist) * 0.5;
        body.x[a] += ddx * k; body.y[a] += ddy * k; body.z[a] += ddz * k;
        body.x[b] -= ddx * k; body.y[b] -= ddy * k; body.z[b] -= ddz * k;
      }
      for (let i = 0; i < n; i++) {
        if (body.y[i] < limit) {
          const v = body.y[i] - body.py[i];
          body.y[i] = limit;
          body.py[i] = v < 0 ? limit + v * BOUNCE : limit - v;
          body.px[i] += (body.x[i] - body.px[i]) * FRICTION;
          body.pz[i] += (body.z[i] - body.pz[i]) * FRICTION;
        }
      }
    }
  }
  for (let i = 0; i < n; i++) {
    if (!Number.isFinite(body.x[i] + body.y[i] + body.z[i])) return false;
  }
  return true;
}

function serialize(body, entity) {
  const out = [];
  for (let i = 0; i < body.x.length; i++) {
    out.push(
      Math.round((body.x[i] - entity.x) * 100) / 100,
      Math.round((body.y[i] - (entity.y || 0)) * 100) / 100,
      Math.round((body.z[i] - entity.z) * 100) / 100
    );
  }
  return out;
}

module.exports = { create, step, serialize };
