const Hitbox = require('./Hitbox');
const Status = require('./Status');
const C = require('./Constants');

const OI = { eyes: 30, refillMs: 28000, costMax: 9, costMin: 3, loss: 5, regenEvery: 9000, bias: 3, slack: 2.5, quietMs: 5000, stepMs: 200, maxStep: 10, toggleGapMs: 700 };

const ANGLES = [90, -90, 45, -45, 135, -135, 0, 180].map((a) => (a * Math.PI) / 180);

function costFor(eyes) {
  const f = Math.max(0, Math.min(1, eyes / OI.eyes));
  return Math.round((OI.costMin + (OI.costMax - OI.costMin) * (1 - f)) * 10) / 10;
}

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
  if (win.kind === 'm1') return Hitbox.handHit(owner, target, C.M1_REACH, C.M1_RADIUS);
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

function landOk(platforms, e, x, z) {
  const y = e.y || 0;
  return !Hitbox.blockedAt(platforms, x, z, y) && Hitbox.groundAt(platforms, x, z, y) >= y - 2.5;
}

function safeSpot(room, win, owner, te, eyes, relaxed) {
  const platforms = room.allPlatforms();
  const f = Math.max(0, Math.min(1, eyes / OI.eyes));
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
  let px = ax;
  let pz = az;
  const inp = te.input;
  if (inp && Math.hypot(inp.moveX || 0, inp.moveZ || 0) > 0.3) {
    const il = Math.hypot(inp.moveX, inp.moveZ);
    px = inp.moveX / il;
    pz = inp.moveZ / il;
  }
  let best = null;
  let bestScore = -Infinity;
  let dMin = null;
  for (let d = 1; d <= OI.maxStep; d += 0.5) {
    if (dMin !== null && d > dMin + OI.slack * f) break;
    for (const a of ANGLES) {
      const c = Math.cos(a);
      const sn = Math.sin(a);
      const dx = ax * c - az * sn;
      const dz = ax * sn + az * c;
      const x = te.x + dx * d;
      const z = te.z + dz * d;
      if (strike(room, win, owner, { ...te, x, z })) continue;
      if (relaxed ? !landOk(platforms, te, x, z) : !pathOk(platforms, te, x, z)) continue;
      if (dMin === null) dMin = d;
      const score = (dx * px + dz * pz) * f * OI.bias - (d - dMin);
      if (score > bestScore) {
        bestScore = score;
        best = { x, z, dx, dz, d };
      }
    }
  }
  return best;
}

function dodge(room, win, owner, id, e, now) {
  const s0 = state(e);
  if (Status.blocksMove(e, now) || e.towerSeat || e.tigerLeap || e.flojera <= 0) return false;
  let spot = safeSpot(room, win, owner, e, s0.eyes, false);
  let blink = false;
  if (!spot) {
    spot = safeSpot(room, win, owner, e, s0.eyes, true);
    blink = true;
  }
  if (!spot) return false;
  e.flojera = Math.max(0, e.flojera - costFor(s0.eyes));
  if (blink) {
    e.x = spot.x;
    e.z = spot.z;
  } else {
    e.dashUntil = now + OI.stepMs;
    e.dashVX = (spot.dx * spot.d * 1000) / OI.stepMs;
    e.dashVZ = (spot.dz * spot.d * 1000) / OI.stepMs;
    e.dashExhausted = false;
    e.oiStep = now + OI.stepMs;
  }
  s0.lastUse = now;
  room.broadcast('oi_fx', { kind: 'step', playerId: id, x: e.x, y: e.y || 0, z: e.z, tx: spot.x, tz: spot.z });
  return true;
}

function predict(room, win, owner, now) {
  if (!win.dodge) win.dodge = new Set();
  for (const [id, p] of room.players) {
    if (p.isAsymRole || p.isBoss || win.dodge.has(id) || room.gameState.patients[id]?.status !== 'alive') continue;
    const e = room.gameState.entities[id];
    if (!e || !active(e) || !strike(room, win, owner, e)) continue;
    if (dodge(room, win, owner, id, e, now)) win.dodge.add(id);
  }
}

function evadePulse(room, owner, id, e, radius, now) {
  if (!active(e)) return false;
  const win = { kind: 'area', skill: { radius } };
  if (!strike(room, win, owner, e)) return false;
  return dodge(room, win, owner, id, e, now);
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
    cost: costFor(s.eyes),
    timer: s.eyes <= 0 && s.outAt ? Math.max(0, Math.min(1, 1 - (s.outAt - now) / OI.refillMs)) : null,
  };
}

module.exports = { OI, costFor, evadePulse, has, state, depleted, active, drainMult, toggle, predict, onHit, tick, view };
