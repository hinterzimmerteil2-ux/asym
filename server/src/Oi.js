const Hitbox = require('./Hitbox');
const Status = require('./Status');

const OI = { eyes: 30, refillMs: 28000, cost: 4, loss: 5, regenEvery: 3000, quietMs: 5000, stepMs: 200, maxStep: 7, toggleGapMs: 700, m1Reach: 1.2, m1Radius: 0.9 };

const ANGLES = [90, -90, 45, -45, 135, -135, 0, 180].map((a) => (a * Math.PI) / 180);

function has(entity) {
  return (entity.hand || []).some((sl) => sl && sl.chosen === 'oi_ojo');
}

function state(entity) {
  if (!entity.oi) entity.oi = { eyes: OI.eyes, on: false, outAt: 0, lastHit: 0, lastUse: 0, lastRegen: 0 };
  return entity.oi;
}

function depleted(entity) {
  return has(entity) && state(entity).eyes <= 0;
}

function active(entity) {
  if (!has(entity)) return false;
  const s = state(entity);
  return s.on && s.eyes > 0;
}

function drainMult(entity) {
  return depleted(entity) ? 2 : 1;
}

function toggle(room, playerId, entity, now) {
  const s = state(entity);
  if (s.eyes <= 0) {
    room.sendTo(playerId, 'error', { message: 'Sin Ojos de Precognición' });
    return;
  }
  if (now - s.lastUse < OI.toggleGapMs) return;
  s.lastUse = now;
  s.on = !s.on;
  room.broadcast('oi_fx', { kind: s.on ? 'open' : 'close', playerId, x: entity.x, y: entity.y || 0, z: entity.z });
}

function strike(room, win, owner, target) {
  if (win.kind === 'm1') return Hitbox.handHit(owner, target, OI.m1Reach, OI.m1Radius);
  if (win.kind === 'melee') return Hitbox.handHit(owner, target, win.skill.reach || 0, win.skill.radius);
  if (win.kind === 'area') return Hitbox.distanceBetween(owner, target) <= win.skill.radius;
  return false;
}

function pathOk(platforms, e, x, z) {
  const steps = Math.max(1, Math.ceil(Math.hypot(x - e.x, z - e.z) / 0.5));
  for (let i = 1; i <= steps; i++) {
    const px = e.x + ((x - e.x) * i) / steps;
    const pz = e.z + ((z - e.z) * i) / steps;
    const y = e.y || 0;
    if (Hitbox.blockedAt(platforms, px, pz, y)) return false;
    if (Hitbox.groundAt(platforms, px, pz, y) < y - 1.2) return false;
  }
  return true;
}

function safeSpot(room, win, owner, te) {
  const platforms = room.allPlatforms();
  let ax = te.x - owner.x;
  let az = te.z - owner.z;
  const al = Math.hypot(ax, az);
  if (al < 0.01) {
    ax = -(owner.faceX || 0);
    az = -(owner.faceZ || 1);
  } else {
    ax /= al;
    az /= al;
  }
  for (let d = 1; d <= OI.maxStep; d += 0.5) {
    for (const a of ANGLES) {
      const c = Math.cos(a);
      const s = Math.sin(a);
      const dx = ax * c - az * s;
      const dz = ax * s + az * c;
      const x = te.x + dx * d;
      const z = te.z + dz * d;
      if (strike(room, win, owner, { ...te, x, z })) continue;
      if (!pathOk(platforms, te, x, z)) continue;
      return { x, z, dx, dz, d };
    }
  }
  return null;
}

function predict(room, win, owner, now) {
  if (!win.dodge) win.dodge = new Set();
  for (const [id, p] of room.players) {
    if (p.isAsymRole || p.isBoss || room.gameState.patients[id]?.status !== 'alive') continue;
    const e = room.gameState.entities[id];
    if (!e || !active(e) || !strike(room, win, owner, e)) continue;
    if (Status.blocksMove(e, now) || e.towerSeat || e.tigerLeap || e.flojera < OI.cost) continue;
    const spot = safeSpot(room, win, owner, e);
    if (!spot) continue;
    const s = state(e);
    e.flojera = Math.max(0, e.flojera - OI.cost);
    e.dashUntil = now + OI.stepMs;
    e.dashVX = (spot.dx * spot.d * 1000) / OI.stepMs;
    e.dashVZ = (spot.dz * spot.d * 1000) / OI.stepMs;
    e.dashExhausted = false;
    e.oiStep = now + OI.stepMs;
    s.lastUse = now;
    win.dodge.add(id);
    room.broadcast('oi_fx', { kind: 'step', playerId: id, x: e.x, y: e.y || 0, z: e.z, tx: spot.x, tz: spot.z });
  }
}

function onHit(room, id, now) {
  const e = room.gameState.entities[id];
  if (!e || !active(e)) return;
  const s = state(e);
  s.lastHit = now;
  s.eyes = Math.max(0, s.eyes - OI.loss);
  room.broadcast('oi_fx', { kind: 'hurt', playerId: id, x: e.x, y: e.y || 0, z: e.z });
  if (s.eyes <= 0) {
    s.on = false;
    s.outAt = now + OI.refillMs;
    room.broadcast('oi_fx', { kind: 'close', playerId: id, x: e.x, y: e.y || 0, z: e.z });
  }
}

function tick(room, now) {
  for (const e of Object.values(room.gameState.entities)) {
    if (!e || !e.oi || !has(e)) continue;
    const s = e.oi;
    if (s.eyes <= 0) {
      if (s.outAt && now >= s.outAt) {
        s.eyes = OI.eyes;
        s.outAt = 0;
      }
    } else if (s.eyes < OI.eyes && now - s.lastHit > OI.quietMs && now - s.lastUse > OI.quietMs && now - s.lastRegen >= OI.regenEvery) {
      s.lastRegen = now;
      s.eyes += 1;
    }
  }
}

function view(entity, now) {
  const s = state(entity);
  return {
    eyes: s.eyes,
    on: s.on,
    timer: s.eyes <= 0 && s.outAt ? Math.max(0, Math.min(1, 1 - (s.outAt - now) / OI.refillMs)) : null,
  };
}

module.exports = { OI, has, state, depleted, active, drainMult, toggle, predict, onHit, tick, view };
